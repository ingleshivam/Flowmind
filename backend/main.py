"""
FlowMind API — RAG-capable backend
Supports both plain LLM workflows and full RAG pipelines:
  DocUpload → MarkdownConverter → Chunker → Embedder (Qdrant) → Retriever → LLM → Output
"""
from __future__ import annotations

import base64
import time
import uuid
from typing import Annotated, Any, Optional

import fitz  # PyMuPDF
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_groq import ChatGroq
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages
from typing_extensions import TypedDict
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct

# ── App setup ──────────────────────────────────────────────────────────────────
app = FastAPI(title="FlowMind API", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

EMBEDDING_MODEL = "nomic-embed-text-v1_5"
EMBEDDING_DIM   = 768

# In-memory Qdrant — no Docker needed
qdrant = QdrantClient(":memory:")


# ── Pydantic models ────────────────────────────────────────────────────────────
class NodeData(BaseModel):
    nodeType:       str
    inputMessage:   Optional[str] = None
    systemPrompt:   Optional[str] = None
    memoryContent:  Optional[str] = None
    selectedModel:  Optional[str] = None
    apiKey:         Optional[str] = None
    docName:        Optional[str] = None
    docBase64:      Optional[str] = None
    docMimeType:    Optional[str] = None
    chunkSize:      Optional[int] = 512
    chunkOverlap:   Optional[int] = 64
    collectionName: Optional[str] = "flowmind_rag"
    topK:           Optional[int] = 4


class WorkflowNode(BaseModel):
    id:   str
    type: str
    data: NodeData


class WorkflowEdge(BaseModel):
    id:           str
    source:       str
    target:       str
    sourceHandle: Optional[str] = None
    targetHandle: Optional[str] = None


class ExecuteRequest(BaseModel):
    nodes: list[WorkflowNode]
    edges: list[WorkflowEdge]


class ChunkResult(BaseModel):
    index: int
    text:  str
    score: float


class ExecuteResponse(BaseModel):
    output:          str
    time:            int
    model:           Optional[str]             = None
    chunkCount:      Optional[int]             = None
    vectorCount:     Optional[int]             = None
    retrievedChunks: Optional[list[ChunkResult]] = None
    markdownPreview: Optional[str]             = None
    statusMessages:  Optional[dict[str, str]]  = None


# ── LangGraph state ────────────────────────────────────────────────────────────
class WorkflowState(TypedDict):
    messages:       Annotated[list, add_messages]
    system_content: str
    output:         str


# ── Utility helpers ────────────────────────────────────────────────────────────
def edges_connect(edges: list[WorkflowEdge], src: str, tgt: str) -> bool:
    return any(e.source == src and e.target == tgt for e in edges)


def find_node(nodes: list[WorkflowNode], node_type: str) -> Optional[WorkflowNode]:
    return next((n for n in nodes if n.data.nodeType == node_type), None)


# ── RAG helpers ────────────────────────────────────────────────────────────────
def extract_markdown(doc_base64: str, mime_type: str, doc_name: str) -> str:
    raw = base64.b64decode(doc_base64)
    if mime_type == "application/pdf" or doc_name.lower().endswith(".pdf"):
        doc = fitz.open(stream=raw, filetype="pdf")
        pages = []
        for i, page in enumerate(doc):
            text = page.get_text("text").strip()
            if text:
                pages.append(f"## Page {i + 1}\n\n{text}")
        doc.close()
        return "\n\n---\n\n".join(pages)
    try:
        return raw.decode("utf-8")
    except UnicodeDecodeError:
        return raw.decode("latin-1")


def chunk_text(text: str, chunk_size: int, overlap: int) -> list[str]:
    """
    Sliding-window chunker with safety guards:
    - overlap clamped to max 40% of chunk_size to prevent stalling
    - step always advances >= 64 chars — no infinite loop
    - hard cap of 2000 chunks to prevent MemoryError on huge docs
    """
    MAX_CHUNKS = 2000

    # Clamp overlap to at most 40% of chunk_size
    overlap = min(overlap, int(chunk_size * 0.4))

    chunks: list[str] = []
    start  = 0
    length = len(text)

    while start < length and len(chunks) < MAX_CHUNKS:
        end = min(start + chunk_size, length)

        # Snap to sentence boundary in the last 20% of the window
        if end < length:
            search_from = max(start + chunk_size // 2, end - chunk_size // 5)
            boundary    = -1
            for sep in (".\n", ". ", "! ", "? ", "\n\n"):
                idx = text.rfind(sep, search_from, end)
                if idx != -1 and idx > boundary:
                    boundary = idx + len(sep)
            # Only accept boundary if it meaningfully advances past start
            if boundary > start + 32:
                end = boundary

        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)

        # Guaranteed minimum advance of 64 chars prevents infinite loop
        start = max(end - overlap, start + 64)

    return chunks


def embed_texts(texts: list[str], api_key: str) -> list[list[float]]:
    client = Groq(api_key=api_key)
    all_embeddings: list[list[float]] = []
    for i in range(0, len(texts), 96):
        batch = texts[i : i + 96]
        resp  = client.embeddings.create(model=EMBEDDING_MODEL, input=batch)
        all_embeddings.extend([item.embedding for item in resp.data])
    return all_embeddings


def store_in_qdrant(
    collection_name: str,
    chunks: list[str],
    embeddings: list[list[float]],
) -> int:
    if qdrant.collection_exists(collection_name):
        qdrant.delete_collection(collection_name)
    qdrant.create_collection(
        collection_name=collection_name,
        vectors_config=VectorParams(size=EMBEDDING_DIM, distance=Distance.COSINE),
    )
    points = [
        PointStruct(
            id=str(uuid.uuid4()),
            vector=emb,
            payload={"text": chunk, "chunk_index": i},
        )
        for i, (chunk, emb) in enumerate(zip(chunks, embeddings))
    ]
    qdrant.upsert(collection_name=collection_name, points=points)
    return len(points)


def retrieve_chunks(
    query: str, collection_name: str, top_k: int, api_key: str
) -> list[ChunkResult]:
    query_emb = embed_texts([query], api_key)[0]
    results   = qdrant.search(
        collection_name=collection_name,
        query_vector=query_emb,
        limit=top_k,
        with_payload=True,
    )
    return [
        ChunkResult(
            index=r.payload.get("chunk_index", i),
            text=r.payload.get("text", ""),
            score=round(r.score, 4),
        )
        for i, r in enumerate(results)
    ]


# ── LangGraph LLM pipeline ────────────────────────────────────────────────────
def build_and_run_graph(
    input_message: str,
    system_content: str,
    model_name: str,
    api_key: str,
) -> str:
    llm = ChatGroq(api_key=api_key, model=model_name, temperature=0.7)

    def gather_inputs(state: WorkflowState) -> dict[str, Any]:
        return {"system_content": state["system_content"]}

    def call_llm(state: WorkflowState) -> dict[str, Any]:
        msgs: list[Any] = []
        if state.get("system_content"):
            msgs.append(SystemMessage(content=state["system_content"]))
        msgs.extend(state["messages"])
        response = llm.invoke(msgs)
        text = (
            response.content
            if isinstance(response.content, str)
            else "".join(
                b["text"]
                for b in response.content
                if isinstance(b, dict) and b.get("type") == "text"
            )
        )
        return {"output": text}

    def format_output(state: WorkflowState) -> dict[str, Any]:
        return {"output": state["output"].strip()}

    builder: StateGraph = StateGraph(WorkflowState)
    builder.add_node("gather_inputs", gather_inputs)
    builder.add_node("call_llm",      call_llm)
    builder.add_node("format_output", format_output)
    builder.add_edge(START,           "gather_inputs")
    builder.add_edge("gather_inputs", "call_llm")
    builder.add_edge("call_llm",      "format_output")
    builder.add_edge("format_output", END)

    result = builder.compile().invoke({
        "messages":       [HumanMessage(content=input_message)],
        "system_content": system_content,
        "output":         "",
    })
    return result["output"]


# ── Main endpoint ─────────────────────────────────────────────────────────────
@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "FlowMind API v2"}


@app.post("/api/execute", response_model=ExecuteResponse)
def execute_workflow(body: ExecuteRequest) -> ExecuteResponse:  # noqa: C901
    t0    = time.monotonic()
    nodes = body.nodes
    edges = body.edges
    status_msgs: dict[str, str] = {}

    # ── Locate all node types ─────────────────────────────────────────────────
    llm_node       = find_node(nodes, "llm")
    input_node     = find_node(nodes, "inputMessage")
    system_node    = find_node(nodes, "systemPrompt")
    memory_node    = find_node(nodes, "memory")
    doc_node       = find_node(nodes, "docUpload")
    md_node        = find_node(nodes, "markdownConverter")
    chunker_node   = find_node(nodes, "chunker")
    embedder_node  = find_node(nodes, "embedder")
    retriever_node = find_node(nodes, "retriever")

    is_rag = bool(doc_node and retriever_node and embedder_node and chunker_node and md_node)

    # ── Validate LLM node always ──────────────────────────────────────────────
    if not llm_node:
        raise HTTPException(400, "No LLM node found in the workflow.")
    if not llm_node.data.apiKey:
        raise HTTPException(400, "No Groq API key set. Click the key icon on the LLM node.")
    if not llm_node.data.selectedModel:
        raise HTTPException(400, "No model selected in the LLM node.")

    api_key    = llm_node.data.apiKey
    model_name = llm_node.data.selectedModel

    # ── RAG branch ────────────────────────────────────────────────────────────
    markdown_text: str = ""
    chunks:        list[str]         = []
    retrieved:     list[ChunkResult] = []
    vector_count:  int               = 0
    rag_context:   str               = ""

    if is_rag:
        # 1. Doc upload validation
        if not doc_node.data.docBase64:
            raise HTTPException(400, "Document Upload node has no file. Please upload a document first.")

        # 2. Connectivity checks
        if not edges_connect(edges, doc_node.id, md_node.id):
            raise HTTPException(400, "Connect Document Upload → Markdown Converter.")
        if not edges_connect(edges, md_node.id, chunker_node.id):
            raise HTTPException(400, "Connect Markdown Converter → Text Chunker.")
        if not edges_connect(edges, chunker_node.id, embedder_node.id):
            raise HTTPException(400, "Connect Text Chunker → Embedder.")
        if not edges_connect(edges, embedder_node.id, retriever_node.id):
            raise HTTPException(400, "Connect Embedder → Retriever.")

        # 3. Markdown conversion
        try:
            markdown_text = extract_markdown(
                doc_node.data.docBase64,
                doc_node.data.docMimeType or "application/pdf",
                doc_node.data.docName or "document",
            )
        except Exception as exc:
            raise HTTPException(500, f"Markdown conversion failed: {exc}")
        status_msgs["markdownConverter"] = f"Converted — {len(markdown_text):,} chars"

        # 4. Chunking
        chunk_size    = chunker_node.data.chunkSize    or 512
        chunk_overlap = chunker_node.data.chunkOverlap or 64
        chunks = chunk_text(markdown_text, chunk_size, chunk_overlap)
        if not chunks:
            raise HTTPException(400, "Document produced no text chunks. Is the file readable?")
        status_msgs["chunker"] = f"Created {len(chunks)} chunks (size={chunk_size}, overlap={chunk_overlap})"

        # 5. Embed + store
        collection_name = embedder_node.data.collectionName or "flowmind_rag"
        try:
            embeddings   = embed_texts(chunks, api_key)
            vector_count = store_in_qdrant(collection_name, chunks, embeddings)
        except Exception as exc:
            msg = str(exc)
            if "401" in msg or "unauthorized" in msg.lower():
                raise HTTPException(400, "Invalid Groq API key — embedding failed.")
            raise HTTPException(500, f"Embedding/Qdrant error: {exc}")
        status_msgs["embedder"] = f"Stored {vector_count} vectors in '{collection_name}'"

        # 6. Get user query
        query = (input_node.data.inputMessage or "").strip() if input_node else ""
        if not query:
            raise HTTPException(400, "Input Message node is empty. Enter your question.")

        # 7. Retrieve
        top_k = retriever_node.data.topK or 4
        try:
            retrieved = retrieve_chunks(query, collection_name, top_k, api_key)
        except Exception as exc:
            raise HTTPException(500, f"Retrieval failed: {exc}")
        if not retrieved:
            raise HTTPException(400, "No relevant chunks found. Try rephrasing your question.")
        status_msgs["retriever"] = f"Retrieved {len(retrieved)} chunks"

        # 8. Build RAG context string
        context_parts = [
            f"[Chunk {c.index + 1} | similarity={c.score}]\n{c.text}"
            for c in retrieved
        ]
        rag_context = "\n\n---\n\n".join(context_parts)

    # ── Build input message and system content ─────────────────────────────────
    if is_rag:
        input_message = (input_node.data.inputMessage or "").strip() if input_node else ""
    else:
        input_message = (input_node.data.inputMessage or "").strip() if input_node else ""
        if not input_message:
            raise HTTPException(400, "Input Message node is empty.")
        if input_node and not edges_connect(edges, input_node.id, llm_node.id):
            raise HTTPException(400, "Connect Input Message → LLM node.")

    system_parts: list[str] = []

    # RAG context goes first so the model sees it clearly
    if is_rag and rag_context:
        system_parts.append(
            "You are a precise document Q&A assistant.\n"
            "Answer ONLY from the document context provided below.\n"
            "If the answer is not contained in the context, reply: "
            "'I could not find this information in the provided document.'\n\n"
            f"DOCUMENT CONTEXT:\n{rag_context}"
        )

    if system_node and edges_connect(edges, system_node.id, llm_node.id):
        p = (system_node.data.systemPrompt or "").strip()
        if p:
            system_parts.append(p)

    if memory_node and edges_connect(edges, memory_node.id, llm_node.id):
        m = (memory_node.data.memoryContent or "").strip()
        if m:
            system_parts.append(f"Memory/Context:\n{m}")

    system_content = "\n\n".join(system_parts)

    # ── LLM call ──────────────────────────────────────────────────────────────
    try:
        output = build_and_run_graph(input_message, system_content, model_name, api_key)
    except Exception as exc:
        msg = str(exc)
        if "401" in msg or "unauthorized" in msg.lower():
            raise HTTPException(400, "Invalid Groq API key.")
        if "429" in msg:
            raise HTTPException(429, "Rate limit exceeded. Please wait a moment.")
        raise HTTPException(500, f"LLM error: {msg}")

    elapsed_ms = int((time.monotonic() - t0) * 1000)

    return ExecuteResponse(
        output=output,
        time=elapsed_ms,
        model=model_name,
        chunkCount=len(chunks)    or None,
        vectorCount=vector_count  or None,
        retrievedChunks=retrieved or None,
        markdownPreview=(markdown_text[:400] + "…") if markdown_text else None,
        statusMessages=status_msgs or None,
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

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


# ── Pipeline detection helpers ────────────────────────────────────────────────

def is_connected_to_output(
    node_id: str,
    nodes: list[WorkflowNode],
    edges: list[WorkflowEdge],
    output_node: Optional[WorkflowNode],
    visited: Optional[set] = None,
) -> bool:
    """Return True if node_id can reach the output node through edges."""
    if visited is None:
        visited = set()
    if node_id in visited:
        return False
    visited.add(node_id)
    if output_node and node_id == output_node.id:
        return True
    for edge in edges:
        if edge.source == node_id:
            if is_connected_to_output(edge.target, nodes, edges, output_node, visited):
                return True
    return False


def detect_pipeline(
    nodes: list[WorkflowNode],
    edges: list[WorkflowEdge],
) -> dict:
    """
    Inspect the canvas and return which steps are active.
    A step is active only if its node exists AND is wired into
    a path that leads to the Output node.
    No mandatory nodes — execute whatever is connected.
    """
    output_node    = find_node(nodes, "output")
    llm_node       = find_node(nodes, "llm")
    input_node     = find_node(nodes, "inputMessage")
    system_node    = find_node(nodes, "systemPrompt")
    memory_node    = find_node(nodes, "memory")
    doc_node       = find_node(nodes, "docUpload")
    md_node        = find_node(nodes, "markdownConverter")
    chunker_node   = find_node(nodes, "chunker")
    embedder_node  = find_node(nodes, "embedder")
    retriever_node = find_node(nodes, "retriever")

    def active(n: Optional[WorkflowNode]) -> bool:
        """Node exists AND has a path to output."""
        if n is None:
            return False
        return is_connected_to_output(n.id, nodes, edges, output_node)

    return {
        "output_node":    output_node,
        "llm_node":       llm_node       if active(llm_node)       else None,
        "input_node":     input_node     if active(input_node)     else None,
        "system_node":    system_node    if active(system_node)    else None,
        "memory_node":    memory_node    if active(memory_node)    else None,
        "doc_node":       doc_node       if active(doc_node)       else None,
        "md_node":        md_node        if active(md_node)        else None,
        "chunker_node":   chunker_node   if active(chunker_node)   else None,
        "embedder_node":  embedder_node  if active(embedder_node)  else None,
        "retriever_node": retriever_node if active(retriever_node) else None,
        # Convenience flags
        "has_llm":       active(llm_node),
        "has_doc":       active(doc_node),
        "has_markdown":  active(md_node),
        "has_chunker":   active(chunker_node),
        "has_embedder":  active(embedder_node),
        "has_retriever": active(retriever_node),
        "has_input":     active(input_node),
    }


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

    # ── Must have at least an output node ─────────────────────────────────────
    output_node = find_node(nodes, "output")
    if not output_node:
        raise HTTPException(400, "Add an Output node to your canvas.")

    # ── Detect which pipeline steps are active ────────────────────────────────
    p = detect_pipeline(nodes, edges)

    # Nothing at all is connected to output
    if not any([p["has_doc"], p["has_input"], p["has_llm"]]):
        raise HTTPException(
            400,
            "Nothing is connected to the Output node. "
            "Wire at least one node into the Output node.",
        )

    # ── Pipeline state ────────────────────────────────────────────────────────
    markdown_text: str               = ""
    chunks:        list[str]         = []
    retrieved:     list[ChunkResult] = []
    vector_count:  int               = 0
    rag_context:   str               = ""
    output:        str               = ""
    api_key:       str               = ""
    model_name:    str               = ""

    # Grab API key from LLM node if present
    if p["has_llm"]:
        llm = p["llm_node"]
        if not llm.data.apiKey:
            raise HTTPException(400, "No Groq API key set. Click the key icon on the LLM node.")
        if not llm.data.selectedModel:
            raise HTTPException(400, "No model selected in the LLM node.")
        api_key    = llm.data.apiKey
        model_name = llm.data.selectedModel
    elif p["has_embedder"] or p["has_retriever"]:
        # Embedder/Retriever need an API key even without LLM node
        raise HTTPException(
            400,
            "The Embedder and Retriever nodes require a Groq API key. "
            "Add an LLM node and set your API key.",
        )

    # ── STEP 1: Document → Markdown ───────────────────────────────────────────
    if p["has_doc"] and p["has_markdown"]:
        doc = p["doc_node"]
        if not doc.data.docBase64:
            raise HTTPException(400, "Document Upload node has no file. Please upload a document.")
        if not edges_connect(edges, doc.id, p["md_node"].id):
            raise HTTPException(400, "Connect Document Upload → Markdown Converter.")
        try:
            markdown_text = extract_markdown(
                doc.data.docBase64,
                doc.data.docMimeType or "application/pdf",
                doc.data.docName or "document",
            )
        except Exception as exc:
            raise HTTPException(500, f"Markdown conversion failed: {exc}")
        status_msgs["markdownConverter"] = f"Converted — {len(markdown_text):,} chars"

    elif p["has_doc"] and not p["has_markdown"]:
        # DocUpload present but no MarkdownConverter — extract anyway for direct output
        doc = p["doc_node"]
        if not doc.data.docBase64:
            raise HTTPException(400, "Document Upload node has no file.")
        try:
            markdown_text = extract_markdown(
                doc.data.docBase64,
                doc.data.docMimeType or "application/pdf",
                doc.data.docName or "document",
            )
        except Exception as exc:
            raise HTTPException(500, f"Document extraction failed: {exc}")

    # ── STEP 2: Chunking ──────────────────────────────────────────────────────
    if p["has_chunker"] and markdown_text:
        md  = p["md_node"]
        chk = p["chunker_node"]
        if md and not edges_connect(edges, md.id, chk.id):
            raise HTTPException(400, "Connect Markdown Converter → Text Chunker.")
        chunk_size    = chk.data.chunkSize    or 512
        chunk_overlap = chk.data.chunkOverlap or 64
        chunks = chunk_text(markdown_text, chunk_size, chunk_overlap)
        if not chunks:
            raise HTTPException(400, "Document produced no text chunks. Is the file readable?")
        status_msgs["chunker"] = (
            f"Created {len(chunks)} chunks (size={chunk_size}, overlap={chunk_overlap})"
        )

    # ── STEP 3: Embed + store in Qdrant ──────────────────────────────────────
    if p["has_embedder"] and chunks:
        chk = p["chunker_node"]
        emb = p["embedder_node"]
        if chk and not edges_connect(edges, chk.id, emb.id):
            raise HTTPException(400, "Connect Text Chunker → Embedder.")
        collection_name = emb.data.collectionName or "flowmind_rag"
        try:
            embeddings   = embed_texts(chunks, api_key)
            vector_count = store_in_qdrant(collection_name, chunks, embeddings)
        except Exception as exc:
            msg = str(exc)
            if "401" in msg or "unauthorized" in msg.lower():
                raise HTTPException(400, "Invalid Groq API key — embedding failed.")
            raise HTTPException(500, f"Embedding/Qdrant error: {exc}")
        status_msgs["embedder"] = f"Stored {vector_count} vectors in '{collection_name}'"

    # ── STEP 4: Retrieve relevant chunks ─────────────────────────────────────
    if p["has_retriever"] and vector_count > 0:
        emb = p["embedder_node"]
        ret = p["retriever_node"]
        if emb and not edges_connect(edges, emb.id, ret.id):
            raise HTTPException(400, "Connect Embedder → Retriever.")
        query = (p["input_node"].data.inputMessage or "").strip() if p["input_node"] else ""
        if not query:
            raise HTTPException(400, "Retriever needs a query. Connect and fill an Input Message node.")
        collection_name = (p["embedder_node"].data.collectionName or "flowmind_rag")
        top_k = ret.data.topK or 4
        try:
            retrieved = retrieve_chunks(query, collection_name, top_k, api_key)
        except Exception as exc:
            raise HTTPException(500, f"Retrieval failed: {exc}")
        if not retrieved:
            raise HTTPException(400, "No relevant chunks found. Try rephrasing your question.")
        status_msgs["retriever"] = f"Retrieved {len(retrieved)} chunks"
        rag_context = "\n\n---\n\n".join(
            f"[Chunk {c.index + 1} | similarity={c.score}]\n{c.text}"
            for c in retrieved
        )

    # ── STEP 5: Determine final output ────────────────────────────────────────
    if p["has_llm"]:
        # LLM is in the pipeline — build messages and call it
        input_message = ""

        input_node = p.get("input_node")
        doc_node = p.get("doc_node")
        md_node = p.get("md_node")
        print("DOC NODE :", doc_node)
        print("MD NODE :", md_node)

        if input_node is not None:
            input_message = (input_node.data.inputMessage or "").strip()

        if not input_message and doc_node is not None:
            markdown_text = extract_markdown(
                doc_node.data.docBase64,
                doc_node.data.docMimeType or "application/pdf",
                doc_node.data.docName or "document",
            )
            input_message = markdown_text

        print("Retrieved Input message:", input_message)

        if not input_message:
            raise HTTPException(400, "Input Message node is empty. Enter your question.")

        system_parts: list[str] = []

        if rag_context:
            system_parts.append(
                "You are a precise document Q&A assistant.\n"
                "Answer ONLY from the document context provided below.\n"
                "If the answer is not in the context, say: "
                "'I could not find this information in the provided document.'\n\n"
                f"DOCUMENT CONTEXT:\n{rag_context}"
            )

        if p["system_node"] and edges_connect(edges, p["system_node"].id, p["llm_node"].id):
            sp = (p["system_node"].data.systemPrompt or "").strip()
            if sp:
                system_parts.append(sp)

        if p["memory_node"] and edges_connect(edges, p["memory_node"].id, p["llm_node"].id):
            mem = (p["memory_node"].data.memoryContent or "").strip()
            if mem:
                system_parts.append(f"Memory/Context:\n{mem}")

        system_content = "\n\n".join(system_parts)

        try:
            output = build_and_run_graph(input_message, system_content, model_name, api_key)
        except Exception as exc:
            msg = str(exc)
            if "401" in msg or "unauthorized" in msg.lower():
                raise HTTPException(400, "Invalid Groq API key.")
            if "429" in msg:
                raise HTTPException(429, "Rate limit exceeded. Please wait a moment.")
            raise HTTPException(500, f"LLM error: {msg}")

    elif markdown_text and not p["has_llm"]:
        # No LLM — return the markdown / extracted text directly
        output = markdown_text
        status_msgs["output"] = "Markdown content returned directly (no LLM node)"

    elif chunks and not p["has_llm"]:
        # Chunker in pipeline but no LLM — return chunk summary
        summary = "\n\n".join(
            f"### Chunk {i + 1}\n{c}" for i, c in enumerate(chunks[:10])
        )
        if len(chunks) > 10:
            summary += f"\n\n…and {len(chunks) - 10} more chunks"
        output = summary
        status_msgs["output"] = f"Showing first {min(10, len(chunks))} of {len(chunks)} chunks"

    elif p["has_input"] and not p["has_llm"]:
        # Just an input node connected to output — echo the message
        output = (p["input_node"].data.inputMessage or "").strip()
        if not output:
            raise HTTPException(400, "Input Message node is empty.")
        status_msgs["output"] = "Input message passed through (no LLM node)"

    else:
        raise HTTPException(
            400,
            "Could not determine what to execute. "
            "Check that your nodes are connected to the Output node.",
        )

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

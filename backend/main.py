from __future__ import annotations

import time
from typing import Annotated, Any, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_groq import ChatGroq
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages
from typing_extensions import TypedDict

# ─── App setup ────────────────────────────────────────────────────────────────

app = FastAPI(title="FlowMind API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Request / Response models ─────────────────────────────────────────────────

class NodeData(BaseModel):
    nodeType: str
    inputMessage: Optional[str] = None
    systemPrompt: Optional[str] = None
    memoryContent: Optional[str] = None
    selectedModel: Optional[str] = None
    apiKey: Optional[str] = None


class WorkflowNode(BaseModel):
    id: str
    type: str
    data: NodeData


class WorkflowEdge(BaseModel):
    id: str
    source: str
    target: str
    sourceHandle: Optional[str] = None
    targetHandle: Optional[str] = None


class ExecuteRequest(BaseModel):
    nodes: list[WorkflowNode]
    edges: list[WorkflowEdge]


class ExecuteResponse(BaseModel):
    output: str
    time: int
    model: str


# ─── LangGraph state ───────────────────────────────────────────────────────────

class WorkflowState(TypedDict):
    messages: Annotated[list, add_messages]
    system_content: str
    output: str


# ─── Graph builder ─────────────────────────────────────────────────────────────

def build_and_run_graph(
    input_message: str,
    system_content: str,
    model_name: str,
    api_key: str,
) -> str:
    """Build a LangGraph workflow and run it, returning the LLM output."""

    llm = ChatGroq(api_key=api_key, model=model_name, temperature=0.7)

    # Node: gather inputs and prepare messages
    def gather_inputs(state: WorkflowState) -> dict[str, Any]:
        return {"system_content": state["system_content"]}

    # Node: call the LLM
    def call_llm(state: WorkflowState) -> dict[str, Any]:
        msgs: list[Any] = []
        if state.get("system_content"):
            msgs.append(SystemMessage(content=state["system_content"]))
        msgs.extend(state["messages"])

        response = llm.invoke(msgs)
        output_text = (
            response.content
            if isinstance(response.content, str)
            else "".join(
                block["text"]
                for block in response.content
                if isinstance(block, dict) and block.get("type") == "text"
            )
        )
        return {"output": output_text}

    # Node: format / post-process output
    def format_output(state: WorkflowState) -> dict[str, Any]:
        return {"output": state["output"].strip()}

    # Build graph
    builder: StateGraph = StateGraph(WorkflowState)
    builder.add_node("gather_inputs", gather_inputs)
    builder.add_node("call_llm", call_llm)
    builder.add_node("format_output", format_output)

    builder.add_edge(START, "gather_inputs")
    builder.add_edge("gather_inputs", "call_llm")
    builder.add_edge("call_llm", "format_output")
    builder.add_edge("format_output", END)

    graph = builder.compile()

    initial_state: WorkflowState = {
        "messages": [HumanMessage(content=input_message)],
        "system_content": system_content,
        "output": "",
    }

    result = graph.invoke(initial_state)
    return result["output"]


# ─── Helpers ───────────────────────────────────────────────────────────────────

def edges_connect(edges: list[WorkflowEdge], source_id: str, target_id: str) -> bool:
    return any(e.source == source_id and e.target == target_id for e in edges)


# ─── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "FlowMind API"}


@app.post("/api/execute", response_model=ExecuteResponse)
def execute_workflow(body: ExecuteRequest) -> ExecuteResponse:
    start = time.monotonic()

    nodes = body.nodes
    edges = body.edges

    # Find nodes by type
    def find(node_type: str) -> Optional[WorkflowNode]:
        return next((n for n in nodes if n.data.nodeType == node_type), None)

    input_node = find("inputMessage")
    system_node = find("systemPrompt")
    memory_node = find("memory")
    llm_node = find("llm")
    output_node = find("output")

    # ── Validation ──────────────────────────────────────────────────────────────
    if not llm_node:
        raise HTTPException(status_code=400, detail="No LLM node found in the workflow.")

    if not llm_node.data.apiKey:
        raise HTTPException(
            status_code=400,
            detail="No API key provided. Please configure your Groq API key in the LLM node.",
        )

    if not llm_node.data.selectedModel:
        raise HTTPException(
            status_code=400,
            detail="No model selected. Please select a Groq model in the LLM node.",
        )

    # LLM → Output connectivity
    if output_node and not edges_connect(edges, llm_node.id, output_node.id):
        raise HTTPException(
            status_code=400,
            detail="LLM Node must be connected to the Output Node.",
        )

    # Input message presence + connectivity
    input_message = (input_node.data.inputMessage or "").strip() if input_node else ""
    if not input_message:
        raise HTTPException(
            status_code=400,
            detail="Input Message is empty. Please add content to the Input Message node.",
        )

    if input_node and not edges_connect(edges, input_node.id, llm_node.id):
        raise HTTPException(
            status_code=400,
            detail="Input Message node must be connected to the LLM node.",
        )

    # ── Build system content (only from connected nodes) ────────────────────────
    parts: list[str] = []

    if system_node and edges_connect(edges, system_node.id, llm_node.id):
        prompt = (system_node.data.systemPrompt or "").strip()
        if prompt:
            parts.append(prompt)

    if memory_node and edges_connect(edges, memory_node.id, llm_node.id):
        mem = (memory_node.data.memoryContent or "").strip()
        if mem:
            parts.append(f"Context/Memory:\n{mem}")

    system_content = "\n\n".join(parts)

    # ── Execute via LangGraph ────────────────────────────────────────────────────
    try:
        output = build_and_run_graph(
            input_message=input_message,
            system_content=system_content,
            model_name=llm_node.data.selectedModel,
            api_key=llm_node.data.apiKey,
        )
    except Exception as exc:
        msg = str(exc)
        if "401" in msg or "unauthorized" in msg.lower() or "invalid api key" in msg.lower():
            detail = "Invalid API key. Please check your Groq API key."
        elif "429" in msg:
            detail = "Rate limit exceeded. Please wait a moment and try again."
        elif "model" in msg.lower():
            detail = f"Model error: {msg}"
        else:
            detail = f"LLM execution failed: {msg}"
        raise HTTPException(status_code=500, detail=detail)

    elapsed_ms = int((time.monotonic() - start) * 1000)

    return ExecuteResponse(
        output=output,
        time=elapsed_ms,
        model=llm_node.data.selectedModel,
    )


# ─── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

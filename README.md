# FlowMind — Visual AI Workflow Builder

Node-based agentic workflow builder using **React Flow** (frontend) and **LangGraph** (Python backend).

## Stack
- **Frontend**: Next.js 15 + React Flow + Tailwind CSS
- **Backend**: Python FastAPI + LangGraph + langchain-groq

## Setup

### 1 — Python Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python main.py          # → http://localhost:8000
```

### 2 — Next.js Frontend
```bash
npm install
npm run dev             # → http://localhost:3000
```

Both must run simultaneously.

## LangGraph Pipeline
```
START → gather_inputs → call_llm → format_output → END
```

## API
**POST /api/execute** — runs the workflow graph  
**GET  /health**      — health check

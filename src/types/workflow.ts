export type NodeType =
  | "inputMessage"
  | "systemPrompt"
  | "memory"
  | "llm"
  | "output"
  | "docUpload"
  | "markdownConverter"
  | "chunker"
  | "embedder"
  | "retriever";

export type ExecutionStatus = "idle" | "running" | "success" | "error";

export interface ChunkInfo {
  index: number;
  text: string;
  score: number;
}

export interface WorkflowNodeData extends Record<string, unknown> {
  label: string;
  nodeType: NodeType;
  // Input Message Node
  inputMessage?: string;
  // System Prompt Node
  systemPrompt?: string;
  // Memory Node
  memoryContent?: string;
  // LLM Node
  selectedModel?: string;
  apiKey?: string;
  // Output Node
  outputContent?: string;
  outputTokens?: number;
  outputTime?: number;
  // Doc Upload Node
  docName?: string;
  docBase64?: string;
  docMimeType?: string;
  // Markdown Converter Node
  markdownPreview?: string;
  // Chunker Node
  chunkSize?: number;
  chunkOverlap?: number;
  chunkCount?: number;
  // Embedder Node
  embeddingModel?: string;
  collectionName?: string;
  vectorCount?: number;
  // Retriever Node
  topK?: number;
  retrievedChunks?: ChunkInfo[];
  // Shared execution
  executionStatus?: ExecutionStatus;
  statusMessage?: string;
  onUpdate?: (id: string, data: Partial<WorkflowNodeData>) => void;
  onOpenApiKeyModal?: (nodeId: string) => void;
}

export interface ExecutePayload {
  nodes: Array<{ id: string; type: string; data: WorkflowNodeData }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
  }>;
}

export const GROQ_MODELS = [
  { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B Versatile", tier: "flagship" },
  { id: "llama-3.1-8b-instant",    label: "Llama 3.1 8B Instant",    tier: "fast"     },
  { id: "llama3-70b-8192",         label: "Llama 3 70B",             tier: "standard" },
  { id: "llama3-8b-8192",          label: "Llama 3 8B",              tier: "fast"     },
  { id: "mixtral-8x7b-32768",      label: "Mixtral 8x7B",            tier: "standard" },
  { id: "gemma2-9b-it",            label: "Gemma 2 9B IT",           tier: "fast"     },
] as const;

export type GroqModelId = typeof GROQ_MODELS[number]["id"];

export const EMBEDDING_MODEL = "nomic-embed-text-v1_5";
export const EMBEDDING_DIM   = 768;
export const DEFAULT_COLLECTION = "flowmind_rag";

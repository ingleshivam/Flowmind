export type NodeType = "inputMessage" | "systemPrompt" | "memory" | "llm" | "output";

export type ExecutionStatus = "idle" | "running" | "success" | "error";

export interface WorkflowNodeData extends Record<string, unknown> {
  label: string;
  nodeType: NodeType;
  inputMessage?: string;
  systemPrompt?: string;
  memoryContent?: string;
  selectedModel?: string;
  apiKey?: string;
  outputContent?: string;
  outputTokens?: number;
  outputTime?: number;
  executionStatus?: ExecutionStatus;
  onUpdate?: (id: string, data: Partial<WorkflowNodeData>) => void;
  onOpenApiKeyModal?: (nodeId: string) => void;
}

export interface ExecutePayload {
  nodes: Array<{ id: string; type: string; data: WorkflowNodeData }>;
  edges: Array<{ id: string; source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null }>;
}

export const GROQ_MODELS = [
  { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B Versatile", tier: "flagship" },
  { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B Instant", tier: "fast" },
  { id: "llama3-70b-8192", label: "Llama 3 70B", tier: "standard" },
  { id: "llama3-8b-8192", label: "Llama 3 8B", tier: "fast" },
  { id: "mixtral-8x7b-32768", label: "Mixtral 8x7B", tier: "standard" },
  { id: "gemma2-9b-it", label: "Gemma 2 9B IT", tier: "fast" },
] as const;

export type GroqModelId = typeof GROQ_MODELS[number]["id"];

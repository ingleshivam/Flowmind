"use client";

import { useCallback, useRef, useState, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
  ReactFlowInstance,
  MarkerType,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { InputMessageNode } from "./nodes/InputMessageNode";
import { SystemPromptNode } from "./nodes/SystemPromptNode";
import { MemoryNode } from "./nodes/MemoryNode";
import { LLMNode } from "./nodes/LLMNode";
import { OutputNode } from "./nodes/OutputNode";
import { DocUploadNode } from "./nodes/DocUploadNode";
import { MarkdownConverterNode } from "./nodes/MarkdownConverterNode";
import { ChunkerNode } from "./nodes/ChunkerNode";
import { EmbedderNode } from "./nodes/EmbedderNode";
import { RetrieverNode } from "./nodes/RetrieverNode";
import { NodePalette } from "./NodePalette";
import { Toolbar } from "./Toolbar";
import { ApiKeyModal } from "./ApiKeyModal";

import { NodeType, WorkflowNodeData, ExecutionStatus } from "@/types/workflow";

// Register node types
const nodeTypes = {
  inputMessage: InputMessageNode,
  systemPrompt: SystemPromptNode,
  memory: MemoryNode,
  llm: LLMNode,
  output: OutputNode,
  docUpload: DocUploadNode,
  markdownConverter: MarkdownConverterNode,
  chunker: ChunkerNode,
  embedder: EmbedderNode,
  retriever: RetrieverNode,
};

// Default edge style
const defaultEdgeOptions = {
  style: { stroke: "#334155", strokeWidth: 2 },
  markerEnd: { type: MarkerType.ArrowClosed, color: "#475569" },
  animated: false,
};

// Edge color by target handle
const edgeColors: Record<string, { stroke: string; markerColor: string }> = {
  inputMessage: { stroke: "#0ea5e9", markerColor: "#0ea5e9" },
  systemPrompt: { stroke: "#a855f7", markerColor: "#a855f7" },
  memory:       { stroke: "#f59e0b", markerColor: "#f59e0b" },
  input:        { stroke: "#f97316", markerColor: "#f97316" },
  output:       { stroke: "#10b981", markerColor: "#10b981" },
  // RAG pipeline edges
  doc:          { stroke: "#3b82f6", markerColor: "#3b82f6" },
  markdown:     { stroke: "#84cc16", markerColor: "#84cc16" },
  chunks:       { stroke: "#8b5cf6", markerColor: "#8b5cf6" },
  vectorStore:  { stroke: "#06b6d4", markerColor: "#06b6d4" },
  query:        { stroke: "#0ea5e9", markerColor: "#0ea5e9" },
  context:      { stroke: "#f43f5e", markerColor: "#f43f5e" },
};

let nodeIdCounter = 1;
const getId = () => `node_${nodeIdCounter++}`;

// Initial demo nodes
const createInitialNodes = (onUpdate: (id: string, data: Partial<WorkflowNodeData>) => void, onOpenApiKeyModal: (id: string) => void): Node[] => [
  {
    id: "input_1",
    type: "inputMessage",
    position: { x: 80, y: 160 },
    data: {
      label: "Input Message",
      nodeType: "inputMessage",
      inputMessage: "Explain quantum entanglement in simple terms.",
      executionStatus: "idle",
      onUpdate,
      onOpenApiKeyModal,
    } as WorkflowNodeData,
  },
  {
    id: "system_1",
    type: "systemPrompt",
    position: { x: 80, y: 360 },
    data: {
      label: "System Prompt",
      nodeType: "systemPrompt",
      systemPrompt: "You are a brilliant science communicator. Explain complex topics clearly and engagingly.",
      executionStatus: "idle",
      onUpdate,
      onOpenApiKeyModal,
    } as WorkflowNodeData,
  },
  {
    id: "llm_1",
    type: "llm",
    position: { x: 460, y: 200 },
    data: {
      label: "Language Model",
      nodeType: "llm",
      selectedModel: "llama-3.3-70b-versatile",
      executionStatus: "idle",
      onUpdate,
      onOpenApiKeyModal,
    } as WorkflowNodeData,
  },
  {
    id: "output_1",
    type: "output",
    position: { x: 860, y: 180 },
    data: {
      label: "Output",
      nodeType: "output",
      executionStatus: "idle",
      onUpdate,
      onOpenApiKeyModal,
    } as WorkflowNodeData,
  },
];

const createInitialEdges = (): Edge[] => [
  {
    id: "e_input_llm",
    source: "input_1",
    sourceHandle: "output",
    target: "llm_1",
    targetHandle: "inputMessage",
    style: { stroke: "#0ea5e9", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#0ea5e9" },
  },
  {
    id: "e_system_llm",
    source: "system_1",
    sourceHandle: "output",
    target: "llm_1",
    targetHandle: "systemPrompt",
    style: { stroke: "#a855f7", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#a855f7" },
  },
  {
    id: "e_llm_output",
    source: "llm_1",
    sourceHandle: "output",
    target: "output_1",
    targetHandle: "input",
    style: { stroke: "#10b981", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#10b981" },
  },
];

export function WorkflowCanvas() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const [executionStatus, setExecutionStatus] = useState<ExecutionStatus>("idle");

  // API Key modal state
  const [apiKeyModal, setApiKeyModal] = useState<{ isOpen: boolean; nodeId: string | null }>({
    isOpen: false,
    nodeId: null,
  });

  // Callbacks for node data updates — defined before nodes so we can pass them in
  const handleNodeUpdate = useCallback(
    (id: string, newData: Partial<WorkflowNodeData>) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === id ? { ...node, data: { ...node.data, ...newData } } : node
        )
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleOpenApiKeyModal = useCallback((nodeId: string) => {
    setApiKeyModal({ isOpen: true, nodeId });
  }, []);

  const [nodes, setNodes, onNodesChange] = useNodesState(
    createInitialNodes(handleNodeUpdate, handleOpenApiKeyModal)
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(createInitialEdges());

  // Inject callbacks on mount (nodes are already created above)
  // Keep callbacks fresh in node data
  const nodesWithCallbacks = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          onUpdate: handleNodeUpdate,
          onOpenApiKeyModal: handleOpenApiKeyModal,
        },
      })),
    [nodes, handleNodeUpdate, handleOpenApiKeyModal]
  );

  // Connection handler — color edges by handle type
  const onConnect = useCallback(
    (params: Connection) => {
      const targetHandle = params.targetHandle || "input";
      const colors = edgeColors[targetHandle] || { stroke: "#475569", markerColor: "#475569" };
      const newEdge: Edge = {
        ...params,
        id: `edge_${Date.now()}`,
        style: { stroke: colors.stroke, strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: colors.markerColor },
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  // Drag-and-drop from palette
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/reactflow") as NodeType;
      if (!type || !rfInstance) return;

      const position = rfInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const id = getId();
      const newNode: Node = {
        id,
        type,
        position,
        data: {
          label: type,
          nodeType: type,
          executionStatus: "idle",
          onUpdate: handleNodeUpdate,
          onOpenApiKeyModal: handleOpenApiKeyModal,
        } as WorkflowNodeData,
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [rfInstance, setNodes, handleNodeUpdate, handleOpenApiKeyModal]
  );

  const onDragStart = useCallback((event: React.DragEvent, nodeType: NodeType) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  }, []);

  // Execute workflow
  const handleExecute = useCallback(async () => {
    setExecutionStatus("running");

    // Set all nodes to running state
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: { ...n.data, executionStatus: "running", outputContent: undefined },
      }))
    );

    // Animate edges
    setEdges((eds) =>
      eds.map((e) => ({ ...e, animated: true }))
    );

    try {
      const response = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodes: nodesWithCallbacks.map((n) => ({
            id: n.id,
            type: n.type,
            data: {
              nodeType:       (n.data as WorkflowNodeData).nodeType,
              inputMessage:   (n.data as WorkflowNodeData).inputMessage,
              systemPrompt:   (n.data as WorkflowNodeData).systemPrompt,
              memoryContent:  (n.data as WorkflowNodeData).memoryContent,
              selectedModel:  (n.data as WorkflowNodeData).selectedModel,
              apiKey:         (n.data as WorkflowNodeData).apiKey,
              // RAG node data
              docName:        (n.data as WorkflowNodeData).docName,
              docBase64:      (n.data as WorkflowNodeData).docBase64,
              docMimeType:    (n.data as WorkflowNodeData).docMimeType,
              chunkSize:      (n.data as WorkflowNodeData).chunkSize,
              chunkOverlap:   (n.data as WorkflowNodeData).chunkOverlap,
              collectionName: (n.data as WorkflowNodeData).collectionName,
              topK:           (n.data as WorkflowNodeData).topK,
            },
          })),
          edges: edges.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle,
            targetHandle: e.targetHandle,
          })),
        }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || "Execution failed");
      }

      // Apply results back to each node by type
      const statusMsgs: Record<string, string> = result.statusMessages ?? {};

      setNodes((nds) =>
        nds.map((n) => {
          const nd = n.data as WorkflowNodeData;
          const base = { ...n.data, executionStatus: "success" as const };
          const msg  = statusMsgs[nd.nodeType];

          switch (nd.nodeType) {
            case "output":
              return { ...n, data: { ...base, outputContent: result.output, outputTime: result.time } };
            case "markdownConverter":
              return { ...n, data: { ...base, markdownPreview: result.markdownPreview, statusMessage: msg } };
            case "chunker":
              return { ...n, data: { ...base, chunkCount: result.chunkCount, statusMessage: msg } };
            case "embedder":
              return { ...n, data: { ...base, vectorCount: result.vectorCount, statusMessage: msg } };
            case "retriever":
              return { ...n, data: { ...base, retrievedChunks: result.retrievedChunks, statusMessage: msg } };
            default:
              return { ...n, data: { ...base, statusMessage: msg } };
          }
        })
      );

      setExecutionStatus("success");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";

      setNodes((nds) =>
        nds.map((n) => {
          const nodeData = n.data as WorkflowNodeData;
          if (nodeData.nodeType === "output") {
            return {
              ...n,
              data: {
                ...n.data,
                executionStatus: "error",
                outputContent: message,
              },
            };
          }
          return { ...n, data: { ...n.data, executionStatus: "error" } };
        })
      );

      setExecutionStatus("error");
    } finally {
      // Stop edge animation
      setEdges((eds) => eds.map((e) => ({ ...e, animated: false })));
    }
  }, [nodesWithCallbacks, edges, setNodes, setEdges]);

  // Clear canvas
  const handleClearCanvas = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setExecutionStatus("idle");
  }, [setNodes, setEdges]);

  // Reset view
  const handleResetLayout = useCallback(() => {
    rfInstance?.fitView({ padding: 0.1, duration: 600 });
  }, [rfInstance]);

  // Check if workflow is executable
  const canExecute = useMemo(() => {
    const llmNode = nodesWithCallbacks.find(
      (n) => (n.data as WorkflowNodeData).nodeType === "llm"
    );
    if (!llmNode) return false;
    const data = llmNode.data as WorkflowNodeData;
    return !!(data.apiKey && data.selectedModel);
  }, [nodesWithCallbacks]);

  // Save API key to LLM node
  const handleApiKeySave = useCallback(
    (apiKey: string) => {
      if (apiKeyModal.nodeId) {
        handleNodeUpdate(apiKeyModal.nodeId, { apiKey });
      }
    },
    [apiKeyModal.nodeId, handleNodeUpdate]
  );

  const llmNode = nodesWithCallbacks.find(
    (n) => (n.data as WorkflowNodeData).nodeType === "llm"
  );
  const existingKey = llmNode ? (llmNode.data as WorkflowNodeData).apiKey : undefined;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <Toolbar
        nodeCount={nodes.length}
        edgeCount={edges.length}
        executionStatus={executionStatus}
        canExecute={canExecute}
        onExecute={handleExecute}
        onClearCanvas={handleClearCanvas}
        onResetLayout={handleResetLayout}
      />

      <div className="flex flex-1 overflow-hidden">
        <NodePalette onDragStart={onDragStart} />

        {/* Canvas */}
        <div className="flex-1 relative" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodesWithCallbacks}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setRfInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            fitView
            fitViewOptions={{ padding: 0.1 }}
            deleteKeyCode={["Backspace", "Delete"]}
            multiSelectionKeyCode="Shift"
            snapToGrid={false}
            minZoom={0.2}
            maxZoom={2}
            nodesFocusable={false}
            proOptions={{ hideAttribution: true }}
          >
            {/* Force-remove React Flow default node wrapper appearance */}
            <style>{`
              .react-flow__node {
                background: transparent !important;
                border: none !important;
                border-radius: 0 !important;
                padding: 0 !important;
                box-shadow: none !important;
                outline: none !important;
              }
              .react-flow__node:focus,
              .react-flow__node:focus-visible,
              .react-flow__node.selected {
                background: transparent !important;
                border: none !important;
                box-shadow: none !important;
                outline: none !important;
              }
              .react-flow__node-inputMessage,
              .react-flow__node-systemPrompt,
              .react-flow__node-memory,
              .react-flow__node-llm,
              .react-flow__node-output {
                background: transparent !important;
                border: none !important;
                padding: 0 !important;
                box-shadow: none !important;
              }
            `}</style>
            <Background
              variant={BackgroundVariant.Dots}
              gap={24}
              size={1}
              color="#1e293b"
            />
            <Controls
              position="bottom-right"
              showInteractive={false}
            />
            <MiniMap
              position="bottom-left"
              nodeColor={(n) => {
                const type = (n.data as WorkflowNodeData)?.nodeType;
                const colors: Record<string, string> = {
                  inputMessage: "#0ea5e9",
                  systemPrompt: "#a855f7",
                  memory: "#f59e0b",
                  llm: "#10b981",
                  output: "#f97316",
                  docUpload: "#3b82f6",
                  markdownConverter: "#84cc16",
                  chunker: "#8b5cf6",
                  embedder: "#06b6d4",
                  retriever: "#f43f5e",
                };
                return colors[type] || "#475569";
              }}
              maskColor="rgba(8, 15, 28, 0.7)"
              style={{ borderRadius: 8 }}
            />

            {/* Empty state hint */}
            {nodes.length === 0 && (
              <Panel position="top-center">
                <div className="mt-20 flex flex-col items-center gap-3 text-center pointer-events-none">
                  <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center">
                    <span className="text-2xl">⚡</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-400">Canvas is empty</p>
                    <p className="text-xs text-slate-600 mt-1">
                      Drag nodes from the left panel to get started
                    </p>
                  </div>
                </div>
              </Panel>
            )}
          </ReactFlow>
        </div>
      </div>

      {/* API Key Modal */}
      <ApiKeyModal
        isOpen={apiKeyModal.isOpen}
        onClose={() => setApiKeyModal({ isOpen: false, nodeId: null })}
        onSave={handleApiKeySave}
        existingKey={existingKey}
      />
    </div>
  );
}

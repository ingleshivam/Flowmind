"use client";

import { Handle, Position, NodeProps } from "@xyflow/react";
import { Cpu, Key, ChevronDown, Zap } from "lucide-react";
import { WorkflowNodeData, GROQ_MODELS } from "@/types/workflow";
import { cn } from "@/lib/utils";
import { useCallback, useState } from "react";

export function LLMNode({ id, data, selected }: NodeProps) {
  const nodeData = data as WorkflowNodeData;
  const [isSelectOpen, setIsSelectOpen] = useState(false);

  const handleModelSelect = useCallback(
    (modelId: string) => {
      nodeData.onUpdate?.(id, { selectedModel: modelId });
      setIsSelectOpen(false);
      // Open API key modal if no key set
      if (!nodeData.apiKey) {
        setTimeout(() => nodeData.onOpenApiKeyModal?.(id), 100);
      }
    },
    [id, nodeData]
  );

  const selectedModel = GROQ_MODELS.find((m) => m.id === nodeData.selectedModel);

  const tierColor: Record<string, string> = {
    flagship: "text-emerald-400 bg-emerald-400/10",
    standard: "text-sky-400 bg-sky-400/10",
    fast: "text-amber-400 bg-amber-400/10",
  };

  return (
    <div
      className={cn(
        "node-glow-llm rounded-xl overflow-hidden transition-all duration-200",
        "bg-[#041a12] border border-emerald-500/30",
        selected && "border-emerald-400/70 ring-1 ring-emerald-400/30",
        nodeData.executionStatus === "running" && "node-executing"
      )}
      style={{ width: 300 }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-500/10 border-b border-emerald-500/20">
        <div className="flex items-center justify-center w-6 h-6 rounded-md bg-emerald-500/20">
          <Cpu className="w-3.5 h-3.5 text-emerald-400" />
        </div>
        <span className="text-xs font-semibold text-emerald-300 tracking-wide uppercase">
          Language Model
        </span>
        <span className="ml-1 text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-mono">
          Groq
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          {nodeData.executionStatus === "running" && (
            <div className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-emerald-400 animate-pulse" />
              <span className="text-[9px] text-emerald-400 font-mono">processing</span>
            </div>
          )}
          {nodeData.executionStatus === "success" && (
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
          )}
          {nodeData.executionStatus === "error" && (
            <div className="w-2 h-2 rounded-full bg-red-400" />
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2.5">
        {/* Model Selector */}
        <div className="relative">
          <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Model
          </label>
          <button
            className={cn(
              "w-full flex items-center justify-between px-2.5 py-2",
              "bg-emerald-950/30 border border-emerald-500/20 rounded-lg",
              "text-sm text-slate-300 hover:border-emerald-400/40 transition-colors",
              "focus:outline-none focus:ring-1 focus:ring-emerald-400/30"
            )}
            onClick={() => setIsSelectOpen(!isSelectOpen)}
          >
            <span className="text-xs font-mono truncate">
              {selectedModel ? selectedModel.label : "Select a model..."}
            </span>
            <ChevronDown
              className={cn(
                "w-3.5 h-3.5 text-slate-500 shrink-0 ml-2 transition-transform",
                isSelectOpen && "rotate-180"
              )}
            />
          </button>

          {isSelectOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-[#041a12] border border-emerald-500/30 rounded-lg shadow-xl overflow-hidden">
              {GROQ_MODELS.map((model) => (
                <button
                  key={model.id}
                  className={cn(
                    "w-full flex items-center justify-between px-2.5 py-2",
                    "hover:bg-emerald-500/10 transition-colors text-left",
                    nodeData.selectedModel === model.id && "bg-emerald-500/15"
                  )}
                  onClick={() => handleModelSelect(model.id)}
                >
                  <span className="text-xs font-mono text-slate-300 truncate">{model.label}</span>
                  <span className={cn("text-[9px] px-1.5 py-0.5 rounded ml-2 shrink-0 font-mono", tierColor[model.tier])}>
                    {model.tier}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* API Key Status */}
        <div>
          <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            API Key
          </label>
          <button
            className={cn(
              "w-full flex items-center gap-2 px-2.5 py-2",
              "border rounded-lg text-xs transition-all",
              nodeData.apiKey
                ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-400 hover:border-emerald-400/50"
                : "bg-red-950/20 border-red-500/20 text-red-400 hover:border-red-400/40"
            )}
            onClick={() => nodeData.onOpenApiKeyModal?.(id)}
          >
            <Key className="w-3 h-3 shrink-0" />
            <span className="font-mono">
              {nodeData.apiKey
                ? `gsk_${"•".repeat(12)}${nodeData.apiKey.slice(-4)}`
                : "Click to set API key"}
            </span>
            {nodeData.apiKey && (
              <span className="ml-auto text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">
                set
              </span>
            )}
          </button>
        </div>

        {/* Input handle labels */}
        <div className="pt-1 space-y-1">
          <p className="text-[10px] text-slate-600 font-mono">Inputs: message · system · memory</p>
        </div>
      </div>

      {/* Input handles — left side, 3 positions */}
      <Handle
        type="target"
        position={Position.Left}
        id="inputMessage"
        style={{
          background: "#0ea5e9",
          border: "2px solid #0c4a6e",
          width: 12,
          height: 12,
          left: -6,
          top: "30%",
        }}
        title="Input Message"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="systemPrompt"
        style={{
          background: "#a855f7",
          border: "2px solid #3b0764",
          width: 12,
          height: 12,
          left: -6,
          top: "55%",
        }}
        title="System Prompt"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="memory"
        style={{
          background: "#f59e0b",
          border: "2px solid #451a03",
          width: 12,
          height: 12,
          left: -6,
          top: "80%",
        }}
        title="Memory"
      />

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{
          background: "#10b981",
          border: "2px solid #064e3b",
          width: 12,
          height: 12,
          right: -6,
          top: "50%",
        }}
      />
    </div>
  );
}

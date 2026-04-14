"use client";

import { Handle, Position, NodeProps } from "@xyflow/react";
import { Settings2 } from "lucide-react";
import { WorkflowNodeData } from "@/types/workflow";
import { cn } from "@/lib/utils";
import { useCallback } from "react";

export function SystemPromptNode({ id, data, selected }: NodeProps) {
  const nodeData = data as WorkflowNodeData;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      nodeData.onUpdate?.(id, { systemPrompt: e.target.value });
    },
    [id, nodeData]
  );

  return (
    <div
      className={cn(
        "node-glow-system rounded-xl overflow-hidden transition-all duration-200",
        "bg-[#140d24] border border-purple-500/30",
        selected && "border-purple-400/70 ring-1 ring-purple-400/30",
        nodeData.executionStatus === "running" && "node-executing"
      )}
      style={{ width: 280 }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-purple-500/10 border-b border-purple-500/20">
        <div className="flex items-center justify-center w-6 h-6 rounded-md bg-purple-500/20">
          <Settings2 className="w-3.5 h-3.5 text-purple-400" />
        </div>
        <span className="text-xs font-semibold text-purple-300 tracking-wide uppercase">
          System Prompt
        </span>
        <div className="ml-auto">
          {nodeData.executionStatus === "running" && (
            <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse-green" />
          )}
          {nodeData.executionStatus === "success" && (
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-3">
        <textarea
          className={cn(
            "w-full h-28 bg-purple-950/20 border border-purple-500/20 rounded-lg",
            "text-sm text-slate-200 placeholder:text-slate-600",
            "p-2.5 resize-none focus:outline-none focus:border-purple-400/50 focus:ring-1 focus:ring-purple-400/20",
            "transition-colors font-mono text-xs leading-relaxed"
          )}
          placeholder="You are a helpful assistant. Define the AI's role and behavior here..."
          value={nodeData.systemPrompt || ""}
          onChange={handleChange}
        />
        <p className="mt-1.5 text-[10px] text-slate-600 font-mono">
          {(nodeData.systemPrompt || "").length} chars
        </p>
      </div>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{
          background: "#a855f7",
          border: "2px solid #3b0764",
          width: 12,
          height: 12,
          right: -6,
        }}
      />
    </div>
  );
}

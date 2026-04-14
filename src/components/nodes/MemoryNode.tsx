"use client";

import { Handle, Position, NodeProps } from "@xyflow/react";
import { Brain } from "lucide-react";
import { WorkflowNodeData } from "@/types/workflow";
import { cn } from "@/lib/utils";
import { useCallback } from "react";

export function MemoryNode({ id, data, selected }: NodeProps) {
  const nodeData = data as WorkflowNodeData;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      nodeData.onUpdate?.(id, { memoryContent: e.target.value });
    },
    [id, nodeData]
  );

  return (
    <div
      className={cn(
        "node-glow-memory rounded-xl overflow-hidden transition-all duration-200",
        "bg-[#1c1400] border border-amber-500/30",
        selected && "border-amber-400/70 ring-1 ring-amber-400/30",
        nodeData.executionStatus === "running" && "node-executing"
      )}
      style={{ width: 280 }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-500/10 border-b border-amber-500/20">
        <div className="flex items-center justify-center w-6 h-6 rounded-md bg-amber-500/20">
          <Brain className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <span className="text-xs font-semibold text-amber-300 tracking-wide uppercase">
          Memory
        </span>
        <span className="ml-1 text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-mono">
          context
        </span>
        <div className="ml-auto">
          {nodeData.executionStatus === "running" && (
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse-green" />
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
            "w-full h-24 bg-amber-950/20 border border-amber-500/20 rounded-lg",
            "text-sm text-slate-200 placeholder:text-slate-600",
            "p-2.5 resize-none focus:outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20",
            "transition-colors font-mono text-xs leading-relaxed"
          )}
          placeholder="Add contextual memory or conversation history..."
          value={nodeData.memoryContent || ""}
          onChange={handleChange}
        />
        <p className="mt-1.5 text-[10px] text-slate-600 font-mono">
          Injected as context into the LLM
        </p>
      </div>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{
          background: "#f59e0b",
          border: "2px solid #451a03",
          width: 12,
          height: 12,
          right: -6,
        }}
      />
    </div>
  );
}

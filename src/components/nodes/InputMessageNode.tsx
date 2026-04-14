"use client";

import { Handle, Position, NodeProps } from "@xyflow/react";
import { MessageSquare, Trash2 } from "lucide-react";
import { WorkflowNodeData } from "@/types/workflow";
import { cn } from "@/lib/utils";
import { useCallback } from "react";

export function InputMessageNode({ id, data, selected }: NodeProps) {
  const nodeData = data as WorkflowNodeData;
  
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      nodeData.onUpdate?.(id, { inputMessage: e.target.value });
    },
    [id, nodeData]
  );

  return (
    <div
      className={cn(
        "node-glow-input rounded-xl overflow-hidden transition-all duration-200",
        "bg-[#0b1a2e] border border-sky-500/30",
        selected && "border-sky-400/70 ring-1 ring-sky-400/30",
        nodeData.executionStatus === "running" && "node-executing"
      )}
      style={{ width: 280 }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-sky-500/10 border-b border-sky-500/20">
        <div className="flex items-center justify-center w-6 h-6 rounded-md bg-sky-500/20">
          <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
        </div>
        <span className="text-xs font-semibold text-sky-300 tracking-wide uppercase">
          Input Message
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          {nodeData.executionStatus === "running" && (
            <div className="w-2 h-2 rounded-full bg-sky-400 animate-pulse-green" />
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
            "w-full h-24 bg-sky-950/20 border border-sky-500/20 rounded-lg",
            "text-sm text-slate-200 placeholder:text-slate-600",
            "p-2.5 resize-none focus:outline-none focus:border-sky-400/50 focus:ring-1 focus:ring-sky-400/20",
            "transition-colors font-mono text-xs leading-relaxed"
          )}
          placeholder="Enter your message here..."
          value={nodeData.inputMessage || ""}
          onChange={handleChange}
        />
        <p className="mt-1.5 text-[10px] text-slate-600 font-mono">
          {(nodeData.inputMessage || "").length} chars
        </p>
      </div>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{
          background: "#0ea5e9",
          border: "2px solid #0c4a6e",
          width: 12,
          height: 12,
          right: -6,
        }}
      />
    </div>
  );
}

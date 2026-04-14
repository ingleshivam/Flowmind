"use client";

import { Handle, Position, NodeProps } from "@xyflow/react";
import { FileCode, CheckCircle, AlignLeft } from "lucide-react";
import { WorkflowNodeData } from "@/types/workflow";
import { cn } from "@/lib/utils";

export function MarkdownConverterNode({ id, data, selected }: NodeProps) {
  const nodeData = data as WorkflowNodeData;
  const isSuccess = nodeData.executionStatus === "success";
  const isRunning = nodeData.executionStatus === "running";
  const isError   = nodeData.executionStatus === "error";

  return (
    <div
      className={cn(
        "rounded-xl overflow-hidden transition-all duration-200",
        "bg-[#0d1a10] border border-lime-500/30",
        selected && "border-lime-400/70 ring-1 ring-lime-400/30",
        isRunning && "node-executing"
      )}
      style={{
        width: 260,
        boxShadow: "0 0 0 1px rgba(132,204,22,0.25), 0 4px 20px rgba(132,204,22,0.08)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-lime-500/10 border-b border-lime-500/20">
        <div className="flex items-center justify-center w-6 h-6 rounded-md bg-lime-500/20">
          <FileCode className="w-3.5 h-3.5 text-lime-400" />
        </div>
        <span className="text-xs font-semibold text-lime-300 tracking-wide uppercase">
          Markdown Converter
        </span>
        <div className="ml-auto">
          {isRunning && <div className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" />}
          {isSuccess && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
        </div>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2">
        {/* Info */}
        <div className="flex items-center gap-2 p-2 bg-lime-950/20 border border-lime-500/15 rounded-lg">
          <AlignLeft className="w-3.5 h-3.5 text-lime-500 shrink-0" />
          <p className="text-[10px] text-slate-500 leading-relaxed">
            Extracts text from PDF/TXT and converts to clean Markdown
          </p>
        </div>

        {/* Preview box */}
        <div className={cn(
          "min-h-[80px] max-h-[120px] overflow-y-auto rounded-lg p-2.5",
          "bg-lime-950/20 border border-lime-500/15",
          "text-[9px] font-mono leading-relaxed",
          isRunning && "animate-pulse"
        )}>
          {!nodeData.markdownPreview && !isRunning && (
            <p className="text-slate-700 text-center mt-4">
              Markdown preview will appear after execution
            </p>
          )}
          {isRunning && (
            <p className="text-lime-600">Converting document…</p>
          )}
          {nodeData.markdownPreview && (
            <span className={isError ? "text-red-400" : "text-lime-300/80"}>
              {nodeData.markdownPreview}
            </span>
          )}
        </div>

        {nodeData.statusMessage && (
          <p className={cn(
            "text-[10px] font-mono px-2 py-1 rounded",
            isError ? "text-red-400 bg-red-950/20" : "text-lime-400 bg-lime-950/20"
          )}>
            {nodeData.statusMessage}
          </p>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Left}
        id="doc"
        style={{ background: "#3b82f6", border: "2px solid #1e3a8a", width: 12, height: 12, left: -6 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{ background: "#84cc16", border: "2px solid #1a2e05", width: 12, height: 12, right: -6 }}
      />
    </div>
  );
}

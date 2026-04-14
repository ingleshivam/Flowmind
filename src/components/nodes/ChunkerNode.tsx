"use client";

import { Handle, Position, NodeProps } from "@xyflow/react";
import { Scissors, CheckCircle } from "lucide-react";
import { WorkflowNodeData } from "@/types/workflow";
import { cn } from "@/lib/utils";
import { useCallback } from "react";

export function ChunkerNode({ id, data, selected }: NodeProps) {
  const nodeData = data as WorkflowNodeData;
  const chunkSize    = nodeData.chunkSize    ?? 512;
  const chunkOverlap = nodeData.chunkOverlap ?? 64;
  const isRunning = nodeData.executionStatus === "running";
  const isSuccess = nodeData.executionStatus === "success";
  const isError   = nodeData.executionStatus === "error";

  const update = useCallback(
    (field: string, val: number) => nodeData.onUpdate?.(id, { [field]: val }),
    [id, nodeData]
  );

  return (
    <div
      className={cn(
        "rounded-xl overflow-hidden transition-all duration-200",
        "bg-[#1a0d2e] border border-violet-500/30",
        selected && "border-violet-400/70 ring-1 ring-violet-400/30",
        isRunning && "node-executing"
      )}
      style={{
        width: 260,
        boxShadow: "0 0 0 1px rgba(139,92,246,0.25), 0 4px 20px rgba(139,92,246,0.08)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-violet-500/10 border-b border-violet-500/20">
        <div className="flex items-center justify-center w-6 h-6 rounded-md bg-violet-500/20">
          <Scissors className="w-3.5 h-3.5 text-violet-400" />
        </div>
        <span className="text-xs font-semibold text-violet-300 tracking-wide uppercase">
          Text Chunker
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          {isSuccess && nodeData.chunkCount !== undefined && (
            <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/30 px-1.5 py-0.5 rounded">
              {nodeData.chunkCount} chunks
            </span>
          )}
          {isRunning && <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />}
          {isSuccess && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
        </div>
      </div>

      {/* Body */}
      <div className="p-3 space-y-3">
        {/* Chunk size */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Chunk Size
            </label>
            <span className="text-[10px] font-mono text-violet-400">{chunkSize} chars</span>
          </div>
          <input
            type="range" min={128} max={2048} step={64}
            value={chunkSize}
            onChange={(e) => update("chunkSize", Number(e.target.value))}
            className="w-full accent-violet-500 cursor-pointer"
          />
          <div className="flex justify-between text-[9px] font-mono text-slate-700 mt-0.5">
            <span>128</span><span>2048</span>
          </div>
        </div>

        {/* Overlap */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Overlap
            </label>
            <span className="text-[10px] font-mono text-violet-400">{chunkOverlap} chars</span>
          </div>
          <input
            type="range" min={0} max={256} step={16}
            value={chunkOverlap}
            onChange={(e) => update("chunkOverlap", Number(e.target.value))}
            className="w-full accent-violet-500 cursor-pointer"
          />
          <div className="flex justify-between text-[9px] font-mono text-slate-700 mt-0.5">
            <span>0</span><span>256</span>
          </div>
        </div>

        {nodeData.statusMessage && (
          <p className={cn(
            "text-[10px] font-mono px-2 py-1 rounded",
            isError ? "text-red-400 bg-red-950/20" : "text-violet-400 bg-violet-950/20"
          )}>
            {nodeData.statusMessage}
          </p>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Left}
        id="markdown"
        style={{ background: "#84cc16", border: "2px solid #1a2e05", width: 12, height: 12, left: -6 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{ background: "#8b5cf6", border: "2px solid #2e1065", width: 12, height: 12, right: -6 }}
      />
    </div>
  );
}

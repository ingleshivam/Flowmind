"use client";

import { Handle, Position, NodeProps } from "@xyflow/react";
import { Search, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import { WorkflowNodeData } from "@/types/workflow";
import { cn } from "@/lib/utils";
import { useCallback, useState } from "react";

export function RetrieverNode({ id, data, selected }: NodeProps) {
  const nodeData = data as WorkflowNodeData;
  const topK      = nodeData.topK ?? 4;
  const isRunning = nodeData.executionStatus === "running";
  const isSuccess = nodeData.executionStatus === "success";
  const isError   = nodeData.executionStatus === "error";
  const [expanded, setExpanded] = useState<number | null>(null);

  const handleTopK = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      nodeData.onUpdate?.(id, { topK: Number(e.target.value) });
    },
    [id, nodeData]
  );

  return (
    <div
      className={cn(
        "rounded-xl overflow-hidden transition-all duration-200",
        "bg-[#1a0f00] border border-rose-500/30",
        selected && "border-rose-400/70 ring-1 ring-rose-400/30",
        isRunning && "node-executing"
      )}
      style={{
        width: 280,
        boxShadow: "0 0 0 1px rgba(244,63,94,0.25), 0 4px 20px rgba(244,63,94,0.08)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-rose-500/10 border-b border-rose-500/20">
        <div className="flex items-center justify-center w-6 h-6 rounded-md bg-rose-500/20">
          <Search className="w-3.5 h-3.5 text-rose-400" />
        </div>
        <span className="text-xs font-semibold text-rose-300 tracking-wide uppercase">
          Retriever
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          {isSuccess && nodeData.retrievedChunks && (
            <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/30 px-1.5 py-0.5 rounded">
              {nodeData.retrievedChunks.length} retrieved
            </span>
          )}
          {isRunning && <div className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />}
          {isSuccess && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
        </div>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2.5">
        {/* Top K */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Top-K Results
            </label>
            <span className="text-[10px] font-mono text-rose-400">{topK}</span>
          </div>
          <input
            type="range" min={1} max={10} step={1}
            value={topK}
            onChange={handleTopK}
            className="w-full accent-rose-500 cursor-pointer"
          />
          <div className="flex justify-between text-[9px] font-mono text-slate-700 mt-0.5">
            <span>1</span><span>10</span>
          </div>
        </div>

        {/* Retrieved chunks display */}
        {nodeData.retrievedChunks && nodeData.retrievedChunks.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Retrieved Chunks
            </p>
            {nodeData.retrievedChunks.map((chunk, i) => (
              <div
                key={i}
                className="bg-rose-950/20 border border-rose-500/15 rounded-lg overflow-hidden"
              >
                <button
                  className="w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-rose-500/5 transition-colors"
                  onClick={() => setExpanded(expanded === i ? null : i)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-rose-400 bg-rose-500/20 px-1 py-0.5 rounded">
                      #{i + 1}
                    </span>
                    <span className="text-[9px] font-mono text-slate-500">
                      score: {chunk.score.toFixed(3)}
                    </span>
                  </div>
                  {expanded === i
                    ? <ChevronUp className="w-3 h-3 text-slate-600" />
                    : <ChevronDown className="w-3 h-3 text-slate-600" />
                  }
                </button>
                {expanded === i && (
                  <div className="px-2.5 pb-2 border-t border-rose-500/10">
                    <p className="text-[9px] font-mono text-slate-400 leading-relaxed pt-1.5 whitespace-pre-wrap line-clamp-6">
                      {chunk.text}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {nodeData.statusMessage && (
          <p className={cn(
            "text-[10px] font-mono px-2 py-1 rounded",
            isError ? "text-red-400 bg-red-950/20" : "text-rose-400 bg-rose-950/20"
          )}>
            {nodeData.statusMessage}
          </p>
        )}
      </div>

      {/* 2 target handles: vector store + query */}
      <Handle
        type="target"
        position={Position.Left}
        id="vectorStore"
        style={{ background: "#06b6d4", border: "2px solid #083344", width: 12, height: 12, left: -6, top: "35%" }}
        title="Vector Store"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="query"
        style={{ background: "#0ea5e9", border: "2px solid #0c4a6e", width: 12, height: 12, left: -6, top: "70%" }}
        title="Query"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{ background: "#f43f5e", border: "2px solid #4c0519", width: 12, height: 12, right: -6 }}
      />
    </div>
  );
}

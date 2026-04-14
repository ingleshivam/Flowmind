"use client";

import { Handle, Position, NodeProps } from "@xyflow/react";
import { Terminal, Clock, Copy, Check, ChevronDown, ChevronUp, Database } from "lucide-react";
import { WorkflowNodeData, ChunkInfo } from "@/types/workflow";
import { cn, formatTime } from "@/lib/utils";
import { useState, useCallback } from "react";

export function OutputNode({ id, data, selected }: NodeProps) {
  const nodeData = data as WorkflowNodeData;
  const [copied, setCopied] = useState(false);
  const [showChunks, setShowChunks] = useState(false);
  const [expandedChunk, setExpandedChunk] = useState<number | null>(null);

  const handleCopy = useCallback(() => {
    if (nodeData.outputContent) {
      navigator.clipboard.writeText(nodeData.outputContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [nodeData.outputContent]);

  const isRunning = nodeData.executionStatus === "running";
  const isSuccess = nodeData.executionStatus === "success";
  const isError   = nodeData.executionStatus === "error";

  const hasRagMeta = isSuccess && (
    nodeData.retrievedChunks && nodeData.retrievedChunks.length > 0
  );

  return (
    <div
      className={cn(
        "node-glow-output rounded-xl overflow-hidden transition-all duration-200",
        "bg-[#1c0a00] border border-orange-500/30",
        selected && "border-orange-400/70 ring-1 ring-orange-400/30",
        isRunning && "node-executing"
      )}
      style={{ width: 360 }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-orange-500/10 border-b border-orange-500/20">
        <div className="flex items-center justify-center w-6 h-6 rounded-md bg-orange-500/20">
          <Terminal className="w-3.5 h-3.5 text-orange-400" />
        </div>
        <span className="text-xs font-semibold text-orange-300 tracking-wide uppercase">
          Output
        </span>
        <div className="flex items-center gap-2 ml-auto">
          {isSuccess && nodeData.outputTime && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-500" />
              <span className="text-[10px] font-mono text-slate-500">
                {formatTime(nodeData.outputTime)}
              </span>
            </div>
          )}
          {nodeData.outputContent && (
            <button
              onClick={handleCopy}
              className="text-slate-500 hover:text-slate-300 transition-colors"
              title="Copy output"
            >
              {copied
                ? <Check className="w-3.5 h-3.5 text-emerald-400" />
                : <Copy className="w-3.5 h-3.5" />
              }
            </button>
          )}
        </div>
      </div>

      {/* Status bar */}
      {(isRunning || isSuccess || isError) && (
        <div className={cn(
          "flex items-center gap-2 px-3 py-1.5 border-b",
          isRunning && "bg-emerald-950/30 border-emerald-500/20",
          isSuccess && "bg-emerald-950/20 border-emerald-500/10",
          isError   && "bg-red-950/30 border-red-500/20"
        )}>
          {isRunning && (
            <>
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-mono text-emerald-400">Generating response…</span>
            </>
          )}
          {isSuccess && (
            <>
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-[10px] font-mono text-emerald-400">Complete</span>
            </>
          )}
          {isError && (
            <>
              <div className="w-2 h-2 rounded-full bg-red-400" />
              <span className="text-[10px] font-mono text-red-400">Error</span>
            </>
          )}
        </div>
      )}

      {/* RAG metadata bar */}
      {hasRagMeta && (
        <div className="flex items-center gap-3 px-3 py-1.5 bg-cyan-950/20 border-b border-cyan-500/15">
          <Database className="w-3 h-3 text-cyan-500 shrink-0" />
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {nodeData.retrievedChunks && (
              <span className="text-[9px] font-mono text-cyan-400">
                {nodeData.retrievedChunks.length} chunks retrieved
              </span>
            )}
          </div>
          <button
            onClick={() => setShowChunks(!showChunks)}
            className="flex items-center gap-1 text-[9px] font-mono text-cyan-500 hover:text-cyan-300 transition-colors shrink-0"
          >
            {showChunks ? "hide" : "show"} context
            {showChunks
              ? <ChevronUp className="w-3 h-3" />
              : <ChevronDown className="w-3 h-3" />
            }
          </button>
        </div>
      )}

      {/* Retrieved chunks accordion */}
      {hasRagMeta && showChunks && nodeData.retrievedChunks && (
        <div className="border-b border-cyan-500/10 max-h-48 overflow-y-auto">
          {nodeData.retrievedChunks.map((chunk: ChunkInfo, i: number) => (
            <div key={i} className="border-b border-cyan-950/40 last:border-0">
              <button
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-cyan-950/20 transition-colors text-left"
                onClick={() => setExpandedChunk(expandedChunk === i ? null : i)}
              >
                <span className="text-[9px] font-mono text-cyan-500 bg-cyan-950/40 px-1.5 py-0.5 rounded shrink-0">
                  #{chunk.index + 1}
                </span>
                <span className="text-[9px] font-mono text-slate-600 shrink-0">
                  score: {chunk.score.toFixed(3)}
                </span>
                <span className="text-[9px] text-slate-600 truncate flex-1">
                  {chunk.text.slice(0, 60)}…
                </span>
                {expandedChunk === i
                  ? <ChevronUp className="w-3 h-3 text-slate-600 shrink-0" />
                  : <ChevronDown className="w-3 h-3 text-slate-600 shrink-0" />
                }
              </button>
              {expandedChunk === i && (
                <div className="px-3 pb-2 bg-cyan-950/10">
                  <p className="text-[9px] font-mono text-slate-400 leading-relaxed whitespace-pre-wrap">
                    {chunk.text}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Main output content */}
      <div className="p-3">
        <div className={cn(
          "min-h-[120px] max-h-[300px] overflow-y-auto rounded-lg p-3",
          "bg-orange-950/20 border border-orange-500/15",
          "text-xs font-mono leading-relaxed text-slate-300",
          isRunning && "typing-cursor"
        )}>
          {!nodeData.outputContent && !isRunning && (
            <div className="flex flex-col items-center justify-center h-20 text-slate-700">
              <Terminal className="w-6 h-6 mb-2 opacity-30" />
              <p className="text-[11px]">Output will appear here</p>
            </div>
          )}
          {isError && nodeData.outputContent && (
            <span className="text-red-400">{nodeData.outputContent}</span>
          )}
          {!isError && nodeData.outputContent && (
            <span className="whitespace-pre-wrap">{nodeData.outputContent}</span>
          )}
        </div>
      </div>

      <Handle
        type="target"
        position={Position.Left}
        id="input"
        style={{
          background: "#f97316",
          border: "2px solid #431407",
          width: 12, height: 12, left: -6,
        }}
      />
    </div>
  );
}

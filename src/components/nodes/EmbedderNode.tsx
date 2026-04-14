"use client";

import { Handle, Position, NodeProps } from "@xyflow/react";
import { Database, CheckCircle, Zap } from "lucide-react";
import { WorkflowNodeData, EMBEDDING_MODEL, DEFAULT_COLLECTION } from "@/types/workflow";
import { cn } from "@/lib/utils";
import { useCallback } from "react";

export function EmbedderNode({ id, data, selected }: NodeProps) {
  const nodeData = data as WorkflowNodeData;
  const collectionName = nodeData.collectionName ?? DEFAULT_COLLECTION;
  const isRunning = nodeData.executionStatus === "running";
  const isSuccess = nodeData.executionStatus === "success";
  const isError   = nodeData.executionStatus === "error";

  const handleCollectionChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      nodeData.onUpdate?.(id, { collectionName: e.target.value });
    },
    [id, nodeData]
  );

  return (
    <div
      className={cn(
        "rounded-xl overflow-hidden transition-all duration-200",
        "bg-[#001a1a] border border-cyan-500/30",
        selected && "border-cyan-400/70 ring-1 ring-cyan-400/30",
        isRunning && "node-executing"
      )}
      style={{
        width: 260,
        boxShadow: "0 0 0 1px rgba(6,182,212,0.25), 0 4px 20px rgba(6,182,212,0.08)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-cyan-500/10 border-b border-cyan-500/20">
        <div className="flex items-center justify-center w-6 h-6 rounded-md bg-cyan-500/20">
          <Database className="w-3.5 h-3.5 text-cyan-400" />
        </div>
        <span className="text-xs font-semibold text-cyan-300 tracking-wide uppercase">
          Embedder + Qdrant
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          {isSuccess && nodeData.vectorCount !== undefined && (
            <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/30 px-1.5 py-0.5 rounded">
              {nodeData.vectorCount} vectors
            </span>
          )}
          {isRunning && <Zap className="w-3 h-3 text-cyan-400 animate-pulse" />}
          {isSuccess && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
        </div>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2.5">
        {/* Embedding model badge */}
        <div className="flex items-center gap-2 p-2 bg-cyan-950/20 border border-cyan-500/15 rounded-lg">
          <Zap className="w-3 h-3 text-cyan-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[9px] text-slate-600 uppercase tracking-wider font-semibold">Embedding Model</p>
            <p className="text-[10px] font-mono text-cyan-300 truncate">{EMBEDDING_MODEL}</p>
          </div>
          <span className="text-[8px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded font-mono shrink-0">
            768d
          </span>
        </div>

        {/* Collection name */}
        <div>
          <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Qdrant Collection
          </label>
          <input
            type="text"
            value={collectionName}
            onChange={handleCollectionChange}
            className={cn(
              "w-full bg-cyan-950/20 border border-cyan-500/20 rounded-lg px-2.5 py-1.5",
              "text-xs font-mono text-cyan-300 placeholder:text-slate-600",
              "focus:outline-none focus:border-cyan-400/40 focus:ring-1 focus:ring-cyan-400/20 transition-colors"
            )}
            placeholder="collection_name"
          />
        </div>

        {/* Status */}
        {nodeData.statusMessage && (
          <p className={cn(
            "text-[10px] font-mono px-2 py-1 rounded",
            isError ? "text-red-400 bg-red-950/20" : "text-cyan-400 bg-cyan-950/20"
          )}>
            {nodeData.statusMessage}
          </p>
        )}

        <p className="text-[9px] text-slate-700 font-mono text-center">
          In-memory Qdrant · auto-recreated per run
        </p>
      </div>

      <Handle
        type="target"
        position={Position.Left}
        id="chunks"
        style={{ background: "#8b5cf6", border: "2px solid #2e1065", width: 12, height: 12, left: -6 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{ background: "#06b6d4", border: "2px solid #083344", width: 12, height: 12, right: -6 }}
      />
    </div>
  );
}

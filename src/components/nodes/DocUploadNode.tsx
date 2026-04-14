"use client";

import { Handle, Position, NodeProps } from "@xyflow/react";
import { FileUp, FileText, X, CheckCircle } from "lucide-react";
import { WorkflowNodeData } from "@/types/workflow";
import { cn } from "@/lib/utils";
import { useCallback, useRef } from "react";

export function DocUploadNode({ id, data, selected }: NodeProps) {
  const nodeData = data as WorkflowNodeData;
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        nodeData.onUpdate?.(id, {
          docName: file.name,
          docBase64: base64,
          docMimeType: file.type,
          executionStatus: "idle",
          statusMessage: undefined,
        });
      };
      reader.readAsDataURL(file);
    },
    [id, nodeData]
  );

  const handleClear = useCallback(() => {
    nodeData.onUpdate?.(id, {
      docName: undefined,
      docBase64: undefined,
      docMimeType: undefined,
      executionStatus: "idle",
      statusMessage: undefined,
    });
    if (inputRef.current) inputRef.current.value = "";
  }, [id, nodeData]);

  const hasFile = !!nodeData.docBase64;

  return (
    <div
      className={cn(
        "rounded-xl overflow-hidden transition-all duration-200",
        "bg-[#0e1a2e] border border-blue-500/30",
        selected && "border-blue-400/70 ring-1 ring-blue-400/30",
        nodeData.executionStatus === "running" && "node-executing"
      )}
      style={{
        width: 260,
        boxShadow: "0 0 0 1px rgba(59,130,246,0.25), 0 4px 20px rgba(59,130,246,0.08)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-blue-500/10 border-b border-blue-500/20">
        <div className="flex items-center justify-center w-6 h-6 rounded-md bg-blue-500/20">
          <FileUp className="w-3.5 h-3.5 text-blue-400" />
        </div>
        <span className="text-xs font-semibold text-blue-300 tracking-wide uppercase">
          Document Upload
        </span>
        <div className="ml-auto flex items-center gap-1">
          {nodeData.executionStatus === "running" && (
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          )}
          {nodeData.executionStatus === "success" && (
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2">
        {!hasFile ? (
          <button
            onClick={() => inputRef.current?.click()}
            className={cn(
              "w-full flex flex-col items-center justify-center gap-2 py-5",
              "border-2 border-dashed border-blue-500/25 rounded-lg",
              "hover:border-blue-400/50 hover:bg-blue-500/5 transition-all cursor-pointer"
            )}
          >
            <FileUp className="w-6 h-6 text-blue-500/50" />
            <div className="text-center">
              <p className="text-xs font-medium text-blue-400">Click to upload</p>
              <p className="text-[10px] text-slate-600 mt-0.5">PDF, TXT, MD supported</p>
            </div>
          </button>
        ) : (
          <div className="flex items-center gap-2 p-2.5 bg-blue-950/30 border border-blue-500/20 rounded-lg">
            <FileText className="w-4 h-4 text-blue-400 shrink-0" />
            <p className="text-xs font-mono text-blue-300 truncate flex-1">{nodeData.docName}</p>
            <button
              onClick={handleClear}
              className="text-slate-500 hover:text-red-400 transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {nodeData.statusMessage && (
          <p className={cn(
            "text-[10px] font-mono px-2 py-1 rounded",
            nodeData.executionStatus === "error"
              ? "text-red-400 bg-red-950/20"
              : "text-emerald-400 bg-emerald-950/20"
          )}>
            {nodeData.statusMessage}
          </p>
        )}

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt,.md"
          className="hidden"
          onChange={handleFile}
        />
        <p className="text-[9px] text-slate-600 font-mono text-center">
          Accepts PDF · TXT · Markdown
        </p>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{ background: "#3b82f6", border: "2px solid #1e3a8a", width: 12, height: 12, right: -6 }}
      />
    </div>
  );
}

"use client";

import { Handle, Position, NodeProps } from "@xyflow/react";
import { FileUp, FileText, X, CheckCircle } from "lucide-react";
import { WorkflowNodeData } from "@/types/workflow";
import { cn } from "@/lib/utils";
import { useCallback, useRef } from "react";

export function EmailNode({ id, data, selected }: NodeProps) {
    const nodeData = data as WorkflowNodeData;
    const inputRef = useRef<HTMLInputElement>(null);

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


            </div>

            <Handle
                type="source"
                position={Position.Left}
                id="input"
                style={{ background: "#3b82f6", border: "2px solid #1e3a8a", width: 12, height: 12, right: -6 }}
            />
        </div>
    );
}

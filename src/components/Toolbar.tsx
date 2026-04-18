"use client";

import { Play, Trash2, RotateCcw, Loader2, CheckCircle, XCircle, Zap, Layers, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExecutionStatus } from "@/types/workflow";

interface ToolbarProps {
  nodeCount:      number;
  edgeCount:      number;
  executionStatus: ExecutionStatus;
  canExecute:     boolean;
  disabledReason: string;
  onExecute:      () => void;
  onClearCanvas:  () => void;
  onResetLayout:  () => void;
}

export function Toolbar({
  nodeCount,
  edgeCount,
  executionStatus,
  canExecute,
  disabledReason,
  onExecute,
  onClearCanvas,
  onResetLayout,
}: ToolbarProps) {
  const isRunning = executionStatus === "running";
  const isSuccess = executionStatus === "success";
  const isError   = executionStatus === "error";

  return (
    <header className="h-12 flex items-center justify-between px-4 bg-[#080f1c] border-b border-slate-700/50 shrink-0 z-10">

      {/* Left: canvas stats + execution badge */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500">
          <Layers className="w-3.5 h-3.5" />
          <span><span className="text-slate-300">{nodeCount}</span> nodes</span>
          <span className="text-slate-700">·</span>
          <span><span className="text-slate-300">{edgeCount}</span> edges</span>
        </div>

        {(isSuccess || isError) && (
          <div className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold font-mono",
            isSuccess && "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25",
            isError   && "bg-red-500/15 text-red-400 border border-red-500/25"
          )}>
            {isSuccess
              ? <><CheckCircle className="w-3 h-3" /> Execution complete</>
              : <><XCircle    className="w-3 h-3" /> Execution failed</>
            }
          </div>
        )}
      </div>

      {/* Center: branding */}
      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/60 border border-slate-700/50 rounded-full">
        <Zap className="w-3 h-3 text-emerald-400" />
        <span className="text-[11px] font-mono text-slate-400">
          Powered by <span className="text-emerald-400">Groq</span> · LangGraph
        </span>
      </div>

      {/* Right: actions + execute */}
      <div className="flex items-center gap-2">
        <button
          onClick={onResetLayout}
          title="Fit view"
          className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onClearCanvas}
          title="Clear canvas"
          className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-5 bg-slate-700/50" />

        {/* Disabled reason hint shown inline when not runnable */}
        {!canExecute && !isRunning && disabledReason && (
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-600 max-w-[200px]">
            <AlertCircle className="w-3 h-3 text-slate-700 shrink-0" />
            <span className="truncate">{disabledReason}</span>
          </div>
        )}

        <button
          onClick={onExecute}
          disabled={!canExecute || isRunning}
          title={!canExecute ? disabledReason : "Execute workflow"}
          className={cn(
            "flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200",
            canExecute && !isRunning
              ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 hover:shadow-emerald-900/50"
              : "bg-slate-700/50 text-slate-500 cursor-not-allowed"
          )}
        >
          {isRunning
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Running...</>
            : <><Play    className="w-3.5 h-3.5" /> Execute Workflow</>
          }
        </button>
      </div>
    </header>
  );
}

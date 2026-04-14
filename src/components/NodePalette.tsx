"use client";

import { MessageSquare, Settings2, Brain, Cpu, Terminal, GripVertical, ChevronRight, FileUp, FileCode, Scissors, Database, Search, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { NodeType } from "@/types/workflow";

interface NodeDefinition {
  type: NodeType;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
  handles: string;
}

// ─── RAG Node group ────────────────────────────────
const RAG_DEFINITIONS: NodeDefinition[] = [
  {
    type: "docUpload",
    label: "Document Upload",
    description: "Upload PDF, TXT, or Markdown",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/25 hover:border-blue-400/50",
    icon: <FileUp className="w-4 h-4 text-blue-400" />,
    handles: "1 output →",
  },
  {
    type: "markdownConverter",
    label: "Markdown Converter",
    description: "Extract & convert doc to Markdown",
    color: "text-lime-400",
    bgColor: "bg-lime-500/10",
    borderColor: "border-lime-500/25 hover:border-lime-400/50",
    icon: <FileCode className="w-4 h-4 text-lime-400" />,
    handles: "← doc  output →",
  },
  {
    type: "chunker",
    label: "Text Chunker",
    description: "Split text into overlapping chunks",
    color: "text-violet-400",
    bgColor: "bg-violet-500/10",
    borderColor: "border-violet-500/25 hover:border-violet-400/50",
    icon: <Scissors className="w-4 h-4 text-violet-400" />,
    handles: "← markdown  output →",
  },
  {
    type: "embedder",
    label: "Embedder + Qdrant",
    description: "Embed chunks & store in Qdrant DB",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/25 hover:border-cyan-400/50",
    icon: <Database className="w-4 h-4 text-cyan-400" />,
    handles: "← chunks  output →",
  },
  {
    type: "retriever",
    label: "Retriever",
    description: "Embed query & retrieve top-K chunks",
    color: "text-rose-400",
    bgColor: "bg-rose-500/10",
    borderColor: "border-rose-500/25 hover:border-rose-400/50",
    icon: <Search className="w-4 h-4 text-rose-400" />,
    handles: "← store + query  output →",
  },
];

const NODE_DEFINITIONS: NodeDefinition[] = [
  {
    type: "inputMessage",
    label: "Input Message",
    description: "User input text for the LLM",
    color: "text-sky-400",
    bgColor: "bg-sky-500/10",
    borderColor: "border-sky-500/25 hover:border-sky-400/50",
    icon: <MessageSquare className="w-4 h-4 text-sky-400" />,
    handles: "1 output →",
  },
  {
    type: "systemPrompt",
    label: "System Prompt",
    description: "Instructions defining AI behavior",
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/25 hover:border-purple-400/50",
    icon: <Settings2 className="w-4 h-4 text-purple-400" />,
    handles: "1 output →",
  },
  {
    type: "memory",
    label: "Memory",
    description: "Contextual memory & history",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/25 hover:border-amber-400/50",
    icon: <Brain className="w-4 h-4 text-amber-400" />,
    handles: "1 output →",
  },
  {
    type: "llm",
    label: "Language Model",
    description: "Groq-powered LLM processing",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/25 hover:border-emerald-400/50",
    icon: <Cpu className="w-4 h-4 text-emerald-400" />,
    handles: "3 inputs ← 1 output →",
  },
  {
    type: "output",
    label: "Output",
    description: "Display generated response",
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/25 hover:border-orange-400/50",
    icon: <Terminal className="w-4 h-4 text-orange-400" />,
    handles: "← 1 input",
  },
];

interface NodePaletteProps {
  onDragStart: (event: React.DragEvent, nodeType: NodeType) => void;
}

export function NodePalette({ onDragStart }: NodePaletteProps) {
  return (
    <aside className="w-64 h-full flex flex-col bg-[#080f1c] border-r border-slate-700/50 shrink-0">
      {/* Logo / Header */}
      <div className="px-4 py-4 border-b border-slate-700/50">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30">
            <span className="text-emerald-400 text-xs font-bold">FM</span>
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-100 tracking-tight">FlowMind</h1>
            <p className="text-[10px] text-slate-600 font-mono">Visual AI Builder</p>
          </div>
        </div>
      </div>

      {/* Nodes Section */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <div className="flex items-center gap-1.5 mb-3">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
            Nodes
          </span>
          <div className="flex-1 h-px bg-slate-700/50" />
        </div>

        {/* LLM Nodes */}
        <div className="space-y-2">
          {NODE_DEFINITIONS.map((node) => (
            <div
              key={node.type}
              draggable
              onDragStart={(e) => onDragStart(e, node.type)}
              className={cn(
                "group relative flex items-start gap-3 p-3 rounded-xl cursor-grab active:cursor-grabbing",
                "border transition-all duration-150 select-none",
                "bg-slate-800/30 hover:bg-slate-800/60",
                node.borderColor
              )}
            >
              {/* Drag indicator */}
              <GripVertical className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 shrink-0 mt-0.5 transition-colors" />

              {/* Icon */}
              <div className={cn("flex items-center justify-center w-7 h-7 rounded-lg shrink-0", node.bgColor)}>
                {node.icon}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className={cn("text-xs font-semibold leading-tight", node.color)}>
                  {node.label}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                  {node.description}
                </p>
                <p className="text-[9px] text-slate-600 mt-1 font-mono">{node.handles}</p>
              </div>

              {/* Arrow on hover */}
              <ChevronRight className="w-3.5 h-3.5 text-slate-600 opacity-0 group-hover:opacity-100 shrink-0 mt-0.5 transition-opacity" />
            </div>
          ))}
        </div>

        {/* RAG Pipeline Nodes */}
        <div className="mt-5">
          <div className="flex items-center gap-1.5 mb-3">
            <Layers className="w-3 h-3 text-cyan-600" />
            <span className="text-[10px] font-semibold text-cyan-600 uppercase tracking-widest">
              RAG Pipeline
            </span>
            <div className="flex-1 h-px bg-cyan-900/50" />
          </div>
          <div className="space-y-2">
            {RAG_DEFINITIONS.map((node) => (
              <div
                key={node.type}
                draggable
                onDragStart={(e) => onDragStart(e, node.type)}
                className={cn(
                  "group relative flex items-start gap-3 p-3 rounded-xl cursor-grab active:cursor-grabbing",
                  "border transition-all duration-150 select-none",
                  "bg-slate-800/30 hover:bg-slate-800/60",
                  node.borderColor
                )}
              >
                <GripVertical className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 shrink-0 mt-0.5 transition-colors" />
                <div className={cn("flex items-center justify-center w-7 h-7 rounded-lg shrink-0", node.bgColor)}>
                  {node.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-xs font-semibold leading-tight", node.color)}>{node.label}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{node.description}</p>
                  <p className="text-[9px] text-slate-600 mt-1 font-mono">{node.handles}</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600 opacity-0 group-hover:opacity-100 shrink-0 mt-0.5 transition-opacity" />
              </div>
            ))}
          </div>
        </div>

        {/* Workflow guide */}
        <div className="mt-4">
          <div className="flex items-center gap-1.5 mb-3">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
              Connection Guide
            </span>
            <div className="flex-1 h-px bg-slate-700/50" />
          </div>

          <div className="space-y-1.5 text-[10px] font-mono text-slate-600">
            {[
              { from: "Input", to: "LLM", color: "text-sky-600" },
              { from: "System", to: "LLM", color: "text-purple-600" },
              { from: "Memory", to: "LLM", color: "text-amber-600" },
              { from: "LLM", to: "Output", color: "text-emerald-600" },
            ].map((rule, i) => (
              <div key={i} className="flex items-center gap-1">
                <span className={rule.color}>{rule.from}</span>
                <span className="text-slate-700">──→</span>
                <span className={rule.color}>{rule.to}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-700/50">
        <p className="text-[10px] text-slate-600 font-mono leading-relaxed">
          Drag nodes onto the canvas to build your workflow
        </p>
      </div>
    </aside>
  );
}

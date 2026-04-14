"use client";

import { useState, useCallback } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Key, Eye, EyeOff, X, ExternalLink, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (apiKey: string) => void;
  existingKey?: string;
}

export function ApiKeyModal({ isOpen, onClose, onSave, existingKey }: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState(existingKey || "");
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState("");

  const handleSave = useCallback(() => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      setError("API key cannot be empty.");
      return;
    }
    if (!trimmed.startsWith("gsk_")) {
      setError("Groq API keys must start with 'gsk_'");
      return;
    }
    if (trimmed.length < 20) {
      setError("API key appears too short. Please check and try again.");
      return;
    }
    setError("");
    onSave(trimmed);
    onClose();
  }, [apiKey, onSave, onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handleSave();
      if (e.key === "Escape") onClose();
    },
    [handleSave, onClose]
  );

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 animate-fade-in" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50",
            "w-full max-w-md",
            "bg-[#0a1628] border border-emerald-500/20 rounded-2xl shadow-2xl",
            "shadow-emerald-900/20 animate-slide-in"
          )}
          onKeyDown={handleKeyDown}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/25">
                <Key className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <Dialog.Title className="text-sm font-semibold text-slate-100">
                  Groq API Key
                </Dialog.Title>
                <Dialog.Description className="text-[11px] text-slate-500 mt-0.5">
                  Required to execute the workflow
                </Dialog.Description>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            {/* Security note */}
            <div className="flex items-start gap-2.5 p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg">
              <Shield className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Your key is stored only in memory for this session and is never persisted to any server or storage.
              </p>
            </div>

            {/* Input */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                API Key
              </label>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setError("");
                  }}
                  placeholder="gsk_..."
                  className={cn(
                    "w-full bg-slate-900/60 border rounded-lg px-3 py-2.5 pr-10",
                    "text-sm font-mono text-slate-200 placeholder:text-slate-600",
                    "focus:outline-none focus:ring-1 transition-colors",
                    error
                      ? "border-red-500/50 focus:border-red-400/50 focus:ring-red-400/20"
                      : "border-slate-600/50 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                  )}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {error && (
                <p className="text-[11px] text-red-400 font-mono">{error}</p>
              )}
            </div>

            {/* Get API key link */}
            <a
              href="https://console.groq.com/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[11px] text-emerald-500 hover:text-emerald-400 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Get your Groq API key from console.groq.com
            </a>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2.5 px-5 py-4 border-t border-slate-700/50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-700/50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className={cn(
                "px-5 py-2 text-xs font-semibold rounded-lg transition-all",
                "bg-emerald-600 hover:bg-emerald-500 text-white",
                "shadow-lg shadow-emerald-900/30",
                "disabled:opacity-40 disabled:cursor-not-allowed"
              )}
              disabled={!apiKey.trim()}
            >
              Save Key
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

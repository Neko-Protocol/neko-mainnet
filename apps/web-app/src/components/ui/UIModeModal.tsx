"use client";

import React from "react";
import { BarChart3, Compass } from "lucide-react";
import type { UIMode } from "@/stores/ui-mode.store";

interface UIModeModalProps {
  onSelect: (mode: UIMode) => void;
}

export function UIModeModal({ onSelect }: UIModeModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-3xl border border-white/10 bg-[#1C1C1C] p-6 shadow-2xl">
        <div className="mb-2">
          <h3 className="text-xl font-bold text-white">
            Choose your experience
          </h3>
          <p className="mt-1 text-sm text-white/40">
            How would you like to use Neko?
          </p>
        </div>

        <div className="mt-5 space-y-5">
          <button
            type="button"
            onClick={() => onSelect("expert")}
            className="flex w-full items-start gap-4 rounded-2xl border border-white/5 bg-[#2A2A2A] p-5 text-left transition-colors hover:bg-[#333]"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-500/15">
              <BarChart3 className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Expert App</p>
              <p className="mt-1 text-xs leading-relaxed text-white/40">
                Full data, advanced metrics, and all protocol features visible.
                Built for users familiar with DeFi.
              </p>
            </div>
          </button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-white/5" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-white/20">
              or
            </span>
            <div className="h-px flex-1 bg-white/5" />
          </div>

          <button
            type="button"
            onClick={() => onSelect("basic")}
            className="flex w-full items-start gap-4 rounded-2xl border border-white/5 bg-[#2A2A2A] p-5 text-left transition-colors hover:bg-[#333]"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
              <Compass className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Basic App</p>
              <p className="mt-1 text-xs leading-relaxed text-white/40">
                Simple language, guided experience, and technical details
                hidden. Perfect if you&apos;re new to DeFi.
              </p>
            </div>
          </button>
        </div>

        <p className="mt-5 text-center text-xs text-white/25">
          You can change this at any time from{" "}
          <span className="text-white/40">Settings</span>.
        </p>
      </div>
    </div>
  );
}

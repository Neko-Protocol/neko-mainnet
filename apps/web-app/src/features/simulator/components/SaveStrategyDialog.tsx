"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useStrategiesStore,
  type SavedStrategy,
} from "@/stores/strategies.store";
import { useToast } from "@/hooks/useToast";
import { TOAST_CONFIG } from "@/lib/constants/toast.config";

interface SaveStrategyDialogProps {
  strategy: Omit<SavedStrategy, "id" | "createdAt" | "name">;
  suggestedName: string;
  onClose: () => void;
}

export function SaveStrategyDialog({
  strategy,
  suggestedName,
  onClose,
}: SaveStrategyDialogProps) {
  const [name, setName] = useState(suggestedName);
  const { save } = useStrategiesStore();
  const { addNotification } = useToast();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    save({ ...strategy, name: trimmed });
    addNotification("Strategy saved", "success", TOAST_CONFIG.defaultOpts);
    onClose();
    router.push("/strategies");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#1A1A1A] p-6 shadow-xl">
        <h2 className="mb-1 text-base font-semibold text-white">
          Save strategy
        </h2>
        <p className="mb-4 text-sm text-white/40">
          Give it a name so you can find it later.
        </p>
        <input
          ref={inputRef}
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          maxLength={60}
          placeholder="e.g. USDC → Blend Pool"
          className="mb-5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:border-[#229EDF]/50 focus:outline-none"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/50 transition-colors hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim()}
            className="rounded-full bg-[#229EDF] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1f8ec9] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

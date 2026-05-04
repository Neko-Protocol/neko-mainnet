"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function CopyAddress({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);
  const short = `${address.slice(0, 6)}...${address.slice(-4)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-white/40 hover:text-white/70 transition-colors group"
    >
      <span className="font-mono text-xs">{short}</span>
      {copied ? (
        <Check className="h-3 w-3 text-emerald-400" />
      ) : (
        <Copy className="h-3 w-3 group-hover:text-white/50" />
      )}
    </button>
  );
}

"use client";

import { ChevronDown } from "lucide-react";

interface LendProtocolFilterProps {
  value: string;
  onChange: (protocolId: string) => void;
  options: { id: string; label: string }[];
  disabled?: boolean;
  id?: string;
}

/** Dropdown to filter lend pools by orchestrator protocol (beside the tab row). */
export function LendProtocolFilter({
  value,
  onChange,
  options,
  disabled = false,
  id = "lend-protocol-filter",
}: LendProtocolFilterProps) {
  if (options.length === 0) return null;

  return (
    <div className="relative inline-flex max-w-full min-w-0 flex-wrap items-center">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="min-w-[140px] w-max max-w-full appearance-none rounded-lg border border-white/10 bg-[#1C1C1C] py-2 pl-3 pr-7 text-sm text-white/90 outline-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="all">All protocols</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45"
        aria-hidden
      />
    </div>
  );
}

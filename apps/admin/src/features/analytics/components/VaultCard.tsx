"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { AssetIcon } from "./AssetIcon";
import { VaultDepositorRow } from "./VaultDepositorRow";
import type { VaultDepositorsGroup } from "@neko-protocol/api-contracts";

export function VaultCard({ group }: { group: VaultDepositorsGroup }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return group.depositors;
    return group.depositors.filter(
      (d) =>
        d.wallet.toLowerCase().includes(q) ||
        (d.email ?? "").toLowerCase().includes(q)
    );
  }, [group.depositors, query]);

  return (
    <div className="rounded-2xl border border-white/5 bg-[#1C1C1C] p-4 sm:p-5">
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="flex w-full items-center gap-2 text-left"
      >
        <AssetIcon symbol={group.symbol} size={24} />
        <h3 className="font-semibold text-white">{group.symbol}</h3>
        <span className="text-xs text-white/40">
          {group.depositors.length} depositor
          {group.depositors.length === 1 ? "" : "s"}
        </span>
        <ChevronDown
          className={`ml-auto h-4 w-4 text-white/40 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="mt-4">
          {group.depositors.length === 0 ? (
            <p className="text-sm text-white/40">No depositors yet.</p>
          ) : (
            <>
              {group.depositors.length > 5 && (
                <div className="relative mb-2">
                  <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Filter by wallet or email..."
                    className="w-full rounded-lg border border-white/10 bg-[#141414] py-1.5 pr-3 pl-8 text-xs text-white outline-none placeholder:text-white/30 focus:border-[#229EDF]/50"
                  />
                </div>
              )}
              <div className="hidden grid-cols-[22px_160px_1fr_auto] gap-3 px-2 pb-1 text-xs text-white/40 sm:grid">
                <span />
                <span>Wallet</span>
                <span>Email</span>
                <span className="text-right">Amount</span>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {filtered.length === 0 ? (
                  <p className="py-3 text-center text-sm text-white/40">
                    No matches.
                  </p>
                ) : (
                  filtered.map((depositor) => (
                    <VaultDepositorRow
                      key={depositor.wallet}
                      depositor={depositor}
                      symbol={group.symbol}
                      rank={group.depositors.indexOf(depositor) + 1}
                    />
                  ))
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

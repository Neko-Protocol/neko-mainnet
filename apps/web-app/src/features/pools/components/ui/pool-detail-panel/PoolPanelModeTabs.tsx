"use client";

export function PoolPanelModeTabs({
  depositWithdrawMode,
  ammTab,
  onAmmTabChange,
  supportsBorrow,
  lendingTabs,
  mode,
  setMode,
}: {
  depositWithdrawMode: boolean;
  ammTab: "deposit" | "withdraw";
  onAmmTabChange?: (t: "deposit" | "withdraw") => void;
  supportsBorrow: boolean;
  lendingTabs: readonly ("lend" | "borrow")[];
  mode: "lend" | "borrow";
  setMode: (m: "lend" | "borrow") => void;
}) {
  return (
    <>
      {depositWithdrawMode && (
        <div className="flex bg-[#2A2A2A] rounded-xl p-1 gap-1">
          {(["deposit", "withdraw"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onAmmTabChange?.(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors capitalize ${
                ammTab === t
                  ? "bg-[#229EDF] text-white"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {!depositWithdrawMode && supportsBorrow && (
        <div className="flex bg-[#2A2A2A] rounded-xl p-1 gap-1">
          {lendingTabs.map((m) => (
            <button
              type="button"
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors capitalize ${
                mode === m
                  ? "bg-[#229EDF] text-white"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              {m === "lend" ? "Lend" : "Borrow"}
            </button>
          ))}
        </div>
      )}

      {!depositWithdrawMode && !supportsBorrow && (
        <span className="inline-flex w-fit items-center px-3 py-1.5 rounded-lg bg-[#2A2A2A] text-xs font-semibold text-white">
          Lending
        </span>
      )}
    </>
  );
}

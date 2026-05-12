"use client";

export function PoolPanelModeTabs({
  depositWithdrawMode,
  ammTab,
  onAmmTabChange,
  canWithdraw,
  supportsBorrow,
  lendingTabs,
  mode,
  setMode,
}: {
  depositWithdrawMode: boolean;
  ammTab: "deposit" | "withdraw";
  onAmmTabChange?: (t: "deposit" | "withdraw") => void;
  canWithdraw: boolean;
  supportsBorrow: boolean;
  lendingTabs: readonly ("lend" | "withdraw" | "borrow")[];
  mode: "lend" | "withdraw" | "borrow";
  setMode: (m: "lend" | "withdraw" | "borrow") => void;
}) {
  const ammTabs = canWithdraw
    ? (["deposit", "withdraw"] as const)
    : (["deposit"] as const);

  return (
    <>
      {depositWithdrawMode && (
        <div className="flex rounded-xl p-1 gap-1">
          {ammTabs.map((t) => (
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
        <div className="flex rounded-xl p-1 gap-1">
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
              {m === "lend" ? "Lend" : m === "withdraw" ? "Withdraw" : "Borrow"}
            </button>
          ))}
        </div>
      )}

      {!depositWithdrawMode && !supportsBorrow && (
        <span className="inline-flex w-fit items-center px-3 py-1.5 rounded-lg text-xs font-semibold text-white/70">
          Lending
        </span>
      )}
    </>
  );
}

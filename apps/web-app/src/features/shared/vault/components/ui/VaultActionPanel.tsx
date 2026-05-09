"use client";

import { useState, useCallback } from "react";
import { Globe } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@/hooks/useWallet";
import { useVaultBalance } from "../../hooks/useVaultBalance";
import { useVaultAction } from "../../hooks/useVaultAction";
import { getTokenBalanceFromContract } from "@/lib/helpers/stellar/sorobanBalance";
import { AmountInput } from "@/features/shared/pools/components/ui/pool-detail-panel/AmountInput";
import { InfoRow } from "@/features/shared/pools/components/ui/pool-detail-panel/InfoRow";
import type { VaultView } from "../../types/vault";

const primaryBtn =
  "w-full py-3.5 rounded-xl bg-[#229EDF] text-white font-semibold text-sm hover:bg-[#1a8bc7] transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

const btnSkeleton = (
  <span className="flex items-center justify-center py-0.5">
    <span className="h-3.5 w-28 rounded-md bg-white/25" />
  </span>
);

export function VaultActionPanel({
  vault,
  apy,
}: {
  vault: VaultView;
  apy: string;
}) {
  const [tab, setTab] = useState<"deposit" | "withdraw">("deposit");
  const [amount, setAmount] = useState("");

  const { address } = useWallet();
  const vaultContractId = vault.detail?.contracts?.vault ?? null;

  const { sharesFormatted } = useVaultBalance(vaultContractId);
  const { isLoading, handleDeposit, handleWithdraw } = useVaultAction(
    vaultContractId,
    vault.supplyAsset.symbol,
    vault.name
  );

  const { data: supplyBalance = "0" } = useQuery({
    queryKey: [
      "vaultSupplyBalance",
      vault.supplyAsset.contractAddress,
      address,
    ],
    queryFn: () =>
      getTokenBalanceFromContract(
        vault.supplyAsset.contractAddress!,
        address!,
        7
      ),
    enabled: !!address && !!vault.supplyAsset.contractAddress,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const isDeposit = tab === "deposit";
  const balanceValue = isDeposit ? supplyBalance : sharesFormatted;

  const handleConfirm = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    if (isDeposit) await handleDeposit(amount);
    else await handleWithdraw(amount);
    setAmount("");
  }, [amount, isDeposit, handleDeposit, handleWithdraw]);

  const isDisabled =
    isLoading || !amount || parseFloat(amount) <= 0 || !address;

  return (
    <div className="flex w-full flex-col gap-3">
      {/* tabs */}
      <div className="flex rounded-xl p-1 gap-1">
        {(["deposit", "withdraw"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setTab(t);
              setAmount("");
            }}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors capitalize ${
              tab === t
                ? "bg-[#229EDF] text-white"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* amount input */}
      <AmountInput
        label={isDeposit ? "Deposit" : "Withdraw"}
        token={{
          symbol: isDeposit
            ? vault.supplyAsset.symbol
            : (vault.name ?? "Shares"),
          icon: isDeposit
            ? vault.supplyAsset.logoSrc
            : (vault.creatorIconSrc ?? vault.supplyAsset.logoSrc),
        }}
        value={amount}
        onChange={setAmount}
        balanceLabel="MAX"
        balanceValue={balanceValue}
        onMax={() => setAmount(balanceValue)}
        disabled={!address}
      />

      {/* info rows */}
      <div className="rounded-xl px-4 py-1">
        <InfoRow
          label="Network"
          valueEl={
            <div className="flex items-center gap-1.5">
              <Globe className="h-3 w-3 text-[#229EDF]" />
              <span className="text-white/80 text-xs font-medium">Stellar</span>
            </div>
          }
        />
        <InfoRow
          label="Supply APY"
          valueEl={
            <span className="text-xs font-medium tabular-nums text-white/80">
              {apy}
            </span>
          }
        />
        <InfoRow label="Slippage" value="1%" />
        {isDeposit && <InfoRow label="Auto-invest" value="Yes" />}
      </div>

      {/* sticky footer */}
      <div className="sticky bottom-0 bg-[#111111] pt-3">
        {!address && (
          <p className="mb-2 text-center text-xs text-white/35">
            Connect your wallet to sign transactions
          </p>
        )}
        <button
          type="button"
          onClick={() => void handleConfirm()}
          disabled={isDisabled}
          className={primaryBtn}
        >
          {isLoading ? btnSkeleton : isDeposit ? "Deposit" : "Withdraw"}
        </button>
      </div>
    </div>
  );
}

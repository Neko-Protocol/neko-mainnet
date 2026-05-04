"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { VaultActionModal } from "@/features/vault/components/ui/VaultActionModal";
import { useSimulatorState } from "../hooks/useSimulatorState";
import { StepIndicator } from "./ui/StepIndicator";
import { WizardNav } from "./ui/WizardNav";
import { TokenSelectorStep } from "./TokenSelectorStep";
import { DestinationSelectorStep } from "./DestinationSelectorStep";
import { ReturnSimulatorStep } from "./ReturnSimulatorStep";
import type { VaultView } from "@/features/vault/types/vault";

export function SimulatorWizard() {
  const {
    state,
    selectToken,
    selectDestination,
    setAmount,
    goNext,
    goBack,
    goToStep,
  } = useSimulatorState();

  const [activeVault, setActiveVault] = useState<VaultView | null>(null);

  const continueDisabled =
    (state.step === 1 && !state.token) ||
    (state.step === 2 && !state.destination);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="shrink-0">
        <StepIndicator current={state.step} />
      </div>

      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col",
          state.step === 2 ? "overflow-hidden" : "overflow-y-auto"
        )}
      >
        {state.step === 1 && (
          <TokenSelectorStep selected={state.token} onSelect={selectToken} />
        )}

        {state.step === 2 && state.token && (
          <DestinationSelectorStep
            key={state.token.code}
            token={state.token}
            selected={state.destination}
            onSelect={selectDestination}
            onBackToTokens={() => goToStep(1)}
          />
        )}

        {state.step === 3 && state.token && state.destination && (
          <ReturnSimulatorStep
            token={state.token}
            destination={state.destination}
            amount={state.amount}
            onAmountChange={setAmount}
            onStartEarning={({ kind, vault }) => {
              if (kind === "vault" && vault) {
                setActiveVault(vault);
              }
            }}
          />
        )}
      </div>

      {state.step !== 3 && (
        <WizardNav
          className="mt-0 shrink-0"
          showBack={state.step > 1}
          onBack={goBack}
          onContinue={goNext}
          continueDisabled={continueDisabled}
          continueLabel={state.step === 2 ? "See projections" : "Continue"}
        />
      )}

      {state.step === 3 && (
        <WizardNav
          className="mt-0 shrink-0"
          showBack
          onBack={goBack}
          showContinue={false}
        />
      )}

      {activeVault && (
        <VaultActionModal
          vaultContractId={
            activeVault.detail?.contracts?.vault ?? activeVault.id
          }
          isDeposit
          supplyAssetContractAddress={activeVault.supplyAsset.contractAddress}
          supplyAssetSymbol={activeVault.supplyAsset.symbol}
          vaultShareSymbol={activeVault.name}
          onClose={() => setActiveVault(null)}
        />
      )}
    </div>
  );
}

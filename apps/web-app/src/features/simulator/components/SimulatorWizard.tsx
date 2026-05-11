"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import type { PoolInfo } from "@/lib/orchestrator";
import { VaultActionModal } from "@/features/shared/vault/components/ui/VaultActionModal";
import type { VaultView } from "@/features/shared/vault/types/vault";
import { useSwapExecution } from "@/features/expert/swap/hooks/useSwapExecution";
import { useToast } from "@/hooks/useToast";
import { useWallet } from "@/hooks/useWallet";
import { TOAST_CONFIG } from "@/lib/constants/toast.config";
import { isUserCancellationError } from "@/lib/helpers/stellar/contractErrors";
import { getAvailableTokens } from "@/lib/helpers/stellar/soroswap";
import type { Token } from "@/lib/types/soroswapTypes";
import { useStrategiesStore } from "@/stores/strategies.store";
import { useSimulatorState } from "../hooks/useSimulatorState";
import { useOrchestratorSupplyDeposit } from "../hooks/useOrchestratorSupplyDeposit";
import { useLendingDepositSubmit } from "../hooks/useLendingDepositSubmit";
import {
  resolveSimulationTargets,
  wizardStepsMeta,
} from "../utils/wizardPhases";
import { StepIndicator } from "./ui/StepIndicator";
import { SimulatorDepositConfirmModal } from "./ui/SimulatorDepositConfirmModal";
import { WizardNav } from "./ui/WizardNav";
import { TokenSelectorStep } from "./TokenSelectorStep";
import { DestinationSelectorStep } from "./DestinationSelectorStep";
import { SimulatorStackStrategyStep } from "./SimulatorStackStrategyStep";
import { ReturnSimulatorStep } from "./ReturnSimulatorStep";
import { SaveStrategyDialog } from "./SaveStrategyDialog";

type DepositIntent =
  | { kind: "vault"; vault: VaultView; depositAmountHuman?: string }
  | {
      kind: "lending";
      assetCode: string;
      contractId: string;
      depositAmountHuman?: string;
    }
  | { kind: "orchestrator"; poolInfo: PoolInfo; depositAmountHuman?: string }
  | null;

export function SimulatorWizard() {
  const {
    state,
    selectToken,
    selectDestination,
    selectStackVenue,
    setAmount,
    goNext,
    goBack,
    goToPhase,
    loadFromSaved,
  } = useSimulatorState();

  const [depositIntent, setDepositIntent] = useState<DepositIntent>(null);
  const [swapDepositBusy, setSwapDepositBusy] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  const queryClient = useQueryClient();
  const { executeSwap } = useSwapExecution();
  const { address, networkPassphrase } = useWallet();
  const { addNotification } = useToast();

  const { strategies, pendingExecuteId, setPendingExecuteId } =
    useStrategiesStore();

  useEffect(() => {
    if (!pendingExecuteId) return;
    const saved = strategies.find(
      (s) => s.id === pendingExecuteId && s.walletAddress === address
    );
    setPendingExecuteId(null);
    if (!saved) return;
    loadFromSaved({
      token: saved.token,
      destination: saved.destination,
      stackVenue: saved.stackVenue,
      amount: saved.amount,
    });
  }, [
    pendingExecuteId,
    strategies,
    address,
    setPendingExecuteId,
    loadFromSaved,
  ]);

  const { submit: submitOrchestrator, isPending: orchestratorPending } =
    useOrchestratorSupplyDeposit();
  const { submit: submitLending, isPending: lendingPending } =
    useLendingDepositSubmit();

  const stepsMeta = useMemo(
    () => wizardStepsMeta(state.token, state.destination),
    [state.token, state.destination]
  );

  const simulation = useMemo(() => {
    if (state.phase !== "simulate") return null;
    return resolveSimulationTargets(state);
  }, [state]);

  const continueDisabled =
    (state.phase === "select_token" && !state.token) ||
    (state.phase === "select_destination" && !state.destination);

  const continueLabel =
    state.phase === "select_destination" &&
    stepsMeta.some((s) => s.phase === "optional_stack")
      ? "Continue"
      : state.phase === "select_destination"
        ? "See projections"
        : state.phase === "optional_stack"
          ? "See projections"
          : "Continue";

  const handleStartDepositVault = useCallback((vault: VaultView) => {
    setDepositIntent({ kind: "vault", vault });
  }, []);

  const handleStartDepositLending = useCallback(() => {
    const sim = resolveSimulationTargets(state);
    const target = sim?.depositVenue ?? sim?.projectionDestination;
    if (
      target?.kind === "pool" &&
      target.lendingContractId &&
      target.lendingAssetCode
    ) {
      setDepositIntent({
        kind: "lending",
        assetCode: target.lendingAssetCode,
        contractId: target.lendingContractId,
      });
    }
  }, [state]);

  const handleStartDepositOrchestrator = useCallback(() => {
    const sim = resolveSimulationTargets(state);
    const target = sim?.depositVenue ?? sim?.projectionDestination;
    if (target?.kind === "pool" && target.raw && !target.lendingContractId) {
      setDepositIntent({
        kind: "orchestrator",
        poolInfo: target.raw as PoolInfo,
      });
    }
  }, [state]);

  const handleSwapAndDeposit = useCallback(
    async (payload: { stableAmount: string; expectedBondOutHuman: string }) => {
      if (!state.token || !address || !networkPassphrase) return;
      const sim = resolveSimulationTargets(state);
      if (!sim?.bondHold || !sim.depositVenue) return;

      const bondSymbol =
        sim.bondHold.bondSymbol ?? sim.bondHold.acceptedTokenCodes[0] ?? "";
      const stableCode = state.token.code;
      const tokens = getAvailableTokens();
      const sInfo = tokens[stableCode.toUpperCase()];
      const bInfo = tokens[bondSymbol.toUpperCase()];
      if (!sInfo?.contract || !bInfo?.contract) {
        addNotification("Swap unavailable", "error", {
          ...TOAST_CONFIG.defaultOpts,
          description: `Configure ${stableCode} and ${bondSymbol} in assets.`,
        });
        return;
      }

      const tokenIn: Token = {
        type: "contract",
        contract: sInfo.contract,
        code: stableCode,
      };
      const tokenOut: Token = {
        type: "contract",
        contract: bInfo.contract,
        code: bondSymbol,
      };

      setSwapDepositBusy(true);
      try {
        await executeSwap({
          amountIn: payload.stableAmount,
          tokenIn,
          tokenOut,
          address,
          networkPassphrase,
        });

        addNotification("Swap confirmed", "success", TOAST_CONFIG.defaultOpts);

        await queryClient.invalidateQueries({
          queryKey: ["stellar-balances", address],
        });

        const target = sim.depositVenue;
        const bondAmt = payload.expectedBondOutHuman;

        if (target.kind === "vault" && target.raw) {
          setDepositIntent({
            kind: "vault",
            vault: target.raw as VaultView,
            depositAmountHuman: bondAmt,
          });
          return;
        }
        if (target.kind === "pool") {
          if (target.lendingContractId && target.lendingAssetCode) {
            setDepositIntent({
              kind: "lending",
              assetCode: target.lendingAssetCode,
              contractId: target.lendingContractId,
              depositAmountHuman: bondAmt,
            });
            return;
          }
          if (target.raw) {
            setDepositIntent({
              kind: "orchestrator",
              poolInfo: target.raw as PoolInfo,
              depositAmountHuman: bondAmt,
            });
          }
        }
      } catch (e) {
        if (
          isUserCancellationError(e) ||
          (e instanceof Error && e.message === "USER_REJECTED")
        ) {
          return;
        }
        const msg = e instanceof Error ? e.message : "Swap failed";
        addNotification("Swap failed", "error", {
          ...TOAST_CONFIG.defaultOpts,
          description: msg,
        });
      } finally {
        setSwapDepositBusy(false);
      }
    },
    [
      state,
      address,
      networkPassphrase,
      executeSwap,
      queryClient,
      addNotification,
    ]
  );

  const scrollLockedDestination =
    state.phase === "select_destination" || state.phase === "optional_stack";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="shrink-0">
        <StepIndicator steps={stepsMeta} currentPhase={state.phase} />
      </div>

      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col",
          scrollLockedDestination ? "overflow-hidden" : "overflow-y-auto"
        )}
      >
        {state.phase === "select_token" && (
          <TokenSelectorStep selected={state.token} onSelect={selectToken} />
        )}

        {state.phase === "select_destination" && state.token && (
          <DestinationSelectorStep
            key={state.token.code}
            token={state.token}
            selected={state.destination}
            onSelect={selectDestination}
            onBackToTokens={() => goToPhase("select_token")}
          />
        )}

        {state.phase === "optional_stack" &&
          state.token &&
          state.destination && (
            <SimulatorStackStrategyStep
              walletToken={state.token}
              bondDestination={state.destination}
              selectedVenue={state.stackVenue}
              onSelectVenue={selectStackVenue}
            />
          )}

        {state.phase === "simulate" && state.token && simulation && (
          <ReturnSimulatorStep
            token={state.token}
            simulation={simulation}
            amount={state.amount}
            onAmountChange={setAmount}
            onStartDepositVault={handleStartDepositVault}
            onStartDepositLending={handleStartDepositLending}
            onStartDepositOrchestrator={handleStartDepositOrchestrator}
            onSwapAndDeposit={handleSwapAndDeposit}
            isSwapDepositPending={swapDepositBusy}
          />
        )}
      </div>

      {state.phase !== "simulate" && (
        <WizardNav
          className="mt-0 shrink-0"
          showBack={state.phase !== "select_token"}
          onBack={goBack}
          onContinue={goNext}
          continueDisabled={continueDisabled}
          continueLabel={continueLabel}
        />
      )}

      {state.phase === "simulate" && (
        <WizardNav
          className="mt-0 shrink-0"
          showBack
          onBack={goBack}
          showContinue={false}
          rightSlot={
            state.token && state.destination && address ? (
              <button
                type="button"
                onClick={() => setSaveDialogOpen(true)}
                className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-white/70 transition-colors hover:border-white/30 hover:text-white"
              >
                Save strategy
              </button>
            ) : null
          }
        />
      )}

      {saveDialogOpen && state.token && state.destination && address && (
        <SaveStrategyDialog
          strategy={{
            walletAddress: address,
            token: state.token,
            destination: state.destination,
            stackVenue: state.stackVenue,
            amount: state.amount,
            snapshotApy: state.destination.apy ?? state.stackVenue?.apy ?? null,
          }}
          suggestedName=""
          onClose={() => setSaveDialogOpen(false)}
        />
      )}

      {depositIntent?.kind === "vault" && (
        <VaultActionModal
          key={depositIntent.vault.id}
          vaultContractId={
            depositIntent.vault.detail?.contracts?.vault ??
            depositIntent.vault.id
          }
          isDeposit
          supplyAssetContractAddress={
            depositIntent.vault.supplyAsset.contractAddress
          }
          supplyAssetSymbol={depositIntent.vault.supplyAsset.symbol}
          vaultShareSymbol={depositIntent.vault.name}
          initialAmount={depositIntent.depositAmountHuman ?? state.amount}
          onClose={() => setDepositIntent(null)}
        />
      )}

      {depositIntent?.kind === "lending" && (
        <SimulatorDepositConfirmModal
          title="Confirm lending deposit"
          description="Sign the transaction in your wallet to supply liquidity to this lending pool."
          amountLabel={`${depositIntent.depositAmountHuman ?? state.amount} ${depositIntent.assetCode}`}
          isPending={lendingPending}
          onClose={() => setDepositIntent(null)}
          onConfirm={async () => {
            await submitLending({
              assetCode: depositIntent.assetCode,
              amount: depositIntent.depositAmountHuman ?? state.amount,
              contractId: depositIntent.contractId,
            });
          }}
        />
      )}

      {depositIntent?.kind === "orchestrator" && (
        <SimulatorDepositConfirmModal
          title="Confirm pool deposit"
          description={`Deposit via orchestrator into ${depositIntent.poolInfo.name ?? "this pool"}.`}
          amountLabel={`${depositIntent.depositAmountHuman ?? state.amount} ${depositIntent.poolInfo.tokens[0]?.code ?? ""}`}
          isPending={orchestratorPending}
          onClose={() => setDepositIntent(null)}
          onConfirm={async () => {
            await submitOrchestrator(
              depositIntent.poolInfo,
              depositIntent.depositAmountHuman ?? state.amount
            );
          }}
        />
      )}
    </div>
  );
}

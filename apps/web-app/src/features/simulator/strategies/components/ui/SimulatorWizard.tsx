"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PoolInfo } from "@/lib/orchestrator";
import { VaultActionModal } from "@/features/shared/vault/components/ui/VaultActionModal";
import type { VaultView } from "@/features/shared/vault/types/vault";
import { useSwapExecution } from "@/features/shared/swap-engine/hooks/useSwapExecution";
import { useToast } from "@/hooks/useToast";
import { useWallet } from "@/hooks/useWallet";
import { TOAST_CONFIG } from "@/lib/constants/toast.config";
import { isUserCancellationError } from "@neko/orchestrator";
import { getAvailableTokens } from "@/lib/helpers/stellar/soroswap";
import type { Token } from "@/lib/helpers/stellar/soroswap";
import { useStrategiesStore } from "@/features/simulator/strategies/stores/strategies.store";
import { useSimulatorState } from "@/features/simulator/strategies/hooks/useSimulatorState";
import { useOrchestratorSupplyDeposit } from "@/features/simulator/strategies/hooks/useOrchestratorSupplyDeposit";
import {
  resolveSimulationTargets,
  wizardStepsMeta,
} from "@/features/simulator/strategies/utils/wizardPhases";
import { StepIndicator } from "@/features/simulator/strategies/components/ui/StepIndicator";
import { SimulatorDepositConfirmModal } from "@/features/simulator/strategies/components/ui/SimulatorDepositConfirmModal";
import { WizardNav } from "@/features/simulator/strategies/components/ui/WizardNav";
import { TokenSelectorStep } from "@/features/simulator/strategies/components/ui/TokenSelectorStep";
import { DestinationSelectorStep } from "@/features/simulator/strategies/components/ui/DestinationSelectorStep";
import { SimulatorStackStrategyStep } from "@/features/simulator/strategies/components/ui/SimulatorStackStrategyStep";
import { ReturnSimulatorStep } from "@/features/simulator/strategies/components/ui/ReturnSimulatorStep";
import { SaveStrategyDialog } from "@/features/simulator/strategies/components/ui/SaveStrategyDialog";

type DepositIntent =
  | { kind: "vault"; vault: VaultView; depositAmountHuman?: string }
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

  const {
    strategies,
    pendingExecuteId,
    setPendingExecuteId,
    pendingRecommended,
    setPendingRecommended,
  } = useStrategiesStore();

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

  useEffect(() => {
    if (!pendingRecommended) return;
    const payload = pendingRecommended;
    setPendingRecommended(null);
    loadFromSaved(payload);
  }, [pendingRecommended, setPendingRecommended, loadFromSaved]);

  const { submit: submitOrchestrator, isPending: orchestratorPending } =
    useOrchestratorSupplyDeposit();

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

  const handleStartDepositOrchestrator = useCallback(() => {
    const sim = resolveSimulationTargets(state);
    const target = sim?.depositVenue ?? sim?.projectionDestination;
    if (target?.kind === "pool" && target.raw) {
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
      if (!sim?.bondHold) return;

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
          queryKey: ["balances", address],
        });

        if (sim.depositVenue) {
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
          if (target.kind === "pool" && target.raw) {
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

  const scrollLockedStep =
    state.phase === "select_token" ||
    state.phase === "select_destination" ||
    state.phase === "optional_stack" ||
    state.phase === "simulate";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden">
      <div className="flex shrink-0 flex-col gap-4">
        <div>
          <Link
            href="/strategies"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-white/60 transition-all hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
          >
            <ArrowLeft size={12} />
            Strategies
          </Link>
        </div>
        <StepIndicator steps={stepsMeta} currentPhase={state.phase} />
      </div>

      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col",
          scrollLockedStep ? "overflow-hidden" : "overflow-y-auto"
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
            onStartDepositOrchestrator={handleStartDepositOrchestrator}
            onSwapAndDeposit={handleSwapAndDeposit}
            isSwapDepositPending={swapDepositBusy}
            onBack={goBack}
            onSaveStrategy={() => setSaveDialogOpen(true)}
            showSaveStrategy={!!(state.token && state.destination && address)}
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
          vaultName={depositIntent.vault.name}
          initialAmount={depositIntent.depositAmountHuman ?? state.amount}
          onClose={() => setDepositIntent(null)}
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

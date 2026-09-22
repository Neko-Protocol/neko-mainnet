"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { useToast } from "@/hooks/useToast";
import { TOAST_CONFIG } from "@/lib/constants/toast.config";
import {
  extractContractError,
  getGenericErrorCode,
  isUserCancellationError,
} from "@neko-protocol/orchestrator";
import { useApiErrorMessage } from "@/lib/helpers/useApiErrorMessage";

interface SimulatorDepositConfirmModalProps {
  title: string;
  description: string;
  confirmLabel?: string;
  amountLabel: string;
  isPending?: boolean;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

export function SimulatorDepositConfirmModal({
  title,
  description,
  confirmLabel,
  amountLabel,
  isPending = false,
  onConfirm,
  onClose,
}: SimulatorDepositConfirmModalProps) {
  const t = useTranslations("simulator.depositModal");
  const getErrorMessage = useApiErrorMessage();
  const [visible, setVisible] = useState(false);
  const { addNotification } = useToast();

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 200);
  }, [onClose]);

  const handleConfirm = async () => {
    try {
      await onConfirm();
      addNotification(t("submittedToast"), "success", TOAST_CONFIG.defaultOpts);
      handleClose();
    } catch (e) {
      if (isUserCancellationError(e)) return;
      const errorCode = getGenericErrorCode(e);
      const description = errorCode
        ? getErrorMessage(errorCode)
        : extractContractError(e);
      addNotification(t("failedToast"), "error", {
        ...TOAST_CONFIG.defaultOpts,
        description,
      });
    }
  };

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        style={{ opacity: visible ? 1 : 0 }}
        onClick={handleClose}
        role="presentation"
      >
        <div
          className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#141414] p-5 shadow-xl transition-all"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(8px)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            aria-label={t("close")}
            onClick={handleClose}
            className="absolute right-3 top-3 rounded-lg p-1.5 text-white/40 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
          <h3 className="pr-8 text-lg font-semibold text-white">{title}</h3>
          <p className="mt-2 text-sm text-white/60">{description}</p>
          <div className="mt-4 rounded-xl bg-white/5 px-4 py-3">
            <p className="text-xs uppercase tracking-wider text-white/40">
              {t("amount")}
            </p>
            <p className="mt-1 font-mono text-lg font-semibold text-white">
              {amountLabel}
            </p>
          </div>
          <button
            type="button"
            disabled={isPending}
            onClick={() => void handleConfirm()}
            className="mt-5 w-full rounded-xl bg-[#229EDF] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1f8ec9] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPending ? t("signing") : (confirmLabel ?? t("confirmLabel"))}
          </button>
        </div>
      </div>
    </ModalPortal>
  );
}

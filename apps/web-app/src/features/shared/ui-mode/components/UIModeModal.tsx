"use client";

import React from "react";
import { useTranslations } from "next-intl";
import type { UIMode } from "../stores/ui-mode.store";

interface UIModeModalProps {
  onSelect: (mode: UIMode) => void;
}

export function UIModeModal({ onSelect }: UIModeModalProps) {
  const t = useTranslations("common.uiMode");

  const modes: { id: UIMode; label: string; description: string }[] = [
    {
      id: "expert",
      label: t("expertLabel"),
      description: t("expertDescription"),
    },
    {
      id: "basic",
      label: t("basicLabel"),
      description: t("basicDescription"),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-2xl border border-white/10 bg-[#161616] p-6 shadow-2xl">
        <p className="text-white font-semibold text-base mb-1">{t("title")}</p>
        <p className="text-white/50 text-sm leading-relaxed mb-5">
          {t("subtitle")}
        </p>

        <div
          role="radiogroup"
          aria-label={t("ariaLabel")}
          className="flex flex-col gap-2"
        >
          {modes.map(({ id, label, description }) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={false}
              onClick={() => onSelect(id)}
              className="group flex w-full items-center gap-3.5 rounded-xl border border-white/6 bg-white/1.5 px-4 py-3 text-left transition-colors duration-150 hover:bg-white/4 hover:border-white/15"
            >
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-white/25 bg-transparent" />
              <span className="flex flex-1 flex-col gap-0.5">
                <span className="text-sm font-semibold tracking-tight text-white/85">
                  {label}
                </span>
                <span className="text-xs leading-relaxed text-white/45">
                  {description}
                </span>
              </span>
            </button>
          ))}
        </div>

        <p className="mt-5 text-center text-xs text-white/25">
          {t.rich("changeAnytime", {
            settings: (chunks) => (
              <span className="text-white/40">{chunks}</span>
            ),
          })}
        </p>
      </div>
    </div>
  );
}

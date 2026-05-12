"use client";

import Image from "next/image";
import { getPoolTokenIcon } from "../../../utils/poolTokenIcons";
import { getTokenIconFitClass } from "@/lib/helpers/tokenUtils";
import type { PoolDetailPanelToken } from "./types";
import { trimBalance } from "./utils";

export function AmountInput({
  label,
  token,
  token2,
  value,
  onChange,
  balanceLabel,
  balanceValue,
  balanceValue2,
  onMax,
  disabled,
  readOnly,
  usdValue,
  pairStyle,
}: {
  label: string;
  token: PoolDetailPanelToken;
  token2?: PoolDetailPanelToken;
  value: string;
  onChange: (v: string) => void;
  balanceLabel: string;
  balanceValue: string;
  balanceValue2?: string;
  onMax?: () => void;
  disabled?: boolean;
  readOnly?: boolean;
  usdValue?: string;
  pairStyle?: boolean;
}) {
  const resolvedIcon =
    token.icon ?? getPoolTokenIcon({ type: "contract", code: token.symbol });
  const resolvedIcon2 = token2
    ? (token2.icon ??
      getPoolTokenIcon({ type: "contract", code: token2.symbol }))
    : null;

  const renderTokenIcon = (
    t: PoolDetailPanelToken,
    icon: string | null | undefined
  ) => (
    <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
      {icon ? (
        <Image
          src={icon}
          alt={t.symbol}
          width={20}
          height={20}
          unoptimized
          className={getTokenIconFitClass(t.symbol)}
        />
      ) : (
        <span className="text-white text-[9px] font-bold">{t.symbol[0]}</span>
      )}
    </div>
  );

  if (pairStyle) {
    return (
      <div className="rounded-xl bg-[#1f1f1f] border border-white/5 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            {renderTokenIcon(token, resolvedIcon)}
            <span className="text-white/70 text-xs font-semibold">
              {token.symbol}
            </span>
          </div>
          <span className="text-white/30 text-xs tabular-nums">
            {disabled
              ? "Connect wallet"
              : `${trimBalance(balanceValue)} ${token.symbol}`}
            {!disabled && onMax && (
              <>
                {" "}
                <button
                  type="button"
                  onClick={onMax}
                  className="text-[#229EDF] font-semibold hover:text-[#1a8bc7] transition-colors uppercase tracking-wide"
                >
                  {balanceLabel}
                </button>
              </>
            )}
          </span>
        </div>

        <input
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={value}
          onChange={(e) =>
            readOnly
              ? undefined
              : onChange(
                  e.target.value
                    .replace(/[^0-9.]/g, "")
                    .replace(/(\..*)\./g, "$1")
                )
          }
          disabled={disabled}
          readOnly={readOnly}
          className="w-full bg-transparent text-white font-medium outline-none placeholder:text-white/20 disabled:cursor-not-allowed read-only:cursor-default"
          style={{
            fontSize: 33,
            fontFamily: '"FK Grotesk", "Inter", sans-serif',
          }}
        />
      </div>
    );
  }

  return (
    <div className="rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-white/50 text-xs font-medium">{label}</p>
        <div className="flex items-center gap-1.5">
          {token2 ? (
            <div className="relative flex items-center w-8 h-5 shrink-0">
              <div className="absolute left-0">
                {renderTokenIcon(token, resolvedIcon)}
              </div>
              <div className="absolute left-3.5">
                {renderTokenIcon(token2, resolvedIcon2)}
              </div>
            </div>
          ) : (
            renderTokenIcon(token, resolvedIcon)
          )}
          <span className="text-white/70 text-xs font-semibold">
            {token2 ? `${token.symbol}/${token2.symbol}` : token.symbol}
          </span>
        </div>
      </div>

      <input
        type="text"
        inputMode="decimal"
        placeholder="0.00"
        value={value}
        onChange={(e) =>
          readOnly
            ? undefined
            : onChange(
                e.target.value
                  .replace(/[^0-9.]/g, "")
                  .replace(/(\..*)\./g, "$1")
              )
        }
        disabled={disabled}
        readOnly={readOnly}
        className="w-full bg-transparent text-white text-2xl font-semibold outline-none placeholder:text-white/15 disabled:cursor-not-allowed read-only:cursor-default"
      />

      <div className="flex items-center justify-between mt-2">
        <span className="text-white/30 text-xs">{usdValue ?? "0"}</span>
        <div className="flex items-center gap-2">
          <span className="text-white/30 text-xs tabular-nums">
            {token2 && balanceValue2 != null ? (
              <>
                <span>
                  {trimBalance(balanceValue)} {token.symbol}
                </span>
                <span className="text-white/20"> / </span>
                <span>
                  {trimBalance(balanceValue2)} {token2.symbol}
                </span>
              </>
            ) : (
              `${trimBalance(balanceValue)} ${token.symbol}`
            )}
          </span>
          {onMax && (
            <button
              type="button"
              onClick={onMax}
              disabled={disabled}
              className="text-[#229EDF] text-xs font-semibold hover:text-[#1a8bc7] transition-colors disabled:opacity-40 uppercase tracking-wide"
            >
              {balanceLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

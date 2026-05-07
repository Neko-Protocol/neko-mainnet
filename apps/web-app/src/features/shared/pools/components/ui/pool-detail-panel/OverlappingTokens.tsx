"use client";

import Image from "next/image";
import { getPoolTokenIcon } from "../../../utils/poolTokenIcons";
import { getTokenIconFitClass } from "@/lib/helpers/tokenUtils";
import type { PoolDetailPanelToken } from "./types";

export function OverlappingTokens({
  token1,
  token2,
  size = "md",
}: {
  token1: PoolDetailPanelToken;
  token2: PoolDetailPanelToken;
  size?: "md" | "lg";
}) {
  const circle = size === "lg" ? "w-16 h-16" : "w-10 h-10";
  const offset = size === "lg" ? "left-10" : "left-6";
  const wrap = size === "lg" ? "w-24 h-16" : "w-16 h-10";
  const px = size === "lg" ? 64 : 40;

  const isSingle =
    token1.symbol === token2.symbol ||
    (token1.address && token1.address === token2.address);

  const renderIcon = (token: PoolDetailPanelToken, fallbackClass: string) => {
    const icon =
      token.icon ?? getPoolTokenIcon({ type: "contract", code: token.symbol });
    return icon ? (
      <Image
        src={icon}
        alt={token.symbol}
        width={px}
        height={px}
        unoptimized
        className={getTokenIconFitClass(token.symbol)}
      />
    ) : (
      <span
        className={`${fallbackClass} font-bold`}
        style={{ fontSize: px / 3 }}
      >
        {token.symbol[0]}
      </span>
    );
  };

  if (isSingle) {
    return (
      <div
        className={`shrink-0 flex items-center`}
        style={{ width: px, height: px }}
      >
        <div
          className={`${circle} rounded-full bg-white/10 border-2 border-white/10 flex items-center justify-center overflow-hidden shadow-md`}
        >
          {renderIcon(token1, "text-white")}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${wrap} shrink-0 flex items-center`}>
      <div
        className={`absolute left-0 top-1/2 -translate-y-1/2 ${circle} rounded-full bg-white/10 border-2 border-white/10 flex items-center justify-center overflow-hidden shadow-md z-1`}
      >
        {renderIcon(token1, "text-white")}
      </div>
      <div
        className={`absolute ${offset} top-1/2 -translate-y-1/2 ${circle} rounded-full bg-white/10 border-2 border-white/10 flex items-center justify-center overflow-hidden shadow-md z-2`}
      >
        {renderIcon(token2, "text-white")}
      </div>
    </div>
  );
}

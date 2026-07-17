"use client";

import Image from "next/image";
import { getPoolTokenIcon } from "../../../utils/poolTokenIcons";
import { getTokenIconFitClass } from "@/lib/helpers/tokenDisplay";

export function PanelTokenIcon({
  symbol,
  icon,
  size = 14,
}: {
  symbol: string;
  icon?: string | null;
  size?: number;
}) {
  const resolvedIcon =
    icon ?? getPoolTokenIcon({ type: "contract", code: symbol });
  return (
    <div
      className="rounded-full bg-white/10 flex items-center justify-center overflow-hidden shrink-0"
      style={{ width: size, height: size }}
    >
      {resolvedIcon ? (
        <Image
          src={resolvedIcon}
          alt={symbol}
          width={size}
          height={size}
          unoptimized
          className={getTokenIconFitClass(symbol)}
        />
      ) : (
        <span
          style={{ fontSize: size * 0.5 }}
          className="font-bold text-white leading-none"
        >
          {symbol[0]}
        </span>
      )}
    </div>
  );
}

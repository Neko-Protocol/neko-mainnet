"use client";

import Image from "next/image";
import { getPoolTokenIcon } from "../../../utils/poolTokenIcons";
import { getTokenIconFitClass } from "@/lib/helpers/tokenUtils";
import type { PoolDetailPanelToken } from "./types";

export function OverviewTokenLabel({ token }: { token: PoolDetailPanelToken }) {
  const icon =
    token.icon ?? getPoolTokenIcon({ type: "contract", code: token.symbol });
  return (
    <span className="flex items-center gap-1.5">
      {icon && (
        <span className="w-5 h-5 rounded-full overflow-hidden bg-white/5 shrink-0 inline-flex">
          <Image
            src={icon}
            alt={token.symbol}
            width={20}
            height={20}
            unoptimized
            className={`w-full h-full ${getTokenIconFitClass(token.symbol)}`}
          />
        </span>
      )}
      {token.symbol}
    </span>
  );
}

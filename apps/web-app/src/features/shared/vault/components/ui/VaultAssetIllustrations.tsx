import React from "react";
import Image from "next/image";
import type { VaultAsset } from "../../types/vault";
import { resolveAssetIcon } from "../../utils/vault";

interface VaultAssetIllustrationsProps {
  collateralAssets: VaultAsset[];
  isLight: boolean;
  issuerIconSrc?: string;
}

const DROP_SHADOW = "drop-shadow(0 10px 20px rgba(0,0,0,0.28))";
const DROP_SHADOW_SECONDARY = "drop-shadow(0 10px 20px rgba(0,0,0,0.22))";

// Two collateral assets (e.g. USDC + CETES)
const DUAL_LEFT = { width: 128, height: 150, top: -10, right: 88 } as const;
const DUAL_RIGHT = { width: 108, height: 128, top: 14, right: -10 } as const;

// Token + issuer/brand: token on left (small), issuer on right (large)
const ISSUER_TOKEN = { width: 108, height: 128, top: 14, right: 112 } as const;
const ISSUER_BRAND = { width: 128, height: 150, top: -10, right: 14 } as const;

// Single asset with no paired image
const SINGLE = { width: 138, height: 160, top: -8, right: -8 } as const;

const WRAPPER_CLASS =
  "absolute right-0 top-0 h-full w-[46%] pointer-events-none select-none";

interface IllustrationSlotProps {
  src: string;
  alt: string;
  style: React.CSSProperties;
}

function IllustrationSlot({ src, alt, style }: IllustrationSlotProps) {
  return (
    <div className="absolute" style={style}>
      <Image src={src} alt={alt} fill unoptimized className="object-contain" />
    </div>
  );
}

export const VaultAssetIllustrations: React.FC<
  VaultAssetIllustrationsProps
> = ({ collateralAssets, isLight, issuerIconSrc }) => {
  const first = collateralAssets[0];
  const second = collateralAssets[1];

  if (!first) return null;

  if (second) {
    return (
      <div className={WRAPPER_CLASS}>
        <IllustrationSlot
          src={resolveAssetIcon(first, isLight)}
          alt={first.symbol}
          style={{
            ...DUAL_LEFT,
            transform: "rotate(-12deg)",
            filter: DROP_SHADOW,
          }}
        />
        <IllustrationSlot
          src={resolveAssetIcon(second, isLight)}
          alt={second.symbol}
          style={{
            ...DUAL_RIGHT,
            transform: "rotate(9deg)",
            filter: DROP_SHADOW_SECONDARY,
          }}
        />
      </div>
    );
  }

  if (issuerIconSrc) {
    return (
      <div className={WRAPPER_CLASS}>
        <IllustrationSlot
          src={resolveAssetIcon(first, isLight)}
          alt={first.symbol}
          style={{
            ...ISSUER_TOKEN,
            transform: "rotate(-12deg)",
            filter: DROP_SHADOW,
          }}
        />
        <IllustrationSlot
          src={issuerIconSrc}
          alt="issuer"
          style={{
            ...ISSUER_BRAND,
            transform: "rotate(9deg)",
            filter: DROP_SHADOW_SECONDARY,
          }}
        />
      </div>
    );
  }

  return (
    <div className={WRAPPER_CLASS}>
      <IllustrationSlot
        src={resolveAssetIcon(first, isLight)}
        alt={first.symbol}
        style={{
          ...SINGLE,
          transform: "rotate(-8deg)",
          filter: DROP_SHADOW,
        }}
      />
    </div>
  );
};

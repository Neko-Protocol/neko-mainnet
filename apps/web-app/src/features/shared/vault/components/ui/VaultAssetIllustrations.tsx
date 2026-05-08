import React from "react";
import Image from "next/image";
import type { VaultAsset } from "../../types/vault";
import { resolveAssetIcon } from "../../utils/vault";

interface VaultAssetIllustrationsProps {
  collateralAssets: VaultAsset[];
  isLight: boolean;
  issuerIconSrc?: string;
  creatorIconSrc?: string;
}

const ASSET_DROP_SHADOW = "drop-shadow(0 10px 20px rgba(0,0,0,0.28))";
const ASSET_DROP_SHADOW_SECONDARY = "drop-shadow(0 10px 20px rgba(0,0,0,0.22))";

const DUAL_PRIMARY = { width: 128, height: 150, top: -10, right: 72 } as const;
const DUAL_SECONDARY = {
  width: 108,
  height: 128,
  top: 14,
  right: -10,
} as const;
const SINGLE = { width: 138, height: 160, top: -8, right: -8 } as const;

export const VaultAssetIllustrations: React.FC<
  VaultAssetIllustrationsProps
> = ({ collateralAssets, isLight, issuerIconSrc, creatorIconSrc }) => {
  const first = collateralAssets[0];
  const second = collateralAssets[1];

  if (!first) return null;

  if (second) {
    return (
      <div className="absolute right-0 top-0 h-full w-[46%] pointer-events-none select-none">
        <div
          className="absolute"
          style={{
            ...DUAL_PRIMARY,
            transform: "rotate(-12deg)",
            filter: ASSET_DROP_SHADOW,
          }}
        >
          <Image
            src={resolveAssetIcon(first, isLight)}
            alt={first.symbol}
            fill
            unoptimized
            className="object-contain"
          />
        </div>
        <div
          className="absolute"
          style={{
            ...DUAL_SECONDARY,
            transform: "rotate(9deg)",
            filter: ASSET_DROP_SHADOW_SECONDARY,
          }}
        >
          <Image
            src={resolveAssetIcon(second, isLight)}
            alt={second.symbol}
            fill
            unoptimized
            className="object-contain"
          />
        </div>
      </div>
    );
  }

  if (issuerIconSrc) {
    return (
      <div className="absolute right-0 top-0 h-full w-[46%] pointer-events-none select-none">
        {/* asset: big */}
        <div
          className="absolute"
          style={{
            width: 128,
            height: 150,
            top: -10,
            right: 16,
            transform: "rotate(9deg)",
            filter: ASSET_DROP_SHADOW,
          }}
        >
          <Image
            src={resolveAssetIcon(first, isLight)}
            alt={first.symbol}
            fill
            unoptimized
            className="object-contain"
          />
        </div>
        {/* issuer: small, overlapping bottom-left of asset */}
        <div
          className="absolute"
          style={{
            width: 112,
            height: 130,
            top: 20,
            right: 114,
            transform: "rotate(-9deg)",
            filter: ASSET_DROP_SHADOW_SECONDARY,
          }}
        >
          <Image
            src={issuerIconSrc}
            alt="issuer"
            fill
            unoptimized
            className="object-contain"
          />
        </div>
      </div>
    );
  }

  if (creatorIconSrc) {
    return (
      <div className="absolute right-0 top-0 h-full w-[46%] pointer-events-none select-none">
        {/* asset: left, slightly smaller, counter-rotated */}
        <div
          className="absolute"
          style={{
            width: 112,
            height: 130,
            top: 20,
            right: 114,
            transform: "rotate(-9deg)",
            filter: ASSET_DROP_SHADOW_SECONDARY,
          }}
        >
          <Image
            src={resolveAssetIcon(first, isLight)}
            alt={first.symbol}
            fill
            unoptimized
            className="object-contain"
          />
        </div>
        {/* creator: right, big */}
        <div
          className="absolute"
          style={{
            width: 128,
            height: 150,
            top: -10,
            right: 16,
            transform: "rotate(9deg)",
            filter: ASSET_DROP_SHADOW,
          }}
        >
          <Image
            src={creatorIconSrc}
            alt="creator"
            fill
            unoptimized
            className="object-contain"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="absolute right-0 top-0 h-full w-[46%] pointer-events-none select-none">
      <div
        className="absolute"
        style={{
          ...SINGLE,
          transform: "rotate(-8deg)",
          filter: ASSET_DROP_SHADOW,
        }}
      >
        <Image
          src={resolveAssetIcon(first, isLight)}
          alt={first.symbol}
          fill
          unoptimized
          className="object-contain"
        />
      </div>
    </div>
  );
};

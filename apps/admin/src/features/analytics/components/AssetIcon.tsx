import Image from "next/image";
import { Landmark } from "lucide-react";
import { getAssetIconMap } from "@/lib/constants/assets.config";

export function AssetIcon({
  symbol,
  size = 20,
}: {
  symbol: string;
  size?: number;
}) {
  const iconSrc = getAssetIconMap()[symbol];

  if (iconSrc) {
    const isRemote = iconSrc.startsWith("http");
    return (
      <div
        className="relative shrink-0 overflow-hidden rounded-full bg-white"
        style={{ width: size, height: size }}
      >
        <Image
          src={iconSrc}
          alt={symbol}
          fill
          unoptimized={isRemote}
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-[#2A2A2A] text-white/60"
      style={{ width: size, height: size }}
    >
      <Landmark className="h-1/2 w-1/2" />
    </span>
  );
}

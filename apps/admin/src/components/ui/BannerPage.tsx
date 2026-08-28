"use client";

import Image from "next/image";

export interface BannerPageProps {
  title: string;
  subtitle?: string;
  badge?: string;
  imageSrc: string;
  imageAlt?: string;
}

// Ported from the web-app's BannerPage (apps/web-app/src/components/ui/BannerPage.tsx).
// Kept as a local copy rather than a shared package: Tailwind v4's per-app
// content scanning (@source) doesn't pick up classes from an external
// workspace package's source reliably, which silently dropped this
// component's styling when it briefly lived in packages/ui.
export function BannerPage({
  title,
  subtitle,
  badge,
  imageSrc,
  imageAlt = "",
}: BannerPageProps) {
  return (
    <div className="relative flex min-h-[140px] w-full max-w-full min-w-0 items-center overflow-hidden rounded-2xl bg-[#229EDF] pt-6 sm:min-h-[210px] sm:rounded-[24px]">
      <div className="relative z-10 flex min-w-0 flex-1 flex-col justify-center gap-2 px-4 py-4 sm:gap-2.5 sm:px-8 sm:py-6">
        {badge && (
          <span className="inline-flex w-fit items-center rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
            {badge}
          </span>
        )}
        <h2 className="text-xl leading-tight font-bold tracking-tight text-white wrap-break-word sm:text-[2rem]">
          {title}
        </h2>
        {subtitle && (
          <p className="w-full max-w-full min-w-0 wrap-break-word text-xs leading-relaxed font-bold text-white sm:text-sm sm:font-normal">
            {subtitle}
          </p>
        )}
      </div>

      <div className="pointer-events-none absolute inset-0 z-0 select-none sm:hidden">
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          unoptimized
          priority
          className="object-cover object-right"
        />
        <div
          className="absolute inset-0 z-10 bg-gradient-to-r from-[#229EDF] via-[#229EDF]/90 to-[#229EDF]/30"
          aria-hidden
        />
      </div>

      <div className="pointer-events-none absolute top-4 -right-6 hidden h-[112%] w-[78%] opacity-60 select-none sm:top-0 sm:right-0 sm:block sm:h-full sm:w-[75%] sm:opacity-100">
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          unoptimized
          priority
          className="object-contain object-right"
        />
      </div>
    </div>
  );
}

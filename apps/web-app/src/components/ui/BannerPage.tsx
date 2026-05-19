"use client";

import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export interface BannerPageProps {
  title: string;

  subtitle?: string;

  badge?: string;

  imageSrc?: string;

  imageAlt?: string;

  imagePosition?: "right" | "bottom-right";

  hideImageOnMobile?: boolean;

  imageWrapperClassName?: string;
  imageSize?: "default" | "large";

  imageLayoutClassName?: string;

  imageObjectClassName?: string;

  actions?: React.ReactNode;

  className?: string;
}

export function BannerPage({
  title,
  subtitle,
  badge,
  imageSrc,
  imageAlt = "",
  imagePosition = "right",
  hideImageOnMobile = false,
  imageWrapperClassName,
  imageSize = "default",
  imageLayoutClassName,
  imageObjectClassName,
  actions,
  className,
}: BannerPageProps) {
  return (
    <div
      className={cn(
        "relative w-full max-w-full min-w-0 overflow-hidden rounded-2xl sm:rounded-[24px] bg-[#229EDF]",
        "mx-auto flex min-h-[140px] sm:min-h-[210px] items-center pt-6",
        className
      )}
    >
      {}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col justify-center gap-2 sm:gap-2.5 px-4 sm:px-8 py-4 sm:py-6">
        {badge && <Badge label={badge} />}

        <h2 className="text-xl sm:text-[2rem] font-bold leading-tight tracking-tight text-white wrap-break-word">
          {title}
        </h2>

        {subtitle && (
          <p className="w-full max-w-full min-w-0 text-xs sm:text-sm leading-relaxed text-white/90 wrap-break-word">
            {subtitle}
          </p>
        )}

        {actions && (
          <div className="mt-2 flex items-center gap-3">{actions}</div>
        )}
      </div>

      {}
      {imageSrc && (
        <div
          className={cn(
            hideImageOnMobile ? "hidden sm:block" : "block",
            imageWrapperClassName
          )}
        >
          <Illustration
            src={imageSrc}
            alt={imageAlt}
            position={imagePosition}
            size={imageSize}
            layoutClassName={imageLayoutClassName}
            objectClassName={imageObjectClassName}
          />
        </div>
      )}
    </div>
  );
}

interface BadgeProps {
  label: string;
}

function Badge({ label }: BadgeProps) {
  return (
    <span className="inline-flex w-fit items-center rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
      {label}
    </span>
  );
}

interface IllustrationProps {
  src: string;
  alt: string;
  position: "right" | "bottom-right";
  size: "default" | "large";
  layoutClassName?: string;
  objectClassName?: string;
}

const IMAGE_LAYOUT: Record<IllustrationProps["size"], string> = {
  default: "right-0 top-0 h-full w-[55%]",
  large: "-right-116 -top-15 h-[155%] w-[120%]",
};

function Illustration({
  src,
  alt,
  position,
  size,
  layoutClassName,
  objectClassName,
}: IllustrationProps) {
  const objectClass =
    objectClassName ??
    (position === "bottom-right"
      ? "object-contain object-bottom-right"
      : size === "large"
        ? "object-contain object-right object-top"
        : "object-contain object-right");
  return (
    <div
      className={cn(
        "pointer-events-none absolute select-none",
        layoutClassName ?? IMAGE_LAYOUT[size]
      )}
    >
      <Image
        src={src}
        alt={alt}
        fill
        unoptimized
        priority
        className={objectClass}
      />
    </div>
  );
}

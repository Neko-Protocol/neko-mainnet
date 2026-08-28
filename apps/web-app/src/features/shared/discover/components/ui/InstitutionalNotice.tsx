"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

interface InstitutionalNoticeProps {
  className?: string;
}

export function InstitutionalNotice({
  className = "",
}: InstitutionalNoticeProps) {
  const t = useTranslations("sharedDiscover.institutionalNotice");
  return (
    <span
      title={t("label")}
      aria-label={t("label")}
      className={`relative inline-flex shrink-0 ${className}`}
    >
      <Image
        src="/assets/Inst_notice.png"
        alt=""
        width={28}
        height={28}
        unoptimized
        className="h-full w-full object-contain"
      />
    </span>
  );
}

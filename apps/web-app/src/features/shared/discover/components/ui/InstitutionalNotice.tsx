"use client";

import Image from "next/image";

interface InstitutionalNoticeProps {
  className?: string;
}

export function InstitutionalNotice({
  className = "",
}: InstitutionalNoticeProps) {
  return (
    <span
      title="Institutional access required"
      aria-label="Institutional access required"
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

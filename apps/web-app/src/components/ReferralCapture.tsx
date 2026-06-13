"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useReferralStore } from "@/stores/referral.store";

// Persists the ?ref=<code> param so the code survives navigation and is
// attached to the registration call when the visitor connects a wallet.
function ReferralCaptureInner() {
  const searchParams = useSearchParams();
  const setRefCode = useReferralStore((s) => s.setRefCode);

  useEffect(() => {
    const ref = searchParams.get("ref")?.trim();
    if (ref) setRefCode(ref);
  }, [searchParams, setRefCode]);

  return null;
}

export function ReferralCapture() {
  return (
    <Suspense fallback={null}>
      <ReferralCaptureInner />
    </Suspense>
  );
}

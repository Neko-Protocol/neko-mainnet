"use client";

import { Suspense } from "react";
import { useReferralCapture } from "../hooks/useReferralCapture";

// useSearchParams() (inside useReferralCapture) requires a Suspense boundary.
function ReferralCaptureInner() {
  useReferralCapture();
  return null;
}

export function ReferralCapture() {
  return (
    <Suspense fallback={null}>
      <ReferralCaptureInner />
    </Suspense>
  );
}

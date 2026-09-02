"use client";

import { Suspense } from "react";
import { useReferralCapture } from "../hooks/useReferralCapture";
import { useAutoApplyReferral } from "../hooks/useAutoApplyReferral";

// useSearchParams() (inside useReferralCapture) requires a Suspense boundary.
function ReferralCaptureInner() {
  useReferralCapture();
  useAutoApplyReferral();
  return null;
}

export function ReferralCapture() {
  return (
    <Suspense fallback={null}>
      <ReferralCaptureInner />
    </Suspense>
  );
}

"use client";

function splitMetricDisplay(value: string): { primary: string; suffix: string } | null {
  const s = value.trim();
  if (!s) return null;

  if (/%\s*$/.test(s)) {
    const idx = s.lastIndexOf("%");
    return { primary: s.slice(0, idx).trimEnd(), suffix: "%" };
  }

  const scale = s.match(/^(.*\d)\s*([MmBbKk]+)$/);
  if (scale) {
    return { primary: scale[1].trimEnd(), suffix: scale[2] };
  }

  return null;
}

/** Big metric line: FK Grotesk body + muted % / scale suffix (M, K, B). */
export function MetricValueText({ value }: { value: string }) {
  const parts = splitMetricDisplay(value);
  if (!parts) {
    return <>{value}</>;
  }
  return (
    <>
      <span>{parts.primary}</span>
      <span className="pool-detail-metric-value-suffix">{parts.suffix}</span>
    </>
  );
}

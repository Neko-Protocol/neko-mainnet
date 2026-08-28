import { AlertTriangle } from "lucide-react";

export interface AnalyticsErrorStateProps {
  message?: string;
}

// Rendered whenever a backend call for this section actually failed (see
// fetchFromBackend), so an outage looks visibly different from real zeros.
export function AnalyticsErrorState({
  message = "Couldn't load this data. Try refreshing the page.",
}: AnalyticsErrorStateProps) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400 sm:p-5">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

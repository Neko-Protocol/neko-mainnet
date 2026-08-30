import { useQuery } from "@tanstack/react-query";
import { previewEmail } from "../actions";

/**
 * Renders body content through the backend's branded shell. Debounced by
 * staleTime + an explicit enabled flag so typing doesn't hammer the endpoint.
 */
export function useEmailPreview(bodyHtml: string, enabled: boolean) {
  return useQuery({
    queryKey: ["mailing", "preview", bodyHtml],
    queryFn: () => previewEmail({ body_html: bodyHtml }),
    enabled: enabled && bodyHtml.trim().length > 0,
    staleTime: 30_000,
  });
}

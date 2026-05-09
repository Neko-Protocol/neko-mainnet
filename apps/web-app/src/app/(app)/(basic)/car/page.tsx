import { permanentRedirect } from "next/navigation";

/** Legacy URL — bookmarks and old links redirect to `/cart`. */
export default function LegacyCarRoute() {
  permanentRedirect("/cart");
}

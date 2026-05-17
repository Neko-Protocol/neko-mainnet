"use client";

import { useCallback, useState } from "react";
import type { ShareTweetParams } from "@/lib/share";
import {
  buildSharePageUrl,
  buildTweetText,
  generateShareTweet,
} from "@/lib/share";
import {
  copyPngToClipboard,
  downloadPngBlob,
  fetchBannerAsPngBlob,
} from "@/lib/share-banner";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={cn("h-[15px] w-[15px] shrink-0", className)}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function openTwitterIntentWhenReady(
  intentUrl: string,
  placeholderWindow: Window | null
): void {
  if (placeholderWindow && !placeholderWindow.closed) {
    placeholderWindow.location.href = intentUrl;
    return;
  }
  window.open(intentUrl, "_blank", "noopener,noreferrer");
}

export type ShareOnXButtonProps = ShareTweetParams & {
  className?: string;
  label?: string;
  /** Public URL path (e.g. `/x/X-Banner.png`) — resolved against current origin */
  bannerImageSrc?: string;
};

export function ShareOnXButton({
  amount,
  vaultName,
  apy,
  shareId,
  className,
  label = "Share on X",
  bannerImageSrc = "/x/X-Banner.png",
}: ShareOnXButtonProps) {
  const [busy, setBusy] = useState(false);

  const handleClick = useCallback(async () => {
    if (busy) return;
    setBusy(true);

    const params: ShareTweetParams = {
      amount,
      vaultName,
      apy,
      shareId,
    };
    const sharePageUrl = buildSharePageUrl(shareId);
    const intentUrl = generateShareTweet(params);

    /**
     * Abrir pestaña en el mismo gesto del clic evita bloqueo de popups después
     * de los await y mejora que la copia al portapapeles siga ligada al usuario.
     */
    const placeholderTab = window.open("about:blank", "_blank");

    try {
      let pngBlob: Blob;
      try {
        pngBlob = await fetchBannerAsPngBlob(bannerImageSrc);
      } catch {
        placeholderTab?.close();
        notify(
          "No se pudo cargar el banner. Abriendo X solo con texto y enlace.",
          "warning"
        );
        window.open(intentUrl, "_blank", "noopener,noreferrer");
        setBusy(false);
        return;
      }

      const shareFile = new File([pngBlob], "neko-vault-share.png", {
        type: "image/png",
      });

      if (navigator.canShare?.({ files: [shareFile] })) {
        try {
          await navigator.share({
            files: [shareFile],
            text: `${buildTweetText(params)}\n\n${sharePageUrl}`,
          });
          placeholderTab?.close();
          notify(
            "Listo: si elegiste X, revisa que la imagen vaya en el tweet.",
            "success"
          );
          setBusy(false);
          return;
        } catch (err: unknown) {
          const name = err instanceof Error ? err.name : "";
          if (name === "AbortError") {
            placeholderTab?.close();
            setBusy(false);
            return;
          }
          notify(
            "No se pudo usar el menú compartir. Abrimos X en la pestaña nueva…",
            "warning"
          );
        }
      }

      const copied = await copyPngToClipboard(pngBlob);
      openTwitterIntentWhenReady(intentUrl, placeholderTab);

      if (copied) {
        notify(
          "Imagen copiada. En la pestaña de X: haz clic en el cuadro del tweet y pega con ⌘V / Ctrl+V.",
          "success"
        );
      } else {
        downloadPngBlob(pngBlob, "neko-vault-share.png");
        notify(
          "No pudimos copiar al portapapeles. Se descargó neko-vault-share.png: súbela en X (icono de foto).",
          "info"
        );
      }
    } catch {
      placeholderTab?.close();
      notify("Algo salió mal abriendo X. Intenta de nuevo.", "warning");
    }

    setBusy(false);
  }, [busy, amount, vaultName, apy, shareId, bannerImageSrc]);

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className={cn(
        "inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/12 bg-black px-4 py-3 text-sm font-semibold text-white transition-colors duration-150",
        "hover:bg-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400/80",
        "disabled:pointer-events-none disabled:opacity-70",
        className
      )}
    >
      <XIcon />
      {busy ? "Preparando…" : label}
    </button>
  );
}

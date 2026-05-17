/**
 * Helpers so X/Twitter and the Clipboard API reliably receive image/png bytes.
 */

export async function fetchBannerAsPngBlob(publicPath: string): Promise<Blob> {
  const absolute =
    typeof window !== "undefined" && publicPath.startsWith("/")
      ? new URL(publicPath, window.location.origin).toString()
      : publicPath;

  const response = await fetch(absolute);
  const blob = await response.blob();

  if (blob.type === "image/png") {
    return blob;
  }

  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return blob;
    }
    ctx.drawImage(bitmap, 0, 0);
    const png = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/png", 0.95)
    );
    return png ?? blob;
  } finally {
    bitmap.close();
  }
}

export async function copyPngToClipboard(pngBlob: Blob): Promise<boolean> {
  if (!navigator.clipboard?.write || pngBlob.size === 0) {
    return false;
  }

  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        "image/png": pngBlob,
      }),
    ]);
    return true;
  } catch {
    // Safari / algunos Chromium builds aceptan Promesa en ClipboardItem
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "image/png": Promise.resolve(pngBlob),
        }),
      ]);
      return true;
    } catch {
      return false;
    }
  }
}

export function downloadPngBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.click();
  URL.revokeObjectURL(url);
}

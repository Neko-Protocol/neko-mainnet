import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { MOCK_SHARE_DEFAULTS } from "@/lib/share";

export const runtime = "nodejs";

export const alt =
  "Neko Protocol — Vault deposit successful — real yield on RWAs";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

type OgImageProps = {
  params: Promise<{ id: string }>;
};

async function loadBannerDataUrl(): Promise<string> {
  const filePath = join(process.cwd(), "public/x/X-Banner.png");
  const buf = await readFile(filePath);
  return `data:image/png;base64,${buf.toString("base64")}`;
}

export default async function Image({ params }: OgImageProps) {
  const { id } = await params;

  const payload = { ...MOCK_SHARE_DEFAULTS };
  const bannerSrc = await loadBannerDataUrl();

  return new ImageResponse(
    <div
      style={{
        width: size.width,
        height: size.height,
        display: "flex",
        position: "relative",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        color: "#f4f4f5",
      }}
    >
      {/* Background — next/og renders to a bitmap; data URLs are supported */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={bannerSrc}
        alt=""
        width={size.width}
        height={size.height}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />

      {/* Readability overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(105deg, rgba(3,7,18,0.92) 0%, rgba(3,7,18,0.72) 42%, rgba(3,7,18,0.35) 100%)",
        }}
      />

      {/* Accent frame */}
      <div
        style={{
          position: "absolute",
          inset: 28,
          borderRadius: 28,
          border: "1px solid rgba(56,189,248,0.28)",
          boxShadow:
            "0 0 80px rgba(56,189,248,0.12), inset 0 0 0 1px rgba(255,255,255,0.04)",
        }}
      />

      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: "52px 56px 44px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background:
                  "linear-gradient(145deg, rgba(249,115,22,0.95), rgba(251,146,60,0.55))",
                border: "1px solid rgba(255,255,255,0.28)",
                boxShadow: "0 12px 40px rgba(249,115,22,0.28)",
              }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span
                style={{
                  fontSize: 13,
                  letterSpacing: "0.28em",
                  textTransform: "uppercase",
                  color: "rgba(56,189,248,0.95)",
                  fontWeight: 700,
                }}
              >
                Neko Protocol
              </span>
              <span
                style={{
                  fontSize: 40,
                  fontWeight: 700,
                  letterSpacing: "-0.03em",
                  lineHeight: 1.05,
                  color: "#fafafa",
                }}
              >
                Vault Deposit Successful
              </span>
            </div>
          </div>

          <span
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: "rgba(244,244,245,0.92)",
              maxWidth: 780,
              lineHeight: 1.35,
            }}
          >
            {payload.vaultName} · {payload.amount} · {payload.apy} APY
          </span>

          <span
            style={{
              fontSize: 18,
              fontWeight: 500,
              color: "rgba(161,161,170,0.98)",
              maxWidth: 720,
              lineHeight: 1.45,
            }}
          >
            Real yield from RWAs — transparent, on-chain, built for Stellar.
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 24,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span
              style={{
                fontSize: 14,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "rgba(161,161,170,0.85)",
                fontWeight: 700,
              }}
            >
              Share preview
            </span>
            <span style={{ fontSize: 16, color: "rgba(228,228,231,0.82)" }}>
              Link posts show this card automatically on X.
            </span>
            <span
              style={{
                marginTop: 4,
                fontSize: 13,
                fontFamily:
                  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                color: "rgba(161,161,170,0.75)",
              }}
            >
              nekoprotocol.xyz/share/{id}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 6,
            }}
          >
            <span
              style={{
                fontSize: 13,
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                color: "rgba(56,189,248,0.92)",
                fontWeight: 800,
              }}
            >
              Powered by Stellar
            </span>
            <span style={{ fontSize: 15, color: "rgba(161,161,170,0.95)" }}>
              @BuildOnStellar
            </span>
          </div>
        </div>
      </div>
    </div>,
    {
      ...size,
    }
  );
}

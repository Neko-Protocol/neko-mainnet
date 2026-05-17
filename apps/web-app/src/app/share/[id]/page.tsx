import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ShareOnXButton } from "@/components/ShareOnXButton";
import { MOCK_SHARE_DEFAULTS, SITE_URL, buildSharePageUrl } from "@/lib/share";

type SharePageProps = {
  params: Promise<{ id: string }>;
};

/** Demo/static payload until share IDs are backed by persisted deposits. */
function getSharePayload() {
  return { ...MOCK_SHARE_DEFAULTS };
}

export async function generateMetadata({
  params,
}: SharePageProps): Promise<Metadata> {
  const { id } = await params;
  const payload = getSharePayload();
  const pageUrl = buildSharePageUrl(id);
  const title = `Vault deposit · ${payload.vaultName} | Neko Protocol`;
  const description = `Deposited ${payload.amount} into ${payload.vaultName} (${payload.apy} APY). Real yield on RWAs, powered by Stellar.`;

  const ogImageUrl = new URL(
    `/share/${encodeURIComponent(id)}/opengraph-image`,
    SITE_URL
  );

  return {
    title,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: "Neko Protocol",
      locale: "en_US",
      type: "website",
      images: [
        {
          url: ogImageUrl.toString(),
          width: 1200,
          height: 630,
          alt: "Neko Protocol vault deposit share card",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      site: "@NekoProto",
      creator: "@NekoProto",
      images: [ogImageUrl.toString()],
    },
    robots: { index: true, follow: true },
  };
}

export default async function ShareDetailPage({ params }: SharePageProps) {
  const { id } = await params;
  const payload = getSharePayload();

  return (
    <main className="relative isolate overflow-hidden px-4 pb-16 pt-12 sm:px-6 sm:pt-16 lg:px-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.55]"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(56,189,248,0.22), transparent 55%), radial-gradient(ellipse 70% 50% at 100% 50%, rgba(249,115,22,0.12), transparent 50%), radial-gradient(ellipse 70% 50% at 0% 50%, rgba(56,189,248,0.1), transparent 50%)",
        }}
      />

      <div className="relative mx-auto flex max-w-lg flex-col gap-8">
        <header className="flex flex-col items-center gap-3 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-400/90">
            Neko Protocol
          </p>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Vault deposit successful
          </h1>
          <p className="max-w-md text-pretty text-sm leading-relaxed text-zinc-400">
            Real yield on RWAs on Stellar — share your deposit and help others
            discover on-chain returns backed by real-world assets.
          </p>
        </header>

        <article
          className="relative overflow-hidden rounded-2xl border border-white/8 bg-zinc-900/60 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-md"
          style={{
            boxShadow:
              "0 0 0 1px rgba(255,255,255,0.04) inset, 0 24px 80px rgba(0,0,0,0.55)",
          }}
        >
          <div className="relative aspect-2/1 w-full overflow-hidden border-b border-white/6">
            <Image
              src="/x/X-Banner.png"
              alt="Neko Protocol banner"
              fill
              priority
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 512px"
            />
            <div className="absolute inset-0 bg-linear-to-t from-zinc-950/90 via-zinc-950/25 to-transparent" />
          </div>

          <div className="flex flex-col gap-6 px-6 py-7 sm:px-8">
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-white/6 bg-black/30 px-4 py-3">
                <dt className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                  Deposited
                </dt>
                <dd className="mt-1 text-lg font-semibold tabular-nums text-white">
                  {payload.amount}
                </dd>
              </div>
              <div className="rounded-xl border border-white/6 bg-black/30 px-4 py-3 sm:col-span-2">
                <dt className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                  Vault
                </dt>
                <dd className="mt-1 text-lg font-semibold text-white">
                  {payload.vaultName}
                </dd>
              </div>
              <div className="rounded-xl border border-white/6 bg-black/30 px-4 py-3 sm:col-span-3">
                <dt className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                  APY
                </dt>
                <dd className="mt-1 text-lg font-semibold tabular-nums text-emerald-400">
                  {payload.apy}
                </dd>
              </div>
            </dl>

            <div className="flex flex-col gap-3">
              <ShareOnXButton
                amount={payload.amount}
                vaultName={payload.vaultName}
                apy={payload.apy}
                shareId={id}
              />
              <Link
                href="/vaults"
                className="inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/3 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/7"
              >
                Open Neko app
              </Link>
            </div>

            <p className="text-center text-[11px] leading-relaxed text-zinc-500">
              Share ID{" "}
              <span className="font-mono text-zinc-400">
                {encodeURIComponent(id)}
              </span>
              <span className="mx-2 text-zinc-700">·</span>
              Powered by <span className="text-sky-400/90">Stellar</span>
            </p>
          </div>
        </article>
      </div>
    </main>
  );
}

"use client";

function SkeletonBar({ className = "" }: { className?: string }) {
  return <div className={`rounded-md bg-white/8 ${className}`} aria-hidden />;
}

export function VaultDetailSkeleton() {
  return (
    <div
      className="flex min-h-0 w-full flex-1 flex-col overflow-hidden px-4 sm:px-6 lg:px-8"
      aria-busy
      aria-label="Loading vault"
    >
      <div className="shrink-0 py-4">
        <SkeletonBar className="h-4 w-28" />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden pb-4">
        <div className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-2xl bg-[#111111]">
          <aside className="z-30 w-full min-w-0 shrink-0 lg:fixed lg:right-8 lg:top-28 lg:z-40 lg:w-[min(24rem,calc(100vw-4rem))] lg:max-w-[calc(100vw-4rem)] lg:p-0">
            <div className="pool-detail-scroll flex max-h-[min(calc(100dvh-7rem),calc(100svh-7rem))] flex-col gap-3 overflow-y-auto overscroll-contain rounded-2xl bg-[#111111] p-6 lg:h-[min(calc(100dvh-7rem),calc(100svh-7rem))] lg:rounded-xl">
              <SkeletonBar className="h-11 w-full rounded-xl" />
              <SkeletonBar className="h-30 w-full rounded-xl" />
              <div className="mt-1 space-y-2 rounded-xl px-4 py-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex justify-between gap-4 py-2">
                    <SkeletonBar className="h-3 w-20" />
                    <SkeletonBar className="h-3 w-16" />
                  </div>
                ))}
              </div>
              <SkeletonBar className="mt-2 h-12 w-full rounded-xl" />
            </div>
          </aside>

          <section className="pool-detail-scroll min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-8 pb-8 pt-0 lg:mr-104 lg:pr-6">
            <div className="pt-8">
              <div className="mb-10 flex items-center gap-5">
                <SkeletonBar className="h-16 w-24 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-3">
                  <SkeletonBar className="h-[42px] w-full max-w-[min(100%,42rem)]" />
                  <div className="flex flex-wrap gap-4">
                    <SkeletonBar className="h-4 w-28" />
                    <SkeletonBar className="h-4 w-24" />
                  </div>
                </div>
              </div>

              <div className="mb-8 border-t border-white/5" />

              <div className="flex flex-wrap justify-between gap-x-8 gap-y-7">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="min-w-32 space-y-3">
                    <SkeletonBar className="h-3 w-24" />
                    <SkeletonBar className="h-8 w-32" />
                    <SkeletonBar className="h-3 w-20" />
                  </div>
                ))}
              </div>

              <div className="mb-0 mt-10 border-t border-white/5" />
            </div>

            <div className="mt-8 space-y-6">
              <div className="flex gap-6 border-b border-white/5 pb-3">
                {[1, 2, 3].map((i) => (
                  <SkeletonBar key={i} className="h-4 w-20" />
                ))}
              </div>
              <SkeletonBar className="h-7 w-36" />
              <div className="space-y-0 overflow-hidden rounded-xl border border-white/5">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="flex justify-between gap-4 border-b border-white/5 px-1 py-3.5 last:border-0"
                  >
                    <SkeletonBar className="h-4 w-28" />
                    <SkeletonBar className="h-4 w-24" />
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

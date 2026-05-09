"use client";

import { POOL_DETAIL_MAIN_SCROLL_ID } from "./scrollIds";

function SkeletonBar({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-md bg-white/[0.08] ${className}`} aria-hidden />
  );
}

const panelInnerScroll =
  "pool-detail-scroll flex max-h-[min(calc(100dvh-7rem),calc(100svh-7rem))] flex-col gap-3 overflow-y-auto overscroll-contain rounded-2xl bg-[#111111] p-6 lg:rounded-xl";

export function PoolDetailSkeleton() {
  return (
    <div
      className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-2xl bg-[#111111]"
      aria-busy
      aria-label="Loading pool"
    >
      <aside className="z-30 w-full min-w-0 shrink-0 lg:fixed lg:right-8 lg:top-28 lg:z-40 lg:w-[min(24rem,calc(100vw-4rem))] lg:max-w-[calc(100vw-4rem)] lg:p-0">
        <div className={panelInnerScroll}>
          <SkeletonBar className="h-11 w-full rounded-xl" />
          <SkeletonBar className="h-[7.5rem] w-full rounded-xl" />
          <SkeletonBar className="h-[7.5rem] w-full rounded-xl" />
          <div className="rounded-xl px-4 py-2 space-y-2 mt-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex justify-between gap-4 py-2">
                <SkeletonBar className="h-3 w-20" />
                <SkeletonBar className="h-3 w-16" />
              </div>
            ))}
          </div>
          <SkeletonBar className="h-12 w-full rounded-xl mt-2" />
        </div>
      </aside>

      <section
        id={POOL_DETAIL_MAIN_SCROLL_ID}
        className="pool-detail-scroll min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-8 pb-8 pt-0 lg:pr-6 lg:mr-[calc(24rem+2rem)]"
      >
        <div className="pt-8">
          <div className="flex items-center gap-5 mb-10">
            <SkeletonBar className="h-16 w-24 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-3">
              <SkeletonBar className="h-[42px] min-h-[38px] w-full max-w-[min(100%,42rem)]" />
              <div className="flex flex-wrap gap-4">
                <SkeletonBar className="h-4 w-28" />
                <SkeletonBar className="h-4 w-24" />
              </div>
            </div>
          </div>

          <div className="border-t border-white/5 mb-8" />

          <div className="flex flex-wrap justify-between gap-x-8 gap-y-7">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-3 min-w-[8rem]">
                <SkeletonBar className="h-3 w-24" />
                <SkeletonBar className="h-8 w-32" />
                <SkeletonBar className="h-3 w-20" />
              </div>
            ))}
          </div>

          <div className="border-t border-white/5 mt-10 mb-0" />
        </div>

        <div className="mt-8 space-y-6">
          <div className="flex gap-6 border-b border-white/5 pb-3">
            {[1, 2, 3].map((i) => (
              <SkeletonBar key={i} className="h-4 w-20" />
            ))}
          </div>
          <SkeletonBar className="h-7 w-36" />
          <SkeletonBar className="h-4 w-28 mb-4" />
          <div className="space-y-0 rounded-xl border border-white/5 overflow-hidden">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex justify-between gap-4 py-3.5 px-1 border-b border-white/5 last:border-0"
              >
                <SkeletonBar className="h-4 w-28" />
                <SkeletonBar className="h-4 w-24" />
              </div>
            ))}
          </div>
          <SkeletonBar className="h-7 w-36 mt-10" />
          <div className="h-52 rounded-xl border border-white/7 bg-white/[0.03] mt-4" />
          <SkeletonBar className="h-7 w-36 mt-16" />
          <div className="h-40 rounded-xl border border-white/7 bg-white/[0.03] mt-4" />
        </div>
      </section>
    </div>
  );
}

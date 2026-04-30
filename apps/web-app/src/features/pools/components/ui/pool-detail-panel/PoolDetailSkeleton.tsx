"use client";

function SkeletonBar({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-md bg-white/[0.08] animate-pulse ${className}`}
      aria-hidden
    />
  );
}

export function PoolDetailSkeleton() {
  return (
    <div
      className="w-full rounded-2xl border border-white/7 grid grid-cols-1 lg:grid-cols-[1fr_24rem] items-start overflow-hidden"
      style={{ background: "#111111" }}
      aria-busy
      aria-label="Loading pool"
    >
      <div className="min-w-0 p-8 lg:border-r border-white/7 order-2 lg:order-1">
        <div className="flex items-center gap-5 mb-10">
          <SkeletonBar className="h-16 w-24 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-3">
            <SkeletonBar className="h-9 w-[min(18rem,70vw)] max-w-full" />
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
          <div className="h-52 rounded-xl border border-white/7 bg-white/[0.03] animate-pulse mt-4" />
          <SkeletonBar className="h-7 w-36 mt-16" />
          <div className="h-40 rounded-xl border border-white/7 bg-white/[0.03] animate-pulse mt-4" />
        </div>
      </div>

      <div className="order-1 lg:order-2 lg:sticky lg:top-6 lg:self-start">
        <div className="p-6 flex flex-col gap-3 lg:max-h-[calc(100dvh-3rem)]">
          <SkeletonBar className="h-11 w-full rounded-xl" />
          <SkeletonBar className="h-[7.5rem] w-full rounded-xl" />
          <SkeletonBar className="h-[7.5rem] w-full rounded-xl" />
          <div className="rounded-xl bg-[#1C1C1C] border border-white/5 px-4 py-2 space-y-2 mt-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex justify-between gap-4 py-2 border-b border-white/5 last:border-0"
              >
                <SkeletonBar className="h-3 w-20" />
                <SkeletonBar className="h-3 w-16" />
              </div>
            ))}
          </div>
          <SkeletonBar className="h-12 w-full rounded-xl mt-2" />
        </div>
      </div>
    </div>
  );
}

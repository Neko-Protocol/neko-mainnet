"use client";

import React from "react";
import Image from "next/image";
import {
  ShoppingBag,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { PageContainer } from "@/components/ui/PageContainer";
import { BannerPage } from "@/components/ui/BannerPage";
import { useCartStore } from "@/stores/cart.store";
import {
  useCartExecution,
  type ItemExecutionStatus,
} from "../../hooks/useCartExecution";
import { useWallet } from "@/hooks/useWallet";
import { ASSET_INFO } from "@/features/shared/discover/utils/assetInfo";
import {
  getAssetsConfig,
  getTokenIconMap,
} from "@/lib/constants/assets.config";
import { formatAmount } from "@/lib/helpers/formatUtils";

function ItemStatusIcon({ status }: { status: ItemExecutionStatus }) {
  if (status === "executing")
    return <Loader2 className="h-4 w-4 animate-spin text-white/40 shrink-0" />;
  if (status === "success")
    return <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />;
  if (status === "error" || status === "rejected")
    return <XCircle className="h-4 w-4 text-red-400 shrink-0" />;
  return null;
}

export function CartPage() {
  const { items, removeItem } = useCartStore();
  const { isExecuting, getStatus, executeAll } = useCartExecution();
  const { address } = useWallet();
  const assetsCfg = getAssetsConfig();
  const tokenIconMap = getTokenIconMap();

  return (
    <PageContainer maxWidth="4xl">
      <BannerPage
        title="Your Cart"
        subtitle="Review your pending purchases and confirm them all at once."
        badge="Checkout"
        imageSrc="/banners/cart.png"
        imageAlt="Cart illustration"
        imageLayoutClassName="-right-95 -top-9 h-[174%] w-[125%]"
        imageObjectClassName="object-contain object-right object-top"
        className="mb-6"
      />

      {items.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-[#1C1C1C] p-12 text-center">
          <ShoppingBag className="mx-auto mb-4 h-10 w-10 text-white/20" />
          <p className="text-white/50 text-base font-medium">
            Your cart is empty
          </p>
          <p className="mt-1 text-white/30 text-sm">
            Browse assets in{" "}
            <Link href="/discover" className="text-[#229EDF] hover:underline">
              Discover
            </Link>{" "}
            and add items to your cart.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3 mb-6">
            {items.map((item) => {
              const staticInfo = ASSET_INFO[item.symbol];
              const cfgInfo = assetsCfg[item.symbol];
              const displayName =
                staticInfo?.name ?? cfgInfo?.name ?? item.symbol;
              const logoSrc = staticInfo?.logo ?? cfgInfo?.icon;
              const paymentIconSrc = tokenIconMap[item.paymentToken];
              const { status, errorMsg } = getStatus(item);
              const isDone = status === "success";

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border bg-[#1C1C1C] p-4 transition-opacity ${
                    isDone
                      ? "border-emerald-500/20 opacity-60"
                      : "border-white/5"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {logoSrc && (
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-white ring-1 ring-white/10">
                          <Image
                            src={logoSrc}
                            alt={displayName}
                            fill
                            unoptimized
                            className="object-cover scale-110"
                          />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-white font-semibold text-sm truncate">
                          {item.symbol}
                        </p>
                        <p className="text-white/40 text-xs truncate">
                          {displayName}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        <div className="flex items-center gap-1.5">
                          {paymentIconSrc && (
                            <div className="relative h-3.5 w-3.5 overflow-hidden rounded-full">
                              <Image
                                src={paymentIconSrc}
                                alt={item.paymentToken}
                                fill
                                unoptimized
                                className="object-cover"
                              />
                            </div>
                          )}
                          <span className="text-white/60 text-xs font-medium tabular-nums">
                            {formatAmount(item.paymentAmount, 4)}{" "}
                            {item.paymentToken}
                          </span>
                        </div>
                        <ArrowRight className="h-3 w-3 text-white/20 self-end" />
                        <span className="text-white text-sm font-semibold tabular-nums">
                          ~{formatAmount(item.estimatedReceive, 4)}{" "}
                          {item.symbol}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <ItemStatusIcon status={status} />
                      {status !== "success" && (
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          disabled={isExecuting}
                          aria-label={`Remove ${item.symbol}`}
                          className="rounded-lg p-1.5 text-white/25 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {(status === "error" || status === "rejected") && (
                    <p className="mt-2 ml-13 text-red-400 text-xs">
                      {status === "rejected"
                        ? "Transaction rejected in wallet"
                        : (errorMsg ?? "Transaction failed")}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="rounded-2xl border border-white/5 bg-[#1C1C1C] p-4 mb-4">
            <p className="text-white/40 text-xs mb-0.5">
              Estimated total spend
            </p>
            <p className="text-white/30 text-xs">
              Amounts shown are estimates at the time of adding to cart. Final
              amounts are determined at execution using live quotes.
            </p>
          </div>

          {!address ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center text-white/50 text-sm">
              Connect your wallet to confirm purchases
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void executeAll()}
              disabled={isExecuting || items.length === 0}
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#229EDF] text-white font-semibold text-sm hover:bg-[#1a8bc7] transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isExecuting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing…
                </>
              ) : (
                `Confirm all (${items.length} item${items.length !== 1 ? "s" : ""})`
              )}
            </button>
          )}
        </>
      )}
    </PageContainer>
  );
}

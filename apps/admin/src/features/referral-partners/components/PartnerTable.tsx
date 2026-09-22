"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Link2, Trash2 } from "lucide-react";
import type { ReferralPartner, ReferralPartnerType } from "@neko-protocol/api-contracts";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { Button, ErrorNote } from "@/components/ui/FormControls";
import { formatDate, referralLink } from "../utils";

type FilterTab = "all" | ReferralPartnerType;

const TABS: { value: FilterTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "company", label: "Companies" },
  { value: "influencer", label: "Influencers" },
];

const TYPE_STYLES: Record<ReferralPartnerType, string> = {
  company: "bg-[#229EDF]/10 text-[#229EDF]",
  influencer: "bg-purple-500/10 text-purple-400",
};

export interface PartnerTableProps {
  partners: ReferralPartner[];
  isPending: boolean;
  isError: boolean;
  deletePending: boolean;
  deleteError: unknown;
  onRequestDelete: (partner: ReferralPartner) => void;
}

/** Type-filterable tabs + table of existing partner codes, with a copy
 * code/link action and a delete trigger (confirmation lives in the parent). */
export function PartnerTable({
  partners,
  isPending,
  isError,
  deletePending,
  deleteError,
  onRequestDelete,
}: PartnerTableProps) {
  const router = useRouter();
  const { copy, copiedKey } = useCopyToClipboard();
  const [tab, setTab] = useState<FilterTab>("all");

  const counts = useMemo(
    () => ({
      all: partners.length,
      company: partners.filter((p) => p.type === "company").length,
      influencer: partners.filter((p) => p.type === "influencer").length,
    }),
    [partners]
  );
  const visible =
    tab === "all" ? partners : partners.filter((p) => p.type === tab);

  return (
    <>
      <div className="mb-3 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === t.value
                ? "bg-[#229EDF] text-white"
                : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80"
            }`}
          >
            {t.label} <span className="opacity-70">({counts[t.value]})</span>
          </button>
        ))}
      </div>

      {isError ? (
        <ErrorNote error={new Error("Couldn't load referral partners.")} />
      ) : isPending ? (
        <div className="h-20 animate-pulse rounded-lg bg-white/5" />
      ) : !visible.length ? (
        <p className="text-sm text-white/40">
          {partners.length
            ? "None in this category yet."
            : "No partner codes yet."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/5">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/5 text-white/40">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Link</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => (
                <tr
                  key={p.id}
                  onClick={() =>
                    router.push(
                      `/referrals/partners/${p.id}?name=${encodeURIComponent(p.name)}`
                    )
                  }
                  className="cursor-pointer border-b border-white/5 last:border-0 hover:bg-white/[0.04]"
                >
                  <td className="px-4 py-3 text-white">{p.name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs ${TYPE_STYLES[p.type]}`}
                    >
                      {p.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copy(p.id, p.code);
                      }}
                      className="group flex items-center gap-1.5 font-mono text-white/70 transition-colors hover:text-white"
                    >
                      {p.code}
                      {copiedKey === p.id ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <Copy className="h-3 w-3 text-white/40 group-hover:text-white/70" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    {(() => {
                      const link = referralLink(p.code);
                      if (!link) {
                        return (
                          <span className="text-xs text-white/30">
                            set NEXT_PUBLIC_WEB_APP_URL
                          </span>
                        );
                      }
                      const key = `${p.id}-link`;
                      return (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copy(key, link);
                          }}
                          className="group flex items-center gap-1.5 text-white/70 transition-colors hover:text-white"
                        >
                          <Link2 className="h-3.5 w-3.5 text-white/40 group-hover:text-white/70" />
                          {copiedKey === key ? (
                            <span className="text-xs text-emerald-400">
                              Copied
                            </span>
                          ) : (
                            <span className="text-xs">Copy link</span>
                          )}
                        </button>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3 text-white/70">{p.email ?? "-"}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-white/70">
                    {formatDate(p.created_at)}
                    {p.created_by ? (
                      <span className="block text-xs text-white/30">
                        by {p.created_by}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      type="button"
                      variant="danger"
                      disabled={deletePending}
                      onClick={(e) => {
                        e.stopPropagation();
                        onRequestDelete(p);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-3">
        <ErrorNote error={deleteError} />
      </div>
    </>
  );
}

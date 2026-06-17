"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import {
  decodeDestinationValue,
  encodeDestinationValue,
  type CatalogDestination,
  type DestinationKind,
  type RecommendedStrategy,
} from "@/lib/recommended-strategies-schema";
import {
  createRecommendedStrategy,
  deleteRecommendedStrategy,
  listCatalogDestinations,
  updateRecommendedStrategy,
} from "@/lib/recommended-strategies";

type Props = {
  recommendations: RecommendedStrategy[];
};

const CHIP =
  "inline-flex items-center rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[11px] text-white/70";

const INPUT_CLS =
  "mt-1 w-full rounded-xl border border-white/10 bg-[#121212] px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent placeholder:text-white/35 focus:border-[#229EDF]/50 focus:ring-[#229EDF]/25";

const SELECT_CLS = INPUT_CLS;

const DESTINATION_KINDS: DestinationKind[] = ["pool", "vault", "yield-token"];

const DESTINATION_KIND_LABELS: Record<DestinationKind, string> = {
  pool: "Liquidity Pools",
  vault: "Auto-Invest",
  "yield-token": "Stable Bonds",
};

const TYPE_BUTTON_BASE =
  "inline-flex items-center rounded-xl border px-3 py-2 text-xs font-medium transition";

function typeButtonCls(selected: boolean, disabled: boolean): string {
  if (disabled) {
    return `${TYPE_BUTTON_BASE} cursor-not-allowed border-white/5 text-white/25 opacity-50`;
  }
  return selected
    ? `${TYPE_BUTTON_BASE} border-[#229EDF] text-white shadow-[inset_0_0_0_1px_rgba(34,158,223,0.35)]`
    : `${TYPE_BUTTON_BASE} border-white/10 text-white/70 hover:border-white/20`;
}

function destinationLabel(d: CatalogDestination): string {
  const apyPart = d.apy != null ? ` · ${d.apy.toFixed(2)}%` : "";
  return `${d.name} · ${d.protocol}${apyPart}`;
}

function findDestination(
  catalog: CatalogDestination[],
  kind: string,
  id: string
): CatalogDestination | undefined {
  return catalog.find((d) => d.kind === kind && d.id === id);
}

function activeBadgeCls(isActive: boolean): string {
  const base =
    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium";
  return isActive
    ? `${base} bg-[#4ADE80]/15 text-[#4ADE80]`
    : `${base} bg-white/10 text-white/40`;
}

type FormState = {
  name: string;
  description: string;
  tokenCode: string;
  destinationKind: DestinationKind | "";
  destinationValue: string;
  stackValue: string;
  snapshotApy: string;
  position: number;
  isActive: boolean;
};

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  tokenCode: "",
  destinationKind: "",
  destinationValue: "",
  stackValue: "",
  snapshotApy: "",
  position: 0,
  isActive: true,
};

function formFromRecommendation(r: RecommendedStrategy): FormState {
  return {
    name: r.name,
    description: r.description ?? "",
    tokenCode: r.token_code,
    destinationKind: r.destination_kind,
    destinationValue: encodeDestinationValue(
      r.destination_kind,
      r.destination_id
    ),
    stackValue:
      r.stack_kind && r.stack_id
        ? encodeDestinationValue(r.stack_kind, r.stack_id)
        : "",
    snapshotApy: r.snapshot_apy != null ? String(r.snapshot_apy) : "",
    position: r.position,
    isActive: r.is_active,
  };
}

function buildPayload(form: FormState): Record<string, unknown> | null {
  const dest = decodeDestinationValue(form.destinationValue);
  if (!dest) return null;

  let stack_kind: string | null = null;
  let stack_id: string | null = null;
  if (form.stackValue) {
    const stack = decodeDestinationValue(form.stackValue);
    if (!stack) return null;
    stack_kind = stack.kind;
    stack_id = stack.id;
  }

  return {
    name: form.name.trim(),
    description: form.description.trim() || null,
    token_code: form.tokenCode.trim(),
    destination_kind: dest.kind,
    destination_id: dest.id,
    stack_kind,
    stack_id,
    snapshot_apy: form.snapshotApy === "" ? null : Number(form.snapshotApy),
    position: form.position,
    is_active: form.isActive,
  };
}

export default function RecommendedClient({ recommendations }: Props) {
  const router = useRouter();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: catalog = [], isSuccess: catalogLoaded } = useQuery({
    queryKey: ["recommended-catalog"],
    queryFn: listCatalogDestinations,
  });

  const tokenOptions = useMemo(() => {
    const codes = new Set<string>();
    for (const d of catalog) {
      for (const c of d.acceptedTokenCodes) codes.add(c);
    }
    return [...codes].sort();
  }, [catalog]);

  const destinationKindCounts = useMemo(() => {
    const counts: Record<DestinationKind, number> = {
      pool: 0,
      vault: 0,
      "yield-token": 0,
    };
    if (!form.tokenCode) return counts;
    for (const d of catalog) {
      if (d.acceptedTokenCodes.includes(form.tokenCode)) {
        counts[d.kind] += 1;
      }
    }
    return counts;
  }, [catalog, form.tokenCode]);

  const destinationOptions = useMemo(() => {
    if (!form.tokenCode || !form.destinationKind) return [];
    return catalog.filter(
      (d) =>
        d.kind === form.destinationKind &&
        d.acceptedTokenCodes.includes(form.tokenCode)
    );
  }, [catalog, form.tokenCode, form.destinationKind]);

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(r: RecommendedStrategy) {
    setEditingId(r.id);
    setForm(formFromRecommendation(r));
    setError(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
  }

  function onDestinationChange(value: string) {
    setForm((prev) => {
      const next = { ...prev, destinationValue: value };
      const dest = decodeDestinationValue(value);
      if (dest) {
        const cat = findDestination(catalog, dest.kind, dest.id);
        if (cat?.apy != null && Number.isFinite(cat.apy)) {
          next.snapshotApy = String(cat.apy);
        } else {
          next.snapshotApy = "";
        }
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = buildPayload(form);
    if (!payload) {
      setError("Invalid destination selection.");
      setSubmitting(false);
      return;
    }

    try {
      if (editingId) {
        await updateRecommendedStrategy(editingId, payload);
      } else {
        await createRecommendedStrategy(
          payload as Parameters<typeof createRecommendedStrategy>[0]
        );
      }
      closeModal();
      refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : editingId
            ? "Failed to update recommendation."
            : "Failed to create recommendation."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(r: RecommendedStrategy) {
    setActionId(r.id);
    setError(null);
    try {
      await updateRecommendedStrategy(r.id, { is_active: !r.is_active });
      refresh();
    } catch {
      setError("Failed to update active status.");
    } finally {
      setActionId(null);
    }
  }

  async function handleDelete(r: RecommendedStrategy) {
    if (!window.confirm(`Delete "${r.name}"? This cannot be undone.`)) return;
    setActionId(r.id);
    setError(null);
    try {
      await deleteRecommendedStrategy(r.id);
      refresh();
    } catch {
      setError("Failed to delete recommendation.");
    } finally {
      setActionId(null);
    }
  }

  const noCatalog = catalogLoaded && catalog.length === 0;
  const activeCount = recommendations.filter((r) => r.is_active).length;

  return (
    <div className="min-h-screen bg-[#121212] p-6 lg:p-8">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            Recommended Strategies
          </h1>
          <p className="text-sm text-white/50">
            Curated recipes shown in the web-app &ldquo;Recommended by
            Neko&rdquo; section
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-full bg-[#229EDF] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1a8bc7]"
          onClick={openCreate}
        >
          New recommendation
        </button>
      </header>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/8 bg-[#1C1C1C] p-5 ring-1 ring-white/5">
          <div className="flex justify-between gap-2">
            <p className="text-sm font-medium text-white/50">Total</p>
            <Sparkles className="size-5 text-white/40" aria-hidden />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">
            {recommendations.length.toLocaleString()}
          </p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-[#1C1C1C] p-5 ring-1 ring-[#4ADE80]/25">
          <div className="flex justify-between gap-2">
            <p className="text-sm font-medium text-white/50">Active</p>
            <Sparkles className="size-5 text-[#4ADE80]/60" aria-hidden />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">
            {activeCount.toLocaleString()}
          </p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-[#1C1C1C] p-5 ring-1 ring-[#229EDF]/25 sm:col-span-2 lg:col-span-1">
          <div className="flex justify-between gap-2">
            <p className="text-sm font-medium text-white/50">
              Catalog destinations
            </p>
            <Sparkles className="size-5 text-[#229EDF]/55" aria-hidden />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">
            {catalogLoaded ? catalog.length.toLocaleString() : "…"}
          </p>
          {noCatalog ? (
            <p className="mt-1 text-[11px] text-amber-200/80">
              Empty — run the catalog sync
            </p>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="mb-4 text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      {recommendations.length === 0 ? (
        <div className="rounded-2xl border border-white/8 bg-[#1C1C1C] px-6 py-16 text-center text-white/60">
          No recommendations yet. Create one to curate the strategies library.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {recommendations.map((r) => {
            const dest = findDestination(
              catalog,
              r.destination_kind,
              r.destination_id
            );
            const stack =
              r.stack_kind && r.stack_id
                ? findDestination(catalog, r.stack_kind, r.stack_id)
                : undefined;
            const destLabel = dest?.name ?? r.destination_id;
            const stackLabel = stack?.name;
            const routeLabel = stackLabel
              ? `${destLabel} + ${stackLabel}`
              : destLabel;
            const protocol = dest?.protocol ?? "—";
            const apyLabel =
              r.snapshot_apy != null ? `${r.snapshot_apy.toFixed(2)}%` : "—";
            const busy = actionId === r.id;

            return (
              <div
                key={r.id}
                className="flex flex-col gap-4 rounded-2xl border border-white/8 bg-[#1C1C1C] p-5 transition-colors hover:border-white/[0.14]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h2 className="min-w-0 flex-1 text-base font-bold text-white">
                    {r.name}
                  </h2>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <span className={activeBadgeCls(r.is_active)}>
                      {r.is_active ? "active" : "inactive"}
                    </span>
                    <span className={CHIP}>pos · {r.position}</span>
                  </div>
                </div>

                <p className="line-clamp-2 text-sm text-white/55">
                  {r.description?.trim() ? (
                    r.description
                  ) : (
                    <span className="italic text-white/40">No description</span>
                  )}
                </p>

                <div className="flex flex-wrap gap-2">
                  <span className={CHIP}>Token · {r.token_code}</span>
                  <span className={CHIP}>Route · {routeLabel}</span>
                  <span className={CHIP}>Protocol · {protocol}</span>
                  <span className={CHIP}>Snapshot APY · {apyLabel}</span>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-white/8 pt-4">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => toggleActive(r)}
                    className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:bg-white/5 disabled:opacity-50"
                  >
                    {busy ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    ) : r.is_active ? (
                      "Deactivate"
                    ) : (
                      "Activate"
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => openEdit(r)}
                    className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-medium text-[#229EDF] transition hover:bg-[#229EDF]/10 disabled:opacity-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleDelete(r)}
                    className="rounded-xl border border-red-500/20 px-3 py-1.5 text-xs font-medium text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rec-modal-title"
        >
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/10 bg-[#1C1C1C] p-6 shadow-xl">
            <h2
              id="rec-modal-title"
              className="text-lg font-semibold text-white"
            >
              {editingId ? "Edit recommendation" : "New recommendation"}
            </h2>
            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="rec-name"
                  className="block text-xs font-medium text-white/50"
                >
                  Name<span className="text-red-400">*</span>
                </label>
                <input
                  id="rec-name"
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className={INPUT_CLS}
                  placeholder='e.g. "Stable yield stack"'
                />
              </div>

              <div>
                <label
                  htmlFor="rec-desc"
                  className="block text-xs font-medium text-white/50"
                >
                  Description
                </label>
                <textarea
                  id="rec-desc"
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  className={`${INPUT_CLS} resize-y`}
                  placeholder="Short summary for users"
                />
              </div>

              <div>
                <label
                  htmlFor="rec-token"
                  className="block text-xs font-medium text-white/50"
                >
                  Token<span className="text-red-400">*</span>
                </label>
                <select
                  id="rec-token"
                  required
                  value={form.tokenCode}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      tokenCode: e.target.value,
                      destinationKind: "",
                      destinationValue: "",
                      stackValue: "",
                    }))
                  }
                  className={SELECT_CLS}
                >
                  <option value="">
                    {noCatalog
                      ? "No destinations yet — run the catalog sync"
                      : "Select token"}
                  </option>
                  {tokenOptions.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <p className="text-xs font-medium text-white/50">
                  Destination type<span className="text-red-400">*</span>
                </p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {DESTINATION_KINDS.map((kind) => {
                    const count = destinationKindCounts[kind];
                    const selected = form.destinationKind === kind;
                    const noToken = !form.tokenCode;
                    const disabled = noToken || count === 0;
                    return (
                      <button
                        key={kind}
                        type="button"
                        disabled={disabled}
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            destinationKind: kind,
                            destinationValue: "",
                          }))
                        }
                        className={typeButtonCls(selected, disabled)}
                      >
                        {DESTINATION_KIND_LABELS[kind]}
                        <span className="ml-1 tabular-nums text-white/45">
                          · {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {!form.tokenCode && !noCatalog ? (
                  <p className="mt-1.5 text-[11px] text-white/40">
                    Select a token first
                  </p>
                ) : null}
              </div>

              <div>
                <label
                  htmlFor="rec-dest"
                  className="block text-xs font-medium text-white/50"
                >
                  Destination<span className="text-red-400">*</span>
                </label>
                <select
                  id="rec-dest"
                  required
                  value={form.destinationValue}
                  onChange={(e) => onDestinationChange(e.target.value)}
                  className={SELECT_CLS}
                  disabled={
                    (!form.tokenCode || !form.destinationKind) && !noCatalog
                  }
                >
                  <option value="">
                    {noCatalog
                      ? "No destinations yet — run the catalog sync"
                      : !form.tokenCode
                        ? "Select a token first"
                        : !form.destinationKind
                          ? "Select a type"
                          : "Select destination"}
                  </option>
                  {destinationOptions.map((d) => (
                    <option
                      key={encodeDestinationValue(d.kind, d.id)}
                      value={encodeDestinationValue(d.kind, d.id)}
                    >
                      {destinationLabel(d)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="rec-stack"
                  className="block text-xs font-medium text-white/50"
                >
                  Optional stack venue
                </label>
                <select
                  id="rec-stack"
                  value={form.stackValue}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, stackValue: e.target.value }))
                  }
                  className={SELECT_CLS}
                >
                  <option value="">None</option>
                  {noCatalog ? (
                    <option value="" disabled>
                      No destinations yet — run the catalog sync
                    </option>
                  ) : (
                    catalog.map((d) => (
                      <option
                        key={`stack-${encodeDestinationValue(d.kind, d.id)}`}
                        value={encodeDestinationValue(d.kind, d.id)}
                      >
                        {destinationLabel(d)}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label
                  htmlFor="rec-apy"
                  className="block text-xs font-medium text-white/50"
                >
                  Snapshot APY (%)
                </label>
                <input
                  id="rec-apy"
                  type="number"
                  step="any"
                  value={form.snapshotApy}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      snapshotApy: e.target.value,
                    }))
                  }
                  className={INPUT_CLS}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="rec-position"
                    className="block text-xs font-medium text-white/50"
                  >
                    Position
                  </label>
                  <input
                    id="rec-position"
                    type="number"
                    min={0}
                    value={form.position}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        position: Number(e.target.value) || 0,
                      }))
                    }
                    className={INPUT_CLS}
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-white/70">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          isActive: e.target.checked,
                        }))
                      }
                      className="size-4 rounded border-white/20 bg-[#121212] text-[#229EDF] focus:ring-[#229EDF]/40"
                    />
                    Active
                  </label>
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-white/70 hover:bg-white/5"
                  onClick={closeModal}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#229EDF] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#1a8bc7] disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      Saving…
                    </>
                  ) : editingId ? (
                    "Save changes"
                  ) : (
                    "Create recommendation"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

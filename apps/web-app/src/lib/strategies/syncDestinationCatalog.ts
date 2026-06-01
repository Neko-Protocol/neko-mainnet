import { getSupabaseAdmin } from "@/lib/services/supabase.server";
import { buildCatalogDestinations } from "@/lib/strategies/buildCatalogDestinations";

export async function syncDestinationCatalog(): Promise<{ upserted: number }> {
  const build = await buildCatalogDestinations();
  if (build.length === 0) {
    return { upserted: 0 };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return { upserted: 0 };

  const syncStartedAt = new Date().toISOString();
  const rows = build.map((destination) => ({
    kind: destination.kind,
    id: destination.id,
    name: destination.name,
    protocol: destination.protocol,
    apy: destination.apy,
    accepted_token_codes: destination.acceptedTokenCodes,
    updated_at: syncStartedAt,
  }));

  if (rows.length > 0) {
    const { error } = await supabase
      .from("destination_catalog")
      .upsert(rows, { onConflict: "kind,id" });
    if (error) throw error;
  }

  const kindsInBuild = [...new Set(build.map((d) => d.kind))];
  const { error: deleteError } = await supabase
    .from("destination_catalog")
    .delete()
    .in("kind", kindsInBuild)
    .lt("updated_at", syncStartedAt);
  if (deleteError) throw deleteError;

  return { upserted: build.length };
}

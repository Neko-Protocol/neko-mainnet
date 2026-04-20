---
name: vault
description: Guide for adding new vaults and yield-strategy integrations to the Neko DApp vault feature. Use this skill when the user asks to "add a vault", "register a new DeFindex vault", "integrate a new strategy" (Blend, Aquarius, Soroswap, Neko pool, …), wire up APY/invest endpoints for a new vault, expose a new vault in the UI, or extend `features/vault/**` / `lib/defindex/**` / `app/api/defindex/**` / `app/api/vault/**`. Not for Stellar/Soroban contract authoring (use `stellar-dev`) or for generic TanStack Query questions (use `tanstack-query`).
user-invocable: true
argument-hint: "[new vault contract id or strategy name]"
---

# Vault Feature — Integration Skill

Purpose: add a **new DeFindex vault** (or a **new strategy under an existing vault**) to the Neko web app, with correct wiring through contracts → server → hooks → UI, without breaking the existing CETES vault.

This skill reflects the actual codebase layout. When something looks off, prefer reading the referenced file over guessing.

---

## Mental model (read this first)

The vault feature is a **DeFindex integration**, not a bespoke contract. Everything the UI shows comes from one of:

1. **DeFindex HTTP API** (via `@defindex/sdk`) — catalog-style metadata and quoted APY. Called **server-side** from `/api/defindex/vaults` with `DEFINDEX_API_KEY` (returns 403 without it).
2. **DeFindex Vault Soroban contract** — live on-chain numbers (TVL, shares, allocations, idle) and user actions (deposit/withdraw/rebalance/fees). Called via the typed client `new Client(...)` from `@neko/defindex-vault` (package is `packages/contracts/defindex-vault`, TypeScript bindings generated from the Soroban contract).
3. **Per-strategy APY sources** — each strategy (Neko pool, Aquarius AMM, Soroswap, …) has its own APY source (on-chain getter, public HTTP API, or `null` when unavailable). These are aggregated in `app/api/vault/apy/route.ts` into a weighted vault APY.

Two flows to keep straight:

- **User flow (client-signed):** `VaultActionModal` → `useVaultAction` → `DefindexVaultClient.deposit / withdraw` → user signs via Freighter / Stellar Wallets Kit → RPC. No manager key involved.
- **Manager flow (server-signed):** `/api/vault/invest` → builds `rebalance` / `report` / `lock_fees` / `distribute_fees` txs and signs with `VAULT_MANAGER_SECRET_KEY`. Only the vault manager can do this; protect the route (Vercel cron header or rate-limit is the current mechanism).

---

## File map (authoritative — match these exactly when editing)

```
apps/web-app/src/
├── app/
│   ├── (app)/vaults/page.tsx                  # Next route → renders <Vault/>
│   └── api/
│       ├── defindex/vaults/route.ts           # GET: DeFindex catalog → VaultView[]
│       └── vault/
│           ├── apy/route.ts                   # GET: weighted vault APY + per-strategy APY
│           └── invest/route.ts                # GET state / POST invest+fees (manager-signed)
├── features/vault/
│   ├── components/
│   │   ├── pages/Vault.tsx                    # Top-level page, orchestrates modals
│   │   └── ui/
│   │       ├── VaultGrid.tsx
│   │       ├── VaultCard.tsx
│   │       ├── VaultDetailModal.tsx
│   │       ├── VaultActionModal.tsx           # deposit / withdraw UI
│   │       ├── MyVaultPositions.tsx
│   │       ├── VaultTabs.tsx
│   │       ├── VaultAssetIllustrations.tsx
│   │       └── VaultOptimizeBanner.tsx
│   ├── hooks/
│   │   ├── useDefindexVaults.ts               # GET /api/defindex/vaults
│   │   ├── useVaultData.ts                    # on-chain TVL + shares + price/share
│   │   ├── useVaultBalance.ts                 # user dfToken balance
│   │   ├── useVaultAction.ts                  # deposit / withdraw (signs client-side)
│   │   ├── useVaultApy.ts                     # GET /api/vault/apy
│   │   └── useVaultInvest.ts                  # GET state + POST /api/vault/invest
│   ├── types/vault.ts                         # VaultConfig / VaultStats / VaultView etc.
│   └── utils/
│       ├── vault.ts                           # resolveAssetIcon
│       └── vaultAssetArt.ts                   # symbol → icon asset paths
└── lib/defindex/
    ├── env.ts                                 # DEFINDEX_API_KEY reader
    ├── network.ts                             # stellarNetwork → SupportedNetworks
    ├── createServerSdk.ts                     # new DefindexSDK({ apiKey })
    ├── mapToVaultView.ts                      # VaultInfoResponse → VaultView
    ├── vaultIds.ts                            # **hard-coded vault contract ids**
    └── vaultContract.ts                       # resolveVaultIdForApi (allow-list guard)
```

Contract client package: `@neko/defindex-vault` (aliased in `apps/web-app/package.json` to workspace package `packages/contracts/defindex-vault`). Import as:

```ts
import { Client as DefindexVaultClient } from "@neko/defindex-vault";
```

---

## Scenario A — Add a new DeFindex vault (new contract id)

Do these in order. Each step has a single file to touch.

### 1. Register the vault id

`apps/web-app/src/lib/defindex/vaultIds.ts`

```ts
const MAINNET_VAULT_IDS = [
  "CCFWKCD52JNSQLN5OS4F7EG6BPDT4IRJV6KODIEIZLWPM35IKHOKT6S2", // CETES
  "C... new vault contract id here ...",
];
```

That's it — `/api/defindex/vaults` iterates all ids via `Promise.allSettled`, so one failing vault does not bring the page down. `resolveVaultIdForApi` uses this same list as an allow-list for the `vault` query param on `/api/vault/apy` and `/api/vault/invest`.

> If you need per-network ids, split `MAINNET_VAULT_IDS` / `TESTNET_VAULT_IDS` and pick based on `defindexNetworkFromEnv()` (see `lib/defindex/network.ts`). Do **not** read ids from `NEXT_PUBLIC_*` env vars unless you also update `parseDefindexVaultIds` — the current code ignores them even though the API hint mentions them.

### 2. Make sure icons exist for the supply/collateral symbols

`apps/web-app/src/features/vault/utils/vaultAssetArt.ts`

- Default icon is `/assets/vault-assets/usdc.svg`.
- Unknown symbols render the default, which looks wrong for new assets.
- Add the new symbol to `VAULT_ASSET_ART` with an `iconSrc` + `iconWhiteSrc` pair and drop SVGs in `apps/web-app/public/assets/vault-assets/`.
- `resolveVaultArtKey` also supports substring fallbacks (e.g. anything containing `CETES` → `CETES`); add one if the on-chain symbol is padded or inconsistent.
- Remember `normalizeVaultSymbol` strips NUL bytes — Stellar/Soroban symbols are often NUL-padded. Always normalize before lookup.

### 3. Override static metadata only if needed

`lib/defindex/mapToVaultView.ts` builds a `VaultView` from the DeFindex `VaultInfoResponse` and currently **hard-codes** some fields: `category: "lending"`, `status: "active"`, `createdBy: "DeFindex"`, `creatorIconSrc: "/defindex-logo.svg"`, `variant: "light"`, `featured: true`, plus human-readable `tvl/apy` strings.

If the new vault needs different metadata (e.g. `category: "amm"`, different creator), add a branch keyed off `contractId` inside `defindexInfoToVaultView`, or refactor to look up a small static record first:

```ts
const STATIC_OVERRIDES: Record<string, Partial<VaultConfig>> = {
  "CCFW...": { category: "lending", createdBy: "DeFindex" },
  "CNEW...": { category: "amm", createdBy: "Partner" },
};
```

Keep the merge order: `defaults → STATIC_OVERRIDES[contractId] → { ...config }`.

### 4. Update the deposit modal if the underlying asset is not CETES

`apps/web-app/src/features/vault/components/ui/VaultActionModal.tsx` has a **hard-coded** `CETES_CONTRACT` and fetches the user's balance of that specific asset. When you add a vault whose supply asset is not CETES:

1. Extend `VaultConfig.supplyAsset` (in `features/vault/types/vault.ts`) with a `contractAddress: string` field (currently missing), and populate it from DeFindex in `mapToVaultView.ts` using `asset.address`.
2. Replace the hard-coded `CETES_CONTRACT` in `VaultActionModal.tsx` with the active vault's `supplyAsset.contractAddress`.
3. Also update the success toast — today it says `"Successfully deposited ${amount} CETES"` inside `useVaultAction.ts`. Pass the symbol in or read it from `VaultView`.

Skipping this step will silently break balance display for non-CETES vaults.

### 5. Register new strategy APY sources (if the vault routes to new strategies)

`apps/web-app/src/app/api/vault/apy/route.ts` has per-strategy **address constants** (`NEKO_STRATEGY`, `AQUARIUS_STRATEGY`, `SOROSWAP_STRATEGY`) and per-strategy APY getters (`getNekoApy`, `getAquariusApy`, `getSoroswapApy`). The final `strategies` array is hand-built.

For each new strategy:

- Add an `ADDR_*` constant at the top with the strategy address.
- Add a `getXxxApy(): Promise<number | null>` helper. Return `null` when unavailable — the UI handles null cleanly (label: "—").
- Push it into the `strategies` array and include it in the `Promise.all([...])` fetch.
- The weighted vault APY only counts strategies with a known APY (`knownStrategies = strategies.filter(s => s.apy !== null)`) — `null` weights are skipped. This is intentional.

### 6. Register the strategy for the manager-signed invest route

`apps/web-app/src/app/api/vault/invest/route.ts`

- Add the strategy address to the top-level `STRATEGIES` array. `investIdle` splits idle funds **evenly** across all entries (remainder goes to the first).
- If the strategy needs a custom harvest (see `harvestAquarius`), add another helper and call it before `investIdle` in the `POST` handler.
- The route is rate-limited with a 5-minute cooldown (`COOLDOWN_MS`); Vercel cron is allowed through via the `x-vercel-cron: 1` header. Don't weaken either guard.

### 7. Verify

Minimal smoke test:

```bash
npm run lint
npm run build
```

Then, with a testnet vault id and `DEFINDEX_API_KEY` / `VAULT_MANAGER_SECRET_KEY` set in `apps/web-app/.env.local`:

```bash
npm run dev
# open http://localhost:3000/vaults — the new card should render
curl "http://localhost:3000/api/defindex/vaults" | jq
curl "http://localhost:3000/api/vault/apy?vault=C..." | jq
curl "http://localhost:3000/api/vault/invest?vault=C..." | jq
```

Expect two-card grid, non-"—" TVL once funds are deposited, and APY values matching the underlying strategies.

---

## Scenario B — Add a new strategy to an existing vault

This is simpler than A because the vault id, VaultView and deposit modal all stay the same.

1. **On-chain:** the strategy must already be registered on the DeFindex vault contract and allocated through `rebalance`. That's a Soroban concern — use the `stellar-dev` skill if authoring the contract. Nothing in the web-app can wire a strategy that the vault doesn't know about.
2. **APY source:** add a `getXxxApy()` in `app/api/vault/apy/route.ts` (see Scenario A step 5).
3. **Manager invest:** append the strategy address to `STRATEGIES` in `app/api/vault/invest/route.ts` (see A step 6). If no pre-invest action is needed, no helper is required.
4. **UI:** nothing to change — `VaultDetailModal` reads strategies from `info.assets[].strategies[]` via `mapToVaultView.ts`, so the new strategy shows up automatically.

---

## Scenario C — Change per-vault behavior that is currently global

Several things are globally shared and will hurt you if you add a second active vault without addressing them:

| Concern                                            | Where                                                 | What to do                                                                                                             |
| -------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `CETES_CONTRACT` hard-coded for balance            | `VaultActionModal.tsx`                                | Resolve via `supplyAsset.contractAddress` per vault                                                                    |
| `"Successfully deposited … CETES"`                 | `useVaultAction.ts`                                   | Pass in symbol or read `VaultView.supplyAsset.symbol`                                                                  |
| Strategy addresses as module-level consts          | `api/vault/apy/route.ts`, `api/vault/invest/route.ts` | Keyed-by-vault map, resolved from the `vault` query param                                                              |
| `STRATEGIES` even-split invest                     | `api/vault/invest/route.ts`                           | Read current allocations from `fetch_total_managed_funds` and rebalance toward target weights instead of uniform split |
| 5-minute cooldown shared by all vaults             | `api/vault/invest/route.ts`                           | Key `lastInvest` by `vaultId` (`Map<string, number>`)                                                                  |
| `CETES` assumed in `vaultHeaderIllustrationAssets` | `utils/vaultAssetArt.ts`                              | Generalize the paired-asset inference or pass the pair through `VaultView.detail`                                      |

Don't land a second mainnet vault without handling the first three rows at minimum.

---

## Patterns to keep consistent

**React Query.** Every hook sets `refetchOnWindowFocus: false`, tight `staleTime`/`gcTime`, `retry: false` or `1`, and `enabled` only when the contract id (and wallet, for balance) is present. Match these when adding hooks. The query keys currently used:

```
["defindex-vaults"]
["vaultData", contractId]
["vaultBalance", contractId, address]
["vault-apy", vaultContractId]
["vault-invest-status", vaultContractId]
["cetesBalance", address]  // inside VaultActionModal
```

Keep the same tuple shape (string literal first, then ids) so filtering works.

**Soroban client usage.** All read-only calls go through `{ simulate: true }` and **must** handle both `Ok/Err`-style results and raw values:

```ts
function unwrapResult<T>(result: unknown, fallback: T): T {
  if (result == null) return fallback;
  if (typeof (result as any).unwrap === "function") {
    try {
      return (result as any).unwrap() as T;
    } catch {
      return fallback;
    }
  }
  if ((result as any).tag === "ok") return (result as any).value as T;
  return result as T;
}
```

`useVaultData.ts` has the canonical copy — don't duplicate; import or inline with the same behavior.

**Deposit/withdraw signing.** `useVaultAction.ts` deliberately bypasses `assembledTx.signAndSend()` because it crashes on `.switch()` in some v14 builds. The pattern is: `simulate → toXDR() → signTransaction() via useWallet() → server.sendTransaction()`. Preserve it.

**Amount scaling.** The vault uses 7 decimals (`SCALAR_7 = 10_000_000`). Use `toSmallestUnit(amount, 7)` / `fromSmallestUnit(value, 7)` from `@/lib/helpers/tokenUtils` — don't multiply by `1e7` inline in new code.

**Price-per-share.** `pricePerShare = tvl * 1e12 / totalShares`. The `1e12` is a scaling factor to avoid integer-division loss; any userValue computation must divide by `ONE_SHARE = 1_000_000_000_000n` again.

**Network awareness.** `defindexNetworkFromEnv()` maps `PUBLIC → MAINNET`, `TESTNET/FUTURENET/LOCAL → TESTNET`. Treat any other value as unsupported and return `error: "unsupported_network"`.

---

## Environment variables

Required in `apps/web-app/.env.local`:

- `NEXT_PUBLIC_STELLAR_NETWORK` — `PUBLIC` or `TESTNET` (others yield "unsupported_network")
- `NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE`
- `NEXT_PUBLIC_STELLAR_RPC_URL`
- `NEXT_PUBLIC_STELLAR_HORIZON_URL`
- `DEFINDEX_API_KEY` — **server-only**, no `NEXT_PUBLIC_` prefix. Without it `/api/defindex/vaults` returns `error: "missing_defindex_api_key"` and the grid stays empty.
- `VAULT_MANAGER_SECRET_KEY` — **server-only** secret key of the vault manager. `/api/vault/invest` (POST) and `/api/vault/apy` (to simulate with a real account) both need it. If missing, invest returns `503 "Not configured"`.

Never expose the manager key or DeFindex key with a `NEXT_PUBLIC_` prefix — both are read only inside `app/api/...` server routes.

---

## Don'ts

- **Don't** fetch DeFindex directly from the client — the API key is server-only and the SDK assumes a Node environment.
- **Don't** re-hardcode `CETES_CONTRACT` or any strategy address inside hooks or components. If you find yourself about to, the fix belongs in `VaultConfig`/`VaultDetail` and is plumbed through `VaultView`.
- **Don't** remove the `x-vercel-cron` check or the `COOLDOWN_MS` gate on `/api/vault/invest` without a replacement — without them the route is a public "run manager actions" button.
- **Don't** assume `info.assets[0].symbol` equals the vault's display symbol — always go through `toVaultAsset()` and `normalizeVaultSymbol()` to strip padding.
- **Don't** call `client.signAndSend()` from the client — use the simulate + sign + `server.sendTransaction(...)` pattern from `useVaultAction`.
- **Don't** throw from React Query hooks' `queryFn` without setting `throwOnError: false` or a retry policy; the vault UI prefers stale data over error toasts on read paths.

---

## Quick reference: where to look first

| Symptom                         | Start here                                                                                                                 |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| "Empty grid, no vaults"         | `/api/defindex/vaults` response → `error` field → likely `missing_defindex_api_key` or `no_vault_ids`                      |
| "Card shows — for TVL"          | `useVaultData.ts` — contract call `fetch_total_managed_funds` + `total_supply`. Check it's being enabled (`!!contractId`). |
| "APY shows —"                   | `/api/vault/apy` — check `VAULT_MANAGER_SECRET_KEY` set, and each `getXxxApy` helper individually.                         |
| "Deposit does nothing"          | `useVaultAction.ts` + browser console. Usually wallet passphrase mismatch or slippage math.                                |
| "Invest cron never runs"        | Vercel `vercel.json` cron header + `x-vercel-cron: 1` check in `invest/route.ts`.                                          |
| "New symbol shows default icon" | `utils/vaultAssetArt.ts` — add entry + drop SVG into `public/assets/vault-assets/`.                                        |

When in doubt, read `features/vault/components/pages/Vault.tsx` — it's the orchestrator and shows exactly how the pieces are composed.

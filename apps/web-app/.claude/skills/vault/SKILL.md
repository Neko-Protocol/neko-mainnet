---
name: vault
description: Guide for adding new DeFindex vaults and yield-strategy integrations to the Neko DApp vault feature. Use this skill when the user asks to "add a vault", "register a new DeFindex vault", "integrate a new strategy" (Blend, Aquarius, SoroSwap, or another external strategy), wire up APY/keeper endpoints for a new vault, expose a new vault in the UI, or extend `apps/web-app/src/features/shared/vault/**`, `apps/web-app/src/lib/defindex/**`, `apps/backend/src/domains/investing/**`, or `packages/keeper/**`. Not for authoring Neko smart contracts (none are used here) or for generic TanStack Query questions (use `tanstack-query`).
user-invocable: true
argument-hint: "[new vault contract id or strategy name]"
---

# Vault Feature Integration Skill

Purpose: add a **new DeFindex vault** (or a **new strategy under an existing vault**) to Neko with correct wiring through generated bindings → backend domains → web hooks → UI, without breaking existing vaults.

This skill reflects the actual codebase layout. When something looks off, prefer reading the referenced file over guessing.

This skill is intentionally stored at `apps/web-app/.claude/skills/vault/SKILL.md` and linked from the root agent docs. Do not copy it into `.agents/skills/` unless the user explicitly asks for a new file. This repo does not use Neko-owned smart contracts; for Stellar RPC, wallet signing, or generated DeFindex/Reflector binding behavior, read `stellar-dev` as well.

---

## Mental model (read this first)

The vault feature is a **DeFindex integration**, not a bespoke contract. Everything the UI shows comes from one of:

1. **NestJS backend endpoints** reached by the web app through `apps/web-app/src/app/api/backend-proxy/[...path]/route.ts` and `backendClient`. The current public reads are `/v1/defindex/vaults`, `/v1/vault/apy?vault=...`, and `/v1/vault-pps/:vaultId`; the keeper trigger is `POST /v1/vault-invest/run-now`.
2. **DeFindex HTTP API** (via `@defindex/sdk`) catalog-style metadata. Called server-side from `apps/backend/src/domains/investing/defindex/defindex.service.ts` with `DEFINDEX_API_KEY`.
3. **DeFindex Vault Soroban contract** live on-chain numbers (TVL, shares, allocations, idle) and user actions (deposit/withdraw/rebalance/fees). Called via the generated typed client `new Client(...)` from `@neko/defindex-vault` (package is `packages/contracts/defindex-vault`).
4. **Per-strategy APY sources** each external strategy (Blend, Aquarius AMM, SoroSwap, DeFindex-provided data, or partner APIs) has its own APY source. These are aggregated in `apps/backend/src/domains/investing/vault-apy/vault-apy.service.ts`.

Two flows to keep straight:

- **User flow (client-signed):** `VaultActionModal` → `useVaultAction` → `DefindexVaultClient.deposit / withdraw` → user signs via Freighter / Stellar Wallets Kit → RPC. No manager key involved.
- **Manager flow (server-signed):** `VaultInvestService` → builds rebalance / fee txs and signs with `VAULT_MANAGER_SECRET_KEY`. The controller exposes only `POST /v1/vault-invest/run-now`; scheduled runs happen from `vault-invest.cron.ts`.

---

## File map (authoritative match these exactly when editing)

```
apps/web-app/src/
├── app/
│   ├── (app)/vaults/page.tsx                  # Next route → renders <Vault/>
│   └── api/backend-proxy/[...path]/route.ts   # Proxies /v1/* to NestJS backend
├── features/shared/vault/
│   ├── components/
│   │   ├── pages/Vault.tsx                    # Top-level page, orchestrates modals
│   │   ├── pages/VaultDetail.tsx              # Detail route page
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
│   │   ├── useDefindexVaults.ts               # GET /v1/defindex/vaults
│   │   ├── useVaultData.ts                    # on-chain TVL + shares + price/share
│   │   ├── useVaultBalance.ts                 # user dfToken balance
│   │   ├── useVaultAction.ts                  # deposit / withdraw (signs client-side)
│   │   ├── useVaultApy.ts                     # GET /v1/vault/apy
│   │   ├── useVaultInvest.ts                  # POST /v1/vault-invest/run-now
│   │   └── useVaultPpsHistory.ts              # GET /v1/vault-pps/:vaultId
│   ├── types/vault.ts                         # VaultConfig / VaultStats / VaultView etc.
│   └── utils/
│       ├── vault.ts                           # resolveAssetIcon
│       └── vaultAssetArt.ts                   # symbol → icon asset paths
└── lib/defindex/
    ├── mapToVaultView.ts                      # VaultInfoResponse → VaultView
    └── vaultIds.ts                            # Re-exports vault id helpers from @neko/keeper

apps/backend/src/domains/investing/
├── defindex/                                  # GET /v1/defindex/vaults
├── vault-apy/                                 # GET /v1/vault/apy
├── vault-invest/                              # POST /v1/vault-invest/run-now + cron
├── vault-pps/                                 # GET /v1/vault-pps/:vaultId
└── strategy-catalog/                          # Strategy/vault catalog helpers

packages/keeper/src/
├── assets/                                    # Asset and vault id config
└── defindex/                                  # DeFindex SDK/network/rebalance helpers
```

Contract client package: `@neko/defindex-vault` (aliased in `apps/web-app/package.json` to workspace package `packages/contracts/defindex-vault`). Import as:

```ts
import { Client as DefindexVaultClient } from "@neko/defindex-vault";
```

---

## Scenario A Add a new DeFindex vault (new contract id)

Do these in order. Keep each step scoped to the smallest existing file or package
surface that owns the behavior.

### 1. Register the vault id

`apps/web-app/src/lib/defindex/vaultIds.ts`

```ts
// Re-exported from @neko/keeper. Add the source id in:
// packages/keeper/src/defindex/vaultIds.ts
const MAINNET_VAULT_IDS = [
  "CB3FUMFGCF6DHSFK6N2TOKHRMYXS34HFKQR45UKVORCRUM35AF3ES7WQ", // EURC
  "C... new vault contract id here ...",
];
```

That's it for catalog visibility. `DefindexService.getVaults()` fetches configured ids in throttled batches, so one failing vault does not bring the page down. `resolveVaultIdForApi` uses the same keeper allow-list for `GET /v1/vault/apy?vault=...` and `POST /v1/vault-invest/run-now?vault=...`.

> If you need per-network ids, update `packages/keeper/src/defindex/vaultIds.ts` and `packages/keeper/src/defindex/network.ts` together. Do **not** read ids from `NEXT_PUBLIC_*` env vars; vault ids are server/app config, not user-facing settings.

### 2. Make sure icons exist for the supply/collateral symbols

`apps/web-app/src/features/shared/vault/utils/vaultAssetArt.ts`

- Default icon is `/assets/vault-assets/usdc.svg`.
- Unknown symbols render the default, which looks wrong for new assets.
- Add the new symbol to `VAULT_ASSET_ART` with an `iconSrc` + `iconWhiteSrc` pair and drop SVGs in `apps/web-app/public/assets/vault-assets/`.
- `resolveVaultArtKey` also supports substring fallbacks (e.g. anything containing `CETES` → `CETES`); add one if the on-chain symbol is padded or inconsistent.
- Remember `normalizeVaultSymbol` strips NUL bytes Stellar/Soroban symbols are often NUL-padded. Always normalize before lookup.

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

`apps/web-app/src/features/shared/vault/components/ui/VaultActionModal.tsx` may need changes when a vault uses a new supply asset. Verify the balance lookup and displayed symbol are derived from the active `VaultView`, not from a legacy CETES-only constant.

1. Check `VaultConfig.supplyAsset` in `features/shared/vault/types/vault.ts` and populate any missing contract/symbol data in `mapToVaultView.ts` from DeFindex `asset.address`.
2. Make sure `VaultActionModal.tsx` reads the active vault's supply asset for balances.
3. Check `useVaultAction.ts` success/error copy so it uses the vault's displayed symbol.

Skipping this step will silently break balance display for non-CETES vaults.

### 5. Register new strategy APY sources (if the vault routes to new strategies)

`apps/backend/src/domains/investing/vault-apy/vault-apy.service.ts` has per-strategy address constants and per-strategy APY getters. The final strategy breakdown is built there.

For each new strategy:

- Add a constant or keyed config entry with the strategy address.
- Add a `getXxxApy(): Promise<number | null>` helper. Return `null` when unavailable the UI handles null cleanly (label: "").
- Include it in the relevant APY path for that vault. Preserve `null` when unavailable; the UI handles missing per-strategy APY cleanly.

### 6. Register the strategy for the manager-signed invest route

`packages/keeper/src/defindex/rebalanceConfig.ts` and `apps/backend/src/domains/investing/vault-invest/vault-invest.service.ts`

- Add or update the vault's `VaultRebalanceConfig` with strategy addresses and `targetBps` values that sum to 10,000.
- `VaultInvestService` calls `planVaultRebalance`, sends the `rebalance` transaction, and collects fees. Keep the manual 5-minute cooldown and batch timeout budget intact.
- Scheduled keeper runs live in `vault-invest.cron.ts`; manual runs go through `POST /v1/vault-invest/run-now`.

### 7. Verify

Minimal smoke test:

```bash
npm run lint
npm run build
```

Then, with a vault id and `DEFINDEX_API_KEY` / `VAULT_MANAGER_SECRET_KEY` set for the backend:

```bash
npm run dev
# open http://localhost:3000/vaults  the new card should render
curl "http://localhost:3000/api/backend-proxy/v1/defindex/vaults" | jq
curl "http://localhost:3000/api/backend-proxy/v1/vault/apy?vault=C..." | jq
curl -X POST "http://localhost:3000/api/backend-proxy/v1/vault-invest/run-now?vault=C..." | jq
```

Expect the vault card/list item to render, non-empty TVL once funds are deposited, and APY values matching the underlying strategies.

---

## Scenario B Add a new strategy to an existing vault

This is simpler than A because the vault id, VaultView and deposit modal all stay the same.

1. **On-chain:** the strategy must already be registered on the external DeFindex vault contract and allocated through `rebalance`. This repo cannot author or deploy that contract; nothing in the web-app can wire a strategy that the vault doesn't know about.
2. **APY source:** add or update the relevant APY getter in `apps/backend/src/domains/investing/vault-apy/vault-apy.service.ts` (see Scenario A step 5).
3. **Manager invest:** update `packages/keeper/src/defindex/rebalanceConfig.ts` so the vault's target strategies and `targetBps` are correct (see A step 6).
4. **UI:** nothing to change `VaultDetailModal` reads strategies from `info.assets[].strategies[]` via `mapToVaultView.ts`, so the new strategy shows up automatically.

---

## Scenario C Change per-vault behavior that is currently global

Several things are globally shared and will hurt you if you add a second active vault without addressing them:

| Concern                                            | Where                                             | What to do                                                                        |
| -------------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------- |
| Balance asset assumptions                          | `VaultActionModal.tsx`                            | Resolve via the active vault's `supplyAsset` per vault                            |
| Deposit/withdraw copy                              | `useVaultAction.ts`                               | Pass in symbol or read `VaultView.supplyAsset.symbol`                             |
| Strategy APY constants                             | `vault-apy.service.ts`                            | Key by vault id or strategy config, resolved from the `vault` query param         |
| Rebalance targets                                  | `packages/keeper/src/defindex/rebalanceConfig.ts` | Use `targetBps` values that sum to 10,000 and reflect the desired allocations     |
| Manual keeper cooldown                             | `VaultInvestService`                              | Keep `lastInvest` keyed by `vaultId` (`Map<string, number>`)                      |
| `CETES` assumed in `vaultHeaderIllustrationAssets` | `utils/vaultAssetArt.ts`                          | Generalize the paired-asset inference or pass the pair through `VaultView.detail` |

Don't land a second mainnet vault without handling the first three rows at minimum.

---

## Patterns to keep consistent

**React Query.** Every hook sets `refetchOnWindowFocus: false`, tight `staleTime`/`gcTime`, `retry: false` or `1`, and `enabled` only when the contract id (and wallet, for balance) is present. Match these when adding hooks. The query keys currently used:

```
["defindex-vaults"]
["vaultData", contractId]
["vaultBalance", contractId, address]
["vault-apy", vaultId]
["vault-invest-status", vaultContractId]
["vault-pps-history", vaultId]
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

`useVaultData.ts` has the canonical copy don't duplicate; import or inline with the same behavior.

**Deposit/withdraw signing.** `useVaultAction.ts` deliberately bypasses `assembledTx.signAndSend()` because it crashes on `.switch()` in some v14 builds. The pattern is: `simulate → toXDR() → signTransaction() via useWallet() → server.sendTransaction()`. Preserve it.

**Amount scaling.** The vault uses 7 decimals (`SCALAR_7 = 10_000_000`). Use `toSmallestUnit(amount, 7)` / `fromSmallestUnit(value, 7)` from `@/lib/helpers/tokenUtils` don't multiply by `1e7` inline in new code.

**Price-per-share.** `pricePerShare = tvl * 1e12 / totalShares`. The `1e12` is a scaling factor to avoid integer-division loss; any userValue computation must divide by `ONE_SHARE = 1_000_000_000_000n` again.

**Network awareness.** `defindexNetworkFromString()` maps `PUBLIC`/`MAINNET` to `MAINNET`, and `TESTNET`/`FUTURENET`/`LOCAL` to `TESTNET`. Treat any other value as unsupported and return `error: "unsupported_network"`.

---

## Environment variables

Required for the web app in `apps/web-app/.env.local`:

- `NEXT_PUBLIC_STELLAR_NETWORK` `PUBLIC`, `MAINNET`, or `TESTNET` (others may yield "unsupported_network" from backend mapping)
- `NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE`
- `NEXT_PUBLIC_STELLAR_RPC_URL`
- `NEXT_PUBLIC_STELLAR_HORIZON_URL`
- `BACKEND_INTERNAL_URL`
- `BACKEND_INTERNAL_KEY`

Required for the backend:

- `STELLAR_NETWORK`
- `STELLAR_RPC_URL`
- `STELLAR_NETWORK_PASSPHRASE`
- `DEFINDEX_API_KEY` **server-only**, no `NEXT_PUBLIC_` prefix. Without it `/v1/defindex/vaults` returns `error: "missing_defindex_api_key"` and the grid stays empty.
- `VAULT_MANAGER_SECRET_KEY` **server-only** secret key of the vault manager. Keeper runs use it for `POST /v1/vault-invest/run-now` and scheduled cron execution.

Never expose the manager key or DeFindex key with a `NEXT_PUBLIC_` prefix; both belong only in backend/server environments.

---

## Don'ts

- **Don't** fetch DeFindex directly from the client the API key is server-only and the SDK assumes a Node environment.
- **Don't** re-hardcode `CETES_CONTRACT` or any strategy address inside hooks or components. If you find yourself about to, the fix belongs in `VaultConfig`/`VaultDetail` and is plumbed through `VaultView`.
- **Don't** weaken the `COOLDOWN_MS` gate, throttling, or internal backend proxy protection around `POST /v1/vault-invest/run-now`; without them the route becomes a public "run manager actions" button.
- **Don't** assume `info.assets[0].symbol` equals the vault's display symbol always go through `toVaultAsset()` and `normalizeVaultSymbol()` to strip padding.
- **Don't** call `client.signAndSend()` from the client use the simulate + sign + `server.sendTransaction(...)` pattern from `useVaultAction`.
- **Don't** throw from React Query hooks' `queryFn` without setting `throwOnError: false` or a retry policy; the vault UI prefers stale data over error toasts on read paths.

---

## Quick reference: where to look first

| Symptom                         | Start here                                                                                                               |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| "Empty grid, no vaults"         | `/v1/defindex/vaults` response → `error` field → likely `missing_defindex_api_key` or `no_vault_ids`                     |
| "Card shows for TVL"            | `useVaultData.ts` contract call `fetch_total_managed_funds` + `total_supply`. Check it's being enabled (`!!contractId`). |
| "APY shows "                    | `/v1/vault/apy` response and each `getXxxApy` helper in `vault-apy.service.ts`.                                          |
| "Deposit does nothing"          | `useVaultAction.ts` + browser console. Usually wallet passphrase mismatch or slippage math.                              |
| "Invest cron never runs"        | Backend `vault-invest.cron.ts`, `VaultInvestService`, and backend scheduler/logs.                                        |
| "New symbol shows default icon" | `utils/vaultAssetArt.ts` add entry + drop SVG into `public/assets/vault-assets/`.                                        |

When in doubt, read `features/shared/vault/components/pages/Vault.tsx` it's the orchestrator and shows exactly how the pieces are composed.

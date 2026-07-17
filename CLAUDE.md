# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Neko DApp is an RWA aggregator (capital routing layer) application that aggregates external protocols and services: DeFindex vaults, Reflector oracle data, Blend/SoroSwap/Aquarius market integrations, Soroswap swaps, wallet flows, admin operations, and on/off-ramp flows. It is a **Turborepo + npm workspaces monorepo** with three apps and shared packages.

**Neko-owned smart contracts are not used in this repo.** The only generated Soroban bindings consumed here are external integrations: `@neko/defindex-vault` and `@neko/reflector`.

## Monorepo Structure

```
apps/
  web-app/        # Public dApp — Next.js 16 + React 19 + Turbopack (App Router)
  admin/          # Internal admin console — Next.js 16 (auth, strategies, users, campaigns, 2FA)
  backend/        # API server — NestJS 10 (port 4000), Supabase-backed
packages/
  config/         # Shared ESLint, PostCSS, Tailwind 4 preset, tsconfig
  api-contracts/  # Shared DTOs/types for web/admin/backend API contracts
  keeper/         # Vault keeper, asset config, pricing, DeFindex helpers
  orchestrator/   # External market orchestration across Blend, SoroSwap, Aquarius
  stellar-wallet/ # Freighter + Stellar Wallets Kit Zustand integration
  contracts/      # Auto-generated TS bindings for external deployed contracts only
    reflector/    # @neko/reflector (SEP-40 oracle)
    defindex-vault/ # @neko/defindex-vault
```

Workspaces declared in root `package.json`: `apps/*`, `packages/*`, `packages/contracts/*`.

## Commands

### Root (Turbo)

```bash
npm run dev              # turbo run dev — starts all apps in watch mode
npm run build            # turbo run build — builds all packages and apps in topological order
npm run start            # turbo run start — serves built apps
npm run lint             # turbo run lint
npm run format           # Prettier write across TS/JS/JSON/CSS/YAML
npm run format:check     # Prettier verify (no writes)
```

### Web app (`apps/web-app/`)

```bash
npm run dev              # next dev --turbopack — http://localhost:3000
npm run build            # next build --turbopack
npm run start            # next start
npm run lint             # eslint
```

### Backend (`apps/backend/`)

NestJS — `npm run dev`, `npm run build`, `npm run test`. Listens on port 4000 with URI versioning under `/v1` and Swagger at `/docs`.

### Admin (`apps/admin/`)

Standard Next.js — `npm run dev`, `npm run build`, `npm run start`.

## Architecture

### Web app (`apps/web-app/src/`)

```
app/                  # Next.js App Router
  (app)/(basic)/      # Routes for "basic" UI mode
  (app)/(expert)/     # Routes for "expert" UI mode
  api/                # backend-proxy/[...path] route forwarding to NestJS
  auth/               # Auth routes
components/           # Global UI: navigation, ui-mode modal, wallet sync, etc.
features/             # Feature modules (see below)
hooks/                # 8 shared hooks (useFxRate, useNavItems, useStellarWallet, useToast, useTokenBalance, useTokenPrice, useWallet, useWalletType) — module-specific hooks live inside features/
lib/                  # Services, helpers, constants, orchestrator, price utils
providers/            # ToastProvider, WalletProvider, and app-level query/toast wiring
stores/               # 3 cross-cutting Zustand stores; module-owned stores are colocated in features/ (see below)
```

**Feature modules (`src/features/`):**

- `basic/` — Buy flow for fiat-first users. Submodules: `cart/`, `dashboard/`, `discover/`. Uses `react-hook-form` + `zod`.
- `expert/` — Advanced trading. Submodules: `dashboard/`, `discover/`, `swap/` (SoroSwap-backed).
- `shared/` — External protocol and product integrations consumed by both modes. Submodules: `currency`, `dashboard`, `discover`, `lending`, `on-off-ramps`, `pools`, `positions`, `referral`, `settings`, `swap-engine`, `ui-mode`, `vault`, `wallet`, and `yields`. Treat lending/pool/vault UI as integrations with external protocols, not Neko-owned contracts. Admin functionality lives entirely in the separate `apps/admin` app, not here.
- `simulator/strategies/` — Investment projection wizard (token → strategy → destination → projected returns). Nested one level under `simulator/`.

Every feature submodule follows the same colocated layout — see the `feature-module-conventions` skill for the pattern and where new code should go.

**Stores (Zustand):**

Root `src/stores/` — cross-cutting state only:

- `currency.store.ts` — selected fiat
- `fx-rate.store.ts` — FX conversion rates
- `stellarWalletStore.ts` — connected Stellar wallet metadata

Module-owned stores are colocated inside their feature (`features/<module>/stores/`), not in `src/stores/`:

- `features/basic/cart/stores/cart.store.ts` — shopping cart for basic-mode buys
- `features/shared/wallet/stores/pendingMultisigTxs.store.ts` — Lobstr Vault pending transaction state
- `features/shared/referral/stores/referral.store.ts` — captured referral code/session state
- `features/simulator/strategies/stores/strategies.store.ts` — saved investment strategies
- `features/shared/ui-mode/stores/ui-mode.store.ts` — basic/expert mode toggle

**Providers (`src/providers/`):**

- `ToastProvider.tsx` — toast notifications
- `WalletProvider.tsx` — wallet context wiring
- Wallet connection state is centralized in `@neko/stellar-wallet` and consumed through hooks/stores; do not add a second wallet state layer.

### Data flow

```
Feature components → feature hooks → `backendClient` or local services → Next backend proxy → NestJS `/v1` API → external APIs, Supabase, Stellar RPC/Horizon, and generated DeFindex/Reflector bindings
```

`lib/services/` contains client/server helpers such as `backend-client.ts`, `audit.service.ts`, `fx-rate.service.ts`, `stellar-price.service.ts`, `transaction.api.ts`, `supabase.server.ts`, and `users.service.ts`. Position-scanning helpers (`horizonActivityScanner.ts`, `positionScanner.ts`) are colocated in `features/shared/positions/services/`, not here.

### State and server data

- **Global state**: Zustand
- **Server state**: TanStack Query v5
- **DB / auth**: Supabase (audit logs, user metadata)

### Testing

- `packages/keeper` and `packages/orchestrator` use **Vitest** (`vitest.config.ts` + `test/`).
- `apps/backend` uses **Jest** (unit + e2e) with path aliases `@core`, `@domains`, `@common`, `@shared`, `@config` (see `apps/backend/package.json`).
- `apps/web-app` and `apps/admin` currently have **no test suite** — don't assume tests exist for frontend code.

### Admin app (`apps/admin/`)

Next.js 16 internal console. Routes under `app/dashboard/` include `activity`, `strategies`, `users`, `campaigns`, `recommended`, `activations`, `referrals`, and `invitations`. Auth uses Supabase-backed admin sessions plus TOTP 2FA (`otpauth`, `qrcode`). Server helpers call the NestJS backend via `BACKEND_INTERNAL_URL`/`BACKEND_INTERNAL_KEY`. `middleware.ts` enforces auth.

### Backend infrastructure (`apps/backend/`)

NestJS 10 + Express adapter. Bootstraps in `src/main.ts` on port 4000 with CORS, URI versioning (`/v1`), Swagger (`/docs`), Helmet, compression, global validation, global exception filtering, request IDs, throttling, pino logging, shutdown hooks, and a Node WebSocket polyfill for Supabase realtime compatibility.

The backend is an internal API. `AppModule` installs two global guards: `ThrottlerGuard` and `InternalApiKeyGuard`. Browser clients should not call Railway/backend directly; `apps/web-app/src/app/api/backend-proxy/[...path]/route.ts` forwards `/v1/*` requests with `BACKEND_INTERNAL_KEY`, and `apps/admin` server helpers call `BACKEND_INTERNAL_URL` with the same internal key.

Core infrastructure lives under `src/core/`:

- `stellar/` — Stellar RPC/Horizon helpers and network/passphrase access.
- `supabase/` — Supabase service clients for platform/admin data.
- `orchestrator/` — External market orchestration service wrapper, not a Neko contract layer.
- `email/` — Resend-backed email helpers.
- `health/` — health checks.

Business domains live under `src/domains/`:

- `chain/transaction` — transaction prepare/submit/status relay endpoints.
- `market-data/` — asset prices, pool rates, Etherfuse yields, and contract/activity scanners.
- `investing/` — DeFindex vault catalog, APY, PPS history, keeper/rebalance jobs, strategy catalog, and recommended strategies.
- `platform/` — users, audit logs, dashboard aggregation, referrals, and activations.
- `admin/` — admin auth/dashboard, campaigns, invitations, segments, strategies, and console workflows.

Two more top-level `src/` dirs exist beyond `core/`/`domains/`:

- `common/` — cross-app decorators, filters, guards, middleware (`skip-auth`, `all-exceptions.filter`, `internal-api-key.guard`, `request-id.middleware`).
- `config/` — environment validation (`env.validation.ts`).
- `shared/` — **not the same thing as `core/`**. `shared/stellar/` holds allowlist/error helpers and `payment-xdr.ts`, distinct from `core/stellar/`'s RPC/Horizon client. When touching Stellar backend code, check both directories before assuming there's only one.

Scheduled jobs are backend-owned through `@nestjs/schedule` (for example vault invest, vault PPS, pool rates, and asset prices). Do not add cron-only behavior back into web-app route handlers.

### External contract bindings

This repo consumes only these generated Soroban bindings:

| Package                | Role                                       |
| ---------------------- | ------------------------------------------ |
| `@neko/defindex-vault` | Generated DeFindex vault bindings          |
| `@neko/reflector`      | Generated SEP-40 Reflector oracle bindings |

Other `@neko/*` packages are application libraries, not Neko smart contracts:

- `@neko/orchestrator` — external market orchestration for Blend, SoroSwap, Aquarius, and Stellar RPC.
- `@neko/keeper` — vault keeper configuration, asset registry, DeFindex helpers, price services, and rebalance planning.
- `@neko/stellar-wallet` — Freighter/Stellar Wallets Kit connection and signing state.
- `@neko/api-contracts` — shared API DTOs.

Web-app reads network config from `apps/web-app/src/lib/config/stellar.config.ts`, Reflector constants from `apps/web-app/src/lib/constants/contracts.ts`, and vault IDs from `apps/web-app/src/features/shared/vault/utils/vaultIds.ts` (re-exported from `@neko/keeper`).

Each `packages/contracts/<name>/src/index.ts` is generated via `soroban contract bindings ts` and built with `tsc` into `dist/`. **Do not hand-edit these files**. If DeFindex or Reflector bindings drift, regenerate them from the external artifact/source for that integration.

### Multi-chain note

The dApp is **Stellar-only** at the app layer and uses generated bindings only for DeFindex vaults and Reflector oracle reads. There are no Neko-owned smart contracts, EVM contracts, viem, wagmi, or RainbowKit dependencies in this monorepo. SoroSwap and Blend SDKs are external integrations.

## Environment Setup

### Web app — `apps/web-app/.env.local`

See `apps/web-app/.env.example`. Key variables:

```env
NEXT_PUBLIC_STELLAR_NETWORK=
NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE=
NEXT_PUBLIC_STELLAR_RPC_URL=
NEXT_PUBLIC_STELLAR_HORIZON_URL=
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_NEKO_TREASURY_ADDRESS=

# Integrations
NEXT_PUBLIC_SOROSWAP_API_KEY=
DEFINDEX_API_KEY=
ETHERFUSE_API_KEY=
ETHERFUSE_BASE_URL=
ALFREDPAY_API_KEY=
ALFREDPAY_API_SECRET=
ALFREDPAY_BASE_URL=
ALFREDPAY_WEBHOOK_SECRET=

# Supabase (audit logs, users)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Backend proxy
BACKEND_INTERNAL_URL=
BACKEND_INTERNAL_KEY=
NEXT_PUBLIC_USE_BACKEND_DASHBOARD=
```

### Backend — `apps/backend/.env`

Supabase URL + service role key (see `.env.example`).

### Admin — `apps/admin/.env.local`

Supabase + Resend (email). See `.env.example`.

## Brand & Design System

Neko's visual identity (color tokens, typography, logo/asset inventory, and known cross-app inconsistencies) is documented in [BRAND.md](BRAND.md). Use the `neko-brand` skill when generating or reviewing UI — don't invent colors/fonts outside the documented `neko-*`/`wallet-*` tokens.

## Vercel deployment

`vercel.json` builds only `web-app` via `turbo run build --filter=web-app`. Scheduled jobs are owned by the backend (for example vault invest, pool rates, and asset prices), not Next.js route handlers in `apps/web-app`.

## Prerequisites

- Node.js v20+, npm v11.6.2 (root `packageManager`)
- Optional: Stellar CLI for regenerating DeFindex/Reflector bindings from external artifacts (not needed for normal dApp work)

## Code Style

- Prettier: double quotes, semicolons, 2-space indent, 80 char width, es5 trailing commas
- ESLint via shared config in `packages/config/eslint.config.mjs`
- Tailwind 4 via shared preset in `packages/config/tailwind.config.ts`
- `apps/web-app` intentionally has both `@mui/material`/`@emotion/*` and Tailwind 4 in play — this is not an in-progress migration to "clean up" into one or the other
- Husky pre-commit hooks (`npm run prepare`)
- Conventional commits: `feat`, `fix`, `chore`, `refactor`, `docs`, `test`

## Recommended MCP servers

Configured project-wide in `.mcp.json`: `mintlify` (docs) and `context7` (up-to-date library docs for Next.js/NestJS/Tailwind — public endpoint, no auth needed).

Evaluate and add locally (need a personal credential, intentionally not committed):

- **GitHub MCP** (`github/github-mcp-server`) — repo-wide issue/PR/code search beyond one-off `gh` calls.
- **Supabase MCP** — direct table/migration/log access for `apps/admin` + `apps/backend`'s Supabase usage. Needs a personal project ref + access token.
- **Figma Dev Mode MCP server** — if design work happens in Figma, lets an agent read variables/components as source of truth. Runs locally via the Figma desktop app.
- **stellar-mcp** (community, `syronlabs/stellar-mcp`) — optional Horizon/Soroban query tool; the `stellar-dev` skill + Stellar CLI already cover most of this, so evaluate before adopting.

## Skills (project-versioned, in `.agents/skills/`)

Surfaced to Claude Code via the `.claude/skills` symlink:

- **stellar-dev** — Stellar / Soroban / Horizon playbook (PREFERRED over the generic `blockchain-developer` subagent for any Stellar work)
- **neko-brand** — Neko color/typography/logo tokens; use for any new or reviewed UI
- **feature-module-conventions** — the colocated `components/hooks/stores/services/types/utils` + barrel `index.ts` pattern used across `src/features/**`
- **tanstack-query** — React Query v5 patterns and v4→v5 migration
- **tailwind-patterns** — Production-ready Tailwind component recipes
- **next-best-practices** — Next.js App Router conventions (RSC, metadata, route handlers)
- **vercel-react-best-practices** — React/Next.js performance patterns from Vercel
- **vercel-composition-patterns** — Composition patterns, React 19 APIs
- **web-design-guidelines** — UI/accessibility review checklist
- **seo-audit** — On-page SEO audit
- **vault** (`apps/web-app/.claude/skills/vault/SKILL.md`) — DeFindex vault onboarding and strategy integration
- **remotion-best-practices** — Video generation with Remotion
- **commit-work** — Conventional commit drafting
- **agent-md-refactor** — Split bloated CLAUDE.md / AGENTS.md
- **find-skills** — Discover and install skills
- **skill-creator** — Author new skills

## Agent routing rules

This repo has three overlapping sources of automation:

- **Local project skills** in `.agents/skills/` (versioned, surfaced via `.claude/skills` symlink) — Neko-specific
- **Cherry-picked subagents** in `.agents/agents/` (versioned, surfaced via `.claude/agents` symlink) — curated selection for this stack
- **gstack** at `~/.claude/skills/gstack/` (global, per-developer install) — generic role/ceremony skills shared across all projects

### Team setup (one-time, per developer)

```bash
git clone https://github.com/garrytan/gstack ~/.claude/skills/gstack
# Optional: /plugin install superpowers@claude-plugins-official (from inside Claude Code)
```

### Precedence when multiple skills/agents could trigger

**Domain-specific (use project skill, not the generic subagent):**

- Stellar / Soroban / Horizon app integration work → `stellar-dev` skill, NOT `blockchain-developer` subagent
- React Query / TanStack Query → `tanstack-query` skill, NOT `react-specialist`
- Client data fetching in this repo should stay on TanStack Query; treat generic SWR guidance in other skills as non-authoritative unless the stack changes.
- Tailwind component patterns → `tailwind-patterns` skill, NOT `ui-designer`
- Neko brand/visual identity (colors, typography, logos) → `neko-brand` skill, NOT `ui-designer`
- New feature-module code (where to put components/hooks/stores/services) → `feature-module-conventions` skill first
- Next.js conventions (RSC, metadata, route handlers) → `next-best-practices` skill BEFORE `nextjs-developer`
- React performance / composition → `vercel-react-best-practices` + `vercel-composition-patterns` BEFORE `react-specialist`

**Ceremonies (use gstack slash commands):**

- Sprint planning → `/plan-ceo-review`, `/plan-eng-review`
- Design pass → `/design-consultation`, `/design-shotgun`
- Security audit of DeFindex/Reflector integration or signing flows → `/cso` AND `security-auditor` subagent
- QA / dogfooding → `/qa` plus the relevant app/package test, lint, or build command
- Release → `/ship`, `/land-and-deploy`

**Backend (`apps/backend/` + `apps/admin/` API routes + Supabase):**

- NestJS-specific work → use the global `nestjs*` skills (`nestjs`, `nestjs-best-practices`, `nestjs-clean-typescript`, `nestjs-expert`, `nestjs-testing-expert`) BEFORE `backend-developer`
- Generic backend / API design → `backend-developer`
- Cross-cutting TypeScript (any app) → `typescript-pro`
- Supabase / Postgres queries, RLS, schema → `postgres-pro`

**Fall back to VoltAgent subagents only when no project skill covers it:**

- `rust-engineer` — not relevant for this repo unless the user explicitly opens a separate Rust project
- `blockchain-developer` — only if introducing a new chain (not currently used)
- `fintech-engineer` — DeFi math, vault APY, and external market-model questions
- `code-reviewer`, `test-automator`, `debugger` — isolated quality work
- `agent-organizer` — orchestrate multiple subagents without polluting the main context

**Methodology layer (superpowers, auto-triggered):**

Discovery / brainstorming / TDD red-green-refactor / worktree-based parallel work are owned by superpowers skills — they activate by context, no manual invocation needed.

## Preferences

- Do not add Co-Authored-By signature in commits
- Use conventional commits: feat, fix, chore, refactor, docs, test, etc.

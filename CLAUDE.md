# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Neko DApp is a DeFi protocol built on the **Stellar/Soroban** network. It offers liquidity pools, lending, borrowing, vault strategies, and an on/off-ramp flow oriented at both crypto-native users ("expert" mode) and fiat-first users ("basic" mode). The repo is a **Turborepo + npm workspaces monorepo** with three apps and shared packages.

**The Soroban smart contracts are NOT in this repo.** They are deployed on-chain (testnet and mainnet) and consumed here through auto-generated TypeScript bindings under `packages/contracts/*`. Authoring or deploying contracts happens in a separate repository.

## Monorepo Structure

```
apps/
  web-app/        # Public dApp — Next.js 16 + React 19 + Turbopack (App Router)
  admin/          # Internal admin console — Next.js 16 (auth, strategies, users, campaigns, 2FA)
  backend/        # API server — NestJS 10 (port 4000), Supabase-backed
packages/
  config/         # Shared ESLint, PostCSS, Tailwind 4 preset, tsconfig
  contracts/      # Auto-generated TS bindings for deployed Soroban contracts
    lending/      # @neko/lending
    backstop/     # @neko/backstop
    reflector/    # @neko/reflector (SEP-40 oracle)
    defindex-vault/ # @neko/defindex-vault
scripts/          # One-off vault onboarding scripts (.mjs)
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

Standard NestJS — `npm run start:dev`, `npm run build`, `npm run test`. Listens on port 4000 with CORS enabled.

### Admin (`apps/admin/`)

Standard Next.js — `npm run dev`, `npm run build`, `npm run start`.

### Vault onboarding scripts (`scripts/`)

Run with `node scripts/<name>.mjs`. Available: `create-eurc-vault`, `create-tesouro-vault`, `create-usdc-vault`, `invest-eurc`, `invest-tesouro`, `invest-usdc`.

## Architecture

### Web app (`apps/web-app/src/`)

```
app/                  # Next.js App Router
  (app)/(basic)/      # Routes for "basic" UI mode
  (app)/(expert)/     # Routes for "expert" UI mode
  api/                # Route handlers: anchor, asset-prices, audit, defindex, etherfuse,
                      #   faucet, pool-activity, pool-rates, soroban-rpc, soroswap, users, vault
  auth/               # Auth routes
components/           # Global UI: navigation, ui-mode modal, wallet sync, etc.
features/             # Feature modules (see below)
hooks/                # 16 custom hooks (useBalances, useStellarWallet, useToast, useUIMode, …)
lib/                  # Services, helpers, constants, orchestrator, defindex helpers, anchors
providers/            # WalletProvider (Stellar), ToastProvider
stores/               # Zustand stores
```

**Feature modules (`src/features/`):**

- `basic/` — Buy flow for fiat-first users. `BasicDiscoverPage`, `BasicAssetDetail`, `BasicBuyForm`, `AddToCartModal`. Uses `react-hook-form` + `zod`.
- `expert/` — Advanced trading. `Dashboard`, `ExpertDiscoverPage`, `ExpertAssetDetail`, `Swap` (SoroSwap-backed).
- `shared/` — Protocol integrations consumed by both modes. Submodules: `admin`, `backstop`, `borrowing`, `dashboard`, `discover`, `lending`, `on-off-ramps`, `pools`, `settings`, `vault`, `wallet`. Each has `components/`, `hooks/`, `types/`, `utils/`.
- `simulator/` — Investment projection wizard (token → strategy → destination → projected returns).

**Stores (Zustand, `src/stores/`):**

- `cart.store.ts` — shopping cart for basic-mode buys
- `currency.store.ts` — selected fiat
- `fx-rate.store.ts` — FX conversion rates
- `strategies.store.ts` — saved investment strategies
- `stellarWalletStore.ts` — connected Stellar wallet metadata
- `ui-mode.store.ts` — basic/expert mode toggle

**Providers (`src/providers/`):**

- `WalletProvider.tsx` — Stellar wallet connection via `@creit.tech/stellar-wallets-kit` + Freighter
- `ToastProvider.tsx` — toast notifications

### Data flow

```
Feature components → feature hooks → lib/services + lib/orchestrator → @neko/* contract clients → Soroban RPC
```

`lib/services/` contains `audit.service.ts`, `fx-rate.service.ts`, `horizonActivityScanner.ts`, `lending.service.ts`, `positionScanner.ts`, `stellar-price.service.ts`, `supabase.server.ts`, `users.service.ts`.

### State and server data

- **Global state**: Zustand
- **Server state**: TanStack Query v5
- **DB / auth**: Supabase (audit logs, user metadata)

### Admin app (`apps/admin/`)

Next.js 16 internal console. Routes under `app/dashboard/`: `activity`, `strategies` (+ `[id]`), `users`, `campaigns` (+ `[id]`), `invitations`. Auth via Supabase with TOTP 2FA (`otpauth`, `qrcode`). API routes proxy to the NestJS backend. `middleware.ts` enforces auth.

### Backend app (`apps/backend/`)

NestJS 10 + Express adapter. Bootstraps in `src/main.ts` on port 4000 with CORS. Current modules under `src/modules/`: `health`, `supabase`. Configured via `@nestjs/config` and `ConfigModule`.

### Smart contract integration

Each `@neko/*` package wraps one deployed Soroban contract:

| Package                | Contract                          | Mainnet address (web-app constants)                                                                                                      |
| ---------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `@neko/lending`        | Lending pool                      | `CAPTJPAXEURYXEWGDSCCU3SZDYIP3U7KTS7VQM2EYLLK2JKIR4JIVWIH` (pool 1), `CD3HUT3N6LLUS4XZUWRIIJZUKN2B3UDDMEH2IMK6S3UKAHTZ6VKKBTYQ` (pool 2) |
| `@neko/backstop`       | Backstop / risk buffer            | `CCSNXCONDIFZADRJZZRHMRXDGTC6EMI7ZAYAJPJMXSDHBMOPBLBX5XQX` (pool 1), `CADKADCLXIZTU7Q3WS5M37HUF5BX3WCSTCM2ESN2JCJK5FBBH57FKSAV` (pool 2) |
| `@neko/reflector`      | SEP-40 oracle                     | `CALI2BYU2JE6WVRUFYTS6MSBNEHGJ35P4AVCZYF3B6QOE3QKOB2PLE6M`                                                                               |
| `@neko/defindex-vault` | Vault strategy manager (DeFindex) | Testnet: `CBHGX6TCHHVYJ7P3UZS7WI5TRAAA7GQA2L2Y7P2LCPIXWWD5FKDF2Z5S`                                                                      |

Web-app reads addresses from `apps/web-app/src/lib/constants/contracts.ts` (mainnet) and `lib/constants/lendingContracts.ts` (network-aware). Stellar network config lives in `lib/config/stellar.config.ts`.

Each `packages/contracts/<name>/src/index.ts` is generated via `soroban contract bindings ts` and built with `tsc` into `dist/`. **Do not hand-edit these files** — regenerate from the upstream contracts repo.

### Multi-chain note

The dApp is **Stellar/Soroban only**. There are no EVM contracts, viem, wagmi, or RainbowKit dependencies in this monorepo today. SoroSwap and Blend Capital SDKs are used for DEX and lending integrations on Stellar.

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
SOROSWAP_API_KEY=
DEFINDEX_API_KEY=
ETHERFUSE_API_KEY=
ALFREDPAY_API_KEY=
ALFREDPAY_SECRET=

# Supabase (audit logs, users)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

### Backend — `apps/backend/.env`

Supabase URL + service role key (see `.env.example`).

### Admin — `apps/admin/.env.local`

Supabase + Resend (email). See `.env.example`.

## Vercel deployment

`vercel.json` builds only `web-app` via `turbo run build --filter=web-app`. Defines cron jobs:

- `/api/vault/invest` — daily at 02:00 UTC
- `/api/pool-rates/record` — hourly
- `/api/asset-prices/record` — daily at 02:00 UTC

## Prerequisites

- Node.js v20+ (engines hint), npm v10+
- Optional: Stellar CLI for regenerating contract bindings in a sibling contracts repo (not needed for normal dApp work)

## Code Style

- Prettier: double quotes, semicolons, 2-space indent, 80 char width, es5 trailing commas
- ESLint via shared config in `packages/config/eslint.config.mjs`
- Tailwind 4 via shared preset in `packages/config/tailwind.config.ts`
- Husky pre-commit hooks (`npm run prepare`)
- Conventional commits: `feat`, `fix`, `chore`, `refactor`, `docs`, `test`

## Skills (project-versioned, in `.agents/skills/`)

Surfaced to Claude Code via the `.claude/skills` symlink:

- **stellar-dev** — Stellar / Soroban / Horizon playbook (PREFERRED over the generic `blockchain-developer` subagent for any Stellar work)
- **tanstack-query** — React Query v5 patterns and v4→v5 migration
- **tailwind-patterns** — Production-ready Tailwind component recipes
- **next-best-practices** — Next.js App Router conventions (RSC, metadata, route handlers)
- **vercel-react-best-practices** — React/Next.js performance patterns from Vercel
- **vercel-composition-patterns** — Composition patterns, React 19 APIs
- **web-design-guidelines** — UI/accessibility review checklist
- **seo-audit** — On-page SEO audit
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

- Stellar / Soroban / Horizon work → `stellar-dev` skill, NOT `blockchain-developer` subagent
- React Query / TanStack Query → `tanstack-query` skill, NOT `react-specialist`
- Tailwind component patterns → `tailwind-patterns` skill, NOT `ui-designer`
- Next.js conventions (RSC, metadata, route handlers) → `next-best-practices` skill BEFORE `nextjs-developer`
- React performance / composition → `vercel-react-best-practices` + `vercel-composition-patterns` BEFORE `react-specialist`

**Ceremonies (use gstack slash commands):**

- Sprint planning → `/plan-ceo-review`, `/plan-eng-review`
- Design pass → `/design-consultation`, `/design-shotgun`
- Security audit of contract integrations → `/cso` AND `security-auditor` subagent
- QA / dogfooding → `/qa` + project `verify` skill
- Release → `/ship`, `/land-and-deploy`

**Backend (`apps/backend/` + `apps/admin/` API routes + Supabase):**

- NestJS-specific work → use the global `nestjs*` skills (`nestjs`, `nestjs-best-practices`, `nestjs-clean-typescript`, `nestjs-expert`, `nestjs-testing-expert`) BEFORE `backend-developer`
- Generic backend / API design → `backend-developer`
- Cross-cutting TypeScript (any app) → `typescript-pro`
- Supabase / Postgres queries, RLS, schema → `postgres-pro`

**Fall back to VoltAgent subagents only when no project skill covers it:**

- `rust-engineer` — only relevant if you open a sibling contracts repo
- `blockchain-developer` — only if introducing a new chain (not currently used)
- `fintech-engineer` — DeFi math / lending model questions
- `code-reviewer`, `test-automator`, `debugger` — isolated quality work
- `agent-organizer` — orchestrate multiple subagents without polluting the main context

**Methodology layer (superpowers, auto-triggered):**

Discovery / brainstorming / TDD red-green-refactor / worktree-based parallel work are owned by superpowers skills — they activate by context, no manual invocation needed.

## Preferences

- Do not add Co-Authored-By signature in commits
- Use conventional commits: feat, fix, chore, refactor, docs, test, etc.

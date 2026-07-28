# AGENTS.md

This is the short entry point for Codex, Claude, and Cursor. For full
architecture, environment, deployment, and routing guidance, read `CLAUDE.md`.

## Project Summary

Neko is an RWA aggregator (capital routing layer) monorepo that integrates external protocols and
services. `apps/web-app` is the public Next.js 16 / React 19 app, `apps/admin`
is the internal Next.js admin console, and `apps/backend` is the NestJS 10
internal API. Shared TypeScript packages live under `packages/`.

## Commands

```bash
npm run dev            # turbo run dev
npm run build          # turbo run build
npm run lint           # turbo run lint
npm run format         # Prettier write
npm run format:check   # Prettier check
```

Use workspace commands from the target package when possible, for example
`npm run dev -w web-app`, `npm run dev -w admin`, or `npm run dev -w backend`.

## Hard Boundaries

- Neko-owned smart contracts are not used by this repo. Do not look for or
  recreate `apps/contracts/`, Rust contracts, Foundry projects, or EVM code.
- This repo is Stellar/Soroban only. There is no viem, wagmi, RainbowKit, or
  Solidity workflow here.
- The only generated contract bindings in use are `@neko/defindex-vault` and
  `@neko/reflector`. Do not hand-edit generated binding files.
- `@neko/orchestrator`, `@neko/keeper`, `@neko/stellar-wallet`, and
  `@neko/api-contracts` are application libraries, not Neko smart contracts.
- Server state uses TanStack Query v5; do not introduce SWR unless the app
  deliberately changes data-fetching strategy.
- Don't invent new colors or fonts outside the documented `neko-*`/`wallet-*`
  tokens — see `BRAND.md` and the `neko-brand` skill.

## Skills

Project skills live in `.agents/skills/` and are surfaced through `.claude/skills`
and `.cursor/skills`. Prefer the domain skill before a generic subagent:

- `stellar-dev` for Stellar, Soroban, Horizon, RPC, wallets, and XLM/assets
- `neko-brand` for colors, typography, and logo usage in any UI work
- `feature-module-conventions` for where new code belongs under `src/features/**`
- `tanstack-query` for React Query v5 patterns
- `tailwind-patterns`, `next-best-practices`, `vercel-react-best-practices`,
  and `vercel-composition-patterns` for frontend work
- `web-design-guidelines` and `seo-audit` for UX/accessibility/SEO reviews
- `commit-work`, `agent-md-refactor`, `find-skills`, and `skill-creator` for
  agent workflow tasks
- `apps/web-app/.claude/skills/vault/SKILL.md` for DeFindex vault integrations

## Preferences

- Do not add `Co-Authored-By` signatures in commits.
- Use conventional commits: `feat`, `fix`, `chore`, `refactor`, `docs`, `test`.

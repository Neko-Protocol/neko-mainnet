---
name: feature-module-conventions
description: The colocated file layout used across apps/web-app/src/features/{basic,expert,shared,simulator}/**. Use this skill before adding a new feature module, a new hook/store/service/type to an existing one, or when deciding whether new code belongs in a feature module vs. global src/lib, src/hooks, or src/stores. Not for backend (apps/backend) code layout, which follows a separate core/domains DDD pattern documented directly in CLAUDE.md.
user-invocable: true
---

# Feature Module Conventions

`apps/web-app/src/features/` follows a colocated-by-module convention that isn't enforced by tooling, only by consistency. It evolved during the recent refactor (see `git log --oneline -- apps/web-app/src/features` for the relevant commits) — code that used to live in global `src/lib`, `src/hooks`, and `src/stores` was moved into the feature module that actually owns it. `CLAUDE.md`'s architecture section documents the current end state; this skill documents the pattern so new modules follow it instead of drifting back to global dirs.

## The pattern

Every module under `features/{basic,expert,shared}/<module>/` or `features/simulator/strategies/` follows this shape (only include the subdirectories the module actually needs):

```
features/<area>/<module>/
├── components/
│   ├── pages/       # top-level page components rendered by a Next.js route
│   └── ui/           # smaller presentational pieces used by the pages
├── hooks/             # module-specific React hooks (data fetching, local logic)
├── stores/            # Zustand store, only if the module owns cross-render client state
├── services/          # calls to external APIs/SDKs the module owns
├── types/             # module-specific TS types
├── utils/              # pure helper functions
└── index.ts            # barrel export — what the rest of the app is allowed to import
```

Real examples: `features/shared/vault/` (all seven subdirs), `features/shared/referral/` (components, hooks, services, stores, index.ts — no types/utils needed), `features/shared/currency/` (just components + index.ts — the simplest valid module).

## Where new code goes

1. **New feature-specific hook, store, service, or util** → inside the owning module's matching subdirectory. Do not add it to `src/hooks/`, `src/stores/`, or `src/lib/services/` unless it's genuinely cross-cutting (used by 3+ unrelated modules across `basic`/`expert`/`shared`).
2. **New Zustand store** → colocate in `features/<module>/stores/`, not `src/stores/`. `src/stores/` today holds only 3 truly cross-cutting stores (`currency`, `fx-rate`, `stellarWallet`) — everything else (cart, referral, strategies, ui-mode, pending multisig txs) was deliberately moved out into its owning module.
3. **New page/route UI** → `components/pages/` inside the module, wired from the matching `app/(app)/(basic|expert)/...` route file, which should stay a thin wrapper.
4. **Cross-module reuse** → export it from the owning module's `index.ts` barrel and import from there (e.g. `import { useReferralStats } from "@/features/shared/referral"`), not by reaching into another module's internal file paths.
5. **Genuinely global code** (used by unrelated features, app shell, or providers) → `src/lib/`, `src/hooks/`, `src/stores/`, or `src/providers/` remain correct for this. The bar is "no single feature owns this," not "it's used in more than one place inside the same module."

## Don't

- Don't add a new top-level file directly under `src/hooks/` or `src/stores/` because it's the path of least resistance — check whether a feature module should own it first.
- Don't reach into another feature module's `components/`, `hooks/`, etc. directly — import from its `index.ts` barrel so the module's internal structure can change without breaking callers.
- Don't create a subdirectory a module doesn't need (e.g. an empty `stores/` with no store) — several real modules skip subdirs they don't use; follow that, not a maximal template.

## Verifying

Before assuming a path from an older doc or comment, check the module actually exists: `ls apps/web-app/src/features/shared/` lists all current `shared/` submodules. Docs have drifted from this layout before (see `CLAUDE.md`'s history) — the filesystem is the ground truth.

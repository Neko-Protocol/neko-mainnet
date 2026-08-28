---
name: neko-brand
description: Neko's visual identity — color tokens, typography, and logo usage. Use this skill whenever generating or reviewing UI in apps/web-app, picking colors/fonts for a new component, adding a logo/icon, or auditing an existing screen for brand consistency. Not for generic Tailwind component patterns (use tailwind-patterns) or accessibility review (use web-design-guidelines).
user-invocable: true
---

# Neko Brand Identity

Source of truth: [`BRAND.md`](../../../BRAND.md) at the repo root. This skill is the actionable, agent-facing layer on top of it — read `BRAND.md` for full detail (hex values, asset paths, rationale); this file is the do/don't checklist.

## Do

- Use `neko-*` Tailwind classes (`bg-neko-accent`, `text-neko-muted`, `border-neko-border`, …) or their CSS variables. Never hard-code Neko's hex values in new code — `packages/config/tailwind.config.ts` and `apps/web-app/src/app/globals.css` are the only two places token values should live.
- Default to `neko-accent` (`#294cab`) for primary interactive elements (buttons, active nav, links) and `neko-teal`/`neko-teal-light` for secondary highlights.
- Use `wallet-*` tokens (`wallet-success`, `wallet-error`, `wallet-neutral-bg`, `wallet-neutral-text`, `wallet-muted`) specifically for wallet pill/modal UI — don't reuse generic `neko-*` tokens there.
- Base surfaces are dark by default (`#121212`, `neko-dark`) — design dark-mode-first, not as an afterthought.
- Typography: `.font-klein` (Klein Condensed, weight 800) for display headings only; `font-sans` (FK Grotesk) for body/UI text; `font-label` (FK Grotesk SemiMono) for labels and tabular/mono-style text. Don't introduce a fourth type family.
- Remember the FK Grotesk `.woff2` files are licensed and not committed to the repo (see `apps/web-app/public/fonts/fk-grotesk/README.md`) — local screenshots may render in the Inter fallback instead of the real brand font. Don't "fix" this by hard-coding Inter as the primary font; the `@font-face` fallback chain is intentional.
- For new logos/icons, follow the existing convention: token icons go in `apps/web-app/public/assets/`, primary brand marks in `apps/web-app/public/`.

## Don't

- Don't invent a new color outside the `neko-*`/`wallet-*` set for brand-identifiable UI. If nothing in the palette fits, flag it to the user instead of picking an arbitrary hex.
- Don't duplicate token definitions in a third location — `tailwind.config.ts` and `globals.css`'s `@theme inline` block already have to be kept in sync by hand; adding a third copy makes drift worse.

## When in doubt

Read `BRAND.md` for the full color table and rationale, then check how an existing, similar component in `apps/web-app/src/features/` already uses these tokens before introducing something new.

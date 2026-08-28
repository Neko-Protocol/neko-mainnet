# Neko Brand & Design System

This document is the source-of-truth summary of Neko's visual identity as it actually exists in code today. It's derived entirely from `packages/config/tailwind.config.ts`, `apps/web-app/src/app/globals.css`, and the asset files under `apps/web-app/public/` — there is no external brand guideline to defer to. For agent-facing rules on how to apply this, see the `neko-brand` skill.

## Color tokens

The `neko-*` palette is defined in two places that must be kept in sync by hand — there is currently no single source of truth:

- `packages/config/tailwind.config.ts` → `theme.extend.colors.neko`
- `apps/web-app/src/app/globals.css` → `@theme inline` block (`--color-neko-*`)

| Token             | Hex       | Suggested usage                                                                          |
| ----------------- | --------- | ---------------------------------------------------------------------------------------- |
| `neko-navy`       | `#081f5c` | Deep brand navy — headers, high-emphasis surfaces                                        |
| `neko-blue`       | `#7096d1` | Secondary blue accent                                                                    |
| `neko-accent`     | `#294cab` | Primary interactive accent (buttons, links, active states)                               |
| `neko-border`     | `#334eac` | Border color on brand-tinted surfaces                                                    |
| `neko-teal`       | `#39bfb7` | Secondary accent / success-adjacent highlights                                           |
| `neko-teal-light` | `#68f9f2` | Teal highlight, hover/glow states                                                        |
| `neko-muted`      | `#bad6eb` | Muted blue text/icons on dark surfaces                                                   |
| `neko-navy-hover` | `#12328a` | Hover state for navy elements                                                            |
| `neko-cream`      | `#fff9f0` | Warm light surface (used sparingly against the dark base)                                |
| `neko-gray`       | `#f3f4f6` | Light neutral surface                                                                    |
| `neko-dark`       | `#121212` | Base app background (also hard-coded as `body { background: #121212 }` in `globals.css`) |

Wallet-specific semantic tokens (`globals.css` only, not in `tailwind.config.ts`):

| Token                 | Hex       | Usage                                |
| --------------------- | --------- | ------------------------------------ |
| `wallet-neutral-bg`   | `#f0f2f5` | Wallet pill/modal neutral background |
| `wallet-neutral-text` | `#4a5362` | Wallet pill/modal neutral text       |
| `wallet-success`      | `#2ed06e` | Wallet success state                 |
| `wallet-error`        | `#ff3b30` | Wallet error state                   |
| `wallet-muted`        | `#c1c7d0` | Wallet muted text/icons              |

Beyond the `neko-*`/`wallet-*` set, `globals.css` also defines a shadcn/ui-style token set (`--background`, `--foreground`, `--card`, `--primary`, `--sidebar-*`, chart colors, etc.) in OKLCH, with light (`:root`) and dark (`.dark`) variants. These back generic UI primitives (cards, popovers, charts) rather than Neko-specific branding — use the `neko-*`/`wallet-*` tokens for anything brand-identifiable.

**Always reference these as Tailwind classes** (`bg-neko-accent`, `text-neko-muted`, etc.) or the CSS variables — never hard-code the hex values in new code.

## Typography

Defined via `@font-face` in `apps/web-app/src/app/globals.css`:

| Family                  | Weight(s)       | Role                             | Utility        |
| ----------------------- | --------------- | -------------------------------- | -------------- |
| **Klein Condensed**     | 800 (ExtraBold) | Display headings                 | `.font-klein`  |
| **FK Grotesk**          | 300 / 400 / 500 | Body / main UI text              | `--font-sans`  |
| **FK Grotesk SemiMono** | 400 / 500       | Labels, tabular/mono-ish UI text | `--font-label` |

**Fallback chain matters here.** The FK Grotesk `.woff2` files are licensed and are **not checked into the repo** — see `apps/web-app/public/fonts/fk-grotesk/README.md`. Until someone with a license drops the woff2 files in, the app silently falls back to **Inter** (loaded from Google Fonts) with **Antonio** and **Inconsolata** as secondary fallbacks (declared in the `@import` at the top of `globals.css`). This means local dev and any deploy without the licensed fonts renders in Inter, not FK Grotesk/Klein — don't be surprised if screenshots don't match a Figma/production reference that has the real fonts loaded.

## Logo & asset inventory

| Asset                  | Path(s)                                                                    |
| ---------------------- | -------------------------------------------------------------------------- |
| Primary logo (PNG)     | `apps/web-app/public/neko-logo.png`                                        |
| Primary logo (SVG)     | `apps/web-app/public/Neko.svg`                                             |
| DeFindex partner logo  | `apps/web-app/public/defindex-logo.svg`                                    |
| Asset token icons      | `apps/web-app/public/assets/{usdc,eurc,pyusd,xlm,xlm-negro,usdy}-logo.png` |
| Social icons           | `apps/web-app/public/assets/social-logos/x-logo.png`                       |
| Sidebar logo component | `apps/web-app/src/components/navigation/SidebarLogo.tsx`                   |

## For agents

When generating or reviewing UI, use the `neko-brand` skill for actionable do's/don'ts. This document is the reference; the skill is the enforcement layer.

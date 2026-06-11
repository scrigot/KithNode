# DESIGN.md - KithNode

This document describes the design system **as it is actually built and shipped**, not an
aspiration. When code and this file disagree, the code (`src/app/globals.css`,
`src/app/layout.tsx`, `src/app/_landing/`) wins, and this file should be corrected to match.

KithNode runs **two deliberate design contexts**:

1. **Landing** (`/` and public marketing) - a cinematic, recruiting-trailer feel: a dark
   starfield hero that opens into a light, rounded, approachable marketing page.
2. **Dashboard** (`/dashboard/*`, auth-gated) - a dark, dense, sharp-cornered instrument.
   Bloomberg-terminal energy: data does the talking.

They share one accent (teal `#0EA5E9`) and one type system. Everything else differs on
purpose. Do not bleed dashboard density into the landing page, or landing roundness into
the dashboard.

---

## Type system (both contexts)

Loaded in `src/app/layout.tsx` via `next/font/google`:

- **Heading** - **Space Grotesk**, exposed as `--font-heading` / Tailwind `font-heading`.
  Used for display, hero lines, logo wordmark, section titles.
- **Body / UI** - **DM Sans**, exposed as `--font-sans` / Tailwind `font-sans`. The default
  body font (`<body class="font-sans">`). All paragraph, label, and control text.
- **Mono** - system mono stack `ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas,
  monospace` as `--font-mono`. Used for data that benefits from monospacing (paths, IDs).

> Note: earlier drafts of this file named Geist + JetBrains Mono. That was never shipped.
> The live fonts are Space Grotesk + DM Sans. If a font migration is ever done, change
> `layout.tsx` first, then this file.

Numbers in tables use `tabular-nums` so warmth scores align.

---

## Color tokens (source of truth: `src/app/globals.css`)

Defined once in the Tailwind v4 `@theme` block and the `:root` / `.dark` variables. The
app is mounted with `class="dark"` on `<html>`, so the dashboard always renders dark.

### Dashboard surfaces and text
| Token | Hex | Use |
|---|---|---|
| `--color-bg-primary` / `--background` | `#0A1628` | Page background (deep navy-black) |
| `--color-bg-secondary` | `#0F1A2E` | Sidebar, popover surfaces |
| `--color-bg-card` / `--card` | `#111D2E` | Cards, panels |
| `--color-bg-hover` | `#162438` | Hover / secondary / muted surfaces |
| `--color-text-primary` / `--foreground` | `#F8FAFC` | Primary text (near-white) |
| `--color-text-secondary` | `#94A3B8` | Secondary text |
| `--color-text-muted` / `--muted-foreground` | `#64748B` | Muted text, captions |
| `--color-border` / `--border` | `rgba(255,255,255,0.08)` | Hairline borders |

### Accent (single brand action color)
- **Teal** `--color-accent-teal` / `--primary` / `--ring` = `#0EA5E9`. Actions, links,
  focus rings, active states, the logo's "Node". This is the one interactive color.
- The landing footer/links also use a darker teal `#0369A1` for text-on-light contrast,
  and the viewport `themeColor` is `#0369A1`.

### Tier classification (warmth tiers)
Used across Discover and contact surfaces:

| Tier | Token | Hex |
|---|---|---|
| HOT | `--color-tier-hot` | `#EF4444` (red) |
| WARM | `--color-tier-warm` | `#3B82F6` (blue) |
| MONITOR | `--color-tier-monitor` | `#F59E0B` (amber) |
| COLD | `--color-tier-cold` | `#64748B` (slate) |

In components these render as a translucent fill + matching text + border, e.g.
`bg-red-500/20 text-red-400 border-red-500/30` for HOT. **These tier styles are currently
duplicated as inline class strings in several component files** (e.g.
`src/app/dashboard/discover/page.tsx`); if the tier palette changes, grep for the tier
classes and update all of them, or extract to a shared constant.

### Charts
`--chart-1..5` = teal `#0EA5E9`, green `#22C55E`, amber `#F59E0B`, red `#EF4444`,
slate `#64748B`.

---

## Border radius

- **Dashboard: 0px everywhere.** Every `--radius-*` token in `globals.css` is set to `0px`
  (`--radius-sm` through `--radius-4xl`, and `--radius: 0px`). Sharp corners are the
  dashboard's signature and are enforced at the token level, so shadcn/ui components
  inherit 0px automatically. Do not add rounded corners inside the dashboard.
- **Landing: rounded.** The marketing components (`src/app/_landing/*`) use Tailwind radius
  utilities freely - `rounded-full` (pills, avatars, the most common), `rounded-xl` and
  `rounded-lg` (cards, panels). This is intentional and only applies to the public pages.

---

## Landing page (the marketing context)

File: `src/app/page.tsx` composing `src/app/_landing/*`.

- **Hero** (`hero-section.tsx`): full-height `bg-black` with a twinkling `Starfield`, a soft
  cyan radial glow, and an animated `HeroNetwork` graph on the right. Two-column on desktop,
  `max-w-[1400px]`, generous top padding. Uses Framer Motion (blur-up line reveals,
  scroll parallax) and honors `useReducedMotion`.
- **Body**: opens into light - `bg-white`, `text-slate-*` scale (900 headings down to
  400 captions), rounded cards, teal accents. Sections: product cards, solutions, value
  props, showcase, testimonials, CTA, footer (`bg-slate-50`, `border-slate-200`).
- **Motion**: present and real on the landing (Framer Motion). Cinematic but restrained;
  reduced-motion collapses to opacity fades.

So the landing arc is: **dark, cinematic hero opening into a light, confident product story.** That
tonal shift is the design, not an inconsistency.

---

## Dashboard (the instrument context)

Auth-gated `/dashboard/*`. Dark, dense, sharp.

- **Density**: compact, Bloomberg-style. Data rows over cards-with-icons. Information
  density is the aesthetic.
- **Surfaces**: `#0A1628` page, `#111D2E` cards, `rgba(255,255,255,.08)` hairlines.
- **Primary surfaces**: Discover (warmth-ranked swipe/list of contacts with tier badges and
  scores), Contacts (list + detail + outreach slide-over), Pipeline, Network graph,
  Billing, Settings.
- **Components**: shadcn/ui (`src/components/ui/*`) themed via the CSS variables above, so
  they pick up the dark theme and 0px radius automatically.
- **Logo**: `src/components/logo.tsx`, "Node" always teal `#0EA5E9` (single-accent rule).

---

## Motion

- **Landing**: Framer Motion. Hero line reveals (blur + rise), scroll parallax, section
  fade-ins. Always reduced-motion aware.
- **Dashboard**: restrained. Hover transitions (~150ms), Discover card slide-out/in on
  rate (~300ms), `ease-out` on enter / `ease-in` on exit. No decorative perpetual motion.

---

## Anti-patterns (do not do these)

**Dashboard:**
- Rounded corners (0px is the signature).
- A second accent color. Teal only for interactive elements.
- Decorative gradients, blobs, or hero sections inside the app.
- Light mode in the dashboard. It is dark, always.
- Generic three-card icon grids; prefer dense rows.

**Landing:**
- Dashboard density. The marketing page breathes.
- Dropping the dark to light arc; the cinematic hero into light body is deliberate.

**Both:**
- Claiming fonts the code does not load. The live fonts are Space Grotesk + DM Sans.
- Hardcoding a new tier color in only one component; the tier styles are duplicated, so
  change them everywhere or extract a shared constant.

---

## Where things live

| Concern | File |
|---|---|
| Color, font, radius tokens | `src/app/globals.css` |
| Font loading + dark root | `src/app/layout.tsx` |
| Landing composition | `src/app/page.tsx` + `src/app/_landing/*` |
| Dashboard surfaces | `src/app/dashboard/*` |
| Reusable UI | `src/components/ui/*` (shadcn/ui) |
| Logo / wordmark | `src/components/logo.tsx` |
| Tier style strings (duplicated) | grep `tier-hot` / `bg-red-500/20` across `src/app/dashboard/*` |

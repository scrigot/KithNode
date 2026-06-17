# Design System -- KithNode Dashboard

> Landing page has its own brand doc: brand/landing.md (dark, Cluely-derived). This file governs the DASHBOARD only.

## Product Context
- **What this is:** AI-powered warm-path networking platform for college recruiting
- **Who it's for:** Ambitious college students targeting IB, PE, Consulting
- **Space/industry:** Recruiting intelligence, professional networking
- **Project type:** Data-dense dashboard / web app

## Aesthetic Direction
- **Direction:** Industrial/Utilitarian
- **Decoration level:** Minimal -- typography and data density do the work
- **Mood:** Bloomberg terminal meets modern data viz. Precision instrument, not consumer app. Users should feel like operators with intelligence at their fingertips.
- **Reference:** Bloomberg Terminal, Datadog dark mode, Linear's data density

## Typography
- **Display/Hero:** Space Grotesk (`--font-heading`) -- clean geometric grotesk, built for dark UIs and dense headings
- **Body:** DM Sans (`--font-sans`) -- excellent legibility at small sizes, the default applied on `html`
- **UI/Labels:** system monospace (`ui-monospace, SF Mono, Menlo, Consolas`, via `--font-mono`) uppercase tracking-wider at 10px -- terminal micro-labels
- **Data/Tables:** system monospace (`--font-mono`) with tabular-nums -- scores and numbers align perfectly
- **Warm path chains:** system monospace (`--font-mono`) -- intelligence-briefing feel, monospace for connection chains
- **Code/Annotations:** system monospace (`--font-mono`)
- **Font stack source of truth:** `src/app/globals.css` `@theme inline` block -- `--font-heading: var(--font-heading)`, `--font-sans: var(--font-sans)`, `--font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace`
- **Scale:** 10px (micro-labels) / 12px (body small) / 14px (body) / 16px (body large) / 20px (heading) / 24px (page title)

## Color
- **Approach:** Restrained -- one accent does all the work
- **Source of truth:** `src/app/globals.css` `@theme` tokens
- **Background:** `--color-bg-primary` #0A1628 (deep navy-black)
- **Secondary background:** `--color-bg-secondary` #0F1A2E (popovers, sidebar)
- **Surface/Card:** `--color-bg-card` #111D2E with `--color-border` border (glassmorphism)
- **Primary accent:** `--color-accent-teal` #0EA5E9 (teal) -- sole accent. Actions, links, active states, value indicators
- **Primary text:** `--color-text-primary` #F8FAFC (near-white on dark)
- **Muted text:** `--color-text-secondary` #94A3B8
- **Micro-labels:** text-secondary at reduced opacity for the faintest tier
- **Tier system (data classification only):**
  - HOT: `--color-tier-hot` #EF4444 (red) on red tint bg, red border
  - WARM: `--color-tier-warm` #3B82F6 (blue) on blue tint bg, blue border
  - MONITOR: `--color-tier-monitor` #F59E0B (amber) on amber tint bg, amber border
  - COLD: `--color-tier-cold` #64748B (slate) on slate tint bg, slate border
- **Semantic:** success `--color-accent-green` #22C55E, warning `--color-accent-amber` #F59E0B, error `--color-accent-red` #EF4444, info `--color-accent-blue` #3B82F6
- **Border:** `--color-border` rgba(255, 255, 255, 0.08) for cards and dividers
- **Dark mode:** Default and only mode. No light mode for dashboard.

## Spacing
- **Base unit:** 4px
- **Density:** Compact -- Bloomberg density, no wasted pixels
- **Scale:** 2xs(2px) xs(4px) sm(8px) md(16px) lg(24px) xl(32px) 2xl(48px) 3xl(64px)
- **Card padding:** px-5 py-4 (20px/16px) for content cards, px-6 py-4 (24px/16px) for browse cards
- **Section spacing:** mb-4 (16px) between sections, h-px bg-border dividers

## Layout
- **Approach:** Grid-disciplined
- **Structure:** Fixed sidebar (collapsed on mobile) + full-width content area
- **Card grid:** sm:grid-cols-2 lg:grid-cols-3 for search results, single column for browse
- **Max content width:** None (full width, sidebar constrains)
- **Border radius:** 0px everywhere -- sharp corners are the dashboard signature. The Tailwind `@theme` sets `--radius-{sm..4xl}: 0px` globally in `globals.css`, so `rounded-*` utilities resolve to 0px by design. No exceptions in dashboard.
- **Borders:** border with `--color-border` (rgba(255,255,255,0.08)) for cards, border-b with the same for dividers

## Motion
- **Approach:** Minimal-functional
- **Easing:** enter(ease-out) exit(ease-in)
- **Duration:** micro(150ms for hover) short(300ms for card slides)
- **Patterns:**
  - Card slide-out on Discover rate (left=skip, right=high-value)
  - Card slide-in on next contact
  - Hover lift on interactive cards (translate-y or opacity)
  - Progress bar animation on Discover pipeline modal
- **No decorative animation in dashboard.** Every motion communicates a state change.

## Component Patterns
- **Action buttons:** Primary: bg-primary text-white uppercase text-[12px] font-bold tracking-wider. Secondary: border with `--color-border` text-muted-foreground uppercase.
- **Badges/chips:** variant="outline" with tier-specific colors. text-[8px] or text-[10px] font-bold.
- **Section headers:** text-sm font-bold uppercase tracking-wider text-primary. Subtitle: text-[10px] text-muted-foreground.
- **Dividers:** h-px bg-border between sections.
- **Empty states:** Centered icon + heading + muted description + primary action button.
- **Modals:** Fixed overlay bg-black/80 backdrop-blur-sm. Content: border border-primary/30 bg-card shadow-2xl. Sharp corners.
- **Slide-overs:** Sheet component, right-aligned, dark bg matching cards.

## Warm Path Chain Display
- **Font:** system monospace (`--font-mono`), text-[11px]
- **Color:** text-primary (teal) for names, text-muted-foreground for arrows/connectors
- **Format:** "Via {name} ({affiliation}) -> {title} at {firm}"
- **Position:** Between name/title and affiliation chips on contact cards
- **Label:** "WARM PATH" in micro-label style (text-[9px] font-bold uppercase tracking-wider text-muted-foreground at reduced opacity)

## Anti-Patterns (never do these)
- Rounded corners in dashboard (0px is the signature)
- Purple/violet accents (teal only)
- Centered-everything layouts (left-aligned, data-dense)
- Decorative blobs, gradients, or floating shapes in dashboard
- Generic card grids with icons in colored circles
- Hero sections in dashboard (that's landing page territory)
- Light mode in dashboard (dark is the only mode)
- Inter/Roboto fonts (Space Grotesk for headings + DM Sans for body + system monospace for data)

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-16 | Initial design system created | Extracted from existing codebase patterns by /design-consultation. Bloomberg/industrial aesthetic. |
| 2026-04-16 | 0px border radius as visual signature | Sharp corners differentiate from every rounded-corner SaaS app. Deliberate creative risk. |
| 2026-04-16 | Teal as sole accent | Restrained palette forces intentionality. When teal appears, it means action or value. |
| 2026-06-16 | Split DESIGN.md into brand/dashboard.md + brand/landing.md; corrected font stack to Space Grotesk + DM Sans | DESIGN.md had drifted. Real stack is Space Grotesk headings + DM Sans body + system monospace for data. Landing page is a separate context with its own doc. |
| 2026-06-16 | Settings/feature pages use a centered, roomier "console" tier; data pages stay Bloomberg-dense | Settings + Import are configuration/feature surfaces, not data. They get a centered max-w column (max-w-2xl/3xl mx-auto), ~14px body, ~24px card padding, bigger labels. This is a deliberate, approved exception to "Centered-everything layouts" + "Max content width: None" above — it applies ONLY to non-data pages (Settings, Import). Discover/Contacts/Ops stay dense. |

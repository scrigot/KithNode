# Design System -- KithNode

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
- **Display/Hero:** Geist (700) -- clean geometric, built for dark UIs
- **Body:** Geist (400/500) -- excellent legibility at small sizes
- **UI/Labels:** Geist (600) uppercase tracking-wider at 10px -- terminal micro-labels
- **Data/Tables:** Geist (tabular-nums) -- scores and numbers align perfectly
- **Warm path chains:** JetBrains Mono (400) -- intelligence-briefing feel, monospace for connection chains
- **Code/Annotations:** JetBrains Mono (400)
- **Loading:** Google Fonts (`family=Geist:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500`)
- **Scale:** 10px (micro-labels) / 12px (body small) / 14px (body) / 16px (body large) / 20px (heading) / 24px (page title)

## Color
- **Approach:** Restrained -- one accent does all the work
- **Background:** #0A1628 (deep navy-black)
- **Surface/Card:** bg-card with border-white/[0.06] glassmorphism
- **Primary accent:** #0EA5E9 (teal) -- actions, links, active states, value indicators
- **Primary text:** text-foreground (near-white on dark)
- **Muted text:** text-muted-foreground (60% opacity)
- **Micro-labels:** text-muted-foreground/60 (40% opacity)
- **Tier system (data classification only):**
  - HOT: red-400 on red-500/20 bg, border red-500/30
  - WARM: blue-400 on blue-500/20 bg, border blue-500/30
  - MONITOR: amber-400 on amber-500/20 bg, border amber-500/30
  - COLD: zinc-400 on zinc-500/20 bg, border zinc-500/30
- **Semantic:** success green-400, warning amber-400, error red-400, info blue-400
- **Dark mode:** Default and only mode. No light mode for dashboard.
- **Landing page exception:** Light mode (white bg, teal accent, 12px rounded corners, gradient blobs). Landing and dashboard are separate design contexts.

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
- **Border radius:** 0px everywhere. Sharp corners are the visual signature. No exceptions in dashboard.
- **Borders:** border border-white/[0.06] for cards, border-b border-white/[0.06] for dividers

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
- **Action buttons:** Primary: bg-primary text-white uppercase text-[12px] font-bold tracking-wider. Secondary: border border-white/[0.12] text-muted-foreground uppercase.
- **Badges/chips:** variant="outline" with tier-specific colors. text-[8px] or text-[10px] font-bold.
- **Section headers:** text-sm font-bold uppercase tracking-wider text-primary. Subtitle: text-[10px] text-muted-foreground.
- **Dividers:** h-px bg-border between sections.
- **Empty states:** Centered icon + heading + muted description + primary action button.
- **Modals:** Fixed overlay bg-black/80 backdrop-blur-sm. Content: border border-primary/30 bg-card shadow-2xl. Sharp corners.
- **Slide-overs:** Sheet component, right-aligned, dark bg matching cards.

## Warm Path Chain Display
- **Font:** JetBrains Mono 400, text-[11px]
- **Color:** text-primary (teal) for names, text-muted-foreground for arrows/connectors
- **Format:** "Via {name} ({affiliation}) -> {title} at {firm}"
- **Position:** Between name/title and affiliation chips on contact cards
- **Label:** "WARM PATH" in micro-label style (text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60)

## Anti-Patterns (never do these)
- Rounded corners in dashboard (0px is the signature)
- Purple/violet accents (teal only)
- Centered-everything layouts (left-aligned, data-dense)
- Decorative blobs, gradients, or floating shapes in dashboard
- Generic card grids with icons in colored circles
- Hero sections in dashboard (that's landing page territory)
- Light mode in dashboard (dark is the only mode)
- Inter/Roboto/system fonts (Geist + JetBrains Mono)

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-16 | Initial design system created | Extracted from existing codebase patterns by /design-consultation. Bloomberg/industrial aesthetic. |
| 2026-04-16 | Geist + JetBrains Mono typography | Geist: clean geometric with tabular-nums for scores. JetBrains Mono: intelligence-briefing feel for warm-path chains. |
| 2026-04-16 | 0px border radius as visual signature | Sharp corners differentiate from every rounded-corner SaaS app. Deliberate creative risk. |
| 2026-04-16 | Teal as sole accent | Restrained palette forces intentionality. When teal appears, it means action or value. |

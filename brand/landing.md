# Landing Brand: KithNode (Cluely DNA)

Canonical brand doc for the marketing landing page. The rule is simple: **KithNode skin, Cluely DNA.** Keep KithNode's dark/teal/network identity and copy; borrow Cluely's scale, weight, radius, spacing, and motion.

## Skin (KithNode, fixed)

Dark base (bg-black / #0A1628), teal #0EA5E9 single accent, network-mesh background (`src/app/_landing/mesh-bg.tsx`), Space Grotesk headings (`font-heading`), DM Sans body (`font-sans`), system mono for in-product data chrome. In-product mock tiers reuse dashboard colors: KITH amber, HOT red #EF4444, WARM blue #3B82F6. Keep KithNode copy and the network identity. Do NOT use Cluely's white background or serif.

## Typography, Radius, Layout, Motion, Links

CLUELY DNA, captured live from cluely.com via getComputedStyle (2026-06-16). Apply onto KithNode's skin (dark bg-black/#0A1628, teal #0EA5E9 sole accent, network mesh, Space Grotesk headings via font-heading, DM Sans body via font-sans, system mono for data chrome). Do NOT adopt Cluely's white background or its EB-Garamond serif; keep KithNode fonts plus dark/teal. Copy the SCALE, WEIGHT, RADIUS, SPACING, MOTION below.

### Typography

Headings are MEDIUM weight 500, not bold. That is the Cluely premium feel.

- **Hero headline:** `text-[clamp(2.75rem,7vw,80px)]` (≈80px desktop), `leading-[0.98]`, `tracking-[-0.0125em]`, `font-medium`.
- **Section headline (h2):** 48px → `text-5xl`, `leading-[1.25]`, `tracking-[-0.027em]`, `font-medium`.
- **Card title (h3):** 28px → `text-3xl`, `leading-[1.25]`, `tracking-[-0.018em]`, `font-medium`.
- **Subhead under a headline:** `text-[19px]`, `leading-relaxed`, `tracking-[-0.02em]`, `text-white/60`.
- **Body:** `text-base` (16px), `font-normal`.
- **Eyebrow/caption:** 12px uppercase tracking-widest.

### Radius

CRITICAL: the global Tailwind theme forces `--radius-{sm..4xl}: 0px`, so `rounded-lg` / `rounded-xl` / `rounded-2xl` / `rounded-3xl` all render 0px (SHARP). You MUST use ARBITRARY values to get rounding:

- **Big feature cards:** `rounded-[32px]`
- **Standard cards/panels:** `rounded-[24px]`
- **Inner panels/mid:** `rounded-[16px]`
- **Buttons and text chips:** `rounded-[12px]`
- **Pills/avatars/dots:** `rounded-full` (works).

Replace every `rounded-2xl` / `rounded-3xl` / `rounded-xl` / `rounded-lg` on landing components with the matching `rounded-[Npx]`. Leave `rounded-full` as-is. Do NOT touch dashboard files (0px sharp is their signature).

### Layout

Max content width `max-w-7xl` (1280px). Major section rhythm `py-24 sm:py-32` (128px desktop).

### Motion

Captured values:

- **Interactive hover (links/cards):** `transition duration-200 ease-in-out` [cubic-bezier(0.4,0,0.2,1)].
- **Primary button hover:** subtle lift via `transition-transform duration-150 ease-out`, `hover:-translate-y-0.5`.
- **FAQ accordion / toggle:** ~200ms ease-out.
- **Live pulse dots:** ~2s ease-in-out.
- **Scroll-reveal enter:** fade plus translateY ~20px, duration ~0.55s ease-out (gentle).

### Links

Nav links `text-sm` (14px) `font-medium` `text-white`, hover `transition duration-200`. Primary CTA pill `text-base` `font-medium`, `px-5 py-2.5`, `rounded-[12px]`, hover lift (transform 150ms ease-out).

## Section sequence (Cluely order, KithNode content)

Nav -> Hero (full-screen 3D network) -> How-it-lands (2-card: Warm Signals board plus Outlook draft) -> Scoring wow (PanelScoring) -> Pipeline (kanban) -> Safety (LinkedIn trust) -> Founder letter -> FAQ (accordion) -> CTA (Walk in warm) -> Footer.

One idea per full-bleed screen, big medium-weight headline, one visual, generous space.

## Note

Tailwind v4 @theme radius tokens are static at build time and force `rounded-*` to 0px globally; the landing therefore uses arbitrary `rounded-[Npx]` values for all rounding. Cluely's hero uses an EB-Garamond serif at 80px; we keep Space Grotesk at the same scale (serif hero is a possible future move, not adopted now).

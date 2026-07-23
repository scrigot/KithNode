# KithNode Authenticated Product

> `DESIGN.md` is the product-level source of truth. This file translates the approved Quiet Intelligence direction into dashboard implementation rules.

## Core posture

KithNode is a private recruiting intelligence workspace, not an enterprise dashboard.

- Light-first canvas
- Slim persistent sidebar
- Chat-first Home
- Editorial headings
- Comfortable spacing
- Restrained blue action color
- Dedicated Memory and Knowledge Center
- Data density only where the task requires it

The approved working reference is:

`~/.gstack/projects/scrigot-KithNode/designs/dashboard-actual-data-20260723/kithnode-quiet-intelligence.html`

## Fonts

- Display and page titles: Newsreader 500–600
- Body, navigation, controls, and data: DM Sans 400–600
- Code and identifiers only: Geist Mono or platform monospace

Do not use monospace for ordinary labels, recommendation explanations, contact lists, or application tables.

## Tokens

```css
--canvas: #ffffff;
--sidebar: #f7f7f6;
--surface-soft: #fafafa;
--surface-selected: #efefee;
--text-primary: #171717;
--text-secondary: #767676;
--text-faint: #a8a8a8;
--border: #e5e5e3;
--border-soft: #eeeeec;
--action: #2768e8;
--action-soft: #eef3ff;
--identity-blue: #5b9ed1;
--success: #12966a;
--success-soft: #e7f8f1;
--warning: #d47b16;
--warning-soft: #fff4e5;
--error: #d84c72;
--error-soft: #fff0f4;
```

## Shell

- Desktop sidebar width: 240px
- Sidebar background: `--sidebar`
- Sidebar border: `--border-soft`
- Navigation item: 42–44px tall, 8px radius
- Active navigation: neutral selected surface plus a thin blue left indicator
- Recent work sits below primary navigation
- Memory, Knowledge Center, and Settings stay anchored at the bottom
- Main canvas is white
- Focused page width: 1,120px
- Home composer width: 790px

Do not add a persistent dark top bar. Page-level controls belong in a quiet header inside the main canvas.

## Home

Home is a conversation, not an Overview dashboard.

Required composition:

1. “New conversation” utility header
2. Personal, time-aware greeting
3. Large Career Copilot composer
4. Up to four prompt suggestions
5. Up to two continuation items
6. Recent work in the sidebar

Do not add global metrics to Home. Applications, Network, and Founder Ops own their metrics.

## Domain pages

### Career Copilot

- Use a conversation list or a small skill launcher.
- Keep the composer available.
- Structured results should feel like documents or lists, not stacked alert boxes.
- Errors use plain-language recovery states.

### Applications

- Up to four top-level metrics are acceptable.
- Default to a quiet table/list with one visible row action.
- Selecting a record opens a side sheet.
- Board view is optional, not the visual default.
- Preserve filters and drafts through retry states.

### Network

- Use a quiet list with person, why now, next step, and signal.
- The reason for ranking is more prominent than the numeric score.
- Scores use subtle semantic pills.
- Contact detail opens as a focused page or sheet.
- Graph views are secondary explorations.

### Career Toolkit

- A two-column tool library is acceptable.
- Each card describes a real tool and its current state.
- Resume, LinkedIn, Coffee Prep, and Outreach retain stable routes.

### Memory

- Separate recruiting identity, relationship memory, and recruiting timeline.
- Show counts, provenance, and correction paths.
- Make “What KithNode learned” visible and editable.

### Knowledge Center

- Show approved sources and connector readiness.
- Label provenance and freshness.
- Avoid backend-engine terminology unless the user explicitly opens technical details.

### Settings

- Use a centered two- or three-column section index.
- A single readiness strip may summarize connected systems.
- Settings pages preserve unsaved values when a connector or model request fails.

## Components

- Corners: 8px controls, 12px compact objects, 16px cards, 24px composer
- Borders: one neutral border per object
- Shadows: composer, dialogs, sheets, menus only
- Buttons: sentence case, 40–44px tall
- Primary buttons: solid blue
- Secondary buttons: white with neutral border
- Pills: compact semantic status only
- Empty states: one icon, one sentence, one primary action
- Loading: quiet skeletons that preserve page geometry
- Errors: explanation, preserved work, retry, and setup/recovery link

## Approval behavior

Every consequential action preview includes:

- What KithNode proposes
- Which records or external systems are affected
- Evidence used
- Cost, if any
- Whether it is reversible
- The exact result of approval

KithNode never automatically sends, submits, publishes, enriches with paid credits, or deletes.

## Responsive behavior

- Mobile uses five bottom destinations: Home, Copilot, Applications, Network, Toolkit.
- Recent work, Memory, Knowledge Center, Settings, and account controls move into a secondary sheet.
- Lists become vertical records.
- Sheets become full-screen.
- Composer controls retain 44px touch targets.

## Never do

- Dark-only product UI
- Dark top bars framing a white page
- Seven-column metric strips
- Terminal-style labels
- Zero-radius components
- Full-width dense dashboards on every page
- Decorative gradients or glassmorphism
- Nested cards without a real object hierarchy
- Raw JSON, stack traces, or provider errors
- Recommendations without visible evidence or correction paths

## Decision history

| Date | Decision | Status |
|---|---|---|
| 2026-04-16 | Dark Bloomberg-style terminal | Superseded |
| 2026-04-16 | Zero-radius dashboard signature | Superseded |
| 2026-06-16 | Dense data pages with roomier settings | Superseded by task-specific density |
| 2026-07-23 | Quiet Intelligence: light, chat-first, editorial, memory-aware | Approved |

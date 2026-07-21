# KithNode Product Design System

KithNode is a recruiting workstation for finance students. The interface should feel like a calm intelligence terminal: dense enough for serious work, understandable in one scan, and explicit about evidence and approval boundaries.

The detailed dashboard and landing-page rules remain in `brand/dashboard.md` and `brand/landing.md`. This document defines the shared product-level structure.

## Product hierarchy

The signed-in product has five primary workflow hubs:

1. Overview — one recommended action, long-term goal context, and outcome metrics.
2. Career Copilot — grounded analysis and approval-gated proposals.
3. Applications — job pipeline, deadlines, materials, contacts, and activity.
4. Network — people, discovery, relationship pipeline, firm coverage, and graph.
5. Career Toolkit — Resume Studio, LinkedIn Studio, and Coffee Prep.

Settings contains configuration rather than daily work: profile, goals, integrations, data/imports, preferences, billing/usage, and account/privacy.

## Visual language

- Display type: Space Grotesk. Body type: DM Sans. Data: system monospace with tabular numbers.
- Backgrounds: `#0A1628`, `#0F1A2E`, and `#111D2E`.
- Primary action/value accent: Carolina sky blue `#0EA5E9`.
- Corners remain square in the dashboard. Borders and spacing establish hierarchy.
- Green, amber, and red are semantic only. Purple gradients and decorative color are not part of the workstation.
- Data pages use full-width, compact layouts. Configuration pages use a readable centered column.

## Shared component vocabulary

- `WorkspaceHeader`: eyebrow, page title, orientation text, and page-level actions.
- `MetricStrip`: four or fewer comparable outcomes with tabular values.
- `NetworkNav` and `CareerToolkitNav`: persistent secondary workflow navigation.
- `StatusBadge`: semantic state, never decorative categorization.
- Filters: visible labels or accessible names, retained through retries.
- Tables: semantic headings, keyboard-reachable row actions, and a mobile list equivalent.
- Sheets: contextual editing that preserves the underlying workspace.
- Loading, empty, error, partial, and saved states: every data surface implements all relevant states.

## Interaction rules

- The first meaningful action is visible without scrolling.
- Deterministic ranking and fallback behavior remain available when AI is unavailable.
- AI recommendations show evidence, freshness, and confidence where applicable.
- Sending messages, applying to jobs, publishing profiles, paid enrichment, and destructive actions always require explicit user action.
- Status changes are reversible. Archiving preserves history.
- External listings open separately and remain the authoritative source.

## Responsive behavior

- Desktop: sidebar with the five primary hubs; secondary tabs inside Network and Career Toolkit.
- Mobile: five-item bottom navigation; the top menu contains account and secondary controls.
- Application tables become stage-grouped vertical records. Application details become a full-width sheet.
- Wide editors may use edit/preview tabs rather than shrinking both panes below legibility.
- Horizontal scrolling is reserved for secondary tab rails and deliberate data previews, not primary mobile workflows.

## Accessibility

- Body copy is 16px or larger. Smaller type is reserved for labels and metadata with sufficient contrast.
- Body-text contrast is at least 4.5:1.
- Controls have visible focus and a minimum 44px touch target on mobile.
- Tables use semantic table markup; status and error changes use appropriate live regions.
- Drag interactions always have keyboard and explicit-select alternatives.
- Motion is functional, short, and disabled or reduced when the user requests reduced motion.

## Public showcase

`/demo` is an anonymized, fixture-only, read-only product narrative. It may reuse the workstation visual system but must never import authenticated data, make paid calls, or expose write-capable controls without an explicit read-only explanation.

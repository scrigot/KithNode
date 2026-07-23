# KithNode Product Design System

## Product context

- **What this is:** A personal recruiting intelligence workspace that remembers a student’s goals, experience, applications, relationships, and deadlines, then helps move work between them.
- **Who it is for:** Undergraduate students pursuing competitive internships and early-career roles, beginning with finance, consulting, data, and applied AI.
- **Space:** Career intelligence, personal knowledge management, relationship management, and application workflow.
- **Project type:** Authenticated web application with a fixture-only public demo.
- **Memorable quality:** KithNode should feel like a thoughtful career partner that already understands the user, not a CRM they must continually operate.

The signed-in product uses the **Quiet Intelligence** design direction approved on July 23, 2026. It is light, spacious, conversational, editorial, and explicit about memory and evidence.

`brand/dashboard.md` contains detailed implementation rules for the authenticated product. `brand/landing.md` remains the guide for the public marketing surface. When they conflict, this document wins.

## Product hierarchy

The daily workspace has five primary destinations:

1. **Home** — a conversational starting point, recent work, and one or two relevant continuations.
2. **Career Copilot** — grounded skills, conversations, and approval-gated proposals.
3. **Applications** — opportunities, materials, people, deadlines, and activity.
4. **Network** — people, discovery, relationship pipeline, firm coverage, and graph.
5. **Career Toolkit** — Resume Studio, LinkedIn Studio, Coffee Prep, and outreach drafts.

Persistent utilities sit at the bottom of the desktop sidebar:

- **Memory** — what KithNode believes about the user and how to correct or forget it.
- **Knowledge Center** — source material KithNode may use as evidence.
- **Settings** — profile, goals, integrations, data, preferences, billing, privacy, and account controls.

Recent work appears in the sidebar so users can resume an application, conversation, person, or document without navigating through a dashboard.

## Aesthetic direction

- **Direction:** Quiet Intelligence.
- **Decoration:** Minimal and intentional. Typography, whitespace, and a few small color fields establish hierarchy.
- **Mood:** Calm, personal, capable, and reflective. The product should feel closer to a private study or writing environment than an enterprise operations console.
- **Layout:** Conversational home plus focused work surfaces. Do not show all system knowledge at once.
- **Reference behavior:** A slim persistent sidebar, wide quiet margins, centered conversational entry, editorial headings, simple cards, and dedicated Memory and Knowledge surfaces.

The interface should never resemble a dark command center, sales CRM, Bloomberg terminal, or generic analytics dashboard.

## Typography

- **Display and page titles:** Newsreader, weights 500–600. Its editorial character makes the product feel thoughtful and personal.
- **Body, controls, and navigation:** DM Sans, weights 400–600.
- **Data:** DM Sans with tabular numerals. Monospace is reserved for code, identifiers, and technical payloads.
- **Code:** Geist Mono or the platform monospace stack.
- **Loading:** Self-host both primary families for production; Google Fonts is acceptable in isolated design prototypes only.

### Type scale

- Display greeting: 40–44px desktop, 31–34px mobile
- Page title: 32–34px desktop, 27–30px mobile
- Section heading: 20–22px
- Card heading: 15–17px
- Body: 15–16px
- Secondary copy: 13–14px
- Metadata: 11–12px, used sparingly

Sentence case is the default. Avoid terminal-style uppercase labels and excessive letter spacing.

## Color

The application uses a light-first, restrained palette.

- **Canvas:** `#FFFFFF`
- **Sidebar:** `#F7F7F6`
- **Soft surface:** `#FAFAFA`
- **Selected/hover surface:** `#EFEFEE`
- **Primary text:** `#171717`
- **Secondary text:** `#767676`
- **Faint text:** `#A8A8A8`
- **Border:** `#E5E5E3`
- **Soft border:** `#EEEEEC`
- **Primary action:** `#2768E8`
- **Primary action soft:** `#EEF3FF`
- **KithNode identity blue:** `#5B9ED1`
- **Success:** `#12966A` with `#E7F8F1`
- **Warning:** `#D47B16` with `#FFF4E5`
- **Error:** `#D84C72` with `#FFF0F4`
- **Supporting violet:** `#7357E6` with `#F0EDFF`, limited to distinct information categories

Color is rare and meaningful. Blue indicates navigation, action, or trusted system intelligence. Semantic colors describe states; they are not decoration.

Dark mode may be added later as an accessibility preference, but it is not the product’s defining aesthetic and must not be the default.

## Spacing

- **Base unit:** 4px
- **Density:** Comfortable to spacious
- **Scale:** 4, 8, 12, 16, 20, 24, 32, 40, 48, 64
- **Desktop content inset:** 32–40px
- **Page section gap:** 28–36px
- **Card padding:** 18–24px
- **Sidebar item height:** 42–44px
- **Primary control height:** 40–44px
- **Mobile touch target:** at least 44px

Whitespace is functional. It separates tasks, reduces decision fatigue, and keeps KithNode from feeling like a monitoring console.

## Layout

- **Desktop shell:** 240px fixed sidebar plus a flexible content region.
- **Focused pages:** Maximum content width of 1,120px, centered.
- **Home conversation:** Maximum width of 790px.
- **Long-form editors:** Use the widest width needed for legibility, with edit/preview modes when a split view becomes cramped.
- **Grid:** One or two columns for most content; three columns only for short, comparable memory or settings objects.
- **Border radius:** 8px controls, 12px compact objects, 16–17px cards, 24px conversation composer.
- **Borders:** One-pixel neutral borders. Avoid stacked borders and boxes inside boxes.
- **Shadow:** Reserved for the conversation composer, sheets, dialogs, and elevated menus.

Cards are for real bounded objects: an application, person, knowledge source, memory layer, or tool. Do not turn every sentence or metric into a card.

## Home

Home is not an analytics dashboard.

It contains:

1. A time-aware personal greeting.
2. A large Career Copilot composer.
3. Three or four relevant starter prompts.
4. No more than two “continue” items based on active work.
5. Recent work in the sidebar.

Home does not contain a seven-column metric strip, performance graph, generic card mosaic, or long queue. Relevant metrics belong inside Applications, Network, and their specific workspaces.

The composer may accept files, people, applications, skills, and memory as context. Command+Enter sends. Consequential work still requires a preview and explicit approval.

## Memory and knowledge

KithNode’s ability to remember is a first-class product surface.

Memory must:

- Separate recruiting identity, relationship memory, and recruiting timeline.
- Show what is live, approved, inferred, or recorded.
- Allow the user to inspect, correct, or forget information.
- Explain where a remembered fact came from.
- Show what changed after a correction.

Knowledge Center must:

- Show the resumes, LinkedIn profiles, contacts, goals, documents, and connectors KithNode may use.
- Display source readiness, freshness, and provenance.
- Never imply that inference is verified evidence.

## Shared components

- `AppSidebar` — primary navigation, recent work, Memory, Knowledge Center, and Settings.
- `ConversationComposer` — mode selector, context controls, attachments, skills, and send behavior.
- `PageHeader` — page symbol, editorial title, orientation text, and at most one primary action.
- `ObjectCard` — a bounded person, application, source, memory layer, or tool.
- `MetricRow` — up to four comparable values inside a domain workspace, never the Home hero.
- `DataList` — a quiet list or table with visible row actions and a mobile equivalent.
- `StatusPill` — semantic status only.
- `EvidenceSummary` — recommendation reason, approved evidence, freshness, and confidence.
- `ApprovalPreview` — proposed action, cost, affected data, reversibility, and confirmation.
- `RecoveryState` — plain-language failure, preserved user input, retry, and setup path.

## Interaction principles

Every page answers:

1. Where am I?
2. What matters here?
3. What should I do next?
4. Why is KithNode recommending it?
5. What happens if I approve?

Additional rules:

- The first meaningful action is visible without scrolling.
- The interface reveals detail progressively instead of displaying every metric and system state.
- Recommendations show their evidence and can be corrected.
- Corrections update visible memory or preference state.
- Sending messages, submitting applications, publishing profiles, paid enrichment, calendar writes, and destructive actions always require explicit approval.
- Consequential actions display the cost and outcome before approval.
- Everything important is reversible, retryable, and recorded.
- Model or integration failure produces a recovery path, never raw JSON or a dead end.
- Deterministic fallbacks keep Home and core workspaces useful when AI is unavailable.

## Motion

- **Approach:** Minimal and functional.
- Hover and focus: 100–150ms.
- Sheets and dialogs: 180–240ms.
- Page transitions: none by default.
- Use motion to explain state changes, saving, approval, or movement between workflow stages.
- Respect reduced-motion preferences.

## Responsive behavior

- **Desktop:** Persistent 240px sidebar.
- **Tablet:** Collapsible sidebar and single-column workspaces when necessary.
- **Mobile:** Five-item bottom navigation for Home, Copilot, Applications, Network, and Toolkit.
- Memory, Knowledge Center, Settings, account controls, and recent work move into a secondary menu.
- Data tables become readable vertical records.
- Sheets become full-screen.
- The composer remains the primary Home element.

## Accessibility

- Body copy is at least 15px; 16px is preferred for reading surfaces.
- Text contrast meets WCAG AA.
- Keyboard focus is always visible.
- Controls have semantic labels and keyboard access.
- Command+Enter sends chat; Enter alone creates a new line.
- Status and errors are announced through live regions.
- Drag interactions have explicit-select alternatives.
- Do not communicate status with color alone.

## Public demo

`/demo` is fixture-only, anonymized, read-only, and visually consistent with the signed-in workspace. It must not access personal accounts, invoke paid services, or mutate data.

The demo story should move through the same quiet workflow:

1. Ask Career Copilot for an internship.
2. Save an official opportunity.
3. Inspect the relationship path.
4. Tailor evidence-backed materials.
5. Record the next action and deadline.

## Anti-patterns

- Dark-only interfaces
- Bloomberg, terminal, or operations-console styling
- Metric strips on Home
- Monospace microcopy as the dominant voice
- Square corners everywhere
- Dense card mosaics
- Equal visual weight for every piece of information
- Excessive badges, chips, borders, and dividers
- Decorative gradients, blobs, or glass effects
- Generic “AI dashboard” imagery
- Hidden memory or uncorrectable personalization
- Raw provider errors or JSON in user-facing states

## Decisions log

| Date | Decision | Rationale |
|---|---|---|
| 2026-07-23 | Adopt Quiet Intelligence as the signed-in product direction | The user strongly preferred a light, spacious, chat-first personal AI workspace over the existing dark recruiting terminal. |
| 2026-07-23 | Make Home conversational rather than analytical | KithNode’s differentiated value is understanding and moving the user’s work, not monitoring metrics. |
| 2026-07-23 | Promote Memory and Knowledge Center to first-class utilities | Users must be able to see, correct, and trust what grounds recommendations. |
| 2026-07-23 | Use Newsreader with DM Sans | Editorial headings add warmth and judgment; DM Sans keeps controls and data clear. |
| 2026-07-23 | Supersede the dark-only, zero-radius Bloomberg direction | It made KithNode feel like a generic enterprise console and conflicted with the desired personal, intelligent relationship. |

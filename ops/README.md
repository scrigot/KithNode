# ops/ — KithNode Operating Spine

The single home for "what to do, what we did, what we learned, what we decided." Agents read these at session start and update them before finishing. Humans and future employees review them here.

## Files
- `tasks.md` — canonical task list (Now / Next / Blocked / Done). Source of truth for "what's next."
- `build-log.md` — append-only "what shipped" (auto-appended by the Stop hook).
- `decisions.md` — product / architecture / business decisions + rationale.
- `learnings.md` — patterns + gotchas (stable ones graduate into AGENTS.md).
- `roadmap.md` — the 8-lane x G0-G4 gate backbone.
- `scaling/` — the intern-ready operating kit (automation map, tooling + shared Claude policy, access boundary, onboarding SOPs, financial model, templates). Start at `scaling/README.md`. The canonical phase plan to $100k MRR is `scaling/roadmap-0-to-100k.md`.

## The OPS_LOG protocol (auto-capture)
End a substantive session by emitting ONE line in your final message:

`OPS_LOG: built <what> | learned <what> | decided <what>`

The Stop hook (`ops/scripts/session-log.sh`) parses that line plus your git commits and appends an entry to `build-log.md`. Use `/ops-log` for a manual entry.

## Reorient at session start
1. Read `tasks.md` (current state) and the tail of `build-log.md` (recent context).
2. Read `learnings.md` before any non-trivial work.
3. Pick from `tasks.md` Now / Next. Update it before you finish.

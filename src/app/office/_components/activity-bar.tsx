"use client";

// Placeholder for Commit 3 — full implementation (polling + live events)
// lands in Commit 4. Renders the static top bar shell so the page chrome
// matches the V4 mockup.

export function ActivityBar() {
  return (
    <div className="sticky top-0 z-40 flex h-[49px] items-center gap-4 border-b border-white/[0.06] bg-[#08111F] px-4">
      <div className="flex items-center gap-2">
        <span className="inline-block h-2 w-2 animate-pulse bg-accent-teal" />
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-foreground">
          ACTIVITY
        </span>
      </div>
      <div className="flex flex-1 items-center gap-3 overflow-hidden font-mono text-[10px] tabular-nums text-muted-foreground">
        <span className="text-muted-foreground/60">
          No agent activity yet — walk into a room.
        </span>
      </div>
    </div>
  );
}

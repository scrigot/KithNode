/**
 * Health/color convention for ops cockpit tiles. The pure logic + token-class
 * mapping live in src/lib/ops/metrics.ts (so they're unit-tested); this module
 * re-exports them plus a couple of presentation-only helpers the tiles use.
 */
export { healthColor, type Health } from "@/lib/ops/metrics";
import type { Health } from "@/lib/ops/metrics";

/** Border + bg accent classes for a status chip, by Health. */
export function healthChip(h: Health): string {
  switch (h) {
    case "good":
      return "border-accent-green/30 bg-accent-green/10 text-accent-green";
    case "warn":
      return "border-accent-amber/30 bg-accent-amber/10 text-accent-amber";
    case "bad":
      return "border-accent-red/30 bg-accent-red/10 text-accent-red";
    default:
      return "border-white/[0.12] bg-white/[0.04] text-text-muted";
  }
}

/** Relative-time label ("2h ago", "3d ago") for the recent-signups feed. */
export function relativeTime(iso: string, now: number = Date.now()): string {
  const diff = now - new Date(iso).getTime();
  if (diff < 0) return "just now";
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * "synced Nh ago" label for the cockpit freshness badge so a stale DB never
 * looks live. null timestamp -> "never synced".
 */
export function syncedAgo(iso: string | null, now: number = Date.now()): string {
  if (!iso) return "never synced";
  return `synced ${relativeTime(iso, now)}`;
}

import type { ReactNode } from "react";
import { healthChip, type Health } from "./state";

/**
 * Reusable tile wrapper for the ops cockpit. Sharp corners, bg-bg-card,
 * border-white/[0.06] (brand/dashboard.md). Header = teal uppercase label + optional
 * micro-subtitle + optional right-aligned status badge carrying a Health.
 */
export function OpsTile({
  label,
  subtitle,
  badge,
  badgeHealth = "neutral",
  className = "",
  children,
}: {
  label: string;
  subtitle?: string;
  badge?: string;
  badgeHealth?: Health;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`flex flex-col border border-white/[0.06] bg-bg-card ${className}`}>
      <div className="flex items-start justify-between gap-2 px-5 pt-4">
        <div className="min-w-0">
          <p className="text-sm font-bold uppercase tracking-wider text-accent-teal">
            {label}
          </p>
          {subtitle && (
            <p className="mt-0.5 text-[10px] uppercase tracking-widest text-text-muted">
              {subtitle}
            </p>
          )}
        </div>
        {badge && (
          <span
            className={`shrink-0 border px-1.5 py-px text-[9px] font-bold uppercase tracking-wider ${healthChip(badgeHealth)}`}
          >
            {badge}
          </span>
        )}
      </div>
      <div className="mt-3 h-px bg-border" />
      <div className="flex-1 px-5 py-4">{children}</div>
    </div>
  );
}

/**
 * Centered empty/single-user state for a tile (brand/dashboard.md: icon + heading +
 * muted description). Used pre-launch when a table is near-empty.
 */
export function OpsEmpty({
  icon,
  heading,
  description,
}: {
  icon?: ReactNode;
  heading: string;
  description?: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 py-6 text-center">
      {icon && <div className="text-text-muted">{icon}</div>}
      <p className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
        {heading}
      </p>
      {description && (
        <p className="max-w-[28ch] text-[11px] text-text-muted">{description}</p>
      )}
    </div>
  );
}

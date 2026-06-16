// Pure, dependency-free sidebar-mode logic. Lives outside the client component
// so Vitest can import it (the sidebar pulls next-auth / next/navigation, which
// are banned in tests). No React, no DOM.

export type SidebarMode = "expanded" | "collapsed" | "hover";

const VALID: readonly SidebarMode[] = ["expanded", "collapsed", "hover"];

export const SIDEBAR_MODE_KEY = "kn-sidebar-mode";
export const LEGACY_COLLAPSED_KEY = "kn-sidebar-collapsed";

/**
 * Whether the sidebar should render in its narrow (icon-only) form.
 * - expanded  -> never collapsed
 * - collapsed -> always collapsed
 * - hover     -> collapsed unless the pointer is over it
 */
export function resolveSidebarCollapsed(mode: SidebarMode, hovering: boolean): boolean {
  if (mode === "collapsed") return true;
  if (mode === "hover") return !hovering;
  return false;
}

/**
 * Resolve the persisted sidebar mode, migrating the legacy boolean key.
 * Precedence: new enum key -> legacy boolean ("true" => collapsed) -> "expanded".
 * `get` is injected (localStorage.getItem) so this stays pure + testable.
 */
export function migrateSidebarMode(get: (key: string) => string | null): SidebarMode {
  const stored = get(SIDEBAR_MODE_KEY);
  if (stored && (VALID as readonly string[]).includes(stored)) return stored as SidebarMode;
  return get(LEGACY_COLLAPSED_KEY) === "true" ? "collapsed" : "expanded";
}

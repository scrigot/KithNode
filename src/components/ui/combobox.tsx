"use client";

import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  type KeyboardEvent,
} from "react";
import { cn } from "@/lib/utils";

const ACRONYM_STOPWORDS = new Set([
  "of",
  "at",
  "the",
  "and",
  "for",
  "in",
  "&",
]);

/** Lowercased word-initials of significant words, e.g. UNC Chapel Hill -> "uncch". */
function acronymOf(name: string): string {
  return name
    .replace(/[-,]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !ACRONYM_STOPWORDS.has(w.toLowerCase()))
    .map((w) => w[0])
    .join("")
    .toLowerCase();
}

/**
 * Minimal typeahead combobox. No external deps (cmdk/popover not installed).
 *
 * - Options are supplied lazily via `loadOptions`, which is awaited the first
 *   time the field is focused/typed. This lets callers `import()` a large JSON
 *   dataset only on the route that needs it.
 * - Filtering is debounced (~150ms), capped at `maxResults`, and ranked
 *   case-insensitively startsWith-before-includes.
 * - Free-text fallback: Enter with no highlighted option commits the raw query.
 * - Keyboard: ArrowUp/ArrowDown move, Enter selects, Escape closes.
 *
 * Dense Bloomberg styling: zero radius, accent-teal active state, mono labels.
 */
export function Combobox({
  value,
  onSelect,
  loadOptions,
  placeholder,
  debounceMs = 150,
  maxResults = 50,
  allowFreeText = true,
  commitOnBlur = false,
  matchAcronyms = false,
  className,
  inputClassName,
  ariaLabel,
}: {
  value: string;
  onSelect: (value: string) => void;
  /** Resolves the full option list (e.g. dynamic import of a JSON dataset). */
  loadOptions: () => Promise<string[]>;
  placeholder?: string;
  debounceMs?: number;
  maxResults?: number;
  allowFreeText?: boolean;
  /** Commit the typed query on blur. For required free-text fields where a
   *  type-then-click-away must not silently drop the value (e.g. University). */
  commitOnBlur?: boolean;
  /** Also match word-initials so "UNC" finds "University of North Carolina...". */
  matchAcronyms?: boolean;
  className?: string;
  inputClassName?: string;
  ariaLabel?: string;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [debounced, setDebounced] = useState(value);
  const [highlight, setHighlight] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Keep the visible input in sync when the parent resets `value`.
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Debounce the query that drives filtering.
  useEffect(() => {
    const t = globalThis.setTimeout(() => setDebounced(query), debounceMs);
    return () => globalThis.clearTimeout(t);
  }, [query, debounceMs]);

  // Lazy-load the dataset the first time it's needed.
  const ensureLoaded = useCallback(async () => {
    if (options !== null || loading) return;
    setLoading(true);
    try {
      const opts = await loadOptions();
      setOptions(opts);
    } catch {
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, [options, loading, loadOptions]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: globalThis.MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as globalThis.Node)) {
        setOpen(false);
      }
    };
    globalThis.document.addEventListener("mousedown", onDown);
    return () => globalThis.document.removeEventListener("mousedown", onDown);
  }, [open]);

  const results = useMemo(() => {
    if (!options) return [];
    const q = debounced.trim().toLowerCase();
    if (!q) return options.slice(0, maxResults);
    const starts: string[] = [];
    const includes: string[] = [];
    const acronyms: string[] = [];
    for (const opt of options) {
      const lower = opt.toLowerCase();
      if (lower.startsWith(q)) starts.push(opt);
      else if (lower.includes(q)) includes.push(opt);
      else if (matchAcronyms && acronymOf(opt).startsWith(q)) acronyms.push(opt);
      if (starts.length >= maxResults) break;
    }
    return [...starts, ...includes, ...acronyms].slice(0, maxResults);
  }, [options, debounced, maxResults, matchAcronyms]);

  // Reset the highlighted row whenever the result set changes.
  useEffect(() => {
    setHighlight(0);
  }, [results]);

  // Keep the highlighted row scrolled into view.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.children[highlight] as
      | HTMLElement
      | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [highlight, open]);

  const commit = (v: string) => {
    onSelect(v);
    setQuery(v);
    setOpen(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      setHighlight((h) => Math.min(h + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const picked = results[highlight];
      if (picked) commit(picked);
      else if (allowFreeText && query.trim()) commit(query.trim());
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-label={ariaLabel}
        value={query}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          void ensureLoaded();
        }}
        onFocus={() => {
          setOpen(true);
          void ensureLoaded();
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          // Commit typed-but-uncommitted text when leaving the field (e.g. the
          // user types a school then clicks Continue without pressing Enter).
          // Row-clicks use onMouseDown+preventDefault so they never blur, so this
          // can't override a dropdown selection.
          if (commitOnBlur && allowFreeText && query.trim() && query.trim() !== value) {
            commit(query.trim());
          }
        }}
        className={cn(
          "h-8 w-full min-w-0 border border-input bg-muted px-2.5 py-1 text-sm text-foreground transition-colors outline-none placeholder:text-muted-foreground focus:border-accent-teal",
          inputClassName,
        )}
      />
      {open && (query.trim() || results.length > 0 || loading) && (
        <div
          ref={listRef}
          className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto border border-white/[0.12] bg-bg-card shadow-2xl"
        >
          {loading && options === null ? (
            <div className="px-2.5 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
              Loading...
            </div>
          ) : results.length === 0 ? (
            <div className="px-2.5 py-2 text-[11px] text-muted-foreground">
              {allowFreeText && query.trim()
                ? `Use "${query.trim()}"`
                : "No matches"}
            </div>
          ) : (
            results.map((opt, i) => (
              <button
                key={opt}
                type="button"
                // onMouseDown (not onClick) so selection fires before the
                // input's blur/outside-click handler closes the list.
                onMouseDown={(e) => {
                  e.preventDefault();
                  commit(opt);
                }}
                onMouseEnter={() => setHighlight(i)}
                className={cn(
                  "block w-full truncate px-2.5 py-1.5 text-left text-[12px] transition-colors",
                  i === highlight
                    ? "bg-accent-teal/15 text-accent-teal"
                    : "text-foreground hover:bg-white/[0.04]",
                )}
              >
                {opt}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

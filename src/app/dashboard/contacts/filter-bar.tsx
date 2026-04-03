"use client";

import { Input } from "@/components/ui/input";

const TIERS = ["all", "hot", "warm", "monitor", "cold"] as const;

const TIER_BUTTON_STYLES: Record<string, string> = {
  hot: "data-[active=true]:bg-red-500/20 data-[active=true]:text-red-400 data-[active=true]:border-red-500/30",
  warm: "data-[active=true]:bg-blue-500/20 data-[active=true]:text-blue-400 data-[active=true]:border-blue-500/30",
  monitor: "data-[active=true]:bg-amber-500/20 data-[active=true]:text-amber-400 data-[active=true]:border-amber-500/30",
  cold: "data-[active=true]:bg-zinc-500/20 data-[active=true]:text-zinc-400 data-[active=true]:border-zinc-500/30",
  all: "data-[active=true]:bg-primary/20 data-[active=true]:text-primary data-[active=true]:border-primary/30",
};

export type SortOption = "score" | "name" | "company";

export function FilterBar({
  search,
  onSearchChange,
  activeTier,
  onTierChange,
  sort,
  onSortChange,
  resultCount,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  activeTier: string;
  onTierChange: (tier: string) => void;
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
  resultCount: number;
}) {
  return (
    <div className="space-y-3">
      {/* Search + Sort row */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search name, title, company..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-8 flex-1 bg-muted text-xs placeholder:text-muted-foreground"
        />
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
          className="h-8 border border-border bg-muted px-2 text-xs text-foreground"
        >
          <option value="score">Score</option>
          <option value="name">Name</option>
          <option value="company">Company</option>
        </select>
        <span className="whitespace-nowrap text-[10px] text-muted-foreground">
          {resultCount} results
        </span>
      </div>

      {/* Tier filter toggles */}
      <div className="flex gap-1">
        {TIERS.map((tier) => (
          <button
            key={tier}
            data-active={activeTier === tier}
            onClick={() => onTierChange(tier)}
            className={`border border-border px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground ${TIER_BUTTON_STYLES[tier]}`}
          >
            {tier}
          </button>
        ))}
      </div>
    </div>
  );
}

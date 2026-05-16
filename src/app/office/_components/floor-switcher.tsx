"use client";

const FLOORS = [1, 2, 3, 4, 5] as const;
const ENABLED: Record<number, boolean> = { 4: true };

export function FloorSwitcher({ activeFloor }: { activeFloor: number }) {
  return (
    <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest">
      <span className="mr-2 text-muted-foreground/60">FLOOR</span>
      {FLOORS.map((floor) => {
        const isActive = floor === activeFloor;
        const isEnabled = ENABLED[floor] === true;
        return (
          <button
            key={floor}
            type="button"
            disabled={!isEnabled}
            title={isEnabled ? `Floor ${floor}` : "Coming in v2"}
            className={
              isActive
                ? "border border-accent-teal bg-accent-teal px-2 py-1 font-bold text-[#0A1628]"
                : isEnabled
                  ? "border border-white/[0.08] bg-bg-secondary px-2 py-1 text-foreground hover:border-accent-teal/40 hover:text-accent-teal"
                  : "cursor-not-allowed border border-white/[0.06] bg-bg-secondary px-2 py-1 text-muted-foreground/40"
            }
          >
            {floor}
          </button>
        );
      })}
    </div>
  );
}

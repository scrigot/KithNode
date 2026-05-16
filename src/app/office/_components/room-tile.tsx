"use client";

import type { OfficeRoom } from "./types";

const STATUS_DOT: Record<string, string> = {
  idle: "bg-muted-foreground/40",
  active: "bg-accent-teal",
  working: "bg-amber-400 animate-pulse",
};

const ADAPTER_BADGE: Record<string, string> = {
  anthropic_sdk: "LIVE",
  claude_code_cli: "CLI",
  stub: "STUB",
};

export function RoomTile({
  room,
  onOpen,
}: {
  room: OfficeRoom;
  onOpen: (room: OfficeRoom) => void;
}) {
  const adapterBadge = ADAPTER_BADGE[room.adapterType] ?? "STUB";
  const isLive = room.adapterType === "anthropic_sdk";

  return (
    <button
      type="button"
      onClick={() => onOpen(room)}
      className="group relative flex h-full w-full flex-col justify-between border border-white/[0.06] bg-bg-secondary p-3 text-left transition-colors duration-150 hover:border-accent-teal/40 hover:bg-white/[0.02]"
      style={{
        // Pixel-art aesthetic: sharp corners + crisp edges.
        imageRendering: "pixelated",
      }}
    >
      {/* Status + adapter badge row */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-block h-2 w-2 ${STATUS_DOT[room.status]}`}
          />
          <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
            {room.role.replace(/_/g, " ")}
          </span>
        </div>
        <span
          className={
            isLive
              ? "border border-accent-teal/40 bg-accent-teal/10 px-1 font-mono text-[8px] font-bold tracking-wider text-accent-teal"
              : "border border-white/[0.08] bg-white/[0.04] px-1 font-mono text-[8px] font-bold tracking-wider text-muted-foreground"
          }
        >
          {adapterBadge}
        </span>
      </div>

      {/* Pixel-art door + agent body */}
      <div className="flex flex-1 items-center justify-center py-4">
        <div className="relative flex flex-col items-center">
          {/* Agent figure (pixel-style) */}
          <div className="relative h-10 w-7">
            {/* Head */}
            <div className="absolute top-0 left-1/2 h-3 w-3 -translate-x-1/2 bg-amber-300" />
            {/* Body */}
            <div
              className={
                isLive
                  ? "absolute top-3 left-0 h-5 w-7 bg-accent-teal"
                  : room.role === "debugger"
                    ? "absolute top-3 left-0 h-5 w-7 bg-red-500"
                    : room.role === "qa_tester" || room.role === "test_engineer"
                      ? "absolute top-3 left-0 h-5 w-7 bg-green-500"
                      : room.role === "refactor"
                        ? "absolute top-3 left-0 h-5 w-7 bg-slate-400"
                        : "absolute top-3 left-0 h-5 w-7 bg-sky-500"
              }
            />
            {/* Legs */}
            <div className="absolute top-8 left-0 h-2 w-3 bg-slate-700" />
            <div className="absolute top-8 right-0 h-2 w-3 bg-slate-700" />
          </div>
          {/* Door beneath agent */}
          <div className="mt-2 h-1 w-10 bg-muted-foreground/40" />
        </div>
      </div>

      {/* Name plate */}
      <div className="border-t border-white/[0.06] bg-[#0B1424] px-2 py-1 group-hover:border-accent-teal/30">
        <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-foreground">
          {room.name}
        </div>
      </div>
    </button>
  );
}

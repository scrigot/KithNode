"use client";

import { useState } from "react";
import { RoomTile } from "./room-tile";
import { ChatSideSheet } from "./chat-side-sheet";
import type { OfficeRoom } from "./types";

// Floor 4 grid: 6 columns wide x 2 rows tall.
const GRID_COLS = 6;
const GRID_ROWS = 2;

export function FloorCanvas({ rooms }: { rooms: OfficeRoom[] }) {
  const [activeRoom, setActiveRoom] = useState<OfficeRoom | null>(null);

  return (
    <div className="relative flex-1 overflow-auto bg-[#0A1628] p-6">
      {/* Building outline */}
      <div className="relative mx-auto h-full max-w-[1280px] border-2 border-[#1A2942]">
        {/* Grid: 6 cols x 2 rows, with corridor between */}
        <div
          className="relative grid h-full w-full gap-2 p-4"
          style={{
            gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${GRID_ROWS}, minmax(160px, 1fr))`,
          }}
        >
          {/* Central horizontal corridor: between row 1 and row 2 */}
          <div
            className="pointer-events-none absolute left-0 right-0 z-0 flex items-center justify-center border-y border-[#1A2942] bg-[#11253D]/40 font-mono text-[9px] uppercase tracking-widest text-muted-foreground/40"
            style={{
              top: "calc(50% - 12px)",
              height: "24px",
            }}
          >
            CORRIDOR — FLOOR 4
          </div>

          {rooms.map((room) => (
            <div
              key={room.id}
              className="relative z-10"
              style={{
                gridColumnStart: room.position.x + 1,
                gridColumnEnd: room.position.x + 1 + room.position.w,
                gridRowStart: room.position.y + 1,
                gridRowEnd: room.position.y + 1 + room.position.h,
              }}
            >
              <RoomTile room={room} onOpen={setActiveRoom} />
            </div>
          ))}
        </div>
      </div>

      <ChatSideSheet
        room={activeRoom}
        onClose={() => setActiveRoom(null)}
      />
    </div>
  );
}

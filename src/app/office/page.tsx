import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { FloorSwitcher } from "./_components/floor-switcher";
import { FloorCanvas } from "./_components/floor-canvas";
import type { OfficeRoom, RoomPosition } from "./_components/types";

const FLOOR = 4;

export default async function OfficePage() {
  const session = await auth();
  // Layout already redirected unauthenticated users — narrow the type.
  const userId = session?.user?.email ?? "";

  const rooms = await prisma.agentRoom.findMany({
    where: { userId, floor: FLOOR },
    orderBy: { slug: "asc" },
  });

  const officeRooms: OfficeRoom[] = rooms.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    role: r.role,
    floor: r.floor,
    adapterType: r.adapterType,
    position: r.position as unknown as RoomPosition,
    status: "idle",
  }));

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-3">
        <FloorSwitcher activeFloor={FLOOR} />
        <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">
          <span>FLOOR 4 — ENGINEERING</span>
          <span className="text-accent-teal">{officeRooms.length} ROOMS</span>
        </div>
      </div>
      <FloorCanvas rooms={officeRooms} />
    </div>
  );
}

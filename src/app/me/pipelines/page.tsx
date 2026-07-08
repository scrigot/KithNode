import { prisma, meUserEmail } from "@/lib/me/db";
import { ensurePipelines, daysSince, type Stage } from "@/lib/me/pipelines";
import Board, { type BoardEntry, type BoardPipeline } from "./board";

export default async function MePipelines() {
  const userId = meUserEmail();
  await ensurePipelines(userId);

  const [pipelines, entriesRaw] = await Promise.all([
    prisma.mePipeline.findMany({ where: { userId }, orderBy: { order: "asc" } }),
    prisma.mePipelineEntry.findMany({
      where: { userId },
      include: { contact: { include: { memory: true } } },
    }),
  ]);

  const boardPipelines: BoardPipeline[] = pipelines.map((p) => ({
    id: p.id,
    name: p.name,
    cadenceDays: p.cadenceDays,
    stages: (p.stages as unknown as Stage[]) ?? [],
  }));

  const entries: BoardEntry[] = entriesRaw.map((e) => ({
    id: e.id,
    pipelineId: e.pipelineId,
    stage: e.stage,
    daysSince: daysSince(e.lastTouchAt),
    relationshipType: e.contact.memory?.relationshipType || "",
    contact: {
      id: e.contact.id,
      name: e.contact.name,
      firmName: e.contact.firmName || "",
      title: e.contact.title || "",
      linkedInUrl: e.contact.linkedInUrl || "",
    },
  }));

  return (
    <div className="px-8 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Pipelines</h1>
        <p className="mt-1 text-[14px] text-[#B7AFA7]">
          Track relationships by org. Cards go cold when untouched past each pipeline&rsquo;s cadence.
        </p>
      </div>
      <Board pipelines={boardPipelines} entries={entries} />
    </div>
  );
}

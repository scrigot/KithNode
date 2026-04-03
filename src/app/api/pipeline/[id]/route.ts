import { NextRequest, NextResponse } from "next/server";
import { addToPipeline, updatePipelineStage } from "@/lib/api";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const result = await addToPipeline(Number(id));
    return NextResponse.json(result);
  } catch (error) {
    const status = (error as { status?: number }).status || 500;
    return NextResponse.json({ error: "Failed to add to pipeline" }, { status });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  try {
    const result = await updatePipelineStage(Number(id), body.stage, body.notes);
    return NextResponse.json(result);
  } catch (error) {
    const status = (error as { status?: number }).status || 500;
    return NextResponse.json({ error: "Failed to update stage" }, { status });
  }
}

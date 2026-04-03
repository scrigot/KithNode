import { NextResponse } from "next/server";
import { getPipeline } from "@/lib/api";

export async function GET() {
  try {
    const data = await getPipeline();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ stages: [], contacts: {}, total: 0 });
  }
}

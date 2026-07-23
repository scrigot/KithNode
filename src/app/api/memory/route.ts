import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { routeError } from "@/lib/api-response";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return routeError("Sign in to view memory.", 401, "unauthorized", "Sign in and try again.");
  const { data: memories, error } = await supabase
    .from("AssistantMemory")
    .select("*")
    .eq("userId", userId)
    .order("updatedAt", { ascending: false })
    .limit(500);
  if (error) return routeError("Memory is temporarily unavailable.", 503, "memory_unavailable");

  const layerFor = (kind: string) => {
    if (["relationship", "contact", "network"].includes(kind)) return "relationships";
    if (["outcome", "timeline", "application", "deadline"].includes(kind)) return "timeline";
    return "identity";
  };
  const layered = (memories || []).map((memory) => ({
    ...memory,
    layer: layerFor(memory.kind),
    freshness: memory.updatedAt,
    approvalState: memory.active ? "approved" : "forgotten",
    downstreamUse:
      layerFor(memory.kind) === "relationships"
        ? ["network paths", "outreach", "meeting prep"]
        : layerFor(memory.kind) === "timeline"
          ? ["application priorities", "deadlines", "next actions"]
          : ["opportunity matching", "resume tailoring", "recommendations"],
  }));
  return NextResponse.json({
    memories: layered,
    layers: {
      identity: layered.filter((memory) => memory.layer === "identity"),
      relationships: layered.filter((memory) => memory.layer === "relationships"),
      timeline: layered.filter((memory) => memory.layer === "timeline"),
    },
  });
}


import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectedPreview } from "@/lib/integrations/read";
import { isIntegrationProvider } from "@/lib/integrations/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { provider } = await params;
  if (!isIntegrationProvider(provider)) return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
  try {
    const preview = await connectedPreview(userId, provider);
    if (!preview) return NextResponse.json({ error: "Reconnect required" }, { status: 409 });
    return NextResponse.json(preview);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Provider unavailable" },
      { status: 502 },
    );
  }
}

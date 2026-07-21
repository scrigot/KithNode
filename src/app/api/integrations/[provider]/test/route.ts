import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { providerProfile } from "@/lib/integrations/providers";
import { validAccessToken } from "@/lib/integrations/tokens";
import { isIntegrationProvider } from "@/lib/integrations/types";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { provider } = await params;
  if (!isIntegrationProvider(provider)) return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
  try {
    const token = await validAccessToken(userId, provider);
    if (!token) return NextResponse.json({ error: "Reconnect required" }, { status: 409 });
    const profile = await providerProfile(provider, token.accessToken);
    await prisma.integrationConnection.update({
      where: { id: token.connection.id },
      data: { status: "connected", lastCheckedAt: new Date(), lastError: "", email: profile.email },
    });
    return NextResponse.json({ ok: true, provider, email: profile.email });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 300) : "Connection test failed";
    await prisma.integrationConnection.updateMany({
      where: { userId, provider },
      data: { status: "error", lastCheckedAt: new Date(), lastError: message },
    });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createOAuthState } from "@/lib/integrations/crypto";
import { authorizationUrl } from "@/lib/integrations/providers";
import { isIntegrationProvider } from "@/lib/integrations/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { provider } = await params;
  if (!isIntegrationProvider(provider)) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
  }
  try {
    const redirectUri = `${request.nextUrl.origin}/api/integrations/${provider}/callback`;
    const state = createOAuthState({ userId, provider, redirectUri });
    return NextResponse.redirect(authorizationUrl(provider, redirectUri, state));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Integration is not configured" },
      { status: 503 },
    );
  }
}

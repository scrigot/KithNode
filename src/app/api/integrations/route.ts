import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { providerConfigured } from "@/lib/integrations/providers";
import { INTEGRATION_PROVIDERS, isIntegrationProvider } from "@/lib/integrations/types";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const connections = await prisma.integrationConnection.findMany({
    where: { userId },
    select: {
      provider: true,
      email: true,
      scopes: true,
      status: true,
      expiresAt: true,
      lastCheckedAt: true,
      lastError: true,
      updatedAt: true,
    },
  });
  return NextResponse.json({
    services: [
      {
        id: "ai",
        label: "Career Copilot AI",
        configured: Boolean(process.env.AI_GATEWAY_API_KEY || process.env.ANTHROPIC_API_KEY),
        validation: "Validated by sending a Copilot message",
      },
      {
        id: "database",
        label: "Database",
        configured: Boolean(process.env.DATABASE_URL),
        validation: "Connected for this signed-in request",
      },
      {
        id: "email",
        label: "Product email",
        configured: Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL),
        validation: "Configured; sends remain action-gated",
      },
      {
        id: "enrichment",
        label: "Contact enrichment",
        configured: Boolean(process.env.PDL_API_KEY || process.env.HUNTER_API_KEY || process.env.APOLLO_API_KEY),
        validation: "Validated when enrichment is requested",
      },
      {
        id: "search",
        label: "Job source discovery",
        configured: Boolean(process.env.BRAVE_SEARCH_API_KEY),
        optional: true,
        validation: "Optional; verified catalog and manual official URLs remain available",
      },
    ],
    integrations: INTEGRATION_PROVIDERS.map((provider) => ({
      provider,
      configured: providerConfigured(provider),
      connection: connections.find((connection) => connection.provider === provider) ?? null,
    })),
  });
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (!isIntegrationProvider(body.provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }
  await prisma.integrationConnection.deleteMany({ where: { userId, provider: body.provider } });
  return NextResponse.json({ disconnected: true, provider: body.provider });
}

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
  const serviceDescriptors = [
    {
      id: "ai",
      label: "Career Copilot AI",
      category: "ai",
      configured: Boolean(process.env.AI_GATEWAY_API_KEY || process.env.ANTHROPIC_API_KEY),
      capabilities: ["chat", "planning", "document proposals"],
      validation: "Validated by sending a Copilot message",
      recoveryAction: "A founder must configure the server AI capability.",
    },
    {
      id: "database",
      label: "Database",
      category: "data",
      configured: Boolean(process.env.DATABASE_URL),
      capabilities: ["records", "history", "approvals"],
      validation: "Connected for this signed-in request",
      recoveryAction: "A founder must restore the server database connection.",
    },
    {
      id: "email",
      label: "Product email",
      category: "communication",
      configured: Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL),
      capabilities: ["notifications"],
      validation: "Configured; sends remain action-gated",
      recoveryAction: "A founder must configure product email.",
    },
    {
      id: "enrichment",
      label: "Contact enrichment",
      category: "enrichment",
      configured: Boolean(process.env.PDL_API_KEY || process.env.HUNTER_API_KEY || process.env.APOLLO_API_KEY),
      capabilities: ["contact enrichment"],
      validation: "Validated when enrichment is requested",
      recoveryAction: "Use the browser companion for reviewed facts, or ask a founder to restore enrichment.",
    },
    {
      id: "search",
      label: "Job source discovery",
      category: "search",
      configured: Boolean(process.env.BRAVE_SEARCH_API_KEY),
      capabilities: ["official source resolution"],
      optional: true,
      validation: "Optional; verified catalog and manual official URLs remain available",
      recoveryAction: "Add an official career URL manually. Search expansion is optional.",
    },
  ];
  const integrationDescriptors = INTEGRATION_PROVIDERS.map((provider) => {
    const connection = connections.find((item) => item.provider === provider) ?? null;
    const configured = providerConfigured(provider);
    const status = !configured
      ? "unavailable"
      : !connection
        ? "configured"
        : connection.status === "connected"
          ? "connected"
          : connection.status === "expired"
            ? "expired"
            : "degraded";
    return {
      provider,
      configured,
      connection,
      descriptor: {
        provider,
        category: "connected_account",
        connectionMode: "oauth",
        capabilities: provider === "google" ? ["email_read", "calendar_read"] : ["email_read", "calendar_read"],
        status,
        lastCheck: connection?.lastCheckedAt || connection?.updatedAt || null,
        safeErrorCode: connection?.lastError ? "provider_connection_error" : "",
        recoveryAction:
          status === "expired" || status === "degraded"
            ? `Reconnect ${provider} and test the connection.`
            : status === "unavailable"
              ? `A founder must configure ${provider} OAuth before you can connect it.`
              : status === "configured"
                ? `Connect ${provider} when you want KithNode to read recruiting context.`
                : "No action needed.",
      },
    };
  });
  return NextResponse.json({
    services: serviceDescriptors.map((service) => ({
      ...service,
      descriptor: {
        provider: service.id,
        category: service.category,
        connectionMode: "server",
        capabilities: service.capabilities,
        status: service.configured ? "configured" : service.optional ? "disabled" : "unavailable",
        lastCheck: new Date().toISOString(),
        safeErrorCode: service.configured ? "" : `${service.id}_not_configured`,
        recoveryAction: service.recoveryAction,
      },
    })),
    integrations: integrationDescriptors,
    descriptors: [
      ...serviceDescriptors.map((service) => ({
        provider: service.id,
        category: service.category,
        connectionMode: "server",
        capabilities: service.capabilities,
        status: service.configured ? "configured" : service.optional ? "disabled" : "unavailable",
        lastCheck: new Date().toISOString(),
        safeErrorCode: service.configured ? "" : `${service.id}_not_configured`,
        recoveryAction: service.recoveryAction,
      })),
      ...integrationDescriptors.map((item) => item.descriptor),
    ],
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

import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { AI_MODELS } from "@/lib/ai-models";
import { extensionIdentity } from "@/lib/extension-auth";
import { supabase } from "@/lib/supabase";
import { anthropicCost } from "@/lib/ai-cost";
import {
  linkedinProfileSchema,
  buildLinkedInPrompt,
  validateProfileText,
} from "@/lib/linkedin-extract";

/**
 * POST /api/extension/extract — the capture extension posts the rendered TEXT
 * of a LinkedIn profile; we return the owner's structured fields via the AI
 * Gateway. No DB write here: the popup shows the result for review, then saves
 * through /api/extension/ingest. Auth-gated; not credit-gated yet (personal
 * tool) — wire a credit charge here when this ships in-product.
 */
export async function POST(request: NextRequest) {
  const identity = await extensionIdentity(request, "profiles:write");
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const valid = validateProfileText(body?.pageText);
  if (!valid.ok) {
    return NextResponse.json({ error: valid.error }, { status: 400 });
  }

  try {
    const { object, usage, response } = await generateObject({
      model: gateway(AI_MODELS.default),
      schema: linkedinProfileSchema,
      messages: [
        { role: "user", content: [{ type: "text", text: buildLinkedInPrompt(valid.text) }] },
      ],
    });

    // Best-effort cost telemetry (never load-bearing), mirroring the resume route.
    const model = response?.modelId ?? AI_MODELS.default;
    try {
      void supabase
        .from("api_cost_log")
        .insert({
          provider: "anthropic",
          endpoint: "gateway:generateObject",
          tokens_in: usage?.inputTokens ?? 0,
          tokens_out: usage?.outputTokens ?? 0,
          cost_usd: anthropicCost(model, usage),
          meta: { model, source: "linkedin_extension" },
        })
        .then(() => {}, () => {});
    } catch {
      // telemetry is never load-bearing
    }

    return NextResponse.json(object);
  } catch (error) {
    console.error("LinkedIn extract error:", error);
    return NextResponse.json({ error: "Extraction failed" }, { status: 500 });
  }
}

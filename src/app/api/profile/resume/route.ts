import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { generateObject } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { requireSubscription } from "@/lib/subscription";
import { requireCredits, CREDIT_COSTS } from "@/lib/credits";
import { anthropicCost } from "@/lib/ai-cost";
import {
  resumeSchema,
  validateResumePdf,
  buildResumePrompt,
  buildResumeResult,
} from "@/lib/resume-extract";

/**
 * POST /api/profile/resume
 *
 * Body: { pdf: base64 string }. Parses the resume with an Anthropic model via
 * the AI Gateway and returns the extracted profile as JSON. The PDF is held in
 * memory only and is NEVER stored anywhere. Auth + subscription gated like the
 * outreach draft route.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userEmail = session.user.email;

  const gate = await requireSubscription(userEmail);
  if (gate) return gate;

  const creditGate = await requireCredits(userEmail, CREDIT_COSTS.resume, "resume");
  if (creditGate) return creditGate;

  const body = await request.json().catch(() => ({}));
  const valid = validateResumePdf(body?.pdf);
  if (!valid.ok) {
    return NextResponse.json({ error: valid.error }, { status: 400 });
  }

  try {
    const { object, usage, response } = await generateObject({
      model: gateway("anthropic/claude-sonnet-4.5"),
      schema: resumeSchema,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: buildResumePrompt() },
            {
              type: "file",
              data: valid.bytes,
              mediaType: "application/pdf",
              filename: "resume.pdf",
            },
          ],
        },
      ],
    });

    // Fire-and-forget cost telemetry → api_cost_log (mirrors the draft route).
    // Best-effort: a telemetry insert failure MUST never break extraction.
    const model = response?.modelId ?? "claude-sonnet-4.5";
    try {
      void supabase
        .from("api_cost_log")
        .insert({
          provider: "anthropic",
          endpoint: "gateway:generateObject",
          tokens_in: usage?.inputTokens ?? 0,
          tokens_out: usage?.outputTokens ?? 0,
          cost_usd: anthropicCost(model, usage),
          meta: { model, source: "resume" },
        })
        .then(() => {}, () => {});
    } catch {
      // cost telemetry is never load-bearing
    }

    // Post-process: canonicalize rows and derive flat fields for consistency.
    // Extraction is NEVER persisted here — the client prefills the form and
    // the user reviews + saves via the preferences UI.
    return NextResponse.json(buildResumeResult(object));
  } catch (error) {
    console.error("Resume extraction error:", error);
    return NextResponse.json(
      { error: "Failed to extract resume" },
      { status: 500 },
    );
  }
}

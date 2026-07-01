import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { z } from "zod";
import { PERSONAL_MODE } from "@/lib/me/config";
import { gradeResume, type Track } from "@/lib/me/grade-resume";
import {
  resumeSignalsSchema,
  buildSignalsPrompt,
  toResumeSignals,
  signalsFromDoc,
  validateResumePdf,
} from "@/lib/me/resume-signals";
import type { ResumeSignals } from "@/lib/me/grade-resume";
import { normalizeDoc } from "@/lib/me/resume-doc";
import { lintResume, type LintWarning } from "@/lib/me/resume-text";

export const runtime = "nodejs";

const MODEL = "anthropic/claude-sonnet-4.5";
const TRACKS: Track[] = ["ai-consulting", "ai-engineering", "ai-generalist"];
const asTrack = (t: unknown): Track => (TRACKS.includes(t as Track) ? (t as Track) : "ai-consulting");

// Per-dimension qualitative feedback + bullet rewrites. LLM-driven, so opt-in
// (the live editor re-scores deterministically without it); only requested on
// upload or an explicit "AI feedback" click.
const notesSchema = z.object({
  notes: z
    .array(
      z.object({
        dimension: z.string(), // DimensionKey it addresses
        feedback: z.string(),
        suggestions: z.array(z.string()).max(4),
      }),
    )
    .max(7),
  rewrites: z
    .array(z.object({ before: z.string(), after: z.string() }))
    .max(6),
});

type Notes = z.infer<typeof notesSchema>;

/**
 * POST /api/me/resume/grade
 * Body: { track, pdf?: base64, content?: ResumeContent, withNotes?: boolean }
 *
 * Returns { score, track, dimensions, bonuses, deductions, signals, notes }.
 * Deterministic grade always; LLM notes only when withNotes (defaults true for a
 * PDF upload, false for live content re-scoring). The PDF is held in memory and
 * NEVER stored.
 */
export async function POST(req: NextRequest) {
  if (!PERSONAL_MODE) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const track = asTrack(body?.track);

  // Build signals from a PDF (upload) or from edited content (live re-score).
  let signals: ResumeSignals;
  let lint: LintWarning[] = [];
  let fromPdf = false;
  if (typeof body?.pdf === "string" && body.pdf.length > 0) {
    const valid = validateResumePdf(body.pdf);
    if (!valid.ok) return NextResponse.json({ error: valid.error }, { status: 400 });
    fromPdf = true;
    try {
      const { object } = await generateObject({
        model: gateway(MODEL),
        schema: resumeSignalsSchema,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: buildSignalsPrompt() },
              { type: "file", data: valid.bytes, mediaType: "application/pdf", filename: "resume.pdf" },
            ],
          },
        ],
      });
      signals = toResumeSignals(object);
    } catch (error) {
      console.error("Resume signal extraction error:", error);
      return NextResponse.json({ error: "Failed to read resume" }, { status: 502 });
    }
  } else {
    const doc = normalizeDoc(body?.content ?? {});
    signals = signalsFromDoc(doc);
    lint = lintResume(doc); // deterministic, always returned for the live editor
  }

  const graded = gradeResume(signals, track);

  // Notes default on for a fresh PDF, off for keystroke re-scoring.
  const withNotes = typeof body?.withNotes === "boolean" ? body.withNotes : fromPdf;
  let notes: Notes = { notes: [], rewrites: [] };
  if (withNotes) {
    notes = await generateNotes(graded.dimensions, signals, track, typeof body?.userContext === "string" ? body.userContext : "");
  }

  return NextResponse.json({ ...graded, signals, lint, notes });
}

async function generateNotes(
  dimensions: { key: string; label: string; score: number; reasons: string[] }[],
  signals: ResumeSignals,
  track: Track,
  userContext: string,
): Promise<Notes> {
  const weakest = [...dimensions].sort((a, b) => a.score - b.score).slice(0, 3);
  const prompt = `You are a recruiter for ${track.replace("-", " ")} roles giving a candidate concrete, non-generic feedback to raise their resume score.

Current dimension scores (0-100): ${dimensions.map((d) => `${d.label}=${d.score}`).join(", ")}.
Weakest dimensions to prioritize: ${weakest.map((d) => d.label).join(", ")}.
${userContext.trim() ? `\nCandidate's own context (use to make rewrites specific to them, but NEVER invent claims beyond it):\n${userContext.trim().slice(0, 1500)}\n` : ""}
Resume signals:
${JSON.stringify(signals).slice(0, 6000)}

Return:
- notes: up to 7 items, each { dimension (one of: aiFluency, relevantExperience, impact, brandStrength, technicalDepth, education, atsParseability), feedback (one sharp sentence), suggestions (1-4 concrete actions) }. Cover the weakest dimensions first.
- rewrites: up to 6 { before, after } pairs that rewrite the candidate's weakest existing bullets to be quantified, AI-specific, and recruiter-ready. Use ONLY bullets present in the signals; never fabricate achievements.`;
  try {
    const { object } = await generateObject({ model: gateway(MODEL), schema: notesSchema, prompt });
    return object;
  } catch {
    // Gateway unavailable (local dev) — the deterministic grade still stands.
    return { notes: [], rewrites: [] };
  }
}

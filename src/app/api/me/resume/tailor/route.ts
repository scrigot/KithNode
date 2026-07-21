import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { AI_MODELS } from "@/lib/ai-models";
import { z } from "zod";
import { prisma } from "@/lib/me/db";
import { careerWorkspaceEmail } from "@/lib/career-workspace-user";
import { gradeResume, type Track } from "@/lib/me/grade-resume";
import { normalizeDoc, type ResumeDoc, type EntriesSection } from "@/lib/me/resume-doc";
import { signalsFromDoc } from "@/lib/me/resume-signals";
import { matchEvidence, validateCitations, missingKeywords, type Evidence } from "@/lib/me/resume-rewrite";

export const runtime = "nodejs";

const MODEL = AI_MODELS.default;
const TRACKS: Track[] = ["ai-consulting", "ai-engineering", "ai-generalist"];
const asTrack = (t: unknown): Track => (TRACKS.includes(t as Track) ? (t as Track) : "ai-consulting");

const rewriteSchema = z.object({
  rewrites: z
    .array(z.object({ before: z.string(), after: z.string(), evidenceIds: z.array(z.string()).max(4) }))
    .max(8),
});

const docText = (doc: ResumeDoc) =>
  doc.sections
    .filter((s) => s.visible && s.kind === "entries")
    .flatMap((s) => (s as EntriesSection).entries.flatMap((e) => [e.title, e.org, ...e.bullets]))
    .join(" ");

/**
 * POST /api/me/resume/tailor
 * Body: { content, track, jobDescription }
 *
 * Promotes the user's REAL evidence toward a job description and reports a before/
 * after score delta + a missing-evidence list. Rewrites must cite evidence (the
 * citation guard drops fabrications); gaps are surfaced separately, never faked.
 */
export async function POST(req: NextRequest) {
  const userId = await careerWorkspaceEmail();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const track = asTrack(body?.track);
  const jd = typeof body?.jobDescription === "string" ? body.jobDescription : "";
  if (!jd.trim()) return NextResponse.json({ error: "jobDescription required" }, { status: 400 });

  const doc = normalizeDoc(body?.content ?? {});
  const before = gradeResume(signalsFromDoc(doc), track).overall;

  const bank = await prisma.meEvidence.findMany({ where: { userId } });
  const evidence: Evidence[] = bank.map((e) => ({ id: e.id, kind: e.kind, title: e.title, detail: e.detail, metric: e.metric, proofUrl: e.proofUrl }));
  const relevant = matchEvidence(jd, evidence, 8);
  const missing = missingKeywords(jd, docText(doc), evidence);

  let validated: ReturnType<typeof validateCitations> = [];
  try {
    const { object } = await generateObject({
      model: gateway(MODEL),
      schema: rewriteSchema,
      prompt: `You tailor a candidate's resume bullets toward a specific job, using ONLY their real evidence. Never invent achievements or add skills they don't have.

JOB DESCRIPTION:
${jd.slice(0, 4000)}

CANDIDATE'S REAL EVIDENCE (cite by id):
${relevant.map((e) => `[${e.id}] (${e.kind}) ${e.title} — ${e.detail} ${e.metric}`).join("\n") || "(none provided)"}

EXISTING BULLETS:
${docText(doc).slice(0, 4000)}

Return up to 8 rewrites, each { before (an existing bullet, verbatim), after (rewritten to foreground evidence relevant to THIS job, quantified), evidenceIds (which evidence ids justify it) }. Only rewrite bullets you can ground in the cited evidence. If a JD requirement has no matching evidence, do NOT fabricate it.`,
    });
    validated = validateCitations(object.rewrites, evidence);
  } catch {
    // Gateway unavailable → deterministic delta still returned (no rewrites).
    validated = [];
  }

  // Apply only VALID rewrites to a clone, then re-grade for an honest "after".
  const accepted = validated.filter((r) => r.ok);
  const afterDoc: ResumeDoc = JSON.parse(JSON.stringify(doc));
  for (const s of afterDoc.sections) {
    if (s.kind !== "entries") continue;
    for (const e of (s as EntriesSection).entries) {
      e.bullets = e.bullets.map((b) => {
        const hit = accepted.find((r) => r.before.trim() === b.trim());
        return hit ? hit.after : b;
      });
    }
  }
  const after = gradeResume(signalsFromDoc(afterDoc), track).overall;

  return NextResponse.json({
    before,
    after,
    gain: after - before,
    rewrites: validated, // includes ok flags + reasons so the UI can show why some were dropped
    missingEvidence: missing,
    consideredEvidence: relevant.map((e) => ({ id: e.id, title: e.title })),
  });
}

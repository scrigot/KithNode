import { generateObject } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { z } from "zod";

export interface ProfessorInput {
  name: string;
  title: string;
  bio: string;
  department: string;
  researchAreas: string[];
}

export interface ClassifierOutput {
  profType: "research-heavy" | "teaching-heavy" | "mixed";
  researchAreas: string[];
  recentPaper?: string;
  confidence: number;
}

const ClassifierSchema = z.object({
  profType: z.enum(["research-heavy", "teaching-heavy", "mixed"]),
  researchAreas: z.array(z.string()).min(0).max(5),
  recentPaper: z.string().optional(),
  confidence: z.number().min(0).max(1),
});

const SYSTEM_PROMPT =
  "You classify academic professors. Given a professor's title, bio, and department, decide if their work leans research-heavy, teaching-heavy, or mixed. Extract 2-5 specific research areas. If the bio names a recent paper or book title, return it as recentPaper. Return confidence 0-1 reflecting your certainty.";

function buildPrompt(prof: ProfessorInput): string {
  const existing =
    prof.researchAreas.length > 0 ? `\nKnown research areas (from taxonomy): ${prof.researchAreas.join(", ")}` : "";
  return `Name: ${prof.name}
Title: ${prof.title}
Department: ${prof.department}${existing}
Bio: ${prof.bio}`;
}

const DEFAULT_FALLBACK = (prof: ProfessorInput): ClassifierOutput => ({
  profType: "mixed",
  researchAreas: prof.researchAreas,
  confidence: 0,
});

export async function classifyProfessor(prof: ProfessorInput): Promise<ClassifierOutput> {
  try {
    const { object } = await generateObject({
      model: gateway("anthropic/claude-haiku-4.5"),
      schema: ClassifierSchema,
      system: SYSTEM_PROMPT,
      prompt: buildPrompt(prof),
    });

    return {
      profType: object.profType,
      researchAreas:
        object.researchAreas.length > 0
          ? object.researchAreas
          : prof.researchAreas,
      recentPaper: object.recentPaper,
      confidence: object.confidence,
    };
  } catch (err) {
    console.error(`[classifier] classifyProfessor failed for "${prof.name}":`, err);
    return DEFAULT_FALLBACK(prof);
  }
}

export async function classifyBatch(
  profs: ProfessorInput[],
  opts?: { concurrency?: number },
): Promise<ClassifierOutput[]> {
  const concurrency = opts?.concurrency ?? 5;
  const results: ClassifierOutput[] = new Array(profs.length);

  for (let i = 0; i < profs.length; i += concurrency) {
    const chunk = profs.slice(i, i + concurrency);
    const chunkResults = await Promise.all(chunk.map((p) => classifyProfessor(p)));
    for (let j = 0; j < chunkResults.length; j++) {
      results[i + j] = chunkResults[j];
    }
  }

  return results;
}

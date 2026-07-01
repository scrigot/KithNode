export interface OutcomeInput {
  summary?: unknown;
  takeaways?: unknown;
  nextSteps?: unknown;
  stage?: unknown;
}

export interface OutcomeData {
  summary: string;
  takeaways: string;
  nextSteps: string[];
  stage: OutcomeStage;
}

export type OutcomeStage = "talking" | "met" | "warm";

const MAX_TEXT = 3000;
const MAX_STEP = 240;
const STAGES = new Set(["talking", "met", "warm"]);

const clean = (value: unknown, max = MAX_TEXT) => (typeof value === "string" ? value.trim().slice(0, max) : "");

export function sanitizeOutcomeInput(input: OutcomeInput): OutcomeData {
  const nextSteps = Array.isArray(input.nextSteps)
    ? input.nextSteps.map((step) => clean(step, MAX_STEP)).filter(Boolean).slice(0, 10)
    : clean(input.nextSteps, MAX_TEXT).split(/\n+/).map((step) => clean(step, MAX_STEP)).filter(Boolean).slice(0, 10);
  const stage: OutcomeStage = typeof input.stage === "string" && STAGES.has(input.stage) ? (input.stage as OutcomeStage) : "met";
  return {
    summary: clean(input.summary),
    takeaways: clean(input.takeaways),
    nextSteps,
    stage,
  };
}

export function outcomeDetail(data: OutcomeData) {
  return [
    data.summary ? `Summary: ${data.summary}` : "",
    data.takeaways ? `Takeaways: ${data.takeaways}` : "",
    data.nextSteps.length ? `Next steps:\n${data.nextSteps.map((step) => `- ${step}`).join("\n")}` : "",
  ].filter(Boolean).join("\n\n");
}

export function appendMemoryNotes(existing: string, data: OutcomeData) {
  const addition = [
    "Coffee chat outcome:",
    data.summary ? `Summary: ${data.summary}` : "",
    data.takeaways ? `Takeaways: ${data.takeaways}` : "",
  ].filter(Boolean).join("\n");
  if (!addition.trim()) return existing;
  return [existing.trim(), addition].filter(Boolean).join("\n\n").slice(0, 4000);
}

export function mergeActionItems(existing: unknown, nextSteps: string[]) {
  const current = Array.isArray(existing)
    ? existing.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)
    : [];
  const seen = new Set<string>();
  return [...nextSteps, ...current]
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 25);
}

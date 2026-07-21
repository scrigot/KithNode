// Thin wrapper over the Vercel AI Gateway for /me features (coffee-prep, draft).
// Mirrors the graceful fallback in the existing outreach route: if the Gateway
// is unavailable (e.g. local dev without OIDC/key), callers fall back to a
// deterministic, non-AI result rather than erroring.
import { generateText } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { AI_MODELS } from "@/lib/ai-models";

const MODEL = AI_MODELS.default;

export interface GenResult {
  text: string;
  model: string;
  ok: boolean;
}

export async function generateMeText(prompt: string): Promise<GenResult> {
  try {
    const { text, response } = await generateText({ model: gateway(MODEL), prompt });
    return { text, model: response?.modelId ?? MODEL, ok: true };
  } catch {
    return { text: "", model: MODEL, ok: false };
  }
}

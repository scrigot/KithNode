/**
 * Anthropic token → USD cost estimation for the founder-ops cost-burn tile.
 *
 * Pure + unit-tested (see ai-cost.test.ts). This is the canonical application
 * pricing map now that production AI execution lives in Next.js.
 *
 * Rates verified against Anthropic's model documentation on 2026-07-10.
 * Temporary provider promotions are intentionally not baked into accounting.
 * Per-MTok = per 1,000,000 tokens.
 */

// model id (as reported by response.modelId / gateway slug) → [inputPerMTok, outputPerMTok] USD
const ANTHROPIC_PRICES: Record<string, [number, number]> = {
  "claude-sonnet-5": [3.0, 15.0],
  "anthropic/claude-sonnet-5": [3.0, 15.0],
  // Retained for historical telemetry rows.
  "claude-sonnet-4.5": [3.0, 15.0],
  "anthropic/claude-sonnet-4.5": [3.0, 15.0],
  "claude-sonnet-4-5": [3.0, 15.0],
  "claude-sonnet-4-20250514": [3.0, 15.0],
};

// Fallback to Sonnet pricing for any unrecognized model id so a row is still
// costed (never $0 silently when tokens were actually billed).
const DEFAULT_PRICE: [number, number] = [3.0, 15.0];

export interface TokenUsage {
  inputTokens?: number | undefined;
  outputTokens?: number | undefined;
}

/**
 * USD cost for an Anthropic call given its model id and token usage.
 * cost = in/1e6 * priceIn + out/1e6 * priceOut.
 */
export function anthropicCost(
  model: string | undefined,
  usage: TokenUsage | undefined,
): number {
  const [pin, pout] = ANTHROPIC_PRICES[model ?? ""] ?? DEFAULT_PRICE;
  const tokensIn = usage?.inputTokens ?? 0;
  const tokensOut = usage?.outputTokens ?? 0;
  return (tokensIn / 1_000_000) * pin + (tokensOut / 1_000_000) * pout;
}

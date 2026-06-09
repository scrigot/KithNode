/**
 * Anthropic token → USD cost estimation for the founder-ops cost-burn tile.
 *
 * Pure + unit-tested (see ai-cost.test.ts). Mirrors the backend pricing map in
 * backend/app/core/cost_log.py — keep the two in sync.
 *
 * Rates verified via the `claude-api` skill (Anthropic pricing, cached
 * 2026-05-26). The frontend outreach/draft path calls the AI Gateway with
 * `anthropic/claude-sonnet-4.5` and the backend drafter uses
 * `claude-sonnet-4-20250514` — both are Sonnet-tier: $3.00/MTok input,
 * $15.00/MTok output. Per-MTok = per 1,000,000 tokens.
 */

// model id (as reported by response.modelId / gateway slug) → [inputPerMTok, outputPerMTok] USD
const ANTHROPIC_PRICES: Record<string, [number, number]> = {
  // Sonnet 4 / 4.5 family — the only models KithNode drafts with today.
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

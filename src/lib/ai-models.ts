/** Central model policy. Override deliberately per environment; do not scatter
 * provider IDs through route handlers. */
export const AI_MODELS = {
  default: process.env.AI_DEFAULT_MODEL || "anthropic/claude-sonnet-5",
  fast: process.env.AI_FAST_MODEL || "anthropic/claude-haiku-4.5",
  fallback: process.env.AI_FALLBACK_MODEL || "",
} as const;

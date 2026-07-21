"""Best-effort per-call API cost telemetry → api_cost_log.

DORMANT until the backend is deployed (it produces no data until then). The
LIVE cost source pre-deploy is the frontend AI-Gateway path in
src/app/api/outreach/draft/route.ts.

This module writes directly via get_db()/psycopg2 (the backend has no Supabase
Python client). api_cost_log lives in the same Supabase Postgres that
DATABASE_URL points at; the Postgres role from DATABASE_URL bypasses the
deny-all RLS (it is the owner/service role, not the anon/authenticated JWT
roles). log_cost NEVER raises into the caller — a paid API call must not break
because telemetry failed.

Pricing constants mirror src/lib/ai-cost.ts — keep the two in sync. Anthropic
rates verified against Anthropic's model documentation on 2026-07-10. Sonnet 5
list price is $3.00/MTok input and $15.00/MTok output. Temporary provider
promotions are intentionally not baked into accounting. Hunter & Apollo are
FREE tier → cost_usd 0, but calls are
still logged (rows at $0) for credit-burn tracking.
"""

from __future__ import annotations

# model id -> (input_per_mtok, output_per_mtok) USD
_ANTHROPIC_PRICES = {
    "claude-sonnet-5": (3.00, 15.00),
    "claude-sonnet-4-20250514": (3.00, 15.00),
    "claude-sonnet-4-5": (3.00, 15.00),
    "claude-sonnet-4.5": (3.00, 15.00),
}
# Fallback to Sonnet pricing for any unrecognized model so billed tokens are
# never silently costed at $0.
_DEFAULT_PRICE = (3.00, 15.00)

# Hunter & Apollo are free tier today → $0 per call (still logged for the count).
_HUNTER_COST_PER_CALL = 0.0
_APOLLO_COST_PER_CALL = 0.0


def anthropic_cost(model: str, tokens_in: int, tokens_out: int) -> float:
    """USD cost for an Anthropic call: in/1e6 * price_in + out/1e6 * price_out."""
    pin, pout = _ANTHROPIC_PRICES.get(model, _DEFAULT_PRICE)
    return (tokens_in / 1_000_000) * pin + (tokens_out / 1_000_000) * pout


def log_cost(
    provider: str,
    endpoint: str,
    *,
    tokens_in: int = 0,
    tokens_out: int = 0,
    cost_usd: float = 0.0,
    meta: dict | None = None,
) -> None:
    """Best-effort insert into api_cost_log. Swallows every error.

    meta is passed via psycopg2.extras.Json to avoid text->jsonb cast issues.
    get_db() auto-appends RETURNING id for INSERTs.
    """
    try:
        from database import get_db  # local import: never break import-time on DB issues
        from psycopg2.extras import Json

        with get_db() as conn:
            conn.execute(
                "INSERT INTO api_cost_log "
                "(provider, endpoint, tokens_in, tokens_out, cost_usd, meta) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                (provider, endpoint, tokens_in, tokens_out, cost_usd, Json(meta or {})),
            )
    except Exception:
        pass  # telemetry must never break a paid call

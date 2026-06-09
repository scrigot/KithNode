"""Tests for backend cost telemetry (app/core/cost_log.py).

Covers anthropic_cost math and that log_cost swallows DB errors (never raises
into the caller). cost_log.log_cost does a lazy `from database import get_db`,
so we monkeypatch database.get_db to make it raise.
"""

import cost_log


def test_anthropic_cost_known_tokens():
    # 1M in @ $3 + 1M out @ $15 = $18
    assert cost_log.anthropic_cost("claude-sonnet-4-20250514", 1_000_000, 1_000_000) == 18.0


def test_anthropic_cost_small_draft():
    # 1200 in @ $3/MTok + 400 out @ $15/MTok = 0.0036 + 0.006 = 0.0096
    cost = cost_log.anthropic_cost("claude-sonnet-4-20250514", 1200, 400)
    assert abs(cost - 0.0096) < 1e-9


def test_anthropic_cost_unknown_model_falls_back_to_sonnet():
    # unknown model -> default Sonnet pricing
    assert cost_log.anthropic_cost("mystery-model", 1_000_000, 0) == 3.0


def test_anthropic_cost_zero_tokens():
    assert cost_log.anthropic_cost("claude-sonnet-4-20250514", 0, 0) == 0.0


def test_log_cost_swallows_db_errors(monkeypatch):
    """A DB failure inside log_cost must be swallowed — returns None, no raise."""
    import database

    def _boom():
        raise RuntimeError("db is down")

    monkeypatch.setattr(database, "get_db", _boom)

    # Should not raise, and returns None (best-effort).
    result = cost_log.log_cost(
        "anthropic",
        "messages.create:generate",
        tokens_in=100,
        tokens_out=50,
        cost_usd=0.001,
        meta={"contact_id": 1, "source": "backend"},
    )
    assert result is None

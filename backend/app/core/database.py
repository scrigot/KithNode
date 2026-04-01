"""Persistence layer for KithNode.

Supports PostgreSQL (production) and SQLite (dev/testing).
Backend selected by DATABASE_URL env var: set → Postgres, unset → SQLite.
"""

from __future__ import annotations

import json
import os
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone

# ─── Backend Detection ───────────────────────────────────────────────

DATABASE_URL = os.environ.get("DATABASE_URL")
_USE_PG = bool(DATABASE_URL)

if _USE_PG:
    import psycopg2
    import psycopg2.extras
    import psycopg2.pool

    _pool: psycopg2.pool.ThreadedConnectionPool | None = None
else:
    import sqlite3

    DB_PATH = os.environ.get(
        "KITHNODE_DB_PATH",
        os.path.join(os.path.dirname(__file__), "output", "outreach.db"),
    )


# ─── Helpers ─────────────────────────────────────────────────────────

def _q(sql: str) -> str:
    """Convert ? placeholders to %s for Postgres."""
    if _USE_PG:
        return sql.replace("?", "%s")
    return sql


def _now() -> str:
    """Current UTC timestamp as ISO string."""
    return datetime.now(timezone.utc).isoformat()


def _ago(days: int) -> str:
    """UTC timestamp N days ago as ISO string."""
    return (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()


# ─── Connection Wrapper ──────────────────────────────────────────────

class _PgCursorProxy:
    """Wraps a psycopg2 cursor to provide .lastrowid via RETURNING id."""

    __slots__ = ("_cursor", "lastrowid")

    def __init__(self, cursor, last_insert_id=None):
        self._cursor = cursor
        self.lastrowid = last_insert_id

    def fetchone(self):
        return self._cursor.fetchone()

    def fetchall(self):
        return self._cursor.fetchall()


class _Conn:
    """Thin wrapper normalizing SQLite and Postgres cursor APIs.

    Usage is identical to the old sqlite3 pattern:
        with get_db() as conn:
            row = conn.execute("SELECT ... WHERE id = ?", (42,)).fetchone()
    """

    def __init__(self):
        if _USE_PG:
            _init_pool()
            self._raw = _pool.getconn()  # type: ignore[union-attr]
            self._cursor = self._raw.cursor(
                cursor_factory=psycopg2.extras.RealDictCursor
            )
            self._is_pg = True
        else:
            self._raw = sqlite3.connect(DB_PATH)
            self._raw.row_factory = sqlite3.Row
            self._raw.execute("PRAGMA journal_mode=WAL")
            self._raw.execute("PRAGMA foreign_keys=ON")
            self._cursor = None
            self._is_pg = False

    def execute(self, sql, params=()):
        """Execute SQL. Returns a cursor-like object with fetchone/fetchall/lastrowid."""
        if self._is_pg:
            adapted = _q(sql)
            stripped = adapted.strip().rstrip(";")
            # Auto-append RETURNING id for INSERT statements
            if stripped.upper().startswith("INSERT") and "RETURNING" not in stripped.upper():
                self._cursor.execute(stripped + " RETURNING id", params)
                row = self._cursor.fetchone()
                return _PgCursorProxy(self._cursor, last_insert_id=row["id"] if row else None)
            else:
                self._cursor.execute(adapted, params)
                return _PgCursorProxy(self._cursor)
        else:
            return self._raw.execute(sql, params)

    def executescript(self, sql):
        """Execute multiple SQL statements."""
        if self._is_pg:
            self._cursor.execute(sql)
        else:
            self._raw.executescript(sql)

    def commit(self):
        self._raw.commit()

    def rollback(self):
        self._raw.rollback()

    def close(self):
        if self._is_pg:
            self._cursor.close()
            _pool.putconn(self._raw)  # type: ignore[union-attr]
        else:
            self._raw.close()


# ─── Connection Management ───────────────────────────────────────────

def _init_pool():
    """Lazily initialize the Postgres connection pool."""
    global _pool
    if _USE_PG and _pool is None:
        _pool = psycopg2.pool.ThreadedConnectionPool(
            minconn=1, maxconn=10, dsn=DATABASE_URL
        )


@contextmanager
def get_db():
    """Context manager for database connections. Works with both backends."""
    conn = _Conn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


# ─── Schema Initialization ───────────────────────────────────────────

_PG_SCHEMA = """
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    domain TEXT UNIQUE NOT NULL,
    website TEXT,
    description TEXT,
    location TEXT,
    industry_tags TEXT,
    source TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contacts (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    name TEXT NOT NULL,
    title TEXT,
    email TEXT,
    email_status TEXT,
    email_confidence TEXT,
    linkedin_url TEXT,
    source TEXT,
    education TEXT,
    linkedin_location TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS signals (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    signal_type TEXT NOT NULL,
    description TEXT,
    strength INTEGER CHECK(strength BETWEEN 1 AND 10),
    source_url TEXT,
    detected_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scores (
    id SERIAL PRIMARY KEY,
    contact_id INTEGER REFERENCES contacts(id),
    fit_score REAL DEFAULT 0,
    signal_score REAL DEFAULT 0,
    engagement_score REAL DEFAULT 0,
    total_score REAL DEFAULT 0,
    tier TEXT,
    scored_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS enrichments (
    id SERIAL PRIMARY KEY,
    contact_id INTEGER REFERENCES contacts(id),
    source TEXT NOT NULL,
    data_json TEXT,
    fetched_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS affiliations (
    id SERIAL PRIMARY KEY,
    contact_id INTEGER REFERENCES contacts(id),
    name TEXT NOT NULL,
    boost INTEGER DEFAULT 0,
    detected_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS outreach (
    id SERIAL PRIMARY KEY,
    contact_id INTEGER REFERENCES contacts(id),
    email_subject TEXT,
    email_body TEXT,
    status TEXT DEFAULT 'drafted',
    sent_at TEXT,
    replied_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_signals_company ON signals(company_id);
CREATE INDEX IF NOT EXISTS idx_scores_contact ON scores(contact_id);
CREATE INDEX IF NOT EXISTS idx_scores_total ON scores(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_affiliations_contact ON affiliations(contact_id);
CREATE INDEX IF NOT EXISTS idx_outreach_contact ON outreach(contact_id);

CREATE TABLE IF NOT EXISTS contact_ratings (
    id SERIAL PRIMARY KEY,
    contact_id INTEGER REFERENCES contacts(id),
    rating TEXT NOT NULL CHECK(rating IN ('high_value', 'skip', 'not_interested')),
    rated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(contact_id)
);
CREATE INDEX IF NOT EXISTS idx_ratings_contact ON contact_ratings(contact_id);
CREATE INDEX IF NOT EXISTS idx_ratings_rating ON contact_ratings(rating);

CREATE TABLE IF NOT EXISTS learned_weights (
    id SERIAL PRIMARY KEY,
    dimension TEXT NOT NULL,
    feature TEXT NOT NULL,
    lift_factor REAL DEFAULT 1.0,
    sample_count INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(dimension, feature)
);
"""

_SQLITE_SCHEMA = """
CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    domain TEXT UNIQUE NOT NULL,
    website TEXT,
    description TEXT,
    location TEXT,
    industry_tags TEXT,
    source TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER REFERENCES companies(id),
    name TEXT NOT NULL,
    title TEXT,
    email TEXT,
    email_status TEXT,
    email_confidence TEXT,
    linkedin_url TEXT,
    source TEXT,
    education TEXT,
    linkedin_location TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS signals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER REFERENCES companies(id),
    signal_type TEXT NOT NULL,
    description TEXT,
    strength INTEGER CHECK(strength BETWEEN 1 AND 10),
    source_url TEXT,
    detected_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id INTEGER REFERENCES contacts(id),
    fit_score REAL DEFAULT 0,
    signal_score REAL DEFAULT 0,
    engagement_score REAL DEFAULT 0,
    total_score REAL DEFAULT 0,
    tier TEXT,
    scored_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS enrichments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id INTEGER REFERENCES contacts(id),
    source TEXT NOT NULL,
    data_json TEXT,
    fetched_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS affiliations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id INTEGER REFERENCES contacts(id),
    name TEXT NOT NULL,
    boost INTEGER DEFAULT 0,
    detected_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS outreach (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id INTEGER REFERENCES contacts(id),
    email_subject TEXT,
    email_body TEXT,
    status TEXT DEFAULT 'drafted',
    sent_at TEXT,
    replied_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_signals_company ON signals(company_id);
CREATE INDEX IF NOT EXISTS idx_scores_contact ON scores(contact_id);
CREATE INDEX IF NOT EXISTS idx_scores_total ON scores(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_affiliations_contact ON affiliations(contact_id);
CREATE INDEX IF NOT EXISTS idx_outreach_contact ON outreach(contact_id);

CREATE TABLE IF NOT EXISTS contact_ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id INTEGER REFERENCES contacts(id),
    rating TEXT NOT NULL CHECK(rating IN ('high_value', 'skip', 'not_interested')),
    rated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(contact_id)
);
CREATE INDEX IF NOT EXISTS idx_ratings_contact ON contact_ratings(contact_id);
CREATE INDEX IF NOT EXISTS idx_ratings_rating ON contact_ratings(rating);

CREATE TABLE IF NOT EXISTS learned_weights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dimension TEXT NOT NULL,
    feature TEXT NOT NULL,
    lift_factor REAL DEFAULT 1.0,
    sample_count INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(dimension, feature)
);
"""


def init_db():
    """Create all tables if they don't exist."""
    with get_db() as conn:
        if _USE_PG:
            conn.executescript(_PG_SCHEMA)
        else:
            conn.executescript(_SQLITE_SCHEMA)


# ─── Company Operations ───────────────────────────────────────────────

def upsert_company(company: dict) -> int:
    """Insert or update a company, returning its ID."""
    with get_db() as conn:
        row = conn.execute(
            "SELECT id FROM companies WHERE domain = ?",
            (company["domain"],),
        ).fetchone()

        if row:
            conn.execute(
                """
                UPDATE companies SET name=?, website=?, description=?, location=?,
                    industry_tags=?, source=?, updated_at=?
                WHERE id=?
                """,
                (
                    company["name"],
                    company.get("website", ""),
                    company.get("description", ""),
                    company.get("location", ""),
                    json.dumps(company.get("industry_tags", [])),
                    company.get("source", ""),
                    _now(),
                    row["id"],
                ),
            )
            return row["id"]
        else:
            cursor = conn.execute(
                """
                INSERT INTO companies (name, domain, website, description, location, industry_tags, source)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    company["name"],
                    company["domain"],
                    company.get("website", ""),
                    company.get("description", ""),
                    company.get("location", ""),
                    json.dumps(company.get("industry_tags", [])),
                    company.get("source", ""),
                ),
            )
            return cursor.lastrowid


def get_company_by_domain(domain: str) -> dict | None:
    """Look up a company by domain."""
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM companies WHERE domain = ?", (domain,)
        ).fetchone()
        if row:
            result = dict(row)
            result["industry_tags"] = json.loads(result["industry_tags"] or "[]")
            return result
    return None


def get_all_companies() -> list[dict]:
    """Get all companies."""
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM companies ORDER BY name").fetchall()
        results = []
        for row in rows:
            r = dict(row)
            r["industry_tags"] = json.loads(r["industry_tags"] or "[]")
            results.append(r)
        return results


# ─── Contact Operations ───────────────────────────────────────────────

def upsert_contact(contact: dict, company_id: int) -> int:
    """Insert or update a contact, returning its ID."""
    with get_db() as conn:
        row = conn.execute(
            "SELECT id FROM contacts WHERE LOWER(name) = LOWER(?) AND company_id = ?",
            (contact["name"], company_id),
        ).fetchone()

        if row:
            conn.execute(
                """
                UPDATE contacts SET title=?, email=?, email_status=?, email_confidence=?,
                    linkedin_url=?, source=?, education=?, linkedin_location=?,
                    updated_at=?
                WHERE id=?
                """,
                (
                    contact.get("title", ""),
                    contact.get("email", ""),
                    contact.get("email_verified", contact.get("email_status", "")),
                    contact.get("email_confidence", ""),
                    contact.get("linkedin_url", ""),
                    contact.get("source", ""),
                    contact.get("education", ""),
                    contact.get("linkedin_location", ""),
                    _now(),
                    row["id"],
                ),
            )
            return row["id"]
        else:
            cursor = conn.execute(
                """
                INSERT INTO contacts (company_id, name, title, email, email_status,
                    email_confidence, linkedin_url, source, education, linkedin_location)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    company_id,
                    contact["name"],
                    contact.get("title", ""),
                    contact.get("email", ""),
                    contact.get("email_verified", contact.get("email_status", "")),
                    contact.get("email_confidence", ""),
                    contact.get("linkedin_url", ""),
                    contact.get("source", ""),
                    contact.get("education", ""),
                    contact.get("linkedin_location", ""),
                ),
            )
            return cursor.lastrowid


def get_contacts_for_company(company_id: int) -> list[dict]:
    """Get all contacts for a company."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM contacts WHERE company_id = ?", (company_id,)
        ).fetchall()
        return [dict(r) for r in rows]


def get_all_contacts_with_company() -> list[dict]:
    """Get all contacts joined with their company data."""
    with get_db() as conn:
        rows = conn.execute("""
            SELECT c.*,
                   co.name as company_name, co.domain as company_domain,
                   co.website as company_website, co.location as company_location,
                   co.industry_tags as company_industry_tags, co.description as company_description
            FROM contacts c
            JOIN companies co ON c.company_id = co.id
            ORDER BY c.name
        """).fetchall()
        results = []
        for row in rows:
            r = dict(row)
            r["company_industry_tags"] = json.loads(r["company_industry_tags"] or "[]")
            results.append(r)
        return results


# ─── Signal Operations ────────────────────────────────────────────────

def add_signal(
    company_id: int,
    signal_type: str,
    description: str,
    strength: int,
    source_url: str = "",
) -> int:
    """Add a new signal for a company."""
    with get_db() as conn:
        cutoff = _ago(1)
        existing = conn.execute(
            """
            SELECT id FROM signals
            WHERE company_id = ? AND signal_type = ? AND description = ?
            AND detected_at > ?
            """,
            (company_id, signal_type, description, cutoff),
        ).fetchone()

        if existing:
            return existing["id"]

        cursor = conn.execute(
            """
            INSERT INTO signals (company_id, signal_type, description, strength, source_url)
            VALUES (?, ?, ?, ?, ?)
            """,
            (company_id, signal_type, description, min(max(strength, 1), 10), source_url),
        )
        return cursor.lastrowid


def get_signals_for_company(company_id: int, max_age_days: int = 90) -> list[dict]:
    """Get recent signals for a company."""
    cutoff = _ago(max_age_days)
    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT * FROM signals
            WHERE company_id = ? AND detected_at > ?
            ORDER BY strength DESC, detected_at DESC
            """,
            (company_id, cutoff),
        ).fetchall()
        return [dict(r) for r in rows]


# ─── Score Operations ─────────────────────────────────────────────────

def save_score(
    contact_id: int,
    fit_score: float,
    signal_score: float,
    engagement_score: float,
    total_score: float,
    tier: str,
) -> int:
    """Save a score for a contact (replaces any existing score)."""
    with get_db() as conn:
        conn.execute("DELETE FROM scores WHERE contact_id = ?", (contact_id,))
        cursor = conn.execute(
            """
            INSERT INTO scores (contact_id, fit_score, signal_score, engagement_score, total_score, tier)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (contact_id, fit_score, signal_score, engagement_score, total_score, tier),
        )
        return cursor.lastrowid


def get_scored_contacts(min_score: float = 0, limit: int = 100) -> list[dict]:
    """Get contacts with their scores, ordered by total_score descending."""
    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT c.*, s.fit_score, s.signal_score, s.engagement_score,
                   s.total_score, s.tier, s.scored_at,
                   co.name as company_name, co.domain as company_domain,
                   co.website as company_website, co.location as company_location,
                   co.industry_tags as company_industry_tags, co.description as company_description
            FROM contacts c
            JOIN scores s ON c.id = s.contact_id
            JOIN companies co ON c.company_id = co.id
            WHERE s.total_score >= ?
            ORDER BY s.total_score DESC
            LIMIT ?
            """,
            (min_score, limit),
        ).fetchall()
        results = []
        for row in rows:
            r = dict(row)
            r["company_industry_tags"] = json.loads(r["company_industry_tags"] or "[]")
            results.append(r)
        return results


# ─── Affiliation Operations ───────────────────────────────────────────

def save_affiliations(contact_id: int, affiliations: list[dict]):
    """Save affiliations for a contact (replaces existing)."""
    with get_db() as conn:
        conn.execute("DELETE FROM affiliations WHERE contact_id = ?", (contact_id,))
        for aff in affiliations:
            conn.execute(
                """
                INSERT INTO affiliations (contact_id, name, boost)
                VALUES (?, ?, ?)
                """,
                (contact_id, aff["name"], aff.get("boost", 0)),
            )


def get_affiliations_for_contact(contact_id: int) -> list[dict]:
    """Get affiliations for a contact."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM affiliations WHERE contact_id = ?", (contact_id,)
        ).fetchall()
        return [dict(r) for r in rows]


# ─── Enrichment Operations ────────────────────────────────────────────

def save_enrichment(contact_id: int, source: str, data: dict) -> int:
    """Save enrichment data for a contact."""
    with get_db() as conn:
        cursor = conn.execute(
            """
            INSERT INTO enrichments (contact_id, source, data_json)
            VALUES (?, ?, ?)
            """,
            (contact_id, source, json.dumps(data)),
        )
        return cursor.lastrowid


def get_enrichments_for_contact(contact_id: int) -> list[dict]:
    """Get all enrichment data for a contact."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM enrichments WHERE contact_id = ? ORDER BY fetched_at DESC",
            (contact_id,),
        ).fetchall()
        results = []
        for row in rows:
            r = dict(row)
            r["data"] = json.loads(r["data_json"] or "{}")
            results.append(r)
        return results


# ─── Outreach Operations ──────────────────────────────────────────────

def save_outreach(contact_id: int, subject: str, body: str) -> int:
    """Save a drafted outreach email."""
    with get_db() as conn:
        cursor = conn.execute(
            """
            INSERT INTO outreach (contact_id, email_subject, email_body)
            VALUES (?, ?, ?)
            """,
            (contact_id, subject, body),
        )
        return cursor.lastrowid


def get_outreach_for_contact(contact_id: int) -> list[dict]:
    """Get outreach history for a contact."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM outreach WHERE contact_id = ? ORDER BY created_at DESC",
            (contact_id,),
        ).fetchall()
        return [dict(r) for r in rows]


def update_outreach_status(outreach_id: int, status: str) -> bool:
    """Update the status of an outreach record. Returns True if found."""
    now = _now()
    with get_db() as conn:
        row = conn.execute(
            "SELECT id FROM outreach WHERE id = ?", (outreach_id,)
        ).fetchone()
        if not row:
            return False

        conn.execute(
            """
            UPDATE outreach
            SET status = ?,
                sent_at = CASE WHEN ? = 'sent' THEN ? ELSE sent_at END,
                replied_at = CASE WHEN ? = 'replied' THEN ? ELSE replied_at END
            WHERE id = ?
            """,
            (status, status, now, status, now, outreach_id),
        )
        return True


# ─── Stats ────────────────────────────────────────────────────────────

def get_stats() -> dict:
    """Get summary statistics from the database."""
    with get_db() as conn:
        stats = {}
        stats["companies"] = conn.execute(
            "SELECT COUNT(*) as cnt FROM companies"
        ).fetchone()["cnt"]
        stats["contacts"] = conn.execute(
            "SELECT COUNT(*) as cnt FROM contacts"
        ).fetchone()["cnt"]
        stats["signals"] = conn.execute(
            "SELECT COUNT(*) as cnt FROM signals"
        ).fetchone()["cnt"]
        stats["scored"] = conn.execute(
            "SELECT COUNT(*) as cnt FROM scores"
        ).fetchone()["cnt"]
        stats["affiliations"] = conn.execute(
            "SELECT COUNT(DISTINCT contact_id) as cnt FROM affiliations"
        ).fetchone()["cnt"]
        stats["emails_verified"] = conn.execute(
            "SELECT COUNT(*) as cnt FROM contacts WHERE email_status = 'hunter_found'"
        ).fetchone()["cnt"]
        stats["outreach_drafted"] = conn.execute(
            "SELECT COUNT(*) as cnt FROM outreach WHERE status = 'drafted'"
        ).fetchone()["cnt"]
        return stats


# ─── Rating Operations ────────────────────────────────────────────────

def save_rating(contact_id: int, rating: str) -> int:
    """Save or update a rating for a contact. Returns the rating row ID."""
    with get_db() as conn:
        existing = conn.execute(
            "SELECT id FROM contact_ratings WHERE contact_id = ?",
            (contact_id,),
        ).fetchone()
        if existing:
            conn.execute(
                "UPDATE contact_ratings SET rating = ?, rated_at = ? WHERE contact_id = ?",
                (rating, _now(), contact_id),
            )
            return existing["id"]
        else:
            cursor = conn.execute(
                "INSERT INTO contact_ratings (contact_id, rating) VALUES (?, ?)",
                (contact_id, rating),
            )
            return cursor.lastrowid


def get_unrated_contacts(limit: int = 10) -> list[dict]:
    """Get contacts that haven't been rated yet, ordered by score descending."""
    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT c.*, s.fit_score, s.signal_score, s.engagement_score,
                   s.total_score, s.tier, s.scored_at,
                   co.name as company_name, co.domain as company_domain,
                   co.website as company_website, co.location as company_location,
                   co.industry_tags as company_industry_tags,
                   co.description as company_description
            FROM contacts c
            JOIN scores s ON c.id = s.contact_id
            JOIN companies co ON c.company_id = co.id
            LEFT JOIN contact_ratings cr ON c.id = cr.contact_id
            WHERE cr.id IS NULL
            ORDER BY s.total_score DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
        results = []
        for row in rows:
            r = dict(row)
            r["company_industry_tags"] = json.loads(r["company_industry_tags"] or "[]")
            results.append(r)
        return results


def get_ratings_summary() -> dict:
    """Get counts of ratings by type."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT rating, COUNT(*) as cnt FROM contact_ratings GROUP BY rating"
        ).fetchall()
        summary = {"high_value": 0, "skip": 0, "not_interested": 0, "total": 0}
        for row in rows:
            r = dict(row)
            summary[r["rating"]] = r["cnt"]
            summary["total"] += r["cnt"]
        return summary


def get_rated_contacts(rating: str | None = None) -> list[dict]:
    """Get all rated contacts with company + affiliation data (for learning)."""
    with get_db() as conn:
        if rating:
            rows = conn.execute(
                """
                SELECT c.*, cr.rating,
                       co.name as company_name, co.domain as company_domain,
                       co.location as company_location,
                       co.industry_tags as company_industry_tags,
                       co.description as company_description
                FROM contacts c
                JOIN contact_ratings cr ON c.id = cr.contact_id
                JOIN companies co ON c.company_id = co.id
                WHERE cr.rating = ?
                """,
                (rating,),
            ).fetchall()
        else:
            rows = conn.execute(
                """
                SELECT c.*, cr.rating,
                       co.name as company_name, co.domain as company_domain,
                       co.location as company_location,
                       co.industry_tags as company_industry_tags,
                       co.description as company_description
                FROM contacts c
                JOIN contact_ratings cr ON c.id = cr.contact_id
                JOIN companies co ON c.company_id = co.id
                """
            ).fetchall()
        results = []
        for row in rows:
            r = dict(row)
            r["company_industry_tags"] = json.loads(r["company_industry_tags"] or "[]")
            affs = conn.execute(
                "SELECT name FROM affiliations WHERE contact_id = ?", (r["id"],)
            ).fetchall()
            r["affiliation_list"] = [dict(a)["name"] for a in affs]
            results.append(r)
        return results


# ─── Learned Weights Operations ──────────────────────────────────────

def save_learned_weight(dimension: str, feature: str, lift_factor: float, sample_count: int):
    """Upsert a learned weight for a dimension+feature pair."""
    with get_db() as conn:
        existing = conn.execute(
            "SELECT id FROM learned_weights WHERE dimension = ? AND feature = ?",
            (dimension, feature),
        ).fetchone()
        if existing:
            conn.execute(
                """UPDATE learned_weights
                   SET lift_factor = ?, sample_count = ?, updated_at = ?
                   WHERE dimension = ? AND feature = ?""",
                (lift_factor, sample_count, _now(), dimension, feature),
            )
        else:
            conn.execute(
                """INSERT INTO learned_weights (dimension, feature, lift_factor, sample_count)
                   VALUES (?, ?, ?, ?)""",
                (dimension, feature, lift_factor, sample_count),
            )


def get_learned_weights() -> list[dict]:
    """Get all learned weight adjustments."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM learned_weights ORDER BY dimension, feature"
        ).fetchall()
        return [dict(r) for r in rows]


def get_learned_weights_map() -> dict:
    """Get learned weights as nested dict: {dimension: {feature: lift_factor}}."""
    weights = get_learned_weights()
    result: dict = {}
    for w in weights:
        dim = w["dimension"]
        if dim not in result:
            result[dim] = {}
        result[dim][w["feature"]] = w["lift_factor"]
    return result


# ─── Helpers for Pipeline Integration ─────────────────────────────────

def save_pipeline_run(companies: list[dict], contacts: list[dict]) -> dict:
    """
    Save a full pipeline run to the database.
    Takes the existing list-of-dicts format and persists everything.
    Returns a mapping of {(name_lower, domain): contact_id} for downstream use.
    """
    contact_id_map = {}

    for company in companies:
        company_id = upsert_company(company)

        company_contacts = [
            c
            for c in contacts
            if c.get("company_domain", "") == company["domain"]
        ]

        for contact in company_contacts:
            contact_id = upsert_contact(contact, company_id)
            key = (contact["name"].lower(), company["domain"])
            contact_id_map[key] = contact_id

            affiliations_str = contact.get("affiliations", "")
            if affiliations_str:
                affs = []
                for aff_name in affiliations_str.split(", "):
                    boost = contact.get("affiliation_boost", 0)
                    affs.append({"name": aff_name, "boost": boost})
                save_affiliations(contact_id, affs)

            if contact.get("email_draft"):
                save_outreach(
                    contact_id,
                    contact.get("email_subject", ""),
                    contact.get("email_draft", ""),
                )

    return contact_id_map


# Initialize on import
init_db()

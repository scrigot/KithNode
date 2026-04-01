"""Test fixtures: temp SQLite DB with seed data + FastAPI TestClient."""

import os
import tempfile

import pytest

# Set DB path BEFORE any app imports
_tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_tmp.close()
os.environ["KITHNODE_DB_PATH"] = _tmp.name


@pytest.fixture(scope="session")
def seeded_ids():
    """Seed the test DB with one company, contact, score, signal, affiliation."""
    import database as db

    company_id = db.upsert_company(
        {
            "name": "TestCo",
            "domain": "testco.com",
            "website": "https://testco.com",
            "location": "Durham, NC",
            "industry_tags": ["fintech", "AI"],
            "description": "AI-powered fintech startup for testing",
            "source": "seed",
        }
    )

    contact_id = db.upsert_contact(
        {
            "name": "Jane Doe",
            "title": "CEO",
            "email": "jane@testco.com",
            "email_status": "hunter_found",
            "email_confidence": "95",
            "linkedin_url": "https://linkedin.com/in/janedoe",
            "source": "team_page",
            "education": "UNC Chapel Hill",
            "linkedin_location": "Durham, NC",
        },
        company_id,
    )

    db.save_score(contact_id, 40.0, 20.0, 15.0, 75.0, "warm")

    signal_id = db.add_signal(
        company_id,
        "funding",
        "Raised $5M Series A",
        7,
        "https://example.com/news",
    )

    db.save_affiliations(
        contact_id, [{"name": "Kenan-Flagler", "boost": 12}]
    )

    outreach_id = db.save_outreach(
        contact_id, "Test Subject", "Test email body"
    )

    return {
        "company_id": company_id,
        "contact_id": contact_id,
        "signal_id": signal_id,
        "outreach_id": outreach_id,
    }


@pytest.fixture(scope="session")
def client(seeded_ids):
    """FastAPI TestClient with seeded data."""
    from httpx import ASGITransport

    from app.main import app

    # Use httpx directly for sync testing
    from starlette.testclient import TestClient

    return TestClient(app)


def pytest_sessionfinish():
    """Clean up temp DB."""
    path = os.environ.get("KITHNODE_DB_PATH", "")
    if path and os.path.exists(path):
        os.unlink(path)

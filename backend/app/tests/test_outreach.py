def test_draft_outreach(client, seeded_ids):
    """Draft outreach uses template fallback (no ANTHROPIC_API_KEY in test)."""
    r = client.post("/api/outreach/draft", json={"contact_id": seeded_ids["contact_id"]})
    assert r.status_code == 200
    data = r.json()

    assert data["contact_id"] == seeded_ids["contact_id"]
    assert data["subject"]  # non-empty
    assert data["body"]  # non-empty
    assert data["outreach_id"] > 0


def test_draft_outreach_404(client):
    r = client.post("/api/outreach/draft", json={"contact_id": 99999})
    assert r.status_code == 404


def test_status_update(client, seeded_ids):
    oid = seeded_ids["outreach_id"]
    r = client.post(f"/api/outreach/{oid}/status", json={"status": "sent"})
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "sent"
    assert data["outreach_id"] == oid


def test_status_update_replied(client, seeded_ids):
    oid = seeded_ids["outreach_id"]
    r = client.post(f"/api/outreach/{oid}/status", json={"status": "replied"})
    assert r.status_code == 200
    assert r.json()["status"] == "replied"


def test_status_invalid(client, seeded_ids):
    oid = seeded_ids["outreach_id"]
    r = client.post(f"/api/outreach/{oid}/status", json={"status": "invalid_status"})
    assert r.status_code == 400


def test_status_update_404(client):
    r = client.post("/api/outreach/99999/status", json={"status": "sent"})
    assert r.status_code == 404

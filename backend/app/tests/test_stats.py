def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"


def test_stats_returns_all_fields(client):
    r = client.get("/api/stats")
    assert r.status_code == 200
    data = r.json()
    assert "companies" in data
    assert "contacts" in data
    assert "signals" in data
    assert "scored" in data
    assert "affiliations" in data
    assert "emails_verified" in data
    assert "outreach_drafted" in data
    # Seeded data should show counts > 0
    assert data["companies"] >= 1
    assert data["contacts"] >= 1

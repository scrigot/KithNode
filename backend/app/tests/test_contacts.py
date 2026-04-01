def test_ranked_returns_list(client):
    r = client.get("/api/contacts/ranked")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) >= 1

    contact = data[0]
    assert "id" in contact
    assert "name" in contact
    assert "company" in contact
    assert "score" in contact
    assert contact["score"]["tier"] in ("hot", "warm", "monitor", "cold")


def test_ranked_min_score_filter(client):
    # Score is 75.0 — filtering at 80 should return empty
    r = client.get("/api/contacts/ranked?min_score=80")
    assert r.status_code == 200
    assert r.json() == []

    # Filtering at 70 should return 1
    r = client.get("/api/contacts/ranked?min_score=70")
    assert r.status_code == 200
    assert len(r.json()) >= 1


def test_ranked_limit(client):
    r = client.get("/api/contacts/ranked?limit=1")
    assert r.status_code == 200
    assert len(r.json()) <= 1


def test_contact_detail(client, seeded_ids):
    cid = seeded_ids["contact_id"]
    r = client.get(f"/api/contacts/{cid}")
    assert r.status_code == 200
    data = r.json()

    assert data["name"] == "Jane Doe"
    assert data["title"] == "CEO"
    assert data["email"] == "jane@testco.com"
    assert data["company"]["name"] == "TestCo"
    assert data["company"]["domain"] == "testco.com"
    assert data["score"]["total_score"] == 75.0
    assert data["score"]["tier"] == "warm"
    assert len(data["affiliations"]) >= 1
    assert data["affiliations"][0]["name"] == "Kenan-Flagler"
    assert len(data["signals"]) >= 1
    assert len(data["outreach_history"]) >= 1


def test_contact_detail_404(client):
    r = client.get("/api/contacts/99999")
    assert r.status_code == 404

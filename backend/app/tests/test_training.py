"""Tests for signal-training: ratings, discover, preferences, and learning."""


def test_discover_returns_unrated(client, seeded_ids):
    """Discover should return seeded contacts (none rated yet)."""
    r = client.get("/api/discover")
    assert r.status_code == 200
    data = r.json()
    assert data["total_unrated"] >= 1
    assert len(data["contacts"]) >= 1
    assert data["ratings_progress"]["total_ratings"] == 0
    assert data["ratings_progress"]["learning_active"] is False


def test_rate_contact_high_value(client, seeded_ids):
    cid = seeded_ids["contact_id"]
    r = client.post(f"/api/contacts/{cid}/rate", json={"rating": "high_value"})
    assert r.status_code == 200
    data = r.json()
    assert data["contact_id"] == cid
    assert data["rating"] == "high_value"
    assert data["total_ratings"] >= 1
    assert data["learning_active"] is False  # need 10+ ratings


def test_rate_contact_invalid_rating(client, seeded_ids):
    cid = seeded_ids["contact_id"]
    r = client.post(f"/api/contacts/{cid}/rate", json={"rating": "love_it"})
    assert r.status_code == 400


def test_rate_contact_404(client):
    r = client.post("/api/contacts/99999/rate", json={"rating": "skip"})
    assert r.status_code == 404


def test_rate_overwrites_previous(client, seeded_ids):
    """Rating the same contact again should overwrite."""
    cid = seeded_ids["contact_id"]
    client.post(f"/api/contacts/{cid}/rate", json={"rating": "high_value"})
    r = client.post(f"/api/contacts/{cid}/rate", json={"rating": "skip"})
    assert r.status_code == 200
    assert r.json()["rating"] == "skip"


def test_discover_excludes_rated(client, seeded_ids):
    """After rating a contact, it shouldn't appear in discover."""
    cid = seeded_ids["contact_id"]
    client.post(f"/api/contacts/{cid}/rate", json={"rating": "high_value"})

    r = client.get("/api/discover")
    data = r.json()
    contact_ids = [c["id"] for c in data["contacts"]]
    assert cid not in contact_ids


def test_preferences_initial(client):
    r = client.get("/api/preferences")
    assert r.status_code == 200
    data = r.json()
    assert "ratings_summary" in data
    assert "learned_weights" in data
    assert data["learning_active"] is False


def test_preferences_recalculate_not_enough_data(client):
    r = client.post("/api/preferences/recalculate")
    assert r.status_code == 200
    data = r.json()
    assert data["learning_active"] is False
    assert "Need" in data["message"]


def test_preferences_reset(client):
    r = client.post("/api/preferences/reset")
    assert r.status_code == 200
    assert "cleared" in r.json()["message"]


def test_import_linkedin_invalid_url(client):
    r = client.post("/api/import/linkedin", json={"urls": ["not-a-url"]})
    assert r.status_code == 200
    data = r.json()
    assert data["failed"] == 1
    assert data["imported"] == 0
    assert data["contacts"][0]["error"] is not None


def test_import_linkedin_empty(client):
    r = client.post("/api/import/linkedin", json={"urls": []})
    assert r.status_code == 200
    data = r.json()
    assert data["imported"] == 0
    assert data["failed"] == 0


def test_feature_extractor():
    """Test feature extraction from a contact dict."""
    from feature_extractor import extract_features

    contact = {
        "title": "CEO",
        "company_industry": "fintech, AI",
        "company_industry_tags": ["fintech", "AI"],
        "company_location": "Durham, NC",
        "company_description": "AI-powered fintech startup",
        "affiliations": "Kenan-Flagler, NC Local",
        "linkedin_location": "Durham, NC",
    }

    features = extract_features(contact)
    assert "kenan_flagler" in features["affiliation"]
    assert "nc_local" in features["affiliation"]
    assert "c_suite" in features["role"]
    assert "fintech" in features["industry"]
    assert "ai" in features["industry"]
    assert "triangle_nc" in features["geography"]
    assert "startup" in features["company_stage"]


def test_scoring_with_weight_overrides():
    """Test that weight overrides affect fit score."""
    from scoring import compute_fit_score

    contact = {
        "affiliations": "Kenan-Flagler",
        "title": "CEO",
        "company_industry": "fintech",
        "company_location": "Durham, NC",
        "description": "fintech startup",
    }

    base_score = compute_fit_score(contact)

    # Boost fintech 2x
    overrides = {"industry": {"fintech": 2.0}}
    boosted_score = compute_fit_score(contact, weight_overrides=overrides)

    assert boosted_score > base_score


def test_lift_factor_computation():
    """Test the lift factor math with synthetic data."""
    import database as db
    from preference_learner import compute_lift_factors, MINIMUM_TOTAL_RATINGS

    # Need 10+ ratings with 3+ high_value to activate
    # Create extra test contacts for rating
    company_id = db.upsert_company({
        "name": "LiftTestCo",
        "domain": "lifttest.com",
        "industry_tags": ["fintech"],
        "location": "Durham, NC",
        "description": "fintech startup",
    })

    contact_ids = []
    for i in range(12):
        cid = db.upsert_contact({
            "name": f"Test Person {i}",
            "title": "CEO" if i < 5 else "Analyst",
            "company_industry": "fintech" if i < 8 else "consulting",
        }, company_id)
        db.save_score(cid, 30, 10, 10, 50, "monitor")
        contact_ids.append(cid)

    # Rate: 5 high_value (all fintech CEOs), 7 skip
    for i, cid in enumerate(contact_ids):
        rating = "high_value" if i < 5 else "skip"
        db.save_rating(cid, rating)

    lifts = compute_lift_factors()
    assert lifts  # should be non-empty now

    # C-suite contacts were disproportionately high_value (5/5 HV are CEOs)
    # So the role dimension should have a lift for c_suite > 1.0
    if "role" in lifts and "c_suite" in lifts["role"]:
        assert lifts["role"]["c_suite"] > 1.0

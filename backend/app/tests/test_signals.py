def test_signals_by_domain(client):
    r = client.get("/api/signals/testco.com")
    assert r.status_code == 200
    data = r.json()

    assert data["company_name"] == "TestCo"
    assert data["domain"] == "testco.com"
    assert len(data["signals"]) >= 1
    assert data["signals"][0]["signal_type"] == "funding"
    assert data["signals"][0]["strength"] == 7
    assert "signal_stack" in data
    assert "should_outreach" in data["signal_stack"]


def test_signals_unknown_domain(client):
    r = client.get("/api/signals/doesnotexist.com")
    assert r.status_code == 404

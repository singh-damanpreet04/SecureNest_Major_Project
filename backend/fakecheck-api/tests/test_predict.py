import os
import pytest
from fastapi.testclient import TestClient
from app.main import app

os.environ["FAKECHECK_INTERNAL_API_KEY"] = "test-key"
client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_predict_requires_auth():
    r = client.post("/predict", json={"text": "hello", "country": "US"})
    assert r.status_code == 401


def test_predict_ok():
    r = client.post(
        "/predict",
        headers={"X-Internal-API-Key": "test-key"},
        json={"text": "official report says...", "country": "US"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["verdict"] in {"likely_real", "likely_fake", "not_enough_info"}
    assert 0 <= data["confidence"] <= 1
    assert isinstance(data["evidence"], list)

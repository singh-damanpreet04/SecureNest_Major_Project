"""
Integration test: spin up fakecheck-api + dependencies and test /predict.
Run with: pytest tests/test_integration.py
Requires: Docker Compose running (mongo, redis) or local instances.
"""
import os
import pytest
from fastapi.testclient import TestClient
from app.main import app

os.environ["FAKECHECK_INTERNAL_API_KEY"] = "test-key"
os.environ["MONGO_URI"] = os.getenv("MONGO_URI", "mongodb://localhost:27017/securenest_test")
os.environ["REDIS_URL"] = os.getenv("REDIS_URL", "redis://localhost:6379")

client = TestClient(app)


def test_integration_predict_text():
    """Test /predict with text input (no external APIs needed for basic test)."""
    r = client.post(
        "/predict",
        headers={"X-Internal-API-Key": "test-key"},
        json={"text": "The official report states GDP grew by 5%.", "country": "US"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["verdict"] in {"likely_real", "likely_fake", "not_enough_info"}
    assert 0 <= data["confidence"] <= 1
    assert isinstance(data["evidence"], list)
    assert isinstance(data["top_signals"], list)
    assert data["model_version"] == "v1.0"


def test_integration_predict_cached():
    """Test that second identical request returns cached result."""
    payload = {"text": "Cached test claim.", "country": "IN"}
    headers = {"X-Internal-API-Key": "test-key"}
    
    r1 = client.post("/predict", headers=headers, json=payload)
    assert r1.status_code == 200
    
    r2 = client.post("/predict", headers=headers, json=payload)
    assert r2.status_code == 200
    assert r1.json() == r2.json()


def test_integration_sources():
    """Test /sources endpoint."""
    r = client.get("/sources", headers={"X-Internal-API-Key": "test-key"})
    assert r.status_code == 200
    data = r.json()
    assert "sources" in data
    assert isinstance(data["sources"], list)

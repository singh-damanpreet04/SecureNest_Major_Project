"""
Test script for FakeCheck API
"""
import requests
import json

API_URL = "http://localhost:8080"
API_KEY = "dev-internal-key"

def test_health():
    """Test health endpoint"""
    print("\n=== Testing Health Endpoint ===")
    response = requests.get(f"{API_URL}/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    return response.status_code == 200

def test_predict_text():
    """Test prediction with text"""
    print("\n=== Testing Prediction with Text ===")
    payload = {
        "text": "Indian Railways announces mandatory ID proof for train travel from January 2024",
        "country": "IN"
    }
    headers = {
        "Content-Type": "application/json",
        "X-Internal-API-Key": API_KEY
    }
    
    response = requests.post(f"{API_URL}/predict", json=payload, headers=headers, timeout=60)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"Verdict: {result['verdict']}")
        print(f"Confidence: {result['confidence']:.2f}")
        print(f"Evidence count: {len(result['evidence'])}")
        print(f"Top signals: {result['top_signals']}")
    else:
        print(f"Error: {response.text}")
    return response.status_code == 200

def test_predict_url():
    """Test prediction with URL"""
    print("\n=== Testing Prediction with URL ===")
    payload = {
        "url": "https://www.bbc.com/news",
        "country": "US"
    }
    headers = {
        "Content-Type": "application/json",
        "X-Internal-API-Key": API_KEY
    }
    
    response = requests.post(f"{API_URL}/predict", json=payload, headers=headers, timeout=60)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"Verdict: {result['verdict']}")
        print(f"Confidence: {result['confidence']:.2f}")
    else:
        print(f"Error: {response.text}")
    return response.status_code == 200

if __name__ == "__main__":
    print("=" * 50)
    print("FakeCheck API Test Suite")
    print("=" * 50)
    
    try:
        # Test 1: Health check
        health_ok = test_health()
        
        if health_ok:
            # Test 2: Text prediction
            test_predict_text()
            
            # Test 3: URL prediction (optional)
            # test_predict_url()
            
            print("\n" + "=" * 50)
            print("✓ All tests completed!")
            print("=" * 50)
        else:
            print("\n✗ Health check failed. Is the server running on port 8080?")
            
    except requests.exceptions.ConnectionError:
        print("\n✗ Connection Error: Cannot connect to API server.")
        print("Make sure the server is running: python -m uvicorn app.main:app --reload --port 8080")
    except Exception as e:
        print(f"\n✗ Error: {e}")

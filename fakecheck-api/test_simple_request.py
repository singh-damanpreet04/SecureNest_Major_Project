import requests
import json

# Test the API directly
url = "http://localhost:8080/predict"
headers = {
    "Content-Type": "application/json",
    "X-Internal-API-Key": "dev-internal-key"
}

# Test 1: International scope
payload1 = {
    "text": "Elon Musk buys the entire BBC network.",
    "scope": "international"
}

print("Testing International Scope...")
try:
    response = requests.post(url, json=payload1, headers=headers, timeout=60)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        print(f"Success: {response.json()}")
    else:
        print(f"Error: {response.text}")
except Exception as e:
    print(f"Exception: {e}")

print("\n" + "="*50 + "\n")

# Test 2: National scope
payload2 = {
    "text": "Elon Musk buys the entire BBC network.",
    "scope": "national",
    "country": "US"
}

print("Testing National Scope...")
try:
    response = requests.post(url, json=payload2, headers=headers, timeout=60)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        print(f"Success: {response.json()}")
    else:
        print(f"Error: {response.text}")
except Exception as e:
    print(f"Exception: {e}")

# Quick Start - Run Python Server

## Step 1: Open Terminal in fakecheck-api folder

```bash
cd C:\Users\ASUS\Downloads\SecureNest\fakecheck-api
```

## Step 2: Run the server

```bash
python -m uvicorn app.main:app --reload --port 8080
```

## Step 3: Wait for this message

```
INFO:     Application startup complete.
```

## Step 4: Test the server (open new terminal)

```bash
curl http://localhost:8080/health
```

Expected: `{"status":"ok"}`

## Step 5: Now your backend can connect!

The Node.js backend will now successfully connect to the Python API.

---

## Full System Startup Order

1. **Python API** (port 8080) - START FIRST
2. **Node.js Backend** (port 5003) - START SECOND  
3. **React Frontend** (port 5173) - START LAST

---

## Test Your Fake News Detection

Once all 3 servers are running:

1. Open: http://localhost:5173
2. Go to Fake Check page
3. Enter: "NASA confirms aliens are living secretly on Earth."
4. Country: US
5. Click Check

**Expected Result:** 
- Verdict: **Likely Fake**
- Confidence: ~75%
- Reason: "Suspicious claim with no trusted sources"

---

## If First Request is Slow

The first request takes 10-30 seconds because:
- NLI model is loading (transformers)
- Querying multiple APIs
- Web scraping

**Subsequent requests are much faster (3-5 seconds)!**

# SecureNest Fake News Detection System - Setup Guide

## Overview
This is the Python microservice for fake news detection, integrated with your SecureNest MERN stack application.

## Architecture
```
Frontend (React) → Backend (Node.js/Express) → Python API (FastAPI) → External APIs
```

## Prerequisites
- Python 3.8+
- Node.js 16+
- MongoDB (already configured)

## Installation Steps

### 1. Install Python Dependencies

```bash
cd C:\Users\ASUS\Downloads\SecureNest\fakecheck-api
pip install -r requirements.txt
```

**Note:** If you encounter torch version errors, the requirements.txt has been updated to use compatible versions.

### 2. Configure Environment Variables

The `.env` file is already configured with:
- `FAKECHECK_INTERNAL_API_KEY`: API key for Node.js backend to call Python API
- `GOOGLE_FACTCHECK_API_KEY`: Google Fact Check API key
- `NEWSAPI_KEY`: NewsAPI key for article retrieval

### 3. Start the Python Microservice

**Option 1: Using uvicorn directly**
```bash
python -m uvicorn app.main:app --reload --port 8080
```

**Option 2: Using the main.py file**
```bash
python main.py
```

The server will start on **http://localhost:8080**

### 4. Start Your Node.js Backend

```bash
cd C:\Users\ASUS\Downloads\SecureNest\SecureNest\Chat-App\backend
npm run dev
```

The backend runs on **http://localhost:5003**

### 5. Start Your React Frontend

```bash
cd C:\Users\ASUS\Downloads\SecureNest\SecureNest\Chat-App\frontend
npm run dev
```

The frontend runs on **http://localhost:5173**

## API Endpoints

### Python API (Port 8080)

#### POST /predict
Check if news is real or fake.

**Request:**
```json
{
  "url": "https://example.com/article",  // Optional
  "text": "News text content",           // Optional (provide url OR text)
  "country": "IN",                       // Required (ISO code or name)
  "state": "Punjab"                      // Optional
}
```

**Response:**
```json
{
  "verdict": "likely_real",              // or "likely_fake", "not_enough_info"
  "confidence": 0.86,
  "evidence": [
    {
      "type": "article",
      "source": "NDTV",
      "url": "https://ndtv.com/...",
      "stance": "supports",
      "score": 0.92
    }
  ],
  "top_signals": [
    "Found 3 trusted sources supporting this claim"
  ],
  "model_version": "v1.0"
}
```

#### GET /health
Health check endpoint.

#### GET /sources
Get list of trusted news sources.

### Node.js API (Port 5003)

#### POST /api/fakecheck
Proxy endpoint that calls the Python API.

**Request:** Same as Python API
**Response:** Same as Python API

## How It Works

1. **User submits news** (URL or text) via React frontend
2. **Frontend calls** Node.js backend at `/api/fakecheck`
3. **Backend proxies** request to Python API at `http://localhost:8080/predict`
4. **Python API:**
   - Fetches article content (if URL provided)
   - Extracts key claims
   - Queries multiple sources:
     - Google Fact Check API
     - NewsAPI
     - GDELT
     - Web search (DuckDuckGo)
   - Checks against trusted sources database
   - Uses NLI model for stance detection
   - Calculates verdict based on evidence
5. **Response flows back** through backend to frontend
6. **Frontend displays** result with verdict, confidence, and sources

## Trusted Sources

The system prioritizes these trusted sources:

### India
- National: The Hindu, Times of India, NDTV, Indian Express, etc.
- Regional: State-specific news sources

### USA
- National: New York Times, Washington Post, CNN, BBC, Reuters, AP

### Global
- BBC, Reuters, Associated Press

### Fact-Checkers (Highest Priority)
- Snopes, FactCheck.org, PolitiFact, Alt News, Boom Live

## Troubleshooting

### Port 8000 Already in Use
**Solution:** The system now uses port 8080. Both `main.py` and backend `.env` have been updated.

### Module Not Found Errors
**Solution:** Install all dependencies:
```bash
pip install -r requirements.txt
```

### Torch Version Errors
**Solution:** The requirements.txt now uses `torch>=2.2.0` which is compatible with your system.

### Connection Refused from Node.js
**Solution:** Make sure Python API is running on port 8080 before starting Node.js backend.

### No Results / Low Accuracy
**Solution:** The system uses multiple sources and has balanced thresholds. If you need to adjust:
- Check `app/trusted_sources.py` for source reliability scores
- Adjust thresholds in `app/main.py` (lines 286-384)

## File Structure

```
fakecheck-api/
├── app/
│   ├── __init__.py           # Package init
│   ├── main.py               # FastAPI app & prediction logic
│   ├── retrieval.py          # Article fetching & API queries
│   ├── nli_model.py          # Stance detection using transformers
│   ├── trusted_sources.py   # Trusted news sources database
│   ├── cache.py              # Caching utilities
│   └── seed_sources.py       # Source seeding utilities
├── main.py                   # Entry point
├── requirements.txt          # Python dependencies
├── .env                      # Environment variables
├── Dockerfile                # Docker configuration
└── SETUP_GUIDE.md           # This file
```

## Testing

### Test the Python API directly:
```bash
curl -X POST http://localhost:8080/predict \
  -H "Content-Type: application/json" \
  -H "X-Internal-API-Key: dev-internal-key" \
  -d '{
    "text": "Indian Railways announces mandatory ID proof for train travel",
    "country": "IN"
  }'
```

### Test via Node.js backend:
Use the React frontend at http://localhost:5173 and navigate to the Fake Check page.

## Performance Notes

- First request may be slow (model loading)
- Subsequent requests are faster (model cached)
- Results are cached for 1 hour
- Timeout: 30 seconds per request

## Security

- API key authentication between Node.js and Python
- No direct frontend access to Python API
- All external API keys stored in .env (not committed to git)

## Support

For issues or questions, check:
1. Python API logs (console where uvicorn is running)
2. Node.js backend logs
3. Browser console (frontend errors)

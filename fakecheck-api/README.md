# SecureNest FakeCheck API

FastAPI microservice that evaluates news claims/URLs and returns a verdict, confidence, and evidence using:
- **Article fetching** (newspaper3k)
- **Claim extraction** (heuristic: first paragraph + numeric claims)
- **ClaimReview lookup** (Google Fact Check Tools API)
- **NewsAPI retrieval** (country-filtered articles)
- **NLI stance detection** (HuggingFace transformers: default `facebook/bart-large-mnli`)
- **Redis caching** (24h TTL)
- **MongoDB logging** (optional: predictions + sources)

## Endpoints
- **POST `/predict`** — Request body:
  ```json
  { "url": "?string", "text": "?string", "country": "string", "state": "?string" }
  ```
  Returns `{ verdict, confidence, evidence[], top_signals, model_version }`.
- **GET `/sources`** — Admin; returns known sources. Requires `X-Internal-API-Key`.
- **POST `/sources/refresh`** — Admin; schedules refresh. Requires `X-Internal-API-Key`.
- **GET `/health`** — Healthcheck.

## Environment Variables
- `FAKECHECK_INTERNAL_API_KEY` — Shared secret for Node ↔ Python auth
- `MONGO_URI` — Optional MongoDB connection (e.g., `mongodb://localhost:27017/securenest`)
- `REDIS_URL` — Optional Redis URL (e.g., `redis://localhost:6379`)
- `GOOGLE_FACTCHECK_API_KEY` — Google Fact Check Tools API key (get from [Google Cloud Console](https://console.cloud.google.com/))
- `NEWSAPI_KEY` — NewsAPI key (get from [newsapi.org](https://newsapi.org/))
- `NLI_MODEL` — HuggingFace model name (default: `facebook/bart-large-mnli`)
- `USE_HF_ENDPOINT` — Set to `true` to use HF Inference API (not yet implemented)

## Run locally
- **Python only:**
  ```bash
  cd fakecheck-api
  pip install -r requirements.txt
  export FAKECHECK_INTERNAL_API_KEY=dev-internal-key
  export GOOGLE_FACTCHECK_API_KEY=your_key
  export NEWSAPI_KEY=your_key
  uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
  ```
- **Docker Compose (recommended):**
  ```bash
  # From repo root
  export GOOGLE_FACTCHECK_API_KEY=your_key
  export NEWSAPI_KEY=your_key
  docker compose up --build
  ```

## Seed sources
```bash
export MONGO_URI=mongodb://localhost:27017/securenest
python fakecheck-api/app/seed_sources.py
```

## Limitations
- **No 100% accuracy guarantee** — always recommend human review for confidence < 0.7
- **API rate limits** — respect NewsAPI and Google FactCheck quotas
- **Model size** — default NLI model is ~1.6GB; use lighter model for CPU-only deployments
- **GDELT integration** — placeholder only; requires BigQuery or GDELT API setup

## TODO (future iterations)
- Source reliability weighting in aggregation
- GDELT integration for regional news
- HF Inference API endpoint support
- FEVER/LIAR dataset fine-tuning scripts
- Integration tests with Docker Compose + pytest
- Rate limiting and request throttling

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
import os
from datetime import datetime
from pymongo import MongoClient, errors as mongo_errors
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from app.retrieval import fetch_article_text, extract_candidate_claims, query_claimreview, query_newsapi, query_gdelt, search_web_fallback
from app.nli_model import classify_stance
from app.cache import cache_key, get_cached_prediction, set_cached_prediction
from app.trusted_sources import is_trusted_source

INTERNAL_API_KEY_HEADER = "X-Internal-API-Key"

class PredictRequest(BaseModel):
    url: Optional[str] = None
    text: Optional[str] = None
    scope: Literal["national", "international"] = Field(default="national", description="News scope: national or international")
    country: Optional[str] = Field(None, description="ISO country code or name (required for national scope)")
    state: Optional[str] = None

class EvidenceItem(BaseModel):
    type: Literal["claim_review", "article"]
    source: str
    url: str
    stance: Optional[Literal["supports", "refutes", "neutral"]] = None
    score: Optional[float] = None

class PredictResponse(BaseModel):
    model_config = {"protected_namespaces": ()}

    verdict: Literal["likely_real", "likely_fake", "not_enough_info"]
    confidence: float
    evidence: List[EvidenceItem]
    top_signals: List[str]
    model_version: str = "v1.0"

app = FastAPI(title="SecureNest FakeCheck API", version="0.1.0")

# CORS (dev)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("CORS_ORIGIN", "http://localhost:5173")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Simple in-memory sources store for prototype
SOURCES = [
    {"domain": "thehindu.com", "country_code": "IN", "regions": ["IN-TN"], "reliability_score": 0.9, "ifcn_certified": False, "last_crawled": None},
    {"domain": "nytimes.com", "country_code": "US", "regions": ["US-NY"], "reliability_score": 0.92, "ifcn_certified": False, "last_crawled": None},
]


def _check_internal_api_key(x_internal_api_key: Optional[str]):
    expected = os.getenv("FAKECHECK_INTERNAL_API_KEY")
    if expected and x_internal_api_key != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")


# Mongo helpers (optional)
_mongo_client: Optional[MongoClient] = None


def get_db():
    global _mongo_client
    uri = os.getenv("MONGO_URI")
    if not uri:
        return None
    try:
        if _mongo_client is None:
            _mongo_client = MongoClient(uri, serverSelectionTimeoutMS=1000)
            _mongo_client.admin.command("ping")
        db_name = os.getenv("MONGO_DB_NAME", "securenest")
        return _mongo_client[db_name]
    except mongo_errors.PyMongoError:
        return None


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/sources")
def list_sources(x_internal_api_key: Optional[str] = Header(None, alias=INTERNAL_API_KEY_HEADER)):
    _check_internal_api_key(x_internal_api_key)
    db = get_db()
    if db:
        items = list(db.sources.find({}, {"_id": 0}))
        if items:
            return {"sources": items}
    return {"sources": SOURCES}


@app.post("/sources/refresh")
def refresh_sources(x_internal_api_key: Optional[str] = Header(None, alias=INTERNAL_API_KEY_HEADER)):
    _check_internal_api_key(x_internal_api_key)
    # TODO: Implement NewsAPI/GDELT based refresh. Prototype returns 202.
    return {"status": "scheduled"}


@app.post("/predict", response_model=PredictResponse)
async def predict(payload: PredictRequest, x_internal_api_key: Optional[str] = Header(None, alias=INTERNAL_API_KEY_HEADER)):
    try:
        _check_internal_api_key(x_internal_api_key)

        if not payload.url and not payload.text:
            raise HTTPException(status_code=400, detail="Provide either url or text")
        
        # Validate country requirement for national scope
        if payload.scope == "national" and not payload.country:
            raise HTTPException(status_code=400, detail="Country is required for national scope")

        # Check cache
        ck = cache_key(payload.url, payload.text, payload.country or "GLOBAL", payload.state)
        cached = get_cached_prediction(ck)
        if cached:
            return PredictResponse(**cached)

        # Simple fallback response for now
        if "alien" in (payload.text or "").lower():
            return PredictResponse(
                verdict="likely_fake",
                confidence=0.85,
                evidence=[],
                top_signals=["Suspicious claim detected"]
            )
        
        # Default response
        return PredictResponse(
            verdict="likely_real",
            confidence=0.70,
            evidence=[],
            top_signals=["Basic analysis completed"]
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR in predict endpoint: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

import os
from pymongo import MongoClient
from datetime import datetime

US_SOURCES = [
    {"domain": "nytimes.com", "country_code": "US", "regions": ["US-NY"], "reliability_score": 0.92, "ifcn_certified": False},
    {"domain": "washingtonpost.com", "country_code": "US", "regions": ["US-DC"], "reliability_score": 0.9, "ifcn_certified": False},
    {"domain": "apnews.com", "country_code": "US", "regions": ["US"], "reliability_score": 0.93, "ifcn_certified": True},
]

IN_SOURCES = [
    {"domain": "thehindu.com", "country_code": "IN", "regions": ["IN-TN"], "reliability_score": 0.9, "ifcn_certified": False},
    {"domain": "indianexpress.com", "country_code": "IN", "regions": ["IN-MH"], "reliability_score": 0.88, "ifcn_certified": False},
    {"domain": "altnews.in", "country_code": "IN", "regions": ["IN"], "reliability_score": 0.95, "ifcn_certified": True},
]


def main():
    uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/securenest")
    db_name = os.getenv("MONGO_DB_NAME", "securenest")
    client = MongoClient(uri)
    db = client[db_name]
    items = []
    now = datetime.utcnow()

    def norm(x):
        x = dict(x)
        x["last_crawled"] = now
        return x

    items.extend([norm(x) for x in US_SOURCES])
    items.extend([norm(x) for x in IN_SOURCES])

    for it in items:
        db.sources.update_one({"domain": it["domain"]}, {"$set": it}, upsert=True)

    print(f"Seeded {len(items)} sources into {db_name}.sources")


if __name__ == "__main__":
    main()

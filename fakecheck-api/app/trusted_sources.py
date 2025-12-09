"""
Trusted news sources database - organized by country and region.
Only these sources will be prioritized for fact-checking to ensure reliability.
"""

TRUSTED_SOURCES = {
    "INTERNATIONAL": [
        # Major International News Organizations
        {"name": "BBC", "domain": "bbc.com", "reliability": 0.96},
        {"name": "BBC", "domain": "bbc.co.uk", "reliability": 0.96},
        {"name": "Reuters", "domain": "reuters.com", "reliability": 0.97},
        {"name": "Associated Press", "domain": "apnews.com", "reliability": 0.96},
        {"name": "Al Jazeera", "domain": "aljazeera.com", "reliability": 0.90},
        {"name": "The Guardian", "domain": "theguardian.com", "reliability": 0.93},
        {"name": "CNN International", "domain": "cnn.com", "reliability": 0.88},
        {"name": "France 24", "domain": "france24.com", "reliability": 0.89},
        {"name": "Deutsche Welle", "domain": "dw.com", "reliability": 0.91},
        {"name": "Euronews", "domain": "euronews.com", "reliability": 0.88},
        # International Organizations
        {"name": "United Nations", "domain": "un.org", "reliability": 0.98},
        {"name": "World Health Organization", "domain": "who.int", "reliability": 0.98},
        {"name": "UNESCO", "domain": "unesco.org", "reliability": 0.97},
        {"name": "UNICEF", "domain": "unicef.org", "reliability": 0.97},
        {"name": "World Bank", "domain": "worldbank.org", "reliability": 0.96},
        {"name": "International Monetary Fund", "domain": "imf.org", "reliability": 0.96},
        {"name": "World Trade Organization", "domain": "wto.org", "reliability": 0.95},
        {"name": "NATO", "domain": "nato.int", "reliability": 0.94},
        {"name": "European Union", "domain": "europa.eu", "reliability": 0.95},
        {"name": "International Red Cross", "domain": "icrc.org", "reliability": 0.96},
        # Scientific Organizations
        {"name": "Nature", "domain": "nature.com", "reliability": 0.97},
        {"name": "Science Magazine", "domain": "science.org", "reliability": 0.97},
        {"name": "NASA", "domain": "nasa.gov", "reliability": 0.98},
        {"name": "ISRO", "domain": "isro.gov.in", "reliability": 0.98},
        {"name": "ESA", "domain": "esa.int", "reliability": 0.97},
        {"name": "CERN", "domain": "cern.ch", "reliability": 0.97},
        # Historical & Reference Sources
        {"name": "Wikipedia", "domain": "wikipedia.org", "reliability": 0.92},  # Matches en.wikipedia.org, etc.
        {"name": "Wikipedia EN", "domain": "en.wikipedia.org", "reliability": 0.92},  # Explicit English Wikipedia
        {"name": "Encyclopedia Britannica", "domain": "britannica.com", "reliability": 0.94},
        {"name": "Britannica EN", "domain": "www.britannica.com", "reliability": 0.94},  # WWW subdomain
    ],
    "IN": {
        "national": [
            # Major National News Channels
            {"name": "The Hindu", "domain": "thehindu.com", "reliability": 0.95},
            {"name": "Times of India", "domain": "timesofindia.indiatimes.com", "reliability": 0.90},
            {"name": "Hindustan Times", "domain": "hindustantimes.com", "reliability": 0.92},
            {"name": "Indian Express", "domain": "indianexpress.com", "reliability": 0.93},
            {"name": "NDTV", "domain": "ndtv.com", "reliability": 0.91},
            {"name": "News18 India", "domain": "news18.com", "reliability": 0.88},
            {"name": "Aaj Tak", "domain": "aajtak.in", "reliability": 0.87},
            {"name": "ABP News", "domain": "abplive.com", "reliability": 0.86},
            {"name": "Dainik Jagran", "domain": "jagran.com", "reliability": 0.85},
            {"name": "Dainik Bhaskar", "domain": "bhaskar.com", "reliability": 0.84},
            {"name": "India Today", "domain": "indiatoday.in", "reliability": 0.89},
            {"name": "The Wire", "domain": "thewire.in", "reliability": 0.88},
            {"name": "Scroll.in", "domain": "scroll.in", "reliability": 0.87},
            {"name": "The Quint", "domain": "thequint.com", "reliability": 0.86},
            {"name": "Republic World", "domain": "republicworld.com", "reliability": 0.82},
            {"name": "Zee News", "domain": "zeenews.india.com", "reliability": 0.83},
            {"name": "India TV", "domain": "indiatvnews.com", "reliability": 0.82},
            {"name": "Economic Times", "domain": "economictimes.indiatimes.com", "reliability": 0.91},
            {"name": "Business Standard", "domain": "business-standard.com", "reliability": 0.90},
            {"name": "Mint", "domain": "livemint.com", "reliability": 0.89},
        ],
        "regional": {
            "punjab": [
                {"name": "News18 Punjab Haryana", "domain": "punjab.news18.com", "reliability": 0.85},
                {"name": "Jagbani", "domain": "jagbani.punjabkesari.in", "reliability": 0.84},
                {"name": "Tribune India", "domain": "tribuneindia.com", "reliability": 0.88},
                {"name": "The Tribune", "domain": "tribuneindia.com", "reliability": 0.88},
                {"name": "Punjabi Tribune", "domain": "punjabitribune.com", "reliability": 0.86},
            ],
            "haryana": [
                {"name": "News18 Punjab Haryana", "domain": "punjab.news18.com", "reliability": 0.85},
                {"name": "Tribune India", "domain": "tribuneindia.com", "reliability": 0.88},
            ],
            "maharashtra": [
                {"name": "Maharashtra Times", "domain": "maharashtratimes.com", "reliability": 0.86},
                {"name": "Loksatta", "domain": "loksatta.com", "reliability": 0.87},
            ],
            "tamil nadu": [
                {"name": "The Hindu Tamil Nadu", "domain": "thehindu.com", "reliability": 0.95},
                {"name": "Dinamalar", "domain": "dinamalar.com", "reliability": 0.84},
            ],
        }
    },
    "US": {
        "national": [
            {"name": "New York Times", "domain": "nytimes.com", "reliability": 0.95},
            {"name": "Washington Post", "domain": "washingtonpost.com", "reliability": 0.94},
            {"name": "CNN", "domain": "cnn.com", "reliability": 0.88},
            {"name": "BBC News", "domain": "bbc.com", "reliability": 0.96},
            {"name": "Reuters", "domain": "reuters.com", "reliability": 0.97},
            {"name": "Associated Press", "domain": "apnews.com", "reliability": 0.96},
        ],
    },
    "GB": {
        "national": [
            {"name": "BBC News", "domain": "bbc.com", "reliability": 0.96},
            {"name": "The Guardian", "domain": "theguardian.com", "reliability": 0.93},
            {"name": "Reuters UK", "domain": "reuters.com", "reliability": 0.97},
        ],
    },
    "GLOBAL": [
        {"name": "BBC", "domain": "bbc.com", "reliability": 0.96},
        {"name": "Reuters", "domain": "reuters.com", "reliability": 0.97},
        {"name": "Associated Press", "domain": "apnews.com", "reliability": 0.96},
    ]
}

# Fact-checking organizations (highest priority)
FACT_CHECKERS = [
    {"name": "Snopes", "domain": "snopes.com", "reliability": 0.98},
    {"name": "FactCheck.org", "domain": "factcheck.org", "reliability": 0.97},
    {"name": "PolitiFact", "domain": "politifact.com", "reliability": 0.96},
    {"name": "AFP Fact Check", "domain": "factcheck.afp.com", "reliability": 0.95},
    {"name": "Alt News (India)", "domain": "altnews.in", "reliability": 0.94},
    {"name": "Boom Live (India)", "domain": "boomlive.in", "reliability": 0.93},
    # {"name": "The Quint WebQoof", "domain": "thequint.com/news/webqoof", "reliability": 0.92},  # Removed per user request
    {"name": "India Today Fact Check", "domain": "indiatoday.in/fact-check", "reliability": 0.91},
    {"name": "Vishvas News", "domain": "vishvasnews.com", "reliability": 0.90},
]


# Government and official press portals (global)
# We treat these as highly trusted because they are owned/maintained by governments
GOV_TLD_SUFFIXES = [
    # Generic and common ccTLDs
    '.gov', '.gov.in', '.nic.in', '.gov.uk', '.gouv.fr', '.go.jp', '.go.kr', '.gov.br', '.gov.au',
    '.govt.nz', '.gov.sg', '.gc.ca', '.canada.ca', '.gov.cn', '.bund.de', '.gov.za', '.gov.ng',
    '.gov.pk', '.gov.bd', '.gov.il', '.gov.sa'
]

GOV_DOMAINS = {
    # India - PIB and Ministries (Comprehensive)
    'pib.gov.in', 'pressinformationbureau.gov.in', 'pib.nic.in', 'www.pib.gov.in',
    'india.gov.in', 'pmindia.gov.in', 'mea.gov.in', 'mha.gov.in', 'mohfw.gov.in',
    'dot.gov.in', 'meity.gov.in', 'mci.gov.in', 'trai.gov.in', 'dipp.gov.in',
    'finmin.nic.in', 'education.gov.in', 'labour.gov.in', 'rural.nic.in',
    'coal.nic.in', 'petroleum.nic.in', 'steel.gov.in', 'textiles.gov.in',
    'ayush.gov.in', 'tribal.nic.in', 'social.nic.in', 'wcd.nic.in',
    # United States
    'whitehouse.gov', 'usa.gov', 'state.gov', 'defense.gov', 'doi.gov', 'cdc.gov',
    # United Kingdom
    'gov.uk', 'number10.gov.uk', 'parliament.uk',
    # European Union
    'europa.eu', 'ec.europa.eu',
    # Canada
    'canada.ca', 'gc.ca',
    # Australia
    'australia.gov.au', 'pm.gov.au',
    # New Zealand
    'govt.nz', 'beehive.govt.nz',
    # Singapore
    'gov.sg', 'mci.gov.sg',
    # Japan
    'go.jp', 'kantei.go.jp',
    # South Korea
    'go.kr', 'pmo.go.kr',
    # Germany
    'bund.de', 'bmi.bund.de',
    # France
    'gouv.fr', 'elysee.fr',
    # Brazil
    'gov.br', 'planalto.gov.br',
    # China
    'gov.cn'
}

# Technology Companies and Major Corporations (Official Sites Only)
CORPORATE_DOMAINS = {
    # Technology Companies
    'openai.com', 'blog.openai.com', 'google.com', 'blog.google', 'ai.google',
    'microsoft.com', 'blogs.microsoft.com', 'news.microsoft.com',
    'apple.com', 'newsroom.apple.com', 'developer.apple.com',
    'meta.com', 'about.fb.com', 'ai.meta.com', 'about.instagram.com',
    'tesla.com', 'twitter.com', 'blog.twitter.com', 'x.com',
    'amazon.com', 'press.aboutamazon.com', 'aws.amazon.com',
    'nvidia.com', 'blogs.nvidia.com', 'developer.nvidia.com',
    'intel.com', 'newsroom.intel.com', 'ibm.com', 'newsroom.ibm.com',
    'oracle.com', 'blogs.oracle.com', 'salesforce.com', 'news.salesforce.com',
    'adobe.com', 'blog.adobe.com', 'netflix.com', 'about.netflix.com',
    'uber.com', 'newsroom.uber.com', 'airbnb.com', 'news.airbnb.com',
    'spotify.com', 'newsroom.spotify.com', 'zoom.us', 'blog.zoom.us',
    
    # Major Corporations
    'walmart.com', 'corporate.walmart.com', 'jpmorgan.com', 'jpmorganchase.com',
    'berkshirehathaway.com', 'exxonmobil.com', 'chevron.com', 'pg.com',
    'jnj.com', 'ge.com', 'verizon.com', 'att.com', 'disney.com', 'thewaltdisneycompany.com',
    'coca-cola.com', 'pepsico.com', 'mcdonalds.com', 'starbucks.com'
}


def is_trusted_source(url: str, country: str = None, scope: str = "national", state: str = None) -> tuple[bool, float]:
    """
    Check if a URL is from a trusted source.
    Returns (is_trusted, reliability_score).
    
    Args:
        url: The URL to check
        country: Country code (optional for international scope)
        scope: "national", "international", or "regional"
        state: State/province name (for regional scope)
    """
    if not url:
        return False, 0.0
    
    url_lower = url.lower()
    try:
        from urllib.parse import urlparse
        host = urlparse(url_lower).netloc
    except Exception:
        host = url_lower

    # Government portals: trust by explicit domain or by trusted TLD suffix
    # BUT filter by country to avoid US sources for Indian claims, etc.
    if host:
        # Country-specific filtering for government domains
        if country:
            country_upper = country.upper()
            
            # For Indian claims, block US/UK/EU government domains
            if country_upper in ['IN', 'INDIA']:
                us_gov_domains = ['whitehouse.gov', 'usa.gov', 'state.gov', 'defense.gov', 'cdc.gov', 
                                  'congress.gov', 'opm.gov', 'senate.gov', 'house.gov']
                if any(d in host for d in us_gov_domains):
                    return False, 0.0
                # Only accept .gov.in or Indian government domains
                if not (host.endswith('.gov.in') or host.endswith('.nic.in') or any(d in host for d in ['pib.gov.in', 'india.gov.in', 'pmindia.gov.in'])):
                    # Check if it's a US gov domain
                    if '.gov' in host and not '.gov.in' in host:
                        return False, 0.0
        
        # Exact domain or subdomain match
        for d in GOV_DOMAINS:
            if d in host:
                return True, 0.97
        # TLD suffix match (e.g., *.gov.in, *.go.jp)
        for suf in GOV_TLD_SUFFIXES:
            if host.endswith(suf):
                return True, 0.97
        
        # Corporate domains: trust official company websites
        for d in CORPORATE_DOMAINS:
            if d in host:
                return True, 0.95
    
    # Check fact-checkers first (highest priority - always checked)
    for source in FACT_CHECKERS:
        if source["domain"] in url_lower:
            return True, source["reliability"]
    
    # For international scope, prioritize international sources
    if scope == "international":
        # Check international sources
        for source in TRUSTED_SOURCES.get("INTERNATIONAL", []):
            if source["domain"] in url_lower:
                return True, source["reliability"]
        
        # Also check global sources
        for source in TRUSTED_SOURCES.get("GLOBAL", []):
            if source["domain"] in url_lower:
                return True, source["reliability"]
    
    # Check global sources (always)
    for source in TRUSTED_SOURCES.get("GLOBAL", []):
        if source["domain"] in url_lower:
            return True, source["reliability"]
    
    # Check country-specific sources (for national scope or if country provided)
    if country:
        country_upper = country.upper()
        if country_upper in TRUSTED_SOURCES:
            country_data = TRUSTED_SOURCES[country_upper]
            
            # Check national sources
            for source in country_data.get("national", []):
                if source["domain"] in url_lower:
                    return True, source["reliability"]
            
            # Check regional sources
            if "regional" in country_data:
                for state_sources in country_data["regional"].values():
                    for source in state_sources:
                        if source["domain"] in url_lower:
                            return True, source["reliability"]
    
    return False, 0.0

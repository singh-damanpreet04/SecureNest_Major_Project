"""
Retrieval module: article fetching, claim extraction, ClaimReview, NewsAPI/GDELT
"""
import os
import httpx
import re
from typing import List, Dict, Optional
from bs4 import BeautifulSoup
from urllib.parse import urlparse
from app.trusted_sources import is_trusted_source
from urllib.parse import quote_plus
from newspaper import Article


def fetch_article_text(url: str) -> Optional[str]:
    """Fetch and parse article from URL using newspaper3k with fallbacks."""
    # Try newspaper3k first
    try:
        # Configure article with better settings
        article = Article(url, language='en')
        article.download()
        article.parse()
        
        # Return text if we got something substantial
        if article.text and len(article.text) > 50:
            print(f"Successfully extracted article using newspaper3k (English)")
            return article.text
    except Exception as e:
        print(f"Newspaper3k English failed: {e}")
    
    # Try Hindi
    try:
        article = Article(url, language='hi')
        article.download()
        article.parse()
        if article.text and len(article.text) > 50:
            print(f"Successfully extracted article using newspaper3k (Hindi)")
            return article.text
    except Exception as e:
        print(f"Newspaper3k Hindi failed: {e}")
    
    # Fallback: Direct HTTP request with BeautifulSoup
    try:
        import httpx
        from bs4 import BeautifulSoup
        
        print(f"Trying direct HTTP fetch for {url}")
        with httpx.Client(timeout=10.0, follow_redirects=True) as client:
            response = client.get(url, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            })
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # Remove script and style elements
                for script in soup(["script", "style", "nav", "footer", "header"]):
                    script.decompose()
                
                # Try to find article content
                article_text = ""
                
                # Common article selectors
                selectors = ['article', '.article-content', '.story-content', 
                           '.post-content', 'main', '.content']
                
                for selector in selectors:
                    content = soup.select_one(selector)
                    if content:
                        article_text = content.get_text(separator=' ', strip=True)
                        if len(article_text) > 100:
                            print(f"Extracted {len(article_text)} chars using selector: {selector}")
                            return article_text
                
                # Fallback: get all paragraph text
                paragraphs = soup.find_all('p')
                article_text = ' '.join([p.get_text(strip=True) for p in paragraphs])
                if len(article_text) > 100:
                    print(f"Extracted {len(article_text)} chars from paragraphs")
                    return article_text
                    
    except Exception as e:
        print(f"Direct HTTP fetch failed: {e}")
    
    print(f"All article extraction methods failed for {url}")
    return None


def extract_candidate_claims(text: str, max_claims: int = 2) -> List[str]:
    """
    Extract candidate claim sentences from text.
    Heuristic: first paragraph + sentences with numbers/statistics.
    """
    if not text:
        return []
    
    sentences = re.split(r'[.!?]\s+', text)
    claims = []
    
    # First paragraph (up to first double newline or first 3 sentences)
    first_para = []
    for s in sentences[:3]:
        first_para.append(s.strip())
        if '\n\n' in s:
            break
    claims.extend(first_para[:1])
    
    # Sentences with numbers (likely factual claims)
    for s in sentences:
        if re.search(r'\d+', s) and len(s.split()) > 5:
            claims.append(s.strip())
            if len(claims) >= max_claims:
                break
    
    return list(set(claims))[:max_claims]


async def query_claimreview(claim: str, api_key: Optional[str]) -> List[Dict]:
    """
    Query Google Fact Check Tools API for ClaimReview matches - FILTERED BY TRUSTED FACT-CHECKERS ONLY.
    """
    if not api_key:
        return []
    
    print(f"[Fact Check API] Filtering results by trusted fact-checkers only")
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                "https://factchecktools.googleapis.com/v1alpha1/claims:search",
                params={"query": claim, "key": api_key, "languageCode": "en"}
            )
            if resp.status_code != 200:
                return []
            
            data = resp.json()
            results = []
            for item in data.get("claims", [])[:3]:
                for review in item.get("claimReview", [])[:1]:
                    url = review.get("url", "")
                    # FILTER: Only add if fact-checker is in trusted sources list
                    is_trusted, reliability = is_trusted_source(url, None, "international")
                    if is_trusted:
                        parsed_domain = urlparse(url).netloc
                        print(f"✓ TRUSTED FACT-CHECKER: {parsed_domain} (reliability: {reliability})")
                        results.append({
                            "type": "claim_review",
                            "source": review.get("publisher", {}).get("name", "Unknown"),
                            "url": url,
                            "rating": review.get("textualRating", ""),
                            "reliability": reliability
                        })
                    else:
                        parsed_domain = urlparse(url).netloc
                        print(f"✗ BLOCKED FACT-CHECKER: {parsed_domain} (not in trusted list)")
            return results
    except Exception:
        return []


async def query_newsapi(query: str, country: Optional[str], api_key: Optional[str]) -> List[Dict]:
    """
    Query NewsAPI for articles - FILTERED BY TRUSTED SOURCES ONLY.
    """
    if not api_key:
        return []
    
    print(f"[NewsAPI] Filtering results by trusted sources only")

    try:
        results = []
        async with httpx.AsyncClient(timeout=10.0) as client:

            # Strategy 1: Broader search - any news sources
            resp = await client.get(
                "https://newsapi.org/v2/everything",
                params={
                    "q": query,
                    "language": "en",
                    "sortBy": "relevancy",
                    "pageSize": 15,  # Get more results
                    "apiKey": api_key
                }
            )

            if resp.status_code == 200:
                data = resp.json()
                for art in data.get("articles", [])[:10]:
                    url = art.get("url", "")
                    # FILTER: Only add if URL is from a trusted source
                    is_trusted, reliability = is_trusted_source(url, country, "national")
                    if is_trusted:
                        parsed_domain = urlparse(url).netloc
                        print(f"✓ TRUSTED (NewsAPI): {parsed_domain} (reliability: {reliability})")
                        results.append({
                            "title": art.get("title", ""),
                            "url": url,
                            "source": art.get("source", {}).get("name", "Unknown"),
                            "description": art.get("description", ""),
                            "reliability": reliability
                        })
                    else:
                        parsed_domain = urlparse(url).netloc
                        print(f"✗ BLOCKED (NewsAPI): {parsed_domain}")

            # Strategy 2: Country-specific headlines if available
            if country and len(results) < 5:
                try:
                    country_code = country.lower() if len(country) == 2 else None
                    if country_code:
                        resp = await client.get(
                            "https://newsapi.org/v2/top-headlines",
                            params={
                                "q": query,
                                "country": country_code,
                                "pageSize": 10,
                                "apiKey": api_key
                            }
                        )
                        if resp.status_code == 200:
                            data = resp.json()
                            for art in data.get("articles", [])[:5]:
                                url = art.get("url", "")
                                # FILTER: Only add if URL is from a trusted source
                                is_trusted, reliability = is_trusted_source(url, country, "national")
                                if is_trusted:
                                    parsed_domain = urlparse(url).netloc
                                    print(f"✓ TRUSTED (NewsAPI Headlines): {parsed_domain}")
                                    results.append({
                                        "title": art.get("title", ""),
                                        "url": url,
                                        "source": art.get("source", {}).get("name", "Unknown"),
                                        "description": art.get("description", ""),
                                        "reliability": reliability
                                    })
                                else:
                                    parsed_domain = urlparse(url).netloc
                                    print(f"✗ BLOCKED (NewsAPI Headlines): {parsed_domain}")
                except:
                    pass

            return results[:15]
    except Exception as e:
        print(f"NewsAPI error: {e}")
        return []


async def query_gdelt(query: str, country: Optional[str]) -> List[Dict]:
    """
    Query GDELT for articles using their free API - FILTERED BY TRUSTED SOURCES ONLY.
    """
    print(f"[GDELT] Filtering results by trusted sources only")
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # GDELT 2.0 DOC API
            resp = await client.get(
                "https://api.gdeltproject.org/api/v2/doc/doc",
                params={
                    "query": query,
                    "mode": "artlist",
                    "maxrecords": 10,
                    "format": "json",
                    "sort": "hybridrel"
                }
            )
            if resp.status_code != 200:
                return []
            
            data = resp.json()
            results = []
            for art in data.get("articles", [])[:5]:
                url = art.get("url", "")
                # FILTER: Only add if URL is from a trusted source
                is_trusted, reliability = is_trusted_source(url, country, "national")
                if is_trusted:
                    parsed_domain = urlparse(url).netloc
                    print(f"✓ TRUSTED (GDELT): {parsed_domain} (reliability: {reliability})")
                    results.append({
                        "title": art.get("title", ""),
                        "url": url,
                        "source": art.get("domain", "Unknown"),
                        "description": art.get("title", ""),
                        "reliability": reliability
                    })
                else:
                    parsed_domain = urlparse(url).netloc
                    print(f"✗ BLOCKED (GDELT): {parsed_domain}")
            return results
    except Exception as e:
        print(f"GDELT error: {e}")
        return []


async def search_web_fallback(query: str, country: str = None, scope: str = "national", state: str = None) -> List[Dict]:
    """
    Search for sources from TRUSTED DOMAINS ONLY.
    For international scope, searches international news sources.
    For regional scope, searches state/province-specific news sources.
    """
    results = []
    
    print(f"[TRUSTED SOURCES ONLY] Starting web search with scope: {scope}" + (f", state: {state}" if state else ""))

    # Extract key terms only (first 5-7 important words) to avoid overly specific searches
    words = query.split()
    key_words = [w for w in words if len(w) > 3 and w[0].isupper()][:7]  # Capitalized words, max 7
    if not key_words:
        key_words = words[:7]  # Fallback to first 7 words
    clean_query = ' '.join(key_words)
    
    # Adjust search queries based on scope
    if scope == "international":
        search_queries = [
            f"{clean_query}",  # Simple query first - most likely to get results
            f"{clean_query} BBC Reuters",
        ]
    elif scope == "regional" and state:
        # Regional news: add state context
        search_queries = [
            f"{clean_query} {state}",  # Key terms + state
            f"{clean_query} Tribune India",  # Regional source
        ]
    else:
        # National scope
        search_queries = [
            f"{clean_query}",  # Simple query first
            f"{clean_query} {country}" if country else f"{clean_query} news",
        ]

    print(f"Search queries (scope: {scope}): {search_queries}")

    # Try multiple search engines and queries
    for search_query in search_queries[:2]:  # Limit to avoid too many requests
        try:
            async with httpx.AsyncClient(timeout=12.0, follow_redirects=True) as client:
                from bs4 import BeautifulSoup

                print(f"Trying DuckDuckGo with: '{search_query}'")

                resp = await client.get(
                    "https://html.duckduckgo.com/html/",
                    params={"q": search_query, "s": "0"},
                    headers={
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                )

                if resp.status_code == 200:
                    soup = BeautifulSoup(resp.text, 'html.parser')

                    for result in soup.select('.result')[:8]:  # Get more results
                        title_elem = result.select_one('.result__title')
                        link_elem = result.select_one('.result__url')

                        if title_elem and link_elem:
                            url = link_elem.get('href', '')
                            if url.startswith('//duckduckgo.com/l/?'):
                                import urllib.parse
                                parsed = urllib.parse.parse_qs(urllib.parse.urlparse(url).query)
                                url = parsed.get('uddg', [''])[0]

                            if url and url.startswith('http'):
                                # FILTER: Only add if URL is from a trusted source
                                is_trusted, reliability = is_trusted_source(url, country, scope, state)
                                if is_trusted:
                                    parsed_domain = urlparse(url).netloc
                                    print(f"✓ TRUSTED source found: {parsed_domain} (reliability: {reliability})")
                                    results.append({
                                        "title": title_elem.get_text(strip=True)[:100],
                                        "url": url,
                                        "source": "Trusted Web Source",
                                        "description": search_query,
                                        "reliability": reliability
                                    })
                                else:
                                    parsed_domain = urlparse(url).netloc
                                    print(f"✗ BLOCKED untrusted source: {parsed_domain}")

                print(f"DuckDuckGo found {len(results)} results for '{search_query}'")

        except Exception as e:
            print(f"DuckDuckGo error for '{search_query}': {e}")

        # If we got some results, break early
        if len(results) >= 5:
            break

    # If still no results, try even broader search (still filtered by trusted sources)
    if len(results) < 3:
        try:
            print(f"Trying very broad search for '{clean_query}' (trusted sources only)...")
            broad_results = await simple_web_search(clean_query, country or "", scope, state)
            results.extend(broad_results[:10])
        except Exception as e:
            print(f"Broad search error: {e}")

    print(f"Total web search results: {len(results)}")
    return results[:15]


async def simple_web_search(query: str, country: Optional[str], scope: str = "national", state: Optional[str] = None) -> List[Dict]:
    """Simpler web search using direct search engines - FILTERED BY TRUSTED SOURCES ONLY."""
    results = []
    print(f"[SIMPLE WEB SEARCH] Searching trusted sources only (scope: {scope})")

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Try Bing search
            resp = await client.get(
                "https://www.bing.com/search",
                params={"q": f"{query} news", "count": 10},
                headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
            )

            if resp.status_code == 200:
                from bs4 import BeautifulSoup
                soup = BeautifulSoup(resp.text, 'html.parser')

                for result in soup.select('.b_algo')[:8]:
                    title_elem = result.select_one('h2 a')
                    link_elem = result.select_one('h2 a')
                    snippet_elem = result.select_one('.b_caption p')

                    if title_elem and link_elem:
                        url = link_elem.get('href', '')
                        
                        # Skip if it's a Bing internal link
                        if not url or 'bing.com' in url.lower():
                            continue
                            
                        # FILTER: Only add if URL is from a trusted source
                        is_trusted, reliability = is_trusted_source(url, country, scope, state)
                        if is_trusted:
                            parsed_domain = urlparse(url).netloc
                            print(f"✓ TRUSTED source found (Bing): {parsed_domain} (reliability: {reliability})")
                            results.append({
                                "title": title_elem.get_text(strip=True)[:100],
                                "url": url,
                                "source": "Trusted Web Source",
                                "description": snippet_elem.get_text(strip=True)[:200] if snippet_elem else "",
                                "reliability": reliability
                            })
                        else:
                            parsed_domain = urlparse(url).netloc
                            print(f"✗ BLOCKED untrusted source (Bing): {parsed_domain}")

    except Exception as e:
        print(f"Bing search error: {e}")

    return results


async def search_wikipedia(query: str) -> List[Dict]:
    """
    Search Wikipedia directly for historical events and facts.
    Returns articles that match the query.
    """
    results = []
    
    # Extract key terms from query - prioritize proper nouns and specific names
    # Match: Chandrayaan-3, ISRO, COVID-19, etc.
    words = re.findall(r'\b[A-Z][a-z]*(?:\-\d+)?|\b[A-Z]{2,}\b', query)
    
    # Try multiple search strategies
    search_queries = []
    if len(words) >= 2:
        # Strategy 1: First 2 most important terms (e.g., "Chandrayaan-3 ISRO")
        search_queries.append(' '.join(words[:2]))
    if len(words) >= 1:
        # Strategy 2: Just the first term (e.g., "Chandrayaan-3")
        search_queries.append(words[0])
    
    # Fallback to first 50 chars if no capitalized terms
    if not search_queries:
        search_queries.append(query[:50])
    
    print(f"[WIKIPEDIA] Trying search strategies: {search_queries}")
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Try each search query until we get results
            for search_query in search_queries:
                print(f"[WIKIPEDIA] Searching for: '{search_query}'...")
                
                resp = await client.get(
                    "https://en.wikipedia.org/w/api.php",
                    params={
                        "action": "query",
                        "list": "search",
                        "srsearch": search_query,
                        "format": "json",
                        "srlimit": 5
                    }
                )
                
                if resp.status_code == 200:
                    data = resp.json()
                    search_results = data.get("query", {}).get("search", [])
                    
                    for item in search_results[:3]:
                        title = item.get("title", "")
                        pageid = item.get("pageid", "")
                        snippet = item.get("snippet", "").replace("<span class='searchmatch'>", "").replace("</span>", "")
                        
                        url = f"https://en.wikipedia.org/wiki/{title.replace(' ', '_')}"
                        
                        print(f"✓ FOUND Wikipedia article: {title}")
                        results.append({
                            "title": f"Wikipedia: {title}",
                            "url": url,
                            "source": "Wikipedia",
                            "description": snippet[:200],
                            "reliability": 0.92,
                            "type": "wikipedia"
                        })
                    
                    if len(results) > 0:
                        print(f"✓ Wikipedia found {len(results)} relevant articles")
                        break  # Stop searching if we found results
                    else:
                        print(f"✗ No results for '{search_query}', trying next strategy...")
            
            if len(results) == 0:
                print(f"✗ No Wikipedia articles found for any search strategy")
                    
    except Exception as e:
        print(f"Wikipedia search error: {e}")
    
    return results

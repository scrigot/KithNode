"""Discover companies matching search criteria using seed list + DuckDuckGo."""

from __future__ import annotations

import re
import time
from urllib.parse import urlparse
from ddgs import DDGS
from config import SEED_COMPANIES, SEARCH_QUERIES


# Domains to skip in search results
SKIP_DOMAINS = {
    "linkedin.com", "facebook.com", "twitter.com", "x.com",
    "instagram.com", "youtube.com", "reddit.com", "tiktok.com",
    "indeed.com", "glassdoor.com", "ziprecruiter.com", "lever.co",
    "greenhouse.io", "workday.com",
    "crunchbase.com", "wikipedia.org", "yelp.com", "wellfound.com",
    "angellist.com", "f6s.com", "pitchbook.com", "owler.com",
    "zoominfo.com", "apollo.io", "cbinsights.com",
    "techcrunch.com", "forbes.com", "bloomberg.com", "wsj.com",
    "wired.com", "theverge.com", "venturebeat.com", "techbullion.com",
    "builtin.com", "grepbeat.com", "wraltechwire.com", "bizjournals.com",
    "medium.com", "substack.com", "businessinsider.com", "axios.com",
    "bbb.org", "mapquest.com", "yellowpages.com",
    "google.com", "bing.com", "duckduckgo.com",
    "visitnc.com", "city-data.com", "niche.com",
    "amazon.com", "apple.com", "microsoft.com",
    "nc.gov", "unc.edu", "duke.edu", "ncsu.edu", "sba.gov",
    "simplyhired.com", "glassdoor.co.in", "businessnc.com",
    "researchtriangle.org", "carolinafintechhub.org", "raleigh-wake.org",
}


def _extract_domain(url: str) -> str:
    parsed = urlparse(url)
    domain = parsed.netloc.lower()
    if domain.startswith("www."):
        domain = domain[4:]
    return domain


def _is_useful_result(url: str, title: str) -> bool:
    domain = _extract_domain(url)
    for skip in SKIP_DOMAINS:
        if domain == skip or domain.endswith("." + skip):
            return False
    title_lower = title.lower()
    skip_patterns = [
        "best ", "top ", " list", "things to do", "where to live",
        "how to ", "guide to", "review of", " vs ", "comparison",
        "what is ", "definition of", "how progressive",
    ]
    return not any(p in title_lower for p in skip_patterns)


def _guess_industry_tags(title: str, body: str) -> list[str]:
    text = (title + " " + body).lower()
    tags = []
    if any(w in text for w in ["fintech", "financial technology", "payments", "banking", "lending"]):
        tags.append("fintech")
    if re.search(r'\bai\b', text) or any(w in text for w in [
        "artificial intelligence", "machine learning", "deep learning", "llm", "generative ai"
    ]):
        tags.append("AI")
    if any(w in text for w in ["consult", "advisory", "strategy firm"]):
        tags.append("consulting")
    if any(w in text for w in ["startup", "seed stage", "series a", "early-stage"]):
        tags.append("startup")
    if re.search(r'\bvc\b', text) or any(w in text for w in [
        "venture capital", "venture fund", "portfolio companies"
    ]):
        tags.append("VC")
    if any(w in text for w in ["saas", "software as a service", "cloud software"]):
        tags.append("SaaS")
    if any(w in text for w in ["financial services", "wealth management", "asset management",
                                "insurance", "investment management"]):
        tags.append("financial services")
    if any(w in text for w in ["real estate", "property management", "proptech"]):
        tags.append("real estate")
    return tags if tags else ["tech"]


def _guess_location(title: str, body: str) -> str:
    text = (title + " " + body).lower()
    for city, label in [
        ("chapel hill", "Chapel Hill, NC"),
        ("durham", "Durham, NC"),
        ("raleigh", "Raleigh, NC"),
        ("research triangle", "Research Triangle, NC"),
        ("charlotte", "Charlotte, NC"),
        ("charleston", "Charleston, SC"),
    ]:
        if city in text:
            return label
    if "north carolina" in text or ", nc" in text:
        return "North Carolina"
    if "remote" in text:
        return "Remote"
    return "Unknown"


def _load_seed_companies() -> list[dict]:
    """Load curated seed companies from config."""
    companies = []
    for name, domain, location, tags, desc in SEED_COMPANIES:
        companies.append({
            "name": name,
            "website": "https://" + domain,
            "domain": domain,
            "description": desc,
            "location": location,
            "industry_tags": tags,
            "source": "curated",
        })
    return companies


def _search_additional_companies(seen_domains: set, max_results_per_query: int = 10) -> list[dict]:
    """Search DuckDuckGo for additional companies not in seed list."""
    companies = []
    ddgs = DDGS()

    for i, query in enumerate(SEARCH_QUERIES):
        print(f"  [{i+1}/{len(SEARCH_QUERIES)}] Searching: {query}")
        try:
            results = list(ddgs.text(query, max_results=max_results_per_query))
        except Exception as e:
            print(f"    ⚠ Search failed: {e}")
            continue

        for r in results:
            url = r.get("href", "")
            title = r.get("title", "")
            body = r.get("body", "")

            if not url or not _is_useful_result(url, title):
                continue

            domain = _extract_domain(url)
            if domain in seen_domains:
                continue
            seen_domains.add(domain)

            companies.append({
                "name": title.split(" - ")[0].split(" | ")[0].strip()[:80],
                "website": "https://" + domain,
                "domain": domain,
                "description": body[:200],
                "location": _guess_location(title, body),
                "industry_tags": _guess_industry_tags(title, body),
                "source": "DuckDuckGo",
            })

        if i < len(SEARCH_QUERIES) - 1:
            time.sleep(1.5)

    return companies


def find_companies(max_results_per_query: int = 10) -> list[dict]:
    """
    Build company list from curated seed + DuckDuckGo search.
    Returns deduplicated list of company dicts.
    """
    # Start with curated seed list
    print("  Loading curated company list...")
    companies = _load_seed_companies()
    seen_domains = {c["domain"] for c in companies}
    print(f"  {len(companies)} seed companies loaded")

    # Supplement with search
    print("  Searching for additional companies...")
    search_results = _search_additional_companies(seen_domains, max_results_per_query)
    companies.extend(search_results)

    print(f"\n  Total: {len(companies)} unique companies ({len(companies) - len(search_results)} curated + {len(search_results)} from search)")
    return companies


if __name__ == "__main__":
    results = find_companies()
    for c in results[:10]:
        print(f"  {c['name']} — {c['website']} ({', '.join(c['industry_tags'])}) [{c['source']}]")

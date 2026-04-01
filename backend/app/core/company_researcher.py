"""Company research module for email personalization.

Gathers contextual data about a company before generating outreach emails:
  - Homepage + about page scraping
  - Blog / recent posts
  - Tech stack detection
  - Signal context from database

Produces a structured research brief used by the email drafter.
"""

from __future__ import annotations

import re
import time
import requests
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
}

# Max text length to extract per page
MAX_TEXT_LENGTH = 2000


def _fetch_page_text(url: str, timeout: int = 10) -> str:
    """Fetch a page and extract its visible text content."""
    try:
        resp = requests.get(url, headers=HEADERS, timeout=timeout, allow_redirects=True)
        if resp.status_code != 200:
            return ""

        soup = BeautifulSoup(resp.text, "html.parser")

        # Remove script and style elements
        for tag in soup(["script", "style", "nav", "footer", "header"]):
            tag.decompose()

        text = soup.get_text(separator=" ", strip=True)

        # Clean up whitespace
        text = re.sub(r'\s+', ' ', text)

        return text[:MAX_TEXT_LENGTH]

    except Exception:
        return ""


def _extract_blog_posts(website: str) -> list[dict]:
    """Try to find and extract recent blog post titles from a company's blog."""
    blog_paths = ["/blog", "/news", "/insights", "/resources", "/updates"]
    posts = []

    for path in blog_paths:
        url = website.rstrip("/") + path
        try:
            resp = requests.get(url, headers=HEADERS, timeout=8, allow_redirects=True)
            if resp.status_code != 200:
                continue

            soup = BeautifulSoup(resp.text, "html.parser")

            # Find article-like elements
            for article in soup.find_all(["article", "div"], class_=re.compile(
                r"post|article|blog|card|entry", re.I
            ))[:5]:
                title_el = article.find(["h2", "h3", "h4", "a"])
                if title_el:
                    title_text = title_el.get_text(strip=True)
                    if len(title_text) > 10 and len(title_text) < 200:
                        posts.append({"title": title_text})

            if posts:
                break

        except Exception:
            continue

    return posts[:3]  # Max 3 recent posts


def research_company(company: dict) -> dict:
    """
    Build a research brief for a company.

    Args:
        company dict with: name, domain, website, description, location, industry_tags

    Returns:
        Research brief dict with: summary, about, blog_posts, tech_signals, raw_text
    """
    name = company.get("name", "")
    website = company.get("website", company.get("company_website", ""))
    domain = company.get("domain", company.get("company_domain", ""))
    description = company.get("description", company.get("company_description", ""))

    if not website and domain:
        website = f"https://{domain}"

    brief = {
        "company_name": name,
        "description": description,
        "about": "",
        "blog_posts": [],
        "key_points": [],
        "raw_text": "",
    }

    if not website:
        return brief

    # 1. Scrape homepage
    homepage_text = _fetch_page_text(website)
    if homepage_text:
        brief["raw_text"] = homepage_text

        # Extract key phrases from homepage
        lower = homepage_text.lower()
        key_points = []

        # Look for value proposition patterns
        for pattern in [
            r'we (?:help|enable|empower|build|create|provide) ([^.]{10,80})',
            r'(?:mission|vision)[:]\s*([^.]{10,120})',
            r'(?:the|a|an) (?:platform|solution|tool|software) (?:that|for|to) ([^.]{10,80})',
        ]:
            match = re.search(pattern, lower)
            if match:
                key_points.append(match.group(0).strip()[:100])

        brief["key_points"] = key_points[:3]

    # 2. Scrape about page
    time.sleep(0.3)
    about_text = _fetch_page_text(f"{website}/about") or _fetch_page_text(f"{website}/about-us")
    if about_text:
        brief["about"] = about_text[:1000]

    # 3. Check blog for recent activity
    time.sleep(0.3)
    blog_posts = _extract_blog_posts(website)
    brief["blog_posts"] = blog_posts

    return brief


def format_research_brief(brief: dict, signals: list[dict] = None,
                          contact: dict = None) -> str:
    """
    Format a research brief into a human-readable string for the LLM prompt.
    """
    sections = []

    sections.append(f"Company: {brief['company_name']}")

    if brief.get("description"):
        sections.append(f"Description: {brief['description']}")

    if brief.get("about"):
        # Truncate about to first 300 chars for the prompt
        about_preview = brief["about"][:300]
        sections.append(f"About (from website): {about_preview}")

    if brief.get("key_points"):
        sections.append("Key value prop: " + "; ".join(brief["key_points"]))

    if brief.get("blog_posts"):
        post_titles = [p["title"] for p in brief["blog_posts"]]
        sections.append(f"Recent blog posts: {'; '.join(post_titles)}")

    # Add signal context
    if signals:
        signal_texts = []
        for s in sorted(signals, key=lambda x: x.get("strength", 0), reverse=True):
            signal_texts.append(f"{s['description']} (strength: {s.get('strength', '?')})")
        sections.append(f"Warm signals: {'; '.join(signal_texts)}")

    # Add contact-specific context
    if contact:
        if contact.get("work_history"):
            prev_companies = [
                j["organization_name"] for j in contact["work_history"]
                if not j.get("current") and j.get("organization_name")
            ][:3]
            if prev_companies:
                sections.append(f"Contact previously worked at: {', '.join(prev_companies)}")

        if contact.get("education_full"):
            schools = [
                e["school"] for e in contact["education_full"]
                if e.get("school")
            ]
            if schools:
                sections.append(f"Contact education: {', '.join(schools)}")

    return "\n".join(sections)


def research_companies_batch(companies: list[dict]) -> dict[str, dict]:
    """
    Research a batch of companies.
    Returns {domain: research_brief} mapping.
    """
    results = {}

    for i, company in enumerate(companies):
        name = company.get("name", "")
        domain = company.get("domain", "")
        print(f"  [{i+1}/{len(companies)}] Researching {name}...", end="")

        brief = research_company(company)
        results[domain] = brief

        info_parts = []
        if brief.get("about"):
            info_parts.append("about")
        if brief.get("blog_posts"):
            info_parts.append(f"{len(brief['blog_posts'])} blog posts")
        if brief.get("key_points"):
            info_parts.append(f"{len(brief['key_points'])} key points")

        if info_parts:
            print(f" -> {', '.join(info_parts)}")
        else:
            print(f" -> minimal data")

        # Rate limiting
        if i < len(companies) - 1:
            time.sleep(0.5)

    researched = sum(1 for b in results.values() if b.get("about") or b.get("key_points"))
    print(f"\n  Research complete: {researched}/{len(companies)} companies with useful data")

    return results


if __name__ == "__main__":
    test = {
        "name": "Ramp",
        "domain": "ramp.com",
        "website": "https://ramp.com",
        "description": "AI-powered corporate card and expense management",
    }
    print(f"Researching {test['name']}...")
    brief = research_company(test)
    print(f"\nDescription: {brief['description']}")
    print(f"About (first 200): {brief.get('about', '')[:200]}")
    print(f"Key points: {brief.get('key_points', [])}")
    print(f"Blog posts: {[p['title'] for p in brief.get('blog_posts', [])]}")
    print(f"\nFormatted brief:\n{format_research_brief(brief)}")

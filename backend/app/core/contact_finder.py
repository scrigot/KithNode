"""Find relevant contacts at discovered companies."""

from __future__ import annotations

import re
import time
import requests
from bs4 import BeautifulSoup
from ddgs import DDGS
from config import TARGET_ROLES


HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
}

# Common team/about page paths
TEAM_PATHS = [
    "/about", "/about-us", "/team", "/our-team", "/people",
    "/about/team", "/company", "/company/team", "/leadership",
]


def _fetch_page(url: str, timeout: int = 10) -> str | None:
    """Fetch a page and return its HTML, or None on failure."""
    try:
        resp = requests.get(url, headers=HEADERS, timeout=timeout, allow_redirects=True)
        if resp.status_code == 200:
            return resp.text
    except Exception:
        pass
    return None


def _extract_people_from_html(html: str, company_name: str) -> list[dict]:
    """
    Try to extract names and titles from a team/about page.
    Looks for common patterns in HTML structure.
    """
    soup = BeautifulSoup(html, "html.parser")
    people = []

    # Strategy 1: Look for structured elements with person info
    # Many team pages use cards with name in h2/h3/h4 and title in p/span
    for card in soup.find_all(["div", "li", "article"], class_=re.compile(
        r"team|member|person|staff|leader|bio|card", re.I
    )):
        name_el = card.find(["h2", "h3", "h4", "strong", "b"])
        if not name_el:
            continue
        name = name_el.get_text(strip=True)

        # Skip if doesn't look like a name (2-4 words, each capitalized)
        name_parts = name.split()
        if len(name_parts) < 2 or len(name_parts) > 5:
            continue
        if not all(p[0].isupper() for p in name_parts if p):
            continue

        # Find title nearby
        title = ""
        for sibling in [card.find("p"), card.find("span"), card.find(["h5", "h6"])]:
            if sibling:
                t = sibling.get_text(strip=True)
                if any(role in t.lower() for role in TARGET_ROLES) or len(t) < 60:
                    title = t
                    break

        if name and len(name) > 3:
            people.append({
                "name": name,
                "title": title or "Unknown",
                "company": company_name,
                "linkedin_url": "",
                "source": "team_page",
            })

    # Strategy 2: Look for LinkedIn links on the page
    for a in soup.find_all("a", href=re.compile(r"linkedin\.com/in/", re.I)):
        href = a["href"]
        # Try to get the name from link text or nearby elements
        link_text = a.get_text(strip=True)
        if link_text and len(link_text.split()) >= 2:
            # Check if we already have this person
            if not any(p["name"] == link_text for p in people):
                people.append({
                    "name": link_text,
                    "title": "Unknown",
                    "company": company_name,
                    "linkedin_url": href,
                    "source": "team_page",
                })

    return people


def _search_linkedin_contacts(company_name: str, domain: str) -> list[dict]:
    """Use DuckDuckGo to find LinkedIn profiles for people at a company."""
    people = []
    query = f'site:linkedin.com/in "{company_name}" founder OR CEO OR CTO OR "head of"'

    try:
        results = list(DDGS().text(query, max_results=5))
    except Exception:
        return people

    company_lower = company_name.lower()

    for r in results:
        url = r.get("href", "")
        title = r.get("title", "")
        body = r.get("body", "")

        if "linkedin.com/in/" not in url:
            continue

        # LinkedIn titles are usually "Name - Title - Company | LinkedIn"
        parts = title.replace(" | LinkedIn", "").split(" - ")
        name = parts[0].strip() if parts else ""
        role = parts[1].strip() if len(parts) > 1 else "Unknown"

        # Verify the company name actually appears in the result text
        # This prevents false matches (e.g., Jensen Huang showing up for Iodine Software)
        result_text = (title + " " + body).lower()
        if company_lower not in result_text and domain.split(".")[0] not in result_text:
            continue

        if name and len(name.split()) >= 2:
            people.append({
                "name": name,
                "title": role,
                "company": company_name,
                "linkedin_url": url,
                "source": "linkedin_search",
            })

    return people


def _is_valid_person_name(name: str) -> bool:
    """Check if a string looks like a real person's name."""
    if not name or len(name) < 4:
        return False
    parts = name.split()
    if len(parts) < 2 or len(parts) > 4:
        return False
    # Each part should be capitalized and alphabetic (allow hyphens, accents)
    for p in parts:
        if not p[0].isupper():
            return False
        # Skip if it contains numbers or looks like a product/company name
        if any(c.isdigit() for c in p):
            return False
    # Skip common non-name patterns
    lower = name.lower()
    skip = [
        "general partner", "managing director", "our ", "the ",
        "high-yield", "business", "savings", "parking", "conference",
        "award", "leadership", "client", "north", "waystar",
        "passport", "true north", "learn more", "about us",
        "atlas", "company", "innovative", "fast company",
        "thread mind", "san francisco", "austin", "new york",
        "most innovative", "venture partner", "special advisor",
        "operations analyst", "bangalore", "india", "chief executive",
        "officer", "director", "manager", "analyst", "engineer",
        "intern", "associate", "partner",
    ]
    if any(s in lower for s in skip):
        return False
    # Name parts shouldn't end with periods or contain special chars
    if "." in name or "'" in name or "™" in name:
        return False
    # Reject if name looks like it has a title concatenated (e.g. "Eric PoirierChief")
    for part in parts:
        if len(part) > 15:  # Real name parts are rarely this long
            return False
    return True


def find_contacts(companies: list[dict], max_contacts_per_company: int = 3) -> list[dict]:
    """
    For each company, find relevant contacts via team pages and LinkedIn search.
    """
    all_contacts = []
    seen_keys = set()  # (name_lower, domain) for dedup

    for i, company in enumerate(companies):
        name = company["name"]
        domain = company["domain"]
        website = company["website"]

        print(f"  [{i+1}/{len(companies)}] Finding contacts at {name}...")

        contacts_for_company = []

        # Method 1: Scrape team/about pages
        for path in TEAM_PATHS:
            html = _fetch_page(f"{website}{path}")
            if html:
                people = _extract_people_from_html(html, name)
                contacts_for_company.extend(people)
                if people:
                    break

        # Method 2: LinkedIn search (if we didn't find enough from team page)
        if len(contacts_for_company) < 2:
            linkedin_people = _search_linkedin_contacts(name, domain)
            existing_names = {c["name"].lower() for c in contacts_for_company}
            for p in linkedin_people:
                if p["name"].lower() not in existing_names:
                    contacts_for_company.append(p)

        # Filter: must be a valid person name
        contacts_for_company = [c for c in contacts_for_company if _is_valid_person_name(c["name"])]

        # Filter to relevant roles and cap per company
        relevant = []
        other = []
        for c in contacts_for_company:
            title_lower = c["title"].lower()
            if any(role in title_lower for role in TARGET_ROLES):
                relevant.append(c)
            else:
                other.append(c)

        final = (relevant + other)[:max_contacts_per_company]

        # Attach company metadata and deduplicate
        for c in final:
            key = (c["name"].lower(), domain)
            if key in seen_keys:
                continue
            seen_keys.add(key)

            c["company_website"] = website
            c["company_domain"] = domain
            c["company_location"] = company["location"]
            c["company_industry"] = ", ".join(company["industry_tags"])
            c["description"] = company.get("description", "")

            all_contacts.append(c)

        # Rate limiting
        if i < len(companies) - 1:
            time.sleep(1)

    print(f"\n  Found {len(all_contacts)} total contacts")
    return all_contacts


if __name__ == "__main__":
    # Quick test with a couple companies
    test_companies = [
        {"name": "Anthropic", "domain": "anthropic.com", "website": "https://anthropic.com",
         "location": "Remote", "industry_tags": ["AI"]},
    ]
    contacts = find_contacts(test_companies)
    for c in contacts:
        print(f"  {c['name']} — {c['title']} at {c['company']}")

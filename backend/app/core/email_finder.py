"""Find or guess email addresses for contacts."""

import re
import requests
from config import HUNTER_API_KEY


def _normalize_name(name: str) -> tuple[str, str]:
    """Split a full name into (first, last), lowercased."""
    parts = name.strip().split()
    if len(parts) < 2:
        return (parts[0].lower() if parts else "", "")
    first = parts[0].lower()
    last = parts[-1].lower()
    # Strip non-alpha characters
    first = re.sub(r"[^a-z]", "", first)
    last = re.sub(r"[^a-z]", "", last)
    return first, last


def _generate_patterns(first: str, last: str, domain: str) -> list[str]:
    """Generate common email patterns for a name + domain."""
    if not first or not last:
        return []
    return [
        f"{first}@{domain}",
        f"{first}.{last}@{domain}",
        f"{first}{last}@{domain}",
        f"{first[0]}{last}@{domain}",
        f"{first[0]}.{last}@{domain}",
        f"{last}@{domain}",
        f"{first}_{last}@{domain}",
        f"{first}-{last}@{domain}",
    ]


def _hunter_domain_search(domain: str) -> dict:
    """
    Use Hunter.io domain search to find the email pattern for a domain.
    Returns {"pattern": "first.last", "emails": [...]} or empty dict.
    """
    if not HUNTER_API_KEY:
        return {}

    try:
        resp = requests.get(
            "https://api.hunter.io/v2/domain-search",
            params={"domain": domain, "api_key": HUNTER_API_KEY, "limit": 5},
            timeout=10,
        )
        if resp.status_code != 200:
            return {}

        data = resp.json().get("data", {})
        pattern = data.get("pattern", "")
        emails = [e.get("value", "") for e in data.get("emails", []) if e.get("value")]
        return {"pattern": pattern, "emails": emails}
    except Exception:
        return {}


def _hunter_email_finder(domain: str, first: str, last: str) -> dict:
    """
    Use Hunter.io email finder to find a specific person's email.
    Returns {"email": "...", "confidence": 90} or empty dict.
    """
    if not HUNTER_API_KEY:
        return {}

    try:
        resp = requests.get(
            "https://api.hunter.io/v2/email-finder",
            params={
                "domain": domain,
                "first_name": first,
                "last_name": last,
                "api_key": HUNTER_API_KEY,
            },
            timeout=10,
        )
        if resp.status_code != 200:
            return {}

        data = resp.json().get("data", {})
        email = data.get("email", "")
        confidence = data.get("confidence", 0)
        if email:
            return {"email": email, "confidence": confidence}
    except Exception:
        pass
    return {}


def _hunter_email_verify(email: str) -> str:
    """Verify an email via Hunter.io. Returns status: deliverable/risky/undeliverable/unknown."""
    if not HUNTER_API_KEY:
        return "unverified"

    try:
        resp = requests.get(
            "https://api.hunter.io/v2/email-verifier",
            params={"email": email, "api_key": HUNTER_API_KEY},
            timeout=10,
        )
        if resp.status_code == 200:
            return resp.json().get("data", {}).get("status", "unknown")
    except Exception:
        pass
    return "unknown"


def find_emails(contacts: list[dict]) -> list[dict]:
    """
    For each contact, find or guess their email address.
    Uses Hunter.io if API key is available, otherwise pattern guessing.
    """
    # Cache domain search results to minimize API calls
    domain_cache: dict[str, dict] = {}

    for i, contact in enumerate(contacts):
        name = contact.get("name", "")
        domain = contact.get("company_domain", "")
        first, last = _normalize_name(name)

        print(f"  [{i+1}/{len(contacts)}] Finding email for {name} at {domain}...")

        contact["email"] = ""
        contact["email_confidence"] = ""
        contact["email_verified"] = "unverified"

        if not first or not last or not domain:
            contact["email_confidence"] = "no_data"
            continue

        # Step 1: Try Hunter.io email finder (most accurate)
        if HUNTER_API_KEY:
            result = _hunter_email_finder(domain, first, last)
            if result.get("email"):
                contact["email"] = result["email"]
                contact["email_confidence"] = f"hunter_{result.get('confidence', 0)}%"
                contact["email_verified"] = "hunter_found"
                continue

        # Step 2: Check Hunter.io domain pattern
        if HUNTER_API_KEY and domain not in domain_cache:
            domain_cache[domain] = _hunter_domain_search(domain)

        hunter_data = domain_cache.get(domain, {})
        pattern = hunter_data.get("pattern", "")

        if pattern:
            # Build email from pattern
            pattern_map = {
                "{first}": first,
                "{last}": last,
                "{f}": first[0] if first else "",
                "{l}": last[0] if last else "",
                "{first}.{last}": f"{first}.{last}",
                "{f}.{last}": f"{first[0]}.{last}" if first else "",
                "{first}{last}": f"{first}{last}",
                "{f}{last}": f"{first[0]}{last}" if first else "",
            }
            email = f"{pattern_map.get(pattern, f'{first}.{last}')}@{domain}"
            contact["email"] = email
            contact["email_confidence"] = "hunter_pattern"
            contact["email_verified"] = "pattern_match"
            continue

        # Step 3: Check if any Hunter emails match this person
        for known_email in hunter_data.get("emails", []):
            if first in known_email.lower() or last in known_email.lower():
                contact["email"] = known_email
                contact["email_confidence"] = "hunter_domain_match"
                contact["email_verified"] = "hunter_found"
                break

        if contact["email"]:
            continue

        # Step 4: Pattern guessing (fallback)
        patterns = _generate_patterns(first, last, domain)
        # Use the most common pattern as best guess
        contact["email"] = patterns[1] if len(patterns) > 1 else patterns[0]  # first.last@domain
        contact["email_confidence"] = "pattern_guess"
        contact["email_verified"] = "unverified"

    # Summary
    verified = sum(1 for c in contacts if "hunter" in c.get("email_verified", ""))
    pattern = sum(1 for c in contacts if c.get("email_verified") == "pattern_match")
    guessed = sum(1 for c in contacts if c.get("email_confidence") == "pattern_guess")
    print(f"\n  Email results: {verified} verified, {pattern} pattern-matched, {guessed} guessed")

    return contacts


if __name__ == "__main__":
    test = [{"name": "John Smith", "company_domain": "example.com"}]
    find_emails(test)
    print(test)

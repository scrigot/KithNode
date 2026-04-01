"""Generate personalized cold outreach emails.

v2: Research-then-write pipeline with signal context injection and
dual-pass refinement (generate -> self-critique -> refine).
"""

from config import USER_PROFILE, ANTHROPIC_API_KEY
from company_researcher import research_company, format_research_brief

# Jinja2 template fallback
TEMPLATE = """Subject: {subject}

Hi {first_name},

I'm {user_name}, a {user_year} at {user_school} studying {user_major} with a minor in {user_minor}. I came across {company} and was impressed by {company_hook}.

{highlight_paragraph}

I'd love to learn more about what you're building and explore whether there might be an opportunity to contribute this summer — even a brief 15-minute call would be great.

Best,
{user_name}
{user_email}
{user_linkedin}"""


def _pick_highlights(contact: dict) -> str:
    """Pick the 2 most relevant highlights based on the company's industry."""
    industry = contact.get("company_industry", "").lower()
    highlights = USER_PROFILE["highlights"]

    scored = []
    for h in highlights:
        score = 0
        h_lower = h.lower()
        if "fintech" in industry or "finance" in industry or "financial services" in industry:
            if any(w in h_lower for w in ["finance", "fintech", "$80k", "revenue", "banking"]):
                score += 3
        if "ai" in industry or "ml" in industry:
            if any(w in h_lower for w in ["ai", "automation", "intelligence", "data"]):
                score += 3
        if "startup" in industry:
            if any(w in h_lower for w in ["founder", "scaled", "revenue", "launched"]):
                score += 3
        if "consulting" in industry:
            if any(w in h_lower for w in ["strategy", "operations", "analysis"]):
                score += 3
        if "vc" in industry or "venture" in industry:
            if any(w in h_lower for w in ["founder", "startup", "revenue", "product"]):
                score += 3
        scored.append((score, h))

    scored.sort(key=lambda x: x[0], reverse=True)
    top = [h for _, h in scored[:2]]
    return " ".join(f"• {h}" for h in top)


def _generate_company_hook(contact: dict) -> str:
    """Generate a brief company-specific hook from available info."""
    desc = contact.get("description", "")
    industry = contact.get("company_industry", "")
    if desc and len(desc) > 20:
        first_sentence = desc.split(". ")[0]
        return f"your work in {first_sentence.lower()}" if len(first_sentence) < 80 else f"your work in {industry}"
    return f"your work in the {industry} space"


def _draft_with_template(contact: dict) -> dict:
    """Generate email using template (fallback when no API key)."""
    first_name = contact["name"].split()[0]
    highlights = _pick_highlights(contact)
    hook = _generate_company_hook(contact)

    # Use signal context if available
    signal_context = contact.get("signal_context", "")
    if signal_context:
        hook = f"your recent momentum ({signal_context.split(';')[0].strip()})"

    subject = f"UNC Freshman + Startup Founder — Summer Internship Interest at {contact['company']}"

    body = TEMPLATE.format(
        subject=subject,
        first_name=first_name,
        user_name=USER_PROFILE["name"],
        user_year=USER_PROFILE["year"],
        user_school=USER_PROFILE["school"],
        user_major=USER_PROFILE["major"],
        user_minor=USER_PROFILE["minor"],
        company=contact["company"],
        company_hook=hook,
        highlight_paragraph=highlights,
        user_email=USER_PROFILE["email"],
        user_linkedin=USER_PROFILE["linkedin"],
    )

    return {"subject": subject, "body": body}


def _build_enhanced_prompt(contact: dict, research_brief: str) -> str:
    """Build the enhanced Claude prompt with research context and signal injection."""
    first_name = contact["name"].split()[0]
    affiliations = contact.get("affiliations", "")
    signal_context = contact.get("signal_context", "")
    tier = contact.get("tier", "unknown")

    prompt = f"""You are writing a cold outreach email from Sam Rigot, a UNC Chapel Hill freshman seeking a summer internship.

SENDER PROFILE:
- Name: {USER_PROFILE['name']}
- School: {USER_PROFILE['school']} ({USER_PROFILE['year']})
- Major: {USER_PROFILE['major']}, Minor: {USER_PROFILE['minor']}
- Study abroad: {USER_PROFILE.get('study_abroad', '')}
- Key highlights:
{chr(10).join('  - ' + h for h in USER_PROFILE['highlights'])}
- Interests: {', '.join(USER_PROFILE['interests'])}

PROSPECT RESEARCH:
{research_brief}

RECIPIENT:
- Name: {contact['name']}
- Title: {contact.get('title', 'Unknown')}
- Company: {contact.get('company', '')}
- Industry: {contact.get('company_industry', 'tech')}
- Location: {contact.get('company_location', 'Unknown')}
- Prospect priority tier: {tier}"""

    if affiliations:
        prompt += f"\n- SHARED AFFILIATIONS: {affiliations} (USE THIS — it's your strongest connection)"

    if signal_context:
        prompt += f"\n- WARM SIGNALS: {signal_context}"

    if contact.get("education"):
        prompt += f"\n- Education: {contact['education']}"

    if contact.get("work_history"):
        prev = [j["organization_name"] for j in contact["work_history"]
                if not j.get("current") and j.get("organization_name")][:3]
        if prev:
            prompt += f"\n- Previously at: {', '.join(prev)}"

    prompt += f"""

RULES (FOLLOW STRICTLY):
- Under 80 words total (not counting signature)
- 1-2 sentence icebreaker that references:
  1. Shared affiliation (if any) — ALWAYS lead with this
  2. OR the strongest warm signal (funding, hiring, etc.)
  3. OR a specific detail from the company research
- Pick ONE of Sam's most relevant highlights for THIS company
- One clear ask: coffee chat, 15-min call, or specific question
- Casual, peer-to-peer tone — not salesy, not desperate
- No filler: no "I hope this email finds you well", no "I noticed that"
- End with Sam's name, email ({USER_PROFILE['email']}), LinkedIn ({USER_PROFILE['linkedin']})
- Subject line: under 50 chars, specific, not clickbait

Format your response EXACTLY as:
SUBJECT: <subject line>
BODY:
<email body>"""

    return prompt


def _draft_with_claude_v2(contact: dict) -> dict:
    """
    Generate email using Claude with research-then-write pipeline.
    Includes dual-pass refinement: generate -> self-critique -> refine.
    """
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

        # Step 1: Research the company
        company_data = {
            "name": contact.get("company", ""),
            "domain": contact.get("company_domain", ""),
            "website": contact.get("company_website", ""),
            "description": contact.get("description", ""),
        }
        brief = research_company(company_data)
        research_text = format_research_brief(
            brief,
            signals=contact.get("signals", []),
            contact=contact,
        )

        # Step 2: Generate email with enhanced prompt
        prompt = _build_enhanced_prompt(contact, research_text)

        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=600,
            messages=[{"role": "user", "content": prompt}],
        )

        draft_text = response.content[0].text

        # Parse subject and body
        if "SUBJECT:" in draft_text and "BODY:" in draft_text:
            subject = draft_text.split("SUBJECT:")[1].split("BODY:")[0].strip()
            body = draft_text.split("BODY:")[1].strip()
        else:
            subject = f"Summer Internship Interest — {contact['company']}"
            body = draft_text

        # Step 3: Dual-pass refinement — self-critique
        first_name = contact["name"].split()[0]
        critique_prompt = f"""You are {contact['name']}, {contact.get('title', '')} at {contact.get('company', '')}.
You just received this cold email:

Subject: {subject}

{body}

CRITIQUE this email honestly:
1. Would you reply? (yes/no and why)
2. Does the icebreaker feel genuine or generic?
3. Is it too long? Too short?
4. Does the ask feel reasonable?
5. Any red flags that would make you ignore it?

If you would NOT reply, rewrite the email to be more compelling. Keep it under 80 words.
If the email is good enough to reply to, just say "APPROVED" and move on.

Format: If rewriting, use SUBJECT: and BODY: format. If approving, just say APPROVED."""

        critique_response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=600,
            messages=[{"role": "user", "content": critique_prompt}],
        )

        critique_text = critique_response.content[0].text

        # Use the rewritten version if the critic provided one
        if "APPROVED" not in critique_text.upper() and "SUBJECT:" in critique_text:
            if "BODY:" in critique_text:
                subject = critique_text.split("SUBJECT:")[1].split("BODY:")[0].strip()
                body = critique_text.split("BODY:")[1].strip()

        return {"subject": subject, "body": body}

    except Exception as e:
        print(f"    Warning: Claude v2 failed ({e}), falling back to template")
        return _draft_with_template(contact)


def draft_emails(contacts: list[dict]) -> list[dict]:
    """Generate personalized email drafts for all contacts."""
    use_claude = bool(ANTHROPIC_API_KEY)

    if use_claude:
        print("  Using Claude API with research-then-write pipeline + dual-pass refinement...")
    else:
        print("  Using templates (set ANTHROPIC_API_KEY for AI-generated emails)...")

    for i, contact in enumerate(contacts):
        print(f"  [{i+1}/{len(contacts)}] Drafting email for {contact['name']} at {contact.get('company', '')}...")

        if use_claude:
            result = _draft_with_claude_v2(contact)
        else:
            result = _draft_with_template(contact)

        contact["email_subject"] = result["subject"]
        contact["email_draft"] = result["body"]

    print(f"\n  Drafted {len(contacts)} emails")
    return contacts


if __name__ == "__main__":
    test = [{
        "name": "Jane Doe",
        "title": "CEO",
        "company": "FinAI Corp",
        "company_domain": "finaicorp.com",
        "company_industry": "fintech, AI",
        "company_location": "Raleigh, NC",
        "description": "AI-powered financial analytics platform",
        "affiliations": "Kenan-Flagler",
        "signal_context": "Funding: raised $5M Series A; Hiring: 8 open roles",
        "signals": [
            {"signal_type": "funding", "description": "Raised $5M Series A", "strength": 7},
        ],
        "tier": "warm",
    }]
    draft_emails(test)
    print(f"\nSubject: {test[0].get('email_subject', 'N/A')}")
    print(f"\n{test[0].get('email_draft', 'No draft')}")

#!/usr/bin/env python3
"""Seed the KithNode database by running the cold outreach bot pipeline.

Executes the 7-step intelligence pipeline and writes results to whichever
database backend is configured (Postgres via DATABASE_URL, or SQLite fallback).

Usage:
    cd backend
    source venv/bin/activate
    python scripts/seed_pipeline.py [options]

Options:
    --max-companies N    Max companies to process (default: 50)
    --max-contacts N     Max contacts per company (default: 3)
    --skip-signals       Skip warm signal detection (faster)
    --skip-affiliations  Skip affiliation checking (faster)
    --skip-enrichment    Skip Apollo/LinkedIn enrichment (no API key needed)
    --skip-emails        Skip email finding (no API key needed)
    --skip-drafts        Skip AI email drafting (default: skipped unless --draft)
    --draft              Enable AI email drafting (requires ANTHROPIC_API_KEY)
    --seed-only          Only load seed companies + score, skip network calls
    --min-score N        Only draft emails for contacts scoring above threshold
    --top-n N            Only process top N scored contacts for email drafting
"""

import argparse
import copy
import os
import sys
from datetime import datetime
from urllib.parse import quote

# Ensure core/ modules are importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "app", "core"))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from company_finder import find_companies, _load_seed_companies
from signal_detector import detect_signals_batch, compute_signal_stack
from contact_finder import find_contacts
from enrichment import enrich_contacts, detect_affiliations_enhanced
from email_finder import find_emails
from scoring import score_contacts
from email_drafter import draft_emails
from config import MANUAL_VIP_CONTACTS, USER_PROFILE
import database as db


def _generate_notes(contact: dict) -> str:
    """Generate contextual notes for a contact (adapted from main.py)."""
    notes = []
    industry = contact.get("company_industry", "").lower()
    location = contact.get("company_location", "").lower()
    title = contact.get("title", "").lower()
    affiliations = str(contact.get("affiliations", "") or "")

    education = str(contact.get("education", "") or "")
    if education and education != "unknown":
        notes.append(f"Education: {education}")

    linkedin_location = str(contact.get("linkedin_location", "") or "")
    if linkedin_location:
        notes.append(f"Based in: {linkedin_location}")

    vip_notes = contact.get("vip_notes", "")
    if vip_notes:
        notes.append(f"VIP TARGET — {vip_notes}")

    if "Chi Phi" in affiliations:
        notes.append("CHI PHI BROTHER — lead with fraternity connection")
    if "Kenan-Flagler" in affiliations:
        notes.append("KENAN-FLAGLER ALUM — mention business school connection")
    if "UNC Alumni" in affiliations and "Chi Phi" not in affiliations:
        notes.append("UNC ALUM — mention shared Tar Heel connection")
    if "Duke" in affiliations:
        notes.append("DUKE ALUM — Triangle connection")
    if "NC Local" in affiliations:
        notes.append("NC LOCAL — mention local ties")

    if "fintech" in industry:
        notes.append("Fintech — aligned with UNC Fintech Club")
    if "ai" in industry:
        notes.append("AI — connect to KithNode + AI automation work")
    if "vc" in industry:
        notes.append("VC — could intro to portfolio companies")
    if "startup" in industry:
        notes.append("Startup — mention founder experience")

    if any(r in title for r in ["founder", "ceo", "co-founder"]):
        notes.append("Founder/CEO — lead with entrepreneurial story")
    if any(r in title for r in ["recruiter", "talent", "hr"]):
        notes.append("Recruiting — be direct about internship ask")

    return " | ".join(notes) if notes else "General outreach"


def main():
    parser = argparse.ArgumentParser(description="KithNode Seed Pipeline")
    parser.add_argument("--max-companies", type=int, default=50)
    parser.add_argument("--max-contacts", type=int, default=3)
    parser.add_argument("--skip-signals", action="store_true")
    parser.add_argument("--skip-affiliations", action="store_true")
    parser.add_argument("--skip-enrichment", action="store_true")
    parser.add_argument("--skip-emails", action="store_true")
    parser.add_argument("--skip-drafts", action="store_true", default=True)
    parser.add_argument("--draft", action="store_true", help="Enable email drafting")
    parser.add_argument("--seed-only", action="store_true",
                        help="Only load seed companies, skip all network calls")
    parser.add_argument("--min-score", type=int, default=0)
    parser.add_argument("--top-n", type=int, default=0)
    args = parser.parse_args()

    if args.draft:
        args.skip_drafts = False

    backend = "PostgreSQL" if db._USE_PG else "SQLite"
    print("=" * 60)
    print("  KITHNODE SEED PIPELINE")
    print(f"  Database: {backend}")
    print(f"  For: {USER_PROFILE['name']}")
    print("=" * 60)

    # ── Step 1: Find companies ──
    print("\n[1/7] Discovering companies...")
    if args.seed_only:
        companies = _load_seed_companies()
        print(f"  Loaded {len(companies)} seed companies (seed-only mode)")
    else:
        companies = find_companies()
    companies = companies[:args.max_companies]
    print(f"  Processing {len(companies)} companies")

    # Save companies to DB
    for company in companies:
        db.upsert_company(company)

    # ── Step 2: Detect warm signals ──
    signal_map = {}
    if args.seed_only or args.skip_signals:
        print("\n[2/7] Skipping signal detection")
    else:
        print("\n[2/7] Detecting warm signals...")
        signal_map = detect_signals_batch(companies, save_to_db=True)

    # ── Step 3: Find contacts ──
    if args.seed_only:
        print("\n[3/7] Skipping contact finding (seed-only)")
        contacts = []
    else:
        print("\n[3/7] Finding contacts...")
        contacts = find_contacts(companies, max_contacts_per_company=args.max_contacts)

    # Inject VIP contacts
    if MANUAL_VIP_CONTACTS:
        vip_count = len(MANUAL_VIP_CONTACTS)
        print(f"\n  Injecting {vip_count} manual VIP contacts...")
        vip_contacts = [copy.deepcopy(c) for c in MANUAL_VIP_CONTACTS]
        contacts = vip_contacts + contacts
        # Ensure VIP companies exist in DB AND in the companies list
        for vc in vip_contacts:
            vip_company = {
                "name": vc.get("company", ""),
                "domain": vc.get("company_domain", ""),
                "website": vc.get("company_website", ""),
                "description": vc.get("description", ""),
                "location": vc.get("company_location", ""),
                "industry_tags": vc.get("company_industry", "").split(", "),
                "source": "manual_vip",
            }
            db.upsert_company(vip_company)
            # Add to companies list so save_pipeline_run matches contacts
            if vip_company["domain"] not in {c["domain"] for c in companies}:
                companies.append(vip_company)

    if not contacts:
        print("\n  No contacts found. Use --seed-only=false or add VIP contacts.")
        # Still print stats for companies
        stats = db.get_stats()
        print(f"\n  Database: {stats['companies']} companies seeded")
        return

    # ── Step 4: Enrich contacts ──
    if args.seed_only or args.skip_enrichment:
        print("\n[4/7] Skipping enrichment")
    else:
        print("\n[4/7] Enriching contacts...")
        contacts = enrich_contacts(contacts, save_to_db=False)

    # ── Step 5: Find emails ──
    if args.seed_only or args.skip_emails:
        print("\n[5/7] Skipping email finding")
    else:
        print("\n[5/7] Finding email addresses...")
        unenriched = [c for c in contacts if not c.get("email")]
        enriched_with_email = [c for c in contacts if c.get("email")]
        if unenriched:
            unenriched = find_emails(unenriched)
        contacts = enriched_with_email + unenriched

    # ── Step 5b: Affiliations ──
    if args.seed_only or args.skip_affiliations:
        print("\n[5b/7] Skipping affiliation check")
        for c in contacts:
            if not c.get("affiliations"):
                c["affiliations"] = ""
                c["affiliation_boost"] = 0
    else:
        print("\n[5b/7] Detecting affiliations...")
        for contact in contacts:
            if contact.get("education_full") or contact.get("work_history"):
                affs = detect_affiliations_enhanced(contact)
                contact["affiliations"] = ", ".join(a["name"] for a in affs) if affs else ""
                contact["affiliation_boost"] = sum(a["boost"] for a in affs)
            elif contact.get("linkedin_url"):
                affs = detect_affiliations_enhanced(contact)
                if affs:
                    contact["affiliations"] = ", ".join(a["name"] for a in affs)
                    contact["affiliation_boost"] = sum(a["boost"] for a in affs)
                else:
                    contact["affiliations"] = ""
                    contact["affiliation_boost"] = 0
            else:
                contact["affiliations"] = ""
                contact["affiliation_boost"] = 0

        affiliated = sum(1 for c in contacts if c.get("affiliations"))
        print(f"  Affiliations found: {affiliated}/{len(contacts)} contacts")

    # ── Step 6: Attach signals + Score ──
    print("\n[6/7] Scoring contacts...")
    for contact in contacts:
        domain = contact.get("company_domain", "")
        signals = signal_map.get(domain, [])
        contact["signals"] = signals
        stack = compute_signal_stack(signals)
        contact["signal_stack"] = stack
        contact["signal_strength"] = stack["combined_strength"]
        if signals:
            signal_texts = [s["description"] for s in sorted(signals, key=lambda x: x["strength"], reverse=True)]
            contact["signal_context"] = "; ".join(signal_texts)
        else:
            contact["signal_context"] = ""

    contacts = score_contacts(contacts, save_to_db=False)

    # Apply filters
    if args.min_score > 0:
        before = len(contacts)
        contacts = [c for c in contacts if c.get("priority_score", 0) >= args.min_score]
        print(f"  Filtered: {before} -> {len(contacts)} contacts (min score: {args.min_score})")

    if args.top_n > 0:
        contacts = contacts[:args.top_n]
        print(f"  Top-N filter: keeping top {args.top_n} contacts")

    # ── Step 7: Draft emails (optional) ──
    if args.skip_drafts:
        print("\n[7/7] Skipping email drafting (use --draft to enable)")
    else:
        print("\n[7/7] Drafting outreach emails...")
        contacts = draft_emails(contacts)

    # ── Save to database ──
    print("\n[+] Saving to database...")
    contact_id_map = db.save_pipeline_run(companies, contacts)

    # Save scores (save_pipeline_run doesn't handle scores)
    scores_saved = 0
    for contact in contacts:
        key = (contact["name"].lower(), contact.get("company_domain", ""))
        contact_id = contact_id_map.get(key)
        if contact_id and "priority_score" in contact:
            db.save_score(
                contact_id,
                contact.get("fit_score", 0),
                contact.get("signal_score", 0),
                contact.get("engagement_score", 0),
                contact["priority_score"],
                contact.get("tier", "cold"),
            )
            scores_saved += 1
    print(f"  Scores saved: {scores_saved}")

    stats = db.get_stats()
    print(f"  Database: {stats['companies']} companies, {stats['contacts']} contacts, "
          f"{stats['affiliations']} affiliated, {stats['outreach_drafted']} emails drafted")

    # Final summary
    affiliated = sum(1 for c in contacts if c.get("affiliations"))
    verified = sum(1 for c in contacts if c.get("email_verified") == "hunter_found")
    print("\n" + "=" * 60)
    print("  SEED COMPLETE")
    print(f"  Companies:    {len(companies)}")
    print(f"  Contacts:     {len(contacts)}")
    print(f"  Affiliated:   {affiliated}")
    print(f"  Verified:     {verified} emails")
    print(f"  Backend:      {backend}")
    print("=" * 60)


if __name__ == "__main__":
    main()

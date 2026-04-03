import os
from dotenv import load_dotenv

load_dotenv()

# --- API Keys (optional) ---
HUNTER_API_KEY = os.getenv("HUNTER_API_KEY", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
APOLLO_API_KEY = os.getenv("APOLLO_API_KEY", "")  # Free tier: unlimited search, 5 email credits/mo

# --- Curated Seed Companies ---
# Real companies in fintech, AI, startups, consulting, VC in target areas.
# Each: (name, domain, location, industry_tags, description)
SEED_COMPANIES = [
    # --- Triangle Fintech ---
    ("Pendo", "pendo.io", "Raleigh, NC", ["SaaS"], "Product analytics platform for software companies"),
    ("Alloy", "alloy.com", "Durham, NC", ["fintech", "startup"], "Identity verification and fraud prevention for banks and fintech"),
    ("nCino", "ncino.com", "Durham, NC", ["fintech", "SaaS"], "Cloud banking platform for financial institutions"),
    ("Apiture", "apiture.com", "Durham, NC", ["fintech", "SaaS"], "Digital banking platform for community banks and credit unions"),
    ("LiveOak Bank", "liveoakbank.com", "Durham, NC", ["fintech"], "Digital-first small business lending bank"),
    ("Passport Labs", "passportinc.com", "Charlotte, NC", ["fintech", "startup"], "Mobility payments and transit technology"),
    ("AvidXchange", "avidxchange.com", "Charlotte, NC", ["fintech", "SaaS"], "Accounts payable automation and B2B payments"),
    ("Spreedly", "spreedly.com", "Durham, NC", ["fintech", "SaaS"], "Payment orchestration platform"),
    ("Primer", "primer.io", "Remote", ["fintech", "startup"], "Unified payment infrastructure for enterprises"),
    ("Treasury4", "treasury4.com", "Durham, NC", ["fintech", "AI"], "AI-powered treasury management for mid-market companies"),
    ("LoanStreet", "loan-street.com", "Remote", ["fintech", "startup"], "Loan trading and participation platform for financial institutions"),
    # --- Triangle AI ---
    ("Celonis", "celonis.com", "Raleigh, NC", ["AI", "SaaS"], "Process mining and AI-driven execution management"),
    ("Fidelity Investments", "fidelity.com", "Durham, NC", ["financial services"], "Financial services — major RTP campus and innovation center"),
    ("MetLife", "metlife.com", "Raleigh, NC", ["financial services", "AI"], "Insurance and financial services — RTP tech innovation hub"),
    ("IBM", "ibm.com", "Durham, NC", ["AI", "consulting"], "AI and cloud — major Research Triangle Park presence"),
    ("SAS Institute", "sas.com", "Raleigh, NC", ["AI", "SaaS"], "Analytics and AI software — HQ in Cary, NC"),
    ("Bandwidth", "bandwidth.com", "Raleigh, NC", ["SaaS", "startup"], "Cloud communications platform (CPaaS)"),
    ("Iodine Software", "iodinesoftware.com", "Durham, NC", ["AI", "SaaS"], "AI for healthcare revenue cycle management"),
    ("Windsor.ai", "windsor.ai", "Remote", ["AI", "startup"], "AI-powered marketing attribution platform"),
    # --- Triangle VC / Accelerators ---
    ("Cofounders Capital", "cofounderscapital.com", "Durham, NC", ["VC"], "Early-stage VC focused on Triangle startups"),
    ("Hatteras Venture Partners", "hatterasvp.com", "Durham, NC", ["VC"], "Life sciences and technology venture capital in Research Triangle"),
    ("Bull City Venture Partners", "bullcityventurepartners.com", "Durham, NC", ["VC"], "Seed and early-stage VC in the Triangle"),
    ("Idea Fund Partners", "ideafundpartners.com", "Charlotte, NC", ["VC"], "Early-stage venture capital in the Carolinas"),
    ("First Flight Venture Center", "firstflightvc.com", "Durham, NC", ["startup", "VC"], "Startup accelerator and incubator in Research Triangle Park"),
    ("Groundswell Startups", "groundswellstartups.org", "Raleigh, NC", ["startup"], "Triangle startup accelerator and community"),
    ("American Underground", "americanunderground.com", "Durham, NC", ["startup"], "Startup hub and coworking in Durham"),
    # --- Charleston Fintech/AI ---
    ("BoomTown", "boomtownroi.com", "Charleston, SC", ["SaaS", "real estate"], "Real estate tech platform for lead generation"),
    ("Blackbaud", "blackbaud.com", "Charleston, SC", ["SaaS"], "Cloud software for social good organizations"),
    ("Benefitfocus", "benefitfocus.com", "Charleston, SC", ["SaaS"], "Benefits management and enrollment platform"),
    ("Blue Acorn iCi", "blueacornici.com", "Charleston, SC", ["consulting", "SaaS"], "Digital commerce consulting and implementation"),
    ("Greystar", "greystar.com", "Charleston, SC", ["real estate"], "Global real estate and investment management"),
    ("PhishLabs", "phishlabs.com", "Charleston, SC", ["AI", "startup"], "AI-powered cybersecurity and threat intelligence"),
    ("Harbor Compliance", "harborcompliance.com", "Charleston, SC", ["fintech", "SaaS"], "Compliance automation for financial services"),
    # --- Remote Fintech/AI Startups ---
    ("Ramp", "ramp.com", "Remote", ["fintech", "AI", "startup"], "AI-powered corporate card and expense management"),
    ("Brex", "brex.com", "Remote", ["fintech", "startup"], "Financial software and corporate credit cards for startups"),
    ("Mercury", "mercury.com", "Remote", ["fintech", "startup"], "Banking for startups — checking, savings, credit cards"),
    ("Plaid", "plaid.com", "Remote", ["fintech", "startup"], "Financial data connectivity platform"),
    ("Stripe", "stripe.com", "Remote", ["fintech", "startup"], "Payment infrastructure for the internet"),
    ("Addepar", "addepar.com", "Remote", ["fintech", "AI"], "Wealth management technology platform"),
    ("Trumid", "trumid.com", "Remote", ["fintech", "AI"], "AI-driven fixed income trading platform"),
    ("Arta Finance", "artafinance.com", "Remote", ["fintech", "AI", "startup"], "AI-powered digital family office for wealth management"),
    ("Anthropic", "anthropic.com", "Remote", ["AI", "startup"], "AI safety company building reliable AI systems"),
    ("Cohere", "cohere.com", "Remote", ["AI", "startup"], "Enterprise AI platform for natural language processing"),
    ("Writer", "writer.com", "Remote", ["AI", "startup"], "Enterprise generative AI platform"),
    ("Moveworks", "moveworks.com", "Remote", ["AI", "startup"], "AI platform for enterprise copilots"),
    ("Scale AI", "scale.ai", "Remote", ["AI", "startup"], "Data engine for AI — labeling, evaluation, and fine-tuning"),
    ("Weights & Biases", "wandb.ai", "Remote", ["AI", "startup"], "MLOps platform for experiment tracking and model management"),
    ("Vanta", "vanta.com", "Remote", ["SaaS", "startup"], "Automated security and compliance platform"),
    ("Ironclad", "ironcladapp.com", "Remote", ["AI", "SaaS"], "AI-powered contract lifecycle management"),
]

# --- Search Queries (supplement seed list) ---
SEARCH_QUERIES = [
    # Company-specific searches
    'fintech startup Raleigh NC site:.com',
    'AI startup Durham NC hiring',
    'fintech company "Research Triangle" careers',
    'AI company Charleston SC',
    'venture capital fintech Raleigh Durham portfolio',
    'startup accelerator "Chapel Hill" OR "Durham" NC',
    'fintech intern summer 2026 remote startup',
    'AI startup remote hiring intern summer',
]

TARGET_ROLES = [
    "founder", "co-founder", "ceo", "cto", "coo", "cfo",
    "president", "partner", "managing director",
    "vp", "vice president", "head of",
    "director of operations", "director of strategy",
    "hiring manager", "recruiter", "talent", "people operations",
    "hr", "human resources",
]

LOCATIONS = [
    "Raleigh", "Chapel Hill", "Durham", "Research Triangle",
    "Charleston", "Remote",
]

# --- Sam's Profile for Email Personalization ---
USER_PROFILE = {
    "name": os.getenv("USER_FULL_NAME", ""),
    "email": os.getenv("USER_EMAIL", ""),
    "phone": os.getenv("USER_PHONE", ""),
    "linkedin": os.getenv("USER_LINKEDIN_URL", ""),
    "school": "University of North Carolina at Chapel Hill",
    "year": "Freshman (Class of 2029)",
    "major": "Pre-Business Track (Intended Business Administration Major)",
    "minor": "Data Science",
    "study_abroad": "London School of Economics — Summer 2026",
    "highlights": [
        "Founded Sammy's Suds Detailing — scaled to $80K+ revenue with 5x ROI on ad spend, 70+ 5-star reviews",
        "Founder & CEO of KithNode — building an 'Intelligence Layer' to automate recruitment pipelines with real-time data indexing",
        "Incoming Digital Operations & Strategy Intern at Hollis & Jay (May 2026) — integrating AI automation into real estate operations",
        "Recruitment Chair at Chi Phi — managing pipeline of 150+ candidates with lead-scoring strategies",
        "Technical: MS Excel, MS PowerPoint, AI Prompt Engineering, CRM Automation, Meta/Google Ads",
        "Clubs: UNC Fintech Club, Investment Banking Bootcamp, UNC Credit and Restructuring Club",
    ],
    "interests": [
        "Bridging Generative AI with Finance",
        "Fintech product development",
        "AI-driven operations and automation",
    ],
}

# --- Manual VIP Contacts ---
# High-priority contacts to always include at top of pipeline.
# These bypass company discovery and get injected directly.
# Format: dict with known fields; the pipeline enriches the rest.
MANUAL_VIP_CONTACTS = [
    {
        "name": "Matias Vian",
        "title": "Startup Advisor / Staff",
        "company": "University of North Carolina at Chapel Hill",
        "company_domain": "unc.edu",
        "company_website": "https://unc.edu",
        "company_industry": "startup, education",
        "company_location": "Chapel Hill, NC",
        "description": "Helps startups at UNC — potential mentor and connector in the UNC startup ecosystem",
        "affiliations": "UNC Faculty",
        "affiliation_boost": 28,
        "linkedin_url": "",
        "email": "",
        "email_verified": "",
        "education": "UNC Chapel Hill",
        "linkedin_location": "Chapel Hill, NC",
        "source": "manual_vip",
        "vip_notes": "Helps startups and works at UNC. Top candidate — lead with entrepreneurial experience (Sammy's Suds, KithNode) and ask about UNC startup resources/mentorship.",
    },
    {
        "name": "Ian Frazier",
        "title": "Consultant",
        "company": "FMI",
        "company_domain": "fmi.com",
        "company_website": "https://fmi.com",
        "company_industry": "consulting",
        "company_location": "Raleigh, NC",
        "description": "Management consulting firm — Ian is a KF alum and was a rush chair in Greek life",
        "affiliations": "Kenan-Flagler, Greek Life",
        "affiliation_boost": 30,
        "linkedin_url": "",
        "email": "",
        "email_verified": "",
        "education": "Kenan-Flagler Business School, UNC Chapel Hill",
        "linkedin_location": "Raleigh, NC",
        "source": "manual_vip",
        "vip_notes": "Consultant at FMI in Raleigh. Kenan-Flagler alum, was in Greek life and served as rush chair. Top candidate — lead with KF connection + Greek life (you're Chi Phi Recruitment Chair).",
    },
    {
        "name": "Marshall Haas",
        "title": "Founder & CEO",
        "company": "Outliner (prev. Somewhere.com/Shepherd)",
        "company_domain": "marshallhaas.com",
        "company_website": "https://marshallhaas.com",
        "company_industry": "startup, consulting",
        "company_location": "Raleigh, NC",
        "description": "Serial entrepreneur — founded Shepherd/Somewhere.com (sold for $52M), now runs Outliner consulting for founders",
        "affiliations": "NC Local",
        "affiliation_boost": 15,
        "linkedin_url": "https://www.linkedin.com/in/marshall-haas-7184666/",
        "email": "",
        "email_verified": "",
        "education": "",
        "linkedin_location": "Raleigh, NC",
        "source": "manual_vip",
        "vip_notes": "KNOWS YOU from Sammy's Suds detailing. Serial entrepreneur in Raleigh — founded Somewhere.com (sold $52M), now consults founders via Outliner. Very warm intro — lead with detailing connection + your own startup experience.",
    },
]

# --- Output ---
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "output")
os.makedirs(OUTPUT_DIR, exist_ok=True)

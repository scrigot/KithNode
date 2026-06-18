/**
 * Career explainer content — one entry per role in the career-track taxonomy
 * (ALL_ROLES). Read by the career-explorer modal that opens off each role chip in
 * the track/role picker (Settings + onboarding step 2). This is the human-facing
 * "what is this job, how do I recruit, what does it pay" reference for ambitious
 * students choosing a track, so the content is concrete and honest: real US
 * 2025-2026 comp (levels.fyi / Wall Street Oasis ballpark), real recruiting
 * timelines, real ceilings (PE pre-MBA wall, AI research PhD bar). Keep keys in
 * exact lockstep with ALL_ROLES — the test asserts full coverage and no strays.
 *
 * Where a skill name overlaps the app's skill pool (us-skills.json — Financial
 * Modeling, Python, SQL, Excel, Machine Learning, etc.) the EXACT casing is
 * reused so a student's "skills to build" line can cross-reference their profile.
 */

export type CareerStagePay = { stage: string; range: string };

export type CareerInfo = {
  /** 2-3 sentences: what the job actually is, day to day. */
  summary: string;
  /** 2-5 alias titles seen on LinkedIn / job boards. */
  alsoKnownAs: string[];
  /** Typical majors (3-5). */
  majors: string[];
  /** Key skills to build (5-8); reuses app skill-pool names where natural. */
  skills: string[];
  /** 3-5 bullets: what a student should do to recruit. */
  experience: string[];
  /** 1-2 sentences: when recruiting happens. */
  timeline: string;
  /** 3-4 stages intern/entry -> senior, US 2025-2026 estimates. */
  pay: CareerStagePay[];
  /** 1 sentence: growth / trend note. */
  outlook: string;
};

export const CAREER_INFO: Record<string, CareerInfo> = {
  // ---- Finance ----
  "Investment Banking": {
    summary:
      "Investment bankers advise companies on raising capital and on mergers and acquisitions, building the financial models and pitch decks behind multi-billion-dollar deals. Analyst life is the classic 80-100 hour week: comps, LBOs, and slides on a deal team that runs on a senior banker's clock.",
    alsoKnownAs: ["IB Analyst", "M&A Analyst", "Investment Banking Associate", "Corporate Finance Analyst"],
    majors: ["Finance", "Economics", "Accounting", "Business Administration", "Mathematics"],
    skills: ["Financial Modeling", "Valuation", "Accounting", "Excel", "PowerPoint", "Communication"],
    experience: [
      "Land a sophomore-year diversity or insight program at a bank, then a junior-summer analyst internship (the internship is the job interview)",
      "Join the investment club or a student-run fund; learn the three-statement model and a paper LBO cold",
      "Network relentlessly: coffee chats and alumni calls drive who gets the superday",
      "Master the standard technicals (WACC, DCF, accretion/dilution) before any interview",
    ],
    timeline:
      "Summer analyst recruiting now kicks off sophomore spring, roughly 18+ months ahead of the internship. Miss that window and you are recruiting off-cycle for a much smaller pool of seats.",
    pay: [
      { stage: "Summer Analyst", range: "$110-120K annualized (pro-rated over ~10 weeks)" },
      { stage: "Analyst (Yr 1-3)", range: "$110-125K base + 50-100% bonus" },
      { stage: "Associate", range: "$175-225K base + 50-120% bonus" },
      { stage: "VP / MD", range: "$300K-$1M+ all-in, MD comp largely from deal credit" },
    ],
    outlook:
      "Steady demand and the canonical springboard into PE and hedge funds, though AI is compressing the junior modeling and formatting grind.",
  },
  "Private Equity": {
    summary:
      "Private equity firms buy companies, improve them, and sell them for a return, funded by leverage and institutional capital. Pre-MBA associates run diligence, build LBO models, and monitor portfolio companies; the work is more analytical and less frantic than banking but the hours still run long during a live deal.",
    alsoKnownAs: ["PE Associate", "Buyout Associate", "Investment Associate", "Deal Team Associate"],
    majors: ["Finance", "Economics", "Accounting", "Business Administration", "Mathematics"],
    skills: ["Financial Modeling", "Valuation", "Accounting", "Excel", "Data Analysis", "Communication"],
    experience: [
      "Do two years as an investment banking analyst first; PE almost never hires undergrads directly",
      "Win a strong analyst seat at a top group (TMT, healthcare, sponsors) since headhunters recruit by group",
      "Drill LBO modeling and case studies before on-cycle interviews hit",
      "Build relationships with PE headhunters (Henkel, CPI, Amity) in your first analyst months",
    ],
    timeline:
      "On-cycle recruiting is brutally early: it can start within months of an analyst starting their banking job, for an associate role beginning ~2 years later. Off-cycle (smaller and middle-market funds) runs year-round.",
    pay: [
      { stage: "Associate (Yr 1-2)", range: "$150-200K base + 100%+ bonus, ~$250-350K all-in" },
      { stage: "Senior Associate", range: "$200-250K base + bonus, ~$350-450K all-in" },
      { stage: "VP / Principal", range: "$400-600K+ all-in, carry begins to matter" },
      { stage: "Partner", range: "$1M+ cash plus carried interest, the real wealth driver" },
    ],
    outlook:
      "Among the most prestigious and best-paid finance exits, but the pre-MBA associate role is famously a ceiling: most associates leave for an MBA or a smaller fund rather than make partner.",
  },
  "Venture Capital": {
    summary:
      "Venture capitalists invest in early-stage startups for equity, sourcing deals, running diligence, and supporting founders. Junior VC is heavily relationship- and thesis-driven: a lot of networking, market mapping, and founder meetings rather than the heavy modeling of buyout PE.",
    alsoKnownAs: ["VC Analyst", "VC Associate", "Investment Associate", "Platform Associate"],
    majors: ["Finance", "Economics", "Computer Science", "Business Administration", "Engineering"],
    skills: ["Financial Modeling", "Data Analysis", "Communication", "Public Speaking", "Research", "Excel"],
    experience: [
      "Get close to startups: work at one, scout for a fund, or run a campus venture / accelerator program",
      "Build a public point of view (writing, a thesis, a deal memo) since VCs hire for judgment and network",
      "Source: bring a fund real founder intros and they will notice",
      "Operating or technical experience (a former engineer or PM) is a strong differentiator for many funds",
    ],
    timeline:
      "No structured on-cycle pipeline; VC seats are scarce and fill through warm intros and reputation. Watch fund job boards and partner networks rather than a recruiting calendar.",
    pay: [
      { stage: "Analyst / Associate", range: "$100-150K base + modest bonus" },
      { stage: "Senior Associate", range: "$150-200K + small carry at some funds" },
      { stage: "Principal", range: "$200-300K + meaningful carry" },
      { stage: "Partner / GP", range: "Base plus carry; upside is almost entirely carried interest" },
    ],
    outlook:
      "Highly competitive and cyclical with fundraising; cash comp lags PE, and the real payoff is carry that only materializes if the fund's bets win.",
  },
  "Hedge Fund": {
    summary:
      "Hedge fund professionals manage pooled capital across public markets using strategies from long/short equity to global macro to quant. Analysts pitch trade ideas and build conviction through deep research; pay is performance-driven and seats are few and demanding.",
    alsoKnownAs: ["Investment Analyst", "Buy-Side Analyst", "Portfolio Manager", "Research Analyst"],
    majors: ["Finance", "Economics", "Mathematics", "Statistics", "Computer Science"],
    skills: ["Financial Modeling", "Valuation", "Data Analysis", "Statistics", "Excel", "Python"],
    experience: [
      "Recruit from a strong banking, equity research, or top consulting seat; some funds run analyst programs",
      "Build a real investment pitch (a long or short with a variant view) to bring to interviews",
      "Track markets daily and keep a personal P&L or mock book to show conviction",
      "For quant pods, lead with Python, statistics, and a quantitative research project",
    ],
    timeline:
      "Mostly off-cycle and relationship-driven; multi-manager pods (Citadel, Millennium, Point72) recruit more structurally, sometimes pulling analysts directly from banking. Watch fund and headhunter channels year-round.",
    pay: [
      { stage: "Analyst (Yr 1-2)", range: "$150-250K all-in, heavily bonus-weighted" },
      { stage: "Senior Analyst", range: "$250-500K all-in at a strong fund" },
      { stage: "Portfolio Manager", range: "$500K-several $M, a cut of the P&L they run" },
      { stage: "Founder / Star PM", range: "Eight figures in a strong year, with real blow-up risk" },
    ],
    outlook:
      "The highest cash ceiling in finance for top performers, but seats are scarce, tenure is shorter, and a few bad quarters can end a seat.",
  },
  "Asset Management": {
    summary:
      "Asset managers invest client money (mutual funds, pensions, ETFs) across stocks and bonds for the long term. The work is research and portfolio construction with markedly better hours than banking, trading reach for stability and a steadier book of capital.",
    alsoKnownAs: ["Investment Analyst", "Portfolio Analyst", "Buy-Side Analyst", "Fund Analyst"],
    majors: ["Finance", "Economics", "Accounting", "Mathematics", "Statistics"],
    skills: ["Financial Modeling", "Valuation", "Data Analysis", "Excel", "Statistics", "Communication"],
    experience: [
      "Target rotational analyst programs at large managers (Fidelity, BlackRock, Capital Group, T. Rowe)",
      "Start the CFA program; the charter is genuinely valued on this side",
      "Build a long-term investment thesis on a company or sector to discuss in interviews",
      "Sharpen both equity and fixed-income fundamentals depending on the desk",
    ],
    timeline:
      "Large managers run summer internships and rotational programs recruiting junior year, on a slightly later and calmer calendar than banking. Smaller shops hire opportunistically.",
    pay: [
      { stage: "Analyst (Yr 1-2)", range: "$85-110K base + 20-50% bonus" },
      { stage: "Senior Analyst", range: "$120-175K + bonus" },
      { stage: "Portfolio Manager", range: "$250-500K+ tied to assets and performance" },
      { stage: "Senior PM / CIO", range: "$500K-$1M+ at large funds" },
    ],
    outlook:
      "Stable and respected, though passive/ETF flows and fee compression pressure active mandates and headcount.",
  },
  "Sales & Trading": {
    summary:
      "Sales and trading sits on a bank's trading floor: traders make markets and manage risk in equities, rates, FX, or commodities, while salespeople pitch ideas and execute for institutional clients. The day is fast, market-hours-bound, and P&L-driven rather than deal-driven.",
    alsoKnownAs: ["Trader", "S&T Analyst", "Markets Analyst", "Sales Trader"],
    majors: ["Finance", "Economics", "Mathematics", "Statistics", "Engineering"],
    skills: ["Data Analysis", "Statistics", "Excel", "Python", "Communication", "Financial Modeling"],
    experience: [
      "Win a sophomore markets insight program, then a junior S&T summer internship",
      "Learn one asset class deeply (rates, credit, equity derivatives) and follow it daily",
      "Practice fast mental math and market-sizing for the interview brain-teasers",
      "Show market passion: a personal trading journal, a markets newsletter, a desk-relevant project",
    ],
    timeline:
      "Same early bank calendar as IB: sophomore-spring insight programs feeding junior-summer internships and full-time return offers. Desk placement happens during or after the internship.",
    pay: [
      { stage: "Summer Analyst", range: "$110-120K annualized" },
      { stage: "Analyst (Yr 1-3)", range: "$110-125K base + 30-80% bonus" },
      { stage: "VP Trader", range: "$250-500K all-in, P&L-linked" },
      { stage: "MD / Desk Head", range: "$500K-$2M+ in strong years" },
    ],
    outlook:
      "Electronification and automation thinned flow-trading seats, but quant-savvy traders and structured-products desks remain well paid and in demand.",
  },
  "Equity Research": {
    summary:
      "Equity research analysts publish buy/sell views on public companies, building models and reports that drive institutional investment decisions. Associates cover a sector under a senior analyst, owning the models and notes; better hours than banking with deep sector specialization.",
    alsoKnownAs: ["ER Associate", "Research Analyst", "Sell-Side Analyst", "Equity Analyst"],
    majors: ["Finance", "Economics", "Accounting", "Mathematics", "Statistics"],
    skills: ["Financial Modeling", "Valuation", "Accounting", "Excel", "Communication", "Data Analysis"],
    experience: [
      "Land a junior-summer ER internship or break in from a banking/AM seat",
      "Write a full initiation-style report on one company to prove you can model and form a view",
      "Pick a sector you genuinely follow and track its earnings cycle",
      "Start the CFA program; it signals seriousness on the buy- and sell-side",
    ],
    timeline:
      "Junior-year summer internships on a calendar similar to banking, though some desks hire off-cycle. Sector assignment follows the internship.",
    pay: [
      { stage: "Associate (Yr 1-2)", range: "$100-130K base + 30-70% bonus" },
      { stage: "Senior Associate", range: "$130-175K + bonus" },
      { stage: "Analyst (sector lead)", range: "$250-500K+ for a ranked analyst" },
      { stage: "Senior Analyst / Director", range: "$500K+ at the top of the rankings" },
    ],
    outlook:
      "MiFID II unbundling and passive flows squeezed sell-side budgets, but a top-ranked analyst in a hot sector still commands strong pay and an easy buy-side exit.",
  },
  "Corporate Finance": {
    summary:
      "Corporate finance professionals manage a company's own money: FP&A, treasury, capital allocation, and strategic planning inside an operating business. The hours are humane and the work steadier than banking, trading deal intensity for lifestyle and a path toward CFO.",
    alsoKnownAs: ["FP&A Analyst", "Finance Analyst", "Treasury Analyst", "Corporate Development Analyst"],
    majors: ["Finance", "Accounting", "Economics", "Business Administration", "Mathematics"],
    skills: ["Financial Modeling", "Accounting", "Excel", "Data Analysis", "Communication", "SQL"],
    experience: [
      "Target a Fortune 500 finance leadership rotational program (FLDP) for junior-summer or full-time",
      "Build budgeting and forecasting models; learn the FP&A monthly close cycle",
      "Pursue the CPA or CFA depending on whether you lean accounting or markets",
      "Corporate development roles favor candidates with prior banking or M&A exposure",
    ],
    timeline:
      "Rotational programs recruit junior-year summer and full-time on a normal campus calendar. Lateral moves into corporate development often come after a banking stint.",
    pay: [
      { stage: "Analyst (Yr 1-2)", range: "$65-85K base + 5-15% bonus" },
      { stage: "Senior Analyst / Manager", range: "$90-130K + bonus" },
      { stage: "Director", range: "$150-220K + bonus and equity" },
      { stage: "VP Finance / CFO", range: "$250K-$1M+ with equity at the top" },
    ],
    outlook:
      "Stable and ubiquitous; automation is reshaping routine FP&A toward analysis and partnership, and the CFO track remains a durable destination.",
  },
  "Wealth Management": {
    summary:
      "Wealth managers advise individuals and families on investing, retirement, and estate planning, and are ultimately measured on assets gathered. Early years are part client service, part business development; success compounds with a book of clients and recurring fees.",
    alsoKnownAs: ["Financial Advisor", "Private Wealth Advisor", "Private Banker", "Wealth Analyst"],
    majors: ["Finance", "Economics", "Accounting", "Business Administration", "Communications"],
    skills: ["Financial Modeling", "Communication", "Public Speaking", "Excel", "Data Analysis", "Accounting"],
    experience: [
      "Intern with a private wealth or private banking team junior summer",
      "Pursue the CFP, and the CFA for the investment-heavy private-bank track",
      "Build genuine relationship and sales skills; this is a people business at its core",
      "Learn portfolio construction, tax basics, and estate-planning fundamentals",
    ],
    timeline:
      "Bank private-wealth divisions run junior-year internships; independent and RIA roles hire year-round. The clock that matters most is how fast you build a client book.",
    pay: [
      { stage: "Analyst / Associate", range: "$70-95K base + bonus" },
      { stage: "Advisor (building book)", range: "$100-200K as fees ramp" },
      { stage: "Senior Advisor", range: "$250-500K on recurring fee revenue" },
      { stage: "Top Producer", range: "$1M+ on a large, sticky book" },
    ],
    outlook:
      "A massive wealth transfer to younger generations is expanding demand, even as robo-advisors automate the low end and push human advisors upmarket.",
  },

  // ---- Consulting ----
  "Management Consulting": {
    summary:
      "Management consultants are hired by companies to solve their hardest problems: strategy, operations, org design, and transformation. Analysts structure problems, run analysis and interviews, and build the recommendation deck, traveling or on-site with a case team for weeks at a time.",
    alsoKnownAs: ["Business Analyst", "Associate Consultant", "Strategy Consultant", "Management Consultant"],
    majors: ["Economics", "Business Administration", "Engineering", "Mathematics", "Computer Science"],
    skills: ["Data Analysis", "Communication", "Public Speaking", "Excel", "PowerPoint", "Project Management"],
    experience: [
      "Land a junior-summer consulting internship; the offer usually converts to full-time",
      "Drill case interviews (market sizing, profitability, frameworks) for months and do mock cases with peers",
      "Take a campus leadership role and a consulting / case club; recruiters weight leadership heavily",
      "Build a crisp story for fit interviews and sharpen structured top-down communication",
    ],
    timeline:
      "MBB and top firms recruit junior-year summer interns and full-time in the fall; applications often open in spring before. The internship-to-offer path is the main entry door.",
    pay: [
      { stage: "Intern", range: "$10-15K/month at MBB" },
      { stage: "Analyst / BA (Yr 1-2)", range: "$100-115K base + signing and bonus" },
      { stage: "Consultant (post-MBA)", range: "$190-225K base + bonus" },
      { stage: "Partner", range: "$1M+ all-in" },
    ],
    outlook:
      "Resilient and a flexible launchpad into industry, PE, and startups; demand is shifting toward digital, AI, and implementation work.",
  },
  "Strategy": {
    summary:
      "Strategy roles, whether in a boutique firm or an in-house corporate strategy group, focus on where a business should play and how it should win: market entry, M&A rationale, and long-range planning. The work is analytical and executive-facing, lighter on the implementation grind than broad consulting.",
    alsoKnownAs: ["Corporate Strategy Analyst", "Strategy Associate", "Strategy & Operations", "BizOps"],
    majors: ["Economics", "Business Administration", "Engineering", "Mathematics", "Finance"],
    skills: ["Data Analysis", "Financial Modeling", "Communication", "Excel", "SQL", "Project Management"],
    experience: [
      "Break in via management consulting or a corporate strategy/BizOps internship",
      "Practice case-style structuring and market sizing",
      "Build comfort with data: pulling, analyzing, and turning it into a recommendation",
      "At tech companies, strategy/BizOps prizes SQL and crisp analytical storytelling",
    ],
    timeline:
      "Boutique strategy firms mirror the consulting calendar (junior-summer + fall full-time); in-house corporate strategy and tech BizOps hire more opportunistically, often favoring prior consulting experience.",
    pay: [
      { stage: "Analyst (Yr 1-2)", range: "$90-120K base + bonus" },
      { stage: "Senior Analyst / Manager", range: "$130-180K + bonus" },
      { stage: "Director", range: "$200-300K + equity" },
      { stage: "VP Strategy", range: "$300K-$600K+ with equity" },
    ],
    outlook:
      "Durable demand as companies navigate AI and digital disruption; tech BizOps in particular has become a sought-after, well-paid lane.",
  },

  // ---- CS/Tech ----
  "Software Engineering": {
    summary:
      "Software engineers design, build, and maintain the systems and products that run on code, from web and mobile apps to backend services and infrastructure. The day is writing and reviewing code, designing systems, and shipping features with a team; it is the highest-volume, highest-mobility path in tech.",
    alsoKnownAs: ["SWE", "Software Developer", "Backend Engineer", "Full Stack Engineer", "Frontend Engineer"],
    majors: ["Computer Science", "Computer Engineering", "Mathematics", "Electrical Engineering", "Information Systems"],
    skills: ["Python", "Data Structures & Algorithms", "System Design", "Git", "Cloud Computing", "SQL"],
    experience: [
      "Land summer SWE internships early; sophomore-summer internships strongly de-risk a new-grad offer",
      "Build and ship real projects on GitHub; a portfolio beats a transcript",
      "Grind LeetCode-style data structures and algorithms for the coding interview",
      "Contribute to open source or a campus dev club to show you can work in a real codebase",
    ],
    timeline:
      "New-grad and internship applications open Aug-Oct of the prior academic year and big tech fills fast, so apply early in the fall. Off-season and startup hiring runs year-round.",
    pay: [
      { stage: "Intern", range: "$8-12K/month at big tech" },
      { stage: "New Grad (L3/E3)", range: "$150-200K total comp at top firms" },
      { stage: "Senior (L5)", range: "$300-450K total comp" },
      { stage: "Staff+ (L6+)", range: "$500K-$1M+ total comp" },
    ],
    outlook:
      "Still one of the strongest career bets, though entry-level hiring has tightened and AI coding tools are raising the bar on what a junior engineer is expected to deliver.",
  },
  "Product Management": {
    summary:
      "Product managers own the why and what of a product: they set strategy, prioritize the roadmap, and coordinate engineering, design, and business toward shipping the right thing. PMs do not write the code; they write specs, talk to users, and make trade-off calls under ambiguity.",
    alsoKnownAs: ["PM", "Associate Product Manager", "Technical Product Manager", "Product Owner"],
    majors: ["Computer Science", "Business Administration", "Economics", "Engineering", "Information Systems"],
    skills: ["Product Management", "Data Analysis", "SQL", "Communication", "Public Speaking", "Project Management"],
    experience: [
      "Target Associate Product Manager (APM) programs at Google, Meta, and similar for new grads",
      "Ship something end-to-end: a side project, a club product, a hackathon win you can speak to",
      "Build product sense and data fluency (SQL, metrics, A/B basics) for PM interviews",
      "A technical internship or CS background helps for technical-PM roles",
    ],
    timeline:
      "APM programs are competitive and recruit junior-summer and full-time on the fall tech calendar. Most other PM roles want prior experience, so new grads aim at the structured APM pipelines.",
    pay: [
      { stage: "Intern / APM", range: "$8-12K/month intern; ~$150-200K new-grad total comp" },
      { stage: "PM (mid)", range: "$200-300K total comp" },
      { stage: "Senior PM", range: "$300-450K total comp" },
      { stage: "Principal / Group PM", range: "$450K-$700K+ total comp" },
    ],
    outlook:
      "Highly competitive to break into; AI product work is the fastest-growing slice and increasingly rewards PMs who are fluent in what models can and cannot do.",
  },
  "Cybersecurity": {
    summary:
      "Cybersecurity professionals defend systems, networks, and data from attack, spanning offensive (penetration testing, red team), defensive (security operations, incident response), and engineering (building secure systems). It is a high-stakes, fast-moving field where attackers keep changing the game.",
    alsoKnownAs: ["Security Engineer", "Security Analyst", "Penetration Tester", "InfoSec Engineer", "SOC Analyst"],
    majors: ["Computer Science", "Cybersecurity", "Computer Engineering", "Information Systems", "Information Technology"],
    skills: ["Networking", "Python", "Linux", "Cloud Computing", "Cryptography", "System Design"],
    experience: [
      "Earn a foundational cert (Security+, then OSCP for offensive roles)",
      "Compete in CTFs (capture-the-flag) and run a home lab to build hands-on skill",
      "Intern in a SOC or on a security engineering team",
      "Learn networking and Linux internals cold; they underlie nearly every security role",
    ],
    timeline:
      "Internships recruit on the standard fall tech calendar; certs and demonstrable hands-on skill (CTFs, a lab, a CVE) often matter more than the exact recruiting season.",
    pay: [
      { stage: "Intern / Entry", range: "$70-110K, higher at big tech" },
      { stage: "Security Engineer (mid)", range: "$130-200K total comp" },
      { stage: "Senior Security Engineer", range: "$200-350K total comp" },
      { stage: "Principal / Security Architect", range: "$350K-$600K+ total comp" },
    ],
    outlook:
      "Persistent talent shortage and rising threats keep demand strong; cloud security and AI/LLM security are the fastest-growing specialties.",
  },
  "Infrastructure / DevOps": {
    summary:
      "Infrastructure and DevOps engineers build and run the platforms other engineers ship on: cloud, CI/CD, container orchestration, observability, and reliability. The job is keeping large distributed systems fast, available, and scalable, and automating away the manual operational toil. At frontier AI labs this extends to standing up GPU clusters and the Kubernetes-based platforms that train and serve models.",
    alsoKnownAs: ["DevOps Engineer", "Site Reliability Engineer", "SRE", "Platform Engineer", "Cloud Engineer"],
    majors: ["Computer Science", "Computer Engineering", "Electrical Engineering", "Information Systems", "Information Technology"],
    skills: ["Kubernetes", "Docker", "Cloud Computing", "Linux", "Python", "Distributed Systems"],
    experience: [
      "Build a real cluster: deploy something on Kubernetes and wire up CI/CD end to end",
      "Learn one cloud deeply (AWS, GCP, or Azure) and earn an associate-level cert",
      "Intern as a SWE on an infrastructure, platform, or SRE team",
      "Get comfortable with Linux, networking, and infrastructure-as-code (Terraform)",
    ],
    timeline:
      "Recruits on the standard fall tech calendar via SWE/infra internships; many engineers also rotate in from general software roles. Demonstrable systems projects carry real weight.",
    pay: [
      { stage: "Intern / New Grad", range: "$150-200K total comp at top firms" },
      { stage: "Infra/SRE Engineer (mid)", range: "$200-320K total comp" },
      { stage: "Senior SRE / Platform", range: "$320-480K total comp" },
      { stage: "Staff+ Infra", range: "$500K-$900K+ at AI labs and big tech" },
    ],
    outlook:
      "Booming: the AI buildout has made GPU and cluster infrastructure engineers some of the most sought-after, highly paid people in the industry.",
  },
  "Solutions Engineering": {
    summary:
      "Solutions engineers are the technical half of a sales or customer team: they run demos, scope integrations, build proofs of concept, and translate a customer's problem into the product's capabilities. The role blends real engineering with communication and is customer-facing rather than purely heads-down code.",
    alsoKnownAs: ["Sales Engineer", "Solutions Architect", "Technical Specialist", "Customer Engineer", "Pre-Sales Engineer"],
    majors: ["Computer Science", "Computer Engineering", "Information Systems", "Business Administration", "Engineering"],
    skills: ["System Design", "Cloud Computing", "Python", "SQL", "Communication", "Public Speaking"],
    experience: [
      "Build customer-facing technical chops: demo a product you built, explain it clearly to non-engineers",
      "Intern in a SWE, solutions, or customer-engineering role to see both sides",
      "Learn the product category and its integration patterns (APIs, cloud, data)",
      "Sharpen communication and presentation; this role lives or dies on clarity",
    ],
    timeline:
      "Hires on the standard tech calendar but with more lateral and experienced entry than core SWE; strong communicators with a technical base are favored over pure algorithm grinders.",
    pay: [
      { stage: "Entry / Associate SE", range: "$100-150K base + variable (OTE ~$130-180K)" },
      { stage: "Solutions Engineer (mid)", range: "OTE $180-260K (base + commission)" },
      { stage: "Senior / Principal SE", range: "OTE $260-400K" },
      { stage: "SE Leadership", range: "$400K-$600K+ OTE" },
    ],
    outlook:
      "Growing fast as technical products proliferate; AI-platform solutions engineering is an especially hot, well-compensated niche.",
  },
  "Technical Program Management": {
    summary:
      "Technical program managers drive complex, cross-team engineering programs to completion: they own timelines, dependencies, and risk across multiple teams shipping toward one goal. TPMs are technical enough to challenge engineering trade-offs but spend their day coordinating, unblocking, and communicating rather than coding.",
    alsoKnownAs: ["TPM", "Technical Program Manager", "Program Manager", "Engineering Program Manager"],
    majors: ["Computer Science", "Computer Engineering", "Engineering", "Information Systems", "Business Administration"],
    skills: ["Project Management", "System Design", "Communication", "Data Analysis", "Public Speaking", "SQL"],
    experience: [
      "Get a technical foundation first: a CS background or a SWE internship makes you credible with engineers",
      "Lead a cross-functional project (a club, a hackathon team, a research effort) end to end",
      "Build organization and communication skills; TPM is coordination under technical constraints",
      "Some TPM programs hire new grads, but many roles prefer a prior engineering stint",
    ],
    timeline:
      "Structured TPM new-grad programs recruit on the fall tech calendar; many TPMs transition in from engineering after a few years, so lateral entry is common.",
    pay: [
      { stage: "Entry / New Grad TPM", range: "$130-180K total comp" },
      { stage: "TPM (mid)", range: "$180-280K total comp" },
      { stage: "Senior TPM", range: "$280-420K total comp" },
      { stage: "Principal / Group TPM", range: "$420K-$650K+ total comp" },
    ],
    outlook:
      "Steady demand wherever large engineering orgs ship complex systems; AI infrastructure programs are a growing source of high-leverage TPM roles.",
  },
  "IT": {
    summary:
      "IT professionals keep an organization's technology running: systems administration, networking, help desk, endpoint management, and internal tooling. It is the operational backbone of a company and a common, accessible on-ramp into tech that can branch into cloud, security, or engineering.",
    alsoKnownAs: ["IT Support", "Systems Administrator", "Network Administrator", "IT Specialist", "Help Desk Analyst"],
    majors: ["Information Technology", "Information Systems", "Computer Science", "Computer Engineering", "Cybersecurity"],
    skills: ["Networking", "Linux", "Cloud Computing", "System Design", "Python", "Communication"],
    experience: [
      "Earn entry certs (CompTIA A+, Network+, then a cloud cert) to clear the first screen",
      "Intern or work a help-desk/IT-support role to build hands-on troubleshooting reps",
      "Learn networking fundamentals and at least one cloud platform",
      "Use IT as a launchpad: many people pivot into cloud, security, or DevOps from here",
    ],
    timeline:
      "Hires year-round and is less calendar-bound than competitive SWE recruiting; certifications and demonstrable hands-on skill move the needle most.",
    pay: [
      { stage: "Help Desk / Entry", range: "$45-65K" },
      { stage: "Sys/Network Admin", range: "$70-100K" },
      { stage: "Senior IT / Engineer", range: "$100-140K" },
      { stage: "IT Manager / Director", range: "$140-220K+" },
    ],
    outlook:
      "Stable and everywhere; cloud migration and automation are shifting routine IT toward cloud, security, and platform skills, so the upskilling path matters.",
  },

  // ---- Data Science ----
  "Data Science": {
    summary:
      "Data scientists turn data into decisions and products: they run experiments, build statistical and machine-learning models, and translate messy data into insight for the business. The job spans SQL and analytics, modeling in Python, and communicating findings to stakeholders.",
    alsoKnownAs: ["Data Scientist", "Applied Scientist", "ML Data Scientist", "Product Data Scientist"],
    majors: ["Statistics", "Computer Science", "Mathematics", "Economics", "Data Science"],
    skills: ["Python", "SQL", "Statistics", "Machine Learning", "Data Analysis", "Data Visualization"],
    experience: [
      "Build an end-to-end portfolio project: real data, a model, and a clear writeup",
      "Master SQL and statistics, then the Python data stack (pandas, scikit-learn)",
      "Intern as a data scientist or analyst and learn to frame business questions as experiments",
      "Compete on Kaggle or contribute analysis to a club/lab to show applied skill",
    ],
    timeline:
      "Internships recruit on the fall tech calendar; many product data science roles prefer a master's or prior internship experience, so build a portfolio early.",
    pay: [
      { stage: "Intern / Entry", range: "$100-150K total comp at tech firms" },
      { stage: "Data Scientist (mid)", range: "$150-230K total comp" },
      { stage: "Senior Data Scientist", range: "$230-350K total comp" },
      { stage: "Staff / Principal DS", range: "$350K-$550K+ total comp" },
    ],
    outlook:
      "Solid demand, though the field is bifurcating: routine analytics is commoditizing while ML-heavy and causal-inference data science keeps commanding a premium.",
  },
  "Data Engineering": {
    summary:
      "Data engineers build the pipelines and platforms that move, clean, and store data at scale so analysts and models can use it. The work is software engineering aimed at data: ETL/ELT pipelines, warehouses, and streaming systems, and it is increasingly the backbone of every AI and analytics effort.",
    alsoKnownAs: ["Data Engineer", "Analytics Engineer", "Data Platform Engineer", "ETL Developer"],
    majors: ["Computer Science", "Computer Engineering", "Data Science", "Information Systems", "Mathematics"],
    skills: ["Python", "SQL", "Distributed Systems", "Cloud Computing", "Apache Spark", "Data Modeling"],
    experience: [
      "Build a real pipeline: ingest data, transform it, load a warehouse, schedule it",
      "Learn SQL deeply plus a cloud data stack (Snowflake/BigQuery, dbt, Spark, Airflow)",
      "Intern as a data or software engineer on a data-platform team",
      "Treat it as software: version control, testing, and system design all matter here",
    ],
    timeline:
      "Recruits on the standard fall tech calendar via SWE/data internships; demonstrable pipeline and systems projects carry strong signal.",
    pay: [
      { stage: "Intern / New Grad", range: "$130-190K total comp at top firms" },
      { stage: "Data Engineer (mid)", range: "$180-280K total comp" },
      { stage: "Senior Data Engineer", range: "$280-420K total comp" },
      { stage: "Staff+ Data Engineer", range: "$450K-$750K+ at AI labs and big tech" },
    ],
    outlook:
      "Among the fastest-growing data roles: every AI and analytics initiative needs clean, scalable data plumbing, keeping demand and pay high.",
  },
  "Quant": {
    summary:
      "Quants apply advanced math, statistics, and programming to markets: pricing derivatives, building trading signals, and managing risk at hedge funds, prop shops, and banks. It is one of the most intellectually demanding and best-paid technical paths, blending research, modeling, and fast, reliable code.",
    alsoKnownAs: ["Quantitative Researcher", "Quantitative Analyst", "Quant Developer", "Quant Trader"],
    majors: ["Mathematics", "Statistics", "Computer Science", "Physics", "Electrical Engineering"],
    skills: ["Python", "Statistics", "Machine Learning", "Mathematics", "C++", "Data Analysis"],
    experience: [
      "Build a strong math/stats/CS foundation; top desks recruit heavily from competition and PhD pipelines",
      "Master probability, statistics, and Python (and C++ for low-latency roles)",
      "Win a quant internship at a prop shop, hedge fund, or bank; do a research project with real data",
      "Practice the brain-teaser, probability, and coding gauntlet these interviews are known for",
    ],
    timeline:
      "Top firms (Jane Street, Citadel, Two Sigma, HRT) recruit extremely early on the fall tech/finance calendar, sometimes sophomore year, and seats are very few. PhD hiring runs alongside.",
    pay: [
      { stage: "Intern", range: "$15-25K/month at top prop shops" },
      { stage: "New Grad Quant", range: "$200-400K+ total comp (base + sign-on + bonus)" },
      { stage: "Senior Quant", range: "$400-800K total comp" },
      { stage: "Star Researcher / PM", range: "$1M+ tied to strategy P&L" },
    ],
    outlook:
      "Elite and extremely competitive; the ML-and-data arms race in trading keeps demand for strong quantitative researchers and developers very high.",
  },
  "Analytics": {
    summary:
      "Analytics professionals answer business questions with data: they build dashboards, run analyses, and define the metrics that teams steer by. Lighter on heavy modeling than data science and heavier on SQL, visualization, and clear communication, it is a fast, accessible on-ramp into a data career.",
    alsoKnownAs: ["Data Analyst", "Business Analyst", "Analytics Engineer", "BI Analyst", "Product Analyst"],
    majors: ["Statistics", "Economics", "Mathematics", "Business Administration", "Data Science"],
    skills: ["SQL", "Excel", "Data Analysis", "Data Visualization", "Statistics", "Python"],
    experience: [
      "Master SQL and a BI tool (Tableau, Looker, or Power BI) and build a dashboard portfolio",
      "Do an analyst internship and practice turning a vague question into a clear metric and answer",
      "Learn enough statistics to reason about significance and trends",
      "Show business communication: an analysis is only useful if a decision-maker acts on it",
    ],
    timeline:
      "Hires on the standard tech calendar but also year-round; a portfolio and strong SQL often matter more than the exact recruiting window.",
    pay: [
      { stage: "Intern / Entry", range: "$60-90K" },
      { stage: "Analyst (mid)", range: "$90-130K total comp" },
      { stage: "Senior Analyst", range: "$130-180K total comp" },
      { stage: "Analytics Lead / Manager", range: "$180-260K+ total comp" },
    ],
    outlook:
      "Steady and widely available; the natural growth path is toward data science or analytics engineering as SQL and modeling skills deepen, even as BI copilots automate routine reporting.",
  },

  // ---- AI ----
  "AI Engineer": {
    summary:
      "AI engineers build products and features on top of machine-learning models, increasingly large language models: they design prompts and pipelines, wire up retrieval and tools, fine-tune, and ship AI capabilities into real applications. It is software engineering centered on models, and it is one of the hottest roles in tech.",
    alsoKnownAs: ["AI Engineer", "LLM Engineer", "GenAI Engineer", "Applied ML Engineer", "AI Software Engineer"],
    majors: ["Computer Science", "Computer Engineering", "Mathematics", "Statistics", "Data Science"],
    skills: ["Python", "Machine Learning", "LLMs", "System Design", "Cloud Computing", "PyTorch"],
    experience: [
      "Ship real LLM apps: build with the OpenAI/Anthropic APIs, RAG, and agent frameworks and put them on GitHub",
      "Get a SWE foundation first, then layer on applied ML and the model toolchain",
      "Intern on an AI/ML product team or build a standout AI side project",
      "Learn the practical model stack (embeddings, vector DBs, fine-tuning, evals)",
    ],
    timeline:
      "Recruits on the fall tech calendar plus heavy year-round startup hiring; a strong applied-AI portfolio can outweigh credentials in this market.",
    pay: [
      { stage: "Intern / New Grad", range: "$150-220K total comp at top firms" },
      { stage: "AI Engineer (mid)", range: "$220-350K total comp" },
      { stage: "Senior AI Engineer", range: "$350-550K total comp" },
      { stage: "Staff+ AI Engineer", range: "$600K-$1M+ at frontier labs" },
    ],
    outlook:
      "One of the fastest-growing, best-paid roles in software; demand for engineers who can ship reliable LLM-powered products vastly outstrips supply.",
  },
  "ML Engineer": {
    summary:
      "Machine-learning engineers build, train, and deploy models into production systems: they own data pipelines, training, evaluation, and the serving infrastructure that keeps models running at scale. It sits between data science and software engineering and is core to every AI product.",
    alsoKnownAs: ["Machine Learning Engineer", "ML Engineer", "MLE", "Applied Scientist", "ML Platform Engineer"],
    majors: ["Computer Science", "Computer Engineering", "Mathematics", "Statistics", "Data Science"],
    skills: ["Python", "Machine Learning", "Deep Learning", "PyTorch", "Distributed Systems", "Cloud Computing"],
    experience: [
      "Train and deploy a model end to end, then put the project and code on GitHub",
      "Build strong CS fundamentals plus deep learning and the production ML stack (PyTorch, MLOps)",
      "Intern as an ML or software engineer; a research paper or Kaggle finish helps",
      "Learn how models actually ship: training infra, evaluation, monitoring, and serving",
    ],
    timeline:
      "Recruits on the fall tech calendar; many MLE roles favor a master's or research experience, so start building applied projects early.",
    pay: [
      { stage: "Intern / New Grad", range: "$150-220K total comp at top firms" },
      { stage: "ML Engineer (mid)", range: "$230-380K total comp" },
      { stage: "Senior ML Engineer", range: "$380-600K total comp" },
      { stage: "Staff+ MLE", range: "$650K-$1.2M+ at frontier labs" },
    ],
    outlook:
      "Among the most in-demand technical roles; the production-ML and frontier-model boom keeps compensation at the top of the software market.",
  },
  "AI Research": {
    summary:
      "AI researchers push the frontier of what models can do: they design new architectures and training methods, run experiments, and publish at venues like NeurIPS and ICML. At frontier labs they work on the core models themselves; the bar is high and the work is genuinely scientific.",
    alsoKnownAs: ["Research Scientist", "ML Research Scientist", "Research Engineer", "Member of Technical Staff"],
    majors: ["Computer Science", "Mathematics", "Statistics", "Physics", "Electrical Engineering"],
    skills: ["Machine Learning", "Deep Learning", "Python", "PyTorch", "Mathematics", "Research"],
    experience: [
      "Get into a research lab as an undergrad and aim to co-author papers; publications are the currency",
      "Build deep math and deep-learning foundations well beyond coursework",
      "Most research-scientist roles expect a PhD; research-engineer roles are the more accessible adjacent path",
      "Reproduce papers and contribute to open ML research to build a visible track record",
    ],
    timeline:
      "Research internships and new-grad research-engineer roles recruit on the fall tech calendar; research-scientist hiring is tied to the PhD pipeline and publication record rather than a campus season.",
    pay: [
      { stage: "Research Intern", range: "$12-20K/month at top labs" },
      { stage: "Research Engineer", range: "$200-400K total comp" },
      { stage: "Research Scientist", range: "$400-800K total comp at frontier labs" },
      { stage: "Senior / Staff Researcher", range: "$1M-$5M+ at the very top, equity-heavy" },
    ],
    outlook:
      "The most prestigious and highest-ceiling AI path, but the research-scientist bar usually means a PhD and a strong publication record; research-engineer roles offer a non-PhD adjacent route.",
  },
  "AI Product": {
    summary:
      "AI product managers own the strategy and roadmap for AI-powered products: they decide what to build with models, navigate the unique trade-offs of probabilistic systems (latency, cost, hallucination, evals), and align research, engineering, and design. It is product management for a stack where the technology itself is moving weekly.",
    alsoKnownAs: ["AI PM", "AI Product Manager", "GenAI Product Manager", "ML Product Manager"],
    majors: ["Computer Science", "Business Administration", "Data Science", "Engineering", "Economics"],
    skills: ["Product Management", "Machine Learning", "LLMs", "Data Analysis", "Communication", "SQL"],
    experience: [
      "Ship an AI product end to end (even a side project) and learn where models break in the real world",
      "Build genuine fluency in what current models can and cannot do, plus evals and cost/latency trade-offs",
      "Break in via an APM program or a technical/data background, then specialize toward AI",
      "Develop product sense for probabilistic UX: confidence, fallbacks, and human-in-the-loop design",
    ],
    timeline:
      "Follows the PM/APM fall tech calendar; AI-product specialization is most accessible to PMs and technical folks who already understand the model stack.",
    pay: [
      { stage: "Entry / APM (AI)", range: "$150-210K total comp" },
      { stage: "AI PM (mid)", range: "$220-340K total comp" },
      { stage: "Senior AI PM", range: "$340-500K total comp" },
      { stage: "Principal / Group AI PM", range: "$500K-$800K+ total comp" },
    ],
    outlook:
      "One of the hottest PM specialties; as every company adds AI features, PMs who truly understand models are scarce and highly paid.",
  },
  "Applied AI": {
    summary:
      "Applied AI engineers sit between a frontier lab's models and the customers using them: as Forward Deployed Engineers and AI Solutions Architects they embed with enterprise teams, build custom solutions and prototypes on top of the models, and feed real-world feedback back to research. It is the hot, non-PhD path into a frontier lab, blending strong engineering with customer-facing problem-solving (this maps directly to Anthropic's Applied AI department).",
    alsoKnownAs: ["Forward Deployed Engineer", "AI Solutions Architect", "Applied AI Engineer", "Solutions Engineer (AI)", "Customer Engineer (AI)"],
    majors: ["Computer Science", "Computer Engineering", "Data Science", "Mathematics", "Engineering"],
    skills: ["Python", "LLMs", "Machine Learning", "System Design", "Communication", "Cloud Computing"],
    experience: [
      "Build and ship LLM solutions for real users: RAG systems, agents, and integrations on GitHub",
      "Pair strong software engineering with customer-facing communication; FDEs live at that intersection",
      "Get hands-on with the frontier-model APIs (Anthropic, OpenAI) and the production prompt/eval toolchain",
      "Practice scoping ambiguous customer problems and turning them into working prototypes fast",
    ],
    timeline:
      "Frontier labs and AI startups hire applied/forward-deployed engineers year-round rather than on a fixed campus season; a strong applied-AI portfolio and clear communication open the door without a PhD.",
    pay: [
      { stage: "Entry / New Grad", range: "$160-230K total comp" },
      { stage: "Applied AI / FDE (mid)", range: "$250-400K total comp" },
      { stage: "Senior FDE / Solutions Architect", range: "$400-600K total comp" },
      { stage: "Staff+ Applied AI", range: "$600K-$1M+ at frontier labs, equity-heavy" },
    ],
    outlook:
      "Exploding: it is the most accessible high-paying way into a frontier lab without a research PhD, and every lab is racing to staff customer-facing applied teams.",
  },
  "ML Infrastructure": {
    summary:
      "ML infrastructure engineers build the systems that train and serve frontier models: large-scale training stacks, inference and serving platforms, GPU/accelerator performance, and the distributed-systems and kernel work that makes models fast and cheap to run. At labs like Anthropic this is the ML Systems, Inference, and GPU/kernel engineering that the entire model effort runs on.",
    alsoKnownAs: ["ML Systems Engineer", "Inference Engineer", "Performance Engineer", "GPU/Kernel Engineer", "ML Platform Engineer"],
    majors: ["Computer Science", "Computer Engineering", "Electrical Engineering", "Mathematics", "Physics"],
    skills: ["Python", "Distributed Systems", "CUDA", "Deep Learning", "C++", "Cloud Computing"],
    experience: [
      "Go deep on systems: distributed training, GPU programming (CUDA), and performance optimization",
      "Build or contribute to high-performance ML infrastructure; profile and speed up a real model",
      "Get a strong CS-systems foundation plus PyTorch internals and accelerator hardware knowledge",
      "Intern as a systems/infra or ML engineer; low-level performance work is a powerful differentiator",
    ],
    timeline:
      "Recruits on the fall tech calendar and heavily year-round at AI labs; demonstrable systems and performance work (a kernel, a training-speedup project) carries outsized weight.",
    pay: [
      { stage: "Intern / New Grad", range: "$170-240K total comp at top labs" },
      { stage: "ML Systems Engineer (mid)", range: "$280-450K total comp" },
      { stage: "Senior ML Infra", range: "$450-700K total comp" },
      { stage: "Staff+ ML Systems", range: "$700K-$1.5M+ at frontier labs, equity-heavy" },
    ],
    outlook:
      "One of the scarcest, best-paid specialties in tech: the race to train and serve ever-larger models makes GPU, inference, and performance engineers extraordinarily valuable.",
  },
  "AI Safety": {
    summary:
      "AI safety work aims to make powerful models reliable, controllable, and aligned with human intent: alignment research probes and steers model behavior, while safeguards and trust-and-safety teams build the classifiers, policies, and monitoring that keep deployed systems from causing harm. At frontier labs this spans the Alignment and Safeguards organizations, from interpretability research to applied policy enforcement.",
    alsoKnownAs: ["Alignment Researcher", "Safeguards Engineer", "Trust & Safety Engineer", "AI Policy", "Interpretability Researcher"],
    majors: ["Computer Science", "Mathematics", "Statistics", "Philosophy", "Cognitive Science"],
    skills: ["Machine Learning", "Deep Learning", "Python", "Research", "PyTorch", "Statistics"],
    experience: [
      "Engage with the alignment literature and reproduce interpretability or red-teaming results",
      "Build ML research skills; alignment-research roles often expect a research track record or PhD",
      "Safeguards and trust-and-safety engineering are more accessible applied entry points than pure research",
      "Contribute to open safety/eval projects or a lab to show you can do the work, not just discuss it",
    ],
    timeline:
      "Frontier labs and safety orgs hire year-round across research and applied tracks; research roles follow the publication/PhD pipeline while safeguards engineering recruits more like applied ML.",
    pay: [
      { stage: "Entry / Engineer", range: "$160-240K total comp (safeguards/applied)" },
      { stage: "Alignment Research Engineer", range: "$250-450K total comp" },
      { stage: "Research Scientist (Alignment)", range: "$450-800K total comp at frontier labs" },
      { stage: "Senior / Staff Safety", range: "$800K-$2M+ at the top, equity-heavy" },
    ],
    outlook:
      "A fast-growing, mission-driven field as labs and regulators invest heavily in making frontier systems safe; applied safeguards roles offer a non-PhD route while alignment research stays research-gated.",
  },

  // ---- Startups ----
  "Founder": {
    summary:
      "Founders start and run companies: they set the vision, raise capital, recruit the team, build the first product, and sell it, owning every gap no one else fills. The hours are unbounded, the risk is real, and the upside is equity in something you create rather than a salary.",
    alsoKnownAs: ["Co-Founder", "CEO", "Startup Founder", "Entrepreneur"],
    majors: ["Computer Science", "Business Administration", "Economics", "Engineering", "Any field"],
    skills: ["Product Management", "Communication", "Public Speaking", "Financial Modeling", "Data Analysis", "Sales"],
    experience: [
      "Build and ship things now: side projects, campus ventures, anything with real users",
      "Find a hard problem you understand and a co-founder you trust",
      "Apply to accelerators (Y Combinator, Techstars) and campus entrepreneurship programs",
      "Learn to sell and to fundraise; distribution and capital kill more startups than product does",
    ],
    timeline:
      "No recruiting calendar: you start when you have a problem worth solving and conviction to commit. Accelerator batches (YC twice a year) are the closest thing to a clock.",
    pay: [
      { stage: "Pre-seed / Bootstrapped", range: "Often little to no salary; you live on savings or a runway" },
      { stage: "Seed-funded Founder", range: "$60-120K modest salary + majority equity" },
      { stage: "Series A+", range: "$120-200K salary; wealth is in the equity" },
      { stage: "Exit", range: "Binary: zero in most cases, life-changing in a rare win" },
    ],
    outlook:
      "The highest-variance path: most startups fail, but AI-native tooling now lets tiny teams build and reach customers faster and cheaper than ever.",
  },
  "Founding Engineer": {
    summary:
      "A founding engineer is one of the first technical hires at a startup, building the initial product across the whole stack and making the early architecture calls. The role is wide-open scope, heavy ownership, and meaningful equity in exchange for lower cash and high risk; you are effectively a technical co-founder without the founder title.",
    alsoKnownAs: ["Founding Engineer", "First Engineer", "Early Engineer", "Member of Technical Staff (startup)"],
    majors: ["Computer Science", "Computer Engineering", "Mathematics", "Electrical Engineering", "Self-taught"],
    skills: ["Python", "System Design", "Cloud Computing", "Data Structures & Algorithms", "Product Management", "SQL"],
    experience: [
      "Become a strong, fast full-stack builder who can ship a product solo",
      "Build and launch real projects; founders hire founding engineers on demonstrated shipping ability",
      "Network into the early-startup world (YC companies, founder networks, AI startups)",
      "Get comfortable with breadth and ambiguity: you will own frontend, backend, infra, and product calls",
    ],
    timeline:
      "Hired through warm intros and founder networks year-round, not a campus pipeline; a public portfolio of shipped work is the strongest signal.",
    pay: [
      { stage: "Founding Engineer (cash)", range: "$120-180K base, below big-tech cash" },
      { stage: "Equity", range: "0.5-3%+ equity, the real upside" },
      { stage: "Post-Series A", range: "$160-220K + refreshed equity as the company scales" },
      { stage: "Exit", range: "Equity-dependent: meaningful in a strong outcome, zero otherwise" },
    ],
    outlook:
      "Increasingly attractive as AI startups proliferate and need versatile early builders; the trade is lower cash and real risk for ownership and outsized learning.",
  },
  "Early Stage": {
    summary:
      "Early-stage operators are the first non-founder, non-engineering hires at a young startup, owning whole functions (growth, operations, sales, product) before they are real departments. You wear many hats, build process from nothing, and trade big-company structure and cash for ownership and a steep learning curve.",
    alsoKnownAs: ["Early Stage Operator", "Founding GTM", "Chief of Staff", "Business Operations", "First Business Hire"],
    majors: ["Business Administration", "Economics", "Computer Science", "Engineering", "Any field"],
    skills: ["Communication", "Project Management", "Data Analysis", "Product Management", "SQL", "Sales"],
    experience: [
      "Intern at an early-stage startup to see how zero-to-one operating really works",
      "Build range: a bit of growth, ops, analysis, and sales, plus comfort with ambiguity",
      "Network into seed-stage and YC companies; these roles fill through founder networks",
      "Show initiative: a startup you ran, a club you scaled, a project you took end to end",
    ],
    timeline:
      "Hired opportunistically through founder and operator networks year-round, not on a recruiting calendar; demonstrated ownership beats a polished resume here.",
    pay: [
      { stage: "Early Operator", range: "$80-130K base + equity" },
      { stage: "Function Lead", range: "$120-180K + meaningful equity" },
      { stage: "Head of [Function]", range: "$160-240K + equity as the company scales" },
      { stage: "Exit", range: "Equity-dependent on the company's outcome" },
    ],
    outlook:
      "A fast track to broad operating experience and future founding; the upside rides on the startup, so the company choice matters as much as the role.",
  },
  "AI-Native SaaS": {
    summary:
      "AI-native SaaS roles are at startups whose product is fundamentally built on AI, where models are the core of the product rather than a bolt-on feature. Whether building or operating, you are shipping AI-first software fast in a market moving weekly, combining startup intensity with the hottest area of software.",
    alsoKnownAs: ["AI Startup Engineer", "GenAI Product Engineer", "AI SaaS Operator", "Applied AI (startup)"],
    majors: ["Computer Science", "Computer Engineering", "Data Science", "Business Administration", "Engineering"],
    skills: ["Python", "LLMs", "Machine Learning", "Product Management", "System Design", "Cloud Computing"],
    experience: [
      "Build and ship AI products with the model APIs, RAG, and agents; a live demo is your resume",
      "Combine fast product-building with real fluency in what current models can do",
      "Network into YC and AI-startup communities where these roles are filled",
      "Move fast and ship: AI-native startups prize velocity and applied-AI judgment over pedigree",
    ],
    timeline:
      "AI startups hire year-round through founder networks and demonstrated work; a strong applied-AI portfolio matters far more than a recruiting season.",
    pay: [
      { stage: "Entry / Early", range: "$120-180K base + equity" },
      { stage: "Engineer / Operator (mid)", range: "$160-240K + equity" },
      { stage: "Senior / Lead", range: "$220-350K + meaningful equity" },
      { stage: "Exit", range: "Equity-dependent; high variance with real upside in a win" },
    ],
    outlook:
      "The center of gravity in startups right now: AI-native companies are being founded and funded at a furious pace, creating abundant high-ownership roles.",
  },
  "Growth Stage": {
    summary:
      "Growth-stage roles are at startups past product-market fit and scaling fast (Series B and beyond), where the job is scaling systems, teams, and process without breaking what works. You get more structure and better cash than seed stage while keeping equity upside and the scrappiness of a company still in hypergrowth.",
    alsoKnownAs: ["Scale-up Engineer", "Growth-Stage Operator", "Senior Startup Engineer", "Scale-up Operator"],
    majors: ["Computer Science", "Business Administration", "Economics", "Engineering", "Information Systems"],
    skills: ["Python", "System Design", "Distributed Systems", "Product Management", "Data Analysis", "Cloud Computing"],
    experience: [
      "Target Series B+ startups in hypergrowth that are hiring aggressively across functions",
      "Build skills in scaling: systems that handle growth, or operations that scale a team",
      "Use prior internship or startup experience to land a scale-up role",
      "Learn to balance startup speed with the process a larger team now needs",
    ],
    timeline:
      "Growth-stage companies hire steadily and at volume, with more conventional recruiting than seed startups but still year-round and intro-friendly.",
    pay: [
      { stage: "Entry / New Grad", range: "$120-180K total comp + equity" },
      { stage: "Engineer / Operator (mid)", range: "$170-280K + equity" },
      { stage: "Senior / Lead", range: "$250-400K + equity" },
      { stage: "Exit / IPO", range: "Equity can be meaningful and more liquid than at seed stage" },
    ],
    outlook:
      "A strong balance of upside and stability: you get real equity and scaling experience with far lower failure risk than seed-stage bets.",
  },

  // ---- Healthcare ----
  "Medicine": {
    summary:
      "Physicians diagnose and treat patients, the clinical core of healthcare, across primary care and dozens of specialties. The path is long and structured: four years of medical school, then a residency of three to seven years before independent practice, with the reward of high autonomy, durable demand, and strong pay.",
    alsoKnownAs: ["Physician", "Doctor", "Medical Resident", "Attending Physician", "Surgeon"],
    majors: ["Biology", "Chemistry", "Neuroscience", "Public Health", "Biochemistry"],
    skills: ["Biology", "Chemistry", "Communication", "Data Analysis", "Research", "Statistics"],
    experience: [
      "Complete the pre-med prerequisites and keep a high GPA; medical school admission is GPA- and MCAT-driven",
      "Score well on the MCAT and build clinical hours: shadowing, scribing, or an EMT/CNA role",
      "Do research and volunteer clinically; both matter for a competitive application",
      "Apply broadly through AMCAS, then match into residency in your chosen specialty",
    ],
    timeline:
      "A multi-year pipeline: pre-med coursework and the MCAT in undergrad, a one-cycle medical school application, then the residency Match. There is no shortcut to the credential.",
    pay: [
      { stage: "Medical Student", range: "No salary; tuition-funded, often debt-financed" },
      { stage: "Resident", range: "$60-75K during 3-7 years of training" },
      { stage: "Attending (primary care)", range: "$220-300K" },
      { stage: "Attending (specialist/surgeon)", range: "$400K-$1M+ in high-paying specialties" },
    ],
    outlook:
      "Durable, recession-resistant demand driven by an aging population, though the training is long and the debt load real; AI is augmenting diagnostics rather than replacing clinicians.",
  },
  "Nursing": {
    summary:
      "Nurses deliver and coordinate patient care, from bedside assessment and medication to patient education and advocacy, across hospitals, clinics, and specialties. It is hands-on, high-responsibility clinical work with a faster route to practice than medicine and a clear ladder toward advanced and specialized roles.",
    alsoKnownAs: ["Registered Nurse", "RN", "Nurse Practitioner", "Clinical Nurse", "Charge Nurse"],
    majors: ["Nursing", "Biology", "Public Health", "Health Sciences", "Chemistry"],
    skills: ["Biology", "Communication", "Data Analysis", "Project Management", "Statistics", "Research"],
    experience: [
      "Earn a BSN and pass the NCLEX-RN to practice as a registered nurse",
      "Build clinical hours through rotations and a hospital internship or externship",
      "Pick a specialty (ICU, ER, oncology) and pursue the relevant certification",
      "For higher scope and pay, pursue an MSN to become a Nurse Practitioner",
    ],
    timeline:
      "A BSN plus the NCLEX is the entry credential; hospitals hire new grads year-round, and specialization or an NP track follows once you have bedside experience.",
    pay: [
      { stage: "New Grad RN", range: "$60-80K" },
      { stage: "RN (experienced)", range: "$80-110K, higher in high-cost metros" },
      { stage: "Specialized / Charge RN", range: "$100-130K" },
      { stage: "Nurse Practitioner", range: "$120-170K with prescriptive authority" },
    ],
    outlook:
      "One of the most in-demand healthcare roles with a persistent national shortage, strong job security, and an accessible path into clinical work.",
  },
  "Biotech / Pharma": {
    summary:
      "Biotech and pharma professionals research, develop, and bring drugs and therapies to market, spanning lab research, clinical trials, regulatory work, and commercialization. It blends science with industry: turning biological discovery into approved, manufacturable products under heavy regulation.",
    alsoKnownAs: ["Research Associate", "Clinical Research Associate", "Scientist", "Regulatory Affairs Associate", "Bioprocess Engineer"],
    majors: ["Biology", "Biochemistry", "Chemical Engineering", "Bioengineering", "Chemistry"],
    skills: ["Biology", "Chemistry", "Data Analysis", "Statistics", "Research", "Python"],
    experience: [
      "Do undergraduate lab research and learn core wet-lab or computational techniques",
      "Intern at a biotech, pharma, or CRO to see how regulated drug development works",
      "Pick a lane: bench research, clinical operations, or regulatory and quality",
      "An advanced degree (MS or PhD) unlocks senior scientist and research-lead roles",
    ],
    timeline:
      "Entry research and clinical-operations roles hire year-round off a BS; scientist and research-lead tracks generally expect a graduate degree, so plan the credential early.",
    pay: [
      { stage: "Research Associate / Entry", range: "$55-80K" },
      { stage: "Scientist / CRA (mid)", range: "$85-130K" },
      { stage: "Senior Scientist / Manager", range: "$130-190K" },
      { stage: "Director / Principal Scientist", range: "$200K-$350K+ with equity at biotechs" },
    ],
    outlook:
      "Strong long-term demand as biotech innovation accelerates, with AI-driven drug discovery and cell/gene therapy expanding the highest-value roles.",
  },
  "Public Health": {
    summary:
      "Public health professionals protect and improve population health through epidemiology, health policy, program management, and community intervention rather than one-on-one clinical care. The work runs from tracking disease and analyzing health data to designing and running programs at agencies, nonprofits, and global organizations.",
    alsoKnownAs: ["Epidemiologist", "Public Health Analyst", "Health Program Manager", "Biostatistician", "Community Health Specialist"],
    majors: ["Public Health", "Biology", "Statistics", "Sociology", "Health Sciences"],
    skills: ["Statistics", "Data Analysis", "Research", "Communication", "Python", "SQL"],
    experience: [
      "Build data skills: statistics, epidemiology methods, and a tool like R or Python",
      "Intern at a health department, nonprofit, or research center on a real program",
      "Pursue an MPH for analyst, epidemiologist, and program-lead roles",
      "Develop clear communication; public health lives on translating data into policy",
    ],
    timeline:
      "Entry analyst and coordinator roles hire off a BS year-round; an MPH is the common credential for epidemiologist and program-management tracks.",
    pay: [
      { stage: "Analyst / Coordinator", range: "$45-65K" },
      { stage: "Epidemiologist / Program Manager", range: "$70-100K" },
      { stage: "Senior Epidemiologist / Lead", range: "$100-135K" },
      { stage: "Director of Public Health", range: "$130-200K+ at large agencies" },
    ],
    outlook:
      "Steady public-sector and nonprofit demand with growing investment in data-driven and global health; pay trails the clinical and industry sides of healthcare.",
  },
  "Healthcare Admin": {
    summary:
      "Healthcare administrators run the business of care: operations, finance, staffing, and strategy at hospitals, clinics, and health systems. The job keeps complex, heavily regulated organizations running efficiently so clinicians can focus on patients, blending management with deep healthcare-domain knowledge.",
    alsoKnownAs: ["Healthcare Administrator", "Hospital Administrator", "Practice Manager", "Health Operations Manager", "Healthcare Consultant"],
    majors: ["Health Administration", "Business Administration", "Public Health", "Economics", "Health Sciences"],
    skills: ["Project Management", "Data Analysis", "Communication", "Excel", "Financial Modeling", "Public Speaking"],
    experience: [
      "Target a hospital or health-system administrative fellowship or rotational program",
      "Intern in healthcare operations, finance, or a practice-management role",
      "Learn the domain: reimbursement, compliance, and how health systems actually run",
      "An MHA or MBA accelerates the path into management and executive roles",
    ],
    timeline:
      "Administrative fellowships and rotational programs recruit junior-year and post-grad; many leaders pair the role with an MHA or MBA to move into management.",
    pay: [
      { stage: "Coordinator / Analyst", range: "$55-75K" },
      { stage: "Manager", range: "$80-120K" },
      { stage: "Director", range: "$120-180K" },
      { stage: "VP / Hospital Executive", range: "$200K-$500K+ at large systems" },
    ],
    outlook:
      "Stable and growing as healthcare expands and consolidates; the highest-paid track in the field outside clinical specialties, with a durable executive ceiling.",
  },

  // ---- Law ----
  "Corporate Law": {
    summary:
      "Corporate lawyers advise companies on transactions and governance: mergers and acquisitions, financings, securities, and contracts. At big firms, junior associates draft and review documents and run diligence on deals; the hours are demanding and the work is the legal engine behind the business deals other professionals originate.",
    alsoKnownAs: ["Corporate Associate", "M&A Attorney", "Securities Lawyer", "Transactional Attorney", "Corporate Counsel"],
    majors: ["Political Science", "Economics", "Business Administration", "History", "English"],
    skills: ["Communication", "Research", "Data Analysis", "Public Speaking", "Project Management", "Financial Modeling"],
    experience: [
      "Build a strong GPA and score well on the LSAT; law school admission is numbers-driven",
      "Target a top law school, then a 2L summer associate program at a corporate firm",
      "Join law review or a transactional clinic and learn deal documents cold",
      "Network into BigLaw; the 2L summer is the primary path to a full-time offer",
    ],
    timeline:
      "The pipeline is LSAT and law school applications, then on-campus interviewing for the 2L summer associate role that converts to a full-time offer after the bar exam.",
    pay: [
      { stage: "Summer Associate", range: "$215K annualized at top firms (pro-rated)" },
      { stage: "First-Year Associate", range: "$225K base + bonus on the BigLaw scale" },
      { stage: "Senior Associate", range: "$300-435K base + bonus" },
      { stage: "Partner", range: "$500K-$5M+ depending on equity and book" },
    ],
    outlook:
      "Steady demand tied to deal flow, with the BigLaw salary scale among the highest entry-level pay anywhere; AI is automating routine document review and raising the bar on higher-value work.",
  },
  "Litigation": {
    summary:
      "Litigators represent clients in disputes: they investigate facts, draft motions and briefs, take depositions, and argue in court or arbitration. Junior associates do heavy research, writing, and discovery work; the path is intellectually demanding and adversarial, building toward trying and winning cases.",
    alsoKnownAs: ["Litigation Associate", "Trial Attorney", "Litigator", "Disputes Lawyer", "Trial Lawyer"],
    majors: ["Political Science", "English", "History", "Philosophy", "Economics"],
    skills: ["Communication", "Research", "Public Speaking", "Data Analysis", "Project Management", "Statistics"],
    experience: [
      "Build a strong GPA and LSAT, then target a top law school",
      "Compete in moot court and join law review to sharpen writing and oral advocacy",
      "Do a 2L summer at a litigation firm or a judicial internship",
      "A post-graduate judicial clerkship is a powerful credential for litigators",
    ],
    timeline:
      "Same legal pipeline as corporate: LSAT, law school, 2L summer associate, and the bar. A clerkship after graduation is a common and prestigious launch into litigation.",
    pay: [
      { stage: "Summer Associate", range: "$215K annualized at top firms (pro-rated)" },
      { stage: "First-Year Associate", range: "$225K base + bonus on the BigLaw scale" },
      { stage: "Senior Associate", range: "$300-435K base + bonus" },
      { stage: "Partner", range: "$500K-$3M+ depending on equity and book" },
    ],
    outlook:
      "Resilient demand since disputes never stop; large-firm litigation pays on the BigLaw scale, while AI is reshaping discovery and legal research toward higher-value advocacy.",
  },
  "Compliance / Regulatory": {
    summary:
      "Compliance and regulatory professionals keep organizations on the right side of the law and regulators: they build policies, monitor risk, run audits, and handle filings in regulated industries like finance, healthcare, and tech. It is a stable, increasingly important function that blends legal and regulatory knowledge with operational rigor.",
    alsoKnownAs: ["Compliance Analyst", "Regulatory Affairs Specialist", "Compliance Officer", "Risk and Compliance Associate", "AML Analyst"],
    majors: ["Political Science", "Economics", "Business Administration", "Finance", "Public Health"],
    skills: ["Data Analysis", "Communication", "Research", "Excel", "Project Management", "SQL"],
    experience: [
      "Intern in a compliance, risk, or regulatory-affairs team in a regulated industry",
      "Learn the relevant rulebook (SEC/FINRA in finance, FDA in healthcare, etc.)",
      "Build attention to detail and process discipline; compliance is documentation-heavy",
      "Certifications (CAMS, CRCM) and sometimes a JD accelerate the senior track",
    ],
    timeline:
      "Analyst roles hire off a bachelor's year-round; certifications and domain knowledge, and sometimes a JD, move you into officer and lead positions.",
    pay: [
      { stage: "Compliance Analyst", range: "$60-85K" },
      { stage: "Compliance Manager", range: "$90-140K" },
      { stage: "Senior Compliance / Lead", range: "$140-200K" },
      { stage: "Chief Compliance Officer", range: "$200K-$400K+ at large firms" },
    ],
    outlook:
      "Growing steadily as regulation expands across finance, healthcare, and AI; a stable, defensible career with a clear path to a senior officer role.",
  },
  "Policy / Government": {
    summary:
      "Policy and government professionals shape and implement public policy: they research issues, draft legislation and regulation, and advise officials at agencies, legislatures, think tanks, and advocacy groups. The work connects analysis to decisions that affect large populations, trading private-sector pay for mission and impact.",
    alsoKnownAs: ["Policy Analyst", "Legislative Aide", "Government Affairs Associate", "Policy Advisor", "Regulatory Analyst"],
    majors: ["Political Science", "Economics", "Public Policy", "International Relations", "History"],
    skills: ["Research", "Communication", "Data Analysis", "Public Speaking", "Statistics", "Project Management"],
    experience: [
      "Intern on Capitol Hill, at an agency, or with a think tank or campaign",
      "Build research and writing skills plus quantitative analysis for evidence-based policy",
      "Specialize in an issue area (tech, health, energy) and follow it closely",
      "An MPP, MPA, or JD strengthens the path into senior policy and advisory roles",
    ],
    timeline:
      "Entry roles (legislative aide, junior analyst) hire off a bachelor's, often through internships and networks; graduate degrees open senior policy and advisory positions.",
    pay: [
      { stage: "Aide / Junior Analyst", range: "$40-60K, lower on Capitol Hill" },
      { stage: "Policy Analyst", range: "$65-95K" },
      { stage: "Senior Analyst / Advisor", range: "$95-140K" },
      { stage: "Director / Senior Official", range: "$140-200K+; higher in private government affairs" },
    ],
    outlook:
      "Steady demand across agencies, advocacy, and corporate government affairs; pay trails the private sector but the impact and exit options into lobbying and consulting are strong.",
  },
  "Legal (JD-track)": {
    summary:
      "The JD track is the general path through law school and the bar into a legal career, before specializing into corporate, litigation, or another practice. It covers law students, judicial clerks, and early attorneys finding their lane: a rigorous credential that opens roles across firms, companies, government, and beyond.",
    alsoKnownAs: ["Law Student", "Judicial Clerk", "Associate Attorney", "Legal Associate", "JD Candidate"],
    majors: ["Political Science", "English", "History", "Economics", "Philosophy"],
    skills: ["Research", "Communication", "Public Speaking", "Data Analysis", "Project Management", "Statistics"],
    experience: [
      "Build a strong GPA and LSAT score; law school admission is heavily numbers-driven",
      "Target the best law school you can, then explore practice areas through 1L and 2L internships",
      "Join law review, moot court, or a clinic to sharpen research and advocacy",
      "Use the 2L summer and post-grad clerkships to land your first full-time legal role",
    ],
    timeline:
      "Three years of law school after the LSAT, the 2L summer associate cycle, the bar exam, and often a clerkship; specialization into a practice area follows.",
    pay: [
      { stage: "Law Student / Clerk", range: "Clerkships ~$70-110K; summer roles pro-rate the associate scale" },
      { stage: "First-Year Associate", range: "$225K at top firms; far less in public-interest or small firms" },
      { stage: "Mid-Level Associate", range: "$260-350K at BigLaw" },
      { stage: "Partner / In-House Counsel", range: "$300K-$2M+ depending on path" },
    ],
    outlook:
      "A flexible, durable credential with wide exit options; BigLaw pays at the top while the broader legal market is more varied, and AI is reshaping routine legal work.",
  },

  // ---- Marketing & Sales ----
  "Marketing": {
    summary:
      "Marketers build demand and shape how a product is positioned and perceived: campaigns, content, digital channels, and analytics that drive awareness and conversion. The work spans creative and quantitative, from messaging and brand voice to performance marketing and the metrics behind every channel.",
    alsoKnownAs: ["Marketing Manager", "Marketing Associate", "Digital Marketer", "Content Marketer", "Marketing Coordinator"],
    majors: ["Marketing", "Business Administration", "Communications", "Economics", "Psychology"],
    skills: ["Communication", "Data Analysis", "Excel", "Public Speaking", "SQL", "Project Management"],
    experience: [
      "Intern in marketing and run a real channel: content, social, email, or paid",
      "Build analytics chops: campaign metrics, A/B testing, and a tool like Google Analytics",
      "Create a portfolio of campaigns or content you actually shipped",
      "Learn one specialty deeply (SEO, paid acquisition, lifecycle) to stand out",
    ],
    timeline:
      "Entry marketing roles and rotational programs recruit junior-summer and full-time on a normal campus calendar; smaller companies and agencies hire year-round.",
    pay: [
      { stage: "Coordinator / Associate", range: "$50-70K" },
      { stage: "Marketing Manager", range: "$80-120K" },
      { stage: "Senior Manager / Director", range: "$120-180K" },
      { stage: "VP / CMO", range: "$200K-$500K+ with equity at the top" },
    ],
    outlook:
      "Steady demand with the field shifting toward data, performance, and AI-assisted content; quantitative and growth-oriented marketers command the strongest pay.",
  },
  "Brand": {
    summary:
      "Brand managers own how a product or company is perceived: positioning, identity, messaging, and the long-term equity of the brand. Classic at consumer-goods companies, the role blends strategy, creative direction, and cross-functional ownership of a product line's marketing and, often, its P&L.",
    alsoKnownAs: ["Brand Manager", "Assistant Brand Manager", "Brand Marketing Manager", "Product Marketing Manager", "Brand Strategist"],
    majors: ["Marketing", "Business Administration", "Communications", "Economics", "Psychology"],
    skills: ["Communication", "Data Analysis", "Public Speaking", "Excel", "Project Management", "Product Management"],
    experience: [
      "Target an Assistant Brand Manager program at a major consumer-goods company",
      "Build a mix of analytical and creative skills; brand work is strategy plus storytelling",
      "Do a marketing internship and own a project end to end",
      "Learn consumer insights and how to read market and sales data",
    ],
    timeline:
      "Assistant Brand Manager programs at CPG firms recruit junior-summer and full-time on the campus calendar; an MBA is a common accelerator into senior brand roles.",
    pay: [
      { stage: "Assistant Brand Manager", range: "$70-95K + bonus" },
      { stage: "Brand Manager", range: "$110-150K + bonus" },
      { stage: "Senior Brand Manager", range: "$150-200K + bonus" },
      { stage: "Director / VP Brand", range: "$200-350K+ with equity" },
    ],
    outlook:
      "A durable, prestigious marketing track at consumer companies; the discipline is evolving toward data and digital, but brand strategy remains a sought-after leadership path.",
  },
  "Growth": {
    summary:
      "Growth professionals drive measurable user and revenue growth through experimentation: acquisition, activation, retention, and monetization, owned with rigorous data and rapid testing. It is the quantitative, engineering-adjacent edge of marketing, common at startups and tech companies where growth is a core function rather than a campaign.",
    alsoKnownAs: ["Growth Marketer", "Growth Manager", "Demand Generation Manager", "Performance Marketer", "Growth Lead"],
    majors: ["Marketing", "Business Administration", "Economics", "Statistics", "Computer Science"],
    skills: ["Data Analysis", "SQL", "Excel", "Communication", "Statistics", "Product Management"],
    experience: [
      "Run real growth experiments: paid channels, funnels, A/B tests with clear metrics",
      "Build strong analytics: SQL, experimentation, and funnel math",
      "Intern at a startup or tech company on a growth or performance-marketing team",
      "Show a track record of moving a metric, not just running campaigns",
    ],
    timeline:
      "Startups and tech companies hire growth roles year-round and prize demonstrated results; a portfolio of experiments and metrics often matters more than the recruiting season.",
    pay: [
      { stage: "Growth Associate", range: "$60-90K" },
      { stage: "Growth Manager", range: "$100-150K + equity at startups" },
      { stage: "Senior Growth / Lead", range: "$150-220K + equity" },
      { stage: "Head of Growth / VP", range: "$220-400K+ with equity" },
    ],
    outlook:
      "Hot and well-paid in tech and startups, where data-driven growth is a core function; the most quantitative, experiment-driven marketers are in high demand.",
  },
  "Sales / Business Development": {
    summary:
      "Sales and business development professionals win and grow revenue: they prospect, qualify, run the sales process, and close deals, from outbound SDRs to quota-carrying account executives. It is a performance- and relationship-driven path where comp scales directly with results and the ceiling on top closers is high.",
    alsoKnownAs: ["Account Executive", "Sales Development Rep", "Business Development Rep", "BDR", "SDR"],
    majors: ["Business Administration", "Communications", "Economics", "Marketing", "Psychology"],
    skills: ["Communication", "Public Speaking", "Data Analysis", "Project Management", "Excel", "Sales"],
    experience: [
      "Start in an SDR/BDR role to learn outbound prospecting and the sales process",
      "Build communication, resilience, and discipline; sales rewards consistent activity",
      "Learn a CRM (Salesforce) and the metrics that drive a pipeline",
      "Earn promotion to Account Executive by hitting quota and owning deals end to end",
    ],
    timeline:
      "SDR/BDR roles hire year-round and are an accessible entry point; strong performers are promoted to closing roles within one to two years rather than on a campus calendar.",
    pay: [
      { stage: "SDR / BDR", range: "OTE $55-80K (base + commission)" },
      { stage: "Account Executive", range: "OTE $100-180K, uncapped commission" },
      { stage: "Senior AE / Enterprise", range: "OTE $200-350K on large deals" },
      { stage: "Sales Leadership / VP", range: "OTE $300K-$700K+ tied to team quota" },
    ],
    outlook:
      "Always in demand and highly meritocratic; top closers earn near-uncapped comp, and tech sales in particular rewards strong performers quickly.",
  },
  "Account Management": {
    summary:
      "Account managers and customer success professionals own the relationship after the sale: they onboard customers, drive adoption and renewals, and grow accounts over time. It is relationship- and outcome-driven work that protects and expands revenue, central to the recurring-revenue model of modern software companies.",
    alsoKnownAs: ["Account Manager", "Customer Success Manager", "Client Partner", "Relationship Manager", "CSM"],
    majors: ["Business Administration", "Communications", "Marketing", "Economics", "Psychology"],
    skills: ["Communication", "Public Speaking", "Data Analysis", "Project Management", "Excel", "Sales"],
    experience: [
      "Intern or start in a customer-facing role: support, success, or sales",
      "Build relationship and problem-solving skills plus the product knowledge to advise clients",
      "Learn the metrics that matter: retention, churn, NPS, and account expansion",
      "Show you can manage a book of accounts and drive renewals and upsells",
    ],
    timeline:
      "Customer success and account-management roles hire year-round; many people enter from support, sales, or a related customer-facing role rather than a fixed campus season.",
    pay: [
      { stage: "Associate CSM / AM", range: "$55-80K" },
      { stage: "Account Manager / CSM", range: "OTE $90-140K (base + variable)" },
      { stage: "Senior / Enterprise AM", range: "OTE $140-220K on large accounts" },
      { stage: "Director of Customer Success", range: "$200-350K+ with equity" },
    ],
    outlook:
      "Growing fast with the recurring-revenue software model, where retention and expansion are core; a stable, relationship-driven path with a clear leadership ladder.",
  },
};

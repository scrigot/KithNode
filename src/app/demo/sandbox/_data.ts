// SANDBOX SEED DATA — anonymized, illustrative only.
// Used exclusively by /demo/sandbox/* routes. No backend calls. No real people.

export type Tier = "hot" | "warm" | "monitor" | "cold";

export type SandboxContact = {
  id: string;
  name: string;
  initials: string;
  title: string;
  firmName: string;
  email: string;
  education: string;
  location: string;
  warmthScore: number;
  tier: Tier;
  affiliations: string;
  source: "alumni" | "professor" | "student";
};

export type SandboxWarmPath = {
  intermediaryName: string;
  intermediaryRelation: string;
  firmName: string;
  title: string;
};

export type SandboxDiscoverCard = SandboxContact & {
  warmPaths: SandboxWarmPath[];
  mutualConnections: string[];
  signals: { label: string; detail: string }[];
};

export type SandboxPipelineEntry = {
  contactId: string;
  contactName: string;
  firmName: string;
  stage:
    | "researched"
    | "connected"
    | "email_sent"
    | "follow_up"
    | "responded"
    | "meeting_set";
  addedAt: string;
  lastTouchedAt: string;
  daysSinceTouch: number;
};

export type SandboxActivity = {
  type: "rate" | "pipeline_add" | "pipeline_move";
  contactId: string;
  contactName: string;
  firmName: string;
  detail: string;
  timestamp: string;
};

export type SandboxTopFirm = {
  firmName: string;
  count: number;
  hotCount: number;
};

export type SandboxTimeseriesPoint = { date: string; count: number };

// ─── Contacts pool ──────────────────────────────────────────────────────────

export const SANDBOX_CONTACTS: SandboxContact[] = [
  {
    id: "c-001",
    name: "Morgan Reyes",
    initials: "MR",
    title: "VP, Investment Banking",
    firmName: "Goldman Sachs",
    email: "morgan.reyes@example.com",
    education: "UNC Kenan-Flagler '15",
    location: "New York, NY",
    warmthScore: 94,
    tier: "hot",
    affiliations: "UNC, Chi Phi, IB",
    source: "alumni",
  },
  {
    id: "c-002",
    name: "Ava Shah",
    initials: "AS",
    title: "Associate, M&A",
    firmName: "Evercore",
    email: "ava.shah@example.com",
    education: "Duke '18",
    location: "New York, NY",
    warmthScore: 91,
    tier: "hot",
    affiliations: "Duke, Women in Finance",
    source: "alumni",
  },
  {
    id: "c-003",
    name: "Theo Bennett",
    initials: "TB",
    title: "MD, LevFin",
    firmName: "Morgan Stanley",
    email: "theo.bennett@example.com",
    education: "UNC Kenan-Flagler '03",
    location: "Charlotte, NC",
    warmthScore: 89,
    tier: "hot",
    affiliations: "UNC, Chi Phi, Charlotte",
    source: "alumni",
  },
  {
    id: "c-004",
    name: "Priya Kapoor",
    initials: "PK",
    title: "Principal, Buyout Coverage",
    firmName: "KKR",
    email: "priya.kapoor@example.com",
    education: "Wharton '13",
    location: "New York, NY",
    warmthScore: 87,
    tier: "hot",
    affiliations: "Wharton, PE",
    source: "alumni",
  },
  {
    id: "c-005",
    name: "Jordan Wright",
    initials: "JW",
    title: "Engagement Manager",
    firmName: "McKinsey",
    email: "jordan.wright@example.com",
    education: "UNC Kenan-Flagler '14",
    location: "Atlanta, GA",
    warmthScore: 85,
    tier: "hot",
    affiliations: "UNC, MBB, Atlanta",
    source: "alumni",
  },
  {
    id: "c-006",
    name: "Samira Okafor",
    initials: "SO",
    title: "Analyst, TMT",
    firmName: "Goldman Sachs",
    email: "samira.okafor@example.com",
    education: "UNC Kenan-Flagler '24",
    location: "New York, NY",
    warmthScore: 82,
    tier: "warm",
    affiliations: "UNC, KIBA",
    source: "alumni",
  },
  {
    id: "c-007",
    name: "Luca Romero",
    initials: "LR",
    title: "Associate, FIG",
    firmName: "Morgan Stanley",
    email: "luca.romero@example.com",
    education: "Georgetown '19",
    location: "New York, NY",
    warmthScore: 80,
    tier: "warm",
    affiliations: "Hoyas, Latino in Finance",
    source: "alumni",
  },
  {
    id: "c-008",
    name: "Hannah Pritchard",
    initials: "HP",
    title: "VP, Healthcare M&A",
    firmName: "Evercore",
    email: "hannah.pritchard@example.com",
    education: "UNC Kenan-Flagler '11",
    location: "New York, NY",
    warmthScore: 78,
    tier: "warm",
    affiliations: "UNC, Healthcare Club",
    source: "alumni",
  },
  {
    id: "c-009",
    name: "Diego Alvarez",
    initials: "DA",
    title: "Associate, Sponsors",
    firmName: "Bain Capital",
    email: "diego.alvarez@example.com",
    education: "MIT '17",
    location: "Boston, MA",
    warmthScore: 76,
    tier: "warm",
    affiliations: "MIT, Sponsors",
    source: "alumni",
  },
  {
    id: "c-010",
    name: "Nadia Greene",
    initials: "NG",
    title: "Consultant",
    firmName: "Bain",
    email: "nadia.greene@example.com",
    education: "UNC Kenan-Flagler '22",
    location: "Charlotte, NC",
    warmthScore: 75,
    tier: "warm",
    affiliations: "UNC, Charlotte, MBB",
    source: "alumni",
  },
  {
    id: "c-011",
    name: "Ezra Lin",
    initials: "EL",
    title: "Analyst, Industrials",
    firmName: "JPMorgan",
    email: "ezra.lin@example.com",
    education: "Cornell '24",
    location: "New York, NY",
    warmthScore: 72,
    tier: "warm",
    affiliations: "Cornell, Asians in Finance",
    source: "alumni",
  },
  {
    id: "c-012",
    name: "Sasha Volkov",
    initials: "SV",
    title: "Director, ECM",
    firmName: "Citi",
    email: "sasha.volkov@example.com",
    education: "Columbia '08",
    location: "New York, NY",
    warmthScore: 70,
    tier: "warm",
    affiliations: "Columbia, ECM",
    source: "alumni",
  },
  {
    id: "c-013",
    name: "Mira Castellano",
    initials: "MC",
    title: "Senior Associate, Growth",
    firmName: "TPG",
    email: "mira.castellano@example.com",
    education: "Stanford '16",
    location: "San Francisco, CA",
    warmthScore: 68,
    tier: "warm",
    affiliations: "Stanford, Growth Equity",
    source: "alumni",
  },
  {
    id: "c-014",
    name: "Caleb Whitford",
    initials: "CW",
    title: "Analyst, Coverage",
    firmName: "Wells Fargo",
    email: "caleb.whitford@example.com",
    education: "UNC Kenan-Flagler '23",
    location: "Charlotte, NC",
    warmthScore: 65,
    tier: "monitor",
    affiliations: "UNC, Charlotte",
    source: "alumni",
  },
  {
    id: "c-015",
    name: "Yara Ahmadi",
    initials: "YA",
    title: "Consultant",
    firmName: "McKinsey",
    email: "yara.ahmadi@example.com",
    education: "Penn '20",
    location: "Washington, DC",
    warmthScore: 62,
    tier: "monitor",
    affiliations: "Penn, Public Sector",
    source: "alumni",
  },
  {
    id: "c-016",
    name: "Reid Donovan",
    initials: "RD",
    title: "Associate, Real Estate",
    firmName: "Blackstone",
    email: "reid.donovan@example.com",
    education: "Notre Dame '17",
    location: "New York, NY",
    warmthScore: 60,
    tier: "monitor",
    affiliations: "Notre Dame, Real Estate",
    source: "alumni",
  },
  {
    id: "c-017",
    name: "Imani Foster",
    initials: "IF",
    title: "VP, Coverage",
    firmName: "Bank of America",
    email: "imani.foster@example.com",
    education: "Howard '10",
    location: "Charlotte, NC",
    warmthScore: 58,
    tier: "monitor",
    affiliations: "Howard, NABA",
    source: "alumni",
  },
  {
    id: "c-018",
    name: "Felix Marquez",
    initials: "FM",
    title: "Senior Consultant",
    firmName: "BCG",
    email: "felix.marquez@example.com",
    education: "UT Austin '19",
    location: "Houston, TX",
    warmthScore: 56,
    tier: "monitor",
    affiliations: "UT, Texas Network",
    source: "alumni",
  },
  {
    id: "c-019",
    name: "Olive Hartwell",
    initials: "OH",
    title: "Associate, Restructuring",
    firmName: "PJT Partners",
    email: "olive.hartwell@example.com",
    education: "Brown '18",
    location: "New York, NY",
    warmthScore: 54,
    tier: "monitor",
    affiliations: "Brown, RX",
    source: "alumni",
  },
  {
    id: "c-020",
    name: "Beau Caldwell",
    initials: "BC",
    title: "Analyst, Equity Research",
    firmName: "Morgan Stanley",
    email: "beau.caldwell@example.com",
    education: "Vanderbilt '24",
    location: "Nashville, TN",
    warmthScore: 50,
    tier: "monitor",
    affiliations: "Vanderbilt",
    source: "alumni",
  },
  {
    id: "c-021",
    name: "Ines Halvorsen",
    initials: "IH",
    title: "Consultant",
    firmName: "Bain",
    email: "ines.halvorsen@example.com",
    education: "Princeton '19",
    location: "New York, NY",
    warmthScore: 47,
    tier: "cold",
    affiliations: "Princeton",
    source: "alumni",
  },
  {
    id: "c-022",
    name: "Quinton Park",
    initials: "QP",
    title: "Analyst, Credit",
    firmName: "Apollo",
    email: "quinton.park@example.com",
    education: "Northwestern '23",
    location: "Chicago, IL",
    warmthScore: 44,
    tier: "cold",
    affiliations: "Northwestern, Credit",
    source: "alumni",
  },
  {
    id: "c-023",
    name: "Roselyn Achebe",
    initials: "RA",
    title: "Associate, Sponsors",
    firmName: "Goldman Sachs",
    email: "roselyn.achebe@example.com",
    education: "Yale '18",
    location: "New York, NY",
    warmthScore: 41,
    tier: "cold",
    affiliations: "Yale",
    source: "alumni",
  },
  {
    id: "c-024",
    name: "Tobias Rune",
    initials: "TR",
    title: "Analyst, FIG",
    firmName: "Citi",
    email: "tobias.rune@example.com",
    education: "Emory '24",
    location: "New York, NY",
    warmthScore: 38,
    tier: "cold",
    affiliations: "Emory",
    source: "alumni",
  },
  {
    id: "c-025",
    name: "Wren Kobayashi",
    initials: "WK",
    title: "Associate, Industrials",
    firmName: "Lazard",
    email: "wren.kobayashi@example.com",
    education: "Williams '17",
    location: "New York, NY",
    warmthScore: 35,
    tier: "cold",
    affiliations: "Williams",
    source: "alumni",
  },
];

// ─── Tier counts ────────────────────────────────────────────────────────────

export const SANDBOX_TIER_COUNTS: Record<Tier, number> = {
  hot: SANDBOX_CONTACTS.filter((c) => c.tier === "hot").length,
  warm: SANDBOX_CONTACTS.filter((c) => c.tier === "warm").length,
  monitor: SANDBOX_CONTACTS.filter((c) => c.tier === "monitor").length,
  cold: SANDBOX_CONTACTS.filter((c) => c.tier === "cold").length,
};

// ─── Pipeline (6 entries across stages) ─────────────────────────────────────

export const SANDBOX_PIPELINE: SandboxPipelineEntry[] = [
  {
    contactId: "c-001",
    contactName: "Morgan Reyes",
    firmName: "Goldman Sachs",
    stage: "meeting_set",
    addedAt: "2026-04-22T10:00:00Z",
    lastTouchedAt: "2026-05-12T15:30:00Z",
    daysSinceTouch: 2,
  },
  {
    contactId: "c-002",
    contactName: "Ava Shah",
    firmName: "Evercore",
    stage: "responded",
    addedAt: "2026-04-28T09:00:00Z",
    lastTouchedAt: "2026-05-13T12:00:00Z",
    daysSinceTouch: 1,
  },
  {
    contactId: "c-003",
    contactName: "Theo Bennett",
    firmName: "Morgan Stanley",
    stage: "follow_up",
    addedAt: "2026-05-01T13:00:00Z",
    lastTouchedAt: "2026-05-09T11:00:00Z",
    daysSinceTouch: 5,
  },
  {
    contactId: "c-004",
    contactName: "Priya Kapoor",
    firmName: "KKR",
    stage: "email_sent",
    addedAt: "2026-05-06T14:00:00Z",
    lastTouchedAt: "2026-05-10T16:00:00Z",
    daysSinceTouch: 4,
  },
  {
    contactId: "c-005",
    contactName: "Jordan Wright",
    firmName: "McKinsey",
    stage: "connected",
    addedAt: "2026-05-09T10:00:00Z",
    lastTouchedAt: "2026-05-11T09:00:00Z",
    daysSinceTouch: 3,
  },
  {
    contactId: "c-006",
    contactName: "Samira Okafor",
    firmName: "Goldman Sachs",
    stage: "researched",
    addedAt: "2026-05-12T18:00:00Z",
    lastTouchedAt: "2026-05-12T18:00:00Z",
    daysSinceTouch: 2,
  },
];

export const SANDBOX_PIPELINE_BY_STAGE: Record<string, number> = {
  researched: SANDBOX_PIPELINE.filter((p) => p.stage === "researched").length,
  connected: SANDBOX_PIPELINE.filter((p) => p.stage === "connected").length,
  email_sent: SANDBOX_PIPELINE.filter((p) => p.stage === "email_sent").length,
  follow_up: SANDBOX_PIPELINE.filter((p) => p.stage === "follow_up").length,
  responded: SANDBOX_PIPELINE.filter((p) => p.stage === "responded").length,
  meeting_set: SANDBOX_PIPELINE.filter((p) => p.stage === "meeting_set").length,
};

// ─── Top firms ──────────────────────────────────────────────────────────────

export const SANDBOX_TOP_FIRMS: SandboxTopFirm[] = [
  { firmName: "Goldman Sachs", count: 3, hotCount: 1 },
  { firmName: "Morgan Stanley", count: 3, hotCount: 1 },
  { firmName: "Evercore", count: 2, hotCount: 1 },
  { firmName: "McKinsey", count: 2, hotCount: 1 },
  { firmName: "Bain", count: 2, hotCount: 0 },
  { firmName: "JPMorgan", count: 1, hotCount: 0 },
  { firmName: "KKR", count: 1, hotCount: 1 },
  { firmName: "Citi", count: 2, hotCount: 0 },
];

// ─── Recent activity (7 entries) ────────────────────────────────────────────

export const SANDBOX_ACTIVITY: SandboxActivity[] = [
  {
    type: "pipeline_move",
    contactId: "c-001",
    contactName: "Morgan Reyes",
    firmName: "Goldman Sachs",
    detail: "Moved to MEETING SET",
    timestamp: "2026-05-13T19:30:00Z",
  },
  {
    type: "rate",
    contactId: "c-006",
    contactName: "Samira Okafor",
    firmName: "Goldman Sachs",
    detail: "Rated HIGH VALUE",
    timestamp: "2026-05-13T14:10:00Z",
  },
  {
    type: "pipeline_move",
    contactId: "c-002",
    contactName: "Ava Shah",
    firmName: "Evercore",
    detail: "Moved to RESPONDED",
    timestamp: "2026-05-13T11:45:00Z",
  },
  {
    type: "pipeline_add",
    contactId: "c-004",
    contactName: "Priya Kapoor",
    firmName: "KKR",
    detail: "Added to pipeline",
    timestamp: "2026-05-12T16:00:00Z",
  },
  {
    type: "rate",
    contactId: "c-005",
    contactName: "Jordan Wright",
    firmName: "McKinsey",
    detail: "Rated HIGH VALUE",
    timestamp: "2026-05-12T09:20:00Z",
  },
  {
    type: "pipeline_add",
    contactId: "c-003",
    contactName: "Theo Bennett",
    firmName: "Morgan Stanley",
    detail: "Added to pipeline",
    timestamp: "2026-05-11T13:00:00Z",
  },
  {
    type: "rate",
    contactId: "c-008",
    contactName: "Hannah Pritchard",
    firmName: "Evercore",
    detail: "Rated HIGH VALUE",
    timestamp: "2026-05-10T15:30:00Z",
  },
];

// ─── 30-day timeseries (gradually increasing warm signals) ──────────────────

export const SANDBOX_TIMESERIES: SandboxTimeseriesPoint[] = (() => {
  const out: SandboxTimeseriesPoint[] = [];
  // Generate 30 dates ending today (2026-05-14)
  const end = new Date("2026-05-14T00:00:00Z");
  let baseline = 4;
  for (let i = 29; i >= 0; i--) {
    const d = new Date(end.getTime() - i * 86400000);
    const month = d.getUTCMonth() + 1;
    const day = d.getUTCDate();
    // Gentle upward drift with small wiggle
    const wiggle = ((i * 13) % 5) - 2;
    baseline += Math.max(0, Math.round((30 - i) / 6) + (wiggle > 0 ? 1 : 0));
    out.push({
      date: `${month}/${day}`,
      count: baseline,
    });
  }
  return out;
})();

export const SANDBOX_TIMESERIES_TOTAL =
  SANDBOX_TIMESERIES[SANDBOX_TIMESERIES.length - 1]?.count ?? 0;
export const SANDBOX_TIMESERIES_DELTA =
  SANDBOX_TIMESERIES_TOTAL - (SANDBOX_TIMESERIES[0]?.count ?? 0);
export const SANDBOX_TIMESERIES_DELTA_PCT =
  SANDBOX_TIMESERIES[0]?.count
    ? (SANDBOX_TIMESERIES_DELTA / SANDBOX_TIMESERIES[0].count) * 100
    : 0;

// ─── Discover queue (10 cards with full profile detail) ─────────────────────

export const SANDBOX_DISCOVER_QUEUE: SandboxDiscoverCard[] = [
  {
    id: "d-01",
    name: "Morgan Reyes",
    initials: "MR",
    title: "VP, Investment Banking",
    firmName: "Goldman Sachs",
    email: "morgan.reyes@example.com",
    education: "UNC Kenan-Flagler '15",
    location: "New York, NY",
    warmthScore: 94,
    tier: "hot",
    affiliations: "UNC, Chi Phi, IB",
    source: "alumni",
    warmPaths: [
      {
        intermediaryName: "Sarah Chen (UNC '24)",
        intermediaryRelation: "Chi Phi alum",
        firmName: "Goldman Sachs",
        title: "VP, Investment Banking",
      },
    ],
    mutualConnections: ["Sarah Chen", "David Park", "Lena Whitley"],
    signals: [
      { label: "Chi Phi Alumni", detail: "Same UNC chapter, 2 years overlap" },
      { label: "UNC Kenan-Flagler", detail: "Same undergraduate program" },
      { label: "IB Target Group", detail: "Direct coverage of LevFin" },
    ],
  },
  {
    id: "d-02",
    name: "Ava Shah",
    initials: "AS",
    title: "Associate, M&A",
    firmName: "Evercore",
    email: "ava.shah@example.com",
    education: "Duke '18",
    location: "New York, NY",
    warmthScore: 91,
    tier: "hot",
    affiliations: "Duke, Women in Finance",
    source: "alumni",
    warmPaths: [
      {
        intermediaryName: "Hannah Pritchard (UNC '11)",
        intermediaryRelation: "Healthcare Club mentor",
        firmName: "Evercore",
        title: "VP, Healthcare M&A",
      },
    ],
    mutualConnections: ["Hannah Pritchard", "Marcus Wei"],
    signals: [
      { label: "M&A Target Group", detail: "Coverage matches your stated goal" },
      { label: "NYC Hub", detail: "Same metro as your summer plan" },
    ],
  },
  {
    id: "d-03",
    name: "Theo Bennett",
    initials: "TB",
    title: "MD, LevFin",
    firmName: "Morgan Stanley",
    email: "theo.bennett@example.com",
    education: "UNC Kenan-Flagler '03",
    location: "Charlotte, NC",
    warmthScore: 89,
    tier: "hot",
    affiliations: "UNC, Chi Phi, Charlotte",
    source: "alumni",
    warmPaths: [
      {
        intermediaryName: "Coach Mike Walsh",
        intermediaryRelation: "UNC Chi Phi house advisor",
        firmName: "Morgan Stanley",
        title: "MD, LevFin",
      },
    ],
    mutualConnections: ["Coach Mike Walsh", "Brett Holloway"],
    signals: [
      { label: "Chi Phi Alumni", detail: "Same UNC chapter, two decades apart" },
      { label: "Charlotte Hometown", detail: "Same metro" },
      { label: "LevFin Match", detail: "Group head, direct coverage" },
    ],
  },
  {
    id: "d-04",
    name: "Priya Kapoor",
    initials: "PK",
    title: "Principal, Buyout Coverage",
    firmName: "KKR",
    email: "priya.kapoor@example.com",
    education: "Wharton '13",
    location: "New York, NY",
    warmthScore: 87,
    tier: "hot",
    affiliations: "Wharton, PE",
    source: "alumni",
    warmPaths: [
      {
        intermediaryName: "Jordan Wright (UNC '14)",
        intermediaryRelation: "Engagement Manager at McKinsey",
        firmName: "KKR",
        title: "Principal, Buyout Coverage",
      },
    ],
    mutualConnections: ["Jordan Wright"],
    signals: [
      { label: "PE Lane", detail: "Buyout coverage at a mega fund" },
      { label: "NYC Hub", detail: "Same metro" },
    ],
  },
  {
    id: "d-05",
    name: "Jordan Wright",
    initials: "JW",
    title: "Engagement Manager",
    firmName: "McKinsey",
    email: "jordan.wright@example.com",
    education: "UNC Kenan-Flagler '14",
    location: "Atlanta, GA",
    warmthScore: 85,
    tier: "hot",
    affiliations: "UNC, MBB, Atlanta",
    source: "alumni",
    warmPaths: [
      {
        intermediaryName: "Prof. Linda Park",
        intermediaryRelation: "Strategy 401 professor",
        firmName: "McKinsey",
        title: "Engagement Manager",
      },
    ],
    mutualConnections: ["Prof. Linda Park", "Priya Kapoor"],
    signals: [
      { label: "UNC Kenan-Flagler", detail: "Same undergraduate program" },
      { label: "MBB Track", detail: "Top-of-funnel for consulting" },
    ],
  },
  {
    id: "d-06",
    name: "Samira Okafor",
    initials: "SO",
    title: "Analyst, TMT",
    firmName: "Goldman Sachs",
    email: "samira.okafor@example.com",
    education: "UNC Kenan-Flagler '24",
    location: "New York, NY",
    warmthScore: 82,
    tier: "warm",
    affiliations: "UNC, KIBA",
    source: "alumni",
    warmPaths: [
      {
        intermediaryName: "KIBA Slack",
        intermediaryRelation: "Active UNC IB community",
        firmName: "Goldman Sachs",
        title: "Analyst, TMT",
      },
    ],
    mutualConnections: ["KIBA Slack", "Morgan Reyes"],
    signals: [
      { label: "UNC Kenan-Flagler", detail: "Recent grad, accessible" },
      { label: "KIBA Member", detail: "Same student org you joined" },
    ],
  },
  {
    id: "d-07",
    name: "Luca Romero",
    initials: "LR",
    title: "Associate, FIG",
    firmName: "Morgan Stanley",
    email: "luca.romero@example.com",
    education: "Georgetown '19",
    location: "New York, NY",
    warmthScore: 80,
    tier: "warm",
    affiliations: "Hoyas, Latino in Finance",
    source: "alumni",
    warmPaths: [
      {
        intermediaryName: "Theo Bennett (UNC '03)",
        intermediaryRelation: "Same firm, mentor track",
        firmName: "Morgan Stanley",
        title: "Associate, FIG",
      },
    ],
    mutualConnections: ["Theo Bennett"],
    signals: [
      { label: "Same Firm Path", detail: "MS coverage, internal referral viable" },
    ],
  },
  {
    id: "d-08",
    name: "Hannah Pritchard",
    initials: "HP",
    title: "VP, Healthcare M&A",
    firmName: "Evercore",
    email: "hannah.pritchard@example.com",
    education: "UNC Kenan-Flagler '11",
    location: "New York, NY",
    warmthScore: 78,
    tier: "warm",
    affiliations: "UNC, Healthcare Club",
    source: "alumni",
    warmPaths: [
      {
        intermediaryName: "Healthcare Club listserv",
        intermediaryRelation: "UNC undergrad club",
        firmName: "Evercore",
        title: "VP, Healthcare M&A",
      },
    ],
    mutualConnections: ["Ava Shah", "Healthcare Club listserv"],
    signals: [
      { label: "UNC Kenan-Flagler", detail: "Same undergraduate program" },
      { label: "Healthcare Club", detail: "Same student org affiliation" },
    ],
  },
  {
    id: "d-09",
    name: "Diego Alvarez",
    initials: "DA",
    title: "Associate, Sponsors",
    firmName: "Bain Capital",
    email: "diego.alvarez@example.com",
    education: "MIT '17",
    location: "Boston, MA",
    warmthScore: 76,
    tier: "warm",
    affiliations: "MIT, Sponsors",
    source: "alumni",
    warmPaths: [
      {
        intermediaryName: "Nadia Greene (UNC '22)",
        intermediaryRelation: "Bain consultant",
        firmName: "Bain Capital",
        title: "Associate, Sponsors",
      },
    ],
    mutualConnections: ["Nadia Greene"],
    signals: [
      { label: "Sponsors Track", detail: "PE coverage at top firm" },
    ],
  },
  {
    id: "d-10",
    name: "Nadia Greene",
    initials: "NG",
    title: "Consultant",
    firmName: "Bain",
    email: "nadia.greene@example.com",
    education: "UNC Kenan-Flagler '22",
    location: "Charlotte, NC",
    warmthScore: 75,
    tier: "warm",
    affiliations: "UNC, Charlotte, MBB",
    source: "alumni",
    warmPaths: [
      {
        intermediaryName: "UNC Career Services",
        intermediaryRelation: "Office hours referral",
        firmName: "Bain",
        title: "Consultant",
      },
    ],
    mutualConnections: ["UNC Career Services", "Jordan Wright"],
    signals: [
      { label: "UNC Kenan-Flagler", detail: "Recent grad, accessible" },
      { label: "Charlotte Hometown", detail: "Same metro" },
    ],
  },
];

// ─── Overview snapshot (mirrors /api/dashboard/overview shape) ─────────────

export const SANDBOX_OVERVIEW = {
  ratings: { high_value: 14, total: 25 },
  stats: {
    companies: SANDBOX_TOP_FIRMS.length,
    contacts: SANDBOX_CONTACTS.length,
    scored: SANDBOX_CONTACTS.length,
  },
  avg_warmth: Math.round(
    SANDBOX_CONTACTS.reduce((s, c) => s + c.warmthScore, 0) /
      SANDBOX_CONTACTS.length,
  ),
  pipeline_total: SANDBOX_PIPELINE.length,
  response_rate: 33,
  reminders_count: 3,
  weekly_goal_done: 2,
  weekly_goal_target: 3,
  days_until_recruiting: 47,
  subscription_status: "trial",
  trial_days_left: 12,
  referral_count: 4,
  unread_count: 6,
};

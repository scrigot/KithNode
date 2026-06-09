// Canned demo data. Personas, firms, and targets are fictional.
// Used exclusively by the /demo sandbox. No backend calls.

export type PipelineRow = {
  id: string;
  initials: string;
  name: string;
  firm: "BofA" | "JPM" | "MS" | "Wells" | "Truist";
  firmLabel: string;
  role: "MD" | "Director" | "VP";
  group: string;
  yoe: number;
  lastActive: string;
  highlighted?: boolean;
};

export const persona = {
  initials: "JD",
  name: "John Doe",
  school: "UNC Kenan-Flagler",
  classYear: "'27",
  org: "Chi Phi",
  city: "Charlotte, NC",
  target: "BofA Charlotte IB Summer Analyst",
  summary: "UNC Kenan-Flagler '27 \u00b7 Chi Phi \u00b7 Targeting BofA IB",
} as const;

export const target = {
  initials: "JS",
  name: "Jane Smith",
  role: "Managing Director",
  firm: "BofA",
  firmLabel: "Bank of America",
  group: "LevFin",
  city: "Charlotte, NC",
  school: "UNC Kenan-Flagler '09",
  org: "Chi Phi Alum",
  tenure: "15 years at BofA",
  degree: "2nd degree on LinkedIn",
} as const;

export const pipeline: PipelineRow[] = [
  {
    id: "bofa-smith",
    initials: "JS",
    name: "Jane Smith",
    firm: "BofA",
    firmLabel: "Bank of America",
    role: "MD",
    group: "LevFin",
    yoe: 15,
    lastActive: "3d ago",
    highlighted: true,
  },
  {
    id: "bofa-nguyen",
    initials: "DN",
    name: "David Nguyen",
    firm: "BofA",
    firmLabel: "Bank of America",
    role: "Director",
    group: "M&A",
    yoe: 12,
    lastActive: "1w ago",
  },
  {
    id: "bofa-patel",
    initials: "AP",
    name: "Anika Patel",
    firm: "BofA",
    firmLabel: "Bank of America",
    role: "VP",
    group: "Healthcare",
    yoe: 8,
    lastActive: "2d ago",
  },
  {
    id: "bofa-chen",
    initials: "MC",
    name: "Marcus Chen",
    firm: "BofA",
    firmLabel: "Bank of America",
    role: "MD",
    group: "TMT",
    yoe: 18,
    lastActive: "5d ago",
  },
  {
    id: "jpm-rivera",
    initials: "ER",
    name: "Elena Rivera",
    firm: "JPM",
    firmLabel: "JPMorgan",
    role: "MD",
    group: "LevFin",
    yoe: 16,
    lastActive: "1d ago",
  },
  {
    id: "jpm-okafor",
    initials: "TO",
    name: "Tunde Okafor",
    firm: "JPM",
    firmLabel: "JPMorgan",
    role: "VP",
    group: "Industrials",
    yoe: 9,
    lastActive: "4d ago",
  },
  {
    id: "ms-fairfax",
    initials: "KF",
    name: "Katherine Fairfax",
    firm: "MS",
    firmLabel: "Morgan Stanley",
    role: "MD",
    group: "Financial Sponsors",
    yoe: 19,
    lastActive: "2w ago",
  },
  {
    id: "ms-blake",
    initials: "RB",
    name: "Robert Blake",
    firm: "MS",
    firmLabel: "Morgan Stanley",
    role: "Director",
    group: "ECM",
    yoe: 13,
    lastActive: "6d ago",
  },
  {
    id: "wells-jensen",
    initials: "PJ",
    name: "Priya Jensen",
    firm: "Wells",
    firmLabel: "Wells Fargo",
    role: "MD",
    group: "Corporate Banking",
    yoe: 17,
    lastActive: "3d ago",
  },
  {
    id: "wells-hart",
    initials: "CH",
    name: "Carter Hart",
    firm: "Wells",
    firmLabel: "Wells Fargo",
    role: "VP",
    group: "Real Estate",
    yoe: 7,
    lastActive: "1w ago",
  },
  {
    id: "truist-diaz",
    initials: "MD",
    name: "Miguel Diaz",
    firm: "Truist",
    firmLabel: "Truist",
    role: "Director",
    group: "Sponsor Coverage",
    yoe: 11,
    lastActive: "2d ago",
  },
  {
    id: "truist-kwon",
    initials: "JK",
    name: "Ji-Ae Kwon",
    firm: "Truist",
    firmLabel: "Truist",
    role: "VP",
    group: "Consumer Retail",
    yoe: 8,
    lastActive: "5d ago",
  },
];

export type Signal = {
  id: number;
  label: string;
  detail: string;
};

export const signals: Signal[] = [
  {
    id: 1,
    label: "Chi Phi Alumni",
    detail: "Shared fraternity bond, both UNC chapter",
  },
  {
    id: 2,
    label: "UNC Kenan-Flagler",
    detail: "Shared alma mater, same undergraduate program",
  },
  {
    id: 3,
    label: "Charlotte, NC",
    detail: "Same hometown, same metro area",
  },
  {
    id: 4,
    label: "BofA LevFin",
    detail: "Target group match, direct coverage area",
  },
  {
    id: 5,
    label: "2nd degree on LinkedIn",
    detail: "One warm intro hop via Chi Phi alumni network",
  },
];

export type ScoreBar = {
  label: string;
  value: number;
  display: string;
  detail: string;
};

export const scoring: ScoreBar[] = [
  {
    label: "Response Likelihood",
    value: 87,
    display: "87%",
    detail: "Active on LinkedIn, posted 3 days ago",
  },
  {
    label: "Role Fit",
    value: 91,
    display: "91%",
    detail: "LevFin matches John's target group",
  },
  {
    label: "Network Distance",
    value: 88,
    display: "2 hops",
    detail: "Reachable via Chi Phi alumni network",
  },
  {
    label: "Timing",
    value: 95,
    display: "95%",
    detail: "Summer Analyst applications open in 4 weeks",
  },
  {
    label: "Career Overlap",
    value: 88,
    display: "88%",
    detail: "Kenan-Flagler to BofA IBD, a well-worn path",
  },
];

export const overallScore = 92;

// Outreach body. Use commas, periods, parentheses. No em dashes, no slop.
export const outreachSubject =
  "Chi Phi alum, Kenan-Flagler '27, drawn to BofA LevFin";

export const outreachBody =
  "Hi Jane, fellow Chi Phi and Kenan-Flagler here (Class of '27). I've been following BofA's Charlotte LevFin team and would love to hear how you built your path from UNC into the group. Could I grab 20 minutes of your time in the next two weeks? I'm flexible around your calendar and happy to come to uptown. Best, John";

export const stepNav = [
  { id: "discover-panel", label: "Discover", step: "01" },
  { id: "signal-panel", label: "Signal Detection", step: "02" },
  { id: "scoring-panel", label: "AI Scoring", step: "03" },
  { id: "outreach-panel", label: "Smart Outreach", step: "04" },
] as const;

export const firmFilters = [
  { id: "all", label: "All", count: 12 },
  { id: "BofA", label: "BofA", count: 4 },
  { id: "JPM", label: "JPM", count: 2 },
  { id: "MS", label: "MS", count: 2 },
  { id: "Wells", label: "Wells", count: 2 },
  { id: "Truist", label: "Truist", count: 2 },
] as const;

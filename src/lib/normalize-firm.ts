const SUFFIXES =
  /\b(inc\.?|llc|lp|llp|corp\.?|corporation|co\.?|group|holdings|partners|capital|management|advisors|advisory|securities|and co\.?|and company|international|na|n\.a\.|plc|ltd\.?|limited)\b/gi;

const ALIAS_MAP: Record<string, string> = {
  gs: "goldman sachs",
  jpm: "jpmorgan chase",
  jpmc: "jpmorgan chase",
  "jp morgan": "jpmorgan chase",
  ms: "morgan stanley",
  bofa: "bank of america",
  baml: "bank of america",
  boa: "bank of america",
  merrill: "bank of america",
  "merrill lynch": "bank of america",
  citi: "citigroup",
  citibank: "citigroup",
  "ubs ag": "ubs",
  db: "deutsche bank",
  cs: "credit suisse",
  barc: "barclays",
  "barclays capital": "barclays",
  rbc: "royal bank of canada",
  "rbc capital markets": "royal bank of canada",
  mckinsey: "mckinsey",
  "mckinsey and company": "mckinsey",
  bcg: "boston consulting group",
  "boston consulting": "boston consulting group",
  bain: "bain",
  "bain and company": "bain",
  "deloitte consulting": "deloitte",
  ey: "ey",
  "ernst young": "ey",
  "ernst & young": "ey",
  pwc: "pwc",
  pricewaterhousecoopers: "pwc",
  kpmg: "kpmg",
  lazard: "lazard",
  "lazard freres": "lazard",
  evercore: "evercore",
  "evercore isi": "evercore",
  centerview: "centerview",
  "centerview partners": "centerview",
  moelis: "moelis",
  "moelis and company": "moelis",
  pjt: "pjt partners",
  "pjt partners": "pjt partners",
  guggenheim: "guggenheim",
  "guggenheim securities": "guggenheim",
  jefferies: "jefferies",
  "jefferies group": "jefferies",
  hl: "houlihan lokey",
  "houlihan lokey": "houlihan lokey",
  kkr: "kkr",
  "kohlberg kravis": "kkr",
  blackstone: "blackstone",
  "blackstone group": "blackstone",
  carlyle: "carlyle",
  "carlyle group": "carlyle",
  apollo: "apollo",
  "apollo global": "apollo",
  tpg: "tpg",
  "tpg capital": "tpg",
  warburg: "warburg pincus",
  "warburg pincus": "warburg pincus",
  "hellman friedman": "hellman & friedman",
  "h&f": "hellman & friedman",
  "thoma bravo": "thoma bravo",
  "vista equity": "vista equity",
  "vista equity partners": "vista equity",
  "silver lake": "silver lake",
  "silver lake partners": "silver lake",
};

export function normalizeFirmName(name: string): string {
  if (!name) return "";

  let normalized = name
    .replace(/[.,]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(SUFFIXES, "")
    .replace(/\s+/g, " ")
    .trim();

  // Try alias with "and", then with "&" restored
  const withAmpersand = normalized.replace(/\band\b/g, "&");

  return (
    ALIAS_MAP[normalized] ?? ALIAS_MAP[withAmpersand] ?? normalized
  );
}

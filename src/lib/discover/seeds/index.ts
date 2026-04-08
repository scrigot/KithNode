// Curated firm seed lists keyed by industry.
//
// Each seed is { name, domain, website }. Names are derived from the
// firm tier regex arrays in src/lib/linkedin-import.ts (so the affiliation
// detector and the seed list stay in sync). Domains are hand-picked
// canonical corporate sites — verified via DNS at the time of writing,
// best-effort for the legacy entities. The website field is just
// `https://${domain}` and is exposed pre-built so callers don't have to
// concatenate.
//
// The pipeline starts here and only falls back to DDG search when the
// seeds are exhausted (matches the Python bot's approach in
// company_finder.py: curated seed + augmentation).

export type IndustryKey =
  | "Investment Banking"
  | "Private Equity"
  | "Hedge Fund"
  | "Consulting"
  | "Big 4";

export interface FirmSeed {
  name: string;
  domain: string;
  website: string;
}

function s(name: string, domain: string): FirmSeed {
  return { name, domain, website: `https://${domain}` };
}

const BULGE_BRACKET: readonly FirmSeed[] = [
  s("Goldman Sachs", "goldmansachs.com"),
  s("JPMorgan", "jpmorganchase.com"),
  s("Morgan Stanley", "morganstanley.com"),
  s("Bank of America", "bankofamerica.com"),
  s("Citi", "citi.com"),
  s("Barclays", "barclays.com"),
  s("Deutsche Bank", "db.com"),
  s("UBS", "ubs.com"),
  s("HSBC", "hsbc.com"),
  s("Wells Fargo", "wellsfargo.com"),
];

const ELITE_BOUTIQUE: readonly FirmSeed[] = [
  s("Evercore", "evercore.com"),
  s("Lazard", "lazard.com"),
  s("Centerview Partners", "centerviewpartners.com"),
  s("Moelis", "moelis.com"),
  s("Perella Weinberg", "pwpartners.com"),
  s("PJT Partners", "pjtpartners.com"),
  s("Guggenheim Partners", "guggenheimpartners.com"),
  s("Greenhill", "greenhill.com"),
  s("Rothschild & Co", "rothschildandco.com"),
  s("Qatalyst", "qatalyst.com"),
  s("Houlihan Lokey", "hl.com"),
  s("Jefferies", "jefferies.com"),
  s("Raymond James", "raymondjames.com"),
  s("William Blair", "williamblair.com"),
  s("Piper Sandler", "pipersandler.com"),
  s("Robert W. Baird", "rwbaird.com"),
];

const MEGA_PE: readonly FirmSeed[] = [
  s("Blackstone", "blackstone.com"),
  s("KKR", "kkr.com"),
  s("Carlyle", "carlyle.com"),
  s("Apollo Global Management", "apollo.com"),
  s("Warburg Pincus", "warburgpincus.com"),
  s("TPG", "tpg.com"),
  s("Thoma Bravo", "thomabravo.com"),
  s("Vista Equity Partners", "vistaequitypartners.com"),
  s("Silver Lake", "silverlake.com"),
  s("Bain Capital", "baincapital.com"),
  s("General Atlantic", "generalatlantic.com"),
  s("Advent International", "adventinternational.com"),
  s("Hellman & Friedman", "hf.com"),
  s("Leonard Green & Partners", "leonardgreen.com"),
  s("Ares Management", "aresmgmt.com"),
  s("Providence Equity", "provequity.com"),
  s("Welsh Carson", "welshcarson.com"),
];

const HEDGE_FUNDS: readonly FirmSeed[] = [
  s("Citadel", "citadel.com"),
  s("Point72", "point72.com"),
  s("Two Sigma", "twosigma.com"),
  s("Bridgewater Associates", "bridgewater.com"),
  s("Millennium Management", "mlp.com"),
  s("D. E. Shaw", "deshaw.com"),
  s("Jane Street", "janestreet.com"),
  s("Hudson River Trading", "hudsonrivertrading.com"),
  s("Jump Trading", "jumptrading.com"),
  s("Tower Research", "tower-research.com"),
  s("Renaissance Technologies", "rentec.com"),
  s("Man Group", "man.com"),
  s("AQR Capital", "aqr.com"),
  s("Elliott Management", "elliottmgmt.com"),
  s("Baupost Group", "baupost.com"),
];

const MBB: readonly FirmSeed[] = [
  s("McKinsey & Company", "mckinsey.com"),
  s("Boston Consulting Group", "bcg.com"),
  s("Bain & Company", "bain.com"),
];

const BIG4: readonly FirmSeed[] = [
  s("Deloitte", "deloitte.com"),
  s("Accenture", "accenture.com"),
  s("PwC", "pwc.com"),
  s("EY", "ey.com"),
  s("KPMG", "kpmg.com"),
];

/**
 * Public seed map. Used by the entity-finder (Stage 2) and the
 * contact-finder (Stage 3) to enumerate target companies for a given
 * industry vertical before falling back to DDG search.
 */
export const FIRM_SEEDS: Record<IndustryKey, readonly FirmSeed[]> = {
  "Investment Banking": [...BULGE_BRACKET, ...ELITE_BOUTIQUE],
  "Private Equity": [...MEGA_PE],
  "Hedge Fund": [...HEDGE_FUNDS],
  "Consulting": [...MBB],
  "Big 4": [...BIG4],
};

/**
 * Resolve a user's targetIndustries[] to a deduped list of FirmSeed
 * objects. Dedup key is the canonical domain so the same firm doesn't
 * get walked twice when a user picks overlapping industries.
 */
export function seedsForIndustries(industries: readonly string[]): FirmSeed[] {
  const seen = new Set<string>();
  const out: FirmSeed[] = [];
  for (const industry of industries) {
    const key = industry.trim() as IndustryKey;
    const seeds = FIRM_SEEDS[key];
    if (!seeds) continue;
    for (const seed of seeds) {
      if (seen.has(seed.domain)) continue;
      seen.add(seed.domain);
      out.push(seed);
    }
  }
  return out;
}

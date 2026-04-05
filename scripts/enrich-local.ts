/**
 * Run locally to enrich CSV-imported contacts via LinkedIn meta tags.
 * Vercel servers get blocked by LinkedIn, but your local IP works.
 *
 * Usage: npx tsx scripts/enrich-local.ts
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://jyjpitagxtdzedtooedw.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5anBpdGFneHRkemVkdG9vZWR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNDUyMDEsImV4cCI6MjA5MDgyMTIwMX0.nTUbvwcRnER0aGL0UPjgHw51SRAu0dxqQKcZvN68px4";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const UNC_PATTERNS = [/unc/i, /chapel\s*hill/i, /university of north carolina/i];
const KENAN_FLAGLER = [/kenan[\s-]?flagler/i];
const CHI_PHI = [/chi\s*phi/i];
const NC_LOCATIONS = [/raleigh/i, /durham/i, /chapel hill/i, /charlotte/i, /greensboro/i, /winston[\s-]?salem/i];
const TOP_FIRMS = [
  /goldman\s*sachs/i, /jpmorgan/i, /morgan\s*stanley/i, /bank of america/i,
  /evercore/i, /lazard/i, /centerview/i, /moelis/i, /perella/i, /pjt/i,
  /blackstone/i, /kkr/i, /carlyle/i, /apollo/i, /warburg/i, /tpg/i,
  /citadel/i, /point72/i, /two sigma/i, /bridgewater/i,
];
const CONSULTING = [/mckinsey/i, /bcg|boston\s*consulting/i, /bain/i, /deloitte/i, /accenture/i];

async function scrapeLinkedInMeta(url: string) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      redirect: "follow",
    });
    if (!res.ok) return null;
    const html = await res.text();
    if (html.includes("authwall")) return null;

    const metaMatch = html.match(/<meta\s+(?:name="description"\s+content="([^"]*?)"|content="([^"]*?)"\s+name="description")/i);
    const description = metaMatch?.[1] || metaMatch?.[2] || "";

    const ogTitleMatch = html.match(/<meta\s+(?:property="og:title"\s+content="([^"]*?)"|content="([^"]*?)"\s+property="og:title")/i);
    const ogTitle = ogTitleMatch?.[1] || ogTitleMatch?.[2] || "";

    const eduMatch = description.match(/education:\s*([^·]+)/i);
    const locMatch = description.match(/location:\s*([^·]+)/i);
    const expMatch = description.match(/experience:\s*([^·]+)/i);

    let title = "";
    if (ogTitle.includes(" - ")) {
      title = ogTitle.split(" - ").slice(1).join(" - ").split(" | ")[0]?.trim() || "";
    }

    return {
      education: eduMatch ? eduMatch[1].trim() : "",
      location: locMatch ? locMatch[1].trim() : "",
      experience: expMatch ? expMatch[1].trim() : "",
      title,
    };
  } catch {
    return null;
  }
}

function detectAffiliations(meta: { education: string; location: string; experience: string; title: string }) {
  const allText = [meta.education, meta.location, meta.experience, meta.title].join(" ");
  const companyText = (meta.experience || meta.title || "").toLowerCase();
  const affiliations: { name: string; boost: number }[] = [];

  const isCurrentStudent = UNC_PATTERNS.some(p => p.test(companyText)) || /\buniversity\b/i.test(companyText) || /\bstudent\b/i.test(companyText);

  const uncInEdu = UNC_PATTERNS.some(p => p.test(meta.education));
  const kfInEdu = KENAN_FLAGLER.some(p => p.test(meta.education));
  const uncInCompany = UNC_PATTERNS.some(p => p.test(companyText));

  if (kfInEdu && !uncInCompany) affiliations.push({ name: "Kenan-Flagler Alumni", boost: 25 });
  else if (uncInEdu && !uncInCompany) affiliations.push({ name: "UNC Alumni", boost: 20 });
  else if (uncInCompany || isCurrentStudent) affiliations.push({ name: "UNC Student", boost: 5 });
  else if (UNC_PATTERNS.some(p => p.test(allText))) affiliations.push({ name: "UNC Connected", boost: 10 });

  if (CHI_PHI.some(p => p.test(allText))) affiliations.push({ name: "Chi Phi", boost: 15 });
  if (NC_LOCATIONS.some(p => p.test(meta.location || allText))) affiliations.push({ name: "NC Local", boost: 10 });
  if (!isCurrentStudent && TOP_FIRMS.some(p => p.test(companyText))) affiliations.push({ name: "Top Firm", boost: 15 });
  if (!isCurrentStudent && CONSULTING.some(p => p.test(companyText))) affiliations.push({ name: "Consulting", boost: 12 });

  return affiliations;
}

async function main() {
  console.log("Fetching contacts to enrich...");

  const { data: contacts, error } = await supabase
    .from("AlumniContact")
    .select("*")
    .eq("source", "linkedin_csv")
    .eq("education", "")
    .neq("linkedInUrl", "")
    .limit(200);

  if (error) { console.error("DB error:", error.message); return; }
  if (!contacts?.length) { console.log("No contacts to enrich."); return; }

  console.log(`Found ${contacts.length} contacts to enrich.\n`);

  let enriched = 0, skipped = 0;

  for (let i = 0; i < contacts.length; i++) {
    const c = contacts[i];
    process.stdout.write(`[${i + 1}/${contacts.length}] ${c.name}... `);

    const meta = await scrapeLinkedInMeta(c.linkedInUrl);
    if (!meta || (!meta.education && !meta.location && !meta.title)) {
      console.log("SKIP (no data)");
      skipped++;
      await new Promise(r => setTimeout(r, 300));
      continue;
    }

    const affiliations = detectAffiliations(meta);
    const totalBoost = affiliations.reduce((s, a) => s + a.boost, 0);
    const score = Math.min(100, 30 + totalBoost);
    const tier = score > 80 ? "hot" : score > 60 ? "warm" : score > 40 ? "monitor" : "cold";

    const updates: Record<string, string | number> = {
      warmthScore: score,
      tier,
      affiliations: affiliations.map(a => a.name).join(","),
    };
    if (meta.education) updates.education = meta.education;
    if (meta.location) updates.location = meta.location;
    if (meta.title) updates.title = meta.title;

    const { error: updateError } = await supabase
      .from("AlumniContact")
      .update(updates)
      .eq("id", c.id);

    if (updateError) {
      console.log(`ERROR: ${updateError.message}`);
      skipped++;
    } else {
      console.log(`${score} (${tier}) [${affiliations.map(a => a.name).join(", ")}]`);
      enriched++;
    }

    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\nDone! Enriched: ${enriched}, Skipped: ${skipped}`);
}

main();

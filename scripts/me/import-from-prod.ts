/**
 * One-way, READ-ONLY import of an owner's enriched KithNode network from PROD
 * into the local /me workspace (MeContact in the local kithnode_me DB).
 *
 *   Dry run (default):  npm run me:import-prod
 *   Commit:             npm run me:import-prod -- --commit
 *
 * Safety:
 *  - PROD is only ever READ (`.select(...)`). The script never writes to prod.
 *  - It asserts the prod URL is NOT localhost and the local URL IS localhost,
 *    and aborts otherwise.
 *  - Dedupe is on the NORMALIZED LinkedIn URL (prod stores mixed www/non-www/
 *    trailing-slash forms), else name. Re-runs upsert, never duplicate.
 *  - No paid enrichment: it copies the enrichment the owner already has.
 */
import { config as dotenvConfig } from "dotenv";
dotenvConfig({ path: ".env.local" });
dotenvConfig({ path: ".env" });

import { createClient } from "@supabase/supabase-js";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client.js";
import { normalizeLinkedInUrl } from "../../src/lib/me/linkedin-csv";

const COMMIT = process.argv.includes("--commit");
const ME_EMAIL = process.env.ME_USER_EMAIL || "samrigot@kithnode.ai";
const PROD_OWNER_EMAIL = process.env.PROD_OWNER_EMAIL || ME_EMAIL;
const LOCAL_DB =
  process.env.LOCAL_DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:54322/kithnode_me";

const PROD_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SERVICE_ROLE =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "";

function abort(msg: string): never {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

// ── Safety gates ─────────────────────────────────────────────────────────────
const isLocal = (u: string) => /127\.0\.0\.1|localhost|::1/.test(u);
if (!PROD_URL || !SERVICE_ROLE) abort("Prod Supabase URL / service-role key missing from .env.local");
if (isLocal(PROD_URL)) abort(`Refusing to run: prod URL looks local (${PROD_URL}).`);
if (!isLocal(LOCAL_DB)) abort(`Refusing to run: local DB URL is not localhost (${LOCAL_DB}).`);

const prod = createClient(PROD_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const local = new PrismaClient({ adapter: new PrismaPg({ connectionString: LOCAL_DB }) });

const COLS =
  "id, name, firmName, title, linkedInUrl, email, location, education, industry, seniorityLevel, pastFirms, notes, lastSpokenAt";

interface ProdRow {
  id: string;
  name: string;
  firmName: string | null;
  title: string | null;
  linkedInUrl: string | null;
  email: string | null;
  location: string | null;
  education: string | null;
  industry: string | null;
  seniorityLevel: string | null;
  pastFirms: string | null;
  notes: string | null;
  lastSpokenAt: string | null;
}

const enrichedFields = (r: ProdRow) =>
  [r.education, r.location, r.industry, r.seniorityLevel, r.pastFirms].filter((v) => v && v.trim()).length;

async function fetchOwned(userId: string): Promise<ProdRow[]> {
  const out: ProdRow[] = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const { data, error } = await prod
      .from("AlumniContact")
      .select(COLS)
      .eq("importedByUserId", userId)
      .range(from, from + page - 1);
    if (error) abort(`prod read (owned) failed: ${error.message}`);
    out.push(...((data as ProdRow[]) || []));
    if (!data || data.length < page) break;
  }
  return out;
}

async function fetchPoolLinked(userId: string): Promise<ProdRow[]> {
  const { data: links, error } = await prod
    .from("UserDiscover")
    .select("contactId, rating")
    .eq("userId", userId);
  if (error) abort(`prod read (UserDiscover) failed: ${error.message}`);
  const ids = [...new Set((links || []).map((l: { contactId: string }) => l.contactId))];
  const out: ProdRow[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    const batch = ids.slice(i, i + 200);
    const { data, error: e2 } = await prod.from("AlumniContact").select(COLS).in("id", batch);
    if (e2) abort(`prod read (pool rows) failed: ${e2.message}`);
    out.push(...((data as ProdRow[]) || []));
  }
  return out;
}

async function main() {
  console.log(`\n=== /me prod import ${COMMIT ? "(COMMIT)" : "(DRY RUN)"} ===`);
  console.log(`owner: ${PROD_OWNER_EMAIL}  →  local /me user: ${ME_EMAIL}`);

  // Resolve prod User.id
  const { data: user, error: uErr } = await prod
    .from("User")
    .select("id")
    .eq("email", PROD_OWNER_EMAIL)
    .single();
  if (uErr || !user) abort(`Prod user not found for ${PROD_OWNER_EMAIL}: ${uErr?.message}`);
  const userId = (user as { id: string }).id;
  console.log(`resolved prod userId: ${userId}`);

  // Seed Sam's own profile (for warm-signal ranking) from prod User prefs.
  const { data: prefs } = await prod
    .from("User")
    .select("university, educations, clubs, clubMemberships, hometown, pastFirms, targetLocations")
    .eq("id", userId)
    .single();
  if (prefs) {
    const p = prefs as Record<string, string | null>;
    const profileData = {
      userId: ME_EMAIL,
      schools: [p.university, p.educations].filter(Boolean).join(" "),
      clubs: [p.clubs, p.clubMemberships].filter(Boolean).join(" "),
      pastFirms: p.pastFirms || "",
      hometown: p.hometown || "",
      location: p.targetLocations || p.hometown || "",
    };
    console.log(`profile → schools="${profileData.schools.slice(0, 40)}" hometown="${profileData.hometown}"`);
    if (COMMIT) {
      await local.meProfile.upsert({ where: { userId: ME_EMAIL }, create: profileData, update: profileData });
      console.log("✓ MeProfile seeded");
    }
  }
  if (process.argv.includes("--profile-only")) {
    await local.$disconnect();
    return;
  }

  const [owned, pooled] = await Promise.all([fetchOwned(userId), fetchPoolLinked(userId)]);
  // Combine, dedupe by prod row id, then by normalized URL.
  const byId = new Map<string, ProdRow>();
  [...owned, ...pooled].forEach((r) => byId.set(r.id, r));
  const seenKey = new Set<string>();
  const rows: ProdRow[] = [];
  for (const r of byId.values()) {
    const key = normalizeLinkedInUrl(r.linkedInUrl || "") || `nf:${(r.name || "").toLowerCase()}`;
    if (seenKey.has(key)) continue;
    seenKey.add(key);
    rows.push(r);
  }
  const enriched = rows.filter((r) => enrichedFields(r) > 0).length;
  console.log(
    `prod: ${owned.length} owned + ${pooled.length} pool-linked → ${rows.length} unique (${enriched} enriched)`,
  );

  // Prefetch existing local rows to bucket new vs. update.
  const existing = await local.meContact.findMany({
    where: { userId: ME_EMAIL },
    select: { linkedInUrl: true, name: true },
  });
  const haveUrl = new Set(existing.map((e) => e.linkedInUrl).filter(Boolean) as string[]);
  const haveName = new Set(existing.map((e) => e.name.toLowerCase()));

  let willInsert = 0;
  let willUpdate = 0;
  const sample: string[] = [];
  for (const r of rows) {
    const url = normalizeLinkedInUrl(r.linkedInUrl || "");
    const exists = url ? haveUrl.has(url) : haveName.has((r.name || "").toLowerCase());
    if (exists) willUpdate++;
    else {
      willInsert++;
      if (sample.length < 8) sample.push(`${r.name} — ${r.title || "?"} @ ${r.firmName || "?"}`);
    }
  }
  console.log(`local plan: ${willInsert} new, ${willUpdate} update`);
  console.log(`sample new:\n  ${sample.join("\n  ")}`);

  if (!COMMIT) {
    console.log(`\nDRY RUN — nothing written. Re-run with --commit to apply.`);
    await local.$disconnect();
    return;
  }

  // Upsert into local MeContact.
  let done = 0;
  let failed = 0;
  for (const r of rows) {
    const url = normalizeLinkedInUrl(r.linkedInUrl || "");
    const data = {
      userId: ME_EMAIL,
      name: r.name,
      firmName: r.firmName || null,
      title: r.title || null,
      email: r.email || null,
      location: r.location || null,
      education: r.education || null,
      industry: r.industry || null,
      seniorityLevel: r.seniorityLevel || null,
      pastFirms: r.pastFirms || null,
      notes: r.notes || "",
      source: "prod_import",
      alumniContactId: r.id,
      lastSpokenAt: r.lastSpokenAt ? new Date(r.lastSpokenAt) : null,
    };
    try {
      if (url) {
        await local.meContact.upsert({
          where: { userId_linkedInUrl: { userId: ME_EMAIL, linkedInUrl: url } },
          create: { ...data, linkedInUrl: url },
          update: data,
        });
      } else {
        const ex = await local.meContact.findFirst({
          where: { userId: ME_EMAIL, name: r.name, linkedInUrl: null },
        });
        if (ex) await local.meContact.update({ where: { id: ex.id }, data });
        else await local.meContact.create({ data: { ...data, linkedInUrl: null } });
      }
      done++;
    } catch (e) {
      failed++;
      if (failed <= 10) console.error(`  ✗ ${r.name}: ${(e as Error).message}`);
    }
  }
  const total = await local.meContact.count({ where: { userId: ME_EMAIL } });
  console.log(`\n✓ committed: ${done} upserted, ${failed} failed. Local /me now has ${total} contacts.`);
  await local.$disconnect();
}

main().catch((e) => abort(e.message));

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getUserPrefs } from "@/lib/user-prefs";
import {
  scrapeLinkedInMeta,
  detectAffiliations,
  computeWarmthScore,
  isValidLinkedInUrl,
} from "@/lib/linkedin-import";

interface CsvContact {
  name: string;
  title: string;
  firmName: string;
  email: string;
  education: string;
  location: string;
  linkedInUrl?: string;
}

interface PoolRow {
  id: string;
  name: string;
  title: string;
  firmName: string;
  affiliations: string;
  warmthScore: number;
  tier: string;
}

// Columns safe to surface for a pooled (foreign-owned) contact — never the
// owner's private relationship fields. Mirrors POOL_SAFE_FIELDS in lib/redact.
const POOL_COLS = "id, name, title, firmName, affiliations, warmthScore, tier";

// Find a shared-pool row by URL (then email) WITHOUT owner-scoping. Used ONLY to
// grant the caller a read-link to an already-enriched row — never to mutate it,
// so the cross-tenant takeover stays closed.
async function findPoolRow(linkedInUrl: string, email: string): Promise<PoolRow | null> {
  if (linkedInUrl) {
    const { data } = await supabase
      .from("AlumniContact")
      .select(POOL_COLS)
      .eq("linkedInUrl", linkedInUrl)
      .single();
    if (data) return data as PoolRow;
  }
  if (email) {
    const { data } = await supabase
      .from("AlumniContact")
      .select(POOL_COLS)
      .eq("email", email)
      .single();
    if (data) return data as PoolRow;
  }
  return null;
}

// Grant the caller read access to an existing pool row via a high_value Discover
// link (idempotent; mirrors discover/rate). It then appears, unlocked, in their
// contacts list — reusing the existing enrichment instead of re-scraping.
async function linkToPool(userId: string, contactId: string): Promise<void> {
  await supabase
    .from("UserDiscover")
    .upsert(
      { userId, contactId, rating: "high_value" },
      { onConflict: "userId,contactId" },
    );
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.email;

  const prefs = await getUserPrefs(userId);
  const body = await request.json();

  const hasUrls = body.urls && Array.isArray(body.urls) && body.urls.length > 0;
  const hasContacts = body.contacts && Array.isArray(body.contacts) && body.contacts.length > 0;

  if (!hasUrls && !hasContacts) {
    return NextResponse.json(
      { error: "urls array or contacts array is required" },
      { status: 400 },
    );
  }

  const results: {
    id?: string;
    name: string;
    title: string;
    linkedin_url: string;
    company_name: string;
    affiliations: string[];
    total_score: number;
    tier: string;
    error?: string;
  }[] = [];

  let imported = 0;
  let failed = 0;
  let linked = 0;

  // ── CSV contacts (direct upsert, no scraping) ────────────────────────
  if (hasContacts) {
    for (const contact of body.contacts as CsvContact[]) {
      try {
        const meta = {
          name: contact.name || "",
          education: contact.education || "",
          location: contact.location || "",
          experience: contact.firmName || "",
          title: contact.title || "",
        };

        const affiliations = detectAffiliations(meta, prefs);
        const { score, tier } = computeWarmthScore(affiliations);
        const linkedInUrl = contact.linkedInUrl || "";

        // Reject a malformed URL instead of storing it (the URL path already
        // gates on this). A non-LinkedIn / javascript: string would otherwise be
        // persisted and later rendered as an href on the contact page. Blank is
        // allowed — those contacts match by email or insert URL-less.
        if (linkedInUrl && !isValidLinkedInUrl(linkedInUrl)) {
          results.push({
            name: meta.name,
            title: meta.title,
            linkedin_url: linkedInUrl,
            company_name: meta.experience,
            affiliations: [],
            total_score: 0,
            tier: "cold",
            error: "Invalid LinkedIn URL format",
          });
          failed++;
          continue;
        }

        // Look up an existing contact to merge onto — SCOPED TO THE CALLER.
        // AlumniContact is written with the service-role client (RLS bypassed,
        // see supabase.ts), so this importedByUserId filter is the ONLY tenant
        // guard: a same-URL or same-email row owned by another user must read as
        // not-found, never be overwritten + ownership-reassigned. Matches the
        // owner-scoping in extension/ingest and import/brain-dump.
        let existing = null;
        if (linkedInUrl) {
          const { data } = await supabase
            .from("AlumniContact")
            .select("id")
            .eq("linkedInUrl", linkedInUrl)
            .eq("importedByUserId", userId)
            .single();
          existing = data;
        }
        if (!existing && contact.email) {
          const { data } = await supabase
            .from("AlumniContact")
            .select("id")
            .eq("email", contact.email)
            .eq("importedByUserId", userId)
            .single();
          existing = data;
        }

        const record = {
          name: meta.name,
          title: meta.title,
          firmName: meta.experience,
          email: contact.email || "",
          linkedInUrl,
          university: meta.education,
          education: meta.education,
          location: meta.location,
          affiliations: affiliations.map((a) => a.name).join(","),
          warmthScore: score,
          tier,
          source: "linkedin_csv",
          importedByUserId: userId,
        };

        if (existing) {
          await supabase
            .from("AlumniContact")
            .update(record)
            .eq("id", existing.id);
        } else {
          // Not my row. Is this person already in the shared pool (enriched by
          // another user)? If so, LINK me to it instead of inserting — I reuse
          // the existing enrichment and never touch their row.
          const pooled = await findPoolRow(linkedInUrl, contact.email || "");
          if (pooled) {
            await linkToPool(userId, pooled.id);
            results.push({
              id: pooled.id,
              name: pooled.name,
              title: pooled.title,
              linkedin_url: linkedInUrl,
              company_name: pooled.firmName,
              affiliations: pooled.affiliations
                ? pooled.affiliations.split(",").filter(Boolean)
                : [],
              total_score: pooled.warmthScore,
              tier: pooled.tier,
            });
            imported++;
            linked++;
            continue;
          }

          const { error: insertError } = await supabase
            .from("AlumniContact")
            .insert({ ...record, graduationYear: 0 });

          if (insertError) {
            // A unique-constraint hit (SQLSTATE 23505) means this person is
            // already in the shared pool — possibly owned by another user. Don't
            // echo the raw DB error: it leaks the constraint name and confirms
            // the value. Return a generic message instead. (Existence stays
            // distinguishable until the data model goes per-user — parked.)
            throw new Error(
              insertError.code === "23505"
                ? "This contact is already in the network"
                : "Import failed",
            );
          }
        }

        results.push({
          name: meta.name,
          title: meta.title,
          linkedin_url: linkedInUrl,
          company_name: meta.experience,
          affiliations: affiliations.map((a) => a.name),
          total_score: score,
          tier,
        });
        imported++;
      } catch (err) {
        results.push({
          name: contact.name || "",
          title: "",
          linkedin_url: "",
          company_name: "",
          affiliations: [],
          total_score: 0,
          tier: "cold",
          error: err instanceof Error ? err.message : "Import failed",
        });
        failed++;
      }
    }
  }

  // ── URL-based import (existing scraping flow) ─────────────────────────
  if (hasUrls) {
    for (const url of body.urls) {
      if (!isValidLinkedInUrl(url)) {
        results.push({
          name: "",
          title: "",
          linkedin_url: url,
          company_name: "",
          affiliations: [],
          total_score: 0,
          tier: "cold",
          error: "Invalid LinkedIn URL format",
        });
        failed++;
        continue;
      }

      try {
        const meta = await scrapeLinkedInMeta(url);
        const affiliations = detectAffiliations(meta, prefs);
        const { score, tier } = computeWarmthScore(affiliations);

        // Existing-contact lookup, SCOPED TO THE CALLER (see CSV path above): the
        // importedByUserId filter prevents overwriting another user's pool row.
        const { data: existing } = await supabase
          .from("AlumniContact")
          .select("id")
          .eq("linkedInUrl", url)
          .eq("importedByUserId", userId)
          .single();

        let contactId: string | undefined;

        if (existing) {
          contactId = existing.id;
          await supabase
            .from("AlumniContact")
            .update({
              name: meta.name,
              title: meta.title,
              firmName: meta.experience,
              university: meta.education,
              education: meta.education,
              location: meta.location,
              affiliations: affiliations.map((a) => a.name).join(","),
              warmthScore: score,
              tier,
              source: "linkedin_import",
              importedByUserId: userId,
            })
            .eq("id", existing.id);
        } else {
          // Already in the shared pool (another user's)? Link, don't overwrite —
          // see the CSV path. Read-only access via a high_value Discover link.
          const pooled = await findPoolRow(url, "");
          if (pooled) {
            await linkToPool(userId, pooled.id);
            results.push({
              id: pooled.id,
              name: pooled.name,
              title: pooled.title,
              linkedin_url: url,
              company_name: pooled.firmName,
              affiliations: pooled.affiliations
                ? pooled.affiliations.split(",").filter(Boolean)
                : [],
              total_score: pooled.warmthScore,
              tier: pooled.tier,
            });
            imported++;
            linked++;
            continue;
          }

          const { data: inserted, error: insertError } = await supabase
            .from("AlumniContact")
            .insert({
              name: meta.name,
              title: meta.title,
              firmName: meta.experience,
              linkedInUrl: url,
              university: meta.education,
              graduationYear: 0,
              education: meta.education,
              location: meta.location,
              affiliations: affiliations.map((a) => a.name).join(","),
              warmthScore: score,
              tier,
              source: "linkedin_import",
              importedByUserId: userId,
            })
            .select("id")
            .single();

          if (insertError) {
            // A unique-constraint hit (SQLSTATE 23505) means this person is
            // already in the shared pool — possibly owned by another user. Don't
            // echo the raw DB error: it leaks the constraint name and confirms
            // the value. Return a generic message instead. (Existence stays
            // distinguishable until the data model goes per-user — parked.)
            throw new Error(
              insertError.code === "23505"
                ? "This contact is already in the network"
                : "Import failed",
            );
          }
          contactId = inserted?.id;
        }

        results.push({
          id: contactId,
          name: meta.name,
          title: meta.title,
          linkedin_url: url,
          company_name: meta.experience,
          affiliations: affiliations.map((a) => a.name),
          total_score: score,
          tier,
        });
        imported++;
      } catch (err) {
        results.push({
          name: "",
          title: "",
          linkedin_url: url,
          company_name: "",
          affiliations: [],
          total_score: 0,
          tier: "cold",
          error: err instanceof Error ? err.message : "Import failed",
        });
        failed++;
      }
    }
  }

  return NextResponse.json({ imported, failed, linked, contacts: results });
}

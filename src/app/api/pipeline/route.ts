import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { findWarmPaths } from "@/lib/warm-paths";
import { redactName, redactLinkedInUrl } from "@/lib/redact";

const STAGES = [
  "researched",
  "connected",
  "email_sent",
  "follow_up",
  "responded",
  "meeting_set",
];

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.email;

  try {
    // Fetch pipeline entries for current user
    const { data: entries, error: entryError } = await supabase
      .from("PipelineEntry")
      .select("*")
      .eq("userId", userId)
      .order("addedAt", { ascending: false });

    if (entryError) throw new Error(entryError.message);
    if (!entries || entries.length === 0) {
      return NextResponse.json({ stages: STAGES, contacts: {}, total: 0 });
    }

    // Fetch all contacts for those pipeline entries
    const contactIds = [...new Set(entries.map((e) => e.contactId))];
    const { data: contacts, error: contactError } = await supabase
      .from("AlumniContact")
      .select("*")
      .in("id", contactIds);

    if (contactError) throw new Error(contactError.message);

    // Build a lookup map for contacts
    const contactMap = new Map(
      (contacts || []).map((c) => [c.id, c]),
    );

    // Group pipeline entries by stage, transforming to PipelineContact shape
    const grouped: Record<string, Array<{
      id: string;
      name: string;
      title: string;
      email: string;
      linkedin_url: string;
      education: string;
      company_name: string;
      company_location: string;
      total_score: number;
      tier: string;
      stage: string;
      notes: string;
      added_at: string;
      affiliations: string[];
      warmPaths: Array<{ intermediaryName: string; intermediaryRelation: string; firmName: string; title: string }>;
      isRedacted?: boolean;
    }>> = {};

    for (const stage of STAGES) {
      grouped[stage] = [];
    }

    // Pre-fetch warm paths per unique firm (cache by normalized firm name)
    const firmPathCache = new Map<string, Awaited<ReturnType<typeof findWarmPaths>>>();

    for (const entry of entries) {
      const contact = contactMap.get(entry.contactId);
      if (!contact) continue;

      const stage = (entry.stage || "researched").toLowerCase();
      if (!grouped[stage]) grouped[stage] = [];

      let warmPaths = firmPathCache.get(contact.firmName || "");
      if (warmPaths === undefined) {
        warmPaths = await findWarmPaths(userId, contact.firmName || "");
        firmPathCache.set(contact.firmName || "", warmPaths);
      }

      // Redact PII when the underlying contact wasn't imported by the current user.
      // Pipeline entries can reference contacts another user imported (added via Discover).
      const isOwn = contact.importedByUserId === userId;
      const safeName = isOwn ? (contact.name || "") : redactName(contact.name || "");
      const safeLinkedIn = isOwn
        ? (contact.linkedInUrl || "")
        : (contact.linkedInUrl ? redactLinkedInUrl(contact.linkedInUrl) : "");

      grouped[stage].push({
        id: contact.id,
        name: safeName,
        title: contact.title || "",
        email: "",
        linkedin_url: safeLinkedIn,
        education: contact.education || "",
        company_name: contact.firmName || "",
        company_location: contact.location || "",
        total_score: contact.warmthScore || 0,
        tier: contact.tier || "cold",
        stage,
        notes: entry.notes || "",
        added_at: entry.addedAt || new Date().toISOString(),
        affiliations: contact.affiliations
          ? contact.affiliations.split(",").map((a: string) => a.trim()).filter(Boolean)
          : [],
        warmPaths: warmPaths.filter((wp) => wp.intermediaryName !== contact.name),
        ...(isOwn ? {} : { isRedacted: true }),
      });
    }

    const total = entries.length;

    return NextResponse.json({ stages: STAGES, contacts: grouped, total });
  } catch {
    return NextResponse.json({ stages: STAGES, contacts: {}, total: 0 });
  }
}

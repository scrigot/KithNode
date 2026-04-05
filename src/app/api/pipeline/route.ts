import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getUserId } from "@/lib/get-user";

const STAGES = [
  "researched",
  "connected",
  "email_sent",
  "follow_up",
  "responded",
  "meeting_set",
];

export async function GET() {
  try {
    const userId = await getUserId();

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
    }>> = {};

    for (const stage of STAGES) {
      grouped[stage] = [];
    }

    for (const entry of entries) {
      const contact = contactMap.get(entry.contactId);
      if (!contact) continue;

      const stage = (entry.stage || "researched").toLowerCase();
      if (!grouped[stage]) grouped[stage] = [];

      grouped[stage].push({
        id: contact.id,
        name: contact.name || "",
        title: contact.title || "",
        email: "",
        linkedin_url: contact.linkedInUrl || "",
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
      });
    }

    const total = entries.length;

    return NextResponse.json({ stages: STAGES, contacts: grouped, total });
  } catch {
    return NextResponse.json({ stages: STAGES, contacts: {}, total: 0 });
  }
}

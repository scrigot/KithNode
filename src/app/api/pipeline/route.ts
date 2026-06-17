import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireUser, scopedSelect } from "@/lib/pipeline-auth";
import { findWarmPaths } from "@/lib/warm-paths";
import { redactName, redactLinkedInUrl } from "@/lib/redact";
import { isUnlocked } from "@/lib/contact-access";

// The 4 universal phases every pipeline's native stages roll up to in the "All" view.
const UNIVERSAL_PHASES = [
  { key: "identified", label: "Identified", color: "zinc" },
  { key: "contacted", label: "Contacted", color: "blue" },
  { key: "engaged", label: "Engaged", color: "amber" },
  { key: "advanced", label: "Advanced", color: "green" },
];
const UNSORTED = { key: "unsorted", label: "Unsorted", color: "zinc" };

interface StageMeta {
  key: string;
  label: string;
  color: string;
  universalPhase?: string;
}
interface PipelineRow {
  id: string;
  name: string;
  kind: string;
  stages: StageMeta[];
  cadenceDays: number | null;
}

function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

/** Parse the JSONB stages column, tolerating string-encoded JSON. */
function parseStages(raw: unknown): StageMeta[] {
  if (Array.isArray(raw)) return raw as StageMeta[];
  if (typeof raw === "string") {
    try {
      const v = JSON.parse(raw);
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  }
  return [];
}

export async function GET(request: NextRequest) {
  const userId = await requireUser();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const active = request.nextUrl.searchParams.get("pipeline") || "all";

  try {
    // 1. The user's pipelines (userId-scoped via the IDOR guard).
    const { data: pipelineRows, error: pErr } = await scopedSelect(
      "Pipeline",
      userId,
    );
    if (pErr) throw new Error(pErr.message);

    const pipelines: PipelineRow[] = (pipelineRows || []).map((p) => ({
      id: p.id,
      name: p.name,
      kind: p.kind,
      stages: parseStages(p.stages),
      cadenceDays: p.cadenceDays ?? null,
    }));
    const pipeMap = new Map(pipelines.map((p) => [p.id, p]));

    // 2. Pipeline entries (userId-scoped). For a specific pipeline, filter by id.
    let entryQuery = scopedSelect("PipelineEntry", userId).order("addedAt", {
      ascending: false,
    });
    if (active !== "all") entryQuery = entryQuery.eq("pipelineId", active);
    const { data: entries, error: eErr } = await entryQuery;
    if (eErr) throw new Error(eErr.message);

    // Columns for the requested view.
    const activePipe = active === "all" ? null : pipeMap.get(active);
    const columns: StageMeta[] =
      active === "all"
        ? [...UNIVERSAL_PHASES]
        : activePipe?.stages.length
          ? activePipe.stages
          : [];

    const pipelineSummaries = pipelines.map((p) => ({
      id: p.id,
      name: p.name,
      kind: p.kind,
      count: (entries || []).filter((e) => e.pipelineId === p.id).length,
    }));

    // Unlock set: a contact is shown unredacted when the viewer imported it OR
    // rated it high_value in Discover (see isUnlocked / redact.ts).
    const { data: discoverRows } = await scopedSelect(
      "UserDiscover",
      userId,
      "contactId, rating",
    );
    const highValueIds = new Set<string>(
      ((discoverRows as { contactId: string; rating: string }[]) || [])
        .filter((d) => d.rating === "high_value")
        .map((d) => d.contactId),
    );

    if (!entries || entries.length === 0) {
      return NextResponse.json({
        pipelines: pipelineSummaries,
        activePipeline: active,
        stages: columns,
        contacts: {},
        goingCold: [],
        total: 0,
      });
    }

    // 3. Contacts for those entries. NOTE: scoped by contactId, NOT userId —
    //    contacts are shared/importable; non-owners get redacted (see redact.ts).
    const contactIds = [...new Set(entries.map((e) => e.contactId))];
    const { data: contacts, error: cErr } = await supabase
      .from("AlumniContact")
      .select("*")
      .in("id", contactIds);
    if (cErr) throw new Error(cErr.message);
    const contactMap = new Map((contacts || []).map((c) => [c.id, c]));

    const grouped: Record<string, unknown[]> = {};
    for (const col of columns) grouped[col.key] = [];
    let sawUnsorted = false;
    const goingCold: unknown[] = [];
    // Pre-fetch warm paths per unique firm (cache by firm name).
    const firmPathCache = new Map<
      string,
      Awaited<ReturnType<typeof findWarmPaths>>
    >();

    for (const entry of entries) {
      const contact = contactMap.get(entry.contactId);
      if (!contact) continue;
      const pipe = entry.pipelineId ? pipeMap.get(entry.pipelineId) : undefined;
      const nativeStage = (entry.stage || "researched").toLowerCase();
      const stageMeta = pipe?.stages.find((s) => s.key === nativeStage);

      // Which column does this entry land in?
      let columnKey: string;
      if (active === "all") {
        columnKey = stageMeta?.universalPhase || "unsorted";
      } else {
        columnKey = stageMeta ? nativeStage : "unsorted";
      }
      if (columnKey === "unsorted") {
        sawUnsorted = true;
        if (!grouped["unsorted"]) grouped["unsorted"] = [];
      }

      let warmPaths = firmPathCache.get(contact.firmName || "");
      if (warmPaths === undefined) {
        warmPaths = await findWarmPaths(userId, contact.firmName || "");
        firmPathCache.set(contact.firmName || "", warmPaths);
      }

      // Redact PII only when not unlocked. A contact is unlocked when the viewer
      // imported it OR has rated it high_value in Discover. Pipeline contacts
      // added from Discover (high_value) must show full identity since the user
      // is actively reaching out to them.
      const unlocked = isUnlocked(contact.importedByUserId, userId, highValueIds, contact.id);
      const safeName = unlocked ? contact.name || "" : redactName(contact.name || "");
      const safeLinkedIn = unlocked
        ? contact.linkedInUrl || ""
        : contact.linkedInUrl
          ? redactLinkedInUrl(contact.linkedInUrl)
          : "";

      const lastTouchAt = entry.lastTouchAt || entry.addedAt || null;
      const card = {
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
        stage: nativeStage,
        nativeStageLabel: stageMeta?.label || nativeStage,
        pipelineId: entry.pipelineId || "",
        pipelineKind: pipe?.kind || "",
        notes: entry.notes || "",
        added_at: entry.addedAt || new Date().toISOString(),
        lastTouchAt,
        daysSinceTouch: daysSince(lastTouchAt),
        affiliations: contact.affiliations
          ? contact.affiliations.split(",").map((a: string) => a.trim()).filter(Boolean)
          : [],
        warmPaths: warmPaths.filter((wp) => wp.intermediaryName !== contact.name),
        ...(unlocked ? {} : { isRedacted: true }),
      };

      (grouped[columnKey] ||= []).push(card);

      // Nurture: overdue if past the pipeline's cadence and not in a terminal stage.
      const terminalKey = pipe?.stages[pipe.stages.length - 1]?.key;
      const d = card.daysSinceTouch;
      if (
        pipe?.cadenceDays &&
        d !== null &&
        d >= pipe.cadenceDays &&
        nativeStage !== terminalKey
      ) {
        goingCold.push(card);
      }
    }

    const stages = sawUnsorted ? [...columns, UNSORTED] : columns;
    goingCold.sort(
      (a, b) =>
        ((b as { daysSinceTouch: number }).daysSinceTouch || 0) -
        ((a as { daysSinceTouch: number }).daysSinceTouch || 0),
    );

    return NextResponse.json({
      pipelines: pipelineSummaries,
      activePipeline: active,
      stages,
      contacts: grouped,
      goingCold: goingCold.slice(0, 12),
      total: entries.length,
    });
  } catch {
    return NextResponse.json({
      pipelines: [],
      activePipeline: active,
      stages: [],
      contacts: {},
      goingCold: [],
      total: 0,
    });
  }
}

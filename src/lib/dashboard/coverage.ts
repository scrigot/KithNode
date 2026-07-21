import "server-only";
import { supabase } from "@/lib/supabase";
import { getUserPrefs } from "@/lib/user-prefs";

export interface CoverageResult {
  covered: Array<{ company: string; contacts: number; stages: string[] }>;
  uncovered: string[];
  total_target: number;
  total_covered: number;
}

function companyMatches(target: string, actual: string) {
  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
  const left = normalize(target);
  const right = normalize(actual);
  return Boolean(left && right && (left.includes(right) || right.includes(left)));
}

export function calculateCoverage(
  targetFirms: string[],
  entries: Array<{ stage: string | null; contact: { firmName: string } | null }>,
): CoverageResult {
  const covered: CoverageResult["covered"] = [];
  const uncovered: string[] = [];

  for (const target of targetFirms) {
    const matches = entries.filter(
      (entry) => entry.contact && companyMatches(target, entry.contact.firmName),
    );
    if (matches.length) {
      covered.push({
        company: target,
        contacts: matches.length,
        stages: matches.map((entry) => (entry.stage || "researched").toLowerCase()),
      });
    } else {
      uncovered.push(target);
    }
  }

  return {
    covered,
    uncovered,
    total_target: targetFirms.length,
    total_covered: covered.length,
  };
}

export async function getDashboardCoverage(userId: string, email: string) {
  const prefs = await getUserPrefs(email);
  const { data, error } = await supabase
    .from("PipelineEntry")
    .select("stage, contact:AlumniContact(firmName)")
    .eq("userId", userId);
  if (error) throw new Error(`coverage_query_failed:${error.code || "unknown"}`);
  const entries = (data ?? []).map((entry) => ({
    stage: typeof entry.stage === "string" ? entry.stage : null,
    contact: Array.isArray(entry.contact) ? entry.contact[0] ?? null : entry.contact,
  }));
  return calculateCoverage(prefs.targetFirms, entries);
}

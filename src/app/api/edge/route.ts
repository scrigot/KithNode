import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getUserPrefs } from "@/lib/user-prefs";
import {
  computeEdge,
  personTraits,
  viewerTargetTracks,
  viewerTargetRoles,
  EDGE_MIN_COHORT,
  type EdgeGap,
  type EdgePerson,
  type EdgeDimension,
} from "@/lib/edge";

export interface EdgeResponse {
  /** Did the user set target industries that resolve to a known track? */
  hasTargets: boolean;
  /** The resolved target track(s) the cohort is drawn from. */
  targetTracks: string[];
  /** Total contacts the user has imported (for empty-state messaging). */
  totalNetwork: number;
  /** Contacts in the target track(s) — the comparison cohort. */
  cohortSize: number;
  /** True once the cohort is large enough to compute honest gaps. */
  enoughCohort: boolean;
  /** The cohort floor, surfaced so the UI can say "need N". */
  minCohort: number;
  /** Per dimension, how many cohort contacts have data there (coverage). */
  dimensionEligible: Record<EdgeDimension, number>;
  gaps: EdgeGap[];
}

/**
 * GET /api/edge — what the people in your target track have that you don't.
 *
 * Read-only, deterministic, no AI → no credit charge. The cohort is the user's
 * OWN imported contacts (importedByUserId), filtered to their target track(s).
 * The gap math + honesty thresholds live in lib/edge.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const email = session.user.email;
  const userId = session.user.id;

  const prefs = await getUserPrefs(email);
  const targetTracks = viewerTargetTracks(prefs.targetIndustries, prefs.onboardingGoal);
  const hasTargets = targetTracks.length > 0;

  // The user's own network with just the dimensions The Edge compares.
  const { data: contacts } = await supabase
    .from("AlumniContact")
    .select("id, name, track, skills, clubMemberships, clubs, experiences")
    .eq("importedByUserId", userId);

  const network = contacts ?? [];
  const totalNetwork = network.length;

  const base: EdgeResponse = {
    hasTargets,
    targetTracks,
    totalNetwork,
    cohortSize: 0,
    enoughCohort: false,
    minCohort: EDGE_MIN_COHORT,
    dimensionEligible: { skills: 0, clubs: 0, experiences: 0 },
    gaps: [],
  };

  if (!hasTargets) {
    return NextResponse.json(base);
  }

  // Cohort = contacts classified into one of the user's target tracks.
  const trackSet = new Set(targetTracks.map((t) => t.toLowerCase()));
  const cohortRows = network.filter((c) =>
    trackSet.has(((c.track as string) || "").toLowerCase()),
  );

  // Exclude only the user's bullseye role(s) from the experience dimension so it
  // hides the trivial "IB people have IB experience" gap while still surfacing
  // same-track but off-bullseye experience (PE / S&T / HF for an IB targeter).
  const opts = { excludeExperienceRoles: viewerTargetRoles(prefs.targetIndustries, prefs.onboardingGoal) };

  // The viewer goes through the SAME canonicalization path as the cohort by
  // re-stringifying the parsed prefs — guarantees identical trait shapes.
  const viewer = personTraits(
    {
      skills: JSON.stringify(prefs.skills),
      clubMemberships: JSON.stringify(prefs.clubMemberships),
      // Flat fallback so a user whose clubs live only in the legacy column still
      // counts as HAVING them (else they'd show as false club gaps).
      clubs: prefs.clubs.join(", "),
      experiences: JSON.stringify(prefs.experiences),
    },
    opts,
  );

  const cohort: EdgePerson[] = cohortRows.map((c) => ({
    id: c.id as string,
    name: (c.name as string) || "Unknown",
    traits: personTraits(
      {
        skills: c.skills as string,
        clubMemberships: c.clubMemberships as string,
        clubs: c.clubs as string,
        experiences: c.experiences as string,
      },
      opts,
    ),
  }));

  const result = computeEdge({ viewer, cohort });

  return NextResponse.json({
    ...base,
    cohortSize: result.cohortSize,
    enoughCohort: result.enoughCohort,
    dimensionEligible: result.dimensionEligible,
    gaps: result.gaps,
  });
}

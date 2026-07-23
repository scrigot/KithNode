export type PeopleView = "all" | "warm" | "needs_info";

export type PeopleViewRecord = {
  name: string;
  relationship_class?: string | null;
  needs_info?: boolean | null;
  score?: {
    fit_score?: number | null;
    engagement_score?: number | null;
    tier?: string | null;
  } | null;
};

const byName = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

export const PEOPLE_VIEW_COPY: Record<
  PeopleView,
  { label: string; description: string }
> = {
  all: {
    label: "All people",
    description: "Every person in your network, alphabetized.",
  },
  warm: {
    label: "Warm paths",
    description:
      "People you already know or recently engaged, ranked by relationship activity and recruiting fit.",
  },
  needs_info: {
    label: "Needs context",
    description:
      "People missing details that would improve matching, introductions, and outreach.",
  },
};

export function isWarmPath(person: PeopleViewRecord) {
  return person.relationship_class?.trim().toLowerCase() === "kith";
}

export function personMatchesView(
  person: PeopleViewRecord,
  view: PeopleView,
) {
  if (view === "warm") return isWarmPath(person);
  if (view === "needs_info") return Boolean(person.needs_info);
  return true;
}

export function sortPeopleForView<T extends PeopleViewRecord>(
  people: T[],
  view: PeopleView,
) {
  return [...people].sort((a, b) => {
    if (view === "warm") {
      const engagementDelta =
        (b.score?.engagement_score ?? 0) -
        (a.score?.engagement_score ?? 0);
      if (engagementDelta !== 0) return engagementDelta;

      const fitDelta =
        (b.score?.fit_score ?? 0) - (a.score?.fit_score ?? 0);
      if (fitDelta !== 0) return fitDelta;
    }

    return byName.compare(a.name, b.name);
  });
}

export function countPeopleViews(people: PeopleViewRecord[]) {
  return {
    all: people.length,
    warm: people.filter(isWarmPath).length,
    needs_info: people.filter((person) => person.needs_info).length,
  } satisfies Record<PeopleView, number>;
}

import { describe, it, expect } from "vitest";
import { buildCard } from "@/lib/kith/cards";
import type { UserPrefs } from "@/lib/user-prefs";

// A prefs object carrying BOTH public and private fields, so the test proves
// buildCard physically drops the private ones even when it has them in hand.
const PREFS: UserPrefs = {
  university: "UNC",
  highSchool: "Some HS",
  hometown: "Charlotte",
  greekOrg: "Chi Phi",
  major: "Economics",
  minor: "Stats",
  concentration: "Finance",
  degrees: "BS",
  targetIndustries: ["Investment Banking"],
  targetFirms: ["Goldman"],
  targetLocations: ["NYC"],
  clubs: ["IB Club"],
  skills: ["Excel", "Modeling"],
  pastFirms: ["Acme"],
  educations: [{ major: "Economics", degree: "BS", concentration: "Finance" }],
  experiences: [{ title: "Analyst", firm: "Acme", start: "Jun 2025", end: "Present" }],
  clubMemberships: [{ club: "IB Club", role: "President" }],
  recruitingDate: "2026-01-01",
  graduationYear: 2029,
  weeklyGoalTarget: 3,
  onboardingGoal: "Investment Banking",
  onboardingPain: ["Cold outreach"],
  onboardingTimeline: "This fall",
  tutorialDoneAt: null,
  draftTone: "warm",
  draftLength: "medium",
  draftSignature: "Sam",
  draftSubjectStyle: "casual",
  digestEmailEnabled: true,
  followupEmailEnabled: true,
};

describe("buildCard", () => {
  it("visible=false → only name, image, visible:false (no professional fields)", () => {
    const card = buildCard("Jane", "img.png", PREFS, false);
    expect(card).toEqual({ name: "Jane", image: "img.png", visible: false });
    expect("university" in card).toBe(false);
    expect("skills" in card).toBe(false);
    expect("educations" in card).toBe(false);
    expect("experiences" in card).toBe(false);
  });

  it("visible=true → includes the public professional fields", () => {
    const card = buildCard("Jane", "img.png", PREFS, true);
    expect(card.visible).toBe(true);
    expect(card.university).toBe("UNC");
    expect(card.graduationYear).toBe(2029);
    expect(card.degrees).toBe("BS");
    expect(card.major).toBe("Economics");
    expect(card.concentration).toBe("Finance");
    expect(card.educations).toEqual(PREFS.educations);
    expect(card.experiences).toEqual(PREFS.experiences);
    expect(card.clubMemberships).toEqual(PREFS.clubMemberships);
    expect(card.skills).toEqual(["Excel", "Modeling"]);
  });

  it("visible=true → NEVER includes private fields, even though prefs has them", () => {
    const card = buildCard("Jane", "img.png", PREFS, true) as unknown as Record<string, unknown>;
    expect("hometown" in card).toBe(false);
    expect("highSchool" in card).toBe(false);
    expect("email" in card).toBe(false);
    expect("targetIndustries" in card).toBe(false);
    expect("targetFirms" in card).toBe(false);
    expect("targetLocations" in card).toBe(false);
    expect("onboardingGoal" in card).toBe(false);
    expect("onboardingPain" in card).toBe(false);
    expect("onboardingTimeline" in card).toBe(false);
    expect("recruitingDate" in card).toBe(false);
    expect("draftTone" in card).toBe(false);
    expect("digestEmailEnabled" in card).toBe(false);
  });
});

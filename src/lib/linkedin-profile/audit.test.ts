import { describe, expect, it } from "vitest";
import { auditLinkedInProfile } from "./audit";
import { EMPTY_LINKEDIN_PROFILE, normalizeLinkedInProfile } from "./schema";

describe("LinkedIn profile workspace", () => {
  it("normalizes the legacy extension extraction shape", () => {
    const profile = normalizeLinkedInProfile({
      name: "Ada Lovelace",
      headline: "Software engineer",
      experiences: [{ title: "Engineer", firm: "Analytical Engines", start: "2025", end: "Present" }],
      educations: [{ school: "University", degree: "BS", major: "Math" }],
      skills: ["TypeScript"],
      clubs: ["Robotics Club"],
    });
    expect(profile.basics).toMatchObject({ firstName: "Ada", lastName: "Lovelace", headline: "Software engineer" });
    expect(profile.sections.experience[0]).toMatchObject({ title: "Engineer", organization: "Analytical Engines" });
    expect(profile.sections.education[0]).toMatchObject({ organization: "University", subtitle: "Math" });
    expect(profile.sections.skills[0]?.title).toBe("TypeScript");
    expect(profile.sections.organizations[0]?.title).toBe("Robotics Club");
  });

  it("audits missing sections without inventing content", () => {
    const audit = auditLinkedInProfile(EMPTY_LINKEDIN_PROFILE);
    expect(audit.score).toBeLessThan(20);
    expect(audit.issues.some((issue) => issue.section === "experience" && issue.severity === "high")).toBe(true);
    expect(audit.issues.some((issue) => issue.section === "positioning")).toBe(true);
  });

  it("rewards evidence, positioning, keywords, and social proof", () => {
    const profile = normalizeLinkedInProfile({
      basics: {
        firstName: "Ada",
        lastName: "Lovelace",
        headline: "Software engineer building reliable AI products for financial teams",
        about: "I build reliable AI systems that turn complex financial workflows into usable products. ".repeat(14),
        location: "London",
        industry: "Software",
        profilePhotoUrl: "https://example.com/photo.jpg",
        bannerImageUrl: "https://example.com/banner.jpg",
        website: "https://example.com",
      },
      positioning: { targetRoles: ["Software engineer"], valueProposition: "Reliable AI delivery", keywords: ["AI", "TypeScript"] },
      sections: {
        experience: [{ id: "e1", title: "Engineer", organization: "Example", description: "Built an AI workflow used by 500 analysts and reduced review time by 35%." }],
        education: [{ id: "ed1", title: "BSc Mathematics", organization: "University" }],
        skills: Array.from({ length: 10 }, (_, index) => ({ id: `s${index}`, title: index ? `Skill ${index}` : "TypeScript" })),
        featured: [{ id: "f1", title: "AI case study", url: "https://example.com/case-study" }],
        recommendations: [{ id: "r1", title: "Manager recommendation" }, { id: "r2", title: "Client recommendation" }],
      },
    });
    const audit = auditLinkedInProfile(profile);
    expect(audit.score).toBeGreaterThan(70);
    expect(audit.keywordCoverage.missing).toEqual([]);
    expect(audit.strengths.length).toBeGreaterThan(2);
  });
});

import { describe, expect, it } from "vitest";
import { CAREER_SKILLS, careerSkillIdSchema, parseSlashSkill } from "./skills";
import { inferCareerSkill } from "./skill-engine";

describe("career skill registry", () => {
  it("exposes unique commands and typed ids", () => {
    expect(new Set(CAREER_SKILLS.map((skill) => skill.command)).size).toBe(CAREER_SKILLS.length);
    expect(CAREER_SKILLS).toHaveLength(11);
    for (const skill of CAREER_SKILLS) expect(careerSkillIdSchema.parse(skill.id)).toBe(skill.id);
  });

  it("selects slash commands deterministically", () => {
    expect(parseSlashSkill("/find-internships finance")?.id).toBe("find_internships");
    expect(parseSlashSkill("/find-jobs fintech remote")?.id).toBe("find_jobs");
    expect(parseSlashSkill("/enrichment-gaps")?.id).toBe("enrichment_gaps");
    expect(parseSlashSkill("/feedback find jobs broke")?.id).toBe("feedback");
    expect(parseSlashSkill("hello")).toBeUndefined();
  });

  it("maps common natural-language requests to the same read skills", () => {
    expect(inferCareerSkill("Find internships for a college junior")).toBe("find_internships");
    expect(inferCareerSkill("Show me summer analyst roles")).toBe("find_internships");
    expect(inferCareerSkill("Find opportunities for me", { isCurrentUndergraduate: true })).toBe("find_internships");
    expect(inferCareerSkill("Find full-time opportunities for me", { isCurrentUndergraduate: true })).toBe("find_jobs");
    expect(inferCareerSkill("Find job offers based on my profile")).toBe("find_jobs");
    expect(inferCareerSkill("Which contacts need more info?")).toBe("enrichment_gaps");
    expect(inferCareerSkill("What firms do I need to meet more people at?")).toBe("firm_coverage");
  });
});

import { afterAll, describe, expect, it } from "vitest";
import { executeCareerSkill } from "./skill-engine";
import { supabase } from "@/lib/supabase";

const USER_ID = "fixture-student-user";
const USER_EMAIL = "student@kithnode.local";
const runLiveSmoke = process.env.RUN_LIVE_JOB_SMOKE === "1" ? describe : describe.skip;

runLiveSmoke("Career Copilot live official-source smoke", () => {
  afterAll(async () => {
    await supabase
      .from("JobSource")
      .delete()
      .eq("userId", USER_ID)
      .in("companyKey", ["scaleai", "databricks"]);
  });

  it("finds current undergraduate internships without admitting title false positives", async () => {
    const result = await executeCareerSkill({
      skillId: "find_internships",
      userId: USER_ID,
      userEmail: USER_EMAIL,
      parameters: {
        companies: ["Scale AI", "Databricks"],
        includeAdjacent: false,
      },
    });

    expect(result.cards.length, JSON.stringify(result.warnings)).toBeGreaterThan(0);
    expect(result.cards.every((card) =>
      card.links?.some((link) => /^https:\/\//.test(link.href)),
    )).toBe(true);
    expect(result.cards.some((card) => /AI Builder Intern/i.test(card.title))).toBe(true);
    expect(result.cards.some((card) => /Database Engine Internals/i.test(card.title))).toBe(false);
    expect(result.cards.some((card) => /Senior|Director|PhD/i.test(card.title))).toBe(false);
  }, 45_000);
});

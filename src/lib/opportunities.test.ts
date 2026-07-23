import { describe, expect, it } from "vitest";
import {
  OPPORTUNITY_STATUSES,
  OPPORTUNITY_TYPES,
  escapePostgrestSearch,
  isExternalOpportunityUrl,
  opportunityCompanyKey,
  opportunityCreateSchema,
  opportunityEventSchema,
  opportunityPatchSchema,
  statusLabel,
  opportunityTypeLabel,
} from "./opportunities";

describe("opportunity contracts", () => {
  it("keeps the launch pipeline in its canonical order", () => {
    expect(OPPORTUNITY_STATUSES).toEqual([
      "discovered", "saved", "preparing", "applied", "assessment", "interview",
      "offer", "accepted", "rejected", "withdrawn", "archived",
    ]);
  });

  it("creates a safe manual application with launch defaults", () => {
    const result = opportunityCreateSchema.parse({ company: "  Goldman Sachs ", role: "Analyst" });
    expect(result).toMatchObject({
      company: "Goldman Sachs",
      role: "Analyst",
      status: "saved",
      priority: "medium",
      source: "manual",
      jobUrl: "",
      opportunityType: "job",
    });
  });

  it("rejects unknown stages and unsafe scores", () => {
    expect(opportunityCreateSchema.safeParse({ company: "Firm", role: "Role", status: "hired" }).success).toBe(false);
    expect(opportunityPatchSchema.safeParse({ fitScore: 101 }).success).toBe(false);
    expect(opportunityPatchSchema.safeParse({ opportunityType: "fellowship" }).success).toBe(false);
  });

  it("accepts null dates and bounded timeline notes", () => {
    expect(opportunityPatchSchema.parse({ deadline: null, nextActionDue: "" })).toEqual({ deadline: null, nextActionDue: null });
    expect(opportunityEventSchema.parse({ title: "Interview scheduled" })).toMatchObject({ type: "note", detail: "" });
  });

  it("normalizes firm keys, labels, search text, and external links", () => {
    expect(opportunityCompanyKey("Kenan-Flagler (UNC)")).toBe("kenanflaglerunc");
    expect(statusLabel("next_action")).toBe("Next Action");
    expect(escapePostgrestSearch("Goldman,(Analyst)%")).toBe("Goldman  Analyst");
    expect(isExternalOpportunityUrl("https://example.com/job")).toBe(true);
    expect(isExternalOpportunityUrl("manual://opportunity/1")).toBe(false);
    expect(OPPORTUNITY_TYPES).toContain("summer_analyst");
    expect(opportunityTypeLabel("co_op")).toBe("Co-op");
  });
});

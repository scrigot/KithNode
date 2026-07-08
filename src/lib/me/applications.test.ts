import { describe, expect, it } from "vitest";
import {
  buildApplicationWhere,
  buildApplicationOrderBy,
  companyMatchesContact,
  parseApplicationFilters,
  sanitizeApplicationInput,
  validateApplication,
  validateApplicationEnums,
} from "./applications";

describe("sanitizeApplicationInput", () => {
  it("cleans fields and validates required company/role", () => {
    const data = sanitizeApplicationInput({
      company: "  Databricks  ",
      role: " Software Engineering Intern ",
      status: "applied",
      priority: "high",
      deadline: "2026-08-01",
      nextAction: " Follow up ",
    });
    expect(data.company).toBe("Databricks");
    expect(data.role).toBe("Software Engineering Intern");
    expect(data.status).toBe("applied");
    expect(data.priority).toBe("high");
    expect(data.deadline?.toISOString()).toContain("2026-08-01");
    expect(validateApplication(data)).toBeNull();
    expect(validateApplication(sanitizeApplicationInput({ company: "", role: "" }))).toBe("Company required");
  });

  it("preserves fallback status/priority on partial input", () => {
    const data = sanitizeApplicationInput(
      { company: "New" },
      { role: "Existing", status: "interview", priority: "low" },
    );
    expect(data.company).toBe("New");
    expect(data.role).toBe("Existing");
    expect(data.status).toBe("interview");
    expect(data.priority).toBe("low");
  });

  it("validates explicit status and priority values", () => {
    expect(validateApplicationEnums({ status: "bad" })).toBe("Invalid status");
    expect(validateApplicationEnums({ priority: "bad" })).toBe("Invalid priority");
    expect(validateApplicationEnums({ status: "applied", priority: "high" })).toBeNull();
  });

  it("allows partial updates to clear optional fields", () => {
    const data = sanitizeApplicationInput(
      { nextAction: "", resumeId: "" },
      { company: "Corning", role: "Data Intern", nextAction: "Follow up", resumeId: "resume_1" },
    );
    expect(data.nextAction).toBe("");
    expect(data.resumeId).toBeNull();
  });
});

describe("application filters", () => {
  const now = new Date("2026-07-07T12:00:00.000Z");

  it("parses accepted filters only", () => {
    expect(parseApplicationFilters({ q: " ai ", company: " OpenAI ", status: "applied", priority: "high", deadline: "upcoming", actions: "open", sort: "company_asc" })).toEqual({
      q: "ai",
      company: "OpenAI",
      status: "applied",
      priority: "high",
      resumeId: undefined,
      deadline: "upcoming",
      actions: "open",
      sort: "company_asc",
      archived: undefined,
    });
    expect(parseApplicationFilters({ status: "bad", deadline: "later" }).status).toBeUndefined();
  });

  it("builds user-scoped where with deadline and action filters", () => {
    const where = buildApplicationWhere("me", { q: "data", deadline: "upcoming", actions: "open" }, now);
    const json = JSON.stringify(where);
    expect(where.userId).toBe("me");
    expect(json).toContain("company");
    expect(json).toContain("nextAction");
    expect(json).toContain("2026-07-21");
  });

  it("builds stable order clauses from accepted sort filters", () => {
    expect(buildApplicationOrderBy({ sort: "company_asc" })).toEqual([{ company: "asc" }, { role: "asc" }]);
    expect(buildApplicationOrderBy({ sort: "updated_desc" })).toEqual([{ updatedAt: "desc" }]);
    expect(buildApplicationOrderBy({})).toEqual([{ deadline: "asc" }, { updatedAt: "desc" }]);
  });
});

describe("companyMatchesContact", () => {
  it("matches normalized company names", () => {
    expect(companyMatchesContact("Corning Incorporated", "Corning")).toBe(true);
    expect(companyMatchesContact("Databricks", "DataBricks Inc.")).toBe(true);
    expect(companyMatchesContact("OpenAI", "Anthropic")).toBe(false);
  });
});

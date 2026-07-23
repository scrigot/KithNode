import { describe, expect, it } from "vitest";
import { skillParametersFromMessage } from "./skill-parameters";

describe("find-jobs parameters", () => {
  it("accepts one or more companies without requiring a URL", () => {
    expect(skillParametersFromMessage("find_jobs", "/find-jobs OpenAI, Goldman Sachs", undefined)).toEqual({
      companies: ["OpenAI", "Goldman Sachs"],
    });
  });

  it("pairs a company with a reviewed official URL", () => {
    expect(skillParametersFromMessage("find_jobs", "/find-jobs Anthropic https://job-boards.greenhouse.io/anthropic", undefined)).toEqual({
      company: "Anthropic",
      careerUrl: "https://job-boards.greenhouse.io/anthropic",
    });
  });

  it("preserves structured parameters supplied by the UI", () => {
    expect(skillParametersFromMessage("find_jobs", "/find-jobs", { companies: ["Ramp"], includeAdjacent: false })).toEqual({
      companies: ["Ramp"],
      includeAdjacent: false,
    });
  });

  it("does not mistake a natural-language internship request for a company", () => {
    expect(skillParametersFromMessage("find_internships", "Show me summer analyst roles", undefined)).toEqual({});
  });

  it("parses explicit internship companies without changing modes", () => {
    expect(skillParametersFromMessage("find_internships", "/find-internships Goldman Sachs, Blackstone", undefined)).toEqual({
      companies: ["Goldman Sachs", "Blackstone"],
    });
  });
});

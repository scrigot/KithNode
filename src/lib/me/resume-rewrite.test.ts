import { describe, it, expect } from "vitest";
import { validateCitations, matchEvidence, missingKeywords, type Evidence } from "./resume-rewrite";

const evidence: Evidence[] = [
  { id: "ev1", kind: "project", title: "RAG support bot", detail: "Built a retrieval bot over docs with LangChain", metric: "cut tickets 30%", proofUrl: "" },
  { id: "ev2", kind: "work", title: "Data internship", detail: "Pipelines in Python and dbt", metric: "", proofUrl: "" },
  { id: "ev3", kind: "leadership", title: "AI club president", detail: "Ran weekly workshops", metric: "grew to 80 members", proofUrl: "" },
];

describe("validateCitations — deterministic guard", () => {
  it("passes a rewrite citing real evidence", () => {
    const r = validateCitations([{ before: "x", after: "Built a RAG bot, cut tickets 30%", evidenceIds: ["ev1"] }], evidence);
    expect(r[0].ok).toBe(true);
  });
  it("flags a rewrite citing nonexistent evidence (anti-fabrication)", () => {
    const r = validateCitations([{ before: "x", after: "Led a $2M project", evidenceIds: ["ghost"] }], evidence);
    expect(r[0].ok).toBe(false);
    expect(r[0].reason).toContain("unknown evidence");
  });
  it("flags an uncited rewrite", () => {
    const r = validateCitations([{ before: "x", after: "Did amazing things", evidenceIds: [] }], evidence);
    expect(r[0].ok).toBe(false);
    expect(r[0].reason).toContain("no evidence");
  });
  it("flags an empty rewrite even if cited", () => {
    const r = validateCitations([{ before: "x", after: "  ", evidenceIds: ["ev1"] }], evidence);
    expect(r[0].ok).toBe(false);
  });
});

describe("matchEvidence — JD relevance preselect", () => {
  it("ranks RAG/LangChain evidence top for an AI-eng JD", () => {
    const top = matchEvidence("Looking for an AI engineer with RAG, LangChain, retrieval experience", evidence, 2);
    expect(top[0].id).toBe("ev1");
    expect(top.length).toBeLessThanOrEqual(2);
  });
  it("returns the bank (capped) when JD has no usable tokens", () => {
    expect(matchEvidence("", evidence, 2).length).toBe(2);
  });
});

describe("missingKeywords", () => {
  it("surfaces JD terms absent from resume + evidence", () => {
    const miss = missingKeywords("Kubernetes and Terraform required for this role", "Python developer", evidence);
    expect(miss).toContain("kubernetes");
    expect(miss).toContain("terraform");
    expect(miss).not.toContain("python");
  });
});

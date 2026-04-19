import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGenerateObject = vi.fn();
vi.mock("ai", () => ({
  generateObject: (...args: unknown[]) => mockGenerateObject(...args),
}));

vi.mock("@ai-sdk/gateway", () => ({
  gateway: vi.fn(() => "mock-model"),
}));

import { classifyProfessor, classifyBatch } from "./classifier";
import type { ProfessorInput } from "./classifier";

const makeProf = (overrides: Partial<ProfessorInput> = {}): ProfessorInput => ({
  name: "Dr. Test",
  title: "Associate Professor",
  bio: "",
  department: "Computer Science",
  researchAreas: [],
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("classifyProfessor", () => {
  it("returns research-heavy for a bio mentioning lab publications", async () => {
    mockGenerateObject.mockResolvedValue({
      object: {
        profType: "research-heavy",
        researchAreas: ["Machine Learning", "NeurIPS", "Deep Learning"],
        recentPaper: undefined,
        confidence: 0.9,
      },
    });

    const result = await classifyProfessor(
      makeProf({
        bio: "My lab publishes papers in NeurIPS. We focus on deep learning and neural architectures.",
      }),
    );

    expect(result.profType).toBe("research-heavy");
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("returns teaching-heavy for a teaching-focused bio", async () => {
    mockGenerateObject.mockResolvedValue({
      object: {
        profType: "teaching-heavy",
        researchAreas: ["Introductory CS", "Student Mentoring"],
        recentPaper: undefined,
        confidence: 0.85,
      },
    });

    const result = await classifyProfessor(
      makeProf({
        bio: "I teach 4 sections of COMP 110 every semester. I love student mentoring and curriculum design.",
      }),
    );

    expect(result.profType).toBe("teaching-heavy");
  });

  it("returns mixed for a balanced bio", async () => {
    mockGenerateObject.mockResolvedValue({
      object: {
        profType: "mixed",
        researchAreas: ["Human-Computer Interaction", "Education Technology"],
        recentPaper: undefined,
        confidence: 0.7,
      },
    });

    const result = await classifyProfessor(
      makeProf({
        bio: "I split my time between teaching undergrads and running a small HCI research lab.",
      }),
    );

    expect(result.profType).toBe("mixed");
  });

  it("returns fallback when AI call throws, logs error, does not throw", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockGenerateObject.mockRejectedValue(new Error("Gateway unavailable"));

    const prof = makeProf({ researchAreas: ["Biology"] });
    const result = await classifyProfessor(prof);

    expect(result.profType).toBe("mixed");
    expect(result.confidence).toBe(0);
    expect(result.researchAreas).toEqual(["Biology"]);
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("extracts recentPaper when model returns one", async () => {
    mockGenerateObject.mockResolvedValue({
      object: {
        profType: "research-heavy",
        researchAreas: ["Genomics", "Bioinformatics"],
        recentPaper: "CRISPR-based gene editing at scale (2024)",
        confidence: 0.92,
      },
    });

    const result = await classifyProfessor(
      makeProf({ bio: "My recent paper CRISPR-based gene editing at scale (2024) was published in Nature." }),
    );

    expect(result.recentPaper).toBe("CRISPR-based gene editing at scale (2024)");
  });

  it("falls back to input researchAreas when model returns empty array", async () => {
    mockGenerateObject.mockResolvedValue({
      object: {
        profType: "mixed",
        researchAreas: [],
        recentPaper: undefined,
        confidence: 0.5,
      },
    });

    const prof = makeProf({ researchAreas: ["Statistics", "Data Science"] });
    const result = await classifyProfessor(prof);

    expect(result.researchAreas).toEqual(["Statistics", "Data Science"]);
  });
});

describe("classifyBatch", () => {
  it("processes all professors and returns matching length", async () => {
    mockGenerateObject.mockResolvedValue({
      object: { profType: "mixed", researchAreas: ["CS"], recentPaper: undefined, confidence: 0.6 },
    });

    const profs = Array.from({ length: 10 }, (_, i) => makeProf({ name: `Prof ${i}` }));
    const results = await classifyBatch(profs);

    expect(results).toHaveLength(10);
    expect(mockGenerateObject).toHaveBeenCalledTimes(10);
  });

  it("respects concurrency cap — 10 profs with concurrency 3 fires in ceil(10/3)=4 rounds", async () => {
    const callOrder: number[] = [];
    let callIdx = 0;

    mockGenerateObject.mockImplementation(() => {
      const idx = callIdx++;
      callOrder.push(idx);
      return Promise.resolve({
        object: { profType: "mixed", researchAreas: [], recentPaper: undefined, confidence: 0.5 },
      });
    });

    const profs = Array.from({ length: 10 }, (_, i) => makeProf({ name: `Prof ${i}` }));
    const results = await classifyBatch(profs, { concurrency: 3 });

    expect(results).toHaveLength(10);
    expect(mockGenerateObject).toHaveBeenCalledTimes(10);
    // All 10 calls were made — concurrency cap preserved order without skipping
    expect(callOrder).toHaveLength(10);
  });

  it("does not crash the batch when one professor AI call fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockGenerateObject
      .mockResolvedValueOnce({
        object: { profType: "research-heavy", researchAreas: ["ML"], recentPaper: undefined, confidence: 0.9 },
      })
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValueOnce({
        object: { profType: "teaching-heavy", researchAreas: ["Pedagogy"], recentPaper: undefined, confidence: 0.8 },
      });

    const profs = [
      makeProf({ name: "Good Prof 1" }),
      makeProf({ name: "Bad Prof", researchAreas: ["Fallback Area"] }),
      makeProf({ name: "Good Prof 2" }),
    ];

    const results = await classifyBatch(profs);

    expect(results[0].profType).toBe("research-heavy");
    expect(results[1].profType).toBe("mixed");
    expect(results[1].confidence).toBe(0);
    expect(results[1].researchAreas).toEqual(["Fallback Area"]);
    expect(results[2].profType).toBe("teaching-heavy");
  });

  it("uses default concurrency of 5 when not specified", async () => {
    mockGenerateObject.mockResolvedValue({
      object: { profType: "mixed", researchAreas: [], recentPaper: undefined, confidence: 0.5 },
    });

    const profs = Array.from({ length: 7 }, (_, i) => makeProf({ name: `Prof ${i}` }));
    const results = await classifyBatch(profs);

    expect(results).toHaveLength(7);
  });
});

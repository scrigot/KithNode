import { describe, it, expect } from "vitest";
import {
  sourcesForCategory,
  categoryForSource,
  ALL_CATEGORIES,
  SOURCE_TO_CATEGORY,
  type DiscoverCategory,
} from "./source-categories";

describe("source-categories", () => {
  it("sourcesForCategory returns correct sources for each category", () => {
    const professors = sourcesForCategory("professor");
    expect(professors).toContain("professor");
    expect(professors).toContain("kenan_faculty");
    expect(professors).toContain("industry_adjunct");

    const alumni = sourcesForCategory("alumni");
    expect(alumni).toContain("discover_run");
    expect(alumni).toContain("linkedin_csv");
    expect(alumni).toContain("linkedin_import");
    expect(alumni).toContain("kenan_news_alumni");

    const students = sourcesForCategory("student");
    expect(students).toContain("unc_greek_clubs");
    expect(students).toContain("unc_finance_clubs");
    expect(students).toContain("unc_student_orgs");
  });

  it("all 3 categories produce non-empty arrays", () => {
    for (const cat of ALL_CATEGORIES) {
      expect(sourcesForCategory(cat).length).toBeGreaterThan(0);
    }
  });

  it("sourcesForCategory roundtrip: every returned source maps back to the category", () => {
    for (const cat of ALL_CATEGORIES) {
      for (const src of sourcesForCategory(cat)) {
        expect(categoryForSource(src)).toBe(cat);
      }
    }
  });

  it("categoryForSource returns correct category for known sources", () => {
    expect(categoryForSource("professor")).toBe("professor");
    expect(categoryForSource("kenan_faculty")).toBe("professor");
    expect(categoryForSource("industry_adjunct")).toBe("professor");
    expect(categoryForSource("discover_run")).toBe("alumni");
    expect(categoryForSource("linkedin_csv")).toBe("alumni");
    expect(categoryForSource("unc_greek_clubs")).toBe("student");
    expect(categoryForSource("unc_finance_clubs")).toBe("student");
  });

  it("categoryForSource returns null for unknown sources", () => {
    expect(categoryForSource("outreach_status")).toBeNull();
    expect(categoryForSource("unknown_source")).toBeNull();
    expect(categoryForSource("")).toBeNull();
  });

  it("SOURCE_TO_CATEGORY covers all entries returned by sourcesForCategory", () => {
    const allMapped = ALL_CATEGORIES.flatMap(sourcesForCategory);
    const allKeys = Object.keys(SOURCE_TO_CATEGORY);
    expect(allMapped.sort()).toEqual(allKeys.sort());
  });

  it("ALL_CATEGORIES contains exactly professor, alumni, student", () => {
    expect([...ALL_CATEGORIES].sort()).toEqual(["alumni", "professor", "student"]);
  });

  it("no source maps to more than one category", () => {
    const seen = new Map<string, DiscoverCategory>();
    for (const cat of ALL_CATEGORIES) {
      for (const src of sourcesForCategory(cat)) {
        if (seen.has(src)) {
          throw new Error(`Source "${src}" maps to both "${seen.get(src)}" and "${cat}"`);
        }
        seen.set(src, cat);
      }
    }
  });
});

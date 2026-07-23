import { describe, expect, it } from "vitest";
import {
  careerDocumentCreateSchema,
  memoryCorrectionSchema,
  organizationCreateSchema,
  organizationNameKey,
  savedViewSchema,
} from "./product-records";

describe("product record contracts", () => {
  it("matches organization names without punctuation or casing drift", () => {
    expect(organizationNameKey("J.P. Morgan & Co.")).toBe("jpmorganco");
    expect(organizationNameKey("  JP Morgan Co  ")).toBe("jpmorganco");
  });

  it("supports every career document family and evidence-backed links", () => {
    const parsed = careerDocumentCreateSchema.parse({
      type: "essay",
      title: "Kenan-Flagler application essay",
      variantType: "school",
      content: { body: "Draft" },
      evidence: [{ source: "resume" }],
      links: [{ entityType: "application", entityId: "application-1", relation: "supports" }],
    });
    expect(parsed.type).toBe("essay");
    expect(parsed.links[0].entityType).toBe("application");
  });

  it("keeps saved views scoped to known workspaces", () => {
    expect(savedViewSchema.safeParse({ workspace: "people", name: "Warm paths" }).success).toBe(true);
    expect(savedViewSchema.safeParse({ workspace: "billing", name: "Not a CRM view" }).success).toBe(false);
  });

  it("accepts reversible memory corrections and rejects destructive verbs", () => {
    expect(memoryCorrectionSchema.safeParse({ action: "forget", reason: "No longer accurate" }).success).toBe(true);
    expect(memoryCorrectionSchema.safeParse({ action: "delete", reason: "No" }).success).toBe(false);
  });

  it("accepts a public organization URL", () => {
    const parsed = organizationCreateSchema.parse({ name: "Scale AI", website: "https://scale.com" });
    expect(parsed.name).toBe("Scale AI");
  });
});

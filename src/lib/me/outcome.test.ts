import { describe, expect, it } from "vitest";
import { appendMemoryNotes, mergeActionItems, outcomeDetail, sanitizeOutcomeInput } from "./outcome";

describe("sanitizeOutcomeInput", () => {
  it("cleans outcome text and newline next steps", () => {
    const data = sanitizeOutcomeInput({
      summary: "  Good chat  ",
      takeaways: "  Likes data engineering  ",
      nextSteps: " Send article \n Ask for intro ",
      stage: "warm",
    });
    expect(data).toEqual({
      summary: "Good chat",
      takeaways: "Likes data engineering",
      nextSteps: ["Send article", "Ask for intro"],
      stage: "warm",
    });
  });

  it("defaults invalid stage to met", () => {
    expect(sanitizeOutcomeInput({ stage: "bad" }).stage).toBe("met");
  });
});

describe("outcome memory helpers", () => {
  it("formats activity detail and appends memory notes", () => {
    const data = sanitizeOutcomeInput({ summary: "Good chat", takeaways: "AI consulting path", nextSteps: ["Follow up"] });
    expect(outcomeDetail(data)).toContain("Summary: Good chat");
    expect(outcomeDetail(data)).toContain("- Follow up");
    expect(appendMemoryNotes("Existing", data)).toContain("Existing");
    expect(appendMemoryNotes("Existing", data)).toContain("Coffee chat outcome");
  });

  it("dedupes new action items before existing items", () => {
    expect(mergeActionItems(["Follow up", "Old"], ["Follow up", "Send notes"])).toEqual(["Follow up", "Send notes", "Old"]);
  });
});

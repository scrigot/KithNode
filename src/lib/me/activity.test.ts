import { describe, expect, it } from "vitest";
import { activityLabel, sanitizeActivityInput } from "./activity";

describe("sanitizeActivityInput", () => {
  it("accepts known activity types and trims fields", () => {
    const activity = sanitizeActivityInput({
      type: "coffee_chat",
      title: "  Met at Alpine Bagel  ",
      detail: "  Talked about data engineering  ",
      occurredAt: "2026-06-24T12:00:00.000Z",
      meta: { pipeline: "AI Consulting" },
    });

    expect(activity.type).toBe("coffee_chat");
    expect(activity.title).toBe("Met at Alpine Bagel");
    expect(activity.detail).toBe("Talked about data engineering");
    expect(activity.occurredAt.toISOString()).toBe("2026-06-24T12:00:00.000Z");
    expect(activity.meta).toEqual({ pipeline: "AI Consulting" });
  });

  it("falls back safely for invalid input", () => {
    const activity = sanitizeActivityInput({ type: "bad", title: "", detail: ["nope"], occurredAt: "not a date" });
    expect(activity.type).toBe("note");
    expect(activity.title).toBe("Note");
    expect(activity.detail).toBe("");
    expect(activity.occurredAt).toBeInstanceOf(Date);
    expect(activity.meta).toEqual({});
  });

  it("labels common workflow events", () => {
    expect(activityLabel("linkedin_connect")).toBe("LinkedIn connect");
    expect(activityLabel("stage_change")).toBe("Stage change");
    expect(activityLabel("reply")).toBe("Reply");
    expect(activityLabel("meeting_scheduled")).toBe("Meeting scheduled");
  });
});

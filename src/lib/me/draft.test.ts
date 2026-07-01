import { describe, it, expect } from "vitest";
import { buildDraftPrompt, inferDraftMode, parseDraft, fallbackDraft, type DraftContext } from "./draft";

const ctx = (p: Partial<DraftContext> = {}): DraftContext => ({
  name: p.name ?? "Dana Reed",
  firmName: p.firmName ?? "Snowflake",
  title: p.title ?? "VP of Data",
  relationshipType: p.relationshipType ?? "",
  strategicValue: p.strategicValue ?? "",
  notes: p.notes ?? "",
  stage: p.stage ?? null,
  daysSinceTouch: p.daysSinceTouch ?? null,
  recentActivities: p.recentActivities ?? [],
});

describe("parseDraft", () => {
  it("extracts subject + body from JSON", () => {
    const d = parseDraft('ok {"subject":"Hi","body":"Hello there"}')!;
    expect(d.subject).toBe("Hi");
    expect(d.body).toBe("Hello there");
  });
  it("returns null without a body", () => {
    expect(parseDraft("no json")).toBeNull();
    expect(parseDraft('{"subject":"x","body":""}')).toBeNull();
  });
});

describe("fallbackDraft", () => {
  it("uses first name, references firm, signs off as sender", () => {
    const d = fallbackDraft(ctx(), "Sam");
    expect(d.body).toContain("Hi Dana");
    expect(d.body).toContain("Snowflake");
    expect(d.body.trim().endsWith("Sam")).toBe(true);
  });
  it("references prior history when notes exist", () => {
    const d = fallbackDraft(ctx({ notes: "met at conf" }), "Sam");
    expect(d.body.toLowerCase()).toContain("reconnect");
  });
  it("can write a follow-up fallback", () => {
    const d = fallbackDraft(ctx(), "Sam", { mode: "follow_up" });
    expect(d.subject.toLowerCase()).toContain("following up");
    expect(d.body.toLowerCase()).toContain("follow up");
  });
});

describe("inferDraftMode", () => {
  it("uses follow-up after outbound activity before a reply", () => {
    expect(
      inferDraftMode(ctx({
        stage: "reached_out",
        recentActivities: [{ type: "email_sent", title: "Sent email", detail: "", occurredAt: new Date() }],
      })),
    ).toBe("follow_up");
  });

  it("returns first after a reply has been logged", () => {
    expect(
      inferDraftMode(ctx({
        stage: "talking",
        recentActivities: [
          { type: "reply", title: "Reply", detail: "", occurredAt: new Date() },
          { type: "email_sent", title: "Sent email", detail: "", occurredAt: new Date() },
        ],
      })),
    ).toBe("first");
  });

  it("returns first after a meeting is scheduled", () => {
    expect(
      inferDraftMode(ctx({
        stage: "talking",
        recentActivities: [
          { type: "meeting_scheduled", title: "Coffee chat scheduled", detail: "", occurredAt: new Date() },
          { type: "email_sent", title: "Sent email", detail: "", occurredAt: new Date() },
        ],
      })),
    ).toBe("first");
  });
});

describe("buildDraftPrompt", () => {
  it("includes the AI-consulting framing and JSON instruction", () => {
    const p = buildDraftPrompt(ctx(), "Sam");
    expect(p).toContain("AI consulting for data services");
    expect(p).toContain('{"subject"');
  });

  it("includes style, length, framing answers, and refine instructions", () => {
    const p = buildDraftPrompt(ctx(), "Sam", {
      style: "direct but friendly",
      length: "medium",
      framing: {
        whyThisPerson: "they lead data engineering",
        desiredOutcome: "coffee chat",
        sharedContext: "UNC overlap",
        specificAsk: "15 minutes next week",
        constraints: "not salesy",
      },
      positioning: "UNC student learning AI engineering",
      goals: "understand how AI consultants build careers",
      previousDraft: { subject: "Old", body: "Old body" },
      refine: "make it warmer",
    });
    expect(p).toContain("direct but friendly");
    expect(p).toContain("medium");
    expect(p).toContain("they lead data engineering");
    expect(p).toContain("UNC student learning AI engineering");
    expect(p).toContain("understand how AI consultants build careers");
    expect(p).toContain("PREVIOUS DRAFT");
    expect(p).toContain("make it warmer");
  });

  it("includes recent activity and follow-up instructions", () => {
    const p = buildDraftPrompt(
      ctx({
        stage: "reached_out",
        recentActivities: [{ type: "email_sent", title: "Sent intro", detail: "Asked for 15 minutes", occurredAt: "2026-06-20T00:00:00.000Z" }],
      }),
      "Sam",
      { mode: "follow_up" },
    );
    expect(p).toContain("follow-up");
    expect(p).toContain("Sent intro");
    expect(p).toContain("Asked for 15 minutes");
    expect(p).toContain("do not pretend this is the first note");
  });
});

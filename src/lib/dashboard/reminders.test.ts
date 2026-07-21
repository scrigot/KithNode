import { describe, expect, it } from "vitest";
import { calculateReminders } from "./reminders";

const NOW = Date.parse("2026-07-10T12:00:00.000Z");

describe("calculateReminders", () => {
  it("uses the latest activity and applies stage-specific thresholds", () => {
    const reminders = calculateReminders([
      {
        contactId: "c1",
        stage: "email_sent",
        addedAt: "2026-06-01T12:00:00.000Z",
        updatedAt: "2026-07-02T12:00:00.000Z",
        lastTouchAt: null,
        contact: { name: "Alex", firmName: "Acme" },
      },
    ], NOW);
    expect(reminders).toMatchObject([
      { contact_id: "c1", days_since_activity: 8, urgency: "normal" },
    ]);
  });

  it("ignores completed and malformed records", () => {
    expect(calculateReminders([
      {
        contactId: "c2",
        stage: "meeting_set",
        addedAt: "2026-01-01T00:00:00.000Z",
        updatedAt: null,
        lastTouchAt: null,
        contact: { name: "Taylor", firmName: "Acme" },
      },
    ], NOW)).toEqual([]);
  });
});

import { describe, it, expect } from "vitest";
import { selectOverdueLeads, OVERDUE_DAYS } from "./overdue";

const NOW = Date.UTC(2026, 5, 16, 12, 0, 0); // fixed clock
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString();

describe("selectOverdueLeads", () => {
  it("returns leads >= 7 days old, excluding resolved stages", () => {
    const out = selectOverdueLeads(
      [
        { contactId: "a", stage: "email_sent", addedAt: daysAgo(10) },
        { contactId: "b", stage: "connected", addedAt: daysAgo(2) }, // too recent
        { contactId: "c", stage: "responded", addedAt: daysAgo(30) }, // resolved
        { contactId: "d", stage: "meeting_set", addedAt: daysAgo(30) }, // resolved
        { contactId: "e", stage: "follow_up", addedAt: daysAgo(8) },
      ],
      NOW,
    );
    expect(out.map((o) => o.contactId)).toEqual(["a", "e"]); // sorted by days desc
    expect(out[0]).toMatchObject({ contactId: "a", stage: "email_sent", days: 10 });
  });

  it("is inclusive at exactly the threshold", () => {
    const out = selectOverdueLeads(
      [{ contactId: "x", stage: "email_sent", addedAt: daysAgo(OVERDUE_DAYS) }],
      NOW,
    );
    expect(out).toHaveLength(1);
    expect(out[0].days).toBe(OVERDUE_DAYS);
  });

  it("excludes resolved stages case-insensitively", () => {
    const out = selectOverdueLeads(
      [{ contactId: "y", stage: "RESPONDED", addedAt: daysAgo(20) }],
      NOW,
    );
    expect(out).toHaveLength(0);
  });

  it("defaults a missing stage to researched (counts as overdue)", () => {
    const out = selectOverdueLeads(
      [{ contactId: "z", stage: null, addedAt: daysAgo(9) }],
      NOW,
    );
    expect(out).toEqual([{ contactId: "z", stage: "researched", days: 9 }]);
  });

  it("returns empty for no rows", () => {
    expect(selectOverdueLeads([], NOW)).toEqual([]);
  });
});

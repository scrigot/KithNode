import { beforeEach, describe, expect, it, vi } from "vitest";

const { from } = vi.hoisted(() => ({ from: vi.fn() }));

vi.mock("@/lib/supabase", () => ({ supabase: { from } }));
vi.mock("@/lib/integrations/read", () => ({
  connectedCalendarContext: vi.fn(async () => []),
}));

import { buildAssistantContext } from "./context";

describe("buildAssistantContext", () => {
  beforeEach(() => {
    from.mockReset();
    const results: Record<string, { data: unknown; error: null }> = {
      User: {
        data: {
          name: "Sam",
          university: "UNC",
          graduationYear: 2028,
          targetIndustries: "AI",
          targetFirms: "Scale AI",
          targetLocations: "Raleigh",
          onboardingGoal: "Find an internship",
          onboardingTimeline: "Summer 2027",
        },
        error: null,
      },
      CareerGoal: { data: [], error: null },
      PipelineEntry: { data: [], error: null },
      Opportunity: {
        data: [
          {
            id: "scale-ai",
            company: "Scale AI",
            role: "AI Builder Intern",
            status: "preparing",
            priority: "high",
            opportunityType: "internship",
            deadline: "2026-08-31T00:00:00.000Z",
            nextAction: "Tailor resume and identify a warm path",
          },
        ],
        error: null,
      },
      AssistantMemory: { data: [], error: null },
      Recommendation: { data: [], error: null },
      AlumniContact: { data: [], error: null },
      Pipeline: { data: [], error: null },
    };

    from.mockImplementation((table: string) => {
      const builder: Record<string, ReturnType<typeof vi.fn>> = {};
      for (const method of ["select", "eq", "neq", "order"]) {
        builder[method] = vi.fn(() => builder);
      }
      builder.limit = vi.fn(async () => results[table] || { data: [], error: null });
      builder.in = vi.fn(async () => results[table] || { data: [], error: null });
      builder.maybeSingle = vi.fn(async () => results[table] || { data: null, error: null });
      return builder;
    });
  });

  it("grounds the assistant in the same canonical applications used by the workspace", async () => {
    const context = await buildAssistantContext("user-1");

    expect(from).toHaveBeenCalledWith("Opportunity");
    expect(context.applications).toEqual([
      expect.objectContaining({
        company: "Scale AI",
        status: "preparing",
        nextAction: "Tailor resume and identify a warm path",
      }),
    ]);
  });
});

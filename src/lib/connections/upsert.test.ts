import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Supabase module before importing upsert
vi.mock("@/lib/supabase", () => {
  const mockFrom = vi.fn();
  return {
    supabase: {
      from: mockFrom,
    },
  };
});

import { upsertAlumniContact } from "./upsert";
import { supabase } from "@/lib/supabase";
import type { AlumniSeed } from "./types";

const baseSeed: AlumniSeed = {
  name: "Christopher Bingham",
  title: "Professor of Strategy and Entrepreneurship",
  firmName: "UNC Kenan-Flagler",
  email: "bingham@kenan-flagler.unc.edu",
  sourceUrl: "https://www.kenan-flagler.unc.edu/faculty/directory/christopher-bingham/",
  bio: "Professor of strategy...",
  university: "UNC",
  location: "Chapel Hill, NC",
  affiliations: "proftype:research-heavy,strategy",
  source: "kenan_faculty",
};

const mockFrom = vi.mocked(supabase.from);

function makeMockChain(selectReturn: unknown, updateReturn?: unknown, insertReturn?: unknown) {
  const selectChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(selectReturn),
  };

  const updateChain = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue(updateReturn ?? { error: null }),
  };

  const insertChain = {
    insert: vi.fn().mockResolvedValue(insertReturn ?? { error: null }),
  };

  return { selectChain, updateChain, insertChain };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("upsertAlumniContact", () => {
  it("inserts when no existing record found (email + name both miss)", async () => {
    const { selectChain, insertChain } = makeMockChain({ data: null, error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "AlumniContact") {
        return {
          select: () => selectChain,
          insert: insertChain.insert,
        } as unknown as ReturnType<typeof supabase.from>;
      }
      throw new Error(`Unexpected table: ${table}`);
    });

    selectChain.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null }) // email check
      .mockResolvedValueOnce({ data: null, error: null }); // name+firm check

    const result = await upsertAlumniContact(baseSeed, "sam@test.com");
    expect(result).toBe("inserted");
    expect(insertChain.insert).toHaveBeenCalledOnce();
    const insertArg = insertChain.insert.mock.calls[0][0];
    expect(insertArg.graduationYear).toBe(0);
    expect(insertArg.name).toBe("Christopher Bingham");
    expect(insertArg.source).toBe("kenan_faculty");
  });

  it("updates when email match found", async () => {
    const { selectChain, updateChain } = makeMockChain(
      { data: { id: "existing-id-123" }, error: null },
    );

    mockFrom.mockImplementation(() => ({
      select: () => selectChain,
      update: () => updateChain,
    }) as unknown as ReturnType<typeof supabase.from>);

    selectChain.maybeSingle
      .mockResolvedValueOnce({ data: { id: "existing-id-123" }, error: null }); // email hit

    const result = await upsertAlumniContact(baseSeed, "sam@test.com");
    expect(result).toBe("updated");
  });

  it("updates when name+firmName match found (no email on record)", async () => {
    const seedNoEmail = { ...baseSeed, email: "" };

    // When email is empty, the first from() call is the name+firmName select.
    // It finds the record, so the second from() call is the update.
    const nameSelectChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: "name-match-456" }, error: null }),
    };
    const updateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          select: () => nameSelectChain,
        } as unknown as ReturnType<typeof supabase.from>;
      }
      // Second call: update
      return {
        update: () => updateChain,
      } as unknown as ReturnType<typeof supabase.from>;
    });

    const result = await upsertAlumniContact(seedNoEmail, "sam@test.com");
    expect(result).toBe("updated");
  });

  it("throws when Supabase returns an error on insert", async () => {
    const { selectChain } = makeMockChain({ data: null, error: null });

    mockFrom.mockImplementation(() => ({
      select: () => selectChain,
      insert: vi.fn().mockResolvedValue({ error: { message: "insert failed" } }),
    }) as unknown as ReturnType<typeof supabase.from>);

    selectChain.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: null });

    await expect(upsertAlumniContact(baseSeed, "sam@test.com")).rejects.toThrow("insert failed");
  });
});

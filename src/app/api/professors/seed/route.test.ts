import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ────────────────────────────────────────────────────────────

const supabaseState = {
  existingByEmail: null as { id: string } | null,
  existingByName: null as { id: string } | null,
  insertCalls: 0,
  updateCalls: 0,
  insertError: null as Error | null,
  reset(): void {
    this.existingByEmail = null;
    this.existingByName = null;
    this.insertCalls = 0;
    this.updateCalls = 0;
    this.insertError = null;
  },
};

vi.mock("@/lib/supabase", () => {
  // The route does at most two select chains per professor:
  //   1. .eq("email", ...).eq("importedByUserId", ...).maybeSingle()
  //   2. .eq("name", ...).eq("firmName", ...).eq("importedByUserId", ...).maybeSingle()
  // We detect which lookup is in-flight by inspecting the first field name
  // passed to .eq() on the chain. "email" -> email lookup, "name" -> name lookup.

  function makeSelectChain(): {
    _firstField: string;
    eq: ReturnType<typeof vi.fn>;
    maybeSingle: ReturnType<typeof vi.fn>;
  } {
    let firstField = "";
    const chain = {
      _firstField: firstField,
      eq: vi.fn((field: string) => {
        if (!firstField) firstField = field;
        return chain;
      }),
      maybeSingle: vi.fn(() => {
        const result =
          firstField === "email"
            ? supabaseState.existingByEmail
            : supabaseState.existingByName;
        return Promise.resolve({ data: result });
      }),
    };
    return chain;
  }

  return {
    supabase: {
      from: vi.fn(() => ({
        select: vi.fn(() => makeSelectChain()),
        insert: vi.fn(() => {
          supabaseState.insertCalls++;
          return Promise.resolve({ error: supabaseState.insertError });
        }),
        update: vi.fn(() => ({
          eq: vi.fn(() => {
            supabaseState.updateCalls++;
            return Promise.resolve({ error: null });
          }),
        })),
      })),
    },
  };
});

const mockGetUserId = vi.fn();
vi.mock("@/lib/get-user", () => ({
  getUserId: () => mockGetUserId(),
}));

const mockScrapeAllDepartments = vi.fn();
vi.mock("@/lib/professors/scraper", () => ({
  scrapeAllDepartments: (...args: unknown[]) => mockScrapeAllDepartments(...args),
}));

const mockClassifyBatch = vi.fn();
vi.mock("@/lib/professors/classifier", () => ({
  classifyBatch: (...args: unknown[]) => mockClassifyBatch(...args),
}));

import { POST, type SeedEvent } from "./route";

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost/api/professors/seed", {
    method: "POST",
  });
}

function makeAbortableRequest(): { request: NextRequest; abort: () => void } {
  const controller = new AbortController();
  const request = new NextRequest("http://localhost/api/professors/seed", {
    method: "POST",
    signal: controller.signal,
  });
  return { request, abort: () => controller.abort() };
}

async function readNdjson(res: Response): Promise<SeedEvent[]> {
  const events: SeedEvent[] = [];
  if (!res.body) return events;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (line) events.push(JSON.parse(line) as SeedEvent);
    }
  }
  if (buffer.trim()) events.push(JSON.parse(buffer.trim()) as SeedEvent);
  return events;
}

function findDone(events: SeedEvent[]): Extract<SeedEvent, { type: "done" }> {
  const done = events.find((e) => e.type === "done");
  if (!done) throw new Error("no done event in stream: " + JSON.stringify(events));
  return done as Extract<SeedEvent, { type: "done" }>;
}

const MOCK_PROFESSORS = [
  {
    name: "Dr. Alice Smith",
    email: "asmith@cs.unc.edu",
    title: "Associate Professor of Computer Science",
    department: "UNC CS",
    bio: "Researches machine learning and NLP.",
    profileUrl: "https://cs.unc.edu/people/alice-smith",
    researchAreas: ["machine-learning", "nlp"],
  },
  {
    name: "Dr. Bob Jones",
    email: "bjones@econ.unc.edu",
    title: "Professor of Economics",
    department: "UNC Economics",
    bio: "Specializes in behavioral economics.",
    profileUrl: "https://econ.unc.edu/people/bob-jones",
    researchAreas: ["behavioral-economics"],
  },
  {
    name: "Dr. Carol Lee",
    email: "",
    title: "Assistant Professor of Statistics",
    department: "UNC STOR",
    bio: "Works on Bayesian inference.",
    profileUrl: "https://stor.unc.edu/people/carol-lee",
    researchAreas: ["bayesian-inference"],
  },
];

const MOCK_CLASSIFICATIONS = [
  { profType: "research-heavy" as const, researchAreas: ["machine-learning", "nlp"], recentPaper: "Attention Is All You Need", confidence: 0.9 },
  { profType: "mixed" as const, researchAreas: ["behavioral-economics"], confidence: 0.75 },
  { profType: "teaching-heavy" as const, researchAreas: ["bayesian-inference"], confidence: 0.8 },
];

beforeEach(() => {
  supabaseState.reset();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/professors/seed", () => {
  it("returns 401 when no user is authed", async () => {
    mockGetUserId.mockResolvedValue("anonymous");
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("unauthorized");
    // No stream opened — body is plain JSON
    expect(res.headers.get("content-type")).toContain("application/json");
  });

  it("returns 401 when getUserId returns null", async () => {
    mockGetUserId.mockResolvedValue(null);
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
  });

  it("happy path: 3 profs scraped, classified, inserted", async () => {
    mockGetUserId.mockResolvedValue("test@unc.edu");
    mockScrapeAllDepartments.mockResolvedValue(MOCK_PROFESSORS);
    mockClassifyBatch.mockResolvedValue(MOCK_CLASSIFICATIONS);

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/x-ndjson");

    const events = await readNdjson(res);
    const done = findDone(events);

    expect(done.scraped).toBe(3);
    expect(done.classified).toBe(3);
    expect(done.inserted).toBe(3);
    expect(done.updated).toBe(0);
    expect(done.failed).toBe(0);
    expect(done.contacts).toHaveLength(3);
    expect(done.contacts[0]).toMatchObject({
      name: "Dr. Alice Smith",
      department: "UNC CS",
      profType: "research-heavy",
      hasEmail: true,
    });
    expect(done.contacts[2]).toMatchObject({
      name: "Dr. Carol Lee",
      hasEmail: false,
    });

    expect(supabaseState.insertCalls).toBe(3);
    expect(supabaseState.updateCalls).toBe(0);

    // Stage events present, content-type correct, progress monotone
    const stageEvents = events.filter((e) => e.type === "stage");
    expect(stageEvents.length).toBeGreaterThanOrEqual(3);

    let prev = 0;
    for (const e of events) {
      if (e.type === "stage" || e.type === "done") {
        expect(e.progress).toBeGreaterThanOrEqual(prev);
        prev = e.progress;
      }
    }
  });

  it("dedup: prof with email found in DB -> update; prof with no email not found -> insert", async () => {
    mockGetUserId.mockResolvedValue("test@unc.edu");
    // Prof 0 has email (asmith@cs.unc.edu), Prof 2 has no email.
    mockScrapeAllDepartments.mockResolvedValue([MOCK_PROFESSORS[0], MOCK_PROFESSORS[2]]);
    mockClassifyBatch.mockResolvedValue([MOCK_CLASSIFICATIONS[0], MOCK_CLASSIFICATIONS[2]]);

    // Email lookup for Prof 0 finds existing row.
    // Prof 2 has no email so email lookup is skipped; name lookup returns null.
    supabaseState.existingByEmail = { id: "existing-prof-id" };
    supabaseState.existingByName = null;

    const res = await POST(makeRequest());
    const events = await readNdjson(res);
    const done = findDone(events);

    expect(done.inserted).toBe(1);
    expect(done.updated).toBe(1);
    expect(done.failed).toBe(0);
    expect(supabaseState.updateCalls).toBe(1);
    expect(supabaseState.insertCalls).toBe(1);
  });

  it("dedup: prof with no email falls back to name+firmName lookup -> update", async () => {
    mockGetUserId.mockResolvedValue("test@unc.edu");
    // Carol Lee has no email
    mockScrapeAllDepartments.mockResolvedValue([MOCK_PROFESSORS[2]]);
    mockClassifyBatch.mockResolvedValue([MOCK_CLASSIFICATIONS[2]]);

    // Email lookup returns nothing (email is ""), name lookup finds existing
    supabaseState.existingByEmail = null;
    supabaseState.existingByName = { id: "carol-existing-id" };

    const res = await POST(makeRequest());
    const events = await readNdjson(res);
    const done = findDone(events);

    expect(done.updated).toBe(1);
    expect(done.inserted).toBe(0);
    expect(supabaseState.updateCalls).toBe(1);
    expect(supabaseState.insertCalls).toBe(0);
  });

  it("abort mid-pipeline emits aborted event and stops upserts", async () => {
    mockGetUserId.mockResolvedValue("test@unc.edu");

    const { request, abort } = makeAbortableRequest();

    // Make scrape hang until we abort, then resolve.
    // This guarantees abort fires while the route is suspended in scrape,
    // so aborted.value=true before the stage-boundary check after scrape.
    let resolveScrape!: (v: typeof MOCK_PROFESSORS) => void;
    const scrapePromise = new Promise<typeof MOCK_PROFESSORS>((res) => {
      resolveScrape = res;
    });
    mockScrapeAllDepartments.mockReturnValue(scrapePromise);
    mockClassifyBatch.mockResolvedValue(MOCK_CLASSIFICATIONS);

    const responsePromise = POST(request);

    // Let the route reach the scrape await, then abort, then resolve scrape.
    await Promise.resolve(); // flush microtasks so route starts
    abort();
    resolveScrape(MOCK_PROFESSORS);

    const res = await responsePromise;
    const events = await readNdjson(res);

    expect(events.some((e) => e.type === "aborted")).toBe(true);
    expect(supabaseState.insertCalls).toBe(0);
    expect(supabaseState.updateCalls).toBe(0);
  });

  it("scrape returns [] -> pipeline proceeds, done with 0 counts", async () => {
    mockGetUserId.mockResolvedValue("test@unc.edu");
    mockScrapeAllDepartments.mockResolvedValue([]);
    mockClassifyBatch.mockResolvedValue([]);

    const res = await POST(makeRequest());
    const events = await readNdjson(res);
    const done = findDone(events);

    expect(done.scraped).toBe(0);
    expect(done.classified).toBe(0);
    expect(done.inserted).toBe(0);
    expect(done.updated).toBe(0);
    expect(done.failed).toBe(0);
    expect(done.contacts).toHaveLength(0);
  });

  it("supabase insert error increments failed, other profs still processed", async () => {
    mockGetUserId.mockResolvedValue("test@unc.edu");
    mockScrapeAllDepartments.mockResolvedValue(MOCK_PROFESSORS.slice(0, 2));
    mockClassifyBatch.mockResolvedValue(MOCK_CLASSIFICATIONS.slice(0, 2));

    supabaseState.insertError = new Error("RLS denied");

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    const events = await readNdjson(res);
    const done = findDone(events);

    // Both failed because insertError is set for all inserts
    expect(done.failed).toBe(2);
    expect(done.inserted).toBe(0);
    expect(done.updated).toBe(0);
  });

  it("response headers match expected streaming shape", async () => {
    mockGetUserId.mockResolvedValue("test@unc.edu");
    mockScrapeAllDepartments.mockResolvedValue([]);
    mockClassifyBatch.mockResolvedValue([]);

    const res = await POST(makeRequest());
    expect(res.headers.get("content-type")).toBe("application/x-ndjson; charset=utf-8");
    expect(res.headers.get("cache-control")).toBe("no-cache, no-transform");
    expect(res.headers.get("x-accel-buffering")).toBe("no");
  });
});

import { describe, it, expect } from "vitest";
import { classifyCareer } from "./classify-career";
import { roleToTrack, ALL_ROLES, ALL_TRACKS } from "@/lib/data/career-tracks";

describe("classifyCareer — title precision (highest priority)", () => {
  it("software engineer -> CS/Tech / Software Engineering", () => {
    expect(classifyCareer({ title: "Senior Software Engineer" })).toEqual({
      track: "CS/Tech",
      role: "Software Engineering",
    });
  });

  it("software developer also maps to Software Engineering", () => {
    expect(classifyCareer({ title: "Full Stack Software Developer" })).toEqual({
      track: "CS/Tech",
      role: "Software Engineering",
    });
  });

  it("data scientist -> Data Science / Data Science", () => {
    expect(classifyCareer({ title: "Data Scientist II" })).toEqual({
      track: "Data Science",
      role: "Data Science",
    });
  });

  it("data engineer -> Data Science / Data Engineering", () => {
    expect(classifyCareer({ title: "Staff Data Engineer" })).toEqual({
      track: "Data Science",
      role: "Data Engineering",
    });
  });

  it("quant -> Data Science / Quant", () => {
    expect(classifyCareer({ title: "Quantitative Researcher" })).toEqual({
      track: "Data Science",
      role: "Quant",
    });
  });

  it("ml engineer -> AI / ML Engineer (beats generic engineer)", () => {
    expect(classifyCareer({ title: "ML Engineer" })).toEqual({
      track: "AI",
      role: "ML Engineer",
    });
  });

  it("ai engineer -> AI / AI Engineer", () => {
    expect(classifyCareer({ title: "AI Engineer, Applied" })).toEqual({
      track: "AI",
      role: "AI Engineer",
    });
  });

  it("ai research -> AI / AI Research", () => {
    expect(classifyCareer({ title: "AI Researcher" })).toEqual({
      track: "AI",
      role: "AI Research",
    });
    expect(classifyCareer({ title: "ML Research Scientist" })).toEqual({
      track: "AI",
      role: "AI Research",
    });
  });

  it("product manager -> CS/Tech / Product Management", () => {
    expect(classifyCareer({ title: "Senior Product Manager" })).toEqual({
      track: "CS/Tech",
      role: "Product Management",
    });
  });

  it("investment banking / ib analyst -> Finance / Investment Banking", () => {
    expect(classifyCareer({ title: "Investment Banking Analyst" })).toEqual({
      track: "Finance",
      role: "Investment Banking",
    });
    expect(classifyCareer({ title: "IB Analyst" })).toEqual({
      track: "Finance",
      role: "Investment Banking",
    });
  });

  it("private equity / venture / trading / equity research / wealth / consultant", () => {
    expect(classifyCareer({ title: "Private Equity Associate" })).toEqual({
      track: "Finance",
      role: "Private Equity",
    });
    expect(classifyCareer({ title: "Venture Partner" })).toEqual({
      track: "Finance",
      role: "Venture Capital",
    });
    expect(classifyCareer({ title: "Equity Trader" })).toEqual({
      track: "Finance",
      role: "Sales & Trading",
    });
    expect(classifyCareer({ title: "Equity Research Associate" })).toEqual({
      track: "Finance",
      role: "Equity Research",
    });
    expect(classifyCareer({ title: "Wealth Advisor" })).toEqual({
      track: "Finance",
      role: "Wealth Management",
    });
    expect(classifyCareer({ title: "Management Consultant" })).toEqual({
      track: "Consulting",
      role: "Management Consulting",
    });
  });
});

describe("classifyCareer — new AI + CS/Tech roles (title precision)", () => {
  it("Forward Deployed Engineer @ Anthropic -> AI / Applied AI (title beats firm)", () => {
    expect(
      classifyCareer({ title: "Forward Deployed Engineer", firmName: "Anthropic" }),
    ).toEqual({ track: "AI", role: "Applied AI" });
  });

  it("solutions architect at an AI lab -> AI / Applied AI, not CS/Tech Solutions Engineering", () => {
    expect(
      classifyCareer({ title: "AI Solutions Architect", firmName: "OpenAI" }),
    ).toEqual({ track: "AI", role: "Applied AI" });
  });

  it("ML Systems Engineer -> AI / ML Infrastructure", () => {
    expect(classifyCareer({ title: "ML Systems Engineer" })).toEqual({
      track: "AI",
      role: "ML Infrastructure",
    });
    expect(classifyCareer({ title: "Inference Performance Engineer" })).toEqual({
      track: "AI",
      role: "ML Infrastructure",
    });
    expect(classifyCareer({ title: "GPU Kernel Engineer" })).toEqual({
      track: "AI",
      role: "ML Infrastructure",
    });
  });

  it("alignment / safeguards / trust & safety -> AI / AI Safety", () => {
    expect(classifyCareer({ title: "Alignment Research Scientist" })).toEqual({
      track: "AI",
      role: "AI Safety",
    });
    expect(classifyCareer({ title: "Safeguards Engineer" })).toEqual({
      track: "AI",
      role: "AI Safety",
    });
    expect(classifyCareer({ title: "Trust and Safety Lead" })).toEqual({
      track: "AI",
      role: "AI Safety",
    });
  });

  it("SRE @ Meta -> CS/Tech / Infrastructure / DevOps (title beats firm)", () => {
    expect(
      classifyCareer({ title: "Site Reliability Engineer", firmName: "Meta" }),
    ).toEqual({ track: "CS/Tech", role: "Infrastructure / DevOps" });
    expect(classifyCareer({ title: "Senior DevOps Engineer" })).toEqual({
      track: "CS/Tech",
      role: "Infrastructure / DevOps",
    });
  });

  it("Sales Engineer -> CS/Tech / Solutions Engineering", () => {
    expect(classifyCareer({ title: "Sales Engineer" })).toEqual({
      track: "CS/Tech",
      role: "Solutions Engineering",
    });
  });

  it("TPM @ Google -> CS/Tech / Technical Program Management (title beats firm)", () => {
    expect(
      classifyCareer({ title: "Technical Program Manager", firmName: "Google" }),
    ).toEqual({ track: "CS/Tech", role: "Technical Program Management" });
    expect(classifyCareer({ title: "Senior TPM" })).toEqual({
      track: "CS/Tech",
      role: "Technical Program Management",
    });
  });
});

describe("classifyCareer: Healthcare / Law / Marketing & Sales lanes (title precision)", () => {
  it("Registered Nurse -> Healthcare / Nursing", () => {
    expect(classifyCareer({ title: "Registered Nurse" })).toEqual({
      track: "Healthcare",
      role: "Nursing",
    });
  });

  it("Litigation Associate -> Law / Litigation", () => {
    expect(classifyCareer({ title: "Litigation Associate" })).toEqual({
      track: "Law",
      role: "Litigation",
    });
  });

  it("Brand Manager -> Marketing & Sales / Brand", () => {
    expect(classifyCareer({ title: "Brand Manager" })).toEqual({
      track: "Marketing & Sales",
      role: "Brand",
    });
  });

  it("Account Executive -> Marketing & Sales / Sales / Business Development", () => {
    expect(classifyCareer({ title: "Account Executive" })).toEqual({
      track: "Marketing & Sales",
      role: "Sales / Business Development",
    });
  });

  it("REGRESSION: 'Sales Engineer' stays CS/Tech / Solutions Engineering (not stolen by Marketing rules)", () => {
    expect(classifyCareer({ title: "Sales Engineer" })).toEqual({
      track: "CS/Tech",
      role: "Solutions Engineering",
    });
  });

  it("REGRESSION: a finance 'MD' (Managing Director) is NOT classified as Healthcare", () => {
    const result = classifyCareer({ title: "MD", firmName: "Goldman Sachs" });
    expect(result.track).not.toBe("Healthcare");
    expect(result).toEqual({ track: "Finance", role: "Investment Banking" });
  });
});

describe("classifyCareer — big-tech firm fallback (only when title is silent)", () => {
  it("untitled person @ SpaceX -> CS/Tech track, empty role", () => {
    expect(classifyCareer({ title: "Member of Technical Staff", firmName: "SpaceX" })).toEqual({
      track: "CS/Tech",
      role: "",
    });
  });

  it("vague title @ Google / Meta / Apple -> CS/Tech track, empty role", () => {
    expect(classifyCareer({ title: "Analyst", firmName: "Google" })).toEqual({
      track: "CS/Tech",
      role: "",
    });
    expect(classifyCareer({ title: "Generalist", firmName: "Meta" })).toEqual({
      track: "CS/Tech",
      role: "",
    });
    expect(classifyCareer({ title: "Specialist", firmName: "Apple" })).toEqual({
      track: "CS/Tech",
      role: "",
    });
  });
});

describe("classifyCareer — firm tier fallback (only when title is silent)", () => {
  it("frontier AI lab -> AI track, empty role (title doesn't resolve role)", () => {
    expect(classifyCareer({ title: "Member of Technical Staff", firmName: "Anthropic" })).toEqual({
      track: "AI",
      role: "",
    });
  });

  it("title still wins over firm: AI engineer at Goldman stays AI", () => {
    expect(classifyCareer({ title: "AI Engineer", firmName: "Goldman Sachs" })).toEqual({
      track: "AI",
      role: "AI Engineer",
    });
  });

  it("bulge bracket firm with vague title -> Finance / Investment Banking", () => {
    expect(classifyCareer({ title: "Analyst", firmName: "Goldman Sachs" })).toEqual({
      track: "Finance",
      role: "Investment Banking",
    });
  });

  it("mega PE firm -> Finance / Private Equity", () => {
    expect(classifyCareer({ title: "Associate", firmName: "Blackstone" })).toEqual({
      track: "Finance",
      role: "Private Equity",
    });
  });

  it("hedge fund firm -> Finance / Hedge Fund", () => {
    expect(classifyCareer({ title: "Analyst", firmName: "Citadel" })).toEqual({
      track: "Finance",
      role: "Hedge Fund",
    });
  });

  it("MBB firm -> Consulting / Management Consulting", () => {
    expect(classifyCareer({ title: "Associate", firmName: "McKinsey & Company" })).toEqual({
      track: "Consulting",
      role: "Management Consulting",
    });
  });

  it("skills can surface the AI signal when the title is vague", () => {
    expect(classifyCareer({ title: "Member of Staff", skills: "Machine Learning Engineer" })).toEqual({
      track: "AI",
      role: "ML Engineer",
    });
  });
});

describe("classifyCareer — unknown", () => {
  it("returns empty {track,role} for an unrecognized title + firm", () => {
    expect(classifyCareer({ title: "Barista", firmName: "Local Coffee Co" })).toEqual({
      track: "",
      role: "",
    });
  });

  it("returns empty for all-empty input", () => {
    expect(classifyCareer({})).toEqual({ track: "", role: "" });
  });
});

describe("career-tracks helpers", () => {
  it("roleToTrack maps every role to a valid track and unknowns to ''", () => {
    for (const role of ALL_ROLES) {
      expect(ALL_TRACKS).toContain(roleToTrack(role));
    }
    expect(roleToTrack("Not A Real Role")).toBe("");
  });

  it("every classifier-produced role belongs to its produced track", () => {
    const c = classifyCareer({ title: "Data Engineer" });
    expect(roleToTrack(c.role)).toBe(c.track);
  });
});

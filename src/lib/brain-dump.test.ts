import { describe, it, expect } from "vitest";
import {
  parseBrainDumpCSV,
  brainDumpRowToContact,
  buildBrainDumpPrompt,
  BRAIN_DUMP_HEADER,
} from "./brain-dump";

const SAMPLE = `name,company,title,school,major,clubs,greek_org,hometown,high_school,skills,relationship,closeness,notes
Adler Rice,Mizuho,Incoming 2027 Sales and Trading Summer Analyst,UNC Chapel Hill,,Finance Society,Chi Phi,,,,UNC Chi Phi brother,friend,
Sam Malone,Chi Phi Fraternity,Event Coordinator,UNC Chapel Hill,,Finance Society,Chi Phi,"Raleigh, NC",Broughton High School,,UNC Chi Phi brother,friend,swam like me
Arjun Naidu,"CTW Venture Partners, LLC",Associate in Training,UNC Chapel Hill,,Finance Society,Chi Phi,,,,UNC Chi Phi brother,friend,
Philippe Didisheim,Anvil Partners,Partner,UNC Chapel Hill,,,Chi Phi,,,,UNC connection,acquaintance,
Briston Blair,Comfort Systems USA,"Senior Vice President, Innovation & Strategy | Digital & Workforce Transformation, Operations, M&A",UNC Chapel Hill,,,,,,,CSI work contact,close,`;

describe("parseBrainDumpCSV", () => {
  it("parses the real prompt output, preserving quoted commas and pipes", () => {
    const rows = parseBrainDumpCSV(SAMPLE);
    expect(rows).toHaveLength(5);
    const sam = rows[1];
    expect(sam.name).toBe("Sam Malone");
    expect(sam.hometown).toBe("Raleigh, NC");
    expect(sam.high_school).toBe("Broughton High School");
    expect(sam.notes).toBe("swam like me");
    expect(rows[2].company).toBe("CTW Venture Partners, LLC");
    expect(rows[4].title).toContain("Senior Vice President");
    expect(rows[4].title).toContain("| Digital & Workforce Transformation, Operations, M&A");
  });

  it("strips a markdown code fence and tolerates preamble", () => {
    const fenced = "```csv\n" + SAMPLE + "\n```";
    expect(parseBrainDumpCSV(fenced)).toHaveLength(5);
    const withPreamble = "Here is your CSV:\n\n" + SAMPLE;
    expect(parseBrainDumpCSV(withPreamble)).toHaveLength(5);
  });

  it("maps by header name so column reordering still works", () => {
    const reordered = `closeness,name,greek_org,school\nfriend,Jane Doe,Chi Phi,Duke`;
    const rows = parseBrainDumpCSV(reordered);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Jane Doe");
    expect(rows[0].greek_org).toBe("Chi Phi");
    expect(rows[0].school).toBe("Duke");
    expect(rows[0].company).toBe("");
  });

  it("drops rows without a name and handles empty input", () => {
    expect(parseBrainDumpCSV("name,company\n,Acme\nReal Person,Acme")).toHaveLength(1);
    expect(parseBrainDumpCSV("")).toEqual([]);
    expect(parseBrainDumpCSV("no header here\njust,text")).toEqual([]);
  });
});

describe("brainDumpRowToContact", () => {
  const rows = parseBrainDumpCSV(SAMPLE);

  it("maps school to education + university and folds relationship + notes into passions", () => {
    const sam = brainDumpRowToContact(rows[1]);
    expect(sam.education).toBe("UNC Chapel Hill");
    expect(sam.university).toBe("UNC Chapel Hill");
    expect(sam.greekOrg).toBe("Chi Phi");
    expect(sam.clubs).toBe("Finance Society");
    expect(sam.highSchool).toBe("Broughton High School");
    expect(sam.hometown).toBe("Raleigh, NC");
    expect(sam.passions).toBe("UNC Chi Phi brother; swam like me");
  });

  it("marks friend/close as isFriend, acquaintance/weak as not", () => {
    expect(brainDumpRowToContact(rows[0]).isFriend).toBe(true); // friend
    expect(brainDumpRowToContact(rows[4]).isFriend).toBe(true); // close
    expect(brainDumpRowToContact(rows[3]).isFriend).toBe(false); // acquaintance
  });

  it("flattens semicolon multi-values to comma lists, deduped", () => {
    const [row] = parseBrainDumpCSV(
      `name,clubs,skills\nJo,Club A; Club B; Club A,Python;SQL`,
    );
    const c = brainDumpRowToContact(row);
    expect(c.clubs).toBe("Club A, Club B");
    expect(c.skills).toBe("Python, SQL");
  });

  it("carries linkedin_url through to linkedInUrl", () => {
    const [row] = parseBrainDumpCSV(
      `name,linkedin_url\nJo,https://www.linkedin.com/in/jo-smith`,
    );
    expect(brainDumpRowToContact(row).linkedInUrl).toBe(
      "https://www.linkedin.com/in/jo-smith",
    );
  });
});

describe("buildBrainDumpPrompt", () => {
  it("injects the user's background when present, hints when absent", () => {
    const filled = buildBrainDumpPrompt({ school: "UNC Chapel Hill", greekOrg: "Chi Phi" });
    expect(filled).toContain("School: UNC Chapel Hill");
    expect(filled).toContain("Fraternity / sorority: Chi Phi");
    const empty = buildBrainDumpPrompt();
    expect(empty).toContain("[e.g. UNC Chapel Hill]");
  });

  it("includes the exact CSV header and the top-10 framing", () => {
    const p = buildBrainDumpPrompt();
    expect(p).toContain(BRAIN_DUMP_HEADER);
    expect(p).toContain("top 10");
  });
});

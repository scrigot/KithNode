import { describe, it, expect } from "vitest";
import { parseLinkedInCsv, normalizeLinkedInUrl } from "./linkedin-csv";

// A realistic LinkedIn export: "Notes:" preamble + blank line, then the header,
// then rows — including a quoted company with a comma, a no-URL row, and a
// fully-blank row that must be skipped.
const SAMPLE = `Notes:
"When exporting your connection data, you may notice that some email addresses are missing. This is because of member settings."

First Name,Last Name,URL,Email Address,Company,Position,Connected On
Jane,Doe,https://www.linkedin.com/in/janedoe/,jane@acme.com,"Acme Data, Inc.",Head of Data,15 Mar 2024
John,Smith,http://linkedin.com/in/JohnSmith,,Globex,VP Analytics,02 Jan 2023
NoUrl,Person,,np@x.com,Initech,Analyst,
,,,,,,
`;

describe("parseLinkedInCsv", () => {
  const { rows, skipped, headerFound } = parseLinkedInCsv(SAMPLE);

  it("finds the header past the Notes preamble", () => {
    expect(headerFound).toBe(true);
    expect(rows.length).toBe(3);
  });

  it("joins first + last into name", () => {
    expect(rows[0].name).toBe("Jane Doe");
  });

  it("handles a quoted field containing a comma", () => {
    expect(rows[0].firmName).toBe("Acme Data, Inc.");
    expect(rows[0].title).toBe("Head of Data");
  });

  it("normalizes URLs (lowercase, https, no trailing slash)", () => {
    expect(rows[0].linkedInUrl).toBe("https://www.linkedin.com/in/janedoe");
    expect(rows[1].linkedInUrl).toBe("https://www.linkedin.com/in/johnsmith");
  });

  it("parses Connected On to an ISO date, null when blank", () => {
    expect(rows[0].connectedOn).toMatch(/^2024-03-15/);
    expect(rows[2].connectedOn).toBeNull();
  });

  it("keeps a no-URL row; fully-blank rows are dropped during tokenization", () => {
    expect(rows[2].name).toBe("NoUrl Person");
    expect(rows[2].linkedInUrl).toBe("");
    // skipped counts rows that reach parsing with neither name nor URL; the
    // blank line never gets that far (the tokenizer drops empty records).
    expect(skipped).toBe(0);
  });

  it("returns headerFound=false for non-LinkedIn CSV", () => {
    const r = parseLinkedInCsv("a,b,c\n1,2,3");
    expect(r.headerFound).toBe(false);
    expect(r.rows.length).toBe(0);
  });
});

describe("normalizeLinkedInUrl", () => {
  it("strips query/hash and trailing slash, forces https+www", () => {
    expect(normalizeLinkedInUrl("linkedin.com/in/foo/?trk=abc#x")).toBe(
      "https://www.linkedin.com/in/foo",
    );
  });
  it("rejects non-profile and non-linkedin URLs", () => {
    expect(normalizeLinkedInUrl("https://linkedin.com/company/acme")).toBe("");
    expect(normalizeLinkedInUrl("https://example.com/in/foo")).toBe("");
    expect(normalizeLinkedInUrl("")).toBe("");
  });
});

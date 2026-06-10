/**
 * Pure LinkedIn-CSV parsing helpers. Shared by the dashboard import page and
 * the onboarding wizard so both parse "Connections.csv" exports identically.
 * No React, no DOM, no I/O — safe to import anywhere.
 */

export interface CsvContact {
  name: string;
  title: string;
  firmName: string;
  email: string;
  education: string;
  location: string;
  linkedInUrl: string;
}

export function parseCSVField(field: string): string {
  let f = field.trim();
  if (f.startsWith('"') && f.endsWith('"')) {
    f = f.slice(1, -1).replace(/""/g, '"');
  }
  return f;
}

export function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

export function parseLinkedInCSV(text: string): CsvContact[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const lower = lines[i].toLowerCase();
    if (lower.includes("first name") && lower.includes("last name")) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx === -1) {
    throw new Error(
      "LinkedIn may have changed their export format. Expected columns: First Name, Last Name, Company, Position. Try re-exporting from LinkedIn Settings > Get a copy of your data > Connections.",
    );
  }

  const headers = parseCSVLine(lines[headerIdx]).map((h) =>
    h.toLowerCase().trim(),
  );
  const firstNameIdx = headers.findIndex((h) => h === "first name");
  const lastNameIdx = headers.findIndex((h) => h === "last name");
  const emailIdx = headers.findIndex((h) => h === "email address");
  const companyIdx = headers.findIndex((h) => h === "company");
  const positionIdx = headers.findIndex((h) => h === "position");
  const urlIdx = headers.findIndex((h) => h === "url");

  const contacts: CsvContact[] = [];

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    const firstName =
      firstNameIdx >= 0 ? parseCSVField(fields[firstNameIdx] || "") : "";
    const lastName =
      lastNameIdx >= 0 ? parseCSVField(fields[lastNameIdx] || "") : "";
    const name = `${firstName} ${lastName}`.trim();
    if (!name) continue;

    const email = emailIdx >= 0 ? parseCSVField(fields[emailIdx] || "") : "";
    const firmName =
      companyIdx >= 0 ? parseCSVField(fields[companyIdx] || "") : "";
    const title = positionIdx >= 0 ? parseCSVField(fields[positionIdx] || "") : "";

    const csvUrl = urlIdx >= 0 ? parseCSVField(fields[urlIdx] || "") : "";
    let linkedInUrl = csvUrl;
    if (!linkedInUrl) {
      const slug = `${firstName}-${lastName}`
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      linkedInUrl = slug ? `https://linkedin.com/in/${slug}` : "";
    }

    contacts.push({
      name,
      title,
      firmName,
      email,
      education: "",
      location: "",
      linkedInUrl,
    });
  }

  return contacts;
}

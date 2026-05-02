// Shared intermediate type for all non-LinkedIn connection ingestion sources.
// Records in this shape get normalized and written to AlumniContact via upsertAlumniContact().

export interface AlumniSeed {
  name: string;
  title: string;
  /** Maps to AlumniContact.firmName */
  firmName: string;
  email: string;
  /** Maps to AlumniContact.linkedInUrl (reused as dedup key / source URL) */
  sourceUrl: string;
  bio: string;
  /** Default "UNC" */
  university: string;
  /** Default "Chapel Hill, NC" */
  location: string;
  /** CSV of tags: proftype:X, research areas, paper:X, etc. */
  affiliations: string;
  source: "kenan_faculty" | "kenan_news_alumni" | "unc_greek_clubs" | "industry_adjunct";
  seniorityLevel?: string;
  researchAreas?: string[];
}

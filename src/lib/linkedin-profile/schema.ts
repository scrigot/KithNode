import { z } from "zod";

export const LINKEDIN_SECTION_KEYS = [
  "featured",
  "activity",
  "experience",
  "education",
  "licensesCertifications",
  "projects",
  "skills",
  "recommendations",
  "courses",
  "honorsAwards",
  "languages",
  "organizations",
  "volunteering",
  "publications",
  "patents",
  "testScores",
  "causes",
  "services",
  "interests",
] as const;

export type LinkedInSectionKey = (typeof LINKEDIN_SECTION_KEYS)[number];

export const SECTION_DEFINITIONS: Array<{
  key: LinkedInSectionKey;
  label: string;
  singular: string;
  hint: string;
}> = [
  { key: "featured", label: "Featured", singular: "featured item", hint: "Posts, articles, documents, links, and portfolio work." },
  { key: "activity", label: "Activity", singular: "activity item", hint: "Important posts, articles, newsletters, comments, or events." },
  { key: "experience", label: "Experience", singular: "role", hint: "Employment, internships, contract work, and career breaks." },
  { key: "education", label: "Education", singular: "education entry", hint: "Schools, degrees, fields of study, grades, and activities." },
  { key: "licensesCertifications", label: "Licenses & certifications", singular: "credential", hint: "Issuer, credential ID, dates, and verification link." },
  { key: "projects", label: "Projects", singular: "project", hint: "Projects with outcomes, collaborators, skills, and links." },
  { key: "skills", label: "Skills", singular: "skill", hint: "Hard and soft skills, endorsements, and evidence." },
  { key: "recommendations", label: "Recommendations", singular: "recommendation", hint: "Recommendations received or given and the relationship context." },
  { key: "courses", label: "Courses", singular: "course", hint: "Relevant coursework and associated schools or programs." },
  { key: "honorsAwards", label: "Honors & awards", singular: "honor or award", hint: "Recognition, issuing organization, and why it mattered." },
  { key: "languages", label: "Languages", singular: "language", hint: "Language and proficiency level." },
  { key: "organizations", label: "Organizations", singular: "organization", hint: "Clubs, associations, fraternities, and leadership roles." },
  { key: "volunteering", label: "Volunteer experience", singular: "volunteer role", hint: "Organization, cause, role, and measurable contribution." },
  { key: "publications", label: "Publications", singular: "publication", hint: "Title, publisher, date, authors, and publication URL." },
  { key: "patents", label: "Patents", singular: "patent", hint: "Patent number, status, inventors, and filing details." },
  { key: "testScores", label: "Test scores", singular: "test score", hint: "Test name, score, and associated organization." },
  { key: "causes", label: "Causes", singular: "cause", hint: "Causes you care about and relevant involvement." },
  { key: "services", label: "Services", singular: "service", hint: "Services offered, proof, pricing note, and delivery details." },
  { key: "interests", label: "Interests", singular: "interest", hint: "Companies, groups, schools, newsletters, and thought leaders followed." },
];

const bounded = (max: number) => z.string().trim().max(max);

export const linkedInSectionItemSchema = z.object({
  id: bounded(100),
  title: bounded(300),
  subtitle: bounded(500).default(""),
  organization: bounded(300).default(""),
  description: bounded(5000).default(""),
  location: bounded(300).default(""),
  startDate: bounded(50).default(""),
  endDate: bounded(50).default(""),
  url: bounded(2000).default(""),
  skills: z.array(bounded(100)).max(100).default([]),
  media: z.array(z.object({
    title: bounded(300),
    url: bounded(2000),
    type: z.enum(["link", "image", "document", "video", "other"]).default("link"),
  })).max(25).default([]),
  extra: z.record(z.string().max(100), z.string().max(2000)).default({}),
});

const sectionArray = z.array(linkedInSectionItemSchema).max(200).default([]);

export const linkedInProfileContentSchema = z.object({
  basics: z.object({
    firstName: bounded(100).default(""),
    lastName: bounded(100).default(""),
    pronouns: bounded(100).default(""),
    headline: bounded(300).default(""),
    about: bounded(5000).default(""),
    location: bounded(300).default(""),
    industry: bounded(200).default(""),
    profileUrl: bounded(2000).default(""),
    website: bounded(2000).default(""),
    email: bounded(320).default(""),
    phone: bounded(100).default(""),
    profilePhotoUrl: bounded(2000).default(""),
    bannerImageUrl: bounded(2000).default(""),
    customButtonLabel: bounded(100).default(""),
    customButtonUrl: bounded(2000).default(""),
    openToWork: z.boolean().default(false),
    hiring: z.boolean().default(false),
    creatorMode: z.boolean().default(false),
    providingServices: z.boolean().default(false),
  }),
  positioning: z.object({
    targetRoles: z.array(bounded(150)).max(30).default([]),
    targetIndustries: z.array(bounded(150)).max(30).default([]),
    targetLocations: z.array(bounded(150)).max(30).default([]),
    keywords: z.array(bounded(100)).max(100).default([]),
    valueProposition: bounded(2000).default(""),
    callToAction: bounded(500).default(""),
  }),
  sections: z.object({
    featured: sectionArray,
    activity: sectionArray,
    experience: sectionArray,
    education: sectionArray,
    licensesCertifications: sectionArray,
    projects: sectionArray,
    skills: sectionArray,
    recommendations: sectionArray,
    courses: sectionArray,
    honorsAwards: sectionArray,
    languages: sectionArray,
    organizations: sectionArray,
    volunteering: sectionArray,
    publications: sectionArray,
    patents: sectionArray,
    testScores: sectionArray,
    causes: sectionArray,
    services: sectionArray,
    interests: sectionArray,
  }),
  notes: bounded(5000).default(""),
}).strict();

export type LinkedInProfileContent = z.infer<typeof linkedInProfileContentSchema>;
export type LinkedInSectionItem = z.infer<typeof linkedInSectionItemSchema>;

export const EMPTY_LINKEDIN_PROFILE: LinkedInProfileContent = linkedInProfileContentSchema.parse({ basics: {}, positioning: {}, sections: {} });

export function normalizeLinkedInProfile(input: unknown): LinkedInProfileContent {
  if (!input || typeof input !== "object") return linkedInProfileContentSchema.parse(EMPTY_LINKEDIN_PROFILE);
  const source = input as Record<string, unknown>;
  const sections = source.sections && typeof source.sections === "object"
    ? source.sections as Record<string, unknown>
    : {};
  const sourceBasics = source.basics && typeof source.basics === "object" ? source.basics as Record<string, unknown> : {};
  const sourcePositioning = source.positioning && typeof source.positioning === "object" ? source.positioning : {};

  // Accept the smaller extension extraction shape as an import source.
  const legacyExperiences = Array.isArray(source.experiences) ? source.experiences : [];
  const legacyEducations = Array.isArray(source.educations) ? source.educations : [];
  const legacySkills = Array.isArray(source.skills) ? source.skills : [];
  const legacyClubs = Array.isArray(source.clubs) ? source.clubs : [];
  const legacyBasics = {
    firstName: typeof source.name === "string" ? source.name.trim().split(/\s+/)[0] || "" : "",
    lastName: typeof source.name === "string" ? source.name.trim().split(/\s+/).slice(1).join(" ") : "",
    headline: typeof source.headline === "string" ? source.headline : "",
    location: typeof source.location === "string" ? source.location : "",
    industry: typeof source.industry === "string" ? source.industry : "",
    profileUrl: typeof source.linkedInUrl === "string" ? source.linkedInUrl : "",
    about: typeof source.notes === "string" ? source.notes : "",
  };
  const item = (value: unknown, index: number, kind: "experience" | "education" | "skill" | "club") => {
    const row = value && typeof value === "object" ? value as Record<string, unknown> : {};
    return {
      id: typeof row.id === "string" && row.id ? row.id : `import-${kind}-${index}`,
      title: String(row.title || row.name || row.degree || ""),
      subtitle: String(row.major || ""),
      organization: String(row.organization || row.firm || row.school || ""),
      description: String(row.description || ""),
      startDate: String(row.startDate || row.start || ""),
      endDate: String(row.endDate || row.end || ""),
    };
  };

  return linkedInProfileContentSchema.parse({
    basics: { ...legacyBasics, ...sourceBasics },
    positioning: sourcePositioning,
    sections: {
      ...sections,
      experience: sections.experience || legacyExperiences.map((row, index) => item(row, index, "experience")),
      education: sections.education || legacyEducations.map((row, index) => item(row, index, "education")),
      skills: sections.skills || legacySkills.map((name, index) => item({ name }, index, "skill")),
      organizations: sections.organizations || legacyClubs.map((name, index) => item({ name }, index, "club")),
    },
    notes: typeof source.notes === "string" ? source.notes : "",
  });
}

export const createLinkedInProfileSchema = z.object({
  name: bounded(200).optional(),
  linkedInUrl: bounded(2000).optional(),
  source: z.enum(["manual", "json_import", "extension", "duplicate"]).default("manual"),
  content: z.unknown().optional(),
});

export const updateLinkedInProfileSchema = z.object({
  name: bounded(200).optional(),
  linkedInUrl: bounded(2000).optional(),
  status: z.enum(["draft", "current", "archived"]).optional(),
  isPrimary: z.boolean().optional(),
  content: z.unknown().optional(),
  changeSummary: bounded(500).optional(),
});

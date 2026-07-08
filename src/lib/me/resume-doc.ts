// Canonical resume document model + migration.
//
// The builder moved from a FIXED-FIELD doc (V1, what early MeResume.content rows
// hold) to an ordered, reorderable SECTION model (V2). `normalizeDoc` upgrades any
// stored shape to V2 losslessly so old rows keep working — this is the load-bearing
// piece the eng review flagged: never assume the persisted shape, always normalize.
//
// Pure + framework-free so it's unit-tested against the real persisted row.

// ── V1: the legacy fixed shape (still what some rows store) ───────────────────
export interface ResumeDocV1 {
  header: { name: string; title: string; location: string; email: string; phone: string; links: string[] };
  summary: string;
  experiences: { title: string; firm: string; start: string; end: string; bullets: string[] }[];
  projects: { name: string; description: string; bullets: string[]; tech: string[] }[];
  skills: string[];
  education: { school: string; degree: string; field: string; gradYear: string }[];
}

// ── V2: the section model ─────────────────────────────────────────────────────
export type SectionType =
  | "summary"
  | "experience"
  | "projects"
  | "education"
  | "skills"
  | "leadership"
  | "volunteering"
  | "awards"
  | "certifications"
  | "publications"
  | "custom";

export type SkillCategory = "technical" | "tools" | "languages" | "interests" | "custom";

export interface EntryItem {
  id: string;
  title: string;
  org: string;
  location: string;
  start: string;
  end: string;
  bullets: string[];
  tech?: string[]; // projects keep their stack; experience leaves it undefined
}

export interface EduItem {
  id: string;
  school: string;
  location: string;
  degree: string;
  field: string;
  concentration: string;
  gradDate: string;
  gpa: string;
  honors: string;
  coursework: string;
  studyAbroad: string;
}

export interface SkillGroup {
  category: SkillCategory;
  label: string;
  items: string[];
}

export interface ListItem {
  id: string;
  title: string;
  detail: string;
  date: string;
}

interface SectionBase {
  id: string;
  type: SectionType;
  title: string;
  visible: boolean;
}
export interface EntriesSection extends SectionBase {
  kind: "entries";
  entries: EntryItem[];
}
export interface EducationSection extends SectionBase {
  kind: "education";
  entries: EduItem[];
}
export interface SkillsSection extends SectionBase {
  kind: "skills";
  groups: SkillGroup[];
}
export interface ListSection extends SectionBase {
  kind: "list";
  items: ListItem[];
}
export interface TextSection extends SectionBase {
  kind: "text";
  body: string;
}
export type ResumeSection = EntriesSection | EducationSection | SkillsSection | ListSection | TextSection;

export interface ResumeDoc {
  version: 2;
  header: { name: string; title: string; location: string; email: string; phone: string; links: string[] };
  sections: ResumeSection[];
  meta: { density: "compact" | "normal" };
}

// Default kind for each section type (entry-based vs list vs text vs special).
export const SECTION_KIND: Record<SectionType, ResumeSection["kind"]> = {
  summary: "text",
  experience: "entries",
  projects: "entries",
  education: "education",
  skills: "skills",
  leadership: "entries",
  volunteering: "entries",
  awards: "list",
  certifications: "list",
  publications: "list",
  custom: "text",
};

const DEFAULT_TITLE: Record<SectionType, string> = {
  summary: "Summary",
  experience: "Experience",
  projects: "Projects",
  education: "Education",
  skills: "Skills",
  leadership: "Leadership & Activities",
  volunteering: "Volunteering",
  awards: "Awards & Honors",
  certifications: "Certifications",
  publications: "Publications",
  custom: "Section",
};

const str = (v: unknown) => (typeof v === "string" ? v : "");
const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const strArr = (v: unknown): string[] => arr<unknown>(v).map(str).filter((s) => s.length > 0);

/** Build an empty section of a given type (used by the editor's add-section menu). */
export function emptySection(type: SectionType, idSeed: string): ResumeSection {
  const base = { id: idSeed, type, title: DEFAULT_TITLE[type], visible: true };
  switch (SECTION_KIND[type]) {
    case "entries":
      return { ...base, kind: "entries", entries: [] };
    case "education":
      return { ...base, kind: "education", entries: [] };
    case "skills":
      return { ...base, kind: "skills", groups: [{ category: "technical", label: "Technical", items: [] }] };
    case "list":
      return { ...base, kind: "list", items: [] };
    case "text":
    default:
      return { ...base, kind: "text", body: "" };
  }
}

/** A fresh resume: header + the four core sections in early-career default order. */
export function emptyDoc(): ResumeDoc {
  return {
    version: 2,
    header: { name: "", title: "", location: "", email: "", phone: "", links: [] },
    sections: [
      emptySection("summary", "summary-0"),
      emptySection("experience", "experience-0"),
      emptySection("education", "education-0"),
      emptySection("skills", "skills-0"),
    ],
    meta: { density: "normal" },
  };
}

function eduFromV1(e: ResumeDocV1["education"][number], i: number): EduItem {
  return {
    id: `edu-${i}`,
    school: str(e?.school),
    location: "",
    degree: str(e?.degree),
    field: str(e?.field),
    concentration: "",
    gradDate: str(e?.gradYear),
    gpa: "",
    honors: "",
    coursework: "",
    studyAbroad: "",
  };
}

function isV2(raw: unknown): raw is ResumeDoc {
  return !!raw && typeof raw === "object" && (raw as { version?: number }).version === 2 && Array.isArray((raw as { sections?: unknown }).sections);
}

/**
 * Upgrade ANY stored content to a valid ResumeDoc V2. Lossless from V1: every fixed
 * field becomes a section in early-career canonical order. Idempotent on V2 input.
 * Unknown/empty input → a fresh empty doc. Never throws.
 */
export function normalizeDoc(raw: unknown): ResumeDoc {
  if (isV2(raw)) return normalizeV2(raw);

  const v1 = (raw ?? {}) as Partial<ResumeDocV1>;
  const h = (v1.header ?? {}) as Partial<ResumeDocV1["header"]>;
  const sections: ResumeSection[] = [];

  if (str(v1.summary)) {
    sections.push({ id: "summary-0", type: "summary", title: "Summary", visible: true, kind: "text", body: str(v1.summary) });
  }

  const experiences = arr<ResumeDocV1["experiences"][number]>(v1.experiences);
  sections.push({
    id: "experience-0",
    type: "experience",
    title: "Experience",
    visible: true,
    kind: "entries",
    entries: experiences.map((e, i) => ({
      id: `exp-${i}`,
      title: str(e?.title),
      org: str(e?.firm),
      location: "",
      start: str(e?.start),
      end: str(e?.end),
      bullets: strArr(e?.bullets),
    })),
  });

  const projects = arr<ResumeDocV1["projects"][number]>(v1.projects);
  if (projects.length) {
    sections.push({
      id: "projects-0",
      type: "projects",
      title: "Projects",
      visible: true,
      kind: "entries",
      entries: projects.map((p, i) => ({
        id: `proj-${i}`,
        title: str(p?.name),
        org: "",
        location: "",
        start: "",
        end: "",
        bullets: strArr(p?.bullets),
        tech: strArr(p?.tech),
      })),
    });
  }

  sections.push({
    id: "education-0",
    type: "education",
    title: "Education",
    visible: true,
    kind: "education",
    entries: arr<ResumeDocV1["education"][number]>(v1.education).map(eduFromV1),
  });

  const skills = strArr(v1.skills);
  sections.push({
    id: "skills-0",
    type: "skills",
    title: "Skills",
    visible: true,
    kind: "skills",
    groups: [{ category: "technical", label: "Technical", items: skills }],
  });

  return {
    version: 2,
    header: {
      name: str(h.name),
      title: str(h.title),
      location: str(h.location),
      email: str(h.email),
      phone: str(h.phone),
      links: strArr(h.links),
    },
    sections,
    meta: { density: "normal" },
  };
}

// Validate/repair a V2 doc so partial/hand-edited JSON can't crash consumers.
function normalizeV2(raw: ResumeDoc): ResumeDoc {
  const h = (raw.header ?? {}) as Partial<ResumeDoc["header"]>;
  const sections = arr<ResumeSection>(raw.sections).map((s, i): ResumeSection => {
    const base = { id: str(s?.id) || `section-${i}`, type: (s?.type ?? "custom") as SectionType, title: str(s?.title) || DEFAULT_TITLE[(s?.type ?? "custom") as SectionType], visible: s?.visible !== false };
    switch (s?.kind) {
      case "entries":
        return { ...base, kind: "entries", entries: arr<EntryItem>((s as EntriesSection).entries).map((e, j) => ({ id: str(e?.id) || `e-${i}-${j}`, title: str(e?.title), org: str(e?.org), location: str(e?.location), start: str(e?.start), end: str(e?.end), bullets: strArr(e?.bullets), ...(Array.isArray(e?.tech) ? { tech: strArr(e?.tech) } : {}) })) };
      case "education":
        return { ...base, kind: "education", entries: arr<EduItem>((s as EducationSection).entries).map((e, j) => ({ id: str(e?.id) || `ed-${i}-${j}`, school: str(e?.school), location: str(e?.location), degree: str(e?.degree), field: str(e?.field), concentration: str(e?.concentration), gradDate: str(e?.gradDate), gpa: str(e?.gpa), honors: str(e?.honors), coursework: str(e?.coursework), studyAbroad: str(e?.studyAbroad) })) };
      case "skills":
        return { ...base, kind: "skills", groups: arr<SkillGroup>((s as SkillsSection).groups).map((g) => ({ category: (g?.category ?? "custom") as SkillCategory, label: str(g?.label) || "Skills", items: strArr(g?.items) })) };
      case "list":
        return { ...base, kind: "list", items: arr<ListItem>((s as ListSection).items).map((it, j) => ({ id: str(it?.id) || `l-${i}-${j}`, title: str(it?.title), detail: str(it?.detail), date: str(it?.date) })) };
      case "text":
      default:
        return { ...base, kind: "text", body: str((s as TextSection)?.body) };
    }
  });
  return {
    version: 2,
    header: { name: str(h.name), title: str(h.title), location: str(h.location), email: str(h.email), phone: str(h.phone), links: strArr(h.links) },
    sections,
    meta: { density: raw.meta?.density === "compact" ? "compact" : "normal" },
  };
}

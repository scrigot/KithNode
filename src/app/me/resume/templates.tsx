// Resume render templates — pure presentational, render the V2 section model in
// order. Used by BOTH the builder's live preview and the print/[id] route (WYSIWYG).
// Rendered on WHITE paper, single column, ATS-friendly. Template "modes" differ in
// typography + heading style; Kenan-Flagler matches the UNC business-school standard.
import type {
  ResumeDoc,
  ResumeSection,
  SectionType,
  EntriesSection,
  EducationSection,
  SkillsSection,
  ListSection,
  TextSection,
} from "@/lib/me/resume-doc";

export { emptyDoc } from "@/lib/me/resume-doc";
export type { ResumeDoc } from "@/lib/me/resume-doc";

export const TEMPLATES: { id: string; label: string }[] = [
  { id: "dense", label: "Dense (ATS-safe)" },
  { id: "modern", label: "Modern" },
  { id: "kenan-flagler", label: "Kenan-Flagler (UNC business)" },
];

// Recommended (recruiter-correct) section order per template/track. The builder's
// "reset to recommended order" action sorts visible sections by this.
const KENAN_FLAGLER_ORDER: SectionType[] = ["summary", "education", "experience", "leadership", "projects", "volunteering", "awards", "certifications", "publications", "skills", "custom"];
const AI_ORDER: SectionType[] = ["summary", "experience", "projects", "education", "skills", "leadership", "volunteering", "awards", "certifications", "publications", "custom"];

export function recommendedOrder(templateId: string): SectionType[] {
  return templateId === "kenan-flagler" ? KENAN_FLAGLER_ORDER : AI_ORDER;
}

/** Reorder a doc's sections to the template's recommended order (stable for ties). */
export function reorderToRecommended(doc: ResumeDoc, templateId: string): ResumeDoc {
  const order = recommendedOrder(templateId);
  const rank = (t: SectionType) => {
    const i = order.indexOf(t);
    return i < 0 ? order.length : i;
  };
  const sections = doc.sections
    .map((s, i) => ({ s, i }))
    .sort((a, b) => rank(a.s.type) - rank(b.s.type) || a.i - b.i)
    .map(({ s }) => s);
  return { ...doc, sections };
}

interface Style {
  fontFamily: string;
  nameSize: number;
  headingSize: number;
  bodySize: number;
  headingUpper: boolean;
  headingTrack: string; // letter-spacing
  headingRule: string; // border under heading
  accent: string;
  headerAlign: "center" | "left";
  nameLocationDash: string; // en-dash for KF, comma elsewhere
}

const STYLES: Record<string, Style> = {
  dense: { fontFamily: "Georgia, 'Times New Roman', serif", nameSize: 22, headingSize: 11, bodySize: 12, headingUpper: true, headingTrack: "0.08em", headingRule: "1px solid #111", accent: "#111", headerAlign: "center", nameLocationDash: ", " },
  modern: { fontFamily: "Helvetica, Arial, sans-serif", nameSize: 24, headingSize: 11, bodySize: 12, headingUpper: true, headingTrack: "0.1em", headingRule: "2px solid #E8643C", accent: "#E8643C", headerAlign: "left", nameLocationDash: ", " },
  "kenan-flagler": { fontFamily: "'Times New Roman', Times, serif", nameSize: 16, headingSize: 12, bodySize: 10.5, headingUpper: true, headingTrack: "0.18em", headingRule: "1px solid #111", accent: "#111", headerAlign: "center", nameLocationDash: " – " },
};

const dateRange = (start: string, end: string) => [start, end].filter(Boolean).join(" – ");

function Heading({ children, st }: { children: string; st: Style }) {
  return (
    <h2
      style={{
        fontSize: st.headingSize,
        fontWeight: 700,
        textTransform: st.headingUpper ? "uppercase" : "none",
        letterSpacing: st.headingTrack,
        borderBottom: st.headingRule,
        paddingBottom: 2,
        margin: "12px 0 5px",
        color: st.accent,
      }}
    >
      {children}
    </h2>
  );
}

function Bullets({ items }: { items: string[] }) {
  const real = items.filter((b) => b.trim());
  if (!real.length) return null;
  return (
    <ul style={{ margin: "3px 0 0", paddingLeft: 18 }}>
      {real.map((b, i) => (
        <li key={i} style={{ marginBottom: 2 }}>
          {b}
        </li>
      ))}
    </ul>
  );
}

function EntriesBlock({ section, st }: { section: EntriesSection; st: Style }) {
  return (
    <>
      {section.entries.map((e) => {
        const head = [e.title, e.org].filter(Boolean).join(", ");
        const tech = (e.tech ?? []).filter(Boolean);
        return (
          <div key={e.id} style={{ marginBottom: 7 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
              <span>
                {head}
                {e.location && <span style={{ fontWeight: 400 }}>{st.nameLocationDash}{e.location}</span>}
              </span>
              <span style={{ fontWeight: 400, fontSize: st.bodySize - 1 }}>{dateRange(e.start, e.end)}</span>
            </div>
            {tech.length > 0 && <div style={{ fontSize: st.bodySize - 0.5, color: "#444" }}>{tech.join(", ")}</div>}
            <Bullets items={e.bullets} />
          </div>
        );
      })}
    </>
  );
}

function EducationBlock({ section, st }: { section: EducationSection; st: Style }) {
  return (
    <>
      {section.entries.map((e) => (
        <div key={e.id} style={{ marginBottom: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
            <span>
              {e.school}
              {e.location && <span style={{ fontWeight: 400 }}>{st.nameLocationDash}{e.location}</span>}
            </span>
            <span style={{ fontWeight: 400, fontSize: st.bodySize - 1 }}>{e.gradDate}</span>
          </div>
          {(e.degree || e.field || e.concentration) && (
            <div>{[e.degree, [e.field, e.concentration].filter(Boolean).join(", ")].filter(Boolean).join(" | ")}</div>
          )}
          {e.gpa && <div style={{ fontSize: st.bodySize - 0.5 }}>GPA: {e.gpa}</div>}
          {e.studyAbroad && <div style={{ fontSize: st.bodySize - 0.5 }}>Study abroad: {e.studyAbroad}</div>}
          {e.honors && <div style={{ fontSize: st.bodySize - 0.5 }}>{e.honors}</div>}
          {e.coursework && <div style={{ fontSize: st.bodySize - 0.5, color: "#444" }}>Relevant coursework: {e.coursework}</div>}
        </div>
      ))}
    </>
  );
}

function SkillsBlock({ section, st }: { section: SkillsSection; st: Style }) {
  const groups = section.groups.filter((g) => g.items.filter(Boolean).length);
  if (!groups.length) return null;
  return (
    <>
      {groups.map((g, i) => (
        <div key={i} style={{ fontSize: st.bodySize }}>
          <strong>{g.label}:</strong> {g.items.filter(Boolean).join(", ")}
        </div>
      ))}
    </>
  );
}

function ListBlock({ section, st }: { section: ListSection; st: Style }) {
  return (
    <ul style={{ margin: 0, paddingLeft: 18 }}>
      {section.items.map((it) => (
        <li key={it.id} style={{ marginBottom: 2 }}>
          <span style={{ display: "flex", justifyContent: "space-between" }}>
            <span>
              <strong>{it.title}</strong>
              {it.detail && ` — ${it.detail}`}
            </span>
            {it.date && <span style={{ fontSize: st.bodySize - 1 }}>{it.date}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

function SectionView({ section, st }: { section: ResumeSection; st: Style }) {
  // Skip empty sections so the preview/export stays tight.
  const empty =
    (section.kind === "entries" && !section.entries.some((e) => e.title || e.org || e.bullets.some((b) => b.trim()))) ||
    (section.kind === "education" && !section.entries.some((e) => e.school)) ||
    (section.kind === "skills" && !section.groups.some((g) => g.items.filter(Boolean).length)) ||
    (section.kind === "list" && !section.items.some((i) => i.title)) ||
    (section.kind === "text" && !section.body.trim());
  if (empty) return null;
  return (
    <>
      <Heading st={st}>{section.title}</Heading>
      {section.kind === "entries" && <EntriesBlock section={section} st={st} />}
      {section.kind === "education" && <EducationBlock section={section} st={st} />}
      {section.kind === "skills" && <SkillsBlock section={section} st={st} />}
      {section.kind === "list" && <ListBlock section={section} st={st} />}
      {section.kind === "text" && <p style={{ margin: 0 }}>{(section as TextSection).body}</p>}
    </>
  );
}

/** Render a resume on white paper using the chosen template mode. */
export function ResumePaper({ doc, templateId }: { doc: ResumeDoc; templateId: string }) {
  const st = STYLES[templateId] ?? STYLES.dense;
  const contact = [doc.header.location, doc.header.email, doc.header.phone, ...doc.header.links].filter(Boolean).join("  ·  ");
  const pad = doc.meta?.density === "compact" ? "0.5in" : "0.6in";
  return (
    <div
      className="resume-paper"
      style={{
        background: "#fff",
        color: "#111",
        width: "8.5in",
        minHeight: "11in",
        padding: pad,
        boxSizing: "border-box",
        boxShadow: "0 1px 12px rgba(0,0,0,0.35)",
        margin: "0 auto",
        fontFamily: st.fontFamily,
        fontSize: st.bodySize,
        lineHeight: 1.4,
      }}
    >
      <header style={{ textAlign: st.headerAlign, marginBottom: 8, borderBottom: templateId === "modern" ? st.headingRule : "none", paddingBottom: templateId === "modern" ? 6 : 0 }}>
        <div style={{ fontSize: st.nameSize, fontWeight: 700, letterSpacing: "0.02em" }}>{doc.header.name || "Your Name"}</div>
        {doc.header.title && <div style={{ fontSize: st.bodySize + 1, marginTop: 2, color: templateId === "modern" ? st.accent : "#111", fontWeight: templateId === "modern" ? 600 : 400 }}>{doc.header.title}</div>}
        <div style={{ fontSize: st.bodySize - 1.5, color: "#333", marginTop: 3 }}>{contact}</div>
      </header>
      {doc.sections.filter((s) => s.visible).map((s) => (
        <SectionView key={s.id} section={s} st={st} />
      ))}
    </div>
  );
}

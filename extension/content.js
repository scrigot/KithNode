// Content script: parse the LinkedIn profile the user is currently viewing.
//
// This runs ONLY on linkedin.com/in/* and only reads the already-rendered DOM of the
// page the user opened. No navigation, no crawling, no background work. It answers a
// single "parse" request from the side panel.
//
// LinkedIn's markup changes often, so every selector is best-effort with fallbacks and
// the result is always editable in the panel. If a field cannot be found it comes back
// empty rather than throwing.

function text(el) {
  return el && el.textContent ? el.textContent.trim().replace(/\s+/g, " ") : "";
}

function firstMatch(selectors, root) {
  const scope = root || document;
  for (const sel of selectors) {
    const el = scope.querySelector(sel);
    if (el && text(el)) return el;
  }
  return null;
}

function cleanLines(value) {
  return (value || "")
    .split("\n")
    .map((line) => line.trim().replace(/\s+/g, " "))
    .filter(Boolean);
}

function uniqueLines(lines) {
  const seen = new Set();
  const out = [];
  for (const line of lines) {
    const key = line.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(line);
    }
  }
  return out;
}

function topCard() {
  const h1 = firstMatch(["main h1", "h1.text-heading-xlarge", "h1"]);
  if (!h1) return document.querySelector("main") || document.body;
  return h1.closest("section") || h1.closest(".pv-text-details__left-panel") || h1.parentElement || document;
}

function topCardLines(name, root) {
  const bad = /^(connect|message|more|contact info|500\+ connections|followers|follow|pending|profile language|open to|people similar to.*|show all|highlights|about|activity|[·•.\-\s]*(1st|2nd|3rd)[·•.\-\s]*)$/i;
  return uniqueLines(cleanLines(root ? root.innerText || text(root) : ""))
    .filter((line) => cleanName(line) !== name && !bad.test(line));
}

function cleanName(line) {
  return (line || "").replace(/\s*[·•]\s*(1st|2nd|3rd).*$/i, "").trim();
}

function nameFromLines(lines) {
  for (const line of lines) {
    const candidate = cleanName(line);
    if (
      candidate &&
      candidate.length <= 80 &&
      /^[A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){1,4}$/.test(candidate) &&
      !/\b(connect|message|more|university|incorporated|company|supervisor|engineer|consultant|data|ai|people similar)\b/i.test(candidate)
    ) {
      return candidate;
    }
  }
  return "";
}

function splitHeadline(headline) {
  const clean = (headline || "").replace(/\s+/g, " ").trim();
  if (!clean) return { title: "", firmName: "" };
  const m = clean.match(/^(.+?)\s+(?:@|at)\s+(.+)$/i);
  if (m) return { title: m[1].trim(), firmName: m[2].trim() };
  return { title: clean, firmName: "" };
}

function isHeadline(line) {
  return Boolean(
    line &&
    !/^[·•.\-\s]*(1st|2nd|3rd)[·•.\-\s]*$/i.test(line) &&
    !/\b(united states|usa|connections|mutual|contact info|university|college|school)\b/i.test(line) &&
    (/@|\sat\s|\b(engineer|engineering|consultant|consulting|data|ai|analytics|product|manager|director|founder|supervisor|lead|student|researcher|scientist|developer)\b/i.test(line))
  );
}

function cleanCompany(value) {
  return (value || "")
    .replace(/\s+-\s+.*$/, "")
    .replace(/\s*[·•]\s+.*$/, "")
    .trim();
}

function isCompanySchoolChip(line) {
  return /\b(incorporated|corp|llc|ltd|company|university|college|school|institute)\b/i.test(line);
}

function isLocationLine(line) {
  if (!line || isCompanySchoolChip(line)) return false;
  return (
    /\b(united states|usa|remote|greater|area)\b/i.test(line) ||
    /\b(new york|san francisco|raleigh|chapel hill|charlotte|durham|boston|austin|seattle|chicago|atlanta|washington)\b/i.test(line)
  );
}

function locationFromLines(lines) {
  const line = lines.find(isLocationLine) || "";
  return line.replace(/\s*·.*$/, "").trim();
}

function educationFromLines(lines) {
  const line = lines.find((line) => /\b(university|college|school|institute|unc|chapel hill|business school)\b/i.test(line)) || "";
  if (/university of north carolina/i.test(line)) return "University of North Carolina at Chapel Hill";
  return line.replace(/^.*[·•]\s*/, "").trim();
}

function firmFromLines(lines, fallbackFirm) {
  const edu = educationFromLines(lines);
  const loc = locationFromLines(lines);
  const companyLine =
    lines.find((line) => /[·•]/.test(line) && /incorporated|corp|company|llc|ltd|labs|systems|technologies|analytics|data|ai|consulting/i.test(line)) ||
    lines.find((line) => {
      const first = cleanCompany(line);
      return first && first !== edu && first !== loc && !isHeadline(first) && !/connections|mutual|university|college|school/i.test(first);
    });
  const fuller = cleanCompany(companyLine || "");
  if (fallbackFirm && fuller && fuller.toLowerCase().startsWith(fallbackFirm.toLowerCase())) return fuller;
  return fallbackFirm || fuller;
}

function sectionByHeading(label) {
  const wanted = label.toLowerCase();
  const sections = Array.from(document.querySelectorAll("main section"));
  return sections.find((section) => {
    const heading = section.querySelector("h2, h3");
    return heading && text(heading).toLowerCase().includes(wanted);
  }) || null;
}

function aboutText() {
  const section = sectionByAnchor("about") || sectionByHeading("about");
  if (!section) return "";
  return cleanLines(section.innerText || text(section))
    .filter((line) => !/^(about|show more|show less|…?more)$/i.test(line))
    .join("\n")
    .slice(0, 1600);
}

function inferIndustry(textValue) {
  const s = (textValue || "").toLowerCase();
  if (/\b(ai consulting|applied ai|implementation|solutions|professional services)\b/.test(s)) return "AI Consulting";
  if (/\b(machine learning|ml engineer|llm|rag|generative ai|genai|artificial intelligence)\b/.test(s)) return "AI Engineering";
  if (/\b(data engineer|data engineering|analytics engineer|etl|warehouse|snowflake|databricks)\b/.test(s)) return "Data Engineering";
  if (/\b(data scientist|analytics|business intelligence|bi)\b/.test(s)) return "Data Analytics";
  if (/\b(product|pm|strategy|operations)\b/.test(s)) return "AI Product / Ops";
  return "";
}

// Section helper: find the card that follows an anchor like <div id="experience">.
function sectionByAnchor(id) {
  const anchor = document.getElementById(id);
  if (!anchor) return null;
  // The visible card is usually the anchor's parent <section>.
  return anchor.closest("section") || anchor.parentElement;
}

function firstEntryLines(section) {
  if (!section) return [];
  // Each entry's visible text usually lives in spans marked aria-hidden="true".
  const li = section.querySelector("li");
  if (!li) return [];
  return Array.from(li.querySelectorAll('span[aria-hidden="true"]'))
    .map((s) => text(s))
    .filter(Boolean);
}

function experienceEntries() {
  const section = sectionByAnchor("experience") || sectionByHeading("experience");
  if (!section) return [];
  return Array.from(section.querySelectorAll("li"))
    .map((li) => uniqueLines(
      Array.from(li.querySelectorAll('span[aria-hidden="true"]'))
        .map((s) => text(s))
        .filter(Boolean),
    ))
    .filter((lines) => lines.length > 0);
}

function parseExperience(lines) {
  const title = lines.find((line) => isHeadline(line)) || "";
  const companyLine =
    lines.find((line) => /[·•]/.test(line) && !isLocationLine(line) && !/university|college|school/i.test(line)) ||
    lines.find((line) => !isHeadline(line) && !isLocationLine(line) && !/date|present|month|year|university|college|school/i.test(line)) ||
    "";
  const company = cleanCompany(companyLine);
  const location = locationFromLines(lines);
  return { title, company, location };
}

function firstExperienceWithData() {
  for (const lines of experienceEntries()) {
    const exp = parseExperience(lines);
    if (exp.title || exp.company || exp.location) return exp;
  }
  return { title: "", company: "", location: "" };
}

function cleanUrl(href) {
  try {
    const u = new URL(href);
    // canonical /in/<handle>, no query or trailing junk
    const m = u.pathname.match(/\/in\/[^/]+/);
    return m ? `https://www.linkedin.com${m[0]}` : href.split("?")[0];
  } catch {
    return href.split("?")[0];
  }
}

function parseProfile() {
  // Name: the profile h1 in the top card.
  const nameEl = firstMatch(["main h1", "h1.text-heading-xlarge", "h1"]);
  const card = topCard();
  const rawLines = topCardLines("", card);
  const name = cleanName(text(nameEl)) || nameFromLines(rawLines);
  const lines = topCardLines(name, card);

  // Headline: the body-medium line directly under the name.
  const headline =
    [
      text(
        firstMatch([
          "div.text-body-medium.break-words",
          ".pv-text-details__left-panel .text-body-medium",
        ], card),
      ),
      ...lines,
    ].find(isHeadline) ||
    "";

  // Location: the small muted line in the top card. Only accept the selector
  // value if it actually looks like a location; LinkedIn often puts company or
  // school chips in the same visual area.
  const selectedLocation = text(
      firstMatch([
        "span.text-body-small.inline.t-black--light.break-words",
        ".pv-text-details__left-panel span.text-body-small",
      ], card),
    );
  const location = isLocationLine(selectedLocation) ? selectedLocation.replace(/\s*·.*$/, "").trim() : locationFromLines(lines);

  // Experience: first entry. Lines are typically [title, "Company · type", ...].
  const exp = firstExperienceWithData();
  const expLines = firstEntryLines(sectionByAnchor("experience"));
  const title = expLines[0] || "";
  const firmRaw = expLines[1] || "";
  const firmName = cleanCompany(firmRaw);

  // Education: first entry. Line 0 is usually the school name.
  const eduLines = firstEntryLines(sectionByAnchor("education"));
  const education = eduLines[0] || "";

  // Headline often reads "Title at Firm" when the experience card is collapsed.
  // Prefer explicit experience parsing; fall back to splitting the headline.
  const split = splitHeadline(headline);
  let resolvedTitle = exp.title || title || split.title;
  let resolvedFirm = exp.company || firmName || cleanCompany(split.firmName);
  if ((!resolvedTitle || !resolvedFirm) && / at /i.test(headline)) {
    const [t, f] = headline.split(/ at /i);
    resolvedTitle = resolvedTitle || (t || "").trim();
    resolvedFirm = resolvedFirm || cleanCompany(f || "");
  }
  if (!resolvedTitle) resolvedTitle = headline;
  resolvedFirm = firmFromLines(lines, resolvedFirm);
  const resolvedEducation = education || educationFromLines(lines);
  const about = aboutText();
  const industry = inferIndustry(`${resolvedTitle} ${resolvedFirm} ${headline} ${about}`);
  const resolvedLocation = exp.location || location;

  return {
    name,
    title: resolvedTitle,
    firmName: resolvedFirm,
    education: resolvedEducation,
    location: resolvedLocation,
    linkedInUrl: cleanUrl(window.location.href),
    email: "", // never on the page; left for the user or enrichment
    industry,
    headline, // raw, for the panel to show as a hint
    notes: about,
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function hydrateProfileSections() {
  const originalY = window.scrollY;
  const targets = [0, 700, 1200, 1800, 2400, 3200, 4200];
  for (const y of targets) {
    if (sectionByAnchor("experience") && sectionByAnchor("about")) break;
    window.scrollTo({ top: y, behavior: "auto" });
    await sleep(160);
  }
  window.scrollTo({ top: originalY, behavior: "auto" });
  await sleep(80);
}

async function parseProfileWhenReady() {
  await hydrateProfileSections();
  let best = parseProfile();
  for (let i = 0; i < 10; i++) {
    if (best.name && (best.title || best.firmName || best.location || best.education)) return best;
    await sleep(250);
    best = parseProfile();
  }
  return best;
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "KITHNODE_PARSE") {
    parseProfileWhenReady()
      .then((data) => sendResponse({ ok: true, data }))
      .catch((e) => sendResponse({ ok: false, error: String(e) }));
  }
  return true; // keep the message channel open for the async response
});

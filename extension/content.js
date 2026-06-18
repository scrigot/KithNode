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
  const name = text(nameEl);

  // Headline: the body-medium line directly under the name.
  const headline = text(
    firstMatch([
      "div.text-body-medium.break-words",
      ".pv-text-details__left-panel .text-body-medium",
    ]),
  );

  // Location: the small muted line in the top card.
  const location = text(
    firstMatch([
      "span.text-body-small.inline.t-black--light.break-words",
      ".pv-text-details__left-panel span.text-body-small",
    ]),
  );

  // Experience: first entry. Lines are typically [title, "Company · type", ...].
  const expLines = firstEntryLines(sectionByAnchor("experience"));
  const title = expLines[0] || "";
  const firmRaw = expLines[1] || "";
  const firmName = firmRaw.split("·")[0].trim();

  // Education: first entry. Line 0 is usually the school name.
  const eduLines = firstEntryLines(sectionByAnchor("education"));
  const education = eduLines[0] || "";

  // Headline often reads "Title at Firm" when the experience card is collapsed.
  // Prefer explicit experience parsing; fall back to splitting the headline.
  let resolvedTitle = title;
  let resolvedFirm = firmName;
  if ((!resolvedTitle || !resolvedFirm) && / at /i.test(headline)) {
    const [t, f] = headline.split(/ at /i);
    resolvedTitle = resolvedTitle || (t || "").trim();
    resolvedFirm = resolvedFirm || (f || "").trim();
  }
  if (!resolvedTitle) resolvedTitle = headline;

  return {
    name,
    title: resolvedTitle,
    firmName: resolvedFirm,
    education,
    location,
    linkedInUrl: cleanUrl(window.location.href),
    email: "", // never on the page; left for the user or enrichment
    headline, // raw, for the panel to show as a hint
  };
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "KITHNODE_PARSE") {
    try {
      sendResponse({ ok: true, data: parseProfile() });
    } catch (e) {
      sendResponse({ ok: false, error: String(e) });
    }
  }
  return true; // keep the message channel open for the async response
});

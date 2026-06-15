// Popup: grab the profile's rendered TEXT from the tab, send it to KithNode for
// AI extraction, show the structured fields for review, then save. No CSS
// scraping — the server's AI reads text, so this survives LinkedIn DOM changes.

const $ = (id) => document.getElementById(id);
const els = {
  name: $("name"), headline: $("headline"), company: $("company"),
  location: $("location"), skills: $("skills"), experiences: $("experiences"),
  educations: $("educations"), clubs: $("clubs"), mutuals: $("mutuals"), endpoint: $("endpoint"),
  highSchool: $("highSchool"), graduationYear: $("graduationYear"), notes: $("notes"), tags: $("tags"),
  isFriend: $("isFriend"), speakFrequency: $("speakFrequency"), lastSpokenAt: $("lastSpokenAt"),
  save: $("save"), status: $("status"),
};

let linkedInUrl = "";
const setStatus = (msg, cls) => { els.status.textContent = msg || ""; els.status.className = cls || ""; };

// ── Endpoint choice persistence ──────────────────────────────────────────────
chrome.storage.local.get("endpoint", (r) => { if (r && r.endpoint) els.endpoint.value = r.endpoint; });
els.endpoint.addEventListener("change", () => chrome.storage.local.set({ endpoint: els.endpoint.value }));

// Injected into the tab: scroll to force LinkedIn's lazy sections to render,
// then return the profile's visible text + canonical URL. Self-contained
// (executeScript serializes it, so it can't close over popup scope).
async function grabProfile() {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await sleep(110); }
  window.scrollTo(0, 0);
  await sleep(300);
  const main = document.querySelector("main");
  const text = ((main ? main.innerText : document.body.innerText) || "").slice(0, 60000);
  const m = window.location.href.match(/https?:\/\/[^/]*linkedin\.com\/in\/[^/?#]+/i);
  return { url: m ? m[0].replace(/\/$/, "") : "", text };
}

// ── Orchestrate: grab text → AI extract → fill for review ────────────────────
chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
  const tab = tabs[0];
  if (!tab || !/linkedin\.com\/in\//i.test(tab.url || "")) {
    setStatus("Open a LinkedIn profile (linkedin.com/in/…), then reopen this.", "err");
    els.save.textContent = "No profile";
    return;
  }

  setStatus("Reading profile…");
  let grab;
  try {
    const results = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: grabProfile });
    grab = results && results[0] && results[0].result;
  } catch (e) {
    setStatus(`Couldn't read the page: ${e.message}. Reload the profile and retry.`, "err");
    els.save.textContent = "Read failed";
    return;
  }
  if (!grab || !grab.text) {
    setStatus("No profile text found. Reload the profile and retry.", "err");
    els.save.textContent = "Read failed";
    return;
  }
  linkedInUrl = grab.url || "";

  setStatus("Extracting with AI…");
  try {
    const res = await fetch(`${els.endpoint.value}/api/extension/extract`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pageText: grab.text }),
    });
    if (res.status === 401) {
      setStatus("Not logged in. Open the site, sign in, then reopen this.", "err");
      els.save.textContent = "Login needed";
      return;
    }
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      throw new Error(b.error || `HTTP ${res.status}`);
    }
    const p = await res.json();
    fill(p);
    els.save.textContent = "Save to KithNode";
    els.save.disabled = false;
    setStatus(
      `AI parsed: ${(p.skills || []).length} skills · ${(p.experiences || []).length} roles · ` +
        `${(p.educations || []).length} edu · ${(p.clubs || []).length} clubs · ${(p.mutuals || []).length} mutuals — review & save`,
    );
  } catch (e) {
    setStatus(`Extraction failed: ${e.message}`, "err");
    els.save.textContent = "Extract failed";
  }
});

function fill(p) {
  els.name.value = p.name || "";
  els.headline.value = p.headline || "";
  els.company.value = p.company || "";
  els.location.value = p.location || "";
  els.skills.value = (p.skills || []).join(", ");
  els.experiences.value = (p.experiences || [])
    .map((e) => [e.title, e.firm, e.start, e.end].map((x) => x || "").join(" | "))
    .join("\n");
  els.educations.value = (p.educations || [])
    .map((e) => [e.school, e.degree, e.major].map((x) => x || "").join(" | "))
    .join("\n");
  els.clubs.value = (p.clubs || []).join("\n");
  els.mutuals.value = (p.mutuals || []).map((m) => m.name).join(", ");
  els.highSchool.value = p.highSchool || "";
  els.graduationYear.value = p.graduationYear != null ? p.graduationYear : "";
  els.notes.value = p.notes || "";
  els.tags.value = (p.tags || []).join(", ");
}

// ── Serialize edited fields → /ingest payload ────────────────────────────────
const splitLines = (v) => v.split("\n").map((l) => l.trim()).filter(Boolean);
function buildPayload() {
  return {
    linkedInUrl,
    name: els.name.value.trim(),
    headline: els.headline.value.trim(),
    company: els.company.value.trim(),
    location: els.location.value.trim(),
    skills: els.skills.value.split(",").map((s) => s.trim()).filter(Boolean),
    experiences: splitLines(els.experiences.value).map((l) => {
      const [title, firm, start, end] = l.split("|").map((x) => x.trim());
      return { title: title || "", firm: firm || "", start: start || "", end: end || "" };
    }),
    educations: splitLines(els.educations.value).map((l) => {
      const [school, degree, major] = l.split("|").map((x) => x.trim());
      return { school: school || "", degree: degree || "", major: major || "" };
    }),
    clubs: splitLines(els.clubs.value),
    mutuals: els.mutuals.value.split(",").map((s) => s.trim()).filter(Boolean).map((name) => ({ name })),
    highSchool: els.highSchool.value.trim(),
    graduationYear: els.graduationYear.value.trim() ? parseInt(els.graduationYear.value, 10) : undefined,
    notes: els.notes.value.trim(),
    tags: els.tags.value.split(",").map((s) => s.trim()).filter(Boolean),
    isFriend: els.isFriend.checked,
    speakFrequency: els.speakFrequency.value,
    lastSpokenAt: els.lastSpokenAt.value || "",
  };
}

els.save.addEventListener("click", async () => {
  if (!linkedInUrl) return setStatus("No LinkedIn URL detected.", "err");
  els.save.disabled = true;
  setStatus("Saving…");
  try {
    const res = await fetch(`${els.endpoint.value}/api/extension/ingest`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(buildPayload()),
    });
    if (res.status === 401) {
      setStatus("Not logged in. Open the site, sign in, then retry.", "err");
      els.save.disabled = false;
      return;
    }
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      throw new Error(b.error || `HTTP ${res.status}`);
    }
    const b = await res.json();
    const c = b.contact || {};
    setStatus(
      `${b.created ? "Added" : "Updated"} ${c.name} — ${String(c.tier || "").toUpperCase()} · ` +
        `${c.skills || 0} skills, ${c.clubs || 0} clubs, ${c.experiences || 0} roles, ` +
        `${(c.affiliations || []).length} warm paths.`,
      "ok",
    );
    if (c.id) {
      const link = document.createElement("a");
      link.href = `${els.endpoint.value}/contact/${c.id}`;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = "View in KithNode →";
      link.style.cssText = "display:block;margin-top:6px;color:#0ea5e9";
      els.status.appendChild(link);
    }
  } catch (e) {
    setStatus(`Save failed: ${e.message}`, "err");
    els.save.disabled = false;
  }
});

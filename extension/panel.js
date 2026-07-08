// Side panel: ask the content script to parse, show the editable form, copy or send.

const $ = (sel) => document.querySelector(sel);
const FIELDS = ["name", "title", "firmName", "education", "location", "industry", "email", "linkedInUrl", "notes"];

// Persist the KithNode base URL.
chrome.storage.local.get("baseUrl").then(({ baseUrl }) => {
  $("#baseUrl").value = baseUrl || "http://localhost:3051";
});
$("#baseUrl").addEventListener("change", (e) => {
  chrome.storage.local.set({ baseUrl: e.target.value.trim() });
});

function setStatus(msg, kind) {
  const el = $("#status");
  el.textContent = msg || "";
  el.className = "status" + (kind ? " " + kind : "");
}

function setLoading(isLoading, message) {
  $("#loading").hidden = !isLoading;
  $("#parse").disabled = isLoading;
  if (message) $("#hint").textContent = message;
}

function collect() {
  const c = {};
  for (const f of FIELDS) c[f] = $(`[name="${f}"]`).value.trim();
  return c;
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

$("#parse").addEventListener("click", async () => {
  setStatus("");
  setLoading(true, "Reading the active LinkedIn profile...");
  const tab = await activeTab();
  if (!tab || !/^https:\/\/www\.linkedin\.com\/in\//.test(tab.url || "")) {
    $("#hint").textContent = "This is not a LinkedIn profile tab. Open a /in/ profile first.";
    setLoading(false);
    return;
  }
  let resp;
  try {
    resp = await chrome.tabs.sendMessage(tab.id, { type: "KITHNODE_PARSE" });
  } catch {
    $("#hint").textContent = "Injecting profile reader...";
    // content script may not be injected yet (e.g. installed after the tab loaded)
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
    resp = await chrome.tabs.sendMessage(tab.id, { type: "KITHNODE_PARSE" });
  }
  if (!resp || !resp.ok) {
    $("#hint").textContent = "Could not read this profile. Try reloading the page.";
    setLoading(false);
    return;
  }
  const d = resp.data;
  for (const f of FIELDS) $(`[name="${f}"]`).value = d[f] || "";
  $(`[name="notes"]`).value = d.notes || "";
  $("#form").hidden = false;
  $("#hint").textContent = d.headline ? `Headline: ${d.headline}` : "Review and edit, then add.";
  setLoading(false);
});

$("#copyJson").addEventListener("click", async () => {
  await navigator.clipboard.writeText(JSON.stringify({ contacts: [collect()] }, null, 2));
  setStatus("Copied JSON to clipboard.", "ok");
});

$("#copyCsv").addEventListener("click", async () => {
  const c = collect();
  const header = FIELDS.join(",");
  const esc = (v) => `"${(v || "").replace(/"/g, '""')}"`;
  const row = FIELDS.map((f) => esc(c[f])).join(",");
  await navigator.clipboard.writeText(header + "\n" + row);
  setStatus("Copied CSV row to clipboard.", "ok");
});

$("#send").addEventListener("click", async () => {
  const contact = collect();
  if (!contact.name) {
    setStatus("Name is required.", "err");
    return;
  }
  const baseUrl = $("#baseUrl").value.trim();
  setStatus("Sending...");
  const result = await chrome.runtime.sendMessage({ type: "KITHNODE_IMPORT", baseUrl, contact });
  if (!result || !result.ok) {
    setStatus(result?.error || "Failed to add contact.", "err");
    return;
  }
  const b = result.body || {};
  const score = b.lead && typeof b.lead.score === "number" ? ` · score ${b.lead.score}` : "";
  setStatus(`Added to Discover${score}.`, "ok");
});

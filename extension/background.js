// Service worker: open the side panel on click, and own the network call to KithNode.
//
// The import POST lives here (not in the panel) so the request originates from the
// extension with its host permissions, which is what lets cookie auth work against the
// KithNode origin. See docs/LINKEDIN-EXTENSION-SPEC.md, section 3 (auth analysis).

chrome.action.onClicked.addListener(async (tab) => {
  if (tab && tab.id != null) {
    try {
      await chrome.sidePanel.open({ tabId: tab.id });
    } catch (e) {
      // sidePanel.open requires a user gesture; the click provides it.
      console.warn("sidePanel.open failed", e);
    }
  }
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "KITHNODE_IMPORT") {
    importContact(msg.baseUrl, msg.contact)
      .then((result) => sendResponse(result))
      .catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true; // async
  }
});

async function importContact(baseUrl, contact) {
  if (!baseUrl) {
    return { ok: false, error: "Set your KithNode URL in the panel first." };
  }
  const url = baseUrl.replace(/\/+$/, "") + "/api/me/discover/leads";

  // Matches the manual capture form accepted by POST /api/me/discover/leads.
  const payload = {
    name: contact.name || "",
    title: contact.title || "",
    firmName: contact.firmName || "",
    email: contact.email || "",
    education: contact.education || "",
    location: contact.location || "",
    linkedInUrl: contact.linkedInUrl || "",
    industry: contact.industry || "",
    notes: contact.notes || contact.headline || "",
    sourceUrl: contact.linkedInUrl || "",
    sourceQuery: "LinkedIn extension capture",
  };

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      credentials: "include", // send the user's KithNode session cookie
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    return { ok: false, error: "Network error. Is the URL right and are you signed in?" };
  }

  if (res.status === 404) {
    return { ok: false, error: "KithNode /me is not running. Start localhost with PERSONAL_MODE=1." };
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { ok: false, error: body.error || `KithNode returned ${res.status}.` };
  }
  const body = await res.json().catch(() => ({}));
  return { ok: true, body };
}

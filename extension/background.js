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
  const url = baseUrl.replace(/\/+$/, "") + "/api/import/linkedin";

  // Matches the CsvContact shape accepted by POST /api/import/linkedin.
  const payload = {
    contacts: [
      {
        name: contact.name || "",
        title: contact.title || "",
        firmName: contact.firmName || "",
        email: contact.email || "",
        education: contact.education || "",
        location: contact.location || "",
        linkedInUrl: contact.linkedInUrl || "",
      },
    ],
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

  if (res.status === 401) {
    return { ok: false, error: "Not signed in to KithNode in this browser." };
  }
  if (!res.ok) {
    return { ok: false, error: `KithNode returned ${res.status}.` };
  }
  const body = await res.json().catch(() => ({}));
  return { ok: true, body };
}

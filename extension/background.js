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
    importContact(msg.baseUrl, msg.token, msg.contact)
      .then((result) => sendResponse(result))
      .catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true; // async
  }
  if (msg && msg.type === "KITHNODE_PROFILE_COPY") {
    saveProfileCopy(msg.baseUrl, msg.token, msg.contact)
      .then((result) => sendResponse(result))
      .catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true;
  }
});

function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function saveProfileCopy(baseUrl, token, contact) {
  if (!baseUrl) return { ok: false, error: "Set your KithNode URL in the panel first." };
  const url = baseUrl.replace(/\/+$/, "") + "/api/linkedin-profiles";
  const content = {
    name: contact.name || "",
    headline: contact.headline || contact.title || "",
    location: contact.location || "",
    industry: contact.industry || "",
    linkedInUrl: contact.linkedInUrl || "",
    notes: contact.notes || "",
    experiences: Array.isArray(contact.experiences) && contact.experiences.length ? contact.experiences : contact.title || contact.firmName
      ? [{ title: contact.title || "", firm: contact.firmName || "" }]
      : [],
    educations: Array.isArray(contact.educations) && contact.educations.length ? contact.educations : contact.education
      ? [{ school: contact.education, degree: "", major: "" }]
      : [],
    skills: Array.isArray(contact.skills) ? contact.skills : [],
    organizations: Array.isArray(contact.organizations) ? contact.organizations : [],
    mutuals: Array.isArray(contact.mutuals) ? contact.mutuals : [],
    about: contact.about || contact.notes || "",
  };
  try {
    const res = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", ...authHeaders(token) },
      body: JSON.stringify({ name: contact.name || "My LinkedIn profile", linkedInUrl: contact.linkedInUrl || "", source: "extension", content }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: body.error || `KithNode returned ${res.status}.` };
    return { ok: true, body };
  } catch {
    return { ok: false, error: "Network error. Is KithNode running and are you signed in?" };
  }
}

async function importContact(baseUrl, token, contact) {
  if (!baseUrl) {
    return { ok: false, error: "Set your KithNode URL in the panel first." };
  }
  const url = baseUrl.replace(/\/+$/, "") + "/api/extension/ingest";

  // Matches the supported, user-scoped extension ingest contract.
  const payload = {
    linkedInUrl: contact.linkedInUrl || "",
    name: contact.name || "",
    headline: contact.headline || contact.title || "",
    company: contact.firmName || "",
    location: contact.location || "",
    notes: contact.notes || contact.headline || "",
    experiences:
      Array.isArray(contact.experiences) && contact.experiences.length ? contact.experiences : contact.title || contact.firmName
        ? [{ title: contact.title || "", firm: contact.firmName || "" }]
        : [],
    educations: Array.isArray(contact.educations) && contact.educations.length ? contact.educations : contact.education
      ? [{ school: contact.education, major: "", degree: "", concentration: "" }]
      : [],
    skills: Array.isArray(contact.skills) ? contact.skills : [],
    clubs: Array.isArray(contact.organizations) ? contact.organizations : [],
    mutuals: Array.isArray(contact.mutuals) ? contact.mutuals : [],
  };

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      credentials: "include", // send the user's KithNode session cookie
      headers: { "Content-Type": "application/json", ...authHeaders(token) },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    return { ok: false, error: "Network error. Is the URL right and are you signed in?" };
  }

  if (res.status === 404) {
    return { ok: false, error: "KithNode extension ingest is unavailable at this URL." };
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { ok: false, error: body.error || `KithNode returned ${res.status}.` };
  }
  const body = await res.json().catch(() => ({}));
  return { ok: true, body };
}

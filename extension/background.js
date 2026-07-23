chrome.action.onClicked.addListener(async (tab) => {
  if (tab?.id != null) await chrome.sidePanel.open({ tabId: tab.id });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "KITHNODE_RESEARCH_DRAFT") return false;
  createResearchDraft(message.baseUrl, message.token, message.draft)
    .then(sendResponse)
    .catch((error) => sendResponse({ ok: false, error: String(error) }));
  return true;
});

async function createResearchDraft(baseUrl, token, draft) {
  if (!baseUrl || !token) return { ok: false, error: "Add your KithNode URL and pairing token in Settings." };
  const origin = baseUrl.replace(/\/+$/, "");
  try {
    const response = await fetch(`${origin}/api/research/drafts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        sourceType: "linkedin_manual",
        sourceUrl: draft.linkedInUrl,
        target: { company: draft.targetCompany, role: draft.targetRole, location: "", school: "" },
        payload: {
          name: draft.name,
          title: draft.title,
          firmName: draft.firmName,
          education: draft.education,
          location: draft.location,
          linkedInUrl: draft.linkedInUrl,
          whyRelevant: draft.whyRelevant,
          notes: draft.notes,
          skills: draft.skills || [],
          positions: draft.positions || [],
        },
        selectedFields: ["name", "title", "firmName", "location", "education", "notes", "skills", "positions"],
      }),
    });
    const body = await response.json().catch(() => ({}));
    if (response.status === 401) return { ok: false, error: "Pairing token rejected. Create a fresh Research Companion token in KithNode Settings → Integrations." };
    if (!response.ok) return { ok: false, error: body.message || body.error || `KithNode returned ${response.status}.` };
    return { ok: true, reviewUrl: origin + body.reviewUrl };
  } catch {
    return { ok: false, error: "Could not reach KithNode. Check the URL and that the app is running." };
  }
}

const $ = (selector) => document.querySelector(selector);
const fields = ["targetCompany", "targetRole", "name", "title", "firmName", "education", "location", "linkedInUrl", "whyRelevant", "notes"];
let positions = [];
let skills = [];

chrome.storage.local.get(["baseUrl", "pairingToken", "researchDraft"]).then(({ baseUrl, pairingToken, researchDraft }) => {
  $("#baseUrl").value = baseUrl || "http://localhost:3000";
  $("#pairingToken").value = pairingToken || "";
  if (researchDraft) for (const field of fields) $(`[name="${field}"]`).value = researchDraft[field] || "";
  positions = Array.isArray(researchDraft?.positions) ? researchDraft.positions.slice(0, 8) : [];
  skills = normalizeSkills(Array.isArray(researchDraft?.skills) ? researchDraft.skills : [researchDraft?.skills || ""]);
  renderPositions();
  renderSkills();
});

$("#baseUrl").addEventListener("change", (event) => chrome.storage.local.set({ baseUrl: event.target.value.trim() }));
$("#pairingToken").addEventListener("change", (event) => chrome.storage.local.set({ pairingToken: event.target.value.trim() }));

function collect() {
  return {
    ...Object.fromEntries(fields.map((field) => [field, $(`[name="${field}"]`).value.trim()])),
    positions: positions
      .map((position) => ({
        title: (position.title || "").trim(),
        firm: (position.firm || "").trim(),
        employmentType: (position.employmentType || "").trim(),
        start: (position.start || "").trim(),
        end: "Present",
      }))
      .filter((position) => position.title || position.firm),
    skills,
  };
}

function normalizeSkills(values) {
  const seen = new Set();
  return values
    .flatMap((value) => String(value || "").split(/[\n,;•]+/))
    .map((skill) => skill.trim())
    .filter((skill) => {
      const key = skill.toLocaleLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 100);
}

function addSkills(raw) {
  skills = normalizeSkills([...skills, raw]);
  $("#skillInput").value = "";
  renderSkills();
  void persistDraft();
}

function renderSkills() {
  const list = $("#skillList");
  list.replaceChildren();
  $("#skillCount").textContent = `${skills.length} / 100`;
  for (const skill of skills) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "skill-chip";
    chip.setAttribute("aria-label", `Remove ${skill}`);
    chip.textContent = `${skill} ×`;
    chip.addEventListener("click", () => {
      skills = skills.filter((item) => item !== skill);
      renderSkills();
      void persistDraft();
    });
    list.appendChild(chip);
  }
}

function persistDraft() {
  return chrome.storage.local.set({ researchDraft: collect() });
}

function positionField(index, key, label, placeholder = "") {
  const wrapper = document.createElement("label");
  wrapper.textContent = label;
  const input = document.createElement("input");
  input.type = "text";
  input.autocomplete = "off";
  input.placeholder = placeholder;
  input.value = positions[index][key] || "";
  input.addEventListener("input", () => {
    positions[index][key] = input.value;
    void persistDraft();
  });
  wrapper.appendChild(input);
  return wrapper;
}

function renderPositions() {
  const list = $("#positionList");
  list.replaceChildren();
  $("#positionEmpty").hidden = positions.length > 0;
  positions.forEach((position, index) => {
    const row = document.createElement("div");
    row.className = "position-row";
    const title = document.createElement("div");
    title.className = "position-row-title";
    title.textContent = `Position ${index + 1} · Present`;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "position-remove";
    remove.setAttribute("aria-label", `Remove position ${index + 1}`);
    remove.textContent = "×";
    remove.addEventListener("click", () => {
      positions.splice(index, 1);
      renderPositions();
      void persistDraft();
    });
    row.append(title, remove);
    row.append(
      positionField(index, "title", "Role", "e.g. Solutions Architect"),
      positionField(index, "firm", "Organization", "e.g. Red Hat"),
      positionField(index, "employmentType", "Work type", "Full-time, freelance"),
      positionField(index, "start", "Started", "e.g. Jun 2026"),
    );
    list.appendChild(row);
  });
}
function status(message, kind = "") {
  $("#status").textContent = message;
  $("#status").className = `status ${kind}`;
}
function searchUrl(draft) {
  const keywords = [draft.targetRole, draft.targetCompany].filter(Boolean).join(" ");
  return `https://www.linkedin.com/search/results/people/?${new URLSearchParams({ keywords })}`;
}

for (const field of fields) {
  $(`[name="${field}"]`).addEventListener("input", () => void persistDraft());
}

$("#addPosition").addEventListener("click", () => {
  if (positions.length >= 8) {
    status("You can record up to eight positions.", "err");
    return;
  }
  positions.push({
    title: positions.length ? "" : $("[name=title]").value.trim(),
    firm: positions.length ? "" : $("[name=firmName]").value.trim(),
    employmentType: "",
    start: "",
    end: "Present",
  });
  renderPositions();
  void persistDraft();
});

$("#addSkill").addEventListener("click", () => addSkills($("#skillInput").value));
$("#skillInput").addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === ",") {
    event.preventDefault();
    addSkills(event.currentTarget.value);
  }
});
$("#skillInput").addEventListener("paste", (event) => {
  const text = event.clipboardData?.getData("text") || "";
  if (/[\n,;•]/.test(text)) {
    event.preventDefault();
    addSkills(text);
  }
});
$("#skillInput").addEventListener("blur", (event) => {
  if (event.currentTarget.value.trim()) addSkills(event.currentTarget.value);
});

$("#openSearch").addEventListener("click", async () => {
  await chrome.tabs.create({ url: searchUrl(collect()) });
});

$("#saveDraft").addEventListener("click", async () => {
  const draft = collect();
  if (!draft.name || !draft.linkedInUrl) {
    status("Add a name and LinkedIn profile URL first.", "err");
    return;
  }
  const button = $("#saveDraft");
  button.disabled = true;
  status("Creating a private review draft…");
  const result = await chrome.runtime.sendMessage({
    type: "KITHNODE_RESEARCH_DRAFT",
    baseUrl: $("#baseUrl").value.trim(),
    token: $("#pairingToken").value.trim(),
    draft,
  });
  button.disabled = false;
  if (!result?.ok) {
    status(result?.error || "Could not create the draft.", "err");
    return;
  }
  status("Draft ready. Finish the field review in KithNode.", "ok");
  await chrome.tabs.create({ url: result.reviewUrl });
});

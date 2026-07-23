import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { USER_ID, USER_EMAIL } = vi.hoisted(() => ({
  USER_ID: "fixture-student-user",
  USER_EMAIL: "student@kithnode.local",
}));

vi.mock("@/lib/auth", () => ({
  auth: async () => ({ user: { id: USER_ID, email: USER_EMAIL, name: "Jordan Student" } }),
}));

vi.mock("@/lib/jobs/source-service", () => {
  const sources = [
    {
      id: "fixture-source-scale",
      userId: USER_ID,
      company: "Scale AI",
      companyKey: "scale-ai",
      provider: "greenhouse",
      boardToken: "scaleai",
      careerUrl: "https://job-boards.greenhouse.io/scaleai",
      active: true,
    },
    {
      id: "fixture-source-databricks",
      userId: USER_ID,
      company: "Databricks",
      companyKey: "databricks",
      provider: "greenhouse",
      boardToken: "databricks",
      careerUrl: "https://boards.greenhouse.io/databricks",
      active: true,
    },
  ];
  return {
    listJobSources: async () => sources,
    resolveJobSources: async () => ({
      resolved: sources,
      unresolved: [],
      searchConfigured: false,
    }),
    saveJobSource: async () => sources[0],
  };
});

vi.mock("@/lib/jobs/adapters", () => {
  const jobs = {
    "Scale AI": [
      {
        provider: "greenhouse",
        externalId: "fixture-scale-intern",
        company: "Scale AI",
        role: "Applied AI Engineering Intern — Summer 2027",
        location: "New York, NY",
        workMode: "hybrid",
        jobUrl: "https://job-boards.greenhouse.io/scaleai/jobs/fixture-scale-intern",
        applyUrl: "https://job-boards.greenhouse.io/scaleai/jobs/fixture-scale-intern",
        description: "Undergraduate students graduating in 2028. Build Python and RAG systems for enterprise AI.",
        postedAt: new Date("2026-07-20T12:00:00.000Z"),
      },
      {
        provider: "greenhouse",
        externalId: "fixture-scale-fte",
        company: "Scale AI",
        role: "Senior Applied AI Engineer",
        location: "New York, NY",
        workMode: "hybrid",
        jobUrl: "https://job-boards.greenhouse.io/scaleai/jobs/fixture-scale-fte",
        applyUrl: "https://job-boards.greenhouse.io/scaleai/jobs/fixture-scale-fte",
        description: "Experienced full-time position.",
        postedAt: new Date("2026-07-20T12:00:00.000Z"),
      },
    ],
    Databricks: [
      {
        provider: "greenhouse",
        externalId: "fixture-databricks-intern",
        company: "Databricks",
        role: "Product Management Intern — Summer 2027",
        location: "San Francisco, CA",
        workMode: "hybrid",
        jobUrl: "https://boards.greenhouse.io/databricks/jobs/fixture-databricks-intern",
        applyUrl: "https://boards.greenhouse.io/databricks/jobs/fixture-databricks-intern",
        description: "Currently enrolled undergraduate students graduating in 2028.",
        postedAt: new Date("2026-07-18T12:00:00.000Z"),
      },
    ],
  };
  return {
    fetchPublicJobs: async ({ company }: { company: keyof typeof jobs }) => jobs[company] || [],
    fetchPublicJobDetails: async (_source: unknown, job: unknown) => job,
  };
});

import { POST as chat } from "./chat/route";
import { POST as approve } from "./approve/route";
import { POST as undo } from "./actions/[id]/undo/route";
import { GET as history } from "./chat/route";
import { GET as people } from "@/app/api/contacts/route";
import { supabase } from "@/lib/supabase";

const runIntegration = process.env.RUN_LOCAL_AGENT_INTEGRATION === "1" ? describe : describe.skip;

async function clearRunData() {
  const tables = [
    "OpportunityContact",
    "OpportunityEvent",
    "AssistantApproval",
    "AssistantAction",
    "AssistantToolCall",
    "AssistantResult",
    "AssistantMessage",
    "AssistantRun",
    "AssistantConversation",
    "Opportunity",
    "Organization",
  ];
  for (const table of tables) {
    const { error } = await supabase.from(table).delete().eq("userId", USER_ID);
    if (error) throw new Error(`Could not clear ${table}: ${error.message}`);
  }
}

runIntegration("Career Copilot trusted internship golden path", () => {
  beforeAll(clearRunData);
  afterAll(clearRunData);

  it("discovers only student roles, distinguishes relationship trust, saves idempotently, and undoes", async () => {
    const chatResponse = await chat(new NextRequest("http://localhost:3000/api/assistant/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "/find-internships", skillId: "find_internships" }),
    }));
    const chatBody = await chatResponse.json();
    expect(chatResponse.status, JSON.stringify(chatBody)).toBe(200);
    expect(chatBody.skillResult.cards).toHaveLength(2);
    expect(chatBody.skillResult.cards.some((card: { title: string }) => /Senior/.test(card.title))).toBe(false);

    const scaleCard = chatBody.skillResult.cards.find((card: { subtitle: string }) => card.subtitle.startsWith("Scale AI"));
    const databricksCard = chatBody.skillResult.cards.find((card: { subtitle: string }) => card.subtitle.startsWith("Databricks"));
    expect(scaleCard.data.relationshipState).toBe("verified");
    expect(scaleCard.data.relationships[0].evidence[0]).toContain("confirmed");
    expect(databricksCard.data.relationshipState).toBe("potential");
    expect(databricksCard.evidence.join(" ")).toContain("none verified");

    const saveAction = chatBody.proposedActions.find(
      (action: { input: { candidateId?: string } }) => action.input.candidateId === scaleCard.id,
    );
    expect(saveAction).toBeTruthy();

    const approveRequest = () => new NextRequest("http://localhost:3000/api/assistant/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toolCallId: saveAction.id, decision: "approve" }),
    });
    const firstApproval = await approve(approveRequest());
    expect(firstApproval.status).toBe(200);
    const firstReceipt = (await firstApproval.json()).receipt;
    expect(firstReceipt.created).toBe(true);
    expect(firstReceipt.attachedContactIds).toEqual(["fixture-contact-scale-verified"]);

    const repeatedApproval = await approve(approveRequest());
    expect(repeatedApproval.status).toBe(200);
    const repeatedReceipt = (await repeatedApproval.json()).receipt;
    expect(repeatedReceipt.opportunityId).toBe(firstReceipt.opportunityId);

    const { count: opportunityCount } = await supabase
      .from("Opportunity")
      .select("id", { count: "exact", head: true })
      .eq("userId", USER_ID);
    const { data: attachedContacts } = await supabase
      .from("OpportunityContact")
      .select("contactId")
      .eq("userId", USER_ID)
      .eq("opportunityId", firstReceipt.opportunityId);
    expect(opportunityCount).toBe(1);
    expect(attachedContacts).toEqual([{ contactId: "fixture-contact-scale-verified" }]);

    const undoResponse = await undo(
      new Request(`http://localhost:3000/api/assistant/actions/${firstReceipt.actionId}/undo`, { method: "POST" }),
      { params: Promise.resolve({ id: firstReceipt.actionId }) },
    );
    expect(undoResponse.status).toBe(200);
    expect((await undoResponse.json()).receipt.undone).toBe(true);

    const { count: remainingCount } = await supabase
      .from("Opportunity")
      .select("id", { count: "exact", head: true })
      .eq("userId", USER_ID);
    expect(remainingCount).toBe(0);

    const historyResponse = await history(new NextRequest(
      `http://localhost:3000/api/assistant/chat?conversationId=${encodeURIComponent(chatBody.conversationId)}`,
    ));
    const historyBody = await historyResponse.json();
    const savedTool = historyBody.toolCalls.find((tool: { id: string }) => tool.id === saveAction.id);
    expect(savedTool.status).toBe("undone");
    expect(savedTool.output.undone).toBe(true);
  });

  it("projects the same verified-versus-potential trust decision in People", async () => {
    const response = await people();
    const body = await response.json();
    expect(response.status).toBe(200);

    const scale = body.find((person: { id: string }) => person.id === "fixture-contact-scale-verified");
    const databricks = body.find((person: { id: string }) => person.id === "fixture-contact-databricks-potential");
    expect(scale.relationship_state).toBe("verified");
    expect(scale.relationship_class).toBe("kith");
    expect(scale.relationship_evidence).toContain("User confirmed they worked with Maya in a UNC applied-AI course.");
    expect(databricks.relationship_state).toBe("potential");
    expect(databricks.relationship_class).toBe("");
  });
});

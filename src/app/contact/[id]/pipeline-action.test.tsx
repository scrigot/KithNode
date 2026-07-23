import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PipelineAction } from "./pipeline-action";

vi.mock("@/lib/posthog", () => ({ trackEvent: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

describe("PipelineAction", () => {
  it("adds to the only available pipeline, then offers a direct link", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementationOnce(() =>
        jsonResponse({
          pipelines: [
            {
              id: "pl1",
              name: "AI recruiting",
              kind: "RECRUITING",
              firstStage: "researched",
            },
          ],
          membership: null,
        }),
      )
      .mockImplementationOnce(() =>
        jsonResponse({
          contact_id: "c1",
          pipeline_id: "pe1",
          stage: "researched",
        }),
      );

    render(<PipelineAction contactId="c1" contactName="Arth Vijaywargia" />);

    const add = await screen.findByRole("button", { name: /add to pipeline/i });
    fireEvent.click(add);

    const link = await screen.findByRole("link", { name: /view in ai recruiting/i });
    expect(link).toHaveAttribute("href", "/dashboard/pipeline?pipeline=pl1");
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/pipeline/c1",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ pipelineId: "pl1" }),
      }),
    );
  });

  it("asks which pipeline when more than one is available", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementationOnce(() =>
      jsonResponse({
        pipelines: [
          { id: "pl1", name: "AI recruiting", kind: "RECRUITING", firstStage: "researched" },
          { id: "pl2", name: "Professors", kind: "PROFESSORS", firstStage: "identified" },
        ],
        membership: null,
      }),
    );

    render(<PipelineAction contactId="c1" contactName="Arth Vijaywargia" />);

    fireEvent.click(await screen.findByRole("button", { name: /add to pipeline/i }));
    expect(screen.getByRole("menu", { name: /choose a pipeline/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /ai recruiting/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /professors/i })).toBeInTheDocument();
  });

  it("preserves the page and shows a useful message when adding fails", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockImplementationOnce(() =>
        jsonResponse({
          pipelines: [
            { id: "pl1", name: "AI recruiting", kind: "RECRUITING", firstStage: "researched" },
          ],
          membership: null,
        }),
      )
      .mockImplementationOnce(() => jsonResponse({ error: "Database unavailable" }, 503));

    render(<PipelineAction contactId="c1" contactName="Arth Vijaywargia" />);

    fireEvent.click(await screen.findByRole("button", { name: /add to pipeline/i }));
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Could not add this person. Nothing was changed.",
      );
    });
    expect(screen.getByRole("button", { name: /add to pipeline/i })).toBeEnabled();
  });
});

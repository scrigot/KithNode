import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { GuidedResearchWorkspace } from "./guided-research-workspace";
import { apiFetch } from "@/lib/api-client";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/lib/api-client", () => ({
  apiFetch: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("GuidedResearchWorkspace", () => {
  it("opens the real contact detail route after approval", async () => {
    vi.mocked(apiFetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ draft: { id: "draft-1" } }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ contactId: "contact-123", overlay: false }),
      } as Response);

    render(<GuidedResearchWorkspace initialView="research" />);
    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Arth Vijaywargia" } });
    fireEvent.change(screen.getByLabelText("LinkedIn profile URL"), { target: { value: "https://www.linkedin.com/in/arthvijay" } });
    fireEvent.click(screen.getByRole("button", { name: /preview changes/i }));

    fireEvent.click(await screen.findByRole("button", { name: /approve selected fields/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/contact/contact-123"));
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { OutreachSlideOver } from "./outreach-slide-over";

describe("OutreachSlideOver", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders nothing when closed", () => {
    const { container } = render(
      <OutreachSlideOver
        connectionId="conn-1"
        contactName="Jane Doe"
        open={false}
        onClose={() => {}}
      />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("shows loading spinner while fetching", () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));

    render(
      <OutreachSlideOver
        connectionId="conn-1"
        contactName="Jane Doe"
        open={true}
        onClose={() => {}}
      />,
    );

    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
  });

  it("displays the contact name in the header", () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));

    render(
      <OutreachSlideOver
        connectionId="conn-1"
        contactName="Jane Doe"
        open={true}
        onClose={() => {}}
      />,
    );

    expect(screen.getByText("Draft Outreach — Jane Doe")).toBeInTheDocument();
  });

  it("displays draft after loading", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          draft: "Hello Jane, this is a test draft.",
          subject: "Reaching out from UNC",
          alumniName: "Jane Doe",
          alumniEmail: "",
        }),
    });

    render(
      <OutreachSlideOver
        connectionId="conn-1"
        contactName="Jane Doe"
        open={true}
        onClose={() => {}}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("draft-textarea")).toBeInTheDocument();
    });

    const textarea = screen.getByTestId("draft-textarea") as HTMLTextAreaElement;
    expect(textarea.value).toBe("Hello Jane, this is a test draft.");
  });

  it("shows character count", async () => {
    const draftText = "Hello Jane, this is a test draft.";
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          draft: draftText,
          subject: "Reaching out",
          alumniName: "Jane Doe",
          alumniEmail: "",
        }),
    });

    render(
      <OutreachSlideOver
        connectionId="conn-1"
        contactName="Jane Doe"
        open={true}
        onClose={() => {}}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(`${draftText.length} characters`)).toBeInTheDocument();
    });
  });

  it("has an Open in Email link with mailto href", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          draft: "Test draft",
          subject: "Test subject",
          alumniName: "Jane Doe",
          alumniEmail: "",
        }),
    });

    render(
      <OutreachSlideOver
        connectionId="conn-1"
        contactName="Jane Doe"
        open={true}
        onClose={() => {}}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("open-in-email")).toBeInTheDocument();
    });

    const emailLink = screen.getByTestId("open-in-email") as HTMLAnchorElement;
    expect(emailLink.href).toContain("mailto:");
    expect(emailLink.href).toContain("Test%20subject");
  });

  it("allows editing the draft textarea", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          draft: "Original draft",
          subject: "Subject",
          alumniName: "Jane Doe",
          alumniEmail: "",
        }),
    });

    render(
      <OutreachSlideOver
        connectionId="conn-1"
        contactName="Jane Doe"
        open={true}
        onClose={() => {}}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("draft-textarea")).toBeInTheDocument();
    });

    const textarea = screen.getByTestId("draft-textarea") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "Edited draft" } });
    expect(textarea.value).toBe("Edited draft");
  });

  it("shows error message on fetch failure", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Server error" }),
    });

    render(
      <OutreachSlideOver
        connectionId="conn-1"
        contactName="Jane Doe"
        open={true}
        onClose={() => {}}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Could not generate draft. Please try again.")).toBeInTheDocument();
    });
  });

  it("calls onClose when backdrop is clicked", async () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    const onClose = vi.fn();

    render(
      <OutreachSlideOver
        connectionId="conn-1"
        contactName="Jane Doe"
        open={true}
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByTestId("slide-over-backdrop"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

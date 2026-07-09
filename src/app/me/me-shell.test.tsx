import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import MeShell from "./me-shell";

vi.mock("next/font/google", () => ({
  Silkscreen: () => ({ className: "silkscreen" }),
}));

vi.mock("@/components/me/contact-modal", () => ({
  default: () => null,
}));

beforeEach(() => {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
    },
  });
});

afterEach(cleanup);

describe("MeShell", () => {
  it("uses a stacked mobile shell and desktop sidebar classes", () => {
    render(
      <MeShell pipelines={[]} outreachDefaults={{ style: "", length: "", signoff: "", positioning: "", goals: "", preferredEmailClient: "" }}>
        <div>Workspace content</div>
      </MeShell>
    );

    const shell = screen.getByText("Workspace content").closest("main")?.parentElement;
    expect(shell).toHaveClass("flex-col");
    expect(shell).toHaveClass("md:flex-row");

    const nav = screen.getByRole("navigation");
    expect(nav).toHaveClass("overflow-x-auto");
    expect(nav).toHaveClass("md:flex-col");
  });

  it("renders full mobile nav labels instead of collapsed initials", () => {
    render(
      <MeShell pipelines={[]} outreachDefaults={{ style: "", length: "", signoff: "", positioning: "", goals: "", preferredEmailClient: "" }}>
        <div>Workspace content</div>
      </MeShell>
    );

    expect(screen.getAllByText("Discover").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Applications").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Contacts").length).toBeGreaterThan(0);
  });
});

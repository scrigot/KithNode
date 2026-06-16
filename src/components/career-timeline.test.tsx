import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { CareerTimeline } from "./career-timeline";

afterEach(() => {
  cleanup();
});

describe("CareerTimeline", () => {
  it("renders two roles — both titles and both firms appear in the document", () => {
    render(
      <CareerTimeline
        experiences={[
          { title: "Software Engineer", firm: "Acme Corp", start: "Jan 2024", end: "Present" },
          { title: "Intern", firm: "Beta Inc", start: "Jun 2023", end: "Dec 2023" },
        ]}
      />,
    );

    expect(screen.getByText("Software Engineer")).toBeInTheDocument();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("Intern")).toBeInTheDocument();
    expect(screen.getByText("Beta Inc")).toBeInTheDocument();
  });

  it("shows CURRENT tag for role with end: '' and hides it for past roles", () => {
    render(
      <CareerTimeline
        experiences={[
          { title: "CEO", firm: "StartupX", start: "Jan 2025", end: "" },
          { title: "Analyst", firm: "BigBank", start: "Jun 2022", end: "Dec 2024" },
        ]}
      />,
    );

    // CURRENT tag should appear exactly once, next to the CEO role
    const currentTags = screen.getAllByText("CURRENT");
    expect(currentTags).toHaveLength(1);

    // Past role should not have a CURRENT tag
    expect(screen.getByText("Analyst")).toBeInTheDocument();
    // Only one CURRENT tag total confirms Analyst has none
  });

  it("shows CURRENT tag for role with end: 'Present'", () => {
    render(
      <CareerTimeline
        experiences={[
          { title: "Manager", firm: "Corp", start: "Mar 2024", end: "Present" },
        ]}
      />,
    );

    expect(screen.getByText("CURRENT")).toBeInTheDocument();
  });

  it("returns null for empty experiences — no CAREER heading rendered", () => {
    const { container } = render(<CareerTimeline experiences={[]} />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByText("CAREER")).not.toBeInTheDocument();
  });
});

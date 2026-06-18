import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { DeckCard, type DeckContact } from "./deck-card";

const poolContact: DeckContact = {
  id: "658149af-b58e-4a02-8040-121a696e2bb7",
  name: "Greyson Harris",
  title: "Analyst",
  firmName: "Goldman Sachs",
  email: "",
  linkedInUrl: "https://www.linkedin.com/in/greyson",
  education: "UNC",
  location: "Charlotte, NC",
  warmthScore: 72,
  tier: "warm",
  affiliations: "",
  source: "alumni",
};

afterEach(() => {
  cleanup();
});

describe("DeckCard", () => {
  // Regression: Discover only ever surfaces contacts the viewer does NOT own
  // (api/discover excludes the user's own imports). The contact detail edit
  // flow (/contact/:id?edit=1) 404s on GET and 403s on PATCH for non-owners,
  // so an "Edit profile" affordance here can never work — it must not render.
  it("does not render an Edit profile link (uneditable pool contact)", () => {
    render(<DeckCard contact={poolContact} />);
    expect(screen.queryByText(/edit profile/i)).toBeNull();
    const editLink = document.querySelector('a[href*="edit=1"]');
    expect(editLink).toBeNull();
  });

  it("still renders the primary deck actions", () => {
    render(<DeckCard contact={poolContact} />);
    expect(screen.getByLabelText(/skip greyson harris/i)).toBeInTheDocument();
    expect(
      screen.getByLabelText(/add greyson harris to pipeline/i),
    ).toBeInTheDocument();
  });

  it("renders the secondary deck actions", () => {
    const onAddToNetwork = () => {};
    const onLater = () => {};
    render(
      <DeckCard
        contact={poolContact}
        onAddToNetwork={onAddToNetwork}
        onLater={onLater}
      />,
    );
    expect(
      screen.getByLabelText(/add greyson harris to network/i),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/show greyson harris later/i),
    ).toBeInTheDocument();
  });
});

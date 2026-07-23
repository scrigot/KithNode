import { beforeEach, describe, expect, it, vi } from "vitest";

const redirect = vi.fn();

vi.mock("next/navigation", () => ({ redirect }));

describe("legacy dashboard contact detail route", () => {
  beforeEach(() => redirect.mockReset());

  it("redirects old contact links to the canonical contact page", async () => {
    const { default: LegacyContactDetailPage } = await import("./page");

    await LegacyContactDetailPage({ params: Promise.resolve({ id: "contact-123" }) });

    expect(redirect).toHaveBeenCalledWith("/contact/contact-123");
  });
});

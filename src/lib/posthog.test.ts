import { describe, it, expect, vi, beforeEach } from "vitest";

const mockInit = vi.fn();
const mockCapture = vi.fn();
const mockIdentify = vi.fn();

vi.mock("posthog-js", () => ({
  default: {
    init: (...args: unknown[]) => mockInit(...args),
    capture: (...args: unknown[]) => mockCapture(...args),
    identify: (...args: unknown[]) => mockIdentify(...args),
  },
}));

import { initPostHog, trackEvent, identifyUser } from "./posthog";

describe("PostHog analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initPostHog", () => {
    it("does not initialize without NEXT_PUBLIC_POSTHOG_KEY", () => {
      delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
      initPostHog();
      expect(mockInit).not.toHaveBeenCalled();
    });

    it("initializes with NEXT_PUBLIC_POSTHOG_KEY", () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key";
      initPostHog();
      expect(mockInit).toHaveBeenCalledWith("phc_test_key", expect.objectContaining({
        capture_pageview: false,
      }));
      delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    });

    it("uses custom host when provided", () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key";
      process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://custom.posthog.com";
      initPostHog();
      expect(mockInit).toHaveBeenCalledWith("phc_test_key", expect.objectContaining({
        api_host: "https://custom.posthog.com",
      }));
      delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
      delete process.env.NEXT_PUBLIC_POSTHOG_HOST;
    });
  });

  describe("trackEvent", () => {
    it("captures event with posthog", () => {
      trackEvent("outreach_drafted", { connection_id: "123" });
      expect(mockCapture).toHaveBeenCalledWith("outreach_drafted", { connection_id: "123" });
    });

    it("captures event without properties", () => {
      trackEvent("user_signed_up");
      expect(mockCapture).toHaveBeenCalledWith("user_signed_up", undefined);
    });
  });

  describe("identifyUser", () => {
    it("identifies user with posthog", () => {
      identifyUser("user-1", { email: "test@example.com" });
      expect(mockIdentify).toHaveBeenCalledWith("user-1", { email: "test@example.com" });
    });
  });

  describe("event names match spec", () => {
    it("supports all required event names", () => {
      const events = [
        "user_signed_up",
        "contact_viewed",
        "outreach_drafted",
        "outreach_sent",
        "autoguard_triggered",
      ];

      events.forEach((event) => {
        trackEvent(event);
        expect(mockCapture).toHaveBeenCalledWith(event, undefined);
      });

      expect(mockCapture).toHaveBeenCalledTimes(events.length);
    });
  });
});

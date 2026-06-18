"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { initPostHog, identifyUser, trackEvent } from "@/lib/posthog";

let initialized = false;

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (!initialized) {
      initPostHog();
      initialized = true;
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      identifyUser(session.user.id ?? session.user.email ?? "unknown", {
        email: session.user.email ?? undefined,
        name: session.user.name ?? undefined,
      });
      // Once per browser session. This used to capture "user_signed_up" on
      // EVERY authenticated page load, which made the signup funnel garbage.
      if (!sessionStorage.getItem("kn:signin-tracked")) {
        sessionStorage.setItem("kn:signin-tracked", "1");
        trackEvent("user_signed_in");
      }
    }
  }, [status, session]);

  // Activation-success (paid path). Stripe's success page redirects here with
  // ?activated=1; fire the completion event the checkout funnel was missing
  // (the code-redeem path already fires method:code), then strip the param so a
  // reload can't double-count.
  useEffect(() => {
    if (status !== "authenticated" || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("activated") !== "1") return;
    trackEvent("onboarding_activated", { method: "plan" });
    params.delete("activated");
    const qs = params.toString();
    window.history.replaceState(
      {},
      "",
      window.location.pathname + (qs ? `?${qs}` : ""),
    );
  }, [status]);

  return <>{children}</>;
}

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
      trackEvent("user_signed_up");
    }
  }, [status, session]);

  return <>{children}</>;
}

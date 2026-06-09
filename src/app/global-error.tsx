"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif", padding: "24px" }}>
          <div style={{ maxWidth: "420px", textAlign: "center" }}>
            <h2 style={{ marginBottom: "8px", fontSize: "18px", fontWeight: 600 }}>
              Something went wrong
            </h2>
            <p style={{ marginBottom: "24px", color: "#64748b", fontSize: "14px" }}>
              {error.message || "An unexpected error occurred."}
            </p>
            <button
              onClick={reset}
              style={{ border: "1px solid #cbd5e1", background: "white", padding: "8px 16px", fontSize: "14px", cursor: "pointer" }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

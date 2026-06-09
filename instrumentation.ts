export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");

    // Boot-time env presence check. Warns visibly in logs (and Sentry, once
    // initialized) if a production-critical secret is missing, so silent
    // 500s in production can be traced back to a missing var.
    const required = [
      "DATABASE_URL",
      "STRIPE_WEBHOOK_SECRET",
      "STRIPE_SECRET_KEY",
      "AUTH_SECRET",
    ];
    const missing = required.filter((k) => !process.env[k]);
    if (missing.length > 0) {
      const msg = `Missing required env vars: ${missing.join(", ")}`;
      console.error(`[boot] ${msg}`);
      if (process.env.VERCEL_ENV === "production") {
        const Sentry = await import("@sentry/nextjs");
        Sentry.captureMessage(msg, "error");
      }
    }
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export { captureRequestError as onRequestError } from "@sentry/nextjs";

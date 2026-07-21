import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client"],
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.kithnode.ai" }],
        destination: "https://kithnode.ai/:path*",
        permanent: true,
      },
      {
        source: "/request-access",
        destination: "/waitlist",
        permanent: true,
      },
      {
        source: "/dashboard/integrations",
        destination: "/dashboard/settings/integrations",
        permanent: false,
      },
      {
        source: "/dashboard/import",
        destination: "/dashboard/settings/data/import",
        permanent: false,
      },
      {
        source: "/dashboard/billing",
        destination: "/dashboard/settings/billing",
        permanent: false,
      },
      {
        source: "/dashboard/usage",
        destination: "/dashboard/settings/billing/usage",
        permanent: false,
      },
    ];
  },
  async headers() {
    const securityHeaders = [
      {
        key: "X-Content-Type-Options",
        value: "nosniff",
      },
      {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
      },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
      },
      {
        key: "Content-Security-Policy",
        value: "base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
      },
    ];

    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
  // Only upload source maps when SENTRY_AUTH_TOKEN is set
  // (avoids build failures locally / without Sentry configured)
  ...(process.env.SENTRY_AUTH_TOKEN
    ? { authToken: process.env.SENTRY_AUTH_TOKEN }
    : { sourcemaps: { disable: true } }),
});

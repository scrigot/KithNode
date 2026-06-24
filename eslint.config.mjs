import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";

export default [
  js.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        sourceType: "module",
      },
      globals: {
        React: "readonly",
        console: "readonly",
        Response: "readonly",
        process: "readonly",
        globalThis: "readonly",
        fetch: "readonly",
        document: "readonly",
        global: "readonly",
        Buffer: "readonly",
        btoa: "readonly",
        atob: "readonly",
        Request: "readonly",
        HTMLTextAreaElement: "readonly",
        HTMLAnchorElement: "readonly",
        HTMLSelectElement: "readonly",
        HTMLInputElement: "readonly",
        HTMLFormElement: "readonly",
        HTMLDivElement: "readonly",
        HTMLSpanElement: "readonly",
        HTMLCanvasElement: "readonly",
        CanvasRenderingContext2D: "readonly",
        HTMLElement: "readonly",
        window: "readonly",
        navigator: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        performance: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly",
        URLSearchParams: "readonly",
        RequestInit: "readonly",
        Event: "readonly",
        CustomEvent: "readonly",
        KeyboardEvent: "readonly",
        ResizeObserver: "readonly",
        IntersectionObserver: "readonly",
        ReadableStream: "readonly",
        ReadableStreamDefaultController: "readonly",
        TextEncoder: "readonly",
        TextDecoder: "readonly",
        AbortController: "readonly",
        AbortSignal: "readonly",
        File: "readonly",
        FileReader: "readonly",
        FormData: "readonly",
        PointerEvent: "readonly",
        Node: "readonly",
        MutationObserver: "readonly",
      },
    },
    rules: {
      "no-unused-vars": "off",
    },
  },
  {
    // Isolation boundary for the personal "/me" workspace: it must source data
    // via Prisma (local Postgres) ONLY — never the prod Supabase service-role
    // client (@/lib/supabase points at prod and bypasses RLS). This rule makes
    // the boundary a build-time gate, not a convention. See the isolation plan.
    files: ["src/app/me/**/*.{ts,tsx}", "src/app/api/me/**/*.{ts,tsx}", "src/lib/me/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/supabase", "**/lib/supabase", "@supabase/supabase-js"],
              message:
                "The /me personal workspace is isolated: use Prisma against the local Postgres, never the prod Supabase client. (autoplan isolation boundary)",
            },
          ],
        },
      ],
    },
  },
  {
    ignores: [".next/", "node_modules/", "*.config.*", "src/generated/"],
  },
];

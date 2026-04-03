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
        Request: "readonly",
        HTMLTextAreaElement: "readonly",
        HTMLAnchorElement: "readonly",
        HTMLSelectElement: "readonly",
        HTMLInputElement: "readonly",
        window: "readonly",
        navigator: "readonly",
        setTimeout: "readonly",
        URLSearchParams: "readonly",
        RequestInit: "readonly",
      },
    },
    rules: {
      "no-unused-vars": "off",
    },
  },
  {
    ignores: [".next/", "node_modules/", "*.config.*", "src/generated/"],
  },
];

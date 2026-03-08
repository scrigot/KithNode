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

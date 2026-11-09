import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/", "node_modules/", "docs/", "coverage/"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["tools/site/*.js"],
    languageOptions: { globals: { document: "readonly", window: "readonly" } },
    rules: { "@typescript-eslint/no-unused-vars": ["error", { caughtErrors: "none" }] }
  },
  {
    files: ["tools/**/*.mjs"],
    languageOptions: {
      globals: { process: "readonly", console: "readonly", URL: "readonly", Response: "readonly", Buffer: "readonly" }
    }
  }
);

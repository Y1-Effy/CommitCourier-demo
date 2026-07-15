import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default tseslint.config(
  { ignores: ["web/dist/**", "web/dist-ssr/**", "node_modules/**"] },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    rules: {
      // The codebase uses `_req`/`_res` for intentionally-unused Express handler args.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },

  // Browser code (React frontend).
  {
    files: ["web/**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser },
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },

  // Node code (Express server + scripts).
  {
    files: ["server/**/*.ts", "scripts/**/*.{mjs,ts}", "*.{mjs,ts}"],
    languageOptions: { globals: globals.node },
  },

  // Turn off stylistic rules that conflict with Prettier (keep last).
  prettier,
);

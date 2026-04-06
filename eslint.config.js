import js from "@eslint/js";
import prettier from "eslint-plugin-prettier";
import eslintConfigPrettier from "eslint-config-prettier";
import globals from "globals";

export default [
  js.configs.recommended,
  eslintConfigPrettier,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    plugins: { prettier },
    rules: {
      "prettier/prettier": "error",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-console": "off",
    },
  },
  {
    ignores: ["node_modules/", "dist/"],
  },
];

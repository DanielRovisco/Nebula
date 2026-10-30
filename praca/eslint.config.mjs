import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const config = [
  { ignores: [".next/**", "node_modules/**", "drizzle/**", "scripts/fetch-geo.mjs", "next-env.d.ts", "playwright-report/**"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/consistent-type-imports": "warn",
      // Download links to API routes (CSV/PDF) are plain <a href>; page navigation uses next-intl's Link.
      "@next/next/no-html-link-for-pages": "off",
    },
  },
  // Playwright fixtures name their callback `use`, which the hooks rule mistakes for React.use.
  { files: ["e2e/**"], rules: { "react-hooks/rules-of-hooks": "off" } },
];

export default config;

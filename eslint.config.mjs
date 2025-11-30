import path from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
  baseDirectory: path.dirname(fileURLToPath(import.meta.url)),
});

/** @type {import("eslint").Linter.FlatConfig[]} */
export default [
  ...compat.extends("eslint-config-next/core-web-vitals"),
  { ignores: [".next/**", "out/**", "build/**", "next-env.d.ts"] },
];

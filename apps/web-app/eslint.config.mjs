import base from "@neko/config/eslint";
import i18next from "eslint-plugin-i18next";

/**
 * Feature-boundary rules on top of the shared config:
 * - shared/* never imports basic/expert/simulator features
 * - basic and expert never import each other or simulator
 * - simulator imports only shared + infra
 */
export default [
  ...base,
  {
    files: ["src/features/shared/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/features/basic/*",
                "@/features/expert/*",
                "@/features/simulator/*",
              ],
              message: "shared/ features must not import mode-specific features.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/features/basic/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/features/expert/*", "@/features/simulator/*"],
              message:
                "basic/ features must not import expert or simulator features.",
            },
          ],
        },
      ],
    },
  },
  // i18n guard, ratcheted directory-by-directory as each i18n rollout phase
  // lands (see docs/i18n plan). Warn-only for now: it flags regressions
  // without blocking CI on pre-existing patterns the rule can't tell apart
  // from real UI copy (e.g. dev-only strings).
  {
    files: [
      "src/features/basic/**/*.{ts,tsx}",
      "src/components/**/*.{ts,tsx}",
      "src/features/shared/ui-mode/**/*.{ts,tsx}",
    ],
    plugins: { i18next },
    rules: {
      "i18next/no-literal-string": [
        "warn",
        {
          mode: "jsx-text-only",
          "jsx-attributes": { include: ["alt", "aria-label", "title", "placeholder"] },
          // Language endonyms are intentionally shown in their own language
          // regardless of UI locale (e.g. "Español" stays "Español" in English).
          words: { exclude: ["English", "Español"] },
        },
      ],
    },
  },
  {
    files: ["src/features/expert/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/features/basic/*", "@/features/simulator/*"],
              message:
                "expert/ features must not import basic or simulator features.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/features/simulator/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/features/basic/*", "@/features/expert/*"],
              message:
                "simulator/ features must not import basic or expert features.",
            },
          ],
        },
      ],
    },
  },
];

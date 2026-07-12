import base from "@neko/config/eslint";

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

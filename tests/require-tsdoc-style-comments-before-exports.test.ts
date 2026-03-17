import test from "node:test";

import { RuleTester } from "eslint";
import tsParser from "@typescript-eslint/parser";

import { requireTSDocStyleCommentsBeforeExportsRule } from "../src/rules/require-tsdoc-style-comments-before-exports.js";

type RuleTesterCallback = (
  this: { timeout: () => void },
  t: unknown,
) => void | Promise<void>;

RuleTester.describe = (text: string, method: RuleTesterCallback) => {
  void test(text, async (t) => {
    await Promise.resolve(
      method.call(
        {
          timeout() {
            return;
          },
        },
        t,
      ),
    );
  });
};

RuleTester.it = (text: string, method: RuleTesterCallback) => {
  void test(text, async (t) => {
    await Promise.resolve(
      method.call(
        {
          timeout() {
            return;
          },
        },
        t,
      ),
    );
  });
};

RuleTester.itOnly = RuleTester.it;

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
});

ruleTester.run(
  "require-tsdoc-style-comments-before-exports",
  requireTSDocStyleCommentsBeforeExportsRule,
  {
    valid: [
      {
        filename: "module.ts",
        code: "/**\n * Exported answer.\n */\nexport const answer = 42;\n",
      },
      {
        filename: "module.ts",
        code: "/**\n * Exported answer.\n */\n/**\n * Additional detail.\n */\nexport const answer = 42;\n",
      },
      {
        filename: "module.ts",
        code: "/**\n * First export.\n */\nexport const answer = 42;\n\n/**\n * Re-export.\n */\nexport { answer };\n",
      },
      {
        filename: "module.ts",
        code: "/**\n * Default export.\n */\nexport default function answer() {}\n",
      },
      {
        filename: "module.ts",
        code: "/** First. */\n/** Second. */\nexport const answer = 42;\n",
      },
      {
        filename: "module.ts",
        code: "export const answer = 42;\n",
      },
      {
        filename: "module.ts",
        code: "/**\n * Exported answer.\n */\n\nexport const answer = 42;\n",
      },
      {
        filename: "module.ts",
        code: "/** Material types. */\n\nexport type List = Material & {\n    type: typeof MaterialType.LIST;\n    lexiconEntries: (LexiconEntry & { body: null })[];\n};\n\nexport type Book = Material & {\n    type: typeof MaterialType.BOOK;\n};\n",
      },
      {
        filename: "module.ts",
        code: "const answer = 42;\n\n/* detached comment */\n\nexport { answer };\n",
      },
      {
        filename: "module.ts",
        code: "// Internal note\nconst answer = 42;\n\nexport { answer };\n",
      },
    ],
    invalid: [
      {
        filename: "module.ts",
        code: "// Exported answer\nexport const answer = 42;\n",
        errors: [
          {
            message:
              "Comments immediately before exported declarations must use TSDoc /** ... */ style.",
          },
        ],
      },
      {
        filename: "module.ts",
        code: "/* Exported answer */\nexport const answer = 42;\n",
        errors: [
          {
            message:
              "Comments immediately before exported declarations must use TSDoc /** ... */ style.",
          },
        ],
      },
      {
        filename: "module.ts",
        code: "/**\n * Good.\n */\n/* Bad. */\nexport const answer = 42;\n",
        errors: [
          {
            message:
              "Comments immediately before exported declarations must use TSDoc /** ... */ style.",
          },
        ],
      },
      {
        filename: "module.ts",
        code: '// Re-exported API\nexport { answer } from "./answer.js";\n',
        errors: [
          {
            message:
              "Comments immediately before exported declarations must use TSDoc /** ... */ style.",
          },
        ],
      },
    ],
  },
);

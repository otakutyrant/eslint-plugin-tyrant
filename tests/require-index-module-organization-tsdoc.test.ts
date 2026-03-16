import test from "node:test";

import { RuleTester } from "eslint";
import tsParser from "@typescript-eslint/parser";

import { requireIndexModuleOrganizationTSDocRule } from "../src/rules/require-index-module-organization-tsdoc.js";

type RuleTesterCallback = (this: { timeout: () => void }, t: unknown) => void | Promise<void>;

RuleTester.describe = (text: string, method: RuleTesterCallback) => {
  void test(text, async (t) => {
    await Promise.resolve(
      method.call(
        {
          timeout() {
            return;
          }
        },
        t
      )
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
          }
        },
        t
      )
    );
  });
};

RuleTester.itOnly = RuleTester.it;

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      ecmaFeatures: {
        jsx: true
      }
    }
  }
});

ruleTester.run("require-index-module-organization-tsdoc", requireIndexModuleOrganizationTSDocRule, {
  valid: [
    {
      filename: "index.ts",
      code: "/**\n * Flat modules\n */\n\nexport * from \"./feature.js\";\n"
    },
    {
      filename: "index.mts",
      code: "/**\n * This directory uses Hierarchial modules.\n */\n\nexport * from \"./feature.js\";\n"
    },
    {
      filename: "feature.ts",
      code: "/**\n * File docs.\n */\n\nexport const feature = true;\n"
    },
    {
      filename: "plain.js",
      code: "export const skipped = true;\n"
    }
  ],
  invalid: [
    {
      filename: "index.ts",
      code: "export * from \"./feature.js\";\n",
      errors: [
        {
          message:
            '"Flat modules" or "Hierarchial modules" are missing in file tsdoc so we do not know how modules are organized in the corresponding directory that the index.ts represents.'
        }
      ]
    },
    {
      filename: "index.ts",
      code: "/**\n * File docs.\n */\n\nexport * from \"./feature.js\";\n",
      errors: [
        {
          message:
            '"Flat modules" or "Hierarchial modules" are missing in file tsdoc so we do not know how modules are organized in the corresponding directory that the index.ts represents.'
        }
      ]
    },
    {
      filename: "index.tsx",
      code: "/**\n * Flat module layout\n */\n\nexport function Component() { return <div />; }\n",
      errors: [
        {
          message:
            '"Flat modules" or "Hierarchial modules" are missing in file tsdoc so we do not know how modules are organized in the corresponding directory that the index.ts represents.'
        }
      ]
    }
  ]
});

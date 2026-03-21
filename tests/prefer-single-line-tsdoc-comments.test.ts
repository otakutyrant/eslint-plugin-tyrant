import test from "node:test";

import { RuleTester } from "eslint";
import tsParser from "@typescript-eslint/parser";

import { preferSingleLineTSDocCommentsRule } from "../src/rules/prefer-single-line-tsdoc-comments.js";

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
  "prefer-single-line-tsdoc-comments",
  preferSingleLineTSDocCommentsRule,
  {
    valid: [
      {
        filename: "module.ts",
        code: "/** One line. */\nexport const answer = 42;\n",
      },
      {
        filename: "module.ts",
        code: "/**\n * First line.\n * Second line.\n */\nexport const answer = 42;\n",
      },
      {
        filename: "module.ts",
        code: "/**\n * This TSDoc comment is intentionally long enough that keeping it on one line would exceed the maximum length.\n */\nexport const answer = 42;\n",
      },
      {
        filename: "module.js",
        code: "/**\n * One line.\n */\nexport const answer = 42;\n",
      },
    ],
    invalid: [
      {
        filename: "module.ts",
        code: "/**\n * One line.\n */\nexport const answer = 42;\n",
        output: "/** One line. */\nexport const answer = 42;\n",
        errors: [
          {
            message:
              "TSDoc comments with a single line shorter than 80 characters should stay on one line.",
          },
        ],
      },
      {
        filename: "module.ts",
        code: "/**\n * File docs.\n */\n\nexport const answer = 42;\n",
        output: "/** File docs. */\n\nexport const answer = 42;\n",
        errors: [
          {
            message:
              "TSDoc comments with a single line shorter than 80 characters should stay on one line.",
          },
        ],
      },
      {
        filename: "module.ts",
        code: "/**\n * @public\n */\nexport const answer = 42;\n",
        output: "/** @public */\nexport const answer = 42;\n",
        errors: [
          {
            message:
              "TSDoc comments with a single line shorter than 80 characters should stay on one line.",
          },
        ],
      },
      {
        filename: "module.ts",
        code: "/**\r\n * One line.\r\n */\r\nexport const answer = 42;\r\n",
        output: "/** One line. */\r\nexport const answer = 42;\r\n",
        errors: [
          {
            message:
              "TSDoc comments with a single line shorter than 80 characters should stay on one line.",
          },
        ],
      },
    ],
  },
);

import test from "node:test";

import { RuleTester } from "eslint";
import tsParser from "@typescript-eslint/parser";

import { requireEmptyLineAfterFileTSDocRule } from "../src/rules/require-empty-line-after-file-tsdoc.js";
import { requireFileTSDocRule } from "../src/rules/require-file-tsdoc.js";

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

ruleTester.run("require-file-tsdoc", requireFileTSDocRule, {
  valid: [
    {
      filename: "module.ts",
      code: "/**\n * File docs.\n */\n\nexport const answer = 42;\n",
    },
    {
      filename: "component.tsx",
      code: "/**\n * Component docs.\n */\n\nexport function Component() { return <div />; }\n",
    },
    {
      filename: "cli.ts",
      code: "#!/usr/bin/env node\n\n/**\n * CLI entrypoint.\n */\n\nexport const answer = 42;\n",
    },
    {
      filename: "plain.js",
      code: "export const skipped = true;\n",
    },
  ],
  invalid: [
    {
      filename: "missing.ts",
      code: "export const answer = 42;\n",
      errors: [
        {
          message:
            "Missing a top-level /** ... */ TSDoc block as a file comment. You can disable this rule in the file if it is not necessary.",
        },
      ],
    },
    {
      filename: "wrong-comment.ts",
      code: "// Not TSDoc\nexport const answer = 42;\n",
      errors: [
        {
          message:
            "Missing a top-level /** ... */ TSDoc block as a file comment. You can disable this rule in the file if it is not necessary.",
        },
      ],
    },
    {
      filename: "shebang-without-tsdoc.ts",
      code: "#!/usr/bin/env node\n\nexport const answer = 42;\n",
      errors: [
        {
          message:
            "Missing a top-level /** ... */ TSDoc block as a file comment. You can disable this rule in the file if it is not necessary.",
        },
      ],
    },
  ],
});

ruleTester.run(
  "require-empty-line-after-file-tsdoc",
  requireEmptyLineAfterFileTSDocRule,
  {
    valid: [
      {
        filename: "module.ts",
        code: "/**\n * File docs.\n */\n\nexport const answer = 42;\n",
      },
      {
        filename: "module-with-more-space.ts",
        code: "/**\n * File docs.\n */\n\n\nexport const answer = 42;\n",
      },
      {
        filename: "cli.ts",
        code: "#!/usr/bin/env node\n\n/**\n * CLI entrypoint.\n */\n\nexport const answer = 42;\n",
      },
      {
        filename: "missing-tsdoc.ts",
        code: "export const answer = 42;\n",
      },
      {
        filename: "comment-only.ts",
        code: "/**\n * File docs.\n */",
      },
      {
        filename: "comment-only-trailing-newline.ts",
        code: "/**\n * File docs.\n */\n",
      },
    ],
    invalid: [
      {
        filename: "no-gap.ts",
        code: "/**\n * File docs.\n */\nexport const answer = 42;\n",
        errors: [
          {
            message:
              "There should be at least one empty line after the top-level file TSDoc comment.",
          },
        ],
      },
      {
        filename: "cli-no-gap.ts",
        code: "#!/usr/bin/env node\n\n/**\n * CLI entrypoint.\n */\nexport const answer = 42;\n",
        errors: [
          {
            message:
              "There should be at least one empty line after the top-level file TSDoc comment.",
          },
        ],
      },
    ],
  },
);

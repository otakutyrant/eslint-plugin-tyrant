import test from "node:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";

import { RuleTester } from "eslint";
import tsParser from "@typescript-eslint/parser";

import { restrictRelativeImportsToBaseModuleRule } from "../src/rules/restrict-relative-imports-to-base-module.js";

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

const fixtureRoot = mkdtempSync(
  path.join(tmpdir(), "eslint-plugin-tyrant-relative-imports-"),
);

writeFileSync(
  path.join(fixtureRoot, "tsconfig.json"),
  JSON.stringify(
    {
      compilerOptions: {
        baseUrl: ".",
        module: "NodeNext",
        moduleResolution: "NodeNext",
      },
    },
    null,
    2,
  ),
);
writeFileSync(path.join(fixtureRoot, "user.ts"), "export interface User {}\n");
writeFileSync(
  path.join(fixtureRoot, "user.types.ts"),
  'import type { User } from "./user";\nexport type UserRecord = User;\n',
);
writeFileSync(
  path.join(fixtureRoot, "helper.ts"),
  "export const helper = 1;\n",
);
writeFileSync(path.join(fixtureRoot, "consumer.ts"), "export const value = 1;\n");

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
  "restrict-relative-imports-to-base-module",
  restrictRelativeImportsToBaseModuleRule,
  {
    valid: [
      {
        filename: path.join(fixtureRoot, "user.types.ts"),
        code: 'import type { User } from "./user";\nexport type UserRecord = User;\n',
      },
      {
        filename: path.join(fixtureRoot, "user.types.ts"),
        code: 'import type { Rule } from "eslint";\nexport type UserRule = Rule.RuleModule;\n',
      },
      {
        filename: path.join(fixtureRoot, "user.types.ts"),
        code: 'import { helper } from "helper";\nexport const value = helper;\n',
      },
      {
        filename: path.join(fixtureRoot, "plain.js"),
        code: 'import { helper } from "./helper";\nexport const value = helper;\n',
      },
    ],
    invalid: [
      {
        filename: path.join(fixtureRoot, "user.types.ts"),
        code: 'import { helper } from "./helper";\nexport const value = helper;\n',
        errors: [
          {
            message:
              "Relative imports are only allowed when a sibling submodule imports its base module from the same directory.",
          },
        ],
      },
      {
        filename: path.join(fixtureRoot, "consumer.ts"),
        code: 'import { helper } from "./helper";\nexport const value = helper;\n',
        errors: [
          {
            message:
              "Relative imports are only allowed when a sibling submodule imports its base module from the same directory.",
          },
        ],
      },
      {
        filename: path.join(fixtureRoot, "user.types.ts"),
        code: 'import type { User } from "user";\nexport type UserRecord = User;\n',
        errors: [
          {
            message:
              "When 'user.types' imports the sibling base module 'user', use a relative import such as './user'.",
          },
        ],
      },
    ],
  },
);

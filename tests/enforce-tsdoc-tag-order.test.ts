import test from "node:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";

import { RuleTester } from "eslint";
import tsParser from "@typescript-eslint/parser";

import { enforceTSDocTagOrderRule } from "../src/rules/enforce-tsdoc-tag-order.js";

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
  path.join(tmpdir(), "eslint-plugin-tyrant-tsdoc-tag-order-"),
);

mkdirSync(path.join(fixtureRoot, "src"), { recursive: true });
mkdirSync(path.join(fixtureRoot, "nested", "src"), { recursive: true });

writeFileSync(
  path.join(fixtureRoot, "tsdoc.json"),
  `{
  "supportForTags": {
    "@remarks": true,

    "@param": true,
    "@returns": true,
    "@throws": true,

    "@example": true,
    "@deprecated": true
  }
}
`,
);

writeFileSync(
  path.join(fixtureRoot, "nested", "tsdoc.json"),
  `{
  "supportForTags": {
    "@deprecated": true,
    "@remarks": true
  }
}
`,
);

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

ruleTester.run("enforce-tsdoc-tag-order", enforceTSDocTagOrderRule, {
  valid: [
    {
      filename: path.join(fixtureRoot, "src", "module.ts"),
      code: `/**
 * Formats the input.
 *
 * @remarks Used by the serializer.
 *
 * @param value - The input value.
 * @returns The formatted value.
 * @throws Error when formatting fails.
 *
 * @example
 * format("a");
 */
export function format(value: string): string {
  return value;
}
`,
    },
    {
      filename: path.join(fixtureRoot, "src", "unknown-tag.ts"),
      code: `/**
 * Formats the input.
 *
 * @remarks Used by the serializer.
 * @customTag This tag is ignored by the rule.
 * @param value - The input value.
 * @returns The formatted value.
 */
export function format(value: string): string {
  return value;
}
`,
    },
    {
      filename: path.join(fixtureRoot, "nested", "src", "module.ts"),
      code: `/**
 * Nested config wins.
 *
 * @deprecated Use next().
 * @remarks Kept for compatibility.
 */
export function format(): void {}
`,
    },
    {
      filename: path.join(fixtureRoot, "src", "plain.ts"),
      code: `/**
 * No tags here.
 */
export const value = 1;
`,
    },
  ],
  invalid: [
    {
      filename: path.join(fixtureRoot, "src", "module.ts"),
      code: `/**
 * Formats the input.
 *
 * @param value - The input value.
 * @remarks Used by the serializer.
 * @returns The formatted value.
 */
export function format(value: string): string {
  return value;
}
`,
      errors: [
        {
          message:
            "TSDoc tags must follow the order and blank-line grouping from supportForTags in the nearest tsdoc.json file.",
        },
      ],
      output: `/**
 * Formats the input.
 *
 * @remarks Used by the serializer.
 *
 * @param value - The input value.
 * @returns The formatted value.
 */
export function format(value: string): string {
  return value;
}
`,
    },
    {
      filename: path.join(fixtureRoot, "src", "spacing.ts"),
      code: `/**
 * Formats the input.
 *
 * @remarks Used by the serializer.
 * @param value - The input value.
 * @returns The formatted value.
 *
 * @example
 * format("a");
 */
export function format(value: string): string {
  return value;
}
`,
      errors: [
        {
          message:
            "TSDoc tags must follow the order and blank-line grouping from supportForTags in the nearest tsdoc.json file.",
        },
      ],
      output: `/**
 * Formats the input.
 *
 * @remarks Used by the serializer.
 *
 * @param value - The input value.
 * @returns The formatted value.
 *
 * @example
 * format("a");
 */
export function format(value: string): string {
  return value;
}
`,
    },
    {
      filename: path.join(fixtureRoot, "nested", "src", "module.ts"),
      code: `/**
 * Nested config wins.
 *
 * @remarks Kept for compatibility.
 * @deprecated Use next().
 */
export function format(): void {}
`,
      errors: [
        {
          message:
            "TSDoc tags must follow the order and blank-line grouping from supportForTags in the nearest tsdoc.json file.",
        },
      ],
      output: `/**
 * Nested config wins.
 *
 * @deprecated Use next().
 * @remarks Kept for compatibility.
 */
export function format(): void {}
`,
    },
  ],
});

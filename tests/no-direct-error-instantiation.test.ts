import test from "node:test";

import { RuleTester } from "eslint";
import tsParser from "@typescript-eslint/parser";

import { noDirectErrorInstantiationRule } from "../src/rules/no-direct-error-instantiation.js";

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
  },
});

ruleTester.run(
  "no-direct-error-instantiation",
  noDirectErrorInstantiationRule,
  {
    valid: [
      {
        code: `
          class DomainError extends Error {}

          throw new DomainError("Broken domain invariant.");
        `,
      },
      {
        code: `
          const Error = createDomainErrorFactory();

          throw new Error("Shadowed identifier.");
        `,
      },
      {
        code: `
          class ValidationError extends globalThis.Error {}

          throw new ValidationError("Invalid input.");
        `,
      },
      {
        code: `
          const customNamespace = {
            Error: class CustomError {},
          };

          throw new customNamespace.Error("Allowed custom error type.");
        `,
      },
    ],
    invalid: [
      {
        code: 'throw new Error("Broken invariant.");',
        errors: [
          {
            message:
              "Do not instantiate Error directly. Define and use a DomainError class that extends Error instead.",
          },
        ],
      },
      {
        code: 'throw new globalThis.Error("Broken invariant.");',
        errors: [
          {
            message:
              "Do not instantiate Error directly. Define and use a DomainError class that extends Error instead.",
          },
        ],
      },
    ],
  },
);

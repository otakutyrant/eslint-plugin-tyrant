import test from "node:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";

import { RuleTester } from "eslint";
import tsParser from "@typescript-eslint/parser";

import { enforceModuleLayerDependenciesRule } from "../src/rules/enforce-module-layer-dependencies.js";

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
  path.join(tmpdir(), "eslint-plugin-tyrant-layer-dependencies-"),
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

for (const directory of [
  "lib",
  "corpus",
  "services",
  "components",
  "app",
  "scripts",
]) {
  mkdirSync(path.join(fixtureRoot, directory), { recursive: true });
}

writeFileSync(
  path.join(fixtureRoot, "lib", "utils.ts"),
  "export const utils = 1;\n",
);
writeFileSync(
  path.join(fixtureRoot, "corpus", "index.ts"),
  "export const corpus = 1;\n",
);
writeFileSync(
  path.join(fixtureRoot, "services", "library.ts"),
  "export const library = 1;\n",
);
writeFileSync(
  path.join(fixtureRoot, "components", "button.tsx"),
  "export const Button = () => null;\n",
);
writeFileSync(
  path.join(fixtureRoot, "app", "page.tsx"),
  "export const Page = () => null;\n",
);
writeFileSync(
  path.join(fixtureRoot, "scripts", "task.ts"),
  "export const task = 1;\n",
);

const layers = ["lib", "corpus", "services", "components", "app"];

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
  "enforce-module-layer-dependencies",
  enforceModuleLayerDependenciesRule,
  {
    valid: [
      {
        filename: path.join(fixtureRoot, "app", "page.tsx"),
        code: 'import { library } from "services/library";\nexport const page = library;\n',
        options: [layers],
      },
      {
        filename: path.join(fixtureRoot, "services", "consumer.ts"),
        code: 'import { utils } from "../lib/utils";\nexport const consumer = utils;\n',
        options: [layers],
      },
      {
        filename: path.join(fixtureRoot, "components", "consumer.tsx"),
        code: 'import { Button } from "./button";\nexport const consumer = Button;\n',
        options: [layers],
      },
      {
        filename: path.join(fixtureRoot, "scripts", "task.ts"),
        code: 'import { Page } from "app/page";\nexport const taskPage = Page;\n',
        options: [layers],
      },
      {
        filename: path.join(fixtureRoot, "services", "consumer.ts"),
        code: 'import type { Rule } from "eslint";\nexport type ConsumerRule = Rule.RuleModule;\n',
        options: [layers],
      },
    ],
    invalid: [
      {
        filename: path.join(fixtureRoot, "services", "consumer.ts"),
        code: 'import { Page } from "app/page";\nexport const consumer = Page;\n',
        options: [layers],
        errors: [
          {
            message:
              "Layer 'services' must not depend on higher layer 'app'. 'services/consumer.ts' imports 'app/page.tsx'.",
          },
        ],
      },
      {
        filename: path.join(fixtureRoot, "corpus", "consumer.ts"),
        code: 'import { library } from "../services/library";\nexport const consumer = library;\n',
        options: [layers],
        errors: [
          {
            message:
              "Layer 'corpus' must not depend on higher layer 'services'. 'corpus/consumer.ts' imports 'services/library.ts'.",
          },
        ],
      },
      {
        filename: path.join(fixtureRoot, "components", "consumer.tsx"),
        code: 'import { Page } from "app/page";\nexport const consumer = Page;\n',
        options: [layers],
        errors: [
          {
            message:
              "Layer 'components' must not depend on higher layer 'app'. 'components/consumer.tsx' imports 'app/page.tsx'.",
          },
        ],
      },
    ],
  },
);

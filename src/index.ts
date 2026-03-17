import type { ESLint, Linter } from "eslint";

import { requireEmptyLineAfterFileTSDocRule } from "./rules/require-empty-line-after-file-tsdoc.js";
import { requireFileTSDocRule } from "./rules/require-file-tsdoc.js";
import { requireIndexModuleOrganizationTSDocRule } from "./rules/require-index-module-organization-tsdoc.js";
import { requireTSDocStyleCommentsBeforeExportsRule } from "./rules/require-tsdoc-style-comments-before-exports.js";

export const rules = {
  "require-empty-line-after-file-tsdoc": requireEmptyLineAfterFileTSDocRule,
  "require-file-tsdoc": requireFileTSDocRule,
  "require-index-module-organization-tsdoc":
    requireIndexModuleOrganizationTSDocRule,
  "require-tsdoc-style-comments-before-exports":
    requireTSDocStyleCommentsBeforeExportsRule,
} as const;

const pluginMeta = {
  name: "eslint-plugin-tyrant",
  version: "0.5.3",
} as const;

const pluginObject = {
  meta: pluginMeta,
  rules,
};

export const configs = {
  recommended: [
    {
      files: ["**/*.{ts,tsx,mts,cts}"],
      plugins: {
        tyrant: pluginObject,
      },
      rules: {
        "tyrant/require-empty-line-after-file-tsdoc": "error",
        "tyrant/require-file-tsdoc": "error",
        "tyrant/require-index-module-organization-tsdoc": "error",
        "tyrant/require-tsdoc-style-comments-before-exports": "error",
      },
    },
  ] satisfies Linter.Config[],
  recommendedTypeScript: [
    {
      files: ["**/*.{ts,tsx,mts,cts}"],
      plugins: {
        tyrant: pluginObject,
      },
      rules: {
        "tyrant/require-empty-line-after-file-tsdoc": "error",
        "tyrant/require-file-tsdoc": "error",
        "tyrant/require-index-module-organization-tsdoc": "error",
        "tyrant/require-tsdoc-style-comments-before-exports": "error",
      },
    },
  ] satisfies Linter.Config[],
};

const plugin = {
  meta: pluginMeta,
  rules,
  configs,
} satisfies ESLint.Plugin;

export default plugin;

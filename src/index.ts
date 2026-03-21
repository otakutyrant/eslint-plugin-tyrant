import type { ESLint, Linter } from "eslint";

import { preferSingleLineTSDocCommentsRule } from "./rules/prefer-single-line-tsdoc-comments.js";
import { requireEmptyLineAfterFileTSDocRule } from "./rules/require-empty-line-after-file-tsdoc.js";
import { requireFileTSDocRule } from "./rules/require-file-tsdoc.js";
import { requireIndexModuleOrganizationTSDocRule } from "./rules/require-index-module-organization-tsdoc.js";
import { requireTSDocStyleCommentsBeforeExportsRule } from "./rules/require-tsdoc-style-comments-before-exports.js";
import { restrictRelativeImportsToBaseModuleRule } from "./rules/restrict-relative-imports-to-base-module.js";

export const rules = {
  "prefer-single-line-tsdoc-comments": preferSingleLineTSDocCommentsRule,
  "require-empty-line-after-file-tsdoc": requireEmptyLineAfterFileTSDocRule,
  "require-file-tsdoc": requireFileTSDocRule,
  "require-index-module-organization-tsdoc":
    requireIndexModuleOrganizationTSDocRule,
  "require-tsdoc-style-comments-before-exports":
    requireTSDocStyleCommentsBeforeExportsRule,
  "restrict-relative-imports-to-base-module":
    restrictRelativeImportsToBaseModuleRule,
} as const;

const pluginMeta = {
  name: "eslint-plugin-tyrant",
  version: "0.5.6",
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
        "tyrant/prefer-single-line-tsdoc-comments": "error",
        "tyrant/require-empty-line-after-file-tsdoc": "error",
        "tyrant/require-file-tsdoc": "error",
        "tyrant/require-index-module-organization-tsdoc": "error",
        "tyrant/require-tsdoc-style-comments-before-exports": "error",
        "tyrant/restrict-relative-imports-to-base-module": "error",
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
        "tyrant/prefer-single-line-tsdoc-comments": "error",
        "tyrant/require-empty-line-after-file-tsdoc": "error",
        "tyrant/require-file-tsdoc": "error",
        "tyrant/require-index-module-organization-tsdoc": "error",
        "tyrant/require-tsdoc-style-comments-before-exports": "error",
        "tyrant/restrict-relative-imports-to-base-module": "error",
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

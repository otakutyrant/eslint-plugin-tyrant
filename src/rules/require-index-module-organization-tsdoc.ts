import path from "node:path";

import type { Rule } from "eslint";

import {
  getTopLevelTSDocComment,
  isTypeScriptFilename,
} from "./file-tsdoc-utils.js";

const MESSAGE_ID = "missingIndexModuleOrganizationTSDoc";
const REQUIRED_MARKERS = ["Flat modules", "Hierarchial modules"] as const;

function isTypeScriptIndexFilename(filename: string): boolean {
  return (
    isTypeScriptFilename(filename) && path.parse(filename).name === "index"
  );
}

export const requireIndexModuleOrganizationTSDocRule: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Require index TypeScript modules to document whether the directory uses Flat modules or Hierarchial modules.",
    },
    hasSuggestions: false,
    schema: [],
    messages: {
      [MESSAGE_ID]:
        '"Flat modules" or "Hierarchial modules" are missing in file tsdoc so we do not know how modules are organized in the corresponding directory that the index.ts represents.',
    },
  },
  create(context) {
    if (!isTypeScriptIndexFilename(context.filename)) {
      return {};
    }

    return {
      Program(node) {
        const fileTSDocComment = getTopLevelTSDocComment(context.sourceCode);

        if (!fileTSDocComment) {
          context.report({
            node,
            loc: { line: 1, column: 0 },
            messageId: MESSAGE_ID,
          });
          return;
        }

        const fileTSDocText = context.sourceCode
          .getText()
          .slice(fileTSDocComment.start, fileTSDocComment.end);

        if (REQUIRED_MARKERS.some((marker) => fileTSDocText.includes(marker))) {
          return;
        }

        context.report({
          node,
          loc: context.sourceCode.getLocFromIndex(fileTSDocComment.start),
          messageId: MESSAGE_ID,
        });
      },
    };
  },
};

import type { Rule } from "eslint";

import {
  getTopLevelTSDocComment,
  isTypeScriptFilename,
} from "./file-tsdoc-utils.js";

const MESSAGE_ID = "missingEmptyLineAfterFileTSDoc";

export const requireEmptyLineAfterFileTSDocRule: Rule.RuleModule = {
  meta: {
    type: "layout",
    docs: {
      description:
        "Require an empty line after the top-level file TSDoc comment.",
    },
    hasSuggestions: false,
    schema: [],
    messages: {
      [MESSAGE_ID]:
        "There should be at least one empty line after the top-level file TSDoc comment.",
    },
  },
  create(context) {
    if (!isTypeScriptFilename(context.filename)) {
      return {};
    }

    return {
      Program(node) {
        const fileTSDocComment = getTopLevelTSDocComment(context.sourceCode);

        if (!fileTSDocComment) {
          return;
        }

        const textAfterComment = context.sourceCode
          .getText()
          .slice(fileTSDocComment.end);

        if (textAfterComment.trim() === "") {
          return;
        }

        if (
          textAfterComment.startsWith("\n\n") ||
          textAfterComment.startsWith("\r\n\r\n")
        ) {
          return;
        }

        context.report({
          node,
          loc: context.sourceCode.getLocFromIndex(fileTSDocComment.end),
          messageId: MESSAGE_ID,
        });
      },
    };
  },
};

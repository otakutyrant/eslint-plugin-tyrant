import type { Rule } from "eslint";

import { getTopLevelTSDocComment, isTypeScriptFilename } from "./file-tsdoc-utils.js";

const MESSAGE_ID = "missingFileTSDoc";

export const requireFileTSDocRule: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Require a TSDoc block comment at the start of every TypeScript file."
    },
    hasSuggestions: false,
    schema: [],
    messages: {
      [MESSAGE_ID]:
        "Missing a top-level /** ... */ TSDoc block as a file comment. You can disable this rule in the file if it is not necessary."
    }
  },
  create(context) {
    const filename = context.filename;

    if (!isTypeScriptFilename(filename)) {
      return {};
    }

    return {
      Program(node) {
        if (getTopLevelTSDocComment(context.sourceCode)) {
          return;
        }

        context.report({
          node,
          loc: { line: 1, column: 0 },
          messageId: MESSAGE_ID
        });
      }
    };
  }
};

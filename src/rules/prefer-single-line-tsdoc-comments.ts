import type { Rule, SourceCode } from "eslint";

import { isTypeScriptFilename } from "./file-tsdoc-utils.js";

const MAX_SINGLE_LINE_LENGTH = 80;
const MESSAGE_ID = "expectedSingleLineTSDocComment";

type Comment = ReturnType<SourceCode["getAllComments"]>[number];

function isTSDocComment(
  sourceCode: Readonly<SourceCode>,
  comment: Comment,
): boolean {
  const [start, end] = comment.range ?? [];

  if (comment.type !== "Block" || start === undefined || end === undefined) {
    return false;
  }

  return sourceCode.getText().slice(start, end).startsWith("/**");
}

function getNormalizedCommentLines(commentText: string): string[] | null {
  const normalizedText = commentText.replaceAll("\r\n", "\n");

  if (!normalizedText.includes("\n")) {
    return null;
  }

  const lines = normalizedText.split("\n");

  if (lines.length < 3) {
    return null;
  }

  const contentLines = lines.slice(1, -1).map((line) => {
    const trimmedStart = line.trimStart();

    if (!trimmedStart.startsWith("*")) {
      return null;
    }

    return trimmedStart.slice(1).trim();
  });

  if (contentLines.some((line) => line === null)) {
    return null;
  }

  return contentLines as string[];
}

function getPreferredSingleLineComment(commentText: string): string | null {
  const contentLines = getNormalizedCommentLines(commentText);

  if (!contentLines) {
    return null;
  }

  const nonEmptyLines = contentLines.filter((line) => line !== "");

  if (nonEmptyLines.length !== 1) {
    return null;
  }

  const preferredComment = `/** ${nonEmptyLines[0]} */`;

  if (preferredComment.length >= MAX_SINGLE_LINE_LENGTH) {
    return null;
  }

  return preferredComment;
}

export const preferSingleLineTSDocCommentsRule: Rule.RuleModule = {
  meta: {
    type: "layout",
    docs: {
      description:
        "Require short single-line TSDoc comments to stay on one line.",
    },
    fixable: "code",
    hasSuggestions: false,
    schema: [],
    messages: {
      [MESSAGE_ID]:
        "TSDoc comments with a single line shorter than 80 characters should stay on one line.",
    },
  },
  create(context) {
    if (!isTypeScriptFilename(context.filename)) {
      return {};
    }

    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          if (!isTSDocComment(context.sourceCode, comment)) {
            continue;
          }

          const [start, end] = comment.range ?? [];

          if (start === undefined || end === undefined) {
            continue;
          }

          const commentText = context.sourceCode.getText().slice(start, end);
          const preferredComment = getPreferredSingleLineComment(commentText);

          if (!preferredComment) {
            continue;
          }

          context.report({
            loc: context.sourceCode.getLocFromIndex(start),
            messageId: MESSAGE_ID,
            fix(fixer) {
              return fixer.replaceTextRange([start, end], preferredComment);
            },
          });
        }
      },
    };
  },
};

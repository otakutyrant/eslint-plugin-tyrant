import type { Rule, SourceCode } from "eslint";

import { isTypeScriptFilename } from "./file-tsdoc-utils.js";

const MESSAGE_ID = "nonTSDocCommentBeforeExport";

type Comment = ReturnType<SourceCode["getCommentsBefore"]>[number];
type NodeOrToken = Parameters<SourceCode["getCommentsBefore"]>[0];
type ExportNode = NodeOrToken & { range?: [number, number] };

function hasOnlyWhitespaceBetween(
  sourceCode: Readonly<SourceCode>,
  start: number,
  end: number,
): boolean {
  return sourceCode.getText().slice(start, end).trim() === "";
}

function hasBlankLineBetween(
  previousEndLine: number,
  nextStartLine: number,
): boolean {
  return nextStartLine - previousEndLine > 1;
}

function getLeadingCommentBlock(
  sourceCode: Readonly<SourceCode>,
  node: ExportNode,
): Comment[] {
  if (!node.range) {
    return [];
  }

  const comments = sourceCode.getCommentsBefore(node);

  if (comments.length === 0) {
    return [];
  }

  const relevantComments: Comment[] = [];
  let nextStart = node.range[0];
  let nextStartLine = node.loc?.start.line;

  for (let index = comments.length - 1; index >= 0; index -= 1) {
    const comment = comments[index];
    const [start, end] = comment.range ?? [];
    const commentEndLine = comment.loc?.end.line;
    const commentStartLine = comment.loc?.start.line;

    if (
      start === undefined ||
      end === undefined ||
      commentEndLine === undefined ||
      commentStartLine === undefined ||
      nextStartLine === undefined
    ) {
      continue;
    }

    if (
      !hasOnlyWhitespaceBetween(sourceCode, end, nextStart) ||
      hasBlankLineBetween(commentEndLine, nextStartLine)
    ) {
      break;
    }

    relevantComments.unshift(comment);
    nextStart = start;
    nextStartLine = commentStartLine;
  }

  return relevantComments;
}

function isTSDocStyleComment(
  sourceCode: Readonly<SourceCode>,
  comment: Comment,
): boolean {
  const [start, end] = comment.range ?? [];

  if (start === undefined || end === undefined) {
    return false;
  }

  if (comment.type !== "Block") {
    return false;
  }

  return sourceCode.getText().slice(start, end).startsWith("/**");
}

export const requireTSDocStyleCommentsBeforeExportsRule: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Require existing comments before exports to use TSDoc block comment style.",
    },
    hasSuggestions: false,
    schema: [],
    messages: {
      [MESSAGE_ID]:
        "Comments immediately before exported declarations must use TSDoc /** ... */ style.",
    },
  },
  create(context) {
    if (!isTypeScriptFilename(context.filename)) {
      return {};
    }

    function checkExport(node: Rule.Node): void {
      const comments = getLeadingCommentBlock(context.sourceCode, node);

      for (const comment of comments) {
        if (isTSDocStyleComment(context.sourceCode, comment)) {
          continue;
        }

        context.report({
          messageId: MESSAGE_ID,
          node,
        });
      }
    }

    return {
      ExportAllDeclaration(node) {
        checkExport(node);
      },
      ExportDefaultDeclaration(node) {
        checkExport(node);
      },
      ExportNamedDeclaration(node) {
        checkExport(node);
      },
    };
  },
};

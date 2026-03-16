import type { Rule, SourceCode } from "eslint";

import { isTypeScriptFilename } from "./file-tsdoc-utils.js";

const MESSAGE_ID = "nonTSDocCommentBeforeExport";

type Comment = ReturnType<SourceCode["getCommentsBefore"]>[number];
type NodeOrToken = Parameters<SourceCode["getCommentsBefore"]>[0];
type ExportNode = NodeOrToken & { range?: [number, number] };

function hasOnlyWhitespaceBetween(sourceCode: Readonly<SourceCode>, start: number, end: number): boolean {
  return sourceCode.getText().slice(start, end).trim() === "";
}

function getLeadingCommentBlock(sourceCode: Readonly<SourceCode>, node: ExportNode): Comment[] {
  if (!node.range) {
    return [];
  }

  const comments = sourceCode.getCommentsBefore(node);

  if (comments.length === 0) {
    return [];
  }

  const relevantComments: Comment[] = [];
  let nextStart = node.range[0];

  for (let index = comments.length - 1; index >= 0; index -= 1) {
    const comment = comments[index];
    const [start, end] = comment.range ?? [];

    if (start === undefined || end === undefined) {
      continue;
    }

    if (!hasOnlyWhitespaceBetween(sourceCode, end, nextStart)) {
      break;
    }

    relevantComments.unshift(comment);
    nextStart = start;
  }

  return relevantComments;
}

function isTSDocStyleComment(sourceCode: Readonly<SourceCode>, comment: Comment): boolean {
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
      description: "Require existing comments before exports to use TSDoc block comment style."
    },
    hasSuggestions: false,
    schema: [],
    messages: {
      [MESSAGE_ID]: "Comments immediately before exported declarations must use TSDoc /** ... */ style."
    }
  },
  create(context) {
    if (!isTypeScriptFilename(context.filename)) {
      return {};
    }

    return {
      ExportAllDeclaration(node) {
        for (const comment of getLeadingCommentBlock(context.sourceCode, node)) {
          if (isTSDocStyleComment(context.sourceCode, comment)) {
            continue;
          }

          context.report({
            messageId: MESSAGE_ID,
            node
          });
        }
      },
      ExportDefaultDeclaration(node) {
        for (const comment of getLeadingCommentBlock(context.sourceCode, node)) {
          if (isTSDocStyleComment(context.sourceCode, comment)) {
            continue;
          }

          context.report({
            messageId: MESSAGE_ID,
            node
          });
        }
      },
      ExportNamedDeclaration(node) {
        for (const comment of getLeadingCommentBlock(context.sourceCode, node)) {
          if (isTSDocStyleComment(context.sourceCode, comment)) {
            continue;
          }

          context.report({
            messageId: MESSAGE_ID,
            node
          });
        }
      }
    };
  }
};

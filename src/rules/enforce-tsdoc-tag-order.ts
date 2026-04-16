import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import type { Rule, SourceCode } from "eslint";

import { isTypeScriptFilename } from "./file-tsdoc-utils.js";

const MESSAGE_ID = "invalidTSDocTagOrder";
const DEFAULT_BLANK_LINE = " *";
const tsdocConfigCache = new Map<string, TSDocTagConfig | null>();

interface TSDocTagConfig {
  groupOrder: Map<string, number>;
  tagOrder: Map<string, number>;
}

interface TSDocTagBlock {
  containsUnconfiguredTag: boolean;
  groupIndex: number | null;
  hasBlankLineAfter: boolean;
  lines: string[];
  orderIndex: number | null;
  tagName: string;
}

interface ParsedTSDocComment {
  blankLine: string;
  bodyLines: string[];
  footer: string;
  header: string;
  tagBlocks: TSDocTagBlock[];
  tagSectionStart: number | null;
}

type Comment = ReturnType<SourceCode["getAllComments"]>[number];

function getPhysicalFilename(context: Readonly<Rule.RuleContext>): string {
  const candidate = context.physicalFilename;

  if (candidate === "<input>") {
    return candidate;
  }

  return path.isAbsolute(candidate)
    ? candidate
    : path.resolve(process.cwd(), candidate);
}

function findNearestTSDocConfigPath(filename: string): string | null {
  if (filename === "<input>") {
    return null;
  }

  let currentDirectory = path.dirname(filename);

  for (;;) {
    const configPath = path.join(currentDirectory, "tsdoc.json");

    if (existsSync(configPath)) {
      return configPath;
    }

    const parentDirectory = path.dirname(currentDirectory);

    if (parentDirectory === currentDirectory) {
      return null;
    }

    currentDirectory = parentDirectory;
  }
}

function extractJsonObject(rawText: string, propertyName: string): string | null {
  const propertyIndex = rawText.indexOf(`"${propertyName}"`);

  if (propertyIndex === -1) {
    return null;
  }

  const braceStart = rawText.indexOf("{", propertyIndex);

  if (braceStart === -1) {
    return null;
  }

  let depth = 0;
  let isEscaped = false;
  let isInsideString = false;

  for (let index = braceStart; index < rawText.length; index += 1) {
    const character = rawText[index];

    if (isEscaped) {
      isEscaped = false;
      continue;
    }

    if (character === "\\") {
      isEscaped = true;
      continue;
    }

    if (character === '"') {
      isInsideString = !isInsideString;
      continue;
    }

    if (isInsideString) {
      continue;
    }

    if (character === "{") {
      depth += 1;
      continue;
    }

    if (character !== "}") {
      continue;
    }

    depth -= 1;

    if (depth === 0) {
      return rawText.slice(braceStart, index + 1);
    }
  }

  return null;
}

function parseSupportForTagGroups(rawText: string): Map<string, number> {
  const groups = new Map<string, number>();
  const supportForTagsObject = extractJsonObject(rawText, "supportForTags");

  if (!supportForTagsObject) {
    return groups;
  }

  const lines = supportForTagsObject.split(/\r?\n/u);
  let currentGroupIndex = 0;
  let hasSeenTag = false;
  let hasPendingBlankLine = false;

  for (const line of lines.slice(1, -1)) {
    const trimmedLine = line.trim();

    if (trimmedLine === "") {
      if (hasSeenTag) {
        hasPendingBlankLine = true;
      }

      continue;
    }

    const tagMatch = /^"(@[^"]+)"\s*:/u.exec(trimmedLine);

    if (!tagMatch) {
      continue;
    }

    if (hasSeenTag && hasPendingBlankLine) {
      currentGroupIndex += 1;
    }

    groups.set(tagMatch[1], currentGroupIndex);
    hasSeenTag = true;
    hasPendingBlankLine = false;
  }

  return groups;
}

function loadTSDocTagConfig(filename: string): TSDocTagConfig | null {
  const configPath = findNearestTSDocConfigPath(filename);

  if (!configPath) {
    return null;
  }

  const cachedConfig = tsdocConfigCache.get(configPath);

  if (cachedConfig !== undefined) {
    return cachedConfig;
  }

  try {
    const rawText = readFileSync(configPath, "utf8");
    const parsedConfig = JSON.parse(rawText) as {
      supportForTags?: Record<string, unknown>;
    };
    const supportForTags = parsedConfig.supportForTags;

    if (
      !supportForTags ||
      Array.isArray(supportForTags) ||
      typeof supportForTags !== "object"
    ) {
      tsdocConfigCache.set(configPath, null);
      return null;
    }

    const tagOrder = new Map<string, number>();
    const groupOrder = parseSupportForTagGroups(rawText);

    for (const [index, tagName] of Object.keys(supportForTags).entries()) {
      tagOrder.set(tagName, index);
    }

    const config = {
      groupOrder,
      tagOrder,
    } satisfies TSDocTagConfig;

    tsdocConfigCache.set(configPath, config);
    return config;
  } catch {
    tsdocConfigCache.set(configPath, null);
    return null;
  }
}

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

function getContentAfterLeadingAsterisk(line: string): string | null {
  const trimmedStart = line.trimStart();

  if (!trimmedStart.startsWith("*")) {
    return null;
  }

  return trimmedStart.startsWith("* ")
    ? trimmedStart.slice(2)
    : trimmedStart.slice(1);
}

function isBlankTSDocLine(line: string): boolean {
  const content = getContentAfterLeadingAsterisk(line);
  return content !== null && content.trim() === "";
}

function trimBlankTSDocLines(lines: readonly string[]): string[] {
  let start = 0;
  let end = lines.length;

  while (start < end && isBlankTSDocLine(lines[start])) {
    start += 1;
  }

  while (end > start && isBlankTSDocLine(lines[end - 1])) {
    end -= 1;
  }

  return lines.slice(start, end);
}

function parseTSDocComment(
  sourceCode: Readonly<SourceCode>,
  comment: Comment,
  tagConfig: Readonly<TSDocTagConfig>,
): ParsedTSDocComment | null {
  const [start, end] = comment.range ?? [];

  if (start === undefined || end === undefined) {
    return null;
  }

  const commentText = sourceCode.getText().slice(start, end);
  const lines = commentText.split(/\r?\n/u);

  if (lines.length < 3) {
    return null;
  }

  const bodyLines = lines.slice(1, -1);
  const tagStartIndices: number[] = [];

  for (const [index, line] of bodyLines.entries()) {
    const content = getContentAfterLeadingAsterisk(line);

    if (!content) {
      continue;
    }

    const tagMatch = /^(@[^\s]+)\b/u.exec(content);

    if (!tagMatch || !tagConfig.tagOrder.has(tagMatch[1])) {
      continue;
    }

    tagStartIndices.push(index);
  }

  if (tagStartIndices.length === 0) {
    return null;
  }

  const tagSectionStart = tagStartIndices[0];
  const tagBlocks: TSDocTagBlock[] = [];

  for (const [tagIndex, startIndex] of tagStartIndices.entries()) {
    const nextStartIndex = tagStartIndices[tagIndex + 1] ?? bodyLines.length;
    const rawBlockLines = bodyLines.slice(startIndex, nextStartIndex);
    const blockLines = trimBlankTSDocLines(rawBlockLines);
    const firstBlockLine = blockLines[0];

    if (!firstBlockLine) {
      continue;
    }

    const tagName = /^(@[^\s]+)\b/u.exec(
      getContentAfterLeadingAsterisk(firstBlockLine) ?? "",
    )?.[1];

    if (!tagName) {
      continue;
    }

    tagBlocks.push({
      containsUnconfiguredTag: rawBlockLines.slice(1).some((line) => {
        const content = getContentAfterLeadingAsterisk(line);
        const tagMatch = content ? /^(@[^\s]+)\b/u.exec(content) : null;

        return tagMatch !== null && !tagConfig.tagOrder.has(tagMatch[1]);
      }),
      groupIndex: tagConfig.groupOrder.get(tagName) ?? null,
      hasBlankLineAfter:
        rawBlockLines.length > 0 &&
        isBlankTSDocLine(rawBlockLines[rawBlockLines.length - 1]),
      lines: blockLines,
      orderIndex: tagConfig.tagOrder.get(tagName) ?? null,
      tagName,
    });
  }

  if (tagBlocks.length === 0) {
    return null;
  }

  const blankLine = bodyLines.find(isBlankTSDocLine) ?? DEFAULT_BLANK_LINE;

  return {
    blankLine,
    bodyLines,
    footer: lines.at(-1) ?? " */",
    header: lines[0],
    tagBlocks,
    tagSectionStart,
  };
}

function hasInvalidTagOrder(tagBlocks: readonly TSDocTagBlock[]): boolean {
  let previousOrderIndex = -1;

  for (const tagBlock of tagBlocks) {
    if (tagBlock.orderIndex === null) {
      continue;
    }

    if (tagBlock.orderIndex < previousOrderIndex) {
      return true;
    }

    previousOrderIndex = tagBlock.orderIndex;
  }

  return false;
}

function hasInvalidGroupSpacing(tagBlocks: readonly TSDocTagBlock[]): boolean {
  for (const [index, tagBlock] of tagBlocks.entries()) {
    if (index === 0) {
      continue;
    }

    const previousTagBlock = tagBlocks[index - 1];

    if (
      previousTagBlock.groupIndex === null ||
      tagBlock.groupIndex === null ||
      previousTagBlock.containsUnconfiguredTag
    ) {
      continue;
    }

    const shouldHaveBlankLine =
      previousTagBlock.groupIndex !== tagBlock.groupIndex;

    if (shouldHaveBlankLine !== previousTagBlock.hasBlankLineAfter) {
      return true;
    }
  }

  return false;
}

function sortTagBlocks(tagBlocks: readonly TSDocTagBlock[]): TSDocTagBlock[] {
  return [...tagBlocks].sort((left, right) => {
    if (left.orderIndex === null && right.orderIndex === null) {
      return 0;
    }

    if (left.orderIndex === null) {
      return 1;
    }

    if (right.orderIndex === null) {
      return -1;
    }

    return left.orderIndex - right.orderIndex;
  });
}

function buildFixedComment(parsedComment: Readonly<ParsedTSDocComment>): string {
  const prefixLines =
    parsedComment.tagSectionStart === null
      ? parsedComment.bodyLines
      : parsedComment.bodyLines.slice(0, parsedComment.tagSectionStart);
  const orderedTagBlocks = sortTagBlocks(parsedComment.tagBlocks);
  const rebuiltBodyLines = [...prefixLines];

  for (const [index, tagBlock] of orderedTagBlocks.entries()) {
    if (index === 0) {
      rebuiltBodyLines.push(...tagBlock.lines);
      continue;
    }

    const previousTagBlock = orderedTagBlocks[index - 1];

    if (
      previousTagBlock.groupIndex !== null &&
      tagBlock.groupIndex !== null &&
      previousTagBlock.groupIndex !== tagBlock.groupIndex
    ) {
      rebuiltBodyLines.push(parsedComment.blankLine);
    }

    rebuiltBodyLines.push(...tagBlock.lines);
  }

  return [parsedComment.header, ...rebuiltBodyLines, parsedComment.footer].join(
    "\n",
  );
}

export const enforceTSDocTagOrderRule: Rule.RuleModule = {
  meta: {
    type: "layout",
    docs: {
      description:
        "Require TSDoc tags to follow the order and grouping from supportForTags in the nearest tsdoc.json file.",
    },
    fixable: "code",
    hasSuggestions: false,
    schema: [],
    messages: {
      [MESSAGE_ID]:
        "TSDoc tags must follow the order and blank-line grouping from supportForTags in the nearest tsdoc.json file.",
    },
  },
  create(context) {
    const filename = getPhysicalFilename(context);

    if (!isTypeScriptFilename(filename) || filename === "<input>") {
      return {};
    }

    const tagConfig = loadTSDocTagConfig(filename);

    if (!tagConfig) {
      return {};
    }

    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          if (!isTSDocComment(context.sourceCode, comment)) {
            continue;
          }

          const parsedComment = parseTSDocComment(
            context.sourceCode,
            comment,
            tagConfig,
          );

          if (!parsedComment) {
            continue;
          }

          if (
            !hasInvalidTagOrder(parsedComment.tagBlocks) &&
            !hasInvalidGroupSpacing(parsedComment.tagBlocks)
          ) {
            continue;
          }

          const [start, end] = comment.range ?? [];

          if (start === undefined || end === undefined) {
            continue;
          }

          context.report({
            loc: context.sourceCode.getLocFromIndex(start),
            messageId: MESSAGE_ID,
            fix(fixer) {
              return fixer.replaceTextRange(
                [start, end],
                buildFixedComment(parsedComment),
              );
            },
          });
        }
      },
    };
  },
};

import type { SourceCode } from "eslint";

const TS_FILE_PATTERN = /\.(?:[cm]?ts|tsx)$/i;

export interface FileTSDocComment {
  end: number;
  start: number;
}

export function isTypeScriptFilename(filename: string): boolean {
  return filename !== "<input>" && TS_FILE_PATTERN.test(filename);
}

function getFileBodyStart(text: string): number {
  let index = text.charCodeAt(0) === 0xfeff ? 1 : 0;

  if (text.startsWith("#!", index)) {
    const shebangEnd = text.indexOf("\n", index);

    if (shebangEnd === -1) {
      return text.length;
    }

    index = shebangEnd + 1;
  }

  while (index < text.length && text.slice(index, index + 1).trim() === "") {
    index += 1;
  }

  return index;
}

export function getTopLevelTSDocComment(
  sourceCode: Readonly<SourceCode>,
): FileTSDocComment | null {
  const text = sourceCode.getText();
  const expectedStart = getFileBodyStart(text);
  const firstComment = sourceCode
    .getAllComments()
    .find((comment) => comment.range?.[0] !== 0 || !text.startsWith("#!"));
  const [start, end] = firstComment?.range ?? [];

  if (
    !firstComment ||
    start === undefined ||
    end === undefined ||
    start !== expectedStart
  ) {
    return null;
  }

  if (
    firstComment.type !== "Block" ||
    !text.slice(start, end).startsWith("/**")
  ) {
    return null;
  }

  return { end, start };
}

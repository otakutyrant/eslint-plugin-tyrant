# eslint-plugin-tyrant

Pure TypeScript ESLint plugin with a rule that requires a TSDoc file comment at the top of each TypeScript module. I named this plugin as tyrant because I am otakutyrant and this is a personal plugin.

## Motivation

If a software project is poorly written, it is difficult for humans to understand and maintain. AI can work faster and handle a much larger context, but what happens if the project becomes too complicated even for AI to understand? Can humans confidently take over at that point? In the end, AI cannot take the fall for humans, so every project still needs a final decision-maker, and the codebase should remain highly understandable for people.

In essence, using AI for software development means using natural language as an abstract layer to describe and manipulate programming languages more quickly. Prompts written in natural language are usually easier to understand than source code, even if they can sometimes be ambiguous. So why not inject more natural language directly into the program? Here come the comments.

That is why I wrote some ESLint rules to enforce comments, and leave the rest to AI.

## Rule

- `tyrant/require-file-tsdoc`: require every `.ts`, `.tsx`, `.mts`, and `.cts` file to begin with a `/** ... */` TSDoc comment.
- Accepted preamble before that TSDoc: UTF-8 BOM, a single shebang line, and optional empty lines after the shebang.
- `tyrant/require-empty-line-after-file-tsdoc`: require at least one empty line after the top-level file TSDoc comment.
- `tyrant/require-index-module-organization-tsdoc`: require TypeScript `index.*` modules to include `Flat modules` or `Hierarchial modules` in the top-level file TSDoc comment to describe how modules in the directory are organized.
- `tyrant/require-tsdoc-style-comments-before-exports`: require every export to have an immediately preceding `/** ... */` TSDoc comment, with no blank line between the comment block and the export.
- This rule is not auto-fixable. If a file does not need module-level docs, disable the rule in that file explicitly.

## Usage

```ts
import tyrant from "eslint-plugin-tyrant";

export default [
  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    plugins: { tyrant },
    rules: {
      "tyrant/require-file-tsdoc": "error",
    },
  },
];
```

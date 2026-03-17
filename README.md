# eslint-plugin-tyrant

ESLint plugin for TypeScript codebases that want stricter documentation rules.

The plugin currently ships four rules:

- `tyrant/require-file-tsdoc`
- `tyrant/require-empty-line-after-file-tsdoc`
- `tyrant/require-index-module-organization-tsdoc`
- `tyrant/require-tsdoc-style-comments-before-exports`

## Motivation

If a software project is poorly written, it is difficult for humans to understand and maintain. AI can work faster and handle a much larger context, but what happens if the project becomes too complicated even for AI to understand? Can humans confidently take over at that point? In the end, AI cannot take the fall for humans, so every project still needs a final decision-maker, and the codebase should remain highly understandable for people.

In essence, using AI for software development means using natural language as an abstract layer to describe and manipulate programming languages more quickly. Prompts written in natural language are usually easier to understand than source code, even if they can sometimes be ambiguous. So why not inject more natural language directly into the program? Here come the comments.

That is why I wrote some ESLint rules to enforce comments, and leave the rest to AI.

## Install

```sh
pnpm add -D eslint eslint-plugin-tyrant
```

`eslint-plugin-tyrant` supports ESLint 9 and 10.

## Usage

### Use the bundled config

```ts
import tyrant from "eslint-plugin-tyrant";

export default [...tyrant.configs.recommended];
```

`tyrant.configs.recommendedTypeScript` is also exported and currently matches `recommended`.

### Configure rules manually

```ts
import tyrant from "eslint-plugin-tyrant";

export default [
  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    plugins: { tyrant },
    rules: {
      "tyrant/require-file-tsdoc": "error",
      "tyrant/require-empty-line-after-file-tsdoc": "error",
      "tyrant/require-index-module-organization-tsdoc": "error",
      "tyrant/require-tsdoc-style-comments-before-exports": "error",
    },
  },
];
```

## Rules

### `tyrant/require-file-tsdoc`

Requires every TypeScript module to start with a top-level `/** ... */` block comment.

- Checked extensions: `.ts`, `.tsx`, `.mts`, `.cts`
- Ignored: non-TypeScript files and ESLint `"<input>"`
- Allowed before the file TSDoc:
  - UTF-8 BOM
  - one shebang line
  - whitespace after the shebang

Valid:

```ts
#!/usr/bin/env node

/**
 * CLI entrypoint.
 */

export const answer = 42;
```

Invalid:

```ts
// Not TSDoc
export const answer = 42;
```

If a file truly does not need module-level docs, disable the rule explicitly for that file.

### `tyrant/require-empty-line-after-file-tsdoc`

Requires at least one blank line after the top-level file TSDoc comment.

Valid:

```ts
/**
 * File docs.
 */

export const answer = 42;
```

Invalid:

```ts
/**
 * File docs.
 */
export const answer = 42;
```

This rule only runs when a top-level file TSDoc comment is present.

### `tyrant/require-index-module-organization-tsdoc`

Requires TypeScript `index.*` files to document how the directory is organized.

The current implementation accepts either of these exact marker strings inside the file TSDoc:

- `Flat modules`
- `Hierarchial modules`

Valid:

```ts
/**
 * Flat modules
 */

export * from "./feature.js";
```

Invalid:

```ts
/**
 * File docs.
 */

export * from "./feature.js";
```

Note: `Hierarchial modules` is intentionally spelled here to match the current rule implementation.

### `tyrant/require-tsdoc-style-comments-before-exports`

Requires comments immediately before export declarations to use TSDoc-style `/** ... */` comments.

What the rule checks when a comment is attached to an export:

- `export const ...`
- `export function ...`
- `export default ...`
- `export { ... }`
- `export { ... } from "..."`
- `export * from "..."`

Valid:

```ts
/**
 * Exported answer.
 */
export const answer = 42;
```

Also valid:

```ts
/**
 * Summary.
 */
/**
 * Additional detail.
 */
export const answer = 42;
```

Also valid:

```ts
export const answer = 42;
```

Invalid:

```ts
/* Not TSDoc */
export const answer = 42;
```

Only comments directly attached to the export are checked. A blank line means the comment is detached, so the rule does not report anything.

## Notes

- None of the rules currently provide autofixes.
- The plugin is ESM-only.
- The package exports a default plugin object plus `rules` and `configs`.

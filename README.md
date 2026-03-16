# eslint-plugin-tyrant

Pure TypeScript ESLint plugin with a rule that requires a TSDoc file comment at the top of each TypeScript module.

## Rule

- `tyrant/require-file-tsdoc`: require every `.ts`, `.tsx`, `.mts`, and `.cts` file to begin with a `/** ... */` TSDoc comment.
- Accepted preamble before that TSDoc: UTF-8 BOM, a single shebang line, and optional empty lines after the shebang.
- `tyrant/require-empty-line-after-file-tsdoc`: require at least one empty line after the top-level file TSDoc comment.
- `tyrant/require-index-module-organization-tsdoc`: require TypeScript `index.*` modules to include `Flat modules` or `Hierarchial modules` in the top-level file TSDoc comment to describe how modules in the directory are organized.
- `tyrant/require-tsdoc-style-comments-before-exports`: if a comment block exists immediately before an export, every comment in that block must use `/** ... */` TSDoc style.
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

import { fileURLToPath } from "node:url";

import js from "@eslint/js";
import tsdoc from "eslint-plugin-tsdoc";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

const tsconfigRootDir = fileURLToPath(new URL(".", import.meta.url));

const eslintConfig = defineConfig(
    {
        ignores: ["dist/**"]
    },
    js.configs.recommended,
    {
        files: ["**/*.{ts,tsx,mts,cts}"],
        extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
        languageOptions: {
            globals: {
                ...globals.node,
            },
            parserOptions: {
                ecmaVersion: "latest",
                project: ["./tsconfig.eslint.json"],
                sourceType: "module",
                tsconfigRootDir,
            },
        },
        name: "TypeScript",
        rules: {
            "@typescript-eslint/consistent-type-definitions": ["error", "interface"],
            "@typescript-eslint/no-shadow": "off",
            "@typescript-eslint/no-unused-vars": "off",
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/no-unsafe-call": "off",
            "@typescript-eslint/no-unsafe-member-access": "off",
            "@typescript-eslint/no-unsafe-return": "off",
            "@typescript-eslint/restrict-template-expressions": "off"
        }
    },
    {
        files: ["**/*.{ts,tsx,mts,cts}"],
        name: "TSDoc",
        plugins: { tsdoc },
        rules: {
            "tsdoc/syntax": "error"
        }
    },
);

export default eslintConfig;

import { type Config } from "prettier";

const prettierConfig: Config = {
    plugins: ["prettier-plugin-package"],
    semi: true,
    singleQuote: false,
    tabWidth: 2,
};

export default prettierConfig;

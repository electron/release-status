import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import { fixupConfigRules, fixupPluginRules, includeIgnoreFile } from "@eslint/compat";
import react from "eslint-plugin-react";
// @ts-expect-error no types
import jsxA11Y from "eslint-plugin-jsx-a11y";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
// @ts-expect-error no types
import _import from "eslint-plugin-import";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
    baseDirectory: path.dirname(fileURLToPath(import.meta.url)),
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

const gitignorePath = fileURLToPath(new URL(".gitignore", import.meta.url));

export default defineConfig([includeIgnoreFile(gitignorePath), globalIgnores(["!**/.server", "!**/.client"]), {
    extends: compat.extends("eslint:recommended"),

    languageOptions: {
        globals: {
            ...globals.browser,
            ...globals.commonjs,
        },

        ecmaVersion: "latest",
        sourceType: "module",

        parserOptions: {
            ecmaFeatures: {
                jsx: true,
            },
        },
    },
}, {
    files: ["**/*.{js,jsx,ts,tsx}"],

    extends: fixupConfigRules(compat.extends(
        "plugin:react/recommended",
        "plugin:react/jsx-runtime",
        "plugin:react-hooks/recommended",
        "plugin:jsx-a11y/recommended",
    )),

    plugins: {
        react: fixupPluginRules(react),
        "jsx-a11y": fixupPluginRules(jsxA11Y),
    },

    settings: {
        react: {
            version: "detect",
        },

        formComponents: ["Form"],

        linkComponents: [{
            name: "Link",
            linkAttribute: "to",
        }, {
            name: "NavLink",
            linkAttribute: "to",
        }],

        "import/resolver": {
            typescript: {},
        },
    },
}, {
    files: ["**/*.{ts,tsx}"],

    extends: fixupConfigRules(compat.extends(
        "plugin:@typescript-eslint/recommended",
        "plugin:import/recommended",
        "plugin:import/typescript",
    )),

    plugins: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        "@typescript-eslint": fixupPluginRules(typescriptEslint as any),
        import: fixupPluginRules(_import),
    },

    languageOptions: {
        parser: tsParser,
    },

    settings: {
        "import/internal-regex": "^~/",

        "import/resolver": {
            node: {
                extensions: [".ts", ".tsx"],
            },

            typescript: {
                alwaysTryTypes: true,
            },
        },
    },
}, {
    files: ["**/.eslintrc.cjs"],

    languageOptions: {
        globals: {
            ...globals.node,
        },
    },
}]);
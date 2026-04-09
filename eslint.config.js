import js from "@eslint/js";
import globals from "globals";
import * as reactHooks from "eslint-plugin-react-hooks";
import * as reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default [
    {
        ignores: ["dist"],
    },
    js.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    {
        files: ["**/*.{ts,tsx}"],
        languageOptions: {
            ecmaVersion: 2020,
            globals: globals.browser,
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        plugins: {
            "react-hooks": reactHooks.default ?? reactHooks,
            "react-refresh": reactRefresh.default ?? reactRefresh,
        },
        rules: {
            ...(reactHooks.default?.configs.recommended.rules ?? {}),
            "react-refresh/only-export-components": "warn",
            "no-unused-vars": "off",
            "@typescript-eslint/no-unused-vars": ["error"],
            "no-use-before-define": "off",
            "@typescript-eslint/no-use-before-define": [
                "error",
                {
                    functions: false,
                    classes: true,
                    enums: true,
                    typedefs: true,
                    variables: true,
                    ignoreTypeReferences: true,
                },
            ],
            "@typescript-eslint/ban-ts-comment": "error",
            "@typescript-eslint/no-unsafe-assignment": "error",
            "@typescript-eslint/no-unsafe-return": "error",
            "@typescript-eslint/no-restricted-types": [
                "error",
                {
                    types: {
                        unknown:
                            "That is not allowed in this course. You should be able to specify the type more clearly!",
                        any: "That is not allowed in this course. You should be able to figure out the type!",
                    },
                },
            ],
            "no-array-constructor": "off",
            "@typescript-eslint/no-array-constructor": "error",
            "@typescript-eslint/no-base-to-string": "error",
            "@typescript-eslint/no-confusing-void-expression": [
                "error",
                { ignoreArrowShorthand: true },
            ],
            "@typescript-eslint/no-for-in-array": "error",
            "@typescript-eslint/no-unnecessary-boolean-literal-compare": "error",
            "@typescript-eslint/no-unnecessary-condition": "error",
        },
    },
];

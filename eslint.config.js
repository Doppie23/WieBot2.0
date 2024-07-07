// @ts-check

const eslint = require("@eslint/js");
const tseslint = require("typescript-eslint");

module.exports = [
  { ignores: ["dist/*", "eslint.config.js"] },

  eslint.configs.recommended,

  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ["**/*.ts"],

    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: __dirname,
      },
    },

    rules: {
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": [
        "error",
        {
          checksVoidReturn: false,
        },
      ],
    },
  },
];

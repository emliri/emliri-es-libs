module.exports = {
  "env": {
    "node": true,
    "browser": true,
    "commonjs": true,
    "es6": true
  },
  "extends": "eslint:recommended",
  "parser": "typescript-eslint-parser", // We need this for the allowImportExportEverywhere option
  "parserOptions": {
    "ecmaVersion": 6,
    "sourceType": "module",
    "allowImportExportEverywhere": true // We need this for Webpack code-splitting (dynamic import)
  },
  "plugins": [
    "typescript",
    "json",
    "markdown",
    "import"
  ],
  "rules": {
    /* TypeScript related setup */
    // eslint typescript parser sees member definitions as undef vars
    // this case is already covered by the Typescript compiler fortunately :)
    "no-undef": 0,

    // filling in for proper no-unused vars coverage
    "typescript/no-unused-vars": "error",

    "import/export": 0,
    "no-use-before-define": 0,
    "no-console": 0,
    "camelcase": 1,
    "no-use-before-define": 0,

    /* custom rules */
    "indent": [2, 2, {"SwitchCase": 1}],
    "semi": [2, "never"],
    "quotes": [2, "single"],

    /* warnings */
    "no-unused-vars": 1,

  },
  "globals": {
    // Compile-time vars
    "VERSION": false
  }
};

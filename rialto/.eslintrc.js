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
      "typescript"
  ],
  "rules": {
      "typescript/no-unused-vars": "error"
  },
  "globals": {
      // Compile-time vars
      "VERSION": false,
      "ASSET_BASE_PATH": false,
      "GLOBAL_DEBUG": false
  }
};

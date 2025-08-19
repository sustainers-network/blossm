module.exports = {
  env: {
    es6: true,
    mocha: true
  },
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module"
  },
  extends: ["eslint:recommended", "prettier"],
  plugins: ["import", "prettier"],
  rules: {
    "no-console": "error",
    "import/no-unresolved": 2,
    "import/no-cycle": 2,
    "prefer-template": 2,
    "object-shorthand": 2,
    "prettier/prettier": [
      "error",
      {
        printWidth: 80
      }
    ]
  }
};

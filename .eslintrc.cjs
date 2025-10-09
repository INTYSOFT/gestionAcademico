module.exports = {
  root: true,
  ignorePatterns: ["projects/**/*"],
  overrides: [
    {
      files: ["*.ts"],
      parserOptions: {
        project: ["tsconfig.app.json", "tsconfig.spec.json"],
        sourceType: "module"
      },
      extends: [
        "plugin:@angular-eslint/recommended",
        "plugin:@angular-eslint/template/process-inline-templates",
        "plugin:@typescript-eslint/recommended",
        "plugin:@typescript-eslint/stylistic"
      ],
      rules: {
        "@typescript-eslint/consistent-type-imports": "error",
        "no-console": ["error", { allow: ["warn", "error"] }]
      }
    },
    {
      files: ["*.html"],
      extends: ["plugin:@angular-eslint/template/recommended"],
      rules: {}
    }
  ]
};

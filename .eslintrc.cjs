/* eslint-env node */
module.exports = {
  root: true,
  ignorePatterns: ['**/*.js', '**/*.cjs'],
  plugins: ['@angular-eslint', '@angular-eslint/template'],
  overrides: [
    {
      files: ['*.ts'],
      extends: [
        'eslint:recommended',
        'plugin:@angular-eslint/recommended',
        'plugin:@angular-eslint/template/process-inline-templates'
      ],
      parserOptions: {
        project: ['tsconfig.json'],
        tsconfigRootDir: __dirname,
        sourceType: 'module'
      },
      rules: {
        '@angular-eslint/no-empty-lifecycle-method': 'off',
        '@angular-eslint/component-class-suffix': ['error', { suffixes: ['Component'] }],
        '@angular-eslint/directive-class-suffix': ['error', { suffixes: ['Directive'] }],
        'no-console': ['warn', { allow: ['warn', 'error'] }]
      }
    },
    {
      files: ['*.spec.ts', '*.config.ts', 'src/**/*.resolver.ts'],
      rules: {
        'no-console': 'off'
      }
    },
    {
      files: ['src/**/*.prod.ts'],
      rules: {
        'no-console': 'error'
      }
    },
    {
      files: ['*.html'],
      extends: ['plugin:@angular-eslint/template/recommended'],
      rules: {}
    }
  ]
};

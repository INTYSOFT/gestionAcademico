/* eslint-env node */
module.exports = {
  root: true,
  ignorePatterns: ['**/*.js', '**/*.cjs'],
  plugins: ['@angular-eslint', '@angular-eslint/template', 'import'],
  overrides: [
    {
      files: ['*.ts'],
      extends: [
        'eslint:recommended',
        'plugin:@angular-eslint/recommended',
        'plugin:@angular-eslint/template/process-inline-templates',
        'plugin:import/recommended'
      ],
      parserOptions: {
        project: ['tsconfig.json'],
        tsconfigRootDir: __dirname,
        sourceType: 'module'
      },
      rules: {
        '@angular-eslint/component-class-suffix': ['error', { suffixes: ['Component'] }],
        '@angular-eslint/directive-class-suffix': ['error', { suffixes: ['Directive'] }],
        '@angular-eslint/no-empty-lifecycle-method': 'off',
        'import/order': [
          'error',
          {
            'newlines-between': 'always',
            alphabetize: { order: 'asc', caseInsensitive: true },
            groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index']
          }
        ],
        'no-console': ['error', { allow: ['warn', 'error'] }]
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
  ],
  settings: {
    'import/resolver': {
      typescript: true
    }
  }
};

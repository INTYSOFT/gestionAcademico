module.exports = {
  root: true,
  ignorePatterns: ['projects/**/*'],
  overrides: [
    {
      files: ['*.ts'],
      parserOptions: {
        project: ['tsconfig.app.json', 'tsconfig.spec.json'],
        sourceType: 'module'
      },
      extends: [
        'plugin:@angular-eslint/recommended',
        'plugin:@angular-eslint/template/process-inline-templates',
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/stylistic',
        'plugin:import/recommended',
        'plugin:import/typescript'
      ],
      plugins: ['import'],
      settings: {
        'import/resolver': {
          typescript: true
        }
      },
      rules: {
        '@typescript-eslint/consistent-type-imports': 'error',
        'no-console': ['error', { allow: ['warn', 'error'] }],
        'import/order': [
          'error',
          {
            groups: [['builtin', 'external'], ['internal'], ['parent', 'sibling', 'index']],
            alphabetize: { order: 'asc', caseInsensitive: true },
            newlines-between: 'always'
          }
        ]
      }
    },
    {
      files: ['*.html'],
      extends: ['plugin:@angular-eslint/template/recommended'],
      rules: {}
    }
  ]
};

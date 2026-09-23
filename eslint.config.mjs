import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import playwright from 'eslint-plugin-playwright';

export default [
  {
    ignores: [
      'node_modules/**',
      'test-results/**',
      'playwright-report/**',
      'blob-report/**',
      '.auth/**',
      '.playwright-mcp/**',
      '.claude/worktrees/**',
      '.kilo/worktrees/**',
    ],
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      playwright,
    },
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      'playwright/missing-playwright-await': 'error',
      'playwright/no-wait-for-timeout': 'error',
    },
  },
];

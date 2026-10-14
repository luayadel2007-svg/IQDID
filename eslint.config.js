import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', 'evidence/**', 'coverage/**'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': reactHooks, 'jsx-a11y': jsxA11y },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': ['error', { allow: ['error'] }],
      'jsx-a11y/label-has-associated-control': ['error', { depth: 3 }],
    },
  },
  { files: ['packages/mock-services/src/server-main.ts', 'scripts/**'], rules: { 'no-console': 'off' } },
  { files: ['scripts/**/*.mjs'], languageOptions: { globals: { ...globals.node } } },
  // page.evaluate() callbacks run in the browser
  { files: ['scripts/e2e.mjs'], languageOptions: { globals: { ...globals.node, ...globals.browser } } },
);

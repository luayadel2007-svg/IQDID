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
  // The future server adapter is the sole permitted protocol SDK entry point.
  {
    files: ['apps/**/*.{ts,tsx,mjs,js}', 'packages/**/*.{ts,tsx,mjs,js}'],
    ignores: ['packages/api-client/src/server/compatibility/**'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [{ group: ['@openid4vc/*', '@sd-jwt/*', '@owf/token-status-list', 'jose', 'pkijs', '@peculiar/x509', 'node:module', 'module'], message: 'Use the TASK-3C server compatibility adapter only.' }] }],
      'no-restricted-syntax': ['error',
        { selector: "ImportExpression[source.type!='Literal']", message: 'Computed module imports can bypass the compatibility adapter; use a static reviewed import.' },
        { selector: "ImportExpression[source.value=/^(@openid4vc\\/|@sd-jwt\\/|@owf\\/token-status-list|jose$|pkijs$|@peculiar\\/x509)/]", message: 'Protocol SDK dynamic import bypasses compatibility adapter.' },
        { selector: "CallExpression[callee.name='require']", message: 'Use static imports; require bypasses adapter policy.' },
      ],
    },
  },
  { files: ['tools/**/*.mjs', 'packages/api-client/src/server/compatibility/**/*.mjs'], languageOptions: { globals: globals.node }, rules: { 'no-control-regex': 'off' } },
  { files: ['apps/**/*.{ts,tsx}', 'packages/ui/**/*.{ts,tsx}'], rules: { 'no-restricted-imports': ['error', { patterns: ['**/crypto-ports*', '**/server/**', '@openid4vc/*', '@sd-jwt/*', '@owf/token-status-list', 'jose', 'pkijs', '@peculiar/x509', 'node:module', 'module'] }] } },
  { files: ['tools/lib/secret-scanner-engine.mjs'], rules: { 'no-useless-escape': 'off', 'no-empty': ['error', { allowEmptyCatch: true }] } },
  { files: ['scripts/ux-e2e.mjs'], languageOptions: { globals: { ...globals.node, ...globals.browser } } },
  // page.evaluate() callbacks run in the browser
  { files: ['scripts/e2e.mjs', 'scripts/screenshots.mjs'], languageOptions: { globals: { ...globals.node, ...globals.browser } } },
);

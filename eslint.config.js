import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import boundaries from 'eslint-plugin-boundaries';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import iotify from './tools/eslint/product-public-api.js';

export default tseslint.config(
  {
    ignores: [
      'packages/core/test/fixtures/**',
      'db/**',
      '**/dist/**',
      '**/node_modules/**',
      'coverage/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },

  {
    files: [
      '*.{js,ts}',
      'tools/**/*.js',
      'api/**/*.js',
      'apps/*/vite.config.ts',
      'packages/*/server/**/*.js',
      'packages/*/scripts/**/*.mjs',
    ],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    // CommonJS tool scripts (e.g. tools/design-import/*.cjs): Node globals and require().
    files: ['tools/**/*.cjs'],
    languageOptions: { sourceType: 'commonjs', globals: { ...globals.node } },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },

  // ---- Dependency rules (CLAUDE.md §2) ----
  {
    files: ['apps/**/*.{ts,tsx}', 'packages/**/*.{ts,tsx}', 'products/**/*.{ts,tsx}'],
    plugins: { boundaries, iotify },
    settings: {
      'import/resolver': {
        typescript: { alwaysTryTypes: true, project: './tsconfig.json' },
      },
      'boundaries/elements': [
        { type: 'app', pattern: 'apps/*', capture: ['app'] },
        { type: 'package', pattern: 'packages/*', capture: ['pkg'] },
        { type: 'product', pattern: 'products' },
      ],
      'boundaries/ignore': ['apps/*/vite.config.ts', '**/*.test.{ts,tsx}'],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          message:
            '{{ from.element.type }} code may not import {{ to.element.type }} code here (see the dependency rules in CLAUDE.md §2).',
          policies: [
            // Apps → packages and products. Never another app (same app is fine).
            {
              from: { element: { type: 'app' } },
              allow: { to: { element: { types: ['package', 'product'] } } },
            },
            {
              from: { element: { type: 'app', captured: { app: '*' } } },
              allow: {
                to: {
                  element: { type: 'app', captured: { app: '{{ from.element.captured.app }}' } },
                },
              },
            },
            // Products → packages and products (other products only via index.ts: see iotify rule).
            {
              from: { element: { type: 'product' } },
              allow: { to: { element: { types: ['package', 'product'] } } },
            },
            // Packages → packages only. Never apps or products.
            {
              from: { element: { type: 'package' } },
              allow: { to: { element: { type: 'package' } } },
            },
          ],
        },
      ],
      'iotify/product-public-api': 'error',
    },
  },

  prettier,
);

import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'node_modules', '*.config.js']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.browser,
        // Vite env
        __DEV__: 'readonly',
      },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      // ── Variables ────────────────────────────────────────────────
      'no-unused-vars': ['warn', {
        varsIgnorePattern: '^[A-Z_]|^_',
        argsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      }],
      'no-undef': 'error',

      // ── Seguridad ────────────────────────────────────────────────
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'no-proto': 'error',
      'no-extend-native': 'error',

      // ── Console (no debe llegar a producción sin guard) ──────────
      // Usamos 'warn' para no romper el build; los errores críticos
      // deben estar guarded con import.meta.env.DEV
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // ── Calidad ──────────────────────────────────────────────────
      'eqeqeq': ['error', 'always', { null: 'ignore' }],
      'no-var': 'error',
      'prefer-const': ['warn', { destructuring: 'all' }],
      'no-duplicate-imports': 'error',
      'no-throw-literal': 'error',
      'no-promise-executor-return': 'error',
      'no-await-in-loop': 'warn',

      // ── React ────────────────────────────────────────────────────
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // ── Debugging ────────────────────────────────────────────────
      'no-debugger': 'error',
      'no-alert': 'warn',
    },
  },
])

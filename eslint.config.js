// SPDX-License-Identifier: MIT
// Based on the create-vite React template (MIT, https://github.com/vitejs/vite/tree/main/packages/create-vite).
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx,mjs}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
  {
    // Tests and tool configuration run in Node, not in the browser
    files: ['e2e/**/*.js', 'playwright.config.js', 'scripts/**/*.{js,mjs}', 'eval/**/*.{js,mjs}'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
])

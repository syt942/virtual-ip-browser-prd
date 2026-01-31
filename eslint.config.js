import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import securityPlugin from 'eslint-plugin-security';
import globals from 'globals';

export default [
  // Global ignores - must be first
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'out/**',
      'release/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      '.vscode/**',
      '.idea/**',
      '*.min.js',
      '*.config.js',
      '*.config.ts',
      'electron.vite.config.ts',
      'vitest.config.ts',
      'playwright.config.ts',
      'tailwind.config.js',
      'scripts/**'
    ]
  },
  // TypeScript/TSX files
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2022,
        // Electron globals
        NodeJS: 'readonly',
        Electron: 'readonly',
        // React globals
        React: 'readonly',
        JSX: 'readonly',
        // Custom project globals
        SearchResultForTargeting: 'readonly',
        // Browser APIs
        ResizeObserver: 'readonly',
        ResizeObserverCallback: 'readonly',
        ResizeObserverEntry: 'readonly',
        IntersectionObserver: 'readonly',
        MutationObserver: 'readonly',
        // Test globals (vitest)
        vi: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        test: 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'react': reactPlugin,
      'react-hooks': reactHooksPlugin,
      'security': securityPlugin
    },
    rules: {
      // Disable base ESLint rules that conflict with TypeScript
      'no-unused-vars': 'off',
      'no-undef': 'off', // TypeScript handles this
      'no-redeclare': 'off',
      
      // TypeScript rules
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],
      '@typescript-eslint/no-unsafe-function-type': 'warn',
      '@typescript-eslint/no-require-imports': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn',
      
      // React rules
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      
      // General rules - relaxed for existing codebase
      'no-console': 'off',
      'no-case-declarations': 'warn',
      'no-useless-escape': 'warn',
      'no-control-regex': 'warn',
      'curly': 'off', // Don't enforce curly braces
      
      // Security rules
      'security/detect-object-injection': 'warn',
      'security/detect-non-literal-regexp': 'warn',
      'security/detect-unsafe-regex': 'warn',
      'security/detect-buffer-noassert': 'error',
      'security/detect-child-process': 'warn',
      'security/detect-disable-mustache-escape': 'error',
      'security/detect-eval-with-expression': 'error',
      'security/detect-no-csrf-before-method-override': 'error',
      'security/detect-non-literal-fs-filename': 'warn',
      'security/detect-non-literal-require': 'warn',
      'security/detect-possible-timing-attacks': 'warn',
      'security/detect-pseudoRandomBytes': 'warn'
    },
    settings: {
      react: {
        version: 'detect'
      }
    }
  }
];

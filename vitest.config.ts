import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    
    // Test file patterns
    include: [
      'tests/unit/**/*.test.ts',
      'tests/unit/**/*.test.tsx',
      'tests/integration/**/*.test.ts',
      'tests/integration/**/*.test.tsx',
    ],
    
    // Exclude E2E tests - they are run by Playwright, not Vitest
    exclude: [
      'node_modules/**',
      'dist/**',
      'dist-electron/**',
      'tests/e2e/**',
      'tests/templates/**',
    ],
    
    // Test execution options
    testTimeout: 10000,
    hookTimeout: 10000,
    
    // Reporter configuration
    reporters: ['verbose', 'html'],
    outputFile: {
      html: './test-reports/vitest/index.html',
    },
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      enabled: false, // Enable with --coverage flag
      reporter: ['text', 'text-summary', 'json', 'html', 'lcov'],
      reportsDirectory: './test-reports/coverage',
      
      // Coverage thresholds - TDD target: 80%+
      thresholds: {
        global: {
          statements: 80,
          branches: 75,
          functions: 80,
          lines: 80,
        },
      },
      
      // Files to include in coverage
      include: [
        'src/**/*.ts',
        'src/**/*.tsx',
        'electron/**/*.ts',
      ],
      
      // Files to exclude from coverage
      exclude: [
        'node_modules/',
        'dist/',
        'dist-electron/',
        'tests/',
        '**/*.config.*',
        '**/*.d.ts',
        '**/types.ts',
        '**/index.ts', // Re-export files
        'src/main.tsx',
        'electron/main/index.ts',
        'electron/main/preload.ts',
      ],
      
      // Clean coverage before running tests
      clean: true,
      
      // Show all files in coverage report (not just covered ones)
      all: true,
    },
    
    // Pool configuration for parallel execution
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        isolate: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@stores': resolve(__dirname, 'src/stores'),
      '@hooks': resolve(__dirname, 'src/hooks'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@types': resolve(__dirname, 'src/types'),
      '@electron': resolve(__dirname, 'electron'),
    }
  }
});

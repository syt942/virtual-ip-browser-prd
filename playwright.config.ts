import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined, // Increased from 1 for faster CI runs
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list']
  ],
  
  // Global timeout settings
  timeout: 60000, // 60 seconds for long-running tests
  expect: {
    timeout: 10000, // 10 seconds for expect assertions
  },
  
  // Test filtering by tags
  grep: process.env.TEST_GREP ? new RegExp(process.env.TEST_GREP) : undefined,
  grepInvert: process.env.TEST_GREP_INVERT ? new RegExp(process.env.TEST_GREP_INVERT) : undefined,
  
  use: {
    baseURL: 'http://localhost:5173',
    
    // Tracing and artifacts
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Timeouts
    actionTimeout: 10000,
    navigationTimeout: 30000,
    
    // Test ID attribute
    testIdAttribute: 'data-testid',
    
    // Browser context options
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
  },
  
  projects: [
    // Main browser projects
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // Smoke test project - runs subset of critical tests
    {
      name: 'smoke',
      use: { ...devices['Desktop Chrome'] },
      grep: /@smoke/,
    },
    // Mobile viewport testing
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  
  // Output directories
  outputDir: 'test-results',
  
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    // Note: For Electron apps running as root, use --no-sandbox
    // env: { ELECTRON_RUN_AS_NODE: '1' }
  },
});

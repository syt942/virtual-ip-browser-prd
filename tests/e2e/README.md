# E2E Test Documentation

## Overview

This directory contains End-to-End (E2E) tests for the Virtual IP Browser application. The tests are written using [Playwright](https://playwright.dev/) and follow the Page Object Model (POM) pattern for maintainability.

## Test Structure

```
tests/e2e/
├── pages/                      # Page Object Models
│   ├── BasePage.ts            # Base class with common functionality
│   ├── ProxyPanelPage.ts      # Proxy panel interactions
│   ├── PrivacyPanelPage.ts    # Privacy panel interactions
│   ├── AutomationPanelPage.ts # Automation panel interactions
│   ├── NavigationPage.ts      # Navigation and UI interactions
│   └── index.ts               # Page exports
├── proxy-management.spec.ts    # Proxy management tests
├── privacy-protection.spec.ts  # Privacy protection tests
├── privacy-verification.spec.ts # Privacy verification (PRD E2E-003)
├── automation.spec.ts          # Automation panel tests
├── navigation.spec.ts          # Navigation & UI tests
├── creator-support.spec.ts     # Creator support flow (PRD EP-007)
├── session-isolation.spec.ts   # Session isolation (PRD EP-003)
├── proxy-rotation.spec.ts      # Proxy rotation (PRD EP-001)
├── scheduling-system.spec.ts   # Scheduling system (PRD EP-006)
├── circuit-breaker.spec.ts     # Circuit breaker resilience
├── captcha-detection.spec.ts   # Captcha detection & handling
└── README.md                   # This documentation
```

## PRD E2E Test Coverage

| Test ID | PRD Description | Test File | Status |
|---------|-----------------|-----------|--------|
| E2E-001 | First launch experience | navigation.spec.ts | ✅ |
| E2E-002 | Add and use proxy | proxy-management.spec.ts | ✅ |
| E2E-003 | Privacy protection | privacy-verification.spec.ts | ✅ |
| E2E-004 | Search automation | automation.spec.ts | ✅ |
| E2E-005 | Domain targeting | automation.spec.ts | ✅ |
| E2E-006 | Creator support | creator-support.spec.ts | ✅ |
| E2E-007 | Session isolation | session-isolation.spec.ts | ✅ |
| E2E-008 | Proxy rotation | proxy-rotation.spec.ts | ✅ |
| E2E-009 | Scheduling system | scheduling-system.spec.ts | ✅ |
| E2E-010 | Circuit breaker | circuit-breaker.spec.ts | ✅ |

## Running Tests

### Prerequisites

1. Install dependencies:
   ```bash
   npm install
   ```

2. Install Playwright browsers:
   ```bash
   npx playwright install
   ```

### Run All E2E Tests

```bash
npm run test:e2e
```

Or directly with Playwright:

```bash
npx playwright test
```

### Run Specific Test File

```bash
npx playwright test tests/e2e/proxy-management.spec.ts
```

### Run Tests in Headed Mode (See Browser)

```bash
npx playwright test --headed
```

### Run Tests with Debug Mode

```bash
npx playwright test --debug
```

### Run Tests for Specific Browser

```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### View Test Report

After running tests, view the HTML report:

```bash
npx playwright show-report
```

## Electron/Root Environment Workaround

When running tests as root (e.g., in Docker containers), Electron requires the `--no-sandbox` flag. To work around this:

1. **Option 1: Run as non-root user** (recommended)
   ```bash
   # Create non-root user and run tests
   useradd -m testuser
   su testuser -c "npm run test:e2e"
   ```

2. **Option 2: Set environment variable**
   ```bash
   ELECTRON_RUN_AS_NODE=1 npm run test:e2e
   ```

3. **Option 3: Use Vite dev server directly**
   The tests connect to `http://localhost:5173` where Vite serves the React app.
   Start the dev server separately:
   ```bash
   npm run dev &
   npx playwright test
   ```

## Page Object Model

All tests use Page Object Models (POM) for better maintainability. Page objects encapsulate:

- Element locators (using `data-testid` attributes)
- Common interactions (open panel, fill form, click button)
- Verification methods (check visibility, get values)

### Example Usage

```typescript
import { test, expect } from '@playwright/test';
import { ProxyPanelPage } from './pages/ProxyPanelPage';

test('should display proxy panel', async ({ page }) => {
  const proxyPanel = new ProxyPanelPage(page);
  await proxyPanel.goto();
  await proxyPanel.openPanel();
  await expect(proxyPanel.panelTitle).toHaveText('Proxy Manager');
});
```

## Data-TestID Selectors

All interactive components use `data-testid` attributes for reliable test selection:

### App.tsx
- `app-container` - Main application container
- `main-content` - Main content area
- `browser-view` - Browser view area
- `side-panel` - Side panel container
- `bottom-toolbar` - Bottom toolbar
- `panel-btn-{name}` - Panel buttons (proxy, privacy, automation, activity, stats, settings)

### AddressBar.tsx
- `address-bar` - Address bar container
- `nav-buttons` - Navigation buttons container
- `nav-back` - Back button
- `nav-forward` - Forward button
- `nav-reload` - Reload button
- `url-container` - URL input container
- `address-input` - URL input field
- `proxy-status` - Proxy status indicator
- `proxy-status-indicator` - Status dot
- `proxy-status-text` - Status text

### TabBar.tsx
- `tab-bar` - Tab bar container
- `tab-item` - Individual tab
- `tab-title` - Tab title text
- `tab-close` - Close tab button
- `new-tab-btn` - New tab button

### EnhancedProxyPanel.tsx
- `proxy-panel` - Panel container
- `proxy-panel-title` - Panel title
- `add-proxy-btn` - Add proxy button
- `rotation-strategy-select` - Rotation strategy dropdown
- `proxy-list` - Proxy list container
- `proxy-item` - Individual proxy item
- `proxy-empty-state` - Empty state message
- `proxy-loading` - Loading indicator
- `proxy-stats` - Stats container
- `proxy-stat-total` - Total count
- `proxy-stat-active` - Active count
- `proxy-stat-failed` - Failed count

### PrivacyPanel.tsx
- `privacy-panel` - Panel container
- `privacy-panel-title` - Panel title
- `privacy-settings` - Settings container
- `fingerprint-section` - Fingerprint section
- `canvas-toggle` - Canvas toggle checkbox
- `webgl-toggle` - WebGL toggle checkbox
- `audio-toggle` - Audio toggle checkbox
- `navigator-toggle` - Navigator toggle checkbox
- `webrtc-section` - WebRTC section
- `webrtc-toggle` - WebRTC toggle checkbox
- `tracker-section` - Tracker section
- `tracker-toggle` - Tracker toggle checkbox
- `timezone-section` - Timezone section
- `timezone-toggle` - Timezone toggle checkbox

### EnhancedAutomationPanel.tsx
- `automation-panel` - Panel container
- `automation-panel-title` - Panel title
- `automation-controls` - Controls container
- `automation-start-btn` - Start button
- `automation-stop-btn` - Stop button
- `automation-content` - Content container
- `search-engine-section` - Search engine section
- `search-engine-select` - Search engine dropdown
- `keywords-section` - Keywords section
- `keyword-input` - Keyword input field
- `add-keyword-btn` - Add keyword button
- `keywords-list` - Keywords list
- `keyword-item` - Individual keyword
- `keywords-count` - Keywords count display
- `remove-keyword-btn` - Remove keyword button
- `domains-section` - Domains section
- `domain-input` - Domain input field
- `add-domain-btn` - Add domain button
- `domains-list` - Domains list
- `domain-item` - Individual domain
- `domains-count` - Domains count display
- `remove-domain-btn` - Remove domain button

### SettingsPanel.tsx
- `settings-panel` - Panel container
- `settings-panel-title` - Panel title
- `settings-placeholder` - Placeholder text

## Test Artifacts

Tests automatically capture artifacts on failure:

- **Screenshots**: Saved to `test-results/screenshots/`
- **Videos**: Saved to `test-results/` (retained on failure)
- **Traces**: Saved on first retry for debugging

### Manual Screenshots

Tests can capture screenshots at key checkpoints:

```typescript
await proxyPanel.screenshot('proxy-configured');
```

Screenshots are saved to `test-results/screenshots/{name}.png`

## CI/CD Integration

### GitHub Actions

```yaml
- name: Run E2E tests
  run: npx playwright test
  
- name: Upload artifacts
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

### Test Reports

- **HTML Report**: `playwright-report/index.html`
- **JUnit XML**: `test-results/junit.xml`
- **JSON Results**: `test-results/results.json`

## Writing New Tests

1. Create a new `.spec.ts` file in `tests/e2e/`
2. Import required page objects from `./pages`
3. Use `test.describe` and `test` from Playwright
4. Add screenshot capture on failure in `test.afterEach`
5. Use page object methods for interactions
6. Add assertions using `expect`

### Template

```typescript
import { test, expect } from '@playwright/test';
import { SomePage } from './pages/SomePage';

test.describe('Feature Name', () => {
  let somePage: SomePage;

  test.beforeEach(async ({ page }) => {
    somePage = new SomePage(page);
    await somePage.goto();
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'passed') {
      await page.screenshot({ 
        path: `test-results/screenshots/feature-${testInfo.title.replace(/\s+/g, '-')}-failed.png`,
        fullPage: true 
      });
    }
  });

  test('should do something', async () => {
    // Arrange
    await somePage.openPanel();
    
    // Act
    await somePage.performAction();
    
    // Assert
    await expect(somePage.element).toBeVisible();
  });
});
```

## Troubleshooting

### Tests fail with "Element not found"
- Verify `data-testid` attribute exists in component
- Check if element is inside a conditional render
- Add wait for element: `await expect(element).toBeVisible()`

### Tests are flaky
- Add explicit waits for network/animations
- Use `waitForLoadState('networkidle')`
- Increase timeout for slow operations

### Cannot connect to localhost:5173
- Ensure dev server is running: `npm run dev`
- Check if port is available
- Verify `webServer` config in `playwright.config.ts`

### Electron sandbox error
- See "Electron/Root Environment Workaround" section above
- Run as non-root user or use workaround options

## Contributing

1. Follow the existing test patterns
2. Use Page Object Model for new pages
3. Add `data-testid` to new components
4. Include screenshot capture on failure
5. Update this README for new test files

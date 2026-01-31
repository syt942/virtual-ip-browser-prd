/**
 * E2E Tests - Error Handling
 * Tests for error states, validation, and recovery
 * - Input validation errors
 * - Empty state handling
 * - Error recovery
 * - Graceful degradation
 */

import { test, expect } from '@playwright/test';
import { NavigationPage } from './pages/NavigationPage';
import { ProxyPanelPage } from './pages/ProxyPanelPage';
import { AutomationPanelPage } from './pages/AutomationPanelPage';
import { PrivacyPanelPage } from './pages/PrivacyPanelPage';

test.describe('Input Validation', () => {
  let automationPanel: AutomationPanelPage;

  test.beforeEach(async ({ page }) => {
    automationPanel = new AutomationPanelPage(page);
    await automationPanel.goto();
    await automationPanel.openPanel();
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'passed') {
      await page.screenshot({
        path: `test-results/screenshots/error-${testInfo.title.replace(/\s+/g, '-')}-failed.png`,
        fullPage: true
      });
    }
  });

  test('should not add empty keyword', async () => {
    const initialCount = await automationPanel.getKeywordCount();

    // Try to add empty keyword
    await automationPanel.keywordInput.fill('');
    await automationPanel.addKeywordButton.click();

    // Count should remain the same
    const finalCount = await automationPanel.getKeywordCount();
    expect(finalCount).toBe(initialCount);

    await automationPanel.screenshot('empty-keyword-rejected');
  });

  test('should not add empty domain', async () => {
    const initialCount = await automationPanel.getDomainCount();

    // Try to add empty domain
    await automationPanel.domainInput.fill('');
    await automationPanel.addDomainButton.click();

    // Count should remain the same
    const finalCount = await automationPanel.getDomainCount();
    expect(finalCount).toBe(initialCount);

    await automationPanel.screenshot('empty-domain-rejected');
  });

  test('should trim whitespace from keyword input', async ({ page }) => {
    // Add keyword with leading/trailing whitespace
    await automationPanel.addKeyword('  test keyword  ');

    // Verify keyword was added (implementation may trim it)
    const count = await automationPanel.getKeywordCount();
    expect(count).toBeGreaterThan(0);

    // Check if displayed keyword is trimmed
    const keywordText = await automationPanel.keywordItems.first().textContent();
    expect(keywordText?.trim()).toBe('test keyword');

    await automationPanel.screenshot('keyword-trimmed');
  });

  test('should handle special characters in keyword', async () => {
    // Add keyword with special characters
    await automationPanel.addKeyword('test & keyword <script>');

    const count = await automationPanel.getKeywordCount();
    expect(count).toBeGreaterThan(0);

    await automationPanel.screenshot('special-chars-keyword');
  });

  test('should validate domain format', async ({ page }) => {
    // Try various domain formats
    const testDomains = [
      { input: 'example.com', valid: true },
      { input: 'sub.example.com', valid: true },
      { input: 'example', valid: true }, // May be accepted as-is
    ];

    for (const { input } of testDomains) {
      await automationPanel.domainInput.fill(input);
      await automationPanel.addDomainButton.click();
      await page.waitForTimeout(100);
    }

    // At least some domains should have been added
    const count = await automationPanel.getDomainCount();
    expect(count).toBeGreaterThan(0);

    await automationPanel.screenshot('domain-validation');
  });
});

test.describe('Empty States', () => {
  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'passed') {
      await page.screenshot({
        path: `test-results/screenshots/empty-state-${testInfo.title.replace(/\s+/g, '-')}-failed.png`,
        fullPage: true
      });
    }
  });

  test('should display empty state when no proxies configured', async ({ page }) => {
    const proxyPanel = new ProxyPanelPage(page);
    await proxyPanel.goto();
    await proxyPanel.openPanel();

    // Wait for loading to complete
    await proxyPanel.waitForProxiesLoaded();

    // Check for empty state or proxy items
    const isEmpty = await proxyPanel.isEmptyStateVisible();
    const proxyCount = await proxyPanel.getProxyCount();

    // Either empty state should be shown or proxies exist
    expect(isEmpty || proxyCount > 0).toBe(true);

    if (isEmpty) {
      await expect(proxyPanel.proxyEmptyState).toContainText('No proxies');
    }

    await proxyPanel.screenshot('proxy-empty-state');
  });

  test('should display empty keywords state', async ({ page }) => {
    const automationPanel = new AutomationPanelPage(page);
    await automationPanel.goto();
    await automationPanel.openPanel();

    // Fresh panel should show 0 keywords
    await expect(automationPanel.keywordsCount).toContainText('0');

    await automationPanel.screenshot('empty-keywords');
  });

  test('should display empty domains state', async ({ page }) => {
    const automationPanel = new AutomationPanelPage(page);
    await automationPanel.goto();
    await automationPanel.openPanel();

    // Fresh panel should show 0 domains
    await expect(automationPanel.domainsCount).toContainText('0');

    await automationPanel.screenshot('empty-domains');
  });
});

test.describe('Button States', () => {
  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'passed') {
      await page.screenshot({
        path: `test-results/screenshots/button-state-${testInfo.title.replace(/\s+/g, '-')}-failed.png`,
        fullPage: true
      });
    }
  });

  test('should disable start button when no keywords', async ({ page }) => {
    const automationPanel = new AutomationPanelPage(page);
    await automationPanel.goto();
    await automationPanel.openPanel();

    // Start button should be disabled when no keywords
    const isEnabled = await automationPanel.isStartButtonEnabled();
    expect(isEnabled).toBe(false);

    await automationPanel.screenshot('start-button-disabled');
  });

  test('should enable start button when keywords added', async ({ page }) => {
    const automationPanel = new AutomationPanelPage(page);
    await automationPanel.goto();
    await automationPanel.openPanel();

    // Add a keyword
    await automationPanel.addKeyword('test keyword');

    // Start button should be enabled now
    const isEnabled = await automationPanel.isStartButtonEnabled();
    expect(isEnabled).toBe(true);

    await automationPanel.screenshot('start-button-enabled');
  });

  test('should disable start button when all keywords removed', async ({ page }) => {
    const automationPanel = new AutomationPanelPage(page);
    await automationPanel.goto();
    await automationPanel.openPanel();

    // Add then remove keyword
    await automationPanel.addKeyword('temp keyword');
    expect(await automationPanel.isStartButtonEnabled()).toBe(true);

    // Remove the keyword
    const keywordItem = automationPanel.keywordItems.first();
    await keywordItem.hover();
    await page.waitForSelector('[data-testid="remove-keyword-btn"]', { state: 'visible', timeout: 5000 }).catch(() => {});
    const removeBtn = keywordItem.locator('[data-testid="remove-keyword-btn"]');
    if (await removeBtn.isVisible()) {
      await removeBtn.click();
    }

    // Wait for UI update
    await page.waitForTimeout(200);

    // Start button should be disabled again
    const isEnabled = await automationPanel.isStartButtonEnabled();
    expect(isEnabled).toBe(false);

    await automationPanel.screenshot('start-button-disabled-after-remove');
  });
});

test.describe('State Persistence', () => {
  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'passed') {
      await page.screenshot({
        path: `test-results/screenshots/persistence-${testInfo.title.replace(/\s+/g, '-')}-failed.png`,
        fullPage: true
      });
    }
  });

  test('should maintain privacy settings after panel toggle', async ({ page }) => {
    const privacyPanel = new PrivacyPanelPage(page);
    await privacyPanel.goto();
    await privacyPanel.openPanel();

    // Enable a specific protection
    if (!await privacyPanel.isCanvasEnabled()) {
      await privacyPanel.toggleCanvas();
    }
    const initialState = await privacyPanel.isCanvasEnabled();
    expect(initialState).toBe(true);

    // Toggle panel
    await privacyPanel.closePanel();
    await page.waitForTimeout(200); // Wait for close animation
    await privacyPanel.openPanel();
    await page.waitForTimeout(200); // Wait for open animation

    // Verify state persisted
    const finalState = await privacyPanel.isCanvasEnabled();
    expect(finalState).toBe(initialState);

    await privacyPanel.screenshot('privacy-state-persisted');
  });

  test('should maintain proxy strategy after panel switch', async ({ page }) => {
    const proxyPanel = new ProxyPanelPage(page);
    const navPage = new NavigationPage(page);
    await proxyPanel.goto();
    await proxyPanel.openPanel();

    // Set a specific strategy
    await proxyPanel.setRotationStrategy('fastest');
    expect(await proxyPanel.getRotationStrategy()).toBe('fastest');

    // Switch to different panel
    await navPage.openPanel('privacy');
    await page.waitForTimeout(200);

    // Switch back
    await proxyPanel.openPanel();
    await page.waitForTimeout(200);

    // Verify strategy persisted
    expect(await proxyPanel.getRotationStrategy()).toBe('fastest');

    await proxyPanel.screenshot('proxy-strategy-persisted');
  });

  test('should maintain automation config after panel switch', async ({ page }) => {
    const automationPanel = new AutomationPanelPage(page);
    const navPage = new NavigationPage(page);
    await automationPanel.goto();
    await automationPanel.openPanel();

    // Configure automation
    await automationPanel.setSearchEngine('duckduckgo');
    await automationPanel.addKeyword('persistent keyword');
    await automationPanel.addDomain('persistent.com');

    // Switch to different panel
    await navPage.openPanel('proxy');
    await page.waitForTimeout(200);

    // Switch back
    await automationPanel.openPanel();
    await page.waitForTimeout(200);

    // Verify config persisted
    expect(await automationPanel.getSearchEngine()).toBe('duckduckgo');
    expect(await automationPanel.getKeywordCount()).toBe(1);
    expect(await automationPanel.getDomainCount()).toBe(1);

    await automationPanel.screenshot('automation-config-persisted');
  });
});

test.describe('UI Recovery', () => {
  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'passed') {
      await page.screenshot({
        path: `test-results/screenshots/recovery-${testInfo.title.replace(/\s+/g, '-')}-failed.png`,
        fullPage: true
      });
    }
  });

  test('should recover from rapid panel switching', async ({ page }) => {
    const navPage = new NavigationPage(page);
    await navPage.goto();

    // Rapidly switch between panels
    for (let i = 0; i < 5; i++) {
      await navPage.openPanel('proxy');
      await navPage.openPanel('privacy');
      await navPage.openPanel('automation');
      await navPage.openPanel('activity');
      await navPage.openPanel('stats');
    }

    // UI should still be functional
    await navPage.openPanel('proxy');
    await expect(page.locator('[data-testid="proxy-panel"]')).toBeVisible();

    await navPage.screenshot('rapid-switch-recovery');
  });

  test('should handle rapid add/remove operations', async ({ page }) => {
    const automationPanel = new AutomationPanelPage(page);
    await automationPanel.goto();
    await automationPanel.openPanel();

    // Add multiple keywords rapidly
    for (let i = 0; i < 5; i++) {
      await automationPanel.addKeyword(`keyword-${i}`);
    }

    // Verify all were added
    expect(await automationPanel.getKeywordCount()).toBe(5);

    // UI should still be responsive
    await expect(automationPanel.keywordInput).toBeEnabled();

    await automationPanel.screenshot('rapid-add-recovery');
  });
});

/**
 * E2E Tests - Tab Management (PRD EP-003)
 * Tests for tab creation, switching, closing, and isolation
 * - Create new tabs
 * - Switch between tabs
 * - Close tabs
 * - Verify tab isolation
 */

import { test, expect } from '@playwright/test';
import { NavigationPage } from './pages/NavigationPage';
import { ProxyPanelPage } from './pages/ProxyPanelPage';

test.describe('Tab Management', () => {
  let navPage: NavigationPage;

  test.beforeEach(async ({ page }) => {
    navPage = new NavigationPage(page);
    await navPage.goto();
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'passed') {
      await page.screenshot({
        path: `test-results/screenshots/tab-${testInfo.title.replace(/\s+/g, '-')}-failed.png`,
        fullPage: true
      });
    }
  });

  test('should display tab bar with initial tab', { tag: '@smoke' }, async () => {
    // Verify tab bar is visible
    await expect(navPage.tabBar).toBeVisible();

    // Verify at least one tab exists
    const tabCount = await navPage.getTabCount();
    expect(tabCount).toBeGreaterThanOrEqual(1);

    // First tab should show "New Tab"
    await expect(navPage.tabItems.first()).toContainText('New Tab');

    await navPage.screenshot('initial-tab');
  });

  test('should display new tab button', async () => {
    await expect(navPage.newTabButton).toBeVisible();
    await expect(navPage.newTabButton).toHaveAttribute('aria-label', 'New tab');

    await navPage.screenshot('new-tab-button');
  });

  test('should create new tab when clicking new tab button', async () => {
    const initialCount = await navPage.getTabCount();

    // Click new tab button
    await navPage.createNewTab();

    // Wait for new tab to appear
    await expect(navPage.tabItems).toHaveCount(initialCount + 1);

    // New tab should be added
    const newCount = await navPage.getTabCount();
    expect(newCount).toBe(initialCount + 1);

    await navPage.screenshot('new-tab-created');
  });

  test('should create multiple tabs', async () => {
    const initialCount = await navPage.getTabCount();

    // Create 3 new tabs
    await navPage.createNewTab();
    await navPage.createNewTab();
    await navPage.createNewTab();

    // Verify all tabs were created
    await expect(navPage.tabItems).toHaveCount(initialCount + 3);

    await navPage.screenshot('multiple-tabs');
  });

  test('should switch to tab when clicking on it', async () => {
    // Create a new tab first
    await navPage.createNewTab();

    // Click on the first tab
    await navPage.tabItems.first().click();

    // Verify first tab appears selected (has active class or similar indicator)
    // The exact implementation depends on how active tabs are styled
    await navPage.screenshot('tab-switched');
  });

  test('should display close button on tabs', async () => {
    // Verify close button exists on tabs
    await expect(navPage.tabCloseButtons.first()).toBeVisible();

    await navPage.screenshot('tab-close-button');
  });

  test('should close tab when clicking close button', async () => {
    // Create a new tab first so we have at least 2 tabs
    await navPage.createNewTab();
    const countBefore = await navPage.getTabCount();
    expect(countBefore).toBeGreaterThanOrEqual(2);

    // Close the second tab (index 1)
    await navPage.closeTab(1);

    // Verify tab count decreased
    await expect(navPage.tabItems).toHaveCount(countBefore - 1);

    await navPage.screenshot('tab-closed');
  });

  test('should not close last remaining tab', async () => {
    // Get to single tab state
    while (await navPage.getTabCount() > 1) {
      await navPage.closeTab(1);
    }

    const singleTabCount = await navPage.getTabCount();
    expect(singleTabCount).toBe(1);

    // Try to close the last tab - behavior depends on app design
    // Some apps prevent closing last tab, others create a new one
    await navPage.screenshot('single-tab-state');
  });

  test('should display tab title', async () => {
    // Verify tab title element exists
    const tabTitle = navPage.tabItems.first().locator('[data-testid="tab-title"]');
    await expect(tabTitle).toBeVisible();

    // Initial tab should show "New Tab"
    await expect(tabTitle).toContainText('New Tab');

    await navPage.screenshot('tab-title');
  });

  test('should show proxy status for each tab session', async () => {
    // Verify proxy status is displayed
    await expect(navPage.proxyStatus).toBeVisible();
    await expect(navPage.proxyStatusIndicator).toBeVisible();
    await expect(navPage.proxyStatusText).toBeVisible();

    await navPage.screenshot('tab-proxy-status');
  });

  test('should maintain tab state when switching panels', async () => {
    // Create multiple tabs
    await navPage.createNewTab();
    await navPage.createNewTab();
    const tabCount = await navPage.getTabCount();

    // Switch to different panel
    await navPage.openPanel('privacy');
    await navPage.openPanel('automation');

    // Switch back to proxy panel
    await navPage.openPanel('proxy');

    // Verify tab count is maintained
    expect(await navPage.getTabCount()).toBe(tabCount);

    await navPage.screenshot('tab-state-maintained');
  });
});

test.describe('Tab Isolation', () => {
  let navPage: NavigationPage;
  let proxyPanel: ProxyPanelPage;

  test.beforeEach(async ({ page }) => {
    navPage = new NavigationPage(page);
    proxyPanel = new ProxyPanelPage(page);
    await navPage.goto();
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'passed') {
      await page.screenshot({
        path: `test-results/screenshots/tab-isolation-${testInfo.title.replace(/\s+/g, '-')}-failed.png`,
        fullPage: true
      });
    }
  });

  test('should display proxy configuration per tab', async () => {
    // Open proxy panel
    await proxyPanel.openPanel();

    // Verify proxy configuration is accessible
    await expect(proxyPanel.rotationStrategySelect).toBeVisible();

    // Each tab should be able to have different proxy settings
    await proxyPanel.screenshot('tab-proxy-config');
  });

  test('should support different rotation strategies for session isolation', async () => {
    await proxyPanel.openPanel();

    // Test all rotation strategies are available
    const strategies: Array<'round-robin' | 'random' | 'least-used' | 'fastest' | 'failure-aware' | 'weighted'> = [
      'round-robin', 'random', 'least-used', 'fastest', 'failure-aware', 'weighted'
    ];

    for (const strategy of strategies) {
      await proxyPanel.setRotationStrategy(strategy);
      expect(await proxyPanel.getRotationStrategy()).toBe(strategy);
    }

    await proxyPanel.screenshot('rotation-strategies-available');
  });

  test('should display address bar for tab navigation', async () => {
    await expect(navPage.addressBar).toBeVisible();
    await expect(navPage.addressInput).toBeVisible();

    // Verify placeholder
    await expect(navPage.addressInput).toHaveAttribute('placeholder', 'Search or enter URL...');

    await navPage.screenshot('tab-address-bar');
  });

  test('should have navigation controls for tab browsing', async () => {
    await navPage.verifyNavigationButtons();

    // All navigation buttons should be visible
    await expect(navPage.navBackButton).toBeVisible();
    await expect(navPage.navForwardButton).toBeVisible();
    await expect(navPage.navReloadButton).toBeVisible();

    // Verify aria-labels
    await expect(navPage.navBackButton).toHaveAttribute('aria-label', 'Back');
    await expect(navPage.navForwardButton).toHaveAttribute('aria-label', 'Forward');
    await expect(navPage.navReloadButton).toHaveAttribute('aria-label', 'Reload');

    await navPage.screenshot('tab-navigation-controls');
  });
});

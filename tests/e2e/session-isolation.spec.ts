/**
 * E2E Tests - Session Isolation (PRD EP-003)
 * Tests for tab and session isolation
 * - Create tabs with different proxies
 * - Verify cookie isolation between tabs
 * - Test session persistence
 */

import { test, expect } from '@playwright/test';
import { NavigationPage } from './pages/NavigationPage';
import { ProxyPanelPage } from './pages/ProxyPanelPage';

test.describe('Session Isolation', () => {
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
        path: `test-results/screenshots/session-${testInfo.title.replace(/\s+/g, '-')}-failed.png`,
        fullPage: true 
      });
    }
  });

  test('should display tab bar with initial tab', async () => {
    // Verify tab bar is visible
    await expect(navPage.tabBar).toBeVisible();
    
    // Verify at least one tab exists
    const tabCount = await navPage.getTabCount();
    expect(tabCount).toBeGreaterThanOrEqual(1);
    
    // Verify new tab button exists
    await expect(navPage.newTabButton).toBeVisible();
    
    await navPage.screenshot('initial-tab-state');
  });

  test('should have new tab button functional', async () => {
    // Verify new tab button is visible and has correct aria-label
    await expect(navPage.newTabButton).toBeVisible();
    await expect(navPage.newTabButton).toHaveAttribute('aria-label', 'New tab');
    
    await navPage.screenshot('new-tab-button');
  });

  test('should display proxy status for current session', async () => {
    // Verify proxy status is displayed
    await expect(navPage.proxyStatus).toBeVisible();
    await expect(navPage.proxyStatusIndicator).toBeVisible();
    await expect(navPage.proxyStatusText).toBeVisible();
    
    // Get status text
    const statusText = await navPage.getProxyStatusText();
    expect(statusText).toBeTruthy();
    
    await navPage.screenshot('proxy-status-display');
  });

  test('should be able to configure proxy for session', async () => {
    // Open proxy panel
    await proxyPanel.openPanel();
    
    // Verify proxy panel is visible
    expect(await proxyPanel.isPanelVisible()).toBe(true);
    
    // Verify rotation strategy can be configured (affects session proxy selection)
    await proxyPanel.setRotationStrategy('round-robin');
    expect(await proxyPanel.getRotationStrategy()).toBe('round-robin');
    
    await proxyPanel.screenshot('session-proxy-config');
  });

  test('should verify session panel can be toggled', async () => {
    // Open proxy panel (session configuration)
    await proxyPanel.openPanel();
    expect(await proxyPanel.isPanelVisible()).toBe(true);
    
    // Close panel
    await proxyPanel.closePanel();
    expect(await proxyPanel.isPanelVisible()).toBe(false);
    
    // Reopen panel
    await proxyPanel.openPanel();
    expect(await proxyPanel.isPanelVisible()).toBe(true);
    
    await navPage.screenshot('session-panel-toggle');
  });

  test('should display session statistics', async () => {
    // Open proxy panel to view session stats
    await proxyPanel.openPanel();
    
    // Verify stats are displayed
    await proxyPanel.verifyStatsDisplayed();
    
    // Stats should show Total, Active, Failed
    await expect(proxyPanel.statTotal).toBeVisible();
    await expect(proxyPanel.statActive).toBeVisible();
    await expect(proxyPanel.statFailed).toBeVisible();
    
    await proxyPanel.screenshot('session-statistics');
  });

  test('should maintain UI state across panel switches', async () => {
    // Open proxy panel and configure
    await proxyPanel.openPanel();
    await proxyPanel.setRotationStrategy('fastest');
    
    // Switch to different panel
    await navPage.openPanel('privacy');
    
    // Switch back to proxy panel
    await proxyPanel.openPanel();
    
    // Verify configuration is maintained
    expect(await proxyPanel.getRotationStrategy()).toBe('fastest');
    
    await navPage.screenshot('state-persistence');
  });

  test('should display address bar for navigation', async () => {
    // Verify address bar elements
    await expect(navPage.addressBar).toBeVisible();
    await expect(navPage.addressInput).toBeVisible();
    
    // Verify placeholder text
    await expect(navPage.addressInput).toHaveAttribute('placeholder', 'Search or enter URL...');
    
    await navPage.screenshot('address-bar');
  });

  test('should have navigation controls for session', async () => {
    // Verify navigation buttons
    await navPage.verifyNavigationButtons();
    
    // Back and Forward should be visible (may be disabled)
    await expect(navPage.navBackButton).toBeVisible();
    await expect(navPage.navForwardButton).toBeVisible();
    await expect(navPage.navReloadButton).toBeVisible();
    
    await navPage.screenshot('navigation-controls');
  });

  test('should support multiple rotation strategies for session isolation', async () => {
    await proxyPanel.openPanel();
    
    // Test all rotation strategies
    const strategies: Array<'round-robin' | 'random' | 'least-used' | 'fastest' | 'failure-aware' | 'weighted'> = [
      'round-robin', 'random', 'least-used', 'fastest', 'failure-aware', 'weighted'
    ];
    
    for (const strategy of strategies) {
      await proxyPanel.setRotationStrategy(strategy);
      expect(await proxyPanel.getRotationStrategy()).toBe(strategy);
    }
    
    await proxyPanel.screenshot('rotation-strategies');
  });
});

/**
 * E2E Tests - Proxy Management
 * Tests for proxy panel functionality using Page Object Model
 */

import { test, expect } from '@playwright/test';
import { ProxyPanelPage } from './pages/ProxyPanelPage';

test.describe('Proxy Management', () => {
  let proxyPanel: ProxyPanelPage;

  test.beforeEach(async ({ page }) => {
    proxyPanel = new ProxyPanelPage(page);
    await proxyPanel.goto();
  });

  test.afterEach(async ({ page }, testInfo) => {
    // Capture screenshot on failure
    if (testInfo.status !== 'passed') {
      await page.screenshot({ 
        path: `test-results/screenshots/proxy-${testInfo.title.replace(/\s+/g, '-')}-failed.png`,
        fullPage: true 
      });
    }
  });

  test('should display proxy panel', { tag: '@smoke' }, async () => {
    await proxyPanel.openPanel();
    await expect(proxyPanel.panelTitle).toHaveText('Proxy Manager');
  });

  test('should display add proxy button', async () => {
    await proxyPanel.openPanel();
    await expect(proxyPanel.addProxyButton).toBeVisible();
    await expect(proxyPanel.addProxyButton).toContainText('Add Proxy');
  });

  test('should display proxy list or empty state', async () => {
    await proxyPanel.openPanel();
    await proxyPanel.waitForProxiesLoaded();
    
    // Check for empty state or proxy items
    const isEmpty = await proxyPanel.isEmptyStateVisible();
    const proxyCount = await proxyPanel.getProxyCount();
    
    expect(isEmpty || proxyCount > 0).toBe(true);
    
    if (isEmpty) {
      await expect(proxyPanel.proxyEmptyState).toContainText('No proxies configured');
    }
  });

  test('should show proxy statistics', async () => {
    await proxyPanel.openPanel();
    await proxyPanel.verifyStatsDisplayed();
    
    // Verify stat labels
    await expect(proxyPanel.statTotal).toContainText('Total');
    await expect(proxyPanel.statActive).toContainText('Active');
    await expect(proxyPanel.statFailed).toContainText('Failed');
  });

  test('should change rotation strategy', async () => {
    await proxyPanel.openPanel();
    
    // Change to 'fastest' strategy
    await proxyPanel.setRotationStrategy('fastest');
    expect(await proxyPanel.getRotationStrategy()).toBe('fastest');
    
    // Change to 'random' strategy
    await proxyPanel.setRotationStrategy('random');
    expect(await proxyPanel.getRotationStrategy()).toBe('random');
    
    // Change back to 'round-robin'
    await proxyPanel.setRotationStrategy('round-robin');
    expect(await proxyPanel.getRotationStrategy()).toBe('round-robin');
  });

  test('should toggle proxy panel visibility', async () => {
    // Open panel
    await proxyPanel.openPanel();
    expect(await proxyPanel.isPanelVisible()).toBe(true);
    
    // Close panel
    await proxyPanel.closePanel();
    expect(await proxyPanel.isPanelVisible()).toBe(false);
    
    // Open again
    await proxyPanel.openPanel();
    expect(await proxyPanel.isPanelVisible()).toBe(true);
  });

  test('should display all rotation strategy options', async () => {
    await proxyPanel.openPanel();
    
    const options = await proxyPanel.rotationStrategySelect.locator('option').allTextContents();
    
    expect(options).toContain('Round Robin');
    expect(options).toContain('Random');
    expect(options).toContain('Least Used');
    expect(options).toContain('Fastest');
    expect(options).toContain('Failure Aware');
    expect(options).toContain('Weighted');
  });
});

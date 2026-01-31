/**
 * E2E Tests - Proxy Rotation (PRD EP-001)
 * Tests for automated proxy rotation functionality
 * - Configure rotation strategies
 * - Verify rotation settings persist
 * - Test rotation strategy changes
 */

import { test, expect } from '@playwright/test';
import { ProxyPanelPage } from './pages/ProxyPanelPage';

test.describe('Proxy Rotation', () => {
  let proxyPanel: ProxyPanelPage;

  test.beforeEach(async ({ page }) => {
    proxyPanel = new ProxyPanelPage(page);
    await proxyPanel.goto();
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'passed') {
      await page.screenshot({ 
        path: `test-results/screenshots/rotation-${testInfo.title.replace(/\s+/g, '-')}-failed.png`,
        fullPage: true 
      });
    }
  });

  test('should display rotation strategy selector', async () => {
    await proxyPanel.openPanel();
    
    await expect(proxyPanel.rotationStrategySelect).toBeVisible();
    
    await proxyPanel.screenshot('rotation-strategy-selector');
  });

  test('should have all rotation strategy options available', async () => {
    await proxyPanel.openPanel();
    
    const options = await proxyPanel.rotationStrategySelect.locator('option').allTextContents();
    
    // Verify all expected strategies are available
    expect(options).toContain('Round Robin');
    expect(options).toContain('Random');
    expect(options).toContain('Least Used');
    expect(options).toContain('Fastest');
    expect(options).toContain('Failure Aware');
    expect(options).toContain('Weighted');
    
    await proxyPanel.screenshot('all-rotation-strategies');
  });

  test('should change to Round Robin strategy', async () => {
    await proxyPanel.openPanel();
    
    await proxyPanel.setRotationStrategy('round-robin');
    expect(await proxyPanel.getRotationStrategy()).toBe('round-robin');
    
    await proxyPanel.screenshot('round-robin-selected');
  });

  test('should change to Random strategy', async () => {
    await proxyPanel.openPanel();
    
    await proxyPanel.setRotationStrategy('random');
    expect(await proxyPanel.getRotationStrategy()).toBe('random');
    
    await proxyPanel.screenshot('random-selected');
  });

  test('should change to Least Used strategy', async () => {
    await proxyPanel.openPanel();
    
    await proxyPanel.setRotationStrategy('least-used');
    expect(await proxyPanel.getRotationStrategy()).toBe('least-used');
    
    await proxyPanel.screenshot('least-used-selected');
  });

  test('should change to Fastest strategy', async () => {
    await proxyPanel.openPanel();
    
    await proxyPanel.setRotationStrategy('fastest');
    expect(await proxyPanel.getRotationStrategy()).toBe('fastest');
    
    await proxyPanel.screenshot('fastest-selected');
  });

  test('should change to Failure Aware strategy', async () => {
    await proxyPanel.openPanel();
    
    await proxyPanel.setRotationStrategy('failure-aware');
    expect(await proxyPanel.getRotationStrategy()).toBe('failure-aware');
    
    await proxyPanel.screenshot('failure-aware-selected');
  });

  test('should change to Weighted strategy', async () => {
    await proxyPanel.openPanel();
    
    await proxyPanel.setRotationStrategy('weighted');
    expect(await proxyPanel.getRotationStrategy()).toBe('weighted');
    
    await proxyPanel.screenshot('weighted-selected');
  });

  test('should cycle through all rotation strategies', async () => {
    await proxyPanel.openPanel();
    
    const strategies: Array<'round-robin' | 'random' | 'least-used' | 'fastest' | 'failure-aware' | 'weighted'> = [
      'round-robin', 'random', 'least-used', 'fastest', 'failure-aware', 'weighted'
    ];
    
    for (const strategy of strategies) {
      await proxyPanel.setRotationStrategy(strategy);
      const currentStrategy = await proxyPanel.getRotationStrategy();
      expect(currentStrategy).toBe(strategy);
    }
    
    await proxyPanel.screenshot('rotation-cycle-complete');
  });

  test('should maintain rotation strategy after panel toggle', async ({ page }) => {
    await proxyPanel.openPanel();
    
    // Set a specific strategy
    await proxyPanel.setRotationStrategy('fastest');
    expect(await proxyPanel.getRotationStrategy()).toBe('fastest');
    
    // Close and reopen panel with proper waits
    await proxyPanel.closePanel();
    await page.waitForTimeout(200); // Wait for close animation
    await proxyPanel.openPanel();
    await page.waitForLoadState('networkidle');
    
    // Verify strategy is maintained
    expect(await proxyPanel.getRotationStrategy()).toBe('fastest');
    
    await proxyPanel.screenshot('rotation-persisted');
  });

  test('should display proxy statistics relevant to rotation', async () => {
    await proxyPanel.openPanel();
    
    // Verify stats that are relevant to rotation decisions
    await proxyPanel.verifyStatsDisplayed();
    
    // Total proxies affects rotation pool
    await expect(proxyPanel.statTotal).toBeVisible();
    
    // Active proxies are candidates for rotation
    await expect(proxyPanel.statActive).toBeVisible();
    
    // Failed proxies should be excluded from rotation
    await expect(proxyPanel.statFailed).toBeVisible();
    
    await proxyPanel.screenshot('rotation-stats');
  });

  test('should display Add Proxy button for expanding rotation pool', async () => {
    await proxyPanel.openPanel();
    
    // Add Proxy button allows adding more proxies to rotation pool
    await expect(proxyPanel.addProxyButton).toBeVisible();
    await expect(proxyPanel.addProxyButton).toContainText('Add Proxy');
    
    await proxyPanel.screenshot('add-proxy-for-rotation');
  });
});

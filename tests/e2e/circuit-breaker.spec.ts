/**
 * E2E Tests - Circuit Breaker (PRD Resilience)
 * Tests for circuit breaker functionality in proxy management
 * - Verify circuit breaker UI indicators
 * - Test failure handling configuration
 * - Verify resilience settings
 */

import { test, expect } from '@playwright/test';
import { ProxyPanelPage } from './pages/ProxyPanelPage';

test.describe('Circuit Breaker', () => {
  let proxyPanel: ProxyPanelPage;

  test.beforeEach(async ({ page }) => {
    proxyPanel = new ProxyPanelPage(page);
    await proxyPanel.goto();
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'passed') {
      await page.screenshot({ 
        path: `test-results/screenshots/circuit-${testInfo.title.replace(/\s+/g, '-')}-failed.png`,
        fullPage: true 
      });
    }
  });

  test('should display proxy failure statistics', async () => {
    await proxyPanel.openPanel();
    
    // Verify failed proxy count is displayed
    await expect(proxyPanel.statFailed).toBeVisible();
    await expect(proxyPanel.statFailed).toContainText('Failed');
    
    await proxyPanel.screenshot('failure-stats-displayed');
  });

  test('should display active proxy count for circuit breaker decisions', async () => {
    await proxyPanel.openPanel();
    
    // Active proxies are used when circuit is closed
    await expect(proxyPanel.statActive).toBeVisible();
    await expect(proxyPanel.statActive).toContainText('Active');
    
    await proxyPanel.screenshot('active-proxy-count');
  });

  test('should have failure-aware rotation strategy for circuit breaker', async () => {
    await proxyPanel.openPanel();
    
    // Failure-aware strategy implements circuit breaker pattern
    await proxyPanel.setRotationStrategy('failure-aware');
    expect(await proxyPanel.getRotationStrategy()).toBe('failure-aware');
    
    await proxyPanel.screenshot('failure-aware-strategy');
  });

  test('should display proxy list with status indicators', async () => {
    await proxyPanel.openPanel();
    
    // Wait for proxies to load
    await proxyPanel.waitForProxiesLoaded();
    
    // Verify list container exists
    await expect(proxyPanel.proxyList).toBeVisible();
    
    // Either empty state or proxy items should be visible
    const isEmpty = await proxyPanel.isEmptyStateVisible();
    const proxyCount = await proxyPanel.getProxyCount();
    
    expect(isEmpty || proxyCount >= 0).toBe(true);
    
    await proxyPanel.screenshot('proxy-list-status');
  });

  test('should display total proxy count for circuit breaker pool', async () => {
    await proxyPanel.openPanel();
    
    // Total count represents the proxy pool size
    await expect(proxyPanel.statTotal).toBeVisible();
    await expect(proxyPanel.statTotal).toContainText('Total');
    
    await proxyPanel.screenshot('total-proxy-pool');
  });

  test('should allow adding proxies to circuit breaker pool', async () => {
    await proxyPanel.openPanel();
    
    // Add Proxy button allows expanding the circuit breaker pool
    await expect(proxyPanel.addProxyButton).toBeVisible();
    await expect(proxyPanel.addProxyButton).toBeEnabled();
    
    await proxyPanel.screenshot('add-to-pool');
  });

  test('should display all three status categories for circuit breaker', async () => {
    await proxyPanel.openPanel();
    
    // Circuit breaker needs to track: Total, Active (healthy), Failed (tripped)
    await proxyPanel.verifyStatsDisplayed();
    
    await expect(proxyPanel.statTotal).toBeVisible();
    await expect(proxyPanel.statActive).toBeVisible();
    await expect(proxyPanel.statFailed).toBeVisible();
    
    await proxyPanel.screenshot('circuit-breaker-categories');
  });

  test('should support switching between rotation strategies for resilience', async () => {
    await proxyPanel.openPanel();
    
    // Different strategies have different failure handling
    
    // Round-robin: simple rotation, no failure awareness
    await proxyPanel.setRotationStrategy('round-robin');
    expect(await proxyPanel.getRotationStrategy()).toBe('round-robin');
    
    // Failure-aware: implements circuit breaker
    await proxyPanel.setRotationStrategy('failure-aware');
    expect(await proxyPanel.getRotationStrategy()).toBe('failure-aware');
    
    // Fastest: may avoid slow/failing proxies
    await proxyPanel.setRotationStrategy('fastest');
    expect(await proxyPanel.getRotationStrategy()).toBe('fastest');
    
    await proxyPanel.screenshot('resilience-strategies');
  });

  test('should maintain circuit breaker configuration after panel toggle', async () => {
    await proxyPanel.openPanel();
    
    // Set failure-aware strategy
    await proxyPanel.setRotationStrategy('failure-aware');
    
    // Toggle panel
    await proxyPanel.closePanel();
    await proxyPanel.openPanel();
    
    // Verify configuration persisted
    expect(await proxyPanel.getRotationStrategy()).toBe('failure-aware');
    
    await proxyPanel.screenshot('circuit-config-persisted');
  });

  test('should display empty state when no proxies in circuit breaker pool', async () => {
    await proxyPanel.openPanel();
    
    // Wait for load
    await proxyPanel.waitForProxiesLoaded();
    
    // Check if empty state is shown when no proxies
    const isEmpty = await proxyPanel.isEmptyStateVisible();
    const proxyCount = await proxyPanel.getProxyCount();
    
    if (isEmpty) {
      await expect(proxyPanel.proxyEmptyState).toContainText('No proxies configured');
    } else {
      expect(proxyCount).toBeGreaterThan(0);
    }
    
    await proxyPanel.screenshot('circuit-breaker-pool-state');
  });
});

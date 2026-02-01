/**
 * Proxy Panel Page Object
 * Encapsulates all interactions with the Proxy Management panel
 */

import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class ProxyPanelPage extends BasePage {
  // Panel elements
  readonly panelButton: Locator;
  readonly panel: Locator;
  readonly panelTitle: Locator;
  
  // Proxy management elements
  readonly addProxyButton: Locator;
  readonly rotationStrategySelect: Locator;
  readonly proxyList: Locator;
  readonly proxyItems: Locator;
  readonly proxyEmptyState: Locator;
  readonly proxyLoading: Locator;
  
  // Stats elements
  readonly proxyStats: Locator;
  readonly statTotal: Locator;
  readonly statActive: Locator;
  readonly statFailed: Locator;

  constructor(page: Page) {
    super(page);
    
    // Panel elements
    this.panelButton = page.locator('[data-testid="panel-btn-proxy"]');
    this.panel = page.locator('[data-testid="proxy-panel"]');
    this.panelTitle = page.locator('[data-testid="proxy-panel-title"]');
    
    // Proxy management elements
    this.addProxyButton = page.locator('[data-testid="add-proxy-btn"]');
    this.rotationStrategySelect = page.locator('[data-testid="rotation-strategy-select"]');
    this.proxyList = page.locator('[data-testid="proxy-list"]');
    this.proxyItems = page.locator('[data-testid="proxy-item"]');
    this.proxyEmptyState = page.locator('[data-testid="proxy-empty-state"]');
    this.proxyLoading = page.locator('[data-testid="proxy-loading"]');
    
    // Stats elements
    this.proxyStats = page.locator('[data-testid="proxy-stats"]');
    this.statTotal = page.locator('[data-testid="proxy-stat-total"]');
    this.statActive = page.locator('[data-testid="proxy-stat-active"]');
    this.statFailed = page.locator('[data-testid="proxy-stat-failed"]');
  }

  /**
   * Open the proxy panel
   * Note: Panel may already be open by default, so check visibility first
   */
  async openPanel(): Promise<void> {
    const isVisible = await this.panel.isVisible();
    if (!isVisible) {
      await this.panelButton.click();
    }
    await expect(this.panel).toBeVisible();
  }

  /**
   * Close the proxy panel
   * Note: Only click if panel is currently visible
   */
  async closePanel(): Promise<void> {
    const isVisible = await this.panel.isVisible();
    if (isVisible) {
      await this.panelButton.click();
    }
    await expect(this.panel).not.toBeVisible();
  }

  /**
   * Check if proxy panel is visible
   */
  async isPanelVisible(): Promise<boolean> {
    return await this.panel.isVisible();
  }

  /**
   * Click Add Proxy button
   */
  async clickAddProxy(): Promise<void> {
    await this.addProxyButton.click();
  }

  /**
   * Set rotation strategy
   */
  async setRotationStrategy(strategy: 'round-robin' | 'random' | 'least-used' | 'fastest' | 'failure-aware' | 'weighted'): Promise<void> {
    await this.rotationStrategySelect.selectOption(strategy);
  }

  /**
   * Get current rotation strategy
   */
  async getRotationStrategy(): Promise<string> {
    return await this.rotationStrategySelect.inputValue();
  }

  /**
   * Get proxy count
   */
  async getProxyCount(): Promise<number> {
    return await this.proxyItems.count();
  }

  /**
   * Check if empty state is displayed
   */
  async isEmptyStateVisible(): Promise<boolean> {
    return await this.proxyEmptyState.isVisible();
  }

  /**
   * Check if loading state is displayed
   */
  async isLoadingVisible(): Promise<boolean> {
    return await this.proxyLoading.isVisible();
  }

  /**
   * Wait for proxies to load
   */
  async waitForProxiesLoaded(): Promise<void> {
    // Wait for loading to disappear or empty state/items to appear
    await this.page.waitForFunction(() => {
      const loading = document.querySelector('[data-testid="proxy-loading"]');
      const empty = document.querySelector('[data-testid="proxy-empty-state"]');
      const items = document.querySelectorAll('[data-testid="proxy-item"]');
      return !loading && (empty || items.length > 0);
    }, { timeout: 10000 });
  }

  /**
   * Verify stats are displayed
   */
  async verifyStatsDisplayed(): Promise<void> {
    await expect(this.proxyStats).toBeVisible();
    await expect(this.statTotal).toBeVisible();
    await expect(this.statActive).toBeVisible();
    await expect(this.statFailed).toBeVisible();
  }
}

/**
 * Stats Panel Page Object
 * Encapsulates all interactions with the Statistics panel
 */

import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class StatsPanelPage extends BasePage {
  // Panel elements
  readonly panelButton: Locator;
  readonly panel: Locator;
  readonly panelTitle: Locator;

  // Stats sections
  readonly proxyStatsSection: Locator;
  readonly automationStatsSection: Locator;
  readonly privacyStatsSection: Locator;
  readonly sessionStatsSection: Locator;

  // Proxy stats
  readonly totalProxies: Locator;
  readonly activeProxies: Locator;
  readonly failedProxies: Locator;
  readonly avgResponseTime: Locator;

  // Automation stats
  readonly totalSearches: Locator;
  readonly successfulSearches: Locator;
  readonly failedSearches: Locator;
  readonly totalClicks: Locator;

  // Charts
  readonly proxyChart: Locator;
  readonly automationChart: Locator;

  // Refresh control
  readonly refreshButton: Locator;
  readonly lastUpdated: Locator;

  constructor(page: Page) {
    super(page);

    // Panel elements
    this.panelButton = page.locator('[data-testid="panel-btn-stats"]');
    this.panel = page.locator('[data-testid="stats-panel"]');
    this.panelTitle = page.locator('text=Statistics');

    // Stats sections
    this.proxyStatsSection = page.locator('[data-testid="proxy-statistics"]');
    this.automationStatsSection = page.locator('[data-testid="automation-statistics"]');
    this.privacyStatsSection = page.locator('[data-testid="privacy-statistics"]');
    this.sessionStatsSection = page.locator('[data-testid="session-statistics"]');

    // Proxy stats
    this.totalProxies = page.locator('[data-testid="stat-total-proxies"]');
    this.activeProxies = page.locator('[data-testid="stat-active-proxies"]');
    this.failedProxies = page.locator('[data-testid="stat-failed-proxies"]');
    this.avgResponseTime = page.locator('[data-testid="stat-avg-response-time"]');

    // Automation stats
    this.totalSearches = page.locator('[data-testid="stat-total-searches"]');
    this.successfulSearches = page.locator('[data-testid="stat-successful-searches"]');
    this.failedSearches = page.locator('[data-testid="stat-failed-searches"]');
    this.totalClicks = page.locator('[data-testid="stat-total-clicks"]');

    // Charts
    this.proxyChart = page.locator('[data-testid="proxy-performance-chart"]');
    this.automationChart = page.locator('[data-testid="automation-chart"]');

    // Refresh control
    this.refreshButton = page.locator('[data-testid="refresh-stats-btn"]');
    this.lastUpdated = page.locator('[data-testid="stats-last-updated"]');
  }

  /**
   * Open the stats panel
   * Note: Check visibility first to handle toggle behavior
   */
  async openPanel(): Promise<void> {
    const isVisible = await this.panel.isVisible();
    if (!isVisible) {
      await this.panelButton.click();
    }
    await expect(this.panelTitle).toBeVisible();
  }

  /**
   * Close the stats panel
   * Note: Only click if panel is currently visible
   */
  async closePanel(): Promise<void> {
    const isVisible = await this.panel.isVisible();
    if (isVisible) {
      await this.panelButton.click();
    }
    await expect(this.panelTitle).not.toBeVisible();
  }

  /**
   * Check if stats panel is visible
   */
  async isPanelVisible(): Promise<boolean> {
    return await this.panelTitle.isVisible();
  }

  /**
   * Refresh statistics
   */
  async refreshStats(): Promise<void> {
    await this.refreshButton.click();
    await this.waitForNetworkIdle();
  }

  /**
   * Verify proxy stats section is visible
   */
  async verifyProxyStatsVisible(): Promise<void> {
    await expect(this.proxyStatsSection).toBeVisible();
  }

  /**
   * Verify automation stats section is visible
   */
  async verifyAutomationStatsVisible(): Promise<void> {
    await expect(this.automationStatsSection).toBeVisible();
  }

  /**
   * Get total proxies count
   */
  async getTotalProxiesCount(): Promise<string> {
    return await this.totalProxies.textContent() || '0';
  }

  /**
   * Get active proxies count
   */
  async getActiveProxiesCount(): Promise<string> {
    return await this.activeProxies.textContent() || '0';
  }

  /**
   * Verify charts are rendered
   */
  async verifyChartsRendered(): Promise<void> {
    // Charts may take time to render
    await this.page.waitForTimeout(500);
    // Check for SVG elements typically used by recharts
    const chartSvg = this.page.locator('.recharts-wrapper');
    await expect(chartSvg.first()).toBeVisible();
  }
}

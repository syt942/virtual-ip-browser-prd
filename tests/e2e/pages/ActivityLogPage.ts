/**
 * Activity Log Page Object
 * Encapsulates all interactions with the Activity Log panel
 */

import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class ActivityLogPage extends BasePage {
  // Panel elements
  readonly panelButton: Locator;
  readonly panel: Locator;
  readonly panelTitle: Locator;

  // Log list elements
  readonly logList: Locator;
  readonly logItems: Locator;
  readonly emptyState: Locator;
  readonly loadingState: Locator;

  // Filter elements
  readonly levelFilter: Locator;
  readonly categoryFilter: Locator;
  readonly statusFilter: Locator;
  readonly startDateFilter: Locator;
  readonly endDateFilter: Locator;
  readonly clearFiltersButton: Locator;

  // Control elements
  readonly refreshButton: Locator;

  // Pagination elements
  readonly pagination: Locator;
  readonly prevPageButton: Locator;
  readonly nextPageButton: Locator;
  readonly pageInfo: Locator;

  constructor(page: Page) {
    super(page);

    // Panel elements
    this.panelButton = page.locator('[data-testid="panel-btn-activity"]');
    this.panel = page.locator('[data-testid="activity-log-panel"]');
    this.panelTitle = page.locator('text=Activity Log');

    // Log list elements
    this.logList = page.locator('[data-testid="activity-log-list"]');
    this.logItems = page.locator('[data-testid="log-item"]');
    this.emptyState = page.locator('[data-testid="activity-log-empty"]');
    this.loadingState = page.locator('[data-testid="activity-log-loading"]');

    // Filter elements
    this.levelFilter = page.locator('[data-testid="level-filter"]');
    this.categoryFilter = page.locator('[data-testid="category-filter"]');
    this.statusFilter = page.locator('[data-testid="status-filter"]');
    this.startDateFilter = page.locator('[data-testid="start-date-filter"]');
    this.endDateFilter = page.locator('[data-testid="end-date-filter"]');
    this.clearFiltersButton = page.locator('[data-testid="clear-filters-btn"]');

    // Control elements
    this.refreshButton = page.locator('[data-testid="refresh-logs-btn"]');

    // Pagination elements
    this.pagination = page.locator('[data-testid="pagination"]');
    this.prevPageButton = page.locator('[data-testid="prev-page-btn"]');
    this.nextPageButton = page.locator('[data-testid="next-page-btn"]');
    this.pageInfo = page.locator('[data-testid="page-info"]');
  }

  /**
   * Open the activity log panel
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
   * Close the activity log panel
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
   * Check if activity panel is visible
   */
  async isPanelVisible(): Promise<boolean> {
    return await this.panelTitle.isVisible();
  }

  /**
   * Filter logs by level
   */
  async filterByLevel(level: 'all' | 'debug' | 'info' | 'warning' | 'error' | 'success'): Promise<void> {
    await this.levelFilter.selectOption(level);
    await this.waitForNetworkIdle();
  }

  /**
   * Filter logs by category
   */
  async filterByCategory(category: 'all' | 'proxy' | 'automation' | 'privacy' | 'system' | 'navigation'): Promise<void> {
    await this.categoryFilter.selectOption(category);
    await this.waitForNetworkIdle();
  }

  /**
   * Get log entry count
   */
  async getLogCount(): Promise<number> {
    return await this.logItems.count();
  }

  /**
   * Check if empty state is displayed
   */
  async isEmptyStateVisible(): Promise<boolean> {
    return await this.emptyState.isVisible();
  }

  /**
   * Check if loading state is displayed
   */
  async isLoadingVisible(): Promise<boolean> {
    return await this.loadingState.isVisible();
  }

  /**
   * Refresh logs
   */
  async refreshLogs(): Promise<void> {
    await this.refreshButton.click();
    await this.waitForNetworkIdle();
  }

  /**
   * Go to next page
   */
  async nextPage(): Promise<void> {
    await this.nextPageButton.click();
    await this.waitForNetworkIdle();
  }

  /**
   * Go to previous page
   */
  async prevPage(): Promise<void> {
    await this.prevPageButton.click();
    await this.waitForNetworkIdle();
  }

  /**
   * Check if next page button is enabled
   */
  async isNextPageEnabled(): Promise<boolean> {
    return await this.nextPageButton.isEnabled();
  }

  /**
   * Check if previous page button is enabled
   */
  async isPrevPageEnabled(): Promise<boolean> {
    return await this.prevPageButton.isEnabled();
  }

  /**
   * Clear all filters
   */
  async clearFilters(): Promise<void> {
    await this.clearFiltersButton.click();
    await this.waitForNetworkIdle();
  }

  /**
   * Get log entry by index
   */
  getLogEntry(index: number): Locator {
    return this.logItems.nth(index);
  }

  /**
   * Wait for logs to load
   */
  async waitForLogsLoaded(): Promise<void> {
    await this.page.waitForFunction(() => {
      const loading = document.querySelector('[data-testid="activity-log-loading"]');
      const empty = document.querySelector('[data-testid="activity-log-empty"]');
      const items = document.querySelectorAll('[data-testid="log-item"]');
      return !loading && (empty || items.length > 0);
    }, { timeout: 10000 });
  }
}

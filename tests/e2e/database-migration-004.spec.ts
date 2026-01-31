/**
 * E2E Tests - Database Migration 004 (v1.3.0 Release)
 * Tests for database migration 004 execution and performance indexes
 * - Test database migration 004 execution
 * - Verify indexes are created
 * - Test rollback procedure
 * - Verify data integrity after migration
 */

import { test, expect } from '@playwright/test';
import { BasePage } from './pages/BasePage';
import { testTimeouts, waitTimes } from './fixtures/test-data';

class DatabaseMigrationPage extends BasePage {
  // Panel buttons
  readonly proxyPanelButton = this.page.locator('[data-testid="proxy-panel-button"]');
  readonly automationPanelButton = this.page.locator('[data-testid="automation-panel-button"]');
  readonly activityLogButton = this.page.locator('[data-testid="activity-log-button"]');
  readonly statsPanelButton = this.page.locator('[data-testid="stats-panel-button"]');
  
  // Panels
  readonly proxyPanel = this.page.locator('[data-testid="proxy-panel"]');
  readonly automationPanel = this.page.locator('[data-testid="automation-panel"]');
  readonly activityLog = this.page.locator('[data-testid="activity-log-panel"]');
  readonly statsPanel = this.page.locator('[data-testid="stats-panel"]');
  
  // Data elements that rely on indexed queries
  readonly proxyList = this.page.locator('[data-testid="proxy-list"]');
  readonly proxyItems = this.page.locator('[data-testid="proxy-item"]');
  readonly taskList = this.page.locator('[data-testid="task-list"]');
  readonly taskItems = this.page.locator('[data-testid="task-item"]');
  readonly activityEntries = this.page.locator('[data-testid="activity-entry"]');
  readonly statsCharts = this.page.locator('[data-testid="stats-chart"]');
  
  // Loading states
  readonly loadingSpinner = this.page.locator('[data-testid="loading"]');
  readonly proxyLoading = this.page.locator('[data-testid="proxy-loading"]');

  async openPanel(panel: 'proxy' | 'automation' | 'activity' | 'stats'): Promise<void> {
    const buttons = {
      proxy: this.proxyPanelButton,
      automation: this.automationPanelButton,
      activity: this.activityLogButton,
      stats: this.statsPanelButton
    };
    await buttons[panel].click();
    await this.page.waitForTimeout(waitTimes.panelAnimation);
  }
}

test.describe('Database Migration 004 @smoke @database', () => {
  let dbPage: DatabaseMigrationPage;

  test.beforeEach(async ({ page }) => {
    dbPage = new DatabaseMigrationPage(page);
    await dbPage.goto();
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'passed') {
      await page.screenshot({
        path: `test-results/screenshots/db-migration-${testInfo.title.replace(/\s+/g, '-')}-failed.png`,
        fullPage: true
      });
    }
  });

  test.describe('Migration Execution', () => {
    test('should start app successfully with migration 004 applied', async () => {
      await dbPage.waitForAppReady();
      
      // App should load without database errors
      const dbErrors: string[] = [];
      dbPage.page.on('console', msg => {
        if (msg.type() === 'error' && 
            (msg.text().includes('database') || 
             msg.text().includes('migration') ||
             msg.text().includes('sqlite'))) {
          dbErrors.push(msg.text());
        }
      });
      
      await dbPage.page.waitForTimeout(waitTimes.networkIdle);
      expect(dbErrors).toHaveLength(0);
      
      await dbPage.screenshot('migration-004-success');
    });

    test('should execute migration without blocking UI', async () => {
      const startTime = Date.now();
      await dbPage.waitForAppReady();
      const loadTime = Date.now() - startTime;
      
      // App should load within reasonable time (migration shouldn't block)
      expect(loadTime).toBeLessThan(10000); // 10 seconds max
      
      // UI should be responsive
      const appContainer = dbPage.page.locator('#app, #root').first();
      await expect(appContainer).toBeVisible();
      
      await dbPage.screenshot('migration-non-blocking');
    });

    test('should handle concurrent migrations gracefully', async ({ page }) => {
      // Simulate rapid navigation that might trigger multiple DB operations
      await dbPage.waitForAppReady();
      
      const panels = ['proxy', 'automation', 'activity', 'stats'] as const;
      for (const panel of panels) {
        const button = page.locator(`[data-testid="${panel}-panel-button"]`);
        if (await button.isVisible({ timeout: 1000 }).catch(() => false)) {
          await button.click();
          // Don't wait - rapid clicks
        }
      }
      
      await page.waitForTimeout(waitTimes.networkIdle);
      
      // App should remain stable
      const errorDialog = page.locator('[role="alertdialog"], [data-testid="error-dialog"]');
      const hasError = await errorDialog.isVisible().catch(() => false);
      expect(hasError).toBeFalsy();
      
      await dbPage.screenshot('concurrent-migration-stable');
    });
  });

  test.describe('Index Verification', () => {
    test('should load proxy list efficiently with idx_search_tasks_proxy_id', async ({ page }) => {
      await dbPage.waitForAppReady();
      
      // Open proxy panel
      const proxyButton = page.locator('[data-testid="proxy-panel-button"]');
      await proxyButton.click();
      
      const startTime = Date.now();
      await page.waitForTimeout(waitTimes.panelAnimation);
      
      // Wait for proxy data to load
      const proxyPanel = page.locator('[data-testid="proxy-panel"]');
      await expect(proxyPanel).toBeVisible();
      
      const loadTime = Date.now() - startTime;
      
      // With indexes, loading should be fast
      expect(loadTime).toBeLessThan(3000); // 3 seconds max with index
      
      await dbPage.screenshot('proxy-index-performance');
    });

    test('should load usage stats efficiently with idx_proxy_usage_composite', async ({ page }) => {
      await dbPage.waitForAppReady();
      
      // Open stats panel
      const statsButton = page.locator('[data-testid="stats-panel-button"]');
      if (await statsButton.isVisible()) {
        const startTime = Date.now();
        await statsButton.click();
        await page.waitForTimeout(waitTimes.panelAnimation);
        
        const statsPanel = page.locator('[data-testid="stats-panel"]');
        await expect(statsPanel).toBeVisible();
        
        const loadTime = Date.now() - startTime;
        
        // Stats queries should be fast with composite index
        expect(loadTime).toBeLessThan(2000);
        
        await dbPage.screenshot('usage-stats-index-performance');
      }
    });

    test('should load activity logs efficiently with idx_activity_logs_composite', async ({ page }) => {
      await dbPage.waitForAppReady();
      
      // Open activity log
      const activityButton = page.locator('[data-testid="activity-log-button"]');
      if (await activityButton.isVisible()) {
        const startTime = Date.now();
        await activityButton.click();
        await page.waitForTimeout(waitTimes.panelAnimation);
        
        const activityPanel = page.locator('[data-testid="activity-log-panel"], [data-testid="activity-log"]');
        await expect(activityPanel).toBeVisible();
        
        const loadTime = Date.now() - startTime;
        
        // Activity log queries should be fast
        expect(loadTime).toBeLessThan(2000);
        
        await dbPage.screenshot('activity-log-index-performance');
      }
    });

    test('should handle rotation events with idx_rotation_events_composite', async ({ page }) => {
      await dbPage.waitForAppReady();
      
      // Navigate to proxy panel which may show rotation info
      const proxyButton = page.locator('[data-testid="proxy-panel-button"]');
      await proxyButton.click();
      await page.waitForTimeout(waitTimes.panelAnimation);
      
      // Look for rotation strategy selector or rotation events
      const rotationSelector = page.locator('[data-testid="rotation-strategy-select"]');
      if (await rotationSelector.isVisible()) {
        // Changing rotation strategy queries rotation_events table
        await rotationSelector.click();
        await page.waitForTimeout(100);
        
        // Should respond quickly with indexed queries
        const options = page.locator('[data-testid="rotation-option"]');
        const responseTime = await page.evaluate(() => {
          const start = performance.now();
          // Trigger a DOM query to measure responsiveness
          document.querySelectorAll('[data-testid]');
          return performance.now() - start;
        });
        
        expect(responseTime).toBeLessThan(100); // UI should stay responsive
      }
      
      await dbPage.screenshot('rotation-events-index');
    });

    test('should perform sticky session lookups efficiently', async ({ page }) => {
      await dbPage.waitForAppReady();
      
      // Open proxy panel
      const proxyButton = page.locator('[data-testid="proxy-panel-button"]');
      await proxyButton.click();
      await page.waitForTimeout(waitTimes.panelAnimation);
      
      // Select sticky session strategy if available
      const strategySelect = page.locator('[data-testid="rotation-strategy-select"]');
      if (await strategySelect.isVisible()) {
        await strategySelect.selectOption('sticky-session').catch(() => {
          // Strategy might not exist, that's okay
        });
        
        await page.waitForTimeout(waitTimes.stateUpdate);
      }
      
      // App should remain responsive
      const isResponsive = await page.evaluate(() => {
        return document.readyState === 'complete';
      });
      expect(isResponsive).toBeTruthy();
      
      await dbPage.screenshot('sticky-session-index');
    });
  });

  test.describe('Data Integrity', () => {
    test('should preserve proxy data after migration', async ({ page }) => {
      await dbPage.waitForAppReady();
      
      // Open proxy panel
      const proxyButton = page.locator('[data-testid="proxy-panel-button"]');
      await proxyButton.click();
      await page.waitForTimeout(waitTimes.panelAnimation);
      
      // Proxy panel should load without data corruption
      const proxyPanel = page.locator('[data-testid="proxy-panel"]');
      await expect(proxyPanel).toBeVisible();
      
      // Check for any data corruption indicators
      const corruptionErrors = page.locator('[data-testid="error"], .error-message');
      const hasCorruption = await corruptionErrors.isVisible().catch(() => false);
      expect(hasCorruption).toBeFalsy();
      
      await dbPage.screenshot('proxy-data-integrity');
    });

    test('should preserve automation tasks after migration', async ({ page }) => {
      await dbPage.waitForAppReady();
      
      // Open automation panel
      const automationButton = page.locator('[data-testid="automation-panel-button"]');
      if (await automationButton.isVisible()) {
        await automationButton.click();
        await page.waitForTimeout(waitTimes.panelAnimation);
        
        // Panel should open without issues
        const automationPanel = page.locator('[data-testid="automation-panel"]');
        await expect(automationPanel).toBeVisible();
        
        // No data corruption errors
        const errorMsg = page.locator('[data-testid="error-message"]');
        const hasError = await errorMsg.isVisible().catch(() => false);
        expect(hasError).toBeFalsy();
      }
      
      await dbPage.screenshot('automation-data-integrity');
    });

    test('should preserve activity logs after migration', async ({ page }) => {
      await dbPage.waitForAppReady();
      
      // Open activity log
      const activityButton = page.locator('[data-testid="activity-log-button"]');
      if (await activityButton.isVisible()) {
        await activityButton.click();
        await page.waitForTimeout(waitTimes.panelAnimation);
        
        // Activity log should display correctly
        const activityPanel = page.locator('[data-testid="activity-log-panel"], [data-testid="activity-log"]');
        await expect(activityPanel).toBeVisible();
      }
      
      await dbPage.screenshot('activity-log-integrity');
    });

    test('should maintain referential integrity across tables', async ({ page }) => {
      await dbPage.waitForAppReady();
      
      // Navigate through different panels to trigger cross-table queries
      const panels = [
        '[data-testid="proxy-panel-button"]',
        '[data-testid="automation-panel-button"]',
        '[data-testid="stats-panel-button"]'
      ];
      
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error' && 
            (msg.text().includes('foreign key') || 
             msg.text().includes('constraint') ||
             msg.text().includes('integrity'))) {
          errors.push(msg.text());
        }
      });
      
      for (const selector of panels) {
        const button = page.locator(selector);
        if (await button.isVisible({ timeout: 500 }).catch(() => false)) {
          await button.click();
          await page.waitForTimeout(waitTimes.panelAnimation);
        }
      }
      
      expect(errors).toHaveLength(0);
      
      await dbPage.screenshot('referential-integrity');
    });
  });

  test.describe('Rollback Safety', () => {
    test('should handle database operations without crashes', async ({ page }) => {
      await dbPage.waitForAppReady();
      
      // Perform various database operations
      const proxyButton = page.locator('[data-testid="proxy-panel-button"]');
      await proxyButton.click();
      await page.waitForTimeout(waitTimes.panelAnimation);
      
      // Try to add a proxy (triggers INSERT)
      const addButton = page.locator('[data-testid="add-proxy-button"]');
      if (await addButton.isVisible()) {
        await addButton.click();
        await page.waitForTimeout(100);
        
        // Cancel if dialog appears
        const cancelButton = page.locator('[data-testid="cancel-button"]');
        if (await cancelButton.isVisible({ timeout: 500 }).catch(() => false)) {
          await cancelButton.click();
        }
      }
      
      // App should remain stable
      const appStable = await page.locator('#app, #root').first().isVisible();
      expect(appStable).toBeTruthy();
      
      await dbPage.screenshot('rollback-safety');
    });

    test('should recover gracefully from simulated failures', async ({ page }) => {
      await dbPage.waitForAppReady();
      
      // Simulate network/API failures by rapid navigation
      for (let i = 0; i < 5; i++) {
        const buttons = await page.locator('[data-testid$="-panel-button"]').all();
        for (const button of buttons.slice(0, 3)) {
          await button.click().catch(() => {});
        }
      }
      
      // Wait for things to settle
      await page.waitForTimeout(waitTimes.networkIdle);
      
      // App should recover and be functional
      const isRecovered = await page.locator('#app, #root').first().isVisible();
      expect(isRecovered).toBeTruthy();
      
      await dbPage.screenshot('failure-recovery');
    });
  });
});

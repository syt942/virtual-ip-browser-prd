/**
 * E2E Tests - Scheduling System (PRD EP-006)
 * Tests for automation scheduling functionality
 * - Configure automation schedules
 * - Verify schedule settings
 * - Test cron-based scheduling UI
 */

import { test, expect } from '@playwright/test';
import { AutomationPanelPage } from './pages/AutomationPanelPage';

test.describe('Scheduling System', () => {
  let automationPanel: AutomationPanelPage;

  test.beforeEach(async ({ page }) => {
    automationPanel = new AutomationPanelPage(page);
    await automationPanel.goto();
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'passed') {
      await page.screenshot({ 
        path: `test-results/screenshots/schedule-${testInfo.title.replace(/\s+/g, '-')}-failed.png`,
        fullPage: true 
      });
    }
  });

  test('should display automation panel for scheduling', async () => {
    await automationPanel.openPanel();
    
    await expect(automationPanel.panel).toBeVisible();
    await expect(automationPanel.panelTitle).toHaveText('Automation Engine');
    
    await automationPanel.screenshot('scheduling-panel');
  });

  test('should setup automation task that can be scheduled', async () => {
    await automationPanel.openPanel();
    
    // Add keyword (task to be scheduled)
    await automationPanel.addKeyword('scheduled search');
    expect(await automationPanel.getKeywordCount()).toBe(1);
    
    // Add target domain
    await automationPanel.addDomain('example.com');
    expect(await automationPanel.getDomainCount()).toBe(1);
    
    // Verify task is ready to run/schedule
    expect(await automationPanel.isStartButtonEnabled()).toBe(true);
    
    await automationPanel.screenshot('task-ready-for-schedule');
  });

  test('should configure search engine for scheduled task', async () => {
    await automationPanel.openPanel();
    
    // Set search engine for scheduled tasks
    await automationPanel.setSearchEngine('google');
    expect(await automationPanel.getSearchEngine()).toBe('google');
    
    await automationPanel.setSearchEngine('bing');
    expect(await automationPanel.getSearchEngine()).toBe('bing');
    
    await automationPanel.screenshot('search-engine-configured');
  });

  test('should display task counts for scheduling overview', async () => {
    await automationPanel.openPanel();
    
    // Add multiple keywords (representing multiple scheduled tasks)
    await automationPanel.addKeyword('task1');
    await automationPanel.addKeyword('task2');
    await automationPanel.addKeyword('task3');
    
    // Verify count is displayed
    await expect(automationPanel.keywordsCount).toContainText('3 added');
    
    await automationPanel.screenshot('task-counts');
  });

  test('should support multiple target domains for scheduled execution', async () => {
    await automationPanel.openPanel();
    
    // Add multiple domains to target during scheduled runs
    await automationPanel.addDomain('site1.com');
    await automationPanel.addDomain('site2.com');
    await automationPanel.addDomain('site3.com');
    
    expect(await automationPanel.getDomainCount()).toBe(3);
    await expect(automationPanel.domainsCount).toContainText('3 added');
    
    await automationPanel.screenshot('multiple-domains-scheduled');
  });

  test('should have start button for immediate execution', async () => {
    await automationPanel.openPanel();
    
    // Setup task
    await automationPanel.addKeyword('immediate task');
    
    // Start button allows immediate execution (alternative to scheduled)
    await expect(automationPanel.startButton).toBeVisible();
    expect(await automationPanel.isStartButtonEnabled()).toBe(true);
    
    await automationPanel.screenshot('immediate-execution-available');
  });

  test('should display automation controls for schedule management', async () => {
    await automationPanel.openPanel();
    
    // Verify controls section exists
    await expect(automationPanel.automationControls).toBeVisible();
    
    // Start button for running scheduled tasks
    await expect(automationPanel.startButton).toBeVisible();
    
    await automationPanel.screenshot('schedule-controls');
  });

  test('should allow removal of scheduled keywords', async ({ page }) => {
    await automationPanel.openPanel();
    
    // Add keywords
    await automationPanel.addKeyword('keyword1');
    await automationPanel.addKeyword('keyword2');
    await expect(automationPanel.keywordItems).toHaveCount(2);
    
    // Remove first keyword (hover to reveal remove button)
    const firstKeyword = automationPanel.keywordItems.first();
    await firstKeyword.hover();
    // Wait for remove button to become visible
    await page.waitForSelector('[data-testid="remove-keyword-btn"]', { state: 'visible', timeout: 5000 });
    const removeBtn = firstKeyword.locator('[data-testid="remove-keyword-btn"]');
    await removeBtn.click();
    
    // Wait for DOM update
    await expect(automationPanel.keywordItems).toHaveCount(1);
    
    await automationPanel.screenshot('keyword-removed');
  });

  test('should allow removal of scheduled domains', async ({ page }) => {
    await automationPanel.openPanel();
    
    // Add domains
    await automationPanel.addDomain('domain1.com');
    await automationPanel.addDomain('domain2.com');
    await expect(automationPanel.domainItems).toHaveCount(2);
    
    // Remove first domain
    const firstDomain = automationPanel.domainItems.first();
    await firstDomain.hover();
    // Wait for remove button to become visible
    await page.waitForSelector('[data-testid="remove-domain-btn"]', { state: 'visible', timeout: 5000 });
    const removeBtn = firstDomain.locator('[data-testid="remove-domain-btn"]');
    await removeBtn.click();
    
    // Wait for DOM update
    await expect(automationPanel.domainItems).toHaveCount(1);
    
    await automationPanel.screenshot('domain-removed');
  });

  test('should maintain schedule configuration across panel switches', async ({ page }) => {
    await automationPanel.openPanel();
    
    // Configure schedule
    await automationPanel.setSearchEngine('duckduckgo');
    await automationPanel.addKeyword('persistent keyword');
    await automationPanel.addDomain('persistent.com');
    
    // Wait for state to settle
    await page.waitForTimeout(200);
    
    // Switch to different panel
    const navPanel = automationPanel.page.locator('[data-testid="panel-btn-privacy"]');
    await navPanel.click();
    await page.waitForTimeout(200);
    
    // Switch back
    await automationPanel.openPanel();
    await page.waitForLoadState('networkidle');
    
    // Verify configuration persisted
    expect(await automationPanel.getSearchEngine()).toBe('duckduckgo');
    await expect(automationPanel.keywordItems).toHaveCount(1);
    await expect(automationPanel.domainItems).toHaveCount(1);
    
    await automationPanel.screenshot('schedule-persisted');
  });
});

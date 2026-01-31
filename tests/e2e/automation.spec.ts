/**
 * E2E Tests - Automation
 * Tests for automation panel functionality using Page Object Model
 */

import { test, expect } from '@playwright/test';
import { AutomationPanelPage } from './pages/AutomationPanelPage';

test.describe('Automation', () => {
  let automationPanel: AutomationPanelPage;

  test.beforeEach(async ({ page }) => {
    automationPanel = new AutomationPanelPage(page);
    await automationPanel.goto();
  });

  test.afterEach(async ({ page }, testInfo) => {
    // Capture screenshot on failure
    if (testInfo.status !== 'passed') {
      await page.screenshot({ 
        path: `test-results/screenshots/automation-${testInfo.title.replace(/\s+/g, '-')}-failed.png`,
        fullPage: true 
      });
    }
  });

  test('should display automation panel', { tag: '@smoke' }, async () => {
    await automationPanel.openPanel();
    await expect(automationPanel.panelTitle).toHaveText('Automation Engine');
  });

  test('should show search engine selector with all options', async () => {
    await automationPanel.openPanel();
    
    await expect(automationPanel.searchEngineSelect).toBeVisible();
    
    // Verify all search engines are available
    const options = await automationPanel.verifySearchEngineOptions();
    expect(options).toContain('Google');
    expect(options).toContain('Bing');
    expect(options).toContain('DuckDuckGo');
    expect(options).toContain('Yahoo');
    expect(options).toContain('Brave');
  });

  test('should add keyword using button', async () => {
    await automationPanel.openPanel();
    
    // Add keyword
    await automationPanel.addKeyword('test keyword');
    
    // Keyword should appear in list
    const count = await automationPanel.getKeywordCount();
    expect(count).toBeGreaterThan(0);
    
    // Verify keyword is visible
    await expect(automationPanel.keywordItems.first()).toContainText('test keyword');
  });

  test('should add keyword using Enter key', async () => {
    await automationPanel.openPanel();
    
    // Add keyword with Enter
    await automationPanel.addKeywordWithEnter('enter keyword');
    
    // Keyword should appear in list
    const count = await automationPanel.getKeywordCount();
    expect(count).toBeGreaterThan(0);
    
    await expect(automationPanel.keywordItems.first()).toContainText('enter keyword');
  });

  test('should add target domain using button', async () => {
    await automationPanel.openPanel();
    
    // Add domain
    await automationPanel.addDomain('example.com');
    
    // Domain should appear in list
    const count = await automationPanel.getDomainCount();
    expect(count).toBeGreaterThan(0);
    
    // Verify domain is visible
    await expect(automationPanel.domainItems.first()).toContainText('example.com');
  });

  test('should add target domain using Enter key', async () => {
    await automationPanel.openPanel();
    
    // Add domain with Enter
    await automationPanel.addDomainWithEnter('test.com');
    
    // Domain should appear in list
    const count = await automationPanel.getDomainCount();
    expect(count).toBeGreaterThan(0);
    
    await expect(automationPanel.domainItems.first()).toContainText('test.com');
  });

  test('should show start button', async () => {
    await automationPanel.openPanel();
    
    await expect(automationPanel.startButton).toBeVisible();
    await expect(automationPanel.startButton).toContainText('Start');
  });

  test('should disable start button when no keywords', async () => {
    await automationPanel.openPanel();
    
    // Start button should be disabled when no keywords
    const isEnabled = await automationPanel.isStartButtonEnabled();
    expect(isEnabled).toBe(false);
  });

  test('should enable start button when keywords added', async () => {
    await automationPanel.openPanel();
    
    // Add a keyword
    await automationPanel.addKeyword('test keyword');
    
    // Start button should be enabled
    const isEnabled = await automationPanel.isStartButtonEnabled();
    expect(isEnabled).toBe(true);
  });

  test('should change search engine', async () => {
    await automationPanel.openPanel();
    
    // Change to Bing
    await automationPanel.setSearchEngine('bing');
    expect(await automationPanel.getSearchEngine()).toBe('bing');
    
    // Change to DuckDuckGo
    await automationPanel.setSearchEngine('duckduckgo');
    expect(await automationPanel.getSearchEngine()).toBe('duckduckgo');
  });

  test('should display keyword count', async () => {
    await automationPanel.openPanel();
    
    await expect(automationPanel.keywordsCount).toBeVisible();
    await expect(automationPanel.keywordsCount).toContainText('0 added');
    
    // Add keyword
    await automationPanel.addKeyword('keyword1');
    await expect(automationPanel.keywordsCount).toContainText('1 added');
    
    // Add another keyword
    await automationPanel.addKeyword('keyword2');
    await expect(automationPanel.keywordsCount).toContainText('2 added');
  });

  test('should display domain count', async () => {
    await automationPanel.openPanel();
    
    await expect(automationPanel.domainsCount).toBeVisible();
    await expect(automationPanel.domainsCount).toContainText('0 added');
    
    // Add domain
    await automationPanel.addDomain('example.com');
    await expect(automationPanel.domainsCount).toContainText('1 added');
  });
});

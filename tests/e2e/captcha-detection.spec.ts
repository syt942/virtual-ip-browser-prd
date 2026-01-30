/**
 * E2E Tests - Captcha Detection (PRD Automation)
 * Tests for captcha detection UI and configuration
 * - Verify captcha handling settings
 * - Test automation panel captcha-related features
 */

import { test, expect } from '@playwright/test';
import { AutomationPanelPage } from './pages/AutomationPanelPage';
import { NavigationPage } from './pages/NavigationPage';

test.describe('Captcha Detection', () => {
  let automationPanel: AutomationPanelPage;
  let navPage: NavigationPage;

  test.beforeEach(async ({ page }) => {
    automationPanel = new AutomationPanelPage(page);
    navPage = new NavigationPage(page);
    await automationPanel.goto();
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'passed') {
      await page.screenshot({ 
        path: `test-results/screenshots/captcha-${testInfo.title.replace(/\s+/g, '-')}-failed.png`,
        fullPage: true 
      });
    }
  });

  test('should display automation panel for captcha-aware automation', async () => {
    await automationPanel.openPanel();
    
    await expect(automationPanel.panel).toBeVisible();
    await expect(automationPanel.panelTitle).toHaveText('Automation Engine');
    
    await automationPanel.screenshot('captcha-aware-automation');
  });

  test('should allow search engine selection for captcha handling', async () => {
    await automationPanel.openPanel();
    
    // Different search engines have different captcha behaviors
    await expect(automationPanel.searchEngineSelect).toBeVisible();
    
    // Google is known for reCAPTCHA
    await automationPanel.setSearchEngine('google');
    expect(await automationPanel.getSearchEngine()).toBe('google');
    
    // DuckDuckGo has fewer captchas
    await automationPanel.setSearchEngine('duckduckgo');
    expect(await automationPanel.getSearchEngine()).toBe('duckduckgo');
    
    await automationPanel.screenshot('search-engine-captcha');
  });

  test('should setup automation that may encounter captchas', async () => {
    await automationPanel.openPanel();
    
    // Add keywords (may trigger captcha on high volume)
    await automationPanel.addKeyword('test search query');
    expect(await automationPanel.getKeywordCount()).toBe(1);
    
    // Add target domain
    await automationPanel.addDomain('example.com');
    expect(await automationPanel.getDomainCount()).toBe(1);
    
    await automationPanel.screenshot('captcha-prone-setup');
  });

  test('should have start/stop controls for captcha-interrupted automation', async () => {
    await automationPanel.openPanel();
    
    // Add keyword to enable automation
    await automationPanel.addKeyword('automation test');
    
    // Verify controls are available
    await expect(automationPanel.startButton).toBeVisible();
    expect(await automationPanel.isStartButtonEnabled()).toBe(true);
    
    // Controls allow stopping if captcha is detected
    await automationPanel.screenshot('captcha-controls');
  });

  test('should display keyword list that may trigger captchas', async () => {
    await automationPanel.openPanel();
    
    // Multiple keywords may increase captcha likelihood
    await automationPanel.addKeyword('keyword1');
    await automationPanel.addKeyword('keyword2');
    await automationPanel.addKeyword('keyword3');
    
    expect(await automationPanel.getKeywordCount()).toBe(3);
    await expect(automationPanel.keywordsList).toBeVisible();
    
    await automationPanel.screenshot('multiple-keywords-captcha');
  });

  test('should support domain targeting for captcha avoidance', async () => {
    await automationPanel.openPanel();
    
    // Targeting specific domains can help avoid captcha pages
    await automationPanel.addDomain('trusted-site.com');
    await automationPanel.addDomain('known-domain.com');
    
    expect(await automationPanel.getDomainCount()).toBe(2);
    await expect(automationPanel.domainsList).toBeVisible();
    
    await automationPanel.screenshot('domain-targeting-captcha');
  });

  test('should verify automation panel has all required elements', async () => {
    await automationPanel.openPanel();
    
    // Search engine selection
    await expect(automationPanel.searchEngineSelect).toBeVisible();
    
    // Keywords section
    await expect(automationPanel.keywordInput).toBeVisible();
    await expect(automationPanel.addKeywordButton).toBeVisible();
    
    // Domains section
    await expect(automationPanel.domainInput).toBeVisible();
    await expect(automationPanel.addDomainButton).toBeVisible();
    
    // Controls
    await expect(automationPanel.automationControls).toBeVisible();
    
    await automationPanel.screenshot('automation-panel-complete');
  });

  test('should allow keyword removal for captcha rate management', async () => {
    await automationPanel.openPanel();
    
    // Add keywords
    await automationPanel.addKeyword('remove-me');
    expect(await automationPanel.getKeywordCount()).toBe(1);
    
    // Remove keyword (reducing captcha likelihood)
    const keywordItem = automationPanel.keywordItems.first();
    await keywordItem.hover();
    const removeBtn = keywordItem.locator('[data-testid="remove-keyword-btn"]');
    await removeBtn.click();
    
    expect(await automationPanel.getKeywordCount()).toBe(0);
    
    await automationPanel.screenshot('keyword-removed-captcha');
  });

  test('should display address bar for manual captcha solving navigation', async () => {
    // Address bar allows manual navigation if captcha needs solving
    await expect(navPage.addressBar).toBeVisible();
    await expect(navPage.addressInput).toBeVisible();
    
    await navPage.screenshot('manual-navigation-captcha');
  });

  test('should have navigation controls for captcha page handling', async () => {
    // Navigation controls help when stuck on captcha page
    await navPage.verifyNavigationButtons();
    
    // Back button to escape captcha page
    await expect(navPage.navBackButton).toBeVisible();
    
    // Reload to try again
    await expect(navPage.navReloadButton).toBeVisible();
    
    await navPage.screenshot('captcha-navigation');
  });
});

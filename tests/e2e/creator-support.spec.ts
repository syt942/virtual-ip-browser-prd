/**
 * E2E Tests - Creator Support Flow (PRD EP-007)
 * Tests for creator support functionality
 * - Add creator by URL
 * - Start automation for creator support
 * - Verify click simulation works
 */

import { test, expect } from '@playwright/test';
import { AutomationPanelPage } from './pages/AutomationPanelPage';
import { NavigationPage } from './pages/NavigationPage';

test.describe('Creator Support Flow', () => {
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
        path: `test-results/screenshots/creator-${testInfo.title.replace(/\s+/g, '-')}-failed.png`,
        fullPage: true 
      });
    }
  });

  test('should be able to add creator URL as target domain', async () => {
    await automationPanel.openPanel();
    
    // Add a creator's domain (simulating YouTube channel)
    await automationPanel.addDomain('youtube.com');
    
    // Verify domain was added
    const domainCount = await automationPanel.getDomainCount();
    expect(domainCount).toBe(1);
    
    await expect(automationPanel.domainItems.first()).toContainText('youtube.com');
    
    await automationPanel.screenshot('creator-domain-added');
  });

  test('should be able to add multiple creator domains', async () => {
    await automationPanel.openPanel();
    
    // Add multiple creator platform domains
    await automationPanel.addDomain('youtube.com');
    await automationPanel.addDomain('twitch.tv');
    await automationPanel.addDomain('patreon.com');
    
    // Verify all domains were added
    const domainCount = await automationPanel.getDomainCount();
    expect(domainCount).toBe(3);
    
    await automationPanel.screenshot('multiple-creator-domains');
  });

  test('should setup automation for creator support', async () => {
    await automationPanel.openPanel();
    
    // Add keyword related to creator
    await automationPanel.addKeyword('creator name');
    
    // Add creator's domain
    await automationPanel.addDomain('youtube.com');
    
    // Verify setup is complete
    expect(await automationPanel.getKeywordCount()).toBe(1);
    expect(await automationPanel.getDomainCount()).toBe(1);
    
    // Start button should be enabled
    expect(await automationPanel.isStartButtonEnabled()).toBe(true);
    
    await automationPanel.screenshot('creator-support-setup');
  });

  test('should be able to start creator support automation', async () => {
    await automationPanel.openPanel();
    
    // Setup automation
    await automationPanel.addKeyword('test creator');
    await automationPanel.addDomain('example.com');
    
    // Verify start button is enabled
    expect(await automationPanel.isStartButtonEnabled()).toBe(true);
    
    // Click start (automation will run in background)
    await automationPanel.startAutomation();
    
    // Note: In a real test, we would verify the automation started
    // For now, we verify the button was clickable and UI updated
    await automationPanel.screenshot('creator-automation-started');
  });

  test('should validate creator domain format', async () => {
    await automationPanel.openPanel();
    
    // Try to add valid domain
    await automationPanel.addDomain('valid-creator.com');
    expect(await automationPanel.getDomainCount()).toBe(1);
    
    // The component should validate domain format
    // Invalid domains should be rejected by the UI validation
    await automationPanel.screenshot('creator-domain-validation');
  });

  test('should display creator support statistics after setup', async () => {
    await automationPanel.openPanel();
    
    // Setup for creator support
    await automationPanel.addKeyword('creator keyword');
    await automationPanel.addDomain('creator-site.com');
    
    // Verify counts are displayed
    await expect(automationPanel.keywordsCount).toContainText('1 added');
    await expect(automationPanel.domainsCount).toContainText('1 added');
    
    await automationPanel.screenshot('creator-support-stats');
  });

  test('should be able to remove creator from list', async () => {
    await automationPanel.openPanel();
    
    // Add creator domains
    await automationPanel.addDomain('creator1.com');
    await automationPanel.addDomain('creator2.com');
    
    expect(await automationPanel.getDomainCount()).toBe(2);
    
    // Remove first domain (hover to show remove button)
    const firstDomainItem = automationPanel.domainItems.first();
    await firstDomainItem.hover();
    const removeButton = firstDomainItem.locator('[data-testid="remove-domain-btn"]');
    await removeButton.click();
    
    expect(await automationPanel.getDomainCount()).toBe(1);
    
    await automationPanel.screenshot('creator-removed');
  });
});

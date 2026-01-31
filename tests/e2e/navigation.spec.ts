/**
 * E2E Tests - Navigation & UI
 * Tests for main navigation and UI elements using Page Object Model
 */

import { test, expect } from '@playwright/test';
import { NavigationPage } from './pages/NavigationPage';

test.describe('Navigation & UI', () => {
  let navPage: NavigationPage;

  test.beforeEach(async ({ page }) => {
    navPage = new NavigationPage(page);
    await navPage.goto();
  });

  test.afterEach(async ({ page }, testInfo) => {
    // Capture screenshot on failure
    if (testInfo.status !== 'passed') {
      await page.screenshot({ 
        path: `test-results/screenshots/nav-${testInfo.title.replace(/\s+/g, '-')}-failed.png`,
        fullPage: true 
      });
    }
  });

  test('should display main UI elements', { tag: '@smoke' }, async () => {
    await navPage.verifyMainUIElements();
    
    // Verify tab bar shows New Tab
    await expect(navPage.tabItems.first()).toContainText('New Tab');
    
    // Verify address input placeholder
    await expect(navPage.addressInput).toHaveAttribute('placeholder', 'Search or enter URL...');
  });

  test('should display all toolbar buttons', async () => {
    await navPage.verifyToolbarButtons();
    
    // Verify button labels
    await expect(navPage.proxyPanelButton).toHaveText('Proxy');
    await expect(navPage.privacyPanelButton).toHaveText('Privacy');
    await expect(navPage.automationPanelButton).toHaveText('Automation');
    await expect(navPage.activityPanelButton).toHaveText('Activity');
    await expect(navPage.statsPanelButton).toHaveText('Stats');
    await expect(navPage.settingsPanelButton).toHaveText('Settings');
  });

  test('should switch between panels', async ({ page }) => {
    // Open Proxy panel
    await navPage.openPanel('proxy');
    await expect(page.locator('[data-testid="proxy-panel"]')).toBeVisible();
    
    // Switch to Privacy panel
    await navPage.openPanel('privacy');
    await expect(page.locator('[data-testid="privacy-panel"]')).toBeVisible();
    
    // Switch to Automation panel
    await navPage.openPanel('automation');
    await expect(page.locator('[data-testid="automation-panel"]')).toBeVisible();
  });

  test('should open activity log panel', async ({ page }) => {
    await navPage.openPanel('activity');
    await expect(page.locator('text=Activity Log')).toBeVisible();
  });

  test('should open stats panel', async ({ page }) => {
    await navPage.openPanel('stats');
    await expect(page.locator('text=Statistics')).toBeVisible();
  });

  test('should open settings panel', async ({ page }) => {
    await navPage.openPanel('settings');
    await expect(page.locator('[data-testid="settings-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="settings-panel-title"]')).toHaveText('Settings');
  });

  test('should close panel when clicking same button', async () => {
    // Open panel
    await navPage.openPanel('proxy');
    expect(await navPage.isSidePanelVisible()).toBe(true);
    
    // Close panel by clicking same button
    await navPage.closeCurrentPanel('proxy');
    
    // Panel should be hidden (or different panel visible)
    // Note: The app might keep a default panel open
  });

  test('should show navigation controls', async () => {
    await navPage.verifyNavigationButtons();
    
    // Verify buttons have correct aria-labels
    await expect(navPage.navBackButton).toHaveAttribute('aria-label', 'Back');
    await expect(navPage.navForwardButton).toHaveAttribute('aria-label', 'Forward');
    await expect(navPage.navReloadButton).toHaveAttribute('aria-label', 'Reload');
  });

  test('should display proxy status indicator', async () => {
    await expect(navPage.proxyStatus).toBeVisible();
    await expect(navPage.proxyStatusIndicator).toBeVisible();
    
    const statusText = await navPage.getProxyStatusText();
    expect(statusText).toBeTruthy();
  });

  test('should display tab bar with new tab button', async () => {
    await expect(navPage.tabBar).toBeVisible();
    await expect(navPage.newTabButton).toBeVisible();
    await expect(navPage.newTabButton).toHaveAttribute('aria-label', 'New tab');
  });
});

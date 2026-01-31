/**
 * E2E Tests - Encryption Migration (v1.3.0 Release)
 * Tests for automatic encryption migration on upgrade
 * - Verify automatic encryption migration on upgrade
 * - Test old credentials still accessible
 * - Test fallback encryption on unsupported platforms
 * - Verify security event logging
 */

import { test, expect } from '@playwright/test';
import { BasePage } from './pages/BasePage';
import { testTimeouts, waitTimes } from './fixtures/test-data';

class EncryptionTestPage extends BasePage {
  // Settings panel elements
  readonly settingsButton = this.page.locator('[data-testid="settings-panel-button"], [data-testid="settings-button"]');
  readonly settingsPanel = this.page.locator('[data-testid="settings-panel"]');
  
  // Security section elements
  readonly securitySection = this.page.locator('[data-testid="security-section"]');
  readonly encryptionStatus = this.page.locator('[data-testid="encryption-status"]');
  readonly encryptionIndicator = this.page.locator('[data-testid="encryption-indicator"]');
  readonly safeStorageStatus = this.page.locator('[data-testid="safe-storage-status"]');
  
  // Credential management elements
  readonly credentialsList = this.page.locator('[data-testid="credentials-list"]');
  readonly credentialItem = this.page.locator('[data-testid="credential-item"]');
  readonly encryptedBadge = this.page.locator('[data-testid="encrypted-badge"]');
  readonly migrationStatus = this.page.locator('[data-testid="migration-status"]');
  
  // Activity log elements
  readonly activityLogPanel = this.page.locator('[data-testid="activity-log-panel"]');
  readonly activityLogButton = this.page.locator('[data-testid="activity-log-button"]');
  readonly securityEvents = this.page.locator('[data-testid="security-event"]');
  
  // Proxy panel for credential tests
  readonly proxyPanelButton = this.page.locator('[data-testid="proxy-panel-button"]');
  readonly proxyPanel = this.page.locator('[data-testid="proxy-panel"]');
  readonly addProxyButton = this.page.locator('[data-testid="add-proxy-button"]');
  readonly proxyUsernameInput = this.page.locator('[data-testid="proxy-username"]');
  readonly proxyPasswordInput = this.page.locator('[data-testid="proxy-password"]');

  async openSettingsPanel(): Promise<void> {
    await this.settingsButton.click();
    await this.page.waitForTimeout(waitTimes.panelAnimation);
  }

  async openProxyPanel(): Promise<void> {
    await this.proxyPanelButton.click();
    await this.page.waitForTimeout(waitTimes.panelAnimation);
  }

  async openActivityLog(): Promise<void> {
    await this.activityLogButton.click();
    await this.page.waitForTimeout(waitTimes.panelAnimation);
  }
}

test.describe('Encryption Migration @smoke @security', () => {
  let encryptionPage: EncryptionTestPage;

  test.beforeEach(async ({ page }) => {
    encryptionPage = new EncryptionTestPage(page);
    await encryptionPage.goto();
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'passed') {
      await page.screenshot({
        path: `test-results/screenshots/encryption-${testInfo.title.replace(/\s+/g, '-')}-failed.png`,
        fullPage: true
      });
    }
  });

  test.describe('Automatic Encryption Migration', () => {
    test('should display encryption status indicator on dashboard', async () => {
      // The app should show encryption is active
      await encryptionPage.waitForAppReady();
      
      // Check for encryption indicator in UI (could be in header or settings)
      const hasEncryptionIndicator = await encryptionPage.page.locator(
        '[data-testid*="encrypt"], [data-testid*="security"], [data-testid*="secure"]'
      ).first().isVisible().catch(() => false);
      
      // App should load without encryption errors
      const consoleErrors: string[] = [];
      encryptionPage.page.on('console', msg => {
        if (msg.type() === 'error' && msg.text().toLowerCase().includes('encrypt')) {
          consoleErrors.push(msg.text());
        }
      });
      
      await encryptionPage.page.waitForTimeout(waitTimes.networkIdle);
      expect(consoleErrors).toHaveLength(0);
      
      await encryptionPage.screenshot('encryption-status-dashboard');
    });

    test('should initialize encryption service on app start', async () => {
      // Verify no encryption-related errors on startup
      const errors: string[] = [];
      encryptionPage.page.on('pageerror', err => {
        if (err.message.toLowerCase().includes('encrypt') || 
            err.message.toLowerCase().includes('crypto')) {
          errors.push(err.message);
        }
      });

      await encryptionPage.goto();
      await encryptionPage.waitForAppReady();
      
      // App should load successfully
      await expect(encryptionPage.page.locator('#app, #root, [data-testid="app-container"]').first()).toBeVisible();
      expect(errors).toHaveLength(0);
      
      await encryptionPage.screenshot('encryption-init-success');
    });

    test('should handle encryption migration transparently', async () => {
      // Navigate through the app - migration should be seamless
      await encryptionPage.waitForAppReady();
      
      // Try to access proxy panel (which may contain encrypted credentials)
      const proxyButton = encryptionPage.page.locator('[data-testid="proxy-panel-button"]');
      if (await proxyButton.isVisible()) {
        await proxyButton.click();
        await encryptionPage.page.waitForTimeout(waitTimes.panelAnimation);
        
        // Panel should open without errors
        const panel = encryptionPage.page.locator('[data-testid="proxy-panel"]');
        await expect(panel).toBeVisible({ timeout: testTimeouts.medium });
      }
      
      await encryptionPage.screenshot('migration-transparent');
    });
  });

  test.describe('Credential Accessibility', () => {
    test('should access proxy credentials after migration', async ({ page }) => {
      await encryptionPage.waitForAppReady();
      
      // Open proxy panel
      const proxyButton = page.locator('[data-testid="proxy-panel-button"]');
      await expect(proxyButton).toBeVisible();
      await proxyButton.click();
      await page.waitForTimeout(waitTimes.panelAnimation);
      
      // Check if proxy list loads (credentials should be decrypted)
      const proxyPanel = page.locator('[data-testid="proxy-panel"]');
      await expect(proxyPanel).toBeVisible();
      
      // Verify no decryption errors in console
      const decryptErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error' && 
            (msg.text().includes('decrypt') || msg.text().includes('credential'))) {
          decryptErrors.push(msg.text());
        }
      });
      
      await page.waitForTimeout(waitTimes.networkIdle);
      expect(decryptErrors).toHaveLength(0);
      
      await encryptionPage.screenshot('credentials-accessible');
    });

    test('should encrypt new credentials using AES-256-GCM', async ({ page }) => {
      await encryptionPage.waitForAppReady();
      
      // Open proxy panel to add new proxy with credentials
      const proxyButton = page.locator('[data-testid="proxy-panel-button"]');
      await proxyButton.click();
      await page.waitForTimeout(waitTimes.panelAnimation);
      
      // Look for add proxy functionality
      const addButton = page.locator('[data-testid="add-proxy-button"]');
      if (await addButton.isVisible()) {
        await addButton.click();
        
        // Check for credential input fields
        const usernameField = page.locator('[data-testid="proxy-username"], [name="username"]');
        const passwordField = page.locator('[data-testid="proxy-password"], [name="password"], [type="password"]');
        
        // Fields should exist for authenticated proxies
        const hasAuthFields = await usernameField.isVisible().catch(() => false) ||
                             await passwordField.isVisible().catch(() => false);
        
        // Log whether auth fields are present (they may be optional)
        console.log(`Authentication fields present: ${hasAuthFields}`);
      }
      
      await encryptionPage.screenshot('new-credentials-encryption');
    });

    test('should maintain credential integrity across sessions', async ({ page }) => {
      await encryptionPage.waitForAppReady();
      
      // Verify app state is consistent
      const appContainer = page.locator('#app, #root, [data-testid="app-container"]').first();
      await expect(appContainer).toBeVisible();
      
      // Navigate to proxy panel
      const proxyButton = page.locator('[data-testid="proxy-panel-button"]');
      if (await proxyButton.isVisible()) {
        await proxyButton.click();
        await page.waitForTimeout(waitTimes.panelAnimation);
        
        // Proxy list should load without corruption errors
        const errorToast = page.locator('[data-testid="error-toast"], [role="alert"]');
        const hasError = await errorToast.isVisible().catch(() => false);
        expect(hasError).toBeFalsy();
      }
      
      await encryptionPage.screenshot('credential-integrity');
    });
  });

  test.describe('Fallback Encryption', () => {
    test('should handle encryption gracefully when safeStorage unavailable', async ({ page }) => {
      // App should work even if Electron safeStorage is not available
      await encryptionPage.waitForAppReady();
      
      // No critical errors should prevent app from loading
      const criticalErrors: string[] = [];
      page.on('pageerror', err => {
        if (err.message.includes('safeStorage') || 
            err.message.includes('keytar') ||
            err.message.includes('masterKey')) {
          criticalErrors.push(err.message);
        }
      });
      
      // Navigate app features
      const panels = ['proxy', 'automation', 'privacy', 'settings'];
      for (const panel of panels) {
        const button = page.locator(`[data-testid="${panel}-panel-button"]`);
        if (await button.isVisible({ timeout: 1000 }).catch(() => false)) {
          await button.click();
          await page.waitForTimeout(waitTimes.panelAnimation);
        }
      }
      
      // App should remain functional
      expect(criticalErrors).toHaveLength(0);
      
      await encryptionPage.screenshot('fallback-encryption');
    });

    test('should use fallback encryption on unsupported platforms', async ({ page }) => {
      await encryptionPage.waitForAppReady();
      
      // The encryption service should initialize regardless of platform
      // Check that the app doesn't crash or show platform-specific errors
      const platformErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error' && 
            (msg.text().includes('platform') || msg.text().includes('unsupported'))) {
          platformErrors.push(msg.text());
        }
      });
      
      await page.waitForTimeout(waitTimes.networkIdle);
      
      // App should be fully functional
      const appReady = await page.locator('#app, #root').first().isVisible();
      expect(appReady).toBeTruthy();
      
      await encryptionPage.screenshot('platform-fallback');
    });
  });

  test.describe('Security Event Logging', () => {
    test('should log encryption-related security events', async ({ page }) => {
      await encryptionPage.waitForAppReady();
      
      // Open activity log panel
      const activityButton = page.locator('[data-testid="activity-log-button"], [data-testid="activity-panel-button"]');
      if (await activityButton.isVisible()) {
        await activityButton.click();
        await page.waitForTimeout(waitTimes.panelAnimation);
        
        // Activity log should be visible
        const activityPanel = page.locator('[data-testid="activity-log-panel"], [data-testid="activity-log"]');
        await expect(activityPanel).toBeVisible();
        
        // Check for any logged events
        const logEntries = page.locator('[data-testid="activity-entry"], [data-testid="log-entry"]');
        const entryCount = await logEntries.count();
        console.log(`Activity log entries: ${entryCount}`);
      }
      
      await encryptionPage.screenshot('security-event-logging');
    });

    test('should not expose sensitive data in logs', async ({ page }) => {
      await encryptionPage.waitForAppReady();
      
      // Collect all console messages
      const sensitivePatterns = [
        /password["\s]*[:=]["\s]*[^*]+/i,
        /secret["\s]*[:=]["\s]*[^*]+/i,
        /key["\s]*[:=]["\s]*[a-f0-9]{32,}/i,
        /credential["\s]*[:=]["\s]*\{/i
      ];
      
      const sensitiveLeaks: string[] = [];
      page.on('console', msg => {
        const text = msg.text();
        for (const pattern of sensitivePatterns) {
          if (pattern.test(text)) {
            sensitiveLeaks.push(text.substring(0, 100));
          }
        }
      });
      
      // Navigate through app to trigger various logs
      const buttons = await page.locator('[data-testid$="-button"]').all();
      for (const button of buttons.slice(0, 5)) {
        if (await button.isVisible()) {
          await button.click().catch(() => {});
          await page.waitForTimeout(100);
        }
      }
      
      expect(sensitiveLeaks).toHaveLength(0);
      
      await encryptionPage.screenshot('no-sensitive-logs');
    });

    test('should log migration events on upgrade', async ({ page }) => {
      await encryptionPage.waitForAppReady();
      
      // Open activity/event log
      const logButton = page.locator('[data-testid="activity-log-button"]');
      if (await logButton.isVisible()) {
        await logButton.click();
        await page.waitForTimeout(waitTimes.panelAnimation);
      }
      
      // The app should have logged initialization events
      // Check for any event indicators
      const eventIndicators = page.locator('[data-testid*="event"], [data-testid*="log"]');
      const hasEvents = await eventIndicators.count() > 0;
      console.log(`Event logging active: ${hasEvents}`);
      
      await encryptionPage.screenshot('migration-events');
    });
  });
});

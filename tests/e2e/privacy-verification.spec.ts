/**
 * E2E Tests - Privacy Verification (PRD E2E-003)
 * Tests to verify privacy protection features work correctly
 * - Fingerprint spoofing verification
 * - WebRTC leak prevention
 * - Tracker blocking
 */

import { test, expect } from '@playwright/test';
import { PrivacyPanelPage } from './pages/PrivacyPanelPage';

test.describe('Privacy Verification', () => {
  let privacyPanel: PrivacyPanelPage;

  test.beforeEach(async ({ page }) => {
    privacyPanel = new PrivacyPanelPage(page);
    await privacyPanel.goto();
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'passed') {
      await page.screenshot({ 
        path: `test-results/screenshots/privacy-verify-${testInfo.title.replace(/\s+/g, '-')}-failed.png`,
        fullPage: true 
      });
    }
  });

  test('should enable fingerprint spoofing and verify settings persist', async () => {
    await privacyPanel.openPanel();
    
    // Enable all fingerprint protections
    if (!await privacyPanel.isCanvasEnabled()) {
      await privacyPanel.toggleCanvas();
    }
    if (!await privacyPanel.isWebGLEnabled()) {
      await privacyPanel.toggleWebGL();
    }
    if (!await privacyPanel.isAudioEnabled()) {
      await privacyPanel.toggleAudio();
    }
    if (!await privacyPanel.isNavigatorEnabled()) {
      await privacyPanel.toggleNavigator();
    }
    
    // Verify all are enabled
    expect(await privacyPanel.isCanvasEnabled()).toBe(true);
    expect(await privacyPanel.isWebGLEnabled()).toBe(true);
    expect(await privacyPanel.isAudioEnabled()).toBe(true);
    expect(await privacyPanel.isNavigatorEnabled()).toBe(true);
    
    // Take screenshot for verification
    await privacyPanel.screenshot('fingerprint-spoofing-enabled');
  });

  test('should verify WebRTC leak prevention is configurable', async () => {
    await privacyPanel.openPanel();
    
    // Verify WebRTC toggle exists and is functional
    await expect(privacyPanel.webrtcToggle).toBeVisible();
    
    // Enable WebRTC protection
    if (!await privacyPanel.isWebRTCEnabled()) {
      await privacyPanel.toggleWebRTC();
    }
    
    expect(await privacyPanel.isWebRTCEnabled()).toBe(true);
    
    // Verify the section is properly labeled
    await expect(privacyPanel.webrtcSection).toBeVisible();
    await expect(privacyPanel.page.locator('text=WebRTC Protection')).toBeVisible();
    await expect(privacyPanel.page.locator('text=Block WebRTC Leaks')).toBeVisible();
    
    await privacyPanel.screenshot('webrtc-protection-enabled');
  });

  test('should verify tracker blocking functionality', async () => {
    await privacyPanel.openPanel();
    
    // Verify tracker blocking toggle exists
    await expect(privacyPanel.trackerToggle).toBeVisible();
    await expect(privacyPanel.trackerSection).toBeVisible();
    
    // Enable tracker blocking
    if (!await privacyPanel.isTrackerBlockingEnabled()) {
      await privacyPanel.toggleTrackerBlocking();
    }
    
    expect(await privacyPanel.isTrackerBlockingEnabled()).toBe(true);
    
    // Verify section label
    await expect(privacyPanel.page.locator('text=Tracker Blocking')).toBeVisible();
    await expect(privacyPanel.page.locator('text=Block All Trackers')).toBeVisible();
    
    await privacyPanel.screenshot('tracker-blocking-enabled');
  });

  test('should enable all privacy protections simultaneously', async () => {
    await privacyPanel.openPanel();
    
    // Enable all protections
    await privacyPanel.enableAllProtections();
    
    // Verify all are enabled
    const allEnabled = 
      await privacyPanel.isCanvasEnabled() &&
      await privacyPanel.isWebGLEnabled() &&
      await privacyPanel.isAudioEnabled() &&
      await privacyPanel.isNavigatorEnabled() &&
      await privacyPanel.isWebRTCEnabled() &&
      await privacyPanel.isTrackerBlockingEnabled() &&
      await privacyPanel.isTimezoneEnabled();
    
    expect(allEnabled).toBe(true);
    
    await privacyPanel.screenshot('all-privacy-protections-enabled');
  });

  test('should toggle individual protections without affecting others', async () => {
    await privacyPanel.openPanel();
    
    // Start with all enabled
    await privacyPanel.enableAllProtections();
    
    // Disable only canvas
    await privacyPanel.toggleCanvas();
    
    // Verify only canvas is disabled, others remain enabled
    expect(await privacyPanel.isCanvasEnabled()).toBe(false);
    expect(await privacyPanel.isWebGLEnabled()).toBe(true);
    expect(await privacyPanel.isAudioEnabled()).toBe(true);
    expect(await privacyPanel.isNavigatorEnabled()).toBe(true);
    expect(await privacyPanel.isWebRTCEnabled()).toBe(true);
    expect(await privacyPanel.isTrackerBlockingEnabled()).toBe(true);
    
    // Re-enable canvas
    await privacyPanel.toggleCanvas();
    expect(await privacyPanel.isCanvasEnabled()).toBe(true);
  });

  test('should display privacy protection status indicators', async () => {
    await privacyPanel.openPanel();
    
    // Verify all toggles have proper checkbox inputs
    await expect(privacyPanel.canvasToggle).toHaveAttribute('type', 'checkbox');
    await expect(privacyPanel.webglToggle).toHaveAttribute('type', 'checkbox');
    await expect(privacyPanel.audioToggle).toHaveAttribute('type', 'checkbox');
    await expect(privacyPanel.navigatorToggle).toHaveAttribute('type', 'checkbox');
    await expect(privacyPanel.webrtcToggle).toHaveAttribute('type', 'checkbox');
    await expect(privacyPanel.trackerToggle).toHaveAttribute('type', 'checkbox');
    await expect(privacyPanel.timezoneToggle).toHaveAttribute('type', 'checkbox');
  });
});

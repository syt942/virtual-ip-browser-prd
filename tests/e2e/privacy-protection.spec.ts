/**
 * E2E Tests - Privacy Protection
 * Tests for privacy panel functionality using Page Object Model
 */

import { test, expect } from '@playwright/test';
import { PrivacyPanelPage } from './pages/PrivacyPanelPage';

test.describe('Privacy Protection', () => {
  let privacyPanel: PrivacyPanelPage;

  test.beforeEach(async ({ page }) => {
    privacyPanel = new PrivacyPanelPage(page);
    await privacyPanel.goto();
  });

  test.afterEach(async ({ page }, testInfo) => {
    // Capture screenshot on failure
    if (testInfo.status !== 'passed') {
      await page.screenshot({ 
        path: `test-results/screenshots/privacy-${testInfo.title.replace(/\s+/g, '-')}-failed.png`,
        fullPage: true 
      });
    }
  });

  test('should display privacy panel', async () => {
    await privacyPanel.openPanel();
    await expect(privacyPanel.panelTitle).toHaveText('Privacy Protection');
  });

  test('should show all privacy sections', async () => {
    await privacyPanel.openPanel();
    await privacyPanel.verifyAllSectionsVisible();
  });

  test('should toggle canvas fingerprint protection', async () => {
    await privacyPanel.openPanel();
    
    await expect(privacyPanel.canvasToggle).toBeVisible();
    
    const initialState = await privacyPanel.isCanvasEnabled();
    await privacyPanel.toggleCanvas();
    const newState = await privacyPanel.isCanvasEnabled();
    
    expect(newState).toBe(!initialState);
  });

  test('should toggle WebGL fingerprint protection', async () => {
    await privacyPanel.openPanel();
    
    await expect(privacyPanel.webglToggle).toBeVisible();
    
    const initialState = await privacyPanel.isWebGLEnabled();
    await privacyPanel.toggleWebGL();
    const newState = await privacyPanel.isWebGLEnabled();
    
    expect(newState).toBe(!initialState);
  });

  test('should toggle audio fingerprint protection', async () => {
    await privacyPanel.openPanel();
    
    await expect(privacyPanel.audioToggle).toBeVisible();
    
    const initialState = await privacyPanel.isAudioEnabled();
    await privacyPanel.toggleAudio();
    const newState = await privacyPanel.isAudioEnabled();
    
    expect(newState).toBe(!initialState);
  });

  test('should toggle navigator spoofing', async () => {
    await privacyPanel.openPanel();
    
    await expect(privacyPanel.navigatorToggle).toBeVisible();
    
    const initialState = await privacyPanel.isNavigatorEnabled();
    await privacyPanel.toggleNavigator();
    const newState = await privacyPanel.isNavigatorEnabled();
    
    expect(newState).toBe(!initialState);
  });

  test('should toggle WebRTC leak protection', async () => {
    await privacyPanel.openPanel();
    
    await expect(privacyPanel.webrtcToggle).toBeVisible();
    
    const initialState = await privacyPanel.isWebRTCEnabled();
    await privacyPanel.toggleWebRTC();
    const newState = await privacyPanel.isWebRTCEnabled();
    
    expect(newState).toBe(!initialState);
  });

  test('should toggle tracker blocking', async () => {
    await privacyPanel.openPanel();
    
    await expect(privacyPanel.trackerToggle).toBeVisible();
    
    const initialState = await privacyPanel.isTrackerBlockingEnabled();
    await privacyPanel.toggleTrackerBlocking();
    const newState = await privacyPanel.isTrackerBlockingEnabled();
    
    expect(newState).toBe(!initialState);
  });

  test('should toggle timezone spoofing', async () => {
    await privacyPanel.openPanel();
    
    await expect(privacyPanel.timezoneToggle).toBeVisible();
    
    const initialState = await privacyPanel.isTimezoneEnabled();
    await privacyPanel.toggleTimezone();
    const newState = await privacyPanel.isTimezoneEnabled();
    
    expect(newState).toBe(!initialState);
  });

  test('should show all fingerprint options', async () => {
    await privacyPanel.openPanel();
    
    // Verify labels are visible
    await expect(privacyPanel.page.locator('text=Canvas Fingerprint')).toBeVisible();
    await expect(privacyPanel.page.locator('text=WebGL Fingerprint')).toBeVisible();
    await expect(privacyPanel.page.locator('text=Audio Fingerprint')).toBeVisible();
    await expect(privacyPanel.page.locator('text=Navigator Spoofing')).toBeVisible();
  });

  test('should show WebRTC and tracker options', async () => {
    await privacyPanel.openPanel();
    
    await expect(privacyPanel.page.locator('text=Block WebRTC Leaks')).toBeVisible();
    await expect(privacyPanel.page.locator('text=Block All Trackers')).toBeVisible();
  });

  test('should show timezone spoofing option', async () => {
    await privacyPanel.openPanel();
    
    await expect(privacyPanel.page.locator('text=Enable Timezone Spoofing')).toBeVisible();
  });

  test('should be able to enable all protections', async () => {
    await privacyPanel.openPanel();
    
    await privacyPanel.enableAllProtections();
    
    // Verify all are enabled
    expect(await privacyPanel.isCanvasEnabled()).toBe(true);
    expect(await privacyPanel.isWebGLEnabled()).toBe(true);
    expect(await privacyPanel.isAudioEnabled()).toBe(true);
    expect(await privacyPanel.isNavigatorEnabled()).toBe(true);
    expect(await privacyPanel.isWebRTCEnabled()).toBe(true);
    expect(await privacyPanel.isTrackerBlockingEnabled()).toBe(true);
    expect(await privacyPanel.isTimezoneEnabled()).toBe(true);
  });

  test('should be able to disable all protections', async () => {
    await privacyPanel.openPanel();
    
    // First enable all
    await privacyPanel.enableAllProtections();
    
    // Then disable all
    await privacyPanel.disableAllProtections();
    
    // Verify all are disabled
    expect(await privacyPanel.isCanvasEnabled()).toBe(false);
    expect(await privacyPanel.isWebGLEnabled()).toBe(false);
    expect(await privacyPanel.isAudioEnabled()).toBe(false);
    expect(await privacyPanel.isNavigatorEnabled()).toBe(false);
    expect(await privacyPanel.isWebRTCEnabled()).toBe(false);
    expect(await privacyPanel.isTrackerBlockingEnabled()).toBe(false);
    expect(await privacyPanel.isTimezoneEnabled()).toBe(false);
  });
});

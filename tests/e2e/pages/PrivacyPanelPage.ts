/**
 * Privacy Panel Page Object
 * Encapsulates all interactions with the Privacy Protection panel
 */

import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class PrivacyPanelPage extends BasePage {
  // Panel elements
  readonly panelButton: Locator;
  readonly panel: Locator;
  readonly panelTitle: Locator;
  
  // Fingerprint toggles
  readonly canvasToggle: Locator;
  readonly webglToggle: Locator;
  readonly audioToggle: Locator;
  readonly navigatorToggle: Locator;
  
  // WebRTC protection
  readonly webrtcToggle: Locator;
  
  // Tracker blocking
  readonly trackerToggle: Locator;
  
  // Timezone spoofing
  readonly timezoneToggle: Locator;
  
  // Sections
  readonly fingerprintSection: Locator;
  readonly webrtcSection: Locator;
  readonly trackerSection: Locator;
  readonly timezoneSection: Locator;

  constructor(page: Page) {
    super(page);
    
    // Panel elements
    this.panelButton = page.locator('[data-testid="panel-btn-privacy"]');
    this.panel = page.locator('[data-testid="privacy-panel"]');
    this.panelTitle = page.locator('[data-testid="privacy-panel-title"]');
    
    // Fingerprint toggles
    this.canvasToggle = page.locator('[data-testid="canvas-toggle"]');
    this.webglToggle = page.locator('[data-testid="webgl-toggle"]');
    this.audioToggle = page.locator('[data-testid="audio-toggle"]');
    this.navigatorToggle = page.locator('[data-testid="navigator-toggle"]');
    
    // WebRTC protection
    this.webrtcToggle = page.locator('[data-testid="webrtc-toggle"]');
    
    // Tracker blocking
    this.trackerToggle = page.locator('[data-testid="tracker-toggle"]');
    
    // Timezone spoofing
    this.timezoneToggle = page.locator('[data-testid="timezone-toggle"]');
    
    // Sections
    this.fingerprintSection = page.locator('[data-testid="fingerprint-section"]');
    this.webrtcSection = page.locator('[data-testid="webrtc-section"]');
    this.trackerSection = page.locator('[data-testid="tracker-section"]');
    this.timezoneSection = page.locator('[data-testid="timezone-section"]');
  }

  /**
   * Open the privacy panel
   */
  async openPanel(): Promise<void> {
    await this.panelButton.click();
    await expect(this.panel).toBeVisible();
  }

  /**
   * Close the privacy panel
   */
  async closePanel(): Promise<void> {
    await this.panelButton.click();
    await expect(this.panel).not.toBeVisible();
  }

  /**
   * Check if privacy panel is visible
   */
  async isPanelVisible(): Promise<boolean> {
    return await this.panel.isVisible();
  }

  /**
   * Toggle canvas fingerprint protection
   */
  async toggleCanvas(): Promise<void> {
    await this.canvasToggle.click();
  }

  /**
   * Toggle WebGL fingerprint protection
   */
  async toggleWebGL(): Promise<void> {
    await this.webglToggle.click();
  }

  /**
   * Toggle audio fingerprint protection
   */
  async toggleAudio(): Promise<void> {
    await this.audioToggle.click();
  }

  /**
   * Toggle navigator spoofing
   */
  async toggleNavigator(): Promise<void> {
    await this.navigatorToggle.click();
  }

  /**
   * Toggle WebRTC leak protection
   */
  async toggleWebRTC(): Promise<void> {
    await this.webrtcToggle.click();
  }

  /**
   * Toggle tracker blocking
   */
  async toggleTrackerBlocking(): Promise<void> {
    await this.trackerToggle.click();
  }

  /**
   * Toggle timezone spoofing
   */
  async toggleTimezone(): Promise<void> {
    await this.timezoneToggle.click();
  }

  /**
   * Check if canvas protection is enabled
   */
  async isCanvasEnabled(): Promise<boolean> {
    return await this.canvasToggle.isChecked();
  }

  /**
   * Check if WebGL protection is enabled
   */
  async isWebGLEnabled(): Promise<boolean> {
    return await this.webglToggle.isChecked();
  }

  /**
   * Check if audio protection is enabled
   */
  async isAudioEnabled(): Promise<boolean> {
    return await this.audioToggle.isChecked();
  }

  /**
   * Check if navigator spoofing is enabled
   */
  async isNavigatorEnabled(): Promise<boolean> {
    return await this.navigatorToggle.isChecked();
  }

  /**
   * Check if WebRTC protection is enabled
   */
  async isWebRTCEnabled(): Promise<boolean> {
    return await this.webrtcToggle.isChecked();
  }

  /**
   * Check if tracker blocking is enabled
   */
  async isTrackerBlockingEnabled(): Promise<boolean> {
    return await this.trackerToggle.isChecked();
  }

  /**
   * Check if timezone spoofing is enabled
   */
  async isTimezoneEnabled(): Promise<boolean> {
    return await this.timezoneToggle.isChecked();
  }

  /**
   * Enable all privacy protections
   */
  async enableAllProtections(): Promise<void> {
    if (!await this.isCanvasEnabled()) {await this.toggleCanvas();}
    if (!await this.isWebGLEnabled()) {await this.toggleWebGL();}
    if (!await this.isAudioEnabled()) {await this.toggleAudio();}
    if (!await this.isNavigatorEnabled()) {await this.toggleNavigator();}
    if (!await this.isWebRTCEnabled()) {await this.toggleWebRTC();}
    if (!await this.isTrackerBlockingEnabled()) {await this.toggleTrackerBlocking();}
    if (!await this.isTimezoneEnabled()) {await this.toggleTimezone();}
  }

  /**
   * Disable all privacy protections
   */
  async disableAllProtections(): Promise<void> {
    if (await this.isCanvasEnabled()) {await this.toggleCanvas();}
    if (await this.isWebGLEnabled()) {await this.toggleWebGL();}
    if (await this.isAudioEnabled()) {await this.toggleAudio();}
    if (await this.isNavigatorEnabled()) {await this.toggleNavigator();}
    if (await this.isWebRTCEnabled()) {await this.toggleWebRTC();}
    if (await this.isTrackerBlockingEnabled()) {await this.toggleTrackerBlocking();}
    if (await this.isTimezoneEnabled()) {await this.toggleTimezone();}
  }

  /**
   * Verify all privacy sections are visible
   */
  async verifyAllSectionsVisible(): Promise<void> {
    await expect(this.fingerprintSection).toBeVisible();
    await expect(this.webrtcSection).toBeVisible();
    await expect(this.trackerSection).toBeVisible();
    await expect(this.timezoneSection).toBeVisible();
  }
}

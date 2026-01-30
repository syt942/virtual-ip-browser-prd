/**
 * Navigation Page Object
 * Encapsulates navigation-related interactions
 */

import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class NavigationPage extends BasePage {
  // Tab bar elements
  readonly tabBar: Locator;
  readonly tabItems: Locator;
  readonly newTabButton: Locator;
  readonly tabCloseButtons: Locator;
  
  // Address bar elements
  readonly addressBar: Locator;
  readonly addressInput: Locator;
  readonly navBackButton: Locator;
  readonly navForwardButton: Locator;
  readonly navReloadButton: Locator;
  
  // Proxy status
  readonly proxyStatus: Locator;
  readonly proxyStatusIndicator: Locator;
  readonly proxyStatusText: Locator;
  
  // Bottom toolbar
  readonly bottomToolbar: Locator;
  readonly proxyPanelButton: Locator;
  readonly privacyPanelButton: Locator;
  readonly automationPanelButton: Locator;
  readonly activityPanelButton: Locator;
  readonly statsPanelButton: Locator;
  readonly settingsPanelButton: Locator;
  
  // Side panel
  readonly sidePanel: Locator;

  constructor(page: Page) {
    super(page);
    
    // Tab bar elements
    this.tabBar = page.locator('[data-testid="tab-bar"]');
    this.tabItems = page.locator('[data-testid="tab-item"]');
    this.newTabButton = page.locator('[data-testid="new-tab-btn"]');
    this.tabCloseButtons = page.locator('[data-testid="tab-close"]');
    
    // Address bar elements
    this.addressBar = page.locator('[data-testid="address-bar"]');
    this.addressInput = page.locator('[data-testid="address-input"]');
    this.navBackButton = page.locator('[data-testid="nav-back"]');
    this.navForwardButton = page.locator('[data-testid="nav-forward"]');
    this.navReloadButton = page.locator('[data-testid="nav-reload"]');
    
    // Proxy status
    this.proxyStatus = page.locator('[data-testid="proxy-status"]');
    this.proxyStatusIndicator = page.locator('[data-testid="proxy-status-indicator"]');
    this.proxyStatusText = page.locator('[data-testid="proxy-status-text"]');
    
    // Bottom toolbar
    this.bottomToolbar = page.locator('[data-testid="bottom-toolbar"]');
    this.proxyPanelButton = page.locator('[data-testid="panel-btn-proxy"]');
    this.privacyPanelButton = page.locator('[data-testid="panel-btn-privacy"]');
    this.automationPanelButton = page.locator('[data-testid="panel-btn-automation"]');
    this.activityPanelButton = page.locator('[data-testid="panel-btn-activity"]');
    this.statsPanelButton = page.locator('[data-testid="panel-btn-stats"]');
    this.settingsPanelButton = page.locator('[data-testid="panel-btn-settings"]');
    
    // Side panel
    this.sidePanel = page.locator('[data-testid="side-panel"]');
  }

  /**
   * Create a new tab
   */
  async createNewTab(): Promise<void> {
    await this.newTabButton.click();
  }

  /**
   * Get tab count
   */
  async getTabCount(): Promise<number> {
    return await this.tabItems.count();
  }

  /**
   * Close tab by index
   */
  async closeTab(index: number): Promise<void> {
    await this.tabCloseButtons.nth(index).click();
  }

  /**
   * Navigate to URL
   */
  async navigateToUrl(url: string): Promise<void> {
    await this.addressInput.fill(url);
    await this.addressInput.press('Enter');
  }

  /**
   * Go back
   */
  async goBack(): Promise<void> {
    await this.navBackButton.click();
  }

  /**
   * Go forward
   */
  async goForward(): Promise<void> {
    await this.navForwardButton.click();
  }

  /**
   * Reload page
   */
  async reload(): Promise<void> {
    await this.navReloadButton.click();
  }

  /**
   * Open a panel by name
   */
  async openPanel(panel: 'proxy' | 'privacy' | 'automation' | 'activity' | 'stats' | 'settings'): Promise<void> {
    const buttonMap = {
      proxy: this.proxyPanelButton,
      privacy: this.privacyPanelButton,
      automation: this.automationPanelButton,
      activity: this.activityPanelButton,
      stats: this.statsPanelButton,
      settings: this.settingsPanelButton,
    };
    await buttonMap[panel].click();
    await expect(this.sidePanel).toBeVisible();
  }

  /**
   * Close current panel
   */
  async closeCurrentPanel(panel: 'proxy' | 'privacy' | 'automation' | 'activity' | 'stats' | 'settings'): Promise<void> {
    const buttonMap = {
      proxy: this.proxyPanelButton,
      privacy: this.privacyPanelButton,
      automation: this.automationPanelButton,
      activity: this.activityPanelButton,
      stats: this.statsPanelButton,
      settings: this.settingsPanelButton,
    };
    await buttonMap[panel].click();
  }

  /**
   * Check if side panel is visible
   */
  async isSidePanelVisible(): Promise<boolean> {
    return await this.sidePanel.isVisible();
  }

  /**
   * Get proxy status text
   */
  async getProxyStatusText(): Promise<string> {
    return await this.proxyStatusText.textContent() || '';
  }

  /**
   * Verify all main UI elements are visible
   */
  async verifyMainUIElements(): Promise<void> {
    await expect(this.tabBar).toBeVisible();
    await expect(this.addressBar).toBeVisible();
    await expect(this.bottomToolbar).toBeVisible();
    await expect(this.newTabButton).toBeVisible();
    await expect(this.addressInput).toBeVisible();
  }

  /**
   * Verify all toolbar buttons are visible
   */
  async verifyToolbarButtons(): Promise<void> {
    await expect(this.proxyPanelButton).toBeVisible();
    await expect(this.privacyPanelButton).toBeVisible();
    await expect(this.automationPanelButton).toBeVisible();
    await expect(this.activityPanelButton).toBeVisible();
    await expect(this.statsPanelButton).toBeVisible();
    await expect(this.settingsPanelButton).toBeVisible();
  }

  /**
   * Verify navigation buttons are visible
   */
  async verifyNavigationButtons(): Promise<void> {
    await expect(this.navBackButton).toBeVisible();
    await expect(this.navForwardButton).toBeVisible();
    await expect(this.navReloadButton).toBeVisible();
  }
}

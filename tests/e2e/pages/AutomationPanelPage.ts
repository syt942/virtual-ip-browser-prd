/**
 * Automation Panel Page Object
 * Encapsulates all interactions with the Automation Engine panel
 */

import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class AutomationPanelPage extends BasePage {
  // Panel elements
  readonly panelButton: Locator;
  readonly panel: Locator;
  readonly panelTitle: Locator;
  
  // Control buttons
  readonly startButton: Locator;
  readonly stopButton: Locator;
  readonly automationControls: Locator;
  
  // Search engine
  readonly searchEngineSelect: Locator;
  
  // Keywords
  readonly keywordInput: Locator;
  readonly addKeywordButton: Locator;
  readonly keywordsList: Locator;
  readonly keywordItems: Locator;
  readonly keywordsCount: Locator;
  
  // Target domains
  readonly domainInput: Locator;
  readonly addDomainButton: Locator;
  readonly domainsList: Locator;
  readonly domainItems: Locator;
  readonly domainsCount: Locator;

  constructor(page: Page) {
    super(page);
    
    // Panel elements
    this.panelButton = page.locator('[data-testid="panel-btn-automation"]');
    this.panel = page.locator('[data-testid="automation-panel"]');
    this.panelTitle = page.locator('[data-testid="automation-panel-title"]');
    
    // Control buttons
    this.startButton = page.locator('[data-testid="automation-start-btn"]');
    this.stopButton = page.locator('[data-testid="automation-stop-btn"]');
    this.automationControls = page.locator('[data-testid="automation-controls"]');
    
    // Search engine
    this.searchEngineSelect = page.locator('[data-testid="search-engine-select"]');
    
    // Keywords
    this.keywordInput = page.locator('[data-testid="keyword-input"]');
    this.addKeywordButton = page.locator('[data-testid="add-keyword-btn"]');
    this.keywordsList = page.locator('[data-testid="keywords-list"]');
    this.keywordItems = page.locator('[data-testid="keyword-item"]');
    this.keywordsCount = page.locator('[data-testid="keywords-count"]');
    
    // Target domains
    this.domainInput = page.locator('[data-testid="domain-input"]');
    this.addDomainButton = page.locator('[data-testid="add-domain-btn"]');
    this.domainsList = page.locator('[data-testid="domains-list"]');
    this.domainItems = page.locator('[data-testid="domain-item"]');
    this.domainsCount = page.locator('[data-testid="domains-count"]');
  }

  /**
   * Open the automation panel
   */
  async openPanel(): Promise<void> {
    await this.panelButton.click();
    await expect(this.panel).toBeVisible();
  }

  /**
   * Close the automation panel
   */
  async closePanel(): Promise<void> {
    await this.panelButton.click();
    await expect(this.panel).not.toBeVisible();
  }

  /**
   * Check if automation panel is visible
   */
  async isPanelVisible(): Promise<boolean> {
    return await this.panel.isVisible();
  }

  /**
   * Set search engine
   */
  async setSearchEngine(engine: 'google' | 'bing' | 'duckduckgo' | 'yahoo' | 'brave'): Promise<void> {
    await this.searchEngineSelect.selectOption(engine);
  }

  /**
   * Get current search engine
   */
  async getSearchEngine(): Promise<string> {
    return await this.searchEngineSelect.inputValue();
  }

  /**
   * Add a keyword
   */
  async addKeyword(keyword: string): Promise<void> {
    await this.keywordInput.fill(keyword);
    await this.addKeywordButton.click();
  }

  /**
   * Add keyword by pressing Enter
   */
  async addKeywordWithEnter(keyword: string): Promise<void> {
    await this.keywordInput.fill(keyword);
    await this.keywordInput.press('Enter');
  }

  /**
   * Get keyword count
   */
  async getKeywordCount(): Promise<number> {
    return await this.keywordItems.count();
  }

  /**
   * Add a target domain
   */
  async addDomain(domain: string): Promise<void> {
    await this.domainInput.fill(domain);
    await this.addDomainButton.click();
  }

  /**
   * Add domain by pressing Enter
   */
  async addDomainWithEnter(domain: string): Promise<void> {
    await this.domainInput.fill(domain);
    await this.domainInput.press('Enter');
  }

  /**
   * Get domain count
   */
  async getDomainCount(): Promise<number> {
    return await this.domainItems.count();
  }

  /**
   * Start automation
   */
  async startAutomation(): Promise<void> {
    await this.startButton.click();
  }

  /**
   * Stop automation
   */
  async stopAutomation(): Promise<void> {
    await this.stopButton.click();
  }

  /**
   * Check if automation is running
   */
  async isAutomationRunning(): Promise<boolean> {
    return await this.stopButton.isVisible();
  }

  /**
   * Check if start button is enabled
   */
  async isStartButtonEnabled(): Promise<boolean> {
    return await this.startButton.isEnabled();
  }

  /**
   * Verify search engine options are available
   */
  async verifySearchEngineOptions(): Promise<string[]> {
    const options = await this.searchEngineSelect.locator('option').allTextContents();
    return options;
  }

  /**
   * Remove a keyword by index
   */
  async removeKeyword(index: number): Promise<void> {
    const removeButton = this.keywordItems.nth(index).locator('[data-testid="remove-keyword-btn"]');
    await removeButton.click();
  }

  /**
   * Remove a domain by index
   */
  async removeDomain(index: number): Promise<void> {
    const removeButton = this.domainItems.nth(index).locator('[data-testid="remove-domain-btn"]');
    await removeButton.click();
  }
}

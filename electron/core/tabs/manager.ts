/**
 * Tab Manager
 * Manages browser tabs and session isolation
 */

import { EventEmitter } from 'events';
import { BrowserView, BrowserWindow } from 'electron';
import type { TabConfig, FingerprintConfig } from './types';
import type { PrivacyManager } from '../privacy/manager';
import type { ProxyManager } from '../proxy-engine/manager';

export class TabManager extends EventEmitter {
  private tabs: Map<string, TabConfig> = new Map();
  private views: Map<string, BrowserView> = new Map();
  private window: BrowserWindow | null = null;
  private activeTabId: string | null = null;
  private privacyManager: PrivacyManager | null = null;
  private proxyManager: ProxyManager | null = null;

  /**
   * Set the main window
   */
  setWindow(window: BrowserWindow): void {
    this.window = window;
  }

  /**
   * Set privacy manager
   */
  setPrivacyManager(manager: PrivacyManager): void {
    this.privacyManager = manager;
  }

  /**
   * Set proxy manager
   */
  setProxyManager(manager: ProxyManager): void {
    this.proxyManager = manager;
  }

  /**
   * Create a new tab with isolated session
   */
  async createTab(config: Partial<TabConfig>): Promise<TabConfig> {
    if (!this.window) {
      throw new Error('Window not set. Call setWindow() first.');
    }

    const id = crypto.randomUUID();
    const tab: TabConfig = {
      id,
      url: config.url || 'about:blank',
      title: config.title || 'New Tab',
      favicon: config.favicon,
      proxyId: config.proxyId,
      fingerprint: config.fingerprint,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Create BrowserView for this tab
    const view = new BrowserView({
      webPreferences: {
        partition: `persist:tab-${id}`,
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true
      }
    });

    // Get the session for this view
    const tabSession = view.webContents.session;

    // Apply proxy if specified
    if (tab.proxyId && this.proxyManager) {
      await this.applyProxyToSession(tabSession, tab.proxyId);
    }

    // Apply fingerprint protection
    if (this.privacyManager) {
      await this.applyFingerprintProtection(view, tab.fingerprint || {
        canvas: true,
        webgl: true,
        audio: true,
        navigator: true,
        timezone: true,
        language: 'en-US'
      });
    }

    // Set up navigation handlers
    this.setupNavigationHandlers(view, tab);

    // Store view
    this.views.set(id, view);
    this.tabs.set(id, tab);

    // Set as active tab
    this.setActiveTab(id);

    // Load URL
    if (tab.url !== 'about:blank') {
      await view.webContents.loadURL(tab.url);
    }

    this.emit('tab:created', tab);

    return tab;
  }

  /**
   * Set active tab
   */
  setActiveTab(id: string): void {
    const view = this.views.get(id);
    const tab = this.tabs.get(id);
    
    if (!view || !tab || !this.window) return;

    // Remove current view
    if (this.activeTabId) {
      const currentView = this.views.get(this.activeTabId);
      if (currentView) {
        this.window.removeBrowserView(currentView);
      }
    }

    // Add new view
    this.window.addBrowserView(view);
    
    // Set bounds (leave space for UI chrome)
    const bounds = this.window.getBounds();
    view.setBounds({
      x: 0,
      y: 80, // Space for tab bar + address bar
      width: bounds.width,
      height: bounds.height - 120 // Space for top and bottom bars
    });
    view.setAutoResize({
      width: true,
      height: true
    });

    this.activeTabId = id;
    this.emit('tab:activated', tab);
  }

  /**
   * Setup navigation handlers for a view
   */
  private setupNavigationHandlers(view: BrowserView, tab: TabConfig): void {
    // Update title
    view.webContents.on('page-title-updated', (_event, title) => {
      tab.title = title;
      this.tabs.set(tab.id, tab);
      this.emit('tab:updated', tab);
    });

    // Update favicon
    view.webContents.on('page-favicon-updated', (_event, favicons) => {
      if (favicons.length > 0) {
        tab.favicon = favicons[0];
        this.tabs.set(tab.id, tab);
        this.emit('tab:updated', tab);
      }
    });

    // Update URL
    view.webContents.on('did-navigate', (_event, url) => {
      tab.url = url;
      this.tabs.set(tab.id, tab);
      this.emit('tab:updated', tab);
    });

    // Handle navigation
    view.webContents.on('did-finish-load', () => {
      this.emit('tab:loaded', tab);
    });

    // Handle errors
    view.webContents.on('did-fail-load', (_event, _errorCode, errorDescription) => {
      console.error(`[TabManager] Failed to load ${tab.url}:`, errorDescription);
      this.emit('tab:error', { tab, error: errorDescription });
    });
  }

  /**
   * Close a tab
   */
  closeTab(id: string): boolean {
    const tab = this.tabs.get(id);
    if (!tab) return false;

    // Clean up BrowserView if exists
    const view = this.views.get(id);
    if (view) {
      // @ts-ignore - webContents.destroy() exists
      view.webContents.destroy();
      this.views.delete(id);
    }

    this.tabs.delete(id);
    this.emit('tab:closed', tab);
    return true;
  }

  /**
   * Get all tabs
   */
  getAllTabs(): TabConfig[] {
    return Array.from(this.tabs.values());
  }

  /**
   * Get tab by ID
   */
  getTab(id: string): TabConfig | undefined {
    return this.tabs.get(id);
  }

  /**
   * Update tab
   */
  updateTab(id: string, updates: Partial<TabConfig>): TabConfig | undefined {
    const tab = this.tabs.get(id);
    if (!tab) return undefined;

    const updated = {
      ...tab,
      ...updates,
      updatedAt: new Date()
    };

    this.tabs.set(id, updated);
    this.emit('tab:updated', updated);
    return updated;
  }

  /**
   * Apply proxy to session
   */
  private async applyProxyToSession(_tabSession: Electron.Session, proxyId: string): Promise<void> {
    // This will be implemented to fetch proxy config and apply it
    // For now, placeholder
    this.emit('proxy:applied', { proxyId });
  }

  /**
   * Apply fingerprint protection to BrowserView
   */
  private async applyFingerprintProtection(
    view: BrowserView,
    fingerprint: FingerprintConfig
  ): Promise<void> {
    if (!this.privacyManager) return;

    // Generate protection script
    const protectionScript = this.privacyManager.generateProtectionScript({
      canvas: fingerprint.canvas !== false,
      webgl: fingerprint.webgl !== false,
      audio: fingerprint.audio !== false,
      navigator: fingerprint.navigator !== false && fingerprint.navigator !== undefined,
      timezone: typeof fingerprint.timezone === 'string' || fingerprint.timezone === true,
      webrtc: true,
      trackerBlocking: true
    });

    // Inject script on every page load
    view.webContents.on('did-start-loading', () => {
      view.webContents.executeJavaScript(protectionScript).catch(err => {
        console.error('[TabManager] Failed to inject protection script:', err);
      });
    });

    // Apply tracker blocking to session
    const tabSession = view.webContents.session;
    const partition = (tabSession as Electron.Session & { partition?: string }).partition || 'default';
    this.privacyManager.applyToSession(partition, {
      canvas: true,
      webgl: true,
      audio: true,
      navigator: true,
      timezone: true,
      webrtc: true,
      trackerBlocking: true
    });

    this.emit('fingerprint:applied', { fingerprint });
  }

  /**
   * Navigate tab to URL
   */
  async navigate(id: string, url: string): Promise<void> {
    const view = this.views.get(id);
    const tab = this.tabs.get(id);
    
    if (!view || !tab) {
      throw new Error(`Tab ${id} not found`);
    }

    await view.webContents.loadURL(url);
    tab.url = url;
    this.tabs.set(id, tab);
  }

  /**
   * Go back in history
   */
  goBack(id: string): void {
    const view = this.views.get(id);
    if (view && view.webContents.canGoBack()) {
      view.webContents.goBack();
    }
  }

  /**
   * Go forward in history
   */
  goForward(id: string): void {
    const view = this.views.get(id);
    if (view && view.webContents.canGoForward()) {
      view.webContents.goForward();
    }
  }

  /**
   * Reload tab
   */
  reload(id: string): void {
    const view = this.views.get(id);
    if (view) {
      view.webContents.reload();
    }
  }

  /**
   * Get active tab ID
   */
  getActiveTabId(): string | null {
    return this.activeTabId;
  }
}

/**
 * Tab Manager Unit Tests
 * Comprehensive tests for electron/core/tabs/manager.ts
 * 
 * Coverage targets:
 * - Tab lifecycle (create, close, navigate)
 * - Proxy assignment and rotation
 * - Session isolation
 * - Tab pooling and reuse
 * - Memory management
 * - Tab state tracking
 * - Error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { EventEmitter } from 'events';

// ============================================================================
// MOCKS - Defined inside factory to avoid hoisting issues
// ============================================================================

// Shared mock state that can be accessed in tests
const mockState = {
  webContents: {
    loadURL: vi.fn().mockResolvedValue(undefined),
    on: vi.fn().mockReturnThis(),
    off: vi.fn(),
    destroy: vi.fn(),
    executeJavaScript: vi.fn().mockResolvedValue(undefined),
    canGoBack: vi.fn().mockReturnValue(true),
    canGoForward: vi.fn().mockReturnValue(true),
    goBack: vi.fn(),
    goForward: vi.fn(),
    reload: vi.fn(),
    session: {
      partition: 'persist:test',
      setProxy: vi.fn().mockResolvedValue(undefined),
    },
  },
  browserViewCalls: [] as any[],
  browserWindow: {
    getBounds: vi.fn().mockReturnValue({ x: 0, y: 0, width: 1200, height: 800 }),
    addBrowserView: vi.fn(),
    removeBrowserView: vi.fn(),
  },
};

// Mock electron module - factory must not reference external variables
vi.mock('electron', () => {
  const mockWebContents = {
    loadURL: vi.fn().mockResolvedValue(undefined),
    on: vi.fn().mockReturnThis(),
    off: vi.fn(),
    destroy: vi.fn(),
    executeJavaScript: vi.fn().mockResolvedValue(undefined),
    canGoBack: vi.fn().mockReturnValue(true),
    canGoForward: vi.fn().mockReturnValue(true),
    goBack: vi.fn(),
    goForward: vi.fn(),
    reload: vi.fn(),
    session: {
      partition: 'persist:test',
      setProxy: vi.fn().mockResolvedValue(undefined),
    },
  };

  // Store reference for tests to access
  (globalThis as any).__mockWebContents = mockWebContents;
  (globalThis as any).__mockBrowserViewCalls = [];

  return {
    BrowserView: vi.fn().mockImplementation((options) => {
      (globalThis as any).__mockBrowserViewCalls.push(options);
      return {
        webContents: (globalThis as any).__mockWebContents,
        setBounds: vi.fn(),
        setAutoResize: vi.fn(),
      };
    }),
    BrowserWindow: vi.fn(),
    session: {
      fromPartition: vi.fn().mockReturnValue({
        setProxy: vi.fn().mockResolvedValue(undefined),
      }),
    },
  };
});

// Import after mocks
import { TabManager } from '../../electron/core/tabs/manager';
import type { TabConfig } from '../../electron/core/tabs/types';
import { BrowserView } from 'electron';

// Helper to get mock references
const getMockWebContents = () => (globalThis as any).__mockWebContents;
const getMockBrowserViewCalls = () => (globalThis as any).__mockBrowserViewCalls;

// ============================================================================
// TEST DATA FACTORIES
// ============================================================================

/**
 * Factory for creating test tab configurations
 */
function createTestTabConfig(overrides: Partial<TabConfig> = {}): Partial<TabConfig> {
  return {
    url: 'https://example.com',
    title: 'Test Tab',
    proxyId: undefined,
    fingerprint: {
      canvas: true,
      webgl: true,
      audio: true,
      navigator: true,
      timezone: true,
      language: 'en-US',
    },
    ...overrides,
  };
}

/**
 * Factory for creating mock PrivacyManager
 */
function createMockPrivacyManager() {
  return {
    generateProtectionScript: vi.fn().mockReturnValue('// protection script'),
    applyToSession: vi.fn(),
    getWebRTCProtection: vi.fn().mockReturnValue({
      setBlockWebRTC: vi.fn(),
    }),
    getTrackerBlocker: vi.fn().mockReturnValue({
      setEnabled: vi.fn(),
    }),
  };
}

/**
 * Factory for creating mock ProxyManager
 */
function createMockProxyManager() {
  return {
    getProxy: vi.fn(),
    getNextProxy: vi.fn(),
    getAllProxies: vi.fn().mockReturnValue([]),
    addProxy: vi.fn(),
    removeProxy: vi.fn(),
    validateProxy: vi.fn(),
    setRotationStrategy: vi.fn(),
  };
}

// ============================================================================
// TEST SUITES
// ============================================================================

describe('TabManager', () => {
  let tabManager: TabManager;
  let mockPrivacyManager: ReturnType<typeof createMockPrivacyManager>;
  let mockProxyManager: ReturnType<typeof createMockProxyManager>;
  let mockBrowserWindow: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Reset global mock state
    const mockWebContents = getMockWebContents();
    (globalThis as any).__mockBrowserViewCalls = [];
    
    // Reset mockWebContents functions
    mockWebContents.loadURL.mockResolvedValue(undefined);
    mockWebContents.canGoBack.mockReturnValue(true);
    mockWebContents.canGoForward.mockReturnValue(true);
    
    // Create mock browser window
    mockBrowserWindow = {
      getBounds: vi.fn().mockReturnValue({ x: 0, y: 0, width: 1200, height: 800 }),
      addBrowserView: vi.fn(),
      removeBrowserView: vi.fn(),
    };
    
    // Create fresh instances
    tabManager = new TabManager();
    mockPrivacyManager = createMockPrivacyManager();
    mockProxyManager = createMockProxyManager();
    
    // Set up managers
    tabManager.setWindow(mockBrowserWindow as any);
    tabManager.setPrivacyManager(mockPrivacyManager as any);
    tabManager.setProxyManager(mockProxyManager as any);
  });

  afterEach(() => {
    // Clean up all tabs
    const tabs = tabManager.getAllTabs();
    tabs.forEach(tab => tabManager.closeTab(tab.id));
  });

  // ==========================================================================
  // TAB LIFECYCLE TESTS
  // ==========================================================================

  describe('Tab Lifecycle', () => {
    describe('createTab', () => {
      it('should create a new tab with default values', async () => {
        const tab = await tabManager.createTab({});

        expect(tab).toBeDefined();
        expect(tab.id).toBeDefined();
        expect(tab.url).toBe('about:blank');
        expect(tab.title).toBe('New Tab');
        expect(tab.createdAt).toBeInstanceOf(Date);
        expect(tab.updatedAt).toBeInstanceOf(Date);
      });

      it('should create a tab with custom URL and title', async () => {
        const config = createTestTabConfig({
          url: 'https://test.com',
          title: 'Custom Title',
        });

        const tab = await tabManager.createTab(config);

        expect(tab.url).toBe('https://test.com');
        expect(tab.title).toBe('Custom Title');
      });

      it('should create BrowserView with correct webPreferences', async () => {
        await tabManager.createTab({});

        const calls = getMockBrowserViewCalls();
        expect(calls.length).toBeGreaterThan(0);
        expect(calls[0].webPreferences).toMatchObject({
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true,
        });
      });

      it('should use partition for session isolation', async () => {
        const tab = await tabManager.createTab({});

        const calls = getMockBrowserViewCalls();
        expect(calls.length).toBeGreaterThan(0);
        expect(calls[0].webPreferences.partition).toMatch(/^persist:tab-/);
      });

      it('should emit tab:created event', async () => {
        const eventSpy = vi.fn();
        tabManager.on('tab:created', eventSpy);

        const tab = await tabManager.createTab({});

        expect(eventSpy).toHaveBeenCalledWith(tab);
      });

      it('should load URL when not about:blank', async () => {
        const mockWebContents = getMockWebContents();
        await tabManager.createTab({ url: 'https://example.com' });

        expect(mockWebContents.loadURL).toHaveBeenCalledWith('https://example.com');
      });

      it('should not load URL when about:blank', async () => {
        const mockWebContents = getMockWebContents();
        await tabManager.createTab({ url: 'about:blank' });

        expect(mockWebContents.loadURL).not.toHaveBeenCalled();
      });

      it('should set created tab as active', async () => {
        const tab = await tabManager.createTab({});

        expect(tabManager.getActiveTabId()).toBe(tab.id);
      });

      it('should throw error when window is not set', async () => {
        const newManager = new TabManager();

        await expect(newManager.createTab({})).rejects.toThrow(
          'Window not set. Call setWindow() first.'
        );
      });

      it('should apply fingerprint protection when privacyManager is set', async () => {
        await tabManager.createTab({});

        expect(mockPrivacyManager.generateProtectionScript).toHaveBeenCalled();
      });

      it('should generate unique IDs for each tab', async () => {
        const tab1 = await tabManager.createTab({});
        const tab2 = await tabManager.createTab({});
        const tab3 = await tabManager.createTab({});

        const ids = new Set([tab1.id, tab2.id, tab3.id]);
        expect(ids.size).toBe(3);
      });
    });

    describe('closeTab', () => {
      it('should close an existing tab', async () => {
        const tab = await tabManager.createTab({});

        const result = tabManager.closeTab(tab.id);

        expect(result).toBe(true);
        expect(tabManager.getTab(tab.id)).toBeUndefined();
      });

      it('should return false for non-existent tab', () => {
        const result = tabManager.closeTab('non-existent-id');

        expect(result).toBe(false);
      });

      it('should destroy webContents when closing tab', async () => {
        const mockWebContents = getMockWebContents();
        const tab = await tabManager.createTab({});

        tabManager.closeTab(tab.id);

        expect(mockWebContents.destroy).toHaveBeenCalled();
      });

      it('should emit tab:closed event', async () => {
        const eventSpy = vi.fn();
        tabManager.on('tab:closed', eventSpy);

        const tab = await tabManager.createTab({});
        tabManager.closeTab(tab.id);

        expect(eventSpy).toHaveBeenCalledWith(tab);
      });

      it('should remove tab from internal maps', async () => {
        const tab = await tabManager.createTab({});
        
        expect(tabManager.getAllTabs()).toHaveLength(1);
        
        tabManager.closeTab(tab.id);
        
        expect(tabManager.getAllTabs()).toHaveLength(0);
      });
    });

    describe('navigate', () => {
      it('should navigate tab to new URL', async () => {
        const mockWebContents = getMockWebContents();
        const tab = await tabManager.createTab({});
        mockWebContents.loadURL.mockClear();

        await tabManager.navigate(tab.id, 'https://newsite.com');

        expect(mockWebContents.loadURL).toHaveBeenCalledWith('https://newsite.com');
      });

      it('should update tab URL after navigation', async () => {
        const tab = await tabManager.createTab({});

        await tabManager.navigate(tab.id, 'https://newsite.com');

        const updatedTab = tabManager.getTab(tab.id);
        expect(updatedTab?.url).toBe('https://newsite.com');
      });

      it('should throw error for non-existent tab', async () => {
        await expect(
          tabManager.navigate('non-existent', 'https://test.com')
        ).rejects.toThrow('Tab non-existent not found');
      });
    });
  });

  // ==========================================================================
  // PROXY ASSIGNMENT TESTS
  // ==========================================================================

  describe('Proxy Assignment', () => {
    it('should create tab with proxy assignment', async () => {
      const proxyId = '00000000-0000-4000-a000-000000000001';
      
      const tab = await tabManager.createTab({ proxyId });

      expect(tab.proxyId).toBe(proxyId);
    });

    it('should emit proxy:applied event when proxy is assigned', async () => {
      const eventSpy = vi.fn();
      tabManager.on('proxy:applied', eventSpy);

      const proxyId = '00000000-0000-4000-a000-000000000002';
      await tabManager.createTab({ proxyId });

      expect(eventSpy).toHaveBeenCalledWith({ proxyId });
    });

    it('should not apply proxy when proxyId is not provided', async () => {
      const eventSpy = vi.fn();
      tabManager.on('proxy:applied', eventSpy);

      await tabManager.createTab({});

      expect(eventSpy).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // SESSION ISOLATION TESTS
  // ==========================================================================

  describe('Session Isolation', () => {
    it('should create separate sessions for each tab', async () => {
      const tab1 = await tabManager.createTab({});
      const tab2 = await tabManager.createTab({});

      // Each tab should have a unique partition
      const calls = getMockBrowserViewCalls();
      const partition1 = calls[0].webPreferences.partition;
      const partition2 = calls[1].webPreferences.partition;

      expect(partition1).not.toBe(partition2);
      expect(partition1).toContain(tab1.id);
      expect(partition2).toContain(tab2.id);
    });

    it('should use persist: prefix for persistent sessions', async () => {
      await tabManager.createTab({});

      const calls = getMockBrowserViewCalls();
      expect(calls[0].webPreferences.partition).toMatch(/^persist:/);
    });
  });

  // ==========================================================================
  // TAB STATE TRACKING TESTS
  // ==========================================================================

  describe('Tab State Tracking', () => {
    describe('getTab', () => {
      it('should return tab by ID', async () => {
        const createdTab = await tabManager.createTab({ title: 'Test' });

        const retrievedTab = tabManager.getTab(createdTab.id);

        expect(retrievedTab).toEqual(createdTab);
      });

      it('should return undefined for non-existent tab', () => {
        const tab = tabManager.getTab('non-existent');

        expect(tab).toBeUndefined();
      });
    });

    describe('getAllTabs', () => {
      it('should return empty array when no tabs', () => {
        const tabs = tabManager.getAllTabs();

        expect(tabs).toEqual([]);
      });

      it('should return all created tabs', async () => {
        await tabManager.createTab({ title: 'Tab 1' });
        await tabManager.createTab({ title: 'Tab 2' });
        await tabManager.createTab({ title: 'Tab 3' });

        const tabs = tabManager.getAllTabs();

        expect(tabs).toHaveLength(3);
      });
    });

    describe('updateTab', () => {
      it('should update tab properties', async () => {
        const tab = await tabManager.createTab({ title: 'Original' });

        const updated = tabManager.updateTab(tab.id, { title: 'Updated' });

        expect(updated?.title).toBe('Updated');
      });

      it('should update updatedAt timestamp', async () => {
        const tab = await tabManager.createTab({});
        const originalUpdatedAt = tab.updatedAt;

        // Small delay to ensure different timestamp
        await new Promise(resolve => setTimeout(resolve, 10));

        const updated = tabManager.updateTab(tab.id, { title: 'New Title' });

        expect(updated?.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
      });

      it('should emit tab:updated event', async () => {
        const eventSpy = vi.fn();
        tabManager.on('tab:updated', eventSpy);

        const tab = await tabManager.createTab({});
        tabManager.updateTab(tab.id, { title: 'Updated' });

        expect(eventSpy).toHaveBeenCalled();
      });

      it('should return undefined for non-existent tab', () => {
        const result = tabManager.updateTab('non-existent', { title: 'Test' });

        expect(result).toBeUndefined();
      });

      it('should preserve existing properties when updating', async () => {
        const tab = await tabManager.createTab({
          url: 'https://original.com',
          title: 'Original Title',
        });

        tabManager.updateTab(tab.id, { title: 'New Title' });

        const updated = tabManager.getTab(tab.id);
        expect(updated?.url).toBe('https://original.com');
        expect(updated?.title).toBe('New Title');
      });
    });

    describe('getActiveTabId', () => {
      it('should return null when no tabs exist', () => {
        expect(tabManager.getActiveTabId()).toBeNull();
      });

      it('should return the active tab ID', async () => {
        const tab = await tabManager.createTab({});

        expect(tabManager.getActiveTabId()).toBe(tab.id);
      });
    });

    describe('setActiveTab', () => {
      it('should change active tab', async () => {
        const tab1 = await tabManager.createTab({});
        const tab2 = await tabManager.createTab({});

        tabManager.setActiveTab(tab1.id);

        expect(tabManager.getActiveTabId()).toBe(tab1.id);
      });

      it('should emit tab:activated event', async () => {
        const eventSpy = vi.fn();
        tabManager.on('tab:activated', eventSpy);

        const tab1 = await tabManager.createTab({});
        const tab2 = await tabManager.createTab({});

        eventSpy.mockClear();
        tabManager.setActiveTab(tab1.id);

        expect(eventSpy).toHaveBeenCalled();
      });

      it('should add view to window when activating', async () => {
        const tab = await tabManager.createTab({});
        mockBrowserWindow.addBrowserView.mockClear();

        tabManager.setActiveTab(tab.id);

        expect(mockBrowserWindow.addBrowserView).toHaveBeenCalled();
      });

      it('should remove previous view when switching tabs', async () => {
        const tab1 = await tabManager.createTab({});
        const tab2 = await tabManager.createTab({});

        mockBrowserWindow.removeBrowserView.mockClear();
        tabManager.setActiveTab(tab1.id);

        expect(mockBrowserWindow.removeBrowserView).toHaveBeenCalled();
      });

      it('should not do anything for non-existent tab', async () => {
        const tab = await tabManager.createTab({});
        const activeId = tabManager.getActiveTabId();

        tabManager.setActiveTab('non-existent');

        expect(tabManager.getActiveTabId()).toBe(activeId);
      });
    });
  });

  // ==========================================================================
  // NAVIGATION CONTROLS TESTS
  // ==========================================================================

  describe('Navigation Controls', () => {
    describe('goBack', () => {
      it('should call goBack on webContents when possible', async () => {
        const mockWebContents = getMockWebContents();
        const tab = await tabManager.createTab({});

        tabManager.goBack(tab.id);

        expect(mockWebContents.goBack).toHaveBeenCalled();
      });

      it('should not call goBack when cannot go back', async () => {
        const mockWebContents = getMockWebContents();
        mockWebContents.canGoBack.mockReturnValue(false);
        const tab = await tabManager.createTab({});

        tabManager.goBack(tab.id);

        expect(mockWebContents.goBack).not.toHaveBeenCalled();
      });

      it('should handle non-existent tab gracefully', () => {
        expect(() => tabManager.goBack('non-existent')).not.toThrow();
      });
    });

    describe('goForward', () => {
      it('should call goForward on webContents when possible', async () => {
        const mockWebContents = getMockWebContents();
        const tab = await tabManager.createTab({});

        tabManager.goForward(tab.id);

        expect(mockWebContents.goForward).toHaveBeenCalled();
      });

      it('should not call goForward when cannot go forward', async () => {
        const mockWebContents = getMockWebContents();
        mockWebContents.canGoForward.mockReturnValue(false);
        const tab = await tabManager.createTab({});

        tabManager.goForward(tab.id);

        expect(mockWebContents.goForward).not.toHaveBeenCalled();
      });
    });

    describe('reload', () => {
      it('should call reload on webContents', async () => {
        const mockWebContents = getMockWebContents();
        const tab = await tabManager.createTab({});

        tabManager.reload(tab.id);

        expect(mockWebContents.reload).toHaveBeenCalled();
      });

      it('should handle non-existent tab gracefully', () => {
        expect(() => tabManager.reload('non-existent')).not.toThrow();
      });
    });
  });

  // ==========================================================================
  // MEMORY MANAGEMENT TESTS
  // ==========================================================================

  describe('Memory Management', () => {
    it('should clean up resources when closing tab', async () => {
      const mockWebContents = getMockWebContents();
      const tab = await tabManager.createTab({});

      tabManager.closeTab(tab.id);

      expect(mockWebContents.destroy).toHaveBeenCalled();
    });

    it('should remove all references when closing tab', async () => {
      const tab = await tabManager.createTab({});

      tabManager.closeTab(tab.id);

      expect(tabManager.getTab(tab.id)).toBeUndefined();
      expect(tabManager.getAllTabs()).toHaveLength(0);
    });

    it('should handle multiple tabs creation and cleanup', async () => {
      const tabs: TabConfig[] = [];

      // Create multiple tabs
      for (let i = 0; i < 10; i++) {
        const tab = await tabManager.createTab({ title: `Tab ${i}` });
        tabs.push(tab);
      }

      expect(tabManager.getAllTabs()).toHaveLength(10);

      // Close all tabs
      tabs.forEach(tab => tabManager.closeTab(tab.id));

      expect(tabManager.getAllTabs()).toHaveLength(0);
    });
  });

  // ==========================================================================
  // ERROR HANDLING TESTS
  // ==========================================================================

  describe('Error Handling', () => {
    it('should handle loadURL failure gracefully', async () => {
      const mockWebContents = getMockWebContents();
      mockWebContents.loadURL.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        tabManager.createTab({ url: 'https://invalid-url.com' })
      ).rejects.toThrow('Network error');
    });

    it('should handle navigation to invalid tab', async () => {
      await expect(
        tabManager.navigate('invalid-id', 'https://test.com')
      ).rejects.toThrow('Tab invalid-id not found');
    });
  });

  // ==========================================================================
  // CONCURRENT OPERATIONS TESTS
  // ==========================================================================

  describe('Concurrent Operations', () => {
    it('should handle concurrent tab creation', async () => {
      const promises = Array(5).fill(null).map((_, i) =>
        tabManager.createTab({ title: `Concurrent Tab ${i}` })
      );

      const tabs = await Promise.all(promises);

      expect(tabs).toHaveLength(5);
      expect(new Set(tabs.map(t => t.id)).size).toBe(5);
    });

    it('should maintain state consistency during concurrent operations', async () => {
      // Create tabs concurrently
      const createPromises = Array(3).fill(null).map((_, i) =>
        tabManager.createTab({ title: `Tab ${i}` })
      );
      const createdTabs = await Promise.all(createPromises);

      // Verify all tabs exist
      expect(tabManager.getAllTabs()).toHaveLength(3);

      // Close first tab while creating new one
      const closePromise = new Promise<boolean>(resolve => {
        resolve(tabManager.closeTab(createdTabs[0].id));
      });
      const createPromise = tabManager.createTab({ title: 'New Tab' });

      const [closeResult, newTab] = await Promise.all([closePromise, createPromise]);

      expect(closeResult).toBe(true);
      expect(newTab).toBeDefined();
      expect(tabManager.getAllTabs()).toHaveLength(3);
    });
  });

  // ==========================================================================
  // FINGERPRINT PROTECTION TESTS
  // ==========================================================================

  describe('Fingerprint Protection', () => {
    it('should apply default fingerprint config when not provided', async () => {
      await tabManager.createTab({});

      expect(mockPrivacyManager.generateProtectionScript).toHaveBeenCalledWith(
        expect.objectContaining({
          canvas: true,
          webgl: true,
          audio: true,
          navigator: true,
          timezone: true,
        })
      );
    });

    it('should apply custom fingerprint config', async () => {
      await tabManager.createTab({
        fingerprint: {
          canvas: false,
          webgl: true,
          audio: false,
          navigator: true,
          timezone: false,
          language: 'fr-FR',
        } as any,
      });

      expect(mockPrivacyManager.generateProtectionScript).toHaveBeenCalled();
    });

    it('should emit fingerprint:applied event', async () => {
      const eventSpy = vi.fn();
      tabManager.on('fingerprint:applied', eventSpy);

      await tabManager.createTab({});

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({ fingerprint: expect.any(Object) })
      );
    });

    it('should skip fingerprint protection when privacyManager is not set', async () => {
      const newManager = new TabManager();
      newManager.setWindow(mockBrowserWindow as any);
      // Don't set privacyManager

      const tab = await newManager.createTab({});

      expect(mockPrivacyManager.generateProtectionScript).not.toHaveBeenCalled();
      expect(tab).toBeDefined();
    });
  });

  // ==========================================================================
  // MANAGER CONFIGURATION TESTS
  // ==========================================================================

  describe('Manager Configuration', () => {
    it('should set window correctly', () => {
      const newManager = new TabManager();
      newManager.setWindow(mockBrowserWindow as any);

      // Should not throw when creating tab
      expect(async () => {
        await newManager.createTab({});
      }).not.toThrow();
    });

    it('should set privacy manager correctly', async () => {
      const newManager = new TabManager();
      newManager.setWindow(mockBrowserWindow as any);
      newManager.setPrivacyManager(mockPrivacyManager as any);

      await newManager.createTab({});

      expect(mockPrivacyManager.generateProtectionScript).toHaveBeenCalled();
    });

    it('should set proxy manager correctly', async () => {
      const newManager = new TabManager();
      newManager.setWindow(mockBrowserWindow as any);
      newManager.setProxyManager(mockProxyManager as any);

      const eventSpy = vi.fn();
      newManager.on('proxy:applied', eventSpy);

      await newManager.createTab({ proxyId: '00000000-0000-4000-a000-000000000003' });

      expect(eventSpy).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // TAB POOL TESTS (v1.4.0)
  // ==========================================================================

  describe('Tab Pool Integration', () => {
    it('should create tabs using tab pool for performance', async () => {
      const startTime = Date.now();
      
      const tab = await tabManager.createTab({
        url: 'https://example.com'
      });
      
      const creationTime = Date.now() - startTime;
      
      expect(tab).toBeDefined();
      expect(tab.id).toBeDefined();
      expect(tab.url).toBe('https://example.com');
      
      // Should create quickly (target: <100ms, but in tests allow more)
      expect(creationTime).toBeLessThan(1000);
    });

    it('should get pool metrics', () => {
      const metrics = tabManager.getPoolMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics).toHaveProperty('totalTabs');
      expect(metrics).toHaveProperty('availableTabs');
      expect(metrics).toHaveProperty('inUseTabs');
      expect(metrics).toHaveProperty('recycleCount');
      expect(metrics).toHaveProperty('avgRecycleTime');
    });

    it('should enforce maximum 50 concurrent tabs', async () => {
      // Create 50 tabs
      const tabs: TabConfig[] = [];
      for (let i = 0; i < 50; i++) {
        const tab = await tabManager.createTab({ url: `https://example${i}.com` });
        tabs.push(tab);
      }
      
      expect(tabs.length).toBe(50);
      
      // 51st tab should fail
      await expect(async () => {
        await tabManager.createTab({ url: 'https://example51.com' });
      }).rejects.toThrow('Tab pool exhausted');
    });

    it('should release tabs back to pool on close', async () => {
      const tab = await tabManager.createTab({ url: 'https://example.com' });
      const metricsBefore = tabManager.getPoolMetrics();
      
      await tabManager.closeTab(tab.id);
      
      const metricsAfter = tabManager.getPoolMetrics();
      
      // Available tabs should increase after releasing
      expect(metricsAfter.availableTabs).toBeGreaterThanOrEqual(metricsBefore.availableTabs);
    });

    it('should reuse tabs from pool', async () => {
      // Create and close a tab
      const tab1 = await tabManager.createTab({ url: 'https://example1.com' });
      await tabManager.closeTab(tab1.id);
      
      // Create another tab - should reuse from pool
      const tab2 = await tabManager.createTab({ url: 'https://example2.com' });
      
      expect(tab2).toBeDefined();
      expect(tab2.id).toBeDefined();
      
      const metrics = tabManager.getPoolMetrics();
      expect(metrics.recycleCount).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // TAB SUSPENSION TESTS (v1.4.0)
  // ==========================================================================

  describe('Tab Suspension for Memory Management', () => {
    it('should get suspension metrics', () => {
      const metrics = tabManager.getSuspensionMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics).toHaveProperty('totalTracked');
      expect(metrics).toHaveProperty('suspendedCount');
      expect(metrics).toHaveProperty('suspensionCount');
      expect(metrics).toHaveProperty('restorationCount');
      expect(metrics).toHaveProperty('estimatedMemorySaved');
    });

    it('should record tab activity', async () => {
      const tab = await tabManager.createTab({ url: 'https://example.com' });
      
      // Should not throw
      await expect(tabManager.recordTabActivity(tab.id)).resolves.not.toThrow();
    });

    it('should register tabs for suspension tracking', async () => {
      const metricsBefore = tabManager.getSuspensionMetrics();
      
      await tabManager.createTab({ url: 'https://example.com' });
      
      const metricsAfter = tabManager.getSuspensionMetrics();
      
      expect(metricsAfter.totalTracked).toBeGreaterThan(metricsBefore.totalTracked);
    });

    it('should unregister tabs on close', async () => {
      const tab = await tabManager.createTab({ url: 'https://example.com' });
      const metricsBefore = tabManager.getSuspensionMetrics();
      
      await tabManager.closeTab(tab.id);
      
      const metricsAfter = tabManager.getSuspensionMetrics();
      
      expect(metricsAfter.totalTracked).toBeLessThan(metricsBefore.totalTracked);
    });
  });

  // ==========================================================================
  // TAB MANAGER CLEANUP TESTS
  // ==========================================================================

  describe('Tab Manager Cleanup', () => {
    it('should cleanup all resources on destroy', async () => {
      const newManager = new TabManager();
      newManager.setWindow(mockBrowserWindow as any);
      
      // Create some tabs
      await newManager.createTab({ url: 'https://example1.com' });
      await newManager.createTab({ url: 'https://example2.com' });
      
      // Destroy should not throw
      await expect(newManager.destroy()).resolves.not.toThrow();
      
      // Metrics should be cleared
      const poolMetrics = newManager.getPoolMetrics();
      const suspensionMetrics = newManager.getSuspensionMetrics();
      
      expect(poolMetrics.totalTabs).toBe(0);
      expect(suspensionMetrics.totalTracked).toBe(0);
    });
  });

  // ==========================================================================
  // DYNAMIC PROXY ASSIGNMENT TESTS (v1.4.0)
  // ==========================================================================

  describe('Dynamic Proxy Assignment', () => {
    beforeEach(() => {
      tabManager.setProxyManager(mockProxyManager as any);
    });

    it('should dynamically assign proxy to existing tab', async () => {
      const tab = await tabManager.createTab({ url: 'https://example.com' });
      
      const result = await tabManager.assignProxyToTab(tab.id, '00000000-0000-4000-a000-000000000001');
      
      expect(result).toBe(true);
      
      const updatedTab = tabManager.getTab(tab.id);
      expect(updatedTab?.proxyId).toBe('00000000-0000-4000-a000-000000000001');
    });

    it('should remove proxy from tab when proxyId is null', async () => {
      const tab = await tabManager.createTab({ 
        url: 'https://example.com',
        proxyId: '00000000-0000-4000-a000-000000000001'
      });
      
      const result = await tabManager.assignProxyToTab(tab.id, null);
      
      expect(result).toBe(true);
      
      const updatedTab = tabManager.getTab(tab.id);
      expect(updatedTab?.proxyId).toBeUndefined();
    });

    it('should emit proxy:assigned event when proxy is assigned', async () => {
      const tab = await tabManager.createTab({ url: 'https://example.com' });
      const eventSpy = vi.fn();
      tabManager.on('proxy:assigned', eventSpy);
      
      await tabManager.assignProxyToTab(tab.id, '00000000-0000-4000-a000-000000000001');
      
      expect(eventSpy).toHaveBeenCalledWith({
        tabId: tab.id,
        proxyId: '00000000-0000-4000-a000-000000000001'
      });
    });

    it('should emit proxy:removed event when proxy is removed', async () => {
      const tab = await tabManager.createTab({ 
        url: 'https://example.com',
        proxyId: '00000000-0000-4000-a000-000000000001'
      });
      const eventSpy = vi.fn();
      tabManager.on('proxy:removed', eventSpy);
      
      await tabManager.assignProxyToTab(tab.id, null);
      
      expect(eventSpy).toHaveBeenCalledWith({ tabId: tab.id });
    });

    it('should return false if tab does not exist', async () => {
      const result = await tabManager.assignProxyToTab('non-existent-tab', '00000000-0000-4000-a000-000000000001');
      
      expect(result).toBe(false);
    });

    it('should handle proxy assignment errors gracefully', async () => {
      const tab = await tabManager.createTab({ url: 'https://example.com' });
      
      // Mock session.setProxy to throw error
      const mockWebContents = getMockWebContents();
      mockWebContents.session.setProxy = vi.fn().mockRejectedValue(new Error('Proxy error'));
      
      const result = await tabManager.assignProxyToTab(tab.id, '00000000-0000-4000-a000-000000000001');
      
      expect(result).toBe(false);
    });

    it('should apply correct proxy protocol (HTTP)', async () => {
      const tab = await tabManager.createTab({ url: 'https://example.com' });
      
      await tabManager.assignProxyToTab(tab.id, '00000000-0000-4000-a000-000000000001');
      
      const mockWebContents = getMockWebContents();
      expect(mockWebContents.session.setProxy).toHaveBeenCalledWith({
        proxyRules: 'http://proxy1.example.com:8080',
        proxyBypassRules: '<local>'
      });
    });

    it('should apply correct proxy protocol (SOCKS5)', async () => {
      const tab = await tabManager.createTab({ url: 'https://example.com' });
      
      await tabManager.assignProxyToTab(tab.id, '00000000-0000-4000-a000-000000000002');
      
      const mockWebContents = getMockWebContents();
      expect(mockWebContents.session.setProxy).toHaveBeenCalledWith({
        proxyRules: 'socks5://proxy2.example.com:1080',
        proxyBypassRules: '<local>'
      });
    });
  });
});

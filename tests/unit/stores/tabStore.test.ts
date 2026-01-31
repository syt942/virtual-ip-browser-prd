/**
 * TabStore Unit Tests
 * Tests for browser tab state management
 * 
 * Coverage targets:
 * - Tab creation with defaults
 * - Tab removal and active tab switching
 * - Tab updates and property changes
 * - Utility actions (setActiveTab, closeAllTabs, duplicateTab)
 * - IPC integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from '@testing-library/react';
import { useTabStore, type Tab } from '../../../src/stores/tabStore';
import { 
  createMockWindowApi, 
  setupWindowApiMock, 
  resetWindowApiMock,
  mockApiError,
  type MockWindowApi 
} from '../../mocks/window-api.mock';

describe('useTabStore', () => {
  let mockApi: MockWindowApi;

  beforeEach(() => {
    mockApi = createMockWindowApi();
    setupWindowApiMock(mockApi);
    
    // Reset store state
    useTabStore.setState({
      tabs: [],
      activeTabId: null,
    });
  });

  afterEach(() => {
    resetWindowApiMock();
    vi.clearAllMocks();
  });

  // ============================================================
  // STATE INITIALIZATION TESTS
  // ============================================================
  describe('state initialization', () => {
    it('initializes with empty tabs array', () => {
      // Act
      const state = useTabStore.getState();

      // Assert
      expect(state.tabs).toEqual([]);
    });

    it('initializes with null activeTabId', () => {
      // Act
      const state = useTabStore.getState();

      // Assert
      expect(state.activeTabId).toBeNull();
    });
  });

  // ============================================================
  // ADD TAB TESTS
  // ============================================================
  describe('addTab', () => {
    it('creates tab with default values', () => {
      // Act
      act(() => {
        useTabStore.getState().addTab({});
      });

      // Assert
      const state = useTabStore.getState();
      expect(state.tabs).toHaveLength(1);
      expect(state.tabs[0].url).toBe('about:blank');
      expect(state.tabs[0].title).toBe('New Tab');
      expect(state.tabs[0].isLoading).toBe(false);
      expect(state.tabs[0].canGoBack).toBe(false);
      expect(state.tabs[0].canGoForward).toBe(false);
    });

    it('creates tab with provided values', () => {
      // Arrange
      const tabData = {
        url: 'https://example.com',
        title: 'Example Site',
        proxyId: '00000000-0000-4000-a000-000000000001',
      };

      // Act
      act(() => {
        useTabStore.getState().addTab(tabData);
      });

      // Assert
      const state = useTabStore.getState();
      expect(state.tabs[0].url).toBe('https://example.com');
      expect(state.tabs[0].title).toBe('Example Site');
      expect(state.tabs[0].proxyId).toBe('00000000-0000-4000-a000-000000000001');
    });

    it('sets new tab as active', () => {
      // Act
      act(() => {
        useTabStore.getState().addTab({ title: 'Tab 1' });
      });

      // Assert
      const state = useTabStore.getState();
      expect(state.activeTabId).toBe(state.tabs[0].id);
    });

    it('sets newest tab as active when multiple tabs exist', () => {
      // Act
      act(() => {
        useTabStore.getState().addTab({ title: 'Tab 1' });
        useTabStore.getState().addTab({ title: 'Tab 2' });
      });

      // Assert
      const state = useTabStore.getState();
      expect(state.tabs).toHaveLength(2);
      expect(state.activeTabId).toBe(state.tabs[1].id);
    });

    it('calls window.api.tab.create', () => {
      // Act
      act(() => {
        useTabStore.getState().addTab({ title: 'Test Tab' });
      });

      // Assert
      expect(mockApi.tab.create).toHaveBeenCalledTimes(1);
      expect(mockApi.tab.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Tab',
        })
      );
    });

    it('generates unique ID for each tab', () => {
      // Act
      act(() => {
        useTabStore.getState().addTab({});
        useTabStore.getState().addTab({});
        useTabStore.getState().addTab({});
      });

      // Assert
      const state = useTabStore.getState();
      const ids = state.tabs.map(t => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(3);
    });

    it('sets createdAt to current date', () => {
      // Arrange
      const before = new Date();

      // Act
      act(() => {
        useTabStore.getState().addTab({});
      });

      // Assert
      const after = new Date();
      const state = useTabStore.getState();
      expect(state.tabs[0].createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(state.tabs[0].createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('uses provided ID if given', () => {
      // Arrange
      const customId = '00000000-0000-4000-a000-customtabid1';

      // Act
      act(() => {
        useTabStore.getState().addTab({ id: customId });
      });

      // Assert
      const state = useTabStore.getState();
      expect(state.tabs[0].id).toBe(customId);
    });
  });

  // ============================================================
  // REMOVE TAB TESTS
  // ============================================================
  describe('removeTab', () => {
    it('removes tab from state', () => {
      // Arrange
      act(() => {
        useTabStore.getState().addTab({ title: 'Tab 1' });
        useTabStore.getState().addTab({ title: 'Tab 2' });
      });
      const tabToRemove = useTabStore.getState().tabs[0];

      // Act
      act(() => {
        useTabStore.getState().removeTab(tabToRemove.id);
      });

      // Assert
      const state = useTabStore.getState();
      expect(state.tabs).toHaveLength(1);
      expect(state.tabs.find(t => t.id === tabToRemove.id)).toBeUndefined();
    });

    it('switches active to next tab when removing active tab', () => {
      // Arrange
      act(() => {
        useTabStore.getState().addTab({ title: 'Tab 1' });
        useTabStore.getState().addTab({ title: 'Tab 2' });
        useTabStore.getState().addTab({ title: 'Tab 3' });
      });
      
      // Set first tab as active
      const firstTab = useTabStore.getState().tabs[0];
      act(() => {
        useTabStore.getState().setActiveTab(firstTab.id);
      });

      // Act - remove active tab
      act(() => {
        useTabStore.getState().removeTab(firstTab.id);
      });

      // Assert
      const state = useTabStore.getState();
      expect(state.activeTabId).toBe(state.tabs[0].id);
    });

    it('switches active to previous tab if at end', () => {
      // Arrange
      act(() => {
        useTabStore.getState().addTab({ title: 'Tab 1' });
        useTabStore.getState().addTab({ title: 'Tab 2' });
      });
      
      // Last tab should be active after adding
      const lastTab = useTabStore.getState().tabs[1];
      expect(useTabStore.getState().activeTabId).toBe(lastTab.id);

      // Act - remove last tab
      act(() => {
        useTabStore.getState().removeTab(lastTab.id);
      });

      // Assert
      const state = useTabStore.getState();
      expect(state.tabs).toHaveLength(1);
      expect(state.activeTabId).toBe(state.tabs[0].id);
    });

    it('sets activeTabId to null when removing last tab', () => {
      // Arrange
      act(() => {
        useTabStore.getState().addTab({ title: 'Only Tab' });
      });
      const onlyTab = useTabStore.getState().tabs[0];

      // Act
      act(() => {
        useTabStore.getState().removeTab(onlyTab.id);
      });

      // Assert
      const state = useTabStore.getState();
      expect(state.tabs).toHaveLength(0);
      expect(state.activeTabId).toBeNull();
    });

    it('calls window.api.tab.close', () => {
      // Arrange
      act(() => {
        useTabStore.getState().addTab({ title: 'Tab 1' });
      });
      const tab = useTabStore.getState().tabs[0];

      // Act
      act(() => {
        useTabStore.getState().removeTab(tab.id);
      });

      // Assert
      expect(mockApi.tab.close).toHaveBeenCalledWith(tab.id);
    });

    it('does not change active tab when removing non-active tab', () => {
      // Arrange
      act(() => {
        useTabStore.getState().addTab({ title: 'Tab 1' });
        useTabStore.getState().addTab({ title: 'Tab 2' });
      });
      
      const activeTab = useTabStore.getState().tabs[1]; // Last added is active
      const nonActiveTab = useTabStore.getState().tabs[0];

      // Act
      act(() => {
        useTabStore.getState().removeTab(nonActiveTab.id);
      });

      // Assert
      const state = useTabStore.getState();
      expect(state.activeTabId).toBe(activeTab.id);
    });
  });

  // ============================================================
  // UPDATE TAB TESTS
  // ============================================================
  describe('updateTab', () => {
    it('updates tab properties', () => {
      // Arrange
      act(() => {
        useTabStore.getState().addTab({ title: 'Original Title' });
      });
      const tab = useTabStore.getState().tabs[0];

      // Act
      act(() => {
        useTabStore.getState().updateTab(tab.id, { 
          title: 'Updated Title',
          url: 'https://updated.com',
        });
      });

      // Assert
      const state = useTabStore.getState();
      expect(state.tabs[0].title).toBe('Updated Title');
      expect(state.tabs[0].url).toBe('https://updated.com');
    });

    it('calls window.api.tab.update', () => {
      // Arrange
      act(() => {
        useTabStore.getState().addTab({ title: 'Test Tab' });
      });
      const tab = useTabStore.getState().tabs[0];
      const updates = { title: 'New Title' };

      // Act
      act(() => {
        useTabStore.getState().updateTab(tab.id, updates);
      });

      // Assert
      expect(mockApi.tab.update).toHaveBeenCalledWith(tab.id, updates);
    });

    it('updates isLoading property', () => {
      // Arrange
      act(() => {
        useTabStore.getState().addTab({});
      });
      const tab = useTabStore.getState().tabs[0];

      // Act
      act(() => {
        useTabStore.getState().updateTab(tab.id, { isLoading: true });
      });

      // Assert
      expect(useTabStore.getState().tabs[0].isLoading).toBe(true);
    });

    it('updates navigation state properties', () => {
      // Arrange
      act(() => {
        useTabStore.getState().addTab({});
      });
      const tab = useTabStore.getState().tabs[0];

      // Act
      act(() => {
        useTabStore.getState().updateTab(tab.id, { 
          canGoBack: true,
          canGoForward: true,
        });
      });

      // Assert
      const state = useTabStore.getState();
      expect(state.tabs[0].canGoBack).toBe(true);
      expect(state.tabs[0].canGoForward).toBe(true);
    });

    it('preserves other properties when updating', () => {
      // Arrange
      act(() => {
        useTabStore.getState().addTab({ 
          title: 'Test',
          url: 'https://example.com',
          proxyId: 'proxy-123',
        });
      });
      const tab = useTabStore.getState().tabs[0];

      // Act
      act(() => {
        useTabStore.getState().updateTab(tab.id, { title: 'New Title' });
      });

      // Assert
      const state = useTabStore.getState();
      expect(state.tabs[0].url).toBe('https://example.com');
      expect(state.tabs[0].proxyId).toBe('proxy-123');
    });
  });

  // ============================================================
  // UTILITY ACTIONS TESTS
  // ============================================================
  describe('setActiveTab', () => {
    it('updates activeTabId', () => {
      // Arrange
      act(() => {
        useTabStore.getState().addTab({ title: 'Tab 1' });
        useTabStore.getState().addTab({ title: 'Tab 2' });
      });
      const firstTab = useTabStore.getState().tabs[0];

      // Act
      act(() => {
        useTabStore.getState().setActiveTab(firstTab.id);
      });

      // Assert
      expect(useTabStore.getState().activeTabId).toBe(firstTab.id);
    });
  });

  describe('getActiveTab', () => {
    it('returns current active tab', () => {
      // Arrange
      act(() => {
        useTabStore.getState().addTab({ title: 'Tab 1' });
        useTabStore.getState().addTab({ title: 'Active Tab' });
      });

      // Act
      const activeTab = useTabStore.getState().getActiveTab();

      // Assert
      expect(activeTab?.title).toBe('Active Tab');
    });

    it('returns undefined when no tabs exist', () => {
      // Act
      const activeTab = useTabStore.getState().getActiveTab();

      // Assert
      expect(activeTab).toBeUndefined();
    });

    it('returns undefined when activeTabId is null', () => {
      // Arrange
      act(() => {
        useTabStore.setState({ tabs: [], activeTabId: null });
      });

      // Act
      const activeTab = useTabStore.getState().getActiveTab();

      // Assert
      expect(activeTab).toBeUndefined();
    });
  });

  describe('closeAllTabs', () => {
    it('removes all tabs from state', () => {
      // Arrange
      act(() => {
        useTabStore.getState().addTab({ title: 'Tab 1' });
        useTabStore.getState().addTab({ title: 'Tab 2' });
        useTabStore.getState().addTab({ title: 'Tab 3' });
      });
      expect(useTabStore.getState().tabs).toHaveLength(3);

      // Act
      act(() => {
        useTabStore.getState().closeAllTabs();
      });

      // Assert
      const state = useTabStore.getState();
      expect(state.tabs).toHaveLength(0);
      expect(state.activeTabId).toBeNull();
    });

    it('calls window.api.tab.close for each tab', () => {
      // Arrange
      act(() => {
        useTabStore.getState().addTab({ title: 'Tab 1' });
        useTabStore.getState().addTab({ title: 'Tab 2' });
      });
      const tabs = useTabStore.getState().tabs;
      mockApi.tab.close.mockClear();

      // Act
      act(() => {
        useTabStore.getState().closeAllTabs();
      });

      // Assert
      expect(mockApi.tab.close).toHaveBeenCalledTimes(2);
      expect(mockApi.tab.close).toHaveBeenCalledWith(tabs[0].id);
      expect(mockApi.tab.close).toHaveBeenCalledWith(tabs[1].id);
    });

    it('handles empty tabs array gracefully', () => {
      // Act & Assert - should not throw
      act(() => {
        useTabStore.getState().closeAllTabs();
      });

      expect(useTabStore.getState().tabs).toHaveLength(0);
    });
  });

  describe('duplicateTab', () => {
    it('creates copy with same url', () => {
      // Arrange
      act(() => {
        useTabStore.getState().addTab({ 
          url: 'https://example.com',
          title: 'Original Tab',
        });
      });
      const originalTab = useTabStore.getState().tabs[0];

      // Act
      act(() => {
        useTabStore.getState().duplicateTab(originalTab.id);
      });

      // Assert
      const state = useTabStore.getState();
      expect(state.tabs).toHaveLength(2);
      expect(state.tabs[1].url).toBe('https://example.com');
    });

    it('creates copy with same title', () => {
      // Arrange
      act(() => {
        useTabStore.getState().addTab({ 
          url: 'https://example.com',
          title: 'Test Title',
        });
      });
      const originalTab = useTabStore.getState().tabs[0];

      // Act
      act(() => {
        useTabStore.getState().duplicateTab(originalTab.id);
      });

      // Assert
      const state = useTabStore.getState();
      expect(state.tabs[1].title).toBe('Test Title');
    });

    it('creates copy with same proxyId', () => {
      // Arrange
      act(() => {
        useTabStore.getState().addTab({ 
          proxyId: 'proxy-123',
        });
      });
      const originalTab = useTabStore.getState().tabs[0];

      // Act
      act(() => {
        useTabStore.getState().duplicateTab(originalTab.id);
      });

      // Assert
      const state = useTabStore.getState();
      expect(state.tabs[1].proxyId).toBe('proxy-123');
    });

    it('generates new ID for duplicate', () => {
      // Arrange
      act(() => {
        useTabStore.getState().addTab({ title: 'Original' });
      });
      const originalTab = useTabStore.getState().tabs[0];

      // Act
      act(() => {
        useTabStore.getState().duplicateTab(originalTab.id);
      });

      // Assert
      const state = useTabStore.getState();
      expect(state.tabs[1].id).not.toBe(originalTab.id);
    });

    it('does nothing for non-existent tab id', () => {
      // Arrange
      act(() => {
        useTabStore.getState().addTab({ title: 'Tab 1' });
      });

      // Act
      act(() => {
        useTabStore.getState().duplicateTab('non-existent-id');
      });

      // Assert
      expect(useTabStore.getState().tabs).toHaveLength(1);
    });

    it('sets duplicate as active tab', () => {
      // Arrange
      act(() => {
        useTabStore.getState().addTab({ title: 'Original' });
      });
      const originalTab = useTabStore.getState().tabs[0];

      // Act
      act(() => {
        useTabStore.getState().duplicateTab(originalTab.id);
      });

      // Assert
      const state = useTabStore.getState();
      expect(state.activeTabId).toBe(state.tabs[1].id);
    });
  });

  // ============================================================
  // ERROR HANDLING TESTS
  // ============================================================
  describe('error handling', () => {
    it('handles API error in addTab gracefully', async () => {
      // Arrange
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockApi.tab.create.mockRejectedValueOnce(new Error('API Error'));

      // Act
      act(() => {
        useTabStore.getState().addTab({ title: 'Test Tab' });
      });

      // Wait for promise rejection
      await new Promise(resolve => setTimeout(resolve, 0));

      // Assert - tab should still be added to local state
      expect(useTabStore.getState().tabs).toHaveLength(1);
      
      consoleSpy.mockRestore();
    });

    it('handles API error in removeTab gracefully', async () => {
      // Arrange
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      act(() => {
        useTabStore.getState().addTab({ title: 'Test Tab' });
      });
      const tab = useTabStore.getState().tabs[0];
      mockApi.tab.close.mockRejectedValueOnce(new Error('API Error'));

      // Act
      act(() => {
        useTabStore.getState().removeTab(tab.id);
      });

      // Wait for promise rejection
      await new Promise(resolve => setTimeout(resolve, 0));

      // Assert - tab should still be removed from local state
      expect(useTabStore.getState().tabs).toHaveLength(0);
      
      consoleSpy.mockRestore();
    });
  });
});

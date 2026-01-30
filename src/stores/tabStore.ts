/**
 * Tab Store
 * Manages browser tab state
 */

import { create } from 'zustand';

export interface Tab {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  proxyId?: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  createdAt: Date;
}

interface TabState {
  tabs: Tab[];
  activeTabId: string | null;
  
  // Actions
  addTab: (tab: Partial<Tab>) => void;
  removeTab: (id: string) => void;
  updateTab: (id: string, updates: Partial<Tab>) => void;
  setActiveTab: (id: string) => void;
  getActiveTab: () => Tab | undefined;
  closeAllTabs: () => void;
  duplicateTab: (id: string) => void;
}

export const useTabStore = create<TabState>((set, get) => ({
  tabs: [],
  activeTabId: null,

  addTab: (tabData) => {
    const newTab: Tab = {
      id: tabData.id || crypto.randomUUID(),
      url: tabData.url || 'about:blank',
      title: tabData.title || 'New Tab',
      favicon: tabData.favicon,
      proxyId: tabData.proxyId,
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
      createdAt: new Date()
    };

    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTabId: newTab.id
    }));

    // Call IPC to create tab in main process
    window.api.tab.create(newTab).catch(console.error);
  },

  removeTab: (id) => {
    set((state) => {
      const newTabs = state.tabs.filter(t => t.id !== id);
      let newActiveId = state.activeTabId;

      // If removing active tab, switch to another
      if (state.activeTabId === id) {
        const index = state.tabs.findIndex(t => t.id === id);
        if (newTabs.length > 0) {
          // Try to activate the next tab, or previous if at end
          newActiveId = newTabs[Math.min(index, newTabs.length - 1)]?.id || null;
        } else {
          newActiveId = null;
        }
      }

      return {
        tabs: newTabs,
        activeTabId: newActiveId
      };
    });

    // Call IPC to close tab in main process
    window.api.tab.close(id).catch(console.error);
  },

  updateTab: (id, updates) => {
    set((state) => ({
      tabs: state.tabs.map(tab =>
        tab.id === id ? { ...tab, ...updates } : tab
      )
    }));

    // Call IPC to update tab in main process
    window.api.tab.update(id, updates).catch(console.error);
  },

  setActiveTab: (id) => {
    set({ activeTabId: id });
  },

  getActiveTab: () => {
    const state = get();
    return state.tabs.find(t => t.id === state.activeTabId);
  },

  closeAllTabs: () => {
    const state = get();
    state.tabs.forEach(tab => {
      window.api.tab.close(tab.id).catch(console.error);
    });
    set({ tabs: [], activeTabId: null });
  },

  duplicateTab: (id) => {
    const state = get();
    const tab = state.tabs.find(t => t.id === id);
    if (tab) {
      state.addTab({
        url: tab.url,
        title: tab.title,
        proxyId: tab.proxyId
      });
    }
  }
}));

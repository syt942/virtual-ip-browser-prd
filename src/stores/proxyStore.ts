/**
 * Proxy Store
 * Manages proxy configurations and rotation
 */

import { create } from 'zustand';

export type ProxyProtocol = 'http' | 'https' | 'socks4' | 'socks5';
export type ProxyStatus = 'active' | 'failed' | 'checking' | 'disabled';
export type RotationStrategy = 
  | 'round-robin'
  | 'random'
  | 'least-used'
  | 'fastest'
  | 'failure-aware'
  | 'weighted';

export interface Proxy {
  id: string;
  name: string;
  host: string;
  port: number;
  protocol: ProxyProtocol;
  username?: string;
  password?: string;
  status: ProxyStatus;
  latency?: number;
  lastChecked?: Date;
  failureCount: number;
  totalRequests: number;
  successRate: number;
  region?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface ProxyState {
  proxies: Proxy[];
  rotationStrategy: RotationStrategy;
  isLoading: boolean;
  
  // Actions
  addProxy: (proxy: Omit<Proxy, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'failureCount' | 'totalRequests' | 'successRate'>) => Promise<void>;
  removeProxy: (id: string) => Promise<void>;
  updateProxy: (id: string, updates: Partial<Proxy>) => Promise<void>;
  validateProxy: (id: string) => Promise<void>;
  setRotationStrategy: (strategy: RotationStrategy) => Promise<void>;
  loadProxies: () => Promise<void>;
  getActiveProxies: () => Proxy[];
  getProxyById: (id: string) => Proxy | undefined;
}

export const useProxyStore = create<ProxyState>((set, get) => ({
  proxies: [],
  rotationStrategy: 'round-robin',
  isLoading: false,

  addProxy: async (proxyData) => {
    try {
      set({ isLoading: true });
      const result = await window.api.proxy.add(proxyData) as { success: boolean; proxy?: Proxy };
      
      if (result.success && result.proxy) {
        set((state) => ({
          proxies: [...state.proxies, result.proxy as Proxy],
          isLoading: false
        }));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[ProxyStore] Failed to add proxy:', errorMessage, {
        host: proxyData.host,
        port: proxyData.port
      });
      set({ isLoading: false });
      // Re-throw to allow UI to handle the error
      throw new Error(`Failed to add proxy: ${errorMessage}`);
    }
  },

  removeProxy: async (id) => {
    try {
      const result = await window.api.proxy.remove(id) as { success: boolean };
      
      if (result.success) {
        set((state) => ({
          proxies: state.proxies.filter(p => p.id !== id)
        }));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[ProxyStore] Failed to remove proxy:', errorMessage, { proxyId: id });
      throw new Error(`Failed to remove proxy: ${errorMessage}`);
    }
  },

  updateProxy: async (id, updates) => {
    try {
      const result = await window.api.proxy.update(id, updates) as { success: boolean; proxy?: Proxy };
      
      if (result.success && result.proxy) {
        set((state) => ({
          proxies: state.proxies.map(p =>
            p.id === id ? (result.proxy as Proxy) : p
          )
        }));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[ProxyStore] Failed to update proxy:', errorMessage, { proxyId: id });
      throw new Error(`Failed to update proxy: ${errorMessage}`);
    }
  },

  validateProxy: async (id) => {
    try {
      // Update status to checking
      set((state) => ({
        proxies: state.proxies.map(p =>
          p.id === id ? { ...p, status: 'checking' as ProxyStatus } : p
        )
      }));

      await window.api.proxy.validate(id);
      
      // Reload proxies to get updated status
      await get().loadProxies();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[ProxyStore] Failed to validate proxy:', errorMessage, { proxyId: id });
      // Update proxy status to failed on validation error
      set((state) => ({
        proxies: state.proxies.map(p =>
          p.id === id ? { ...p, status: 'failed' as ProxyStatus } : p
        )
      }));
    }
  },

  setRotationStrategy: async (strategy) => {
    try {
      await window.api.proxy.setRotation({ strategy });
      set({ rotationStrategy: strategy });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[ProxyStore] Failed to set rotation strategy:', errorMessage, { strategy });
      throw new Error(`Failed to set rotation strategy: ${errorMessage}`);
    }
  },

  loadProxies: async () => {
    try {
      set({ isLoading: true });
      const result = await window.api.proxy.list() as { success: boolean; proxies?: Proxy[] };
      
      if (result.success && result.proxies) {
        set({
          proxies: result.proxies,
          isLoading: false
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[ProxyStore] Failed to load proxies:', errorMessage);
      set({ isLoading: false });
      // Don't throw here - allow UI to show empty state with error notification
    }
  },

  getActiveProxies: () => {
    return get().proxies.filter(p => p.status === 'active');
  },

  getProxyById: (id) => {
    return get().proxies.find(p => p.id === id);
  }
}));

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

/** Input data required to create a new proxy (auto-generated fields excluded) */
type NewProxyInput = Omit<Proxy, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'failureCount' | 'totalRequests' | 'successRate'>;

interface ProxyState {
  // State
  proxyList: Proxy[];
  currentRotationStrategy: RotationStrategy;
  isLoadingProxies: boolean;
  
  // Actions - Proxy CRUD
  createProxy: (proxyInput: NewProxyInput) => Promise<void>;
  deleteProxyById: (proxyId: string) => Promise<void>;
  updateProxyById: (proxyId: string, updates: Partial<Proxy>) => Promise<void>;
  
  // Actions - Proxy Operations
  validateProxyConnection: (proxyId: string) => Promise<void>;
  setProxyRotationStrategy: (strategy: RotationStrategy) => Promise<void>;
  loadProxyListFromBackend: () => Promise<void>;
  
  // Selectors
  selectActiveProxies: () => Proxy[];
  selectProxyById: (proxyId: string) => Proxy | undefined;
}

export const useProxyStore = create<ProxyState>((set, get) => ({
  proxyList: [],
  currentRotationStrategy: 'round-robin',
  isLoadingProxies: false,

  createProxy: async (proxyInput) => {
    try {
      set({ isLoadingProxies: true });
      const result = await window.api.proxy.add(proxyInput) as { success: boolean; proxy?: Proxy };
      
      if (result.success && result.proxy) {
        const createdProxy = result.proxy;
        set((state) => ({
          proxyList: [...state.proxyList, createdProxy],
          isLoadingProxies: false
        }));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[ProxyStore] Failed to create proxy:', errorMessage, {
        host: proxyInput.host,
        port: proxyInput.port
      });
      set({ isLoadingProxies: false });
      throw new Error(`Failed to create proxy: ${errorMessage}`);
    }
  },

  deleteProxyById: async (proxyId) => {
    try {
      const result = await window.api.proxy.remove(proxyId) as { success: boolean };
      
      if (result.success) {
        set((state) => ({
          proxyList: state.proxyList.filter(proxy => proxy.id !== proxyId)
        }));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[ProxyStore] Failed to delete proxy:', errorMessage, { proxyId });
      throw new Error(`Failed to delete proxy: ${errorMessage}`);
    }
  },

  updateProxyById: async (proxyId, updates) => {
    try {
      const result = await window.api.proxy.update(proxyId, updates) as { success: boolean; proxy?: Proxy };
      
      if (result.success && result.proxy) {
        const updatedProxy = result.proxy;
        set((state) => ({
          proxyList: state.proxyList.map(proxy =>
            proxy.id === proxyId ? updatedProxy : proxy
          )
        }));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[ProxyStore] Failed to update proxy:', errorMessage, { proxyId });
      throw new Error(`Failed to update proxy: ${errorMessage}`);
    }
  },

  validateProxyConnection: async (proxyId) => {
    const CHECKING_STATUS: ProxyStatus = 'checking';
    const FAILED_STATUS: ProxyStatus = 'failed';
    
    try {
      set((state) => ({
        proxyList: state.proxyList.map(proxy =>
          proxy.id === proxyId ? { ...proxy, status: CHECKING_STATUS } : proxy
        )
      }));

      await window.api.proxy.validate(proxyId);
      
      await get().loadProxyListFromBackend();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[ProxyStore] Failed to validate proxy connection:', errorMessage, { proxyId });
      
      set((state) => ({
        proxyList: state.proxyList.map(proxy =>
          proxy.id === proxyId ? { ...proxy, status: FAILED_STATUS } : proxy
        )
      }));
    }
  },

  setProxyRotationStrategy: async (strategy) => {
    try {
      await window.api.proxy.setRotation({ strategy });
      set({ currentRotationStrategy: strategy });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[ProxyStore] Failed to set rotation strategy:', errorMessage, { strategy });
      throw new Error(`Failed to set rotation strategy: ${errorMessage}`);
    }
  },

  loadProxyListFromBackend: async () => {
    try {
      set({ isLoadingProxies: true });
      const result = await window.api.proxy.list() as { success: boolean; proxies?: Proxy[] };
      
      if (result.success && result.proxies) {
        set({
          proxyList: result.proxies,
          isLoadingProxies: false
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[ProxyStore] Failed to load proxy list:', errorMessage);
      set({ isLoadingProxies: false });
    }
  },

  selectActiveProxies: () => {
    return get().proxyList.filter(proxy => proxy.status === 'active');
  },

  selectProxyById: (proxyId) => {
    return get().proxyList.find(proxy => proxy.id === proxyId);
  }
}));

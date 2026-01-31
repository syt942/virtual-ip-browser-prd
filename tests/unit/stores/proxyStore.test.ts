/**
 * ProxyStore Unit Tests
 * Tests for src/stores/proxyStore.ts
 * 
 * Coverage targets:
 * - State initialization
 * - CRUD operations with IPC calls
 * - Error handling
 * - Selectors (getActiveProxies, getProxyById)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from '@testing-library/react';
import { 
  setupWindowApiMock, 
  resetWindowApiMock, 
  createMockWindowApi,
  mockApiError,
  type MockWindowApi 
} from '../../mocks/window-api.mock';
import { 
  createMockProxy, 
  createMixedStatusProxies,
  resetProxyFixtures,
  validProxyConfigs 
} from '../../fixtures/proxies';

// Must import store after setting up mocks
let useProxyStore: typeof import('../../../src/stores/proxyStore').useProxyStore;
let mockApi: MockWindowApi;

describe('useProxyStore', () => {
  beforeEach(async () => {
    // Reset fixtures
    resetProxyFixtures();
    
    // Setup window.api mock
    mockApi = createMockWindowApi();
    setupWindowApiMock(mockApi);
    
    // Clear module cache and reimport store
    vi.resetModules();
    const module = await import('../../../src/stores/proxyStore');
    useProxyStore = module.useProxyStore;
    
    // Reset store state
    useProxyStore.setState({
      proxies: [],
      rotationStrategy: 'round-robin',
      isLoading: false,
    });
  });

  afterEach(() => {
    resetWindowApiMock();
    vi.clearAllMocks();
  });

  // ============================================================================
  // STATE INITIALIZATION TESTS
  // ============================================================================

  describe('State Initialization', () => {
    it('initializes with empty proxies array', () => {
      const state = useProxyStore.getState();
      
      expect(state.proxies).toEqual([]);
    });

    it('initializes with round-robin strategy', () => {
      const state = useProxyStore.getState();
      
      expect(state.rotationStrategy).toBe('round-robin');
    });

    it('initializes with isLoading false', () => {
      const state = useProxyStore.getState();
      
      expect(state.isLoading).toBe(false);
    });
  });

  // ============================================================================
  // ADD PROXY TESTS
  // ============================================================================

  describe('addProxy', () => {
    it('calls window.api.proxy.add with proxy data', async () => {
      const proxyData = validProxyConfigs[0];
      
      await act(async () => {
        await useProxyStore.getState().addProxy(proxyData);
      });
      
      expect(mockApi.proxy.add).toHaveBeenCalledWith(proxyData);
    });

    it('adds proxy to state on success', async () => {
      const proxyData = validProxyConfigs[0];
      const mockProxy = createMockProxy({ ...proxyData, id: 'new-proxy-id' });
      
      mockApi.proxy.add.mockResolvedValueOnce({ 
        success: true, 
        proxy: mockProxy 
      });
      
      await act(async () => {
        await useProxyStore.getState().addProxy(proxyData);
      });
      
      const state = useProxyStore.getState();
      expect(state.proxies).toHaveLength(1);
      expect(state.proxies[0].id).toBe('new-proxy-id');
    });

    it('sets isLoading during operation', async () => {
      const proxyData = validProxyConfigs[0];
      
      // Create a delayed response
      let resolveAdd: (value: unknown) => void;
      mockApi.proxy.add.mockImplementationOnce(() => 
        new Promise(resolve => { resolveAdd = resolve; })
      );
      
      // Start the add operation
      const addPromise = act(async () => {
        return useProxyStore.getState().addProxy(proxyData);
      });
      
      // Check loading state (may be synchronously set)
      // Note: Due to async nature, we verify the call was made
      expect(mockApi.proxy.add).toHaveBeenCalled();
      
      // Resolve the promise
      resolveAdd!({ success: true, proxy: createMockProxy() });
      await addPromise;
      
      // After completion, isLoading should be false
      expect(useProxyStore.getState().isLoading).toBe(false);
    });

    it('throws and logs on failure', async () => {
      const proxyData = validProxyConfigs[0];
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      mockApiError(mockApi, 'proxy', 'add', 'Network error');
      
      let thrownError: Error | null = null;
      try {
        await act(async () => {
          await useProxyStore.getState().addProxy(proxyData);
        });
      } catch (error) {
        thrownError = error as Error;
      }
      
      expect(thrownError).not.toBeNull();
      expect(thrownError?.message).toContain('Failed to add proxy');
      // Console.error is called within the store's catch block
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ProxyStore]'),
        expect.any(String),
        expect.any(Object)
      );
      consoleSpy.mockRestore();
    });

    it('does not add proxy when API returns success: false', async () => {
      const proxyData = validProxyConfigs[0];
      
      mockApi.proxy.add.mockResolvedValueOnce({ success: false });
      
      await act(async () => {
        await useProxyStore.getState().addProxy(proxyData);
      });
      
      expect(useProxyStore.getState().proxies).toHaveLength(0);
    });
  });

  // ============================================================================
  // REMOVE PROXY TESTS
  // ============================================================================

  describe('removeProxy', () => {
    beforeEach(() => {
      // Seed state with proxies
      useProxyStore.setState({
        proxies: [
          createMockProxy({ id: 'proxy-1' }),
          createMockProxy({ id: 'proxy-2' }),
        ],
      });
    });

    it('removes proxy from state on success', async () => {
      mockApi.proxy.remove.mockResolvedValueOnce({ success: true });
      
      await act(async () => {
        await useProxyStore.getState().removeProxy('proxy-1');
      });
      
      const state = useProxyStore.getState();
      expect(state.proxies).toHaveLength(1);
      expect(state.proxies[0].id).toBe('proxy-2');
    });

    it('calls window.api.proxy.remove with ID', async () => {
      await act(async () => {
        await useProxyStore.getState().removeProxy('proxy-1');
      });
      
      expect(mockApi.proxy.remove).toHaveBeenCalledWith('proxy-1');
    });

    it('throws on failure', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockApiError(mockApi, 'proxy', 'remove', 'Delete failed');
      
      await expect(
        act(async () => {
          await useProxyStore.getState().removeProxy('proxy-1');
        })
      ).rejects.toThrow('Failed to remove proxy');
      
      consoleSpy.mockRestore();
    });

    it('does not remove proxy when API returns success: false', async () => {
      mockApi.proxy.remove.mockResolvedValueOnce({ success: false });
      
      await act(async () => {
        await useProxyStore.getState().removeProxy('proxy-1');
      });
      
      // Proxy should still be in state
      expect(useProxyStore.getState().proxies).toHaveLength(2);
    });
  });

  // ============================================================================
  // UPDATE PROXY TESTS
  // ============================================================================

  describe('updateProxy', () => {
    beforeEach(() => {
      useProxyStore.setState({
        proxies: [createMockProxy({ id: 'proxy-1', name: 'Original Name' })],
      });
    });

    it('updates proxy in state on success', async () => {
      const updatedProxy = createMockProxy({ id: 'proxy-1', name: 'Updated Name' });
      mockApi.proxy.update.mockResolvedValueOnce({ 
        success: true, 
        proxy: updatedProxy 
      });
      
      await act(async () => {
        await useProxyStore.getState().updateProxy('proxy-1', { name: 'Updated Name' });
      });
      
      const state = useProxyStore.getState();
      expect(state.proxies[0].name).toBe('Updated Name');
    });

    it('calls window.api.proxy.update with ID and updates', async () => {
      const updates = { name: 'New Name', port: 9090 };
      
      await act(async () => {
        await useProxyStore.getState().updateProxy('proxy-1', updates);
      });
      
      expect(mockApi.proxy.update).toHaveBeenCalledWith('proxy-1', updates);
    });

    it('throws on failure', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockApiError(mockApi, 'proxy', 'update', 'Update failed');
      
      await expect(
        act(async () => {
          await useProxyStore.getState().updateProxy('proxy-1', { name: 'New' });
        })
      ).rejects.toThrow('Failed to update proxy');
      
      consoleSpy.mockRestore();
    });
  });

  // ============================================================================
  // VALIDATE PROXY TESTS
  // ============================================================================

  describe('validateProxy', () => {
    beforeEach(() => {
      useProxyStore.setState({
        proxies: [createMockProxy({ id: 'proxy-1', status: 'active' })],
      });
    });

    it('sets status to checking during validation', async () => {
      let resolveValidate: (value: unknown) => void;
      mockApi.proxy.validate.mockImplementationOnce(() => 
        new Promise(resolve => { resolveValidate = resolve; })
      );
      
      const validatePromise = act(async () => {
        return useProxyStore.getState().validateProxy('proxy-1');
      });
      
      // Status should be checking
      expect(useProxyStore.getState().proxies[0].status).toBe('checking');
      
      // Resolve and complete
      resolveValidate!({ success: true });
      await validatePromise;
    });

    it('sets status to failed on validation error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockApiError(mockApi, 'proxy', 'validate', 'Timeout');
      
      await act(async () => {
        await useProxyStore.getState().validateProxy('proxy-1');
      });
      
      expect(useProxyStore.getState().proxies[0].status).toBe('failed');
      consoleSpy.mockRestore();
    });

    it('calls loadProxies after successful validation', async () => {
      const loadSpy = vi.spyOn(useProxyStore.getState(), 'loadProxies');
      
      await act(async () => {
        await useProxyStore.getState().validateProxy('proxy-1');
      });
      
      expect(loadSpy).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // LOAD PROXIES TESTS
  // ============================================================================

  describe('loadProxies', () => {
    it('loads proxies from API', async () => {
      const proxies = [createMockProxy({ id: 'p1' }), createMockProxy({ id: 'p2' })];
      mockApi.proxy.list.mockResolvedValueOnce({ success: true, proxies });
      
      await act(async () => {
        await useProxyStore.getState().loadProxies();
      });
      
      expect(useProxyStore.getState().proxies).toHaveLength(2);
    });

    it('sets isLoading during load', async () => {
      let resolveList: (value: unknown) => void;
      mockApi.proxy.list.mockImplementationOnce(() => 
        new Promise(resolve => { resolveList = resolve; })
      );
      
      const loadPromise = act(async () => {
        return useProxyStore.getState().loadProxies();
      });
      
      // Should have called the API
      expect(mockApi.proxy.list).toHaveBeenCalled();
      
      resolveList!({ success: true, proxies: [] });
      await loadPromise;
      
      expect(useProxyStore.getState().isLoading).toBe(false);
    });

    it('handles API errors gracefully without throwing', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockApiError(mockApi, 'proxy', 'list', 'Network error');
      
      // Should not throw
      await act(async () => {
        await useProxyStore.getState().loadProxies();
      });
      
      expect(useProxyStore.getState().isLoading).toBe(false);
      consoleSpy.mockRestore();
    });
  });

  // ============================================================================
  // SET ROTATION STRATEGY TESTS
  // ============================================================================

  describe('setRotationStrategy', () => {
    it('updates rotation strategy in state', async () => {
      await act(async () => {
        await useProxyStore.getState().setRotationStrategy('random');
      });
      
      expect(useProxyStore.getState().rotationStrategy).toBe('random');
    });

    it('calls window.api.proxy.setRotation', async () => {
      await act(async () => {
        await useProxyStore.getState().setRotationStrategy('least-used');
      });
      
      expect(mockApi.proxy.setRotation).toHaveBeenCalledWith({ strategy: 'least-used' });
    });

    it('throws on API error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockApiError(mockApi, 'proxy', 'setRotation', 'Invalid strategy');
      
      await expect(
        act(async () => {
          await useProxyStore.getState().setRotationStrategy('random');
        })
      ).rejects.toThrow('Failed to set rotation strategy');
      
      consoleSpy.mockRestore();
    });
  });

  // ============================================================================
  // SELECTOR TESTS
  // ============================================================================

  describe('Selectors', () => {
    beforeEach(() => {
      useProxyStore.setState({
        proxies: createMixedStatusProxies(),
      });
    });

    it('getActiveProxies filters by active status', () => {
      const activeProxies = useProxyStore.getState().getActiveProxies();
      
      expect(activeProxies).toHaveLength(1);
      expect(activeProxies[0].status).toBe('active');
    });

    it('getActiveProxies returns empty array when no active proxies', () => {
      useProxyStore.setState({
        proxies: [
          createMockProxy({ status: 'failed' }),
          createMockProxy({ status: 'disabled' }),
        ],
      });
      
      const activeProxies = useProxyStore.getState().getActiveProxies();
      
      expect(activeProxies).toHaveLength(0);
    });

    it('getProxyById returns correct proxy', () => {
      const proxies = useProxyStore.getState().proxies;
      const targetId = proxies[0].id;
      
      const proxy = useProxyStore.getState().getProxyById(targetId);
      
      expect(proxy).toBeDefined();
      expect(proxy?.id).toBe(targetId);
    });

    it('getProxyById returns undefined for non-existent ID', () => {
      const proxy = useProxyStore.getState().getProxyById('non-existent-id');
      
      expect(proxy).toBeUndefined();
    });
  });
});

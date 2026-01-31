/**
 * Window API Mock
 * Mock implementation of window.api for testing Zustand stores
 */

import { vi } from 'vitest';

export interface MockWindowApi {
  proxy: {
    add: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    list: ReturnType<typeof vi.fn>;
    validate: ReturnType<typeof vi.fn>;
    setRotation: ReturnType<typeof vi.fn>;
  };
  tab: {
    create: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    navigate: ReturnType<typeof vi.fn>;
  };
  automation: {
    startSearch: ReturnType<typeof vi.fn>;
    stopSearch: ReturnType<typeof vi.fn>;
    addDomain: ReturnType<typeof vi.fn>;
    addKeyword: ReturnType<typeof vi.fn>;
    getTasks: ReturnType<typeof vi.fn>;
  };
  privacy: {
    setFingerprint: ReturnType<typeof vi.fn>;
    toggleWebRTC: ReturnType<typeof vi.fn>;
    toggleTrackerBlocking: ReturnType<typeof vi.fn>;
  };
}

/**
 * Create a fresh mock window.api object
 */
export function createMockWindowApi(): MockWindowApi {
  return {
    proxy: {
      add: vi.fn().mockResolvedValue({ 
        success: true, 
        proxy: { 
          id: '00000000-0000-4000-a000-000000000001',
          name: 'Test Proxy',
          host: 'test.proxy.com',
          port: 8080,
          protocol: 'https',
          status: 'checking',
          failureCount: 0,
          totalRequests: 0,
          successRate: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        } 
      }),
      remove: vi.fn().mockResolvedValue({ success: true }),
      update: vi.fn().mockResolvedValue({ 
        success: true, 
        proxy: { id: '00000000-0000-4000-a000-000000000001' } 
      }),
      list: vi.fn().mockResolvedValue({ success: true, proxies: [] }),
      validate: vi.fn().mockResolvedValue({ success: true, result: { valid: true, latency: 50 } }),
      setRotation: vi.fn().mockResolvedValue({ success: true }),
    },
    tab: {
      create: vi.fn().mockResolvedValue({ success: true }),
      close: vi.fn().mockResolvedValue({ success: true }),
      update: vi.fn().mockResolvedValue({ success: true }),
      navigate: vi.fn().mockResolvedValue({ success: true }),
    },
    automation: {
      startSearch: vi.fn().mockResolvedValue({ 
        success: true, 
        session: { 
          id: '00000000-0000-4000-a000-000000000002',
          status: 'active',
          tasks: [],
        } 
      }),
      stopSearch: vi.fn().mockResolvedValue({ success: true }),
      addDomain: vi.fn().mockResolvedValue({ success: true }),
      addKeyword: vi.fn().mockResolvedValue({ success: true, task: {} }),
      getTasks: vi.fn().mockResolvedValue({ success: true, tasks: [] }),
    },
    privacy: {
      setFingerprint: vi.fn().mockResolvedValue({ success: true, script: '// protection' }),
      toggleWebRTC: vi.fn().mockResolvedValue({ success: true }),
      toggleTrackerBlocking: vi.fn().mockResolvedValue({ success: true }),
    },
  };
}

/**
 * Setup window.api mock on global object
 */
export function setupWindowApiMock(api: MockWindowApi = createMockWindowApi()): MockWindowApi {
  Object.defineProperty(global, 'window', {
    value: { 
      api,
      // Add crypto for UUID generation in stores
      crypto: {
        randomUUID: () => {
          const hex = Date.now().toString(16).padStart(12, '0');
          return `00000000-0000-4000-a000-${hex}`;
        },
      },
    },
    writable: true,
    configurable: true,
  });
  return api;
}

/**
 * Reset all mocks in window.api
 */
export function resetWindowApiMock(): void {
  const win = global.window as { api?: MockWindowApi };
  if (win?.api) {
    Object.values(win.api).forEach(namespace => {
      if (namespace && typeof namespace === 'object') {
        Object.values(namespace).forEach(fn => {
          if (fn && typeof fn.mockReset === 'function') {
            fn.mockReset();
          }
        });
      }
    });
  }
}

/**
 * Configure mock to return error response
 */
export function mockApiError(
  api: MockWindowApi, 
  namespace: keyof MockWindowApi, 
  method: string, 
  errorMessage: string = 'API Error'
): void {
  const ns = api[namespace] as Record<string, ReturnType<typeof vi.fn>>;
  if (ns && ns[method]) {
    ns[method].mockRejectedValueOnce(new Error(errorMessage));
  }
}

/**
 * Configure mock to return specific success response
 */
export function mockApiSuccess<T>(
  api: MockWindowApi, 
  namespace: keyof MockWindowApi, 
  method: string, 
  data: T
): void {
  const ns = api[namespace] as Record<string, ReturnType<typeof vi.fn>>;
  if (ns && ns[method]) {
    ns[method].mockResolvedValueOnce({ success: true, ...data });
  }
}

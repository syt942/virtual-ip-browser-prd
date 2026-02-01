/**
 * Unit Tests for Tab IPC Handlers
 * Tests for electron/ipc/handlers/tabs.ts
 * 
 * Coverage targets:
 * - tab:assign-proxy handler (P0 - Critical)
 * - Input validation with Zod schemas
 * - Error handling and error responses
 * - Rate limiting behavior
 * - Security (injection, XSS attempts)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ============================================================================
// MOCKS
// ============================================================================

const registeredHandlers = new Map<string, Function>();

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: Function) => {
      registeredHandlers.set(channel, handler);
    }),
    removeHandler: vi.fn((channel: string) => {
      registeredHandlers.delete(channel);
    }),
  },
  BrowserView: vi.fn(),
  BrowserWindow: vi.fn(),
  session: {
    fromPartition: vi.fn(() => ({
      setProxy: vi.fn().mockResolvedValue(undefined),
    })),
  },
}));

// Import after mocks
import { setupTabHandlers } from '../../../../electron/ipc/handlers/tabs';
import { IPC_CHANNELS } from '../../../../electron/ipc/channels';
import { resetIPCRateLimiter } from '../../../../electron/ipc/rate-limiter';

// ============================================================================
// TEST DATA FACTORIES
// ============================================================================

function createValidUUID(): string {
  return '00000000-0000-4000-a000-000000000001';
}

function createMockTabManager() {
  return {
    createTab: vi.fn().mockResolvedValue({
      id: createValidUUID(),
      url: 'https://example.com',
      title: 'Test Tab',
    }),
    closeTab: vi.fn().mockReturnValue(true),
    getAllTabs: vi.fn().mockReturnValue([]),
    updateTab: vi.fn().mockImplementation((id, updates) => ({
      id,
      url: 'https://example.com',
      title: 'Test Tab',
      proxyId: updates.proxyId,
      updatedAt: new Date(),
    })),
    navigate: vi.fn().mockResolvedValue(undefined),
    getTab: vi.fn().mockImplementation((id) => ({
      id,
      url: 'https://example.com',
      title: 'Test Tab',
      proxyId: null,
    })),
  };
}

function createMockProxyManager() {
  return {
    addProxy: vi.fn().mockResolvedValue({ id: createValidUUID() }),
    removeProxy: vi.fn().mockReturnValue(true),
    getAllProxies: vi.fn().mockReturnValue([]),
    validateProxy: vi.fn().mockResolvedValue({ success: true, latency: 100 }),
    setRotationStrategy: vi.fn(),
    getProxy: vi.fn().mockImplementation((id) => ({
      id,
      host: 'proxy.example.com',
      port: 8080,
      protocol: 'https',
      status: 'active',
      hasCredentials: false,
    })),
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function invokeHandler(channel: string, ...args: unknown[]) {
  const handler = registeredHandlers.get(channel);
  if (!handler) {
    throw new Error(`Handler not registered for channel: ${channel}`);
  }
  return handler({}, ...args);
}

// ============================================================================
// TEST SUITES
// ============================================================================

describe('Tab IPC Handlers', () => {
  let mockTabManager: ReturnType<typeof createMockTabManager>;
  let mockProxyManager: ReturnType<typeof createMockProxyManager>;

  beforeEach(() => {
    vi.clearAllMocks();
    registeredHandlers.clear();
    resetIPCRateLimiter();

    mockTabManager = createMockTabManager();
    mockProxyManager = createMockProxyManager();

    setupTabHandlers(mockTabManager as any, mockProxyManager as any);
  });

  afterEach(() => {
    resetIPCRateLimiter();
  });

  // ==========================================================================
  // TAB:ASSIGN_PROXY HANDLER TESTS
  // ==========================================================================
  describe('TAB_ASSIGN_PROXY', () => {
    describe('Success Cases', () => {
      it('should assign proxy to tab with valid IDs', async () => {
        const tabId = createValidUUID();
        const proxyId = '00000000-0000-4000-a000-000000000002';

        const result = await invokeHandler(IPC_CHANNELS.TAB_ASSIGN_PROXY, tabId, proxyId);

        expect(result.success).toBe(true);
        expect(result.tab).toBeDefined();
        expect(result.tab.proxyId).toBe(proxyId);
        expect(mockTabManager.getTab).toHaveBeenCalledWith(tabId);
        expect(mockProxyManager.getProxy).toHaveBeenCalledWith(proxyId);
        expect(mockTabManager.updateTab).toHaveBeenCalledWith(tabId, { proxyId });
      });

      it('should allow assigning null proxy (direct connection)', async () => {
        const tabId = createValidUUID();

        const result = await invokeHandler(IPC_CHANNELS.TAB_ASSIGN_PROXY, tabId, null);

        expect(result.success).toBe(true);
        expect(result.message).toContain('Direct connection');
        expect(mockProxyManager.getProxy).not.toHaveBeenCalled();
        expect(mockTabManager.updateTab).toHaveBeenCalledWith(tabId, { proxyId: undefined });
      });

      it('should return updated tab config after assignment', async () => {
        const tabId = createValidUUID();
        const proxyId = '00000000-0000-4000-a000-000000000002';

        const result = await invokeHandler(IPC_CHANNELS.TAB_ASSIGN_PROXY, tabId, proxyId);

        expect(result.success).toBe(true);
        expect(result.tab).toHaveProperty('id');
        expect(result.tab).toHaveProperty('proxyId');
        expect(result.tab).toHaveProperty('updatedAt');
      });
    });

    describe('Validation Failures', () => {
      it('should reject invalid tab ID format', async () => {
        const invalidTabId = 'not-a-uuid';
        const proxyId = createValidUUID();

        const result = await invokeHandler(IPC_CHANNELS.TAB_ASSIGN_PROXY, invalidTabId, proxyId);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Validation failed');
        expect(mockTabManager.getTab).not.toHaveBeenCalled();
      });

      it('should reject invalid proxy ID format', async () => {
        const tabId = createValidUUID();
        const invalidProxyId = 'invalid-proxy-id';

        const result = await invokeHandler(IPC_CHANNELS.TAB_ASSIGN_PROXY, tabId, invalidProxyId);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Validation failed');
      });

      it('should reject empty tab ID', async () => {
        const result = await invokeHandler(IPC_CHANNELS.TAB_ASSIGN_PROXY, '', createValidUUID());

        expect(result.success).toBe(false);
        expect(result.error).toContain('Validation failed');
      });

      it('should reject undefined inputs', async () => {
        const result = await invokeHandler(IPC_CHANNELS.TAB_ASSIGN_PROXY, undefined, undefined);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Validation failed');
      });
    });

    describe('Error Conditions', () => {
      it('should handle non-existent tab gracefully', async () => {
        mockTabManager.getTab.mockReturnValue(undefined);
        const tabId = createValidUUID();
        const proxyId = '00000000-0000-4000-a000-000000000002';

        const result = await invokeHandler(IPC_CHANNELS.TAB_ASSIGN_PROXY, tabId, proxyId);

        expect(result.success).toBe(false);
        expect(result.error).toContain('not found');
      });

      it('should handle non-existent proxy gracefully', async () => {
        mockProxyManager.getProxy.mockReturnValue(undefined);
        const tabId = createValidUUID();
        const proxyId = '00000000-0000-4000-a000-000000000002';

        const result = await invokeHandler(IPC_CHANNELS.TAB_ASSIGN_PROXY, tabId, proxyId);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Proxy');
        expect(result.error).toContain('not found');
      });

      it('should reject inactive proxy', async () => {
        mockProxyManager.getProxy.mockReturnValue({
          id: '00000000-0000-4000-a000-000000000002',
          status: 'failed',
        });
        const tabId = createValidUUID();
        const proxyId = '00000000-0000-4000-a000-000000000002';

        const result = await invokeHandler(IPC_CHANNELS.TAB_ASSIGN_PROXY, tabId, proxyId);

        expect(result.success).toBe(false);
        expect(result.error).toContain('not active');
      });

      it('should handle updateTab failure', async () => {
        mockTabManager.updateTab.mockReturnValue(undefined);
        const tabId = createValidUUID();
        const proxyId = '00000000-0000-4000-a000-000000000002';

        const result = await invokeHandler(IPC_CHANNELS.TAB_ASSIGN_PROXY, tabId, proxyId);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Failed to update tab');
      });

      it('should handle manager throwing error', async () => {
        mockTabManager.getTab.mockImplementation(() => {
          throw new Error('Internal tab manager error');
        });
        const tabId = createValidUUID();
        const proxyId = '00000000-0000-4000-a000-000000000002';

        const result = await invokeHandler(IPC_CHANNELS.TAB_ASSIGN_PROXY, tabId, proxyId);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Internal tab manager error');
      });
    });

    describe('Rate Limiting', () => {
      it('should enforce rate limits after 50 requests', async () => {
        const tabId = createValidUUID();
        const proxyId = '00000000-0000-4000-a000-000000000002';

        // Make 50 successful requests
        for (let i = 0; i < 50; i++) {
          await invokeHandler(IPC_CHANNELS.TAB_ASSIGN_PROXY, tabId, proxyId);
        }

        // 51st request should be rate limited
        const result = await invokeHandler(IPC_CHANNELS.TAB_ASSIGN_PROXY, tabId, proxyId);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Rate limit exceeded');
        expect(result.retryAfter).toBeGreaterThan(0);
      });
    });

    describe('Security', () => {
      it('should reject XSS in tab ID', async () => {
        const xssTabId = '<script>alert(1)</script>';
        const proxyId = createValidUUID();

        const result = await invokeHandler(IPC_CHANNELS.TAB_ASSIGN_PROXY, xssTabId, proxyId);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Validation failed');
      });

      it('should reject SQL injection in proxy ID', async () => {
        const tabId = createValidUUID();
        const sqlInjection = "'; DROP TABLE proxies; --";

        const result = await invokeHandler(IPC_CHANNELS.TAB_ASSIGN_PROXY, tabId, sqlInjection);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Validation failed');
      });

      it('should reject null byte injection', async () => {
        const tabId = createValidUUID();
        const nullByteId = '00000000-0000-4000-a000-0000\x0000000002';

        const result = await invokeHandler(IPC_CHANNELS.TAB_ASSIGN_PROXY, tabId, nullByteId);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Validation failed');
      });

      it('should reject path traversal in IDs', async () => {
        const tabId = '../../../etc/passwd';
        const proxyId = createValidUUID();

        const result = await invokeHandler(IPC_CHANNELS.TAB_ASSIGN_PROXY, tabId, proxyId);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Validation failed');
      });
    });

    describe('Edge Cases', () => {
      it('should handle concurrent requests for same tab', async () => {
        const tabId = createValidUUID();
        const proxyIds = [
          '00000000-0000-4000-a000-000000000002',
          '00000000-0000-4000-a000-000000000003',
          '00000000-0000-4000-a000-000000000004',
        ];

        const promises = proxyIds.map(proxyId =>
          invokeHandler(IPC_CHANNELS.TAB_ASSIGN_PROXY, tabId, proxyId)
        );

        const results = await Promise.all(promises);

        // All should succeed (last write wins)
        results.forEach(result => {
          expect(result.success).toBe(true);
        });
      });

      it('should handle reassigning same proxy', async () => {
        const tabId = createValidUUID();
        const proxyId = '00000000-0000-4000-a000-000000000002';

        // First assignment
        const result1 = await invokeHandler(IPC_CHANNELS.TAB_ASSIGN_PROXY, tabId, proxyId);
        expect(result1.success).toBe(true);

        // Reassign same proxy
        const result2 = await invokeHandler(IPC_CHANNELS.TAB_ASSIGN_PROXY, tabId, proxyId);
        expect(result2.success).toBe(true);
      });

      it('should handle switching from proxy to direct connection', async () => {
        const tabId = createValidUUID();
        const proxyId = '00000000-0000-4000-a000-000000000002';

        // Assign proxy
        const result1 = await invokeHandler(IPC_CHANNELS.TAB_ASSIGN_PROXY, tabId, proxyId);
        expect(result1.success).toBe(true);

        // Switch to direct connection
        const result2 = await invokeHandler(IPC_CHANNELS.TAB_ASSIGN_PROXY, tabId, null);
        expect(result2.success).toBe(true);
        expect(result2.message).toContain('Direct connection');
      });
    });
  });
});

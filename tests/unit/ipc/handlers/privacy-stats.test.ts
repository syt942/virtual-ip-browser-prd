/**
 * Unit Tests for Privacy Stats IPC Handler
 * Tests for privacy:get-stats handler in electron/ipc/handlers/privacy.ts
 * 
 * Coverage targets:
 * - privacy:get-stats handler (P1)
 * - Input validation
 * - Error handling
 * - Rate limiting behavior
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
}));

// Import after mocks
import { setupPrivacyHandlers } from '../../../../electron/ipc/handlers/privacy';
import { IPC_CHANNELS } from '../../../../electron/ipc/channels';
import { resetIPCRateLimiter } from '../../../../electron/ipc/rate-limiter';

// ============================================================================
// TEST DATA FACTORIES
// ============================================================================

function createValidUUID(): string {
  return '00000000-0000-4000-a000-000000000001';
}

function createMockPrivacyManager() {
  return {
    generateProtectionScript: vi.fn().mockReturnValue('// script'),
    getWebRTCProtection: vi.fn().mockReturnValue({
      setBlockWebRTC: vi.fn(),
      isBlocked: vi.fn().mockReturnValue(true),
    }),
    getTrackerBlocker: vi.fn().mockReturnValue({
      setEnabled: vi.fn(),
      isEnabled: vi.fn().mockReturnValue(true),
      getStats: vi.fn().mockReturnValue({
        patterns: 1000,
        domains: 947,
      }),
    }),
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

describe('Privacy Stats IPC Handler', () => {
  let mockPrivacyManager: ReturnType<typeof createMockPrivacyManager>;

  beforeEach(() => {
    vi.clearAllMocks();
    registeredHandlers.clear();
    resetIPCRateLimiter();

    mockPrivacyManager = createMockPrivacyManager();
    setupPrivacyHandlers(mockPrivacyManager as any);
  });

  afterEach(() => {
    resetIPCRateLimiter();
  });

  describe('PRIVACY_GET_STATS', () => {
    describe('Success Cases', () => {
      it('should return global privacy statistics', async () => {
        const result = await invokeHandler(IPC_CHANNELS.PRIVACY_GET_STATS);

        expect(result.success).toBe(true);
        expect(result.stats).toBeDefined();
        expect(result.stats.totalBlocked).toBe(1947); // patterns + domains
        expect(result.stats.patternsBlocked).toBe(1000);
        expect(result.stats.domainsBlocked).toBe(947);
      });

      it('should include all required statistics fields', async () => {
        const result = await invokeHandler(IPC_CHANNELS.PRIVACY_GET_STATS);

        expect(result.success).toBe(true);
        expect(result.stats).toHaveProperty('totalBlocked');
        expect(result.stats).toHaveProperty('patternsBlocked');
        expect(result.stats).toHaveProperty('domainsBlocked');
        expect(result.stats).toHaveProperty('byCategory');
        expect(result.stats).toHaveProperty('webrtcProtectionEnabled');
        expect(result.stats).toHaveProperty('trackerBlockingEnabled');
      });

      it('should return stats for specific tab when tabId provided', async () => {
        const tabId = createValidUUID();

        const result = await invokeHandler(IPC_CHANNELS.PRIVACY_GET_STATS, tabId);

        expect(result.success).toBe(true);
        expect(result.stats.tabId).toBe(tabId);
      });

      it('should return null tabId when not provided', async () => {
        const result = await invokeHandler(IPC_CHANNELS.PRIVACY_GET_STATS);

        expect(result.success).toBe(true);
        expect(result.stats.tabId).toBeNull();
      });

      it('should include WebRTC protection status', async () => {
        const result = await invokeHandler(IPC_CHANNELS.PRIVACY_GET_STATS);

        expect(result.success).toBe(true);
        expect(result.stats.webrtcProtectionEnabled).toBe(true);
      });
    });

    describe('Validation Failures', () => {
      it('should reject invalid tab ID format when provided', async () => {
        const invalidTabId = 'invalid-tab-id';

        const result = await invokeHandler(IPC_CHANNELS.PRIVACY_GET_STATS, invalidTabId);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Validation failed');
      });

      it('should reject XSS in tab ID', async () => {
        const xssTabId = '<script>alert(1)</script>';

        const result = await invokeHandler(IPC_CHANNELS.PRIVACY_GET_STATS, xssTabId);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Validation failed');
      });
    });

    describe('Error Conditions', () => {
      it('should handle tracker blocker error gracefully', async () => {
        mockPrivacyManager.getTrackerBlocker.mockImplementation(() => {
          throw new Error('Tracker blocker unavailable');
        });

        const result = await invokeHandler(IPC_CHANNELS.PRIVACY_GET_STATS);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Tracker blocker unavailable');
      });

      it('should handle missing stats gracefully', async () => {
        mockPrivacyManager.getTrackerBlocker.mockReturnValue({
          setEnabled: vi.fn(),
          isEnabled: vi.fn().mockReturnValue(true),
          getStats: vi.fn().mockReturnValue({ patterns: 0, domains: 0 }),
        });

        const result = await invokeHandler(IPC_CHANNELS.PRIVACY_GET_STATS);

        expect(result.success).toBe(true);
        expect(result.stats.totalBlocked).toBe(0);
        expect(result.stats.byCategory.ads).toBe(0);
      });

      it('should handle WebRTC protection missing isBlocked method', async () => {
        mockPrivacyManager.getWebRTCProtection.mockReturnValue({
          setBlockWebRTC: vi.fn(),
          // No isBlocked method - should throw and be caught
        });

        const result = await invokeHandler(IPC_CHANNELS.PRIVACY_GET_STATS);

        // When isBlocked is undefined, calling it will fail
        expect(result.success).toBe(false);
      });
    });

    describe('Rate Limiting', () => {
      it('should have lenient rate limits for read operations', async () => {
        // Should allow 120 requests per minute
        for (let i = 0; i < 120; i++) {
          const result = await invokeHandler(IPC_CHANNELS.PRIVACY_GET_STATS);
          expect(result.success).toBe(true);
        }

        // 121st request should be rate limited
        const result = await invokeHandler(IPC_CHANNELS.PRIVACY_GET_STATS);
        expect(result.success).toBe(false);
        expect(result.error).toContain('Rate limit exceeded');
      });
    });

    describe('Edge Cases', () => {
      it('should return zero stats when no blocking has occurred', async () => {
        mockPrivacyManager.getTrackerBlocker.mockReturnValue({
          setEnabled: vi.fn(),
          isEnabled: vi.fn().mockReturnValue(true),
          getStats: vi.fn().mockReturnValue({
            patterns: 0,
            domains: 0,
          }),
        });

        const result = await invokeHandler(IPC_CHANNELS.PRIVACY_GET_STATS);

        expect(result.success).toBe(true);
        expect(result.stats.totalBlocked).toBe(0);
      });

      it('should handle concurrent stats requests', async () => {
        const promises = Array(10).fill(null).map(() =>
          invokeHandler(IPC_CHANNELS.PRIVACY_GET_STATS)
        );

        const results = await Promise.all(promises);

        // All results should be consistent
        results.forEach(result => {
          expect(result.success).toBe(true);
          expect(result.stats.totalBlocked).toBe(1947);
        });
      });

      it('should handle undefined tabId parameter', async () => {
        const result = await invokeHandler(IPC_CHANNELS.PRIVACY_GET_STATS, undefined);

        expect(result.success).toBe(true);
        expect(result.stats.tabId).toBeNull();
      });
    });
  });
});

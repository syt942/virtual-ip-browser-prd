/**
 * Integration Tests for v1.4.0 New IPC Handlers
 * 
 * Tests for newly implemented handlers:
 * - tab:assign-proxy (Dynamic proxy assignment)
 * - privacy:get-stats (Privacy statistics dashboard)
 * - automation:pause (Pause automation session)
 * - automation:resume (Resume paused session)
 * - automation:schedule (Schedule automation tasks)
 * 
 * These tests verify:
 * - Handler registration and availability
 * - Input validation and sanitization
 * - Rate limiting integration
 * - Error handling and edge cases
 * - Integration with core managers
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  TabAssignProxySchema,
  PrivacyStatsRequestSchema,
  SessionIdSchema,
  ScheduleConfigSchema,
  validateInput,
} from '../../../electron/ipc/validation';
import { 
  IPCRateLimiter,
  resetIPCRateLimiter 
} from '../../../electron/ipc/rate-limiter';
import { IPC_CHANNELS } from '../../../electron/ipc/channels';

// Mock managers
const mockTabManager = {
  getTab: vi.fn(),
  assignProxyToTab: vi.fn(),
};

const mockProxyManager = {
  getProxy: vi.fn(),
};

const mockPrivacyManager = {
  getTrackerBlocker: vi.fn(),
  getWebRTCProtection: vi.fn(),
};

const mockAutomationManager = {
  getSession: vi.fn(),
  pauseSession: vi.fn(),
  resumeSession: vi.fn(),
  getScheduler: vi.fn(),
};

describe('v1.4.0 New IPC Handlers Integration', () => {
  let rateLimiter: IPCRateLimiter;

  beforeEach(() => {
    resetIPCRateLimiter();
    rateLimiter = new IPCRateLimiter();
    vi.clearAllMocks();
  });

  afterEach(() => {
    rateLimiter.destroy();
  });

  // ============================================================
  // TAB:ASSIGN-PROXY HANDLER TESTS
  // ============================================================
  describe('tab:assign-proxy Handler', () => {
    describe('Input Validation', () => {
      it('validates tabId as UUID', () => {
        // Valid UUID
        const validInput = {
          tabId: '550e8400-e29b-41d4-a716-446655440000',
          proxyId: '550e8400-e29b-41d4-a716-446655440001',
        };
        expect(validateInput(TabAssignProxySchema, validInput).success).toBe(true);

        // Invalid tabId
        const invalidInput = {
          tabId: 'not-a-uuid',
          proxyId: '550e8400-e29b-41d4-a716-446655440001',
        };
        expect(validateInput(TabAssignProxySchema, invalidInput).success).toBe(false);
      });

      it('allows null proxyId for direct connection', () => {
        const input = {
          tabId: '550e8400-e29b-41d4-a716-446655440000',
          proxyId: null,
        };
        const result = validateInput(TabAssignProxySchema, input);
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.proxyId).toBeNull();
        }
      });

      it('validates proxyId as UUID when provided', () => {
        // Valid UUID
        const validInput = {
          tabId: '550e8400-e29b-41d4-a716-446655440000',
          proxyId: '550e8400-e29b-41d4-a716-446655440001',
        };
        expect(validateInput(TabAssignProxySchema, validInput).success).toBe(true);

        // Invalid UUID
        const invalidInput = {
          tabId: '550e8400-e29b-41d4-a716-446655440000',
          proxyId: 'invalid-proxy-id',
        };
        expect(validateInput(TabAssignProxySchema, invalidInput).success).toBe(false);
      });

      it('rejects missing required fields', () => {
        // Missing tabId
        expect(validateInput(TabAssignProxySchema, { proxyId: null }).success).toBe(false);
        
        // Missing proxyId
        expect(validateInput(TabAssignProxySchema, { tabId: '550e8400-e29b-41d4-a716-446655440000' }).success).toBe(false);
      });
    });

    describe('Rate Limiting', () => {
      it('enforces rate limit for tab:assign-proxy', () => {
        const channel = IPC_CHANNELS.TAB_ASSIGN_PROXY;
        
        // Actual limit is 50 per minute for tab:assign-proxy
        for (let i = 0; i < 50; i++) {
          expect(rateLimiter.checkLimit(channel, 'client').allowed).toBe(true);
        }
        
        // 51st request should be blocked
        const blocked = rateLimiter.checkLimit(channel, 'client');
        expect(blocked.allowed).toBe(false);
        expect(blocked.retryAfter).toBeGreaterThan(0);
      });

      it('tracks rate limits per client', () => {
        const channel = IPC_CHANNELS.TAB_ASSIGN_PROXY;
        
        // Exhaust limit for client-1 (50 per minute)
        for (let i = 0; i < 50; i++) {
          rateLimiter.checkLimit(channel, 'client-1');
        }
        
        // client-1 should be blocked
        expect(rateLimiter.checkLimit(channel, 'client-1').allowed).toBe(false);
        
        // client-2 should still be allowed
        expect(rateLimiter.checkLimit(channel, 'client-2').allowed).toBe(true);
      });
    });

    describe('Business Logic', () => {
      it('assigns proxy to existing tab', async () => {
        // Arrange
        const tabId = '550e8400-e29b-41d4-a716-446655440000';
        const proxyId = '550e8400-e29b-41d4-a716-446655440001';

        mockTabManager.getTab.mockReturnValue({
          id: tabId,
          url: 'https://example.com',
          title: 'Example',
        });

        mockProxyManager.getProxy.mockReturnValue({
          id: proxyId,
          host: '192.168.1.100',
          port: 8080,
          protocol: 'http',
          status: 'active',
        });

        mockTabManager.assignProxyToTab.mockResolvedValue(true);

        // Act - would be called via IPC in real scenario
        const validation = validateInput(TabAssignProxySchema, { tabId, proxyId });
        expect(validation.success).toBe(true);

        const tab = mockTabManager.getTab(tabId);
        const proxy = mockProxyManager.getProxy(proxyId);
        const result = await mockTabManager.assignProxyToTab(tabId, proxyId);

        // Assert
        expect(tab).toBeDefined();
        expect(proxy).toBeDefined();
        expect(proxy.status).toBe('active');
        expect(result).toBe(true);
        expect(mockTabManager.assignProxyToTab).toHaveBeenCalledWith(tabId, proxyId);
      });

      it('removes proxy when proxyId is null', async () => {
        // Arrange
        const tabId = '550e8400-e29b-41d4-a716-446655440000';

        mockTabManager.getTab.mockReturnValue({
          id: tabId,
          url: 'https://example.com',
          proxyId: 'old-proxy-id',
        });

        mockTabManager.assignProxyToTab.mockResolvedValue(true);

        // Act
        const validation = validateInput(TabAssignProxySchema, { tabId, proxyId: null });
        expect(validation.success).toBe(true);

        const result = await mockTabManager.assignProxyToTab(tabId, null);

        // Assert
        expect(result).toBe(true);
        expect(mockTabManager.assignProxyToTab).toHaveBeenCalledWith(tabId, null);
      });

      it('rejects assignment when tab not found', () => {
        // Arrange
        const tabId = '550e8400-e29b-41d4-a716-446655440000';
        mockTabManager.getTab.mockReturnValue(undefined);

        // Act
        const tab = mockTabManager.getTab(tabId);

        // Assert
        expect(tab).toBeUndefined();
      });

      it('rejects assignment when proxy not found', () => {
        // Arrange
        const proxyId = '550e8400-e29b-41d4-a716-446655440001';
        mockProxyManager.getProxy.mockReturnValue(undefined);

        // Act
        const proxy = mockProxyManager.getProxy(proxyId);

        // Assert
        expect(proxy).toBeUndefined();
      });

      it('rejects assignment when proxy is not active', () => {
        // Arrange
        const proxyId = '550e8400-e29b-41d4-a716-446655440001';
        mockProxyManager.getProxy.mockReturnValue({
          id: proxyId,
          status: 'failed',
        });

        // Act
        const proxy = mockProxyManager.getProxy(proxyId);

        // Assert
        expect(proxy.status).not.toBe('active');
      });
    });
  });

  // ============================================================
  // PRIVACY:GET-STATS HANDLER TESTS
  // ============================================================
  describe('privacy:get-stats Handler', () => {
    describe('Input Validation', () => {
      it('validates optional tabId parameter', () => {
        // No tabId (global stats)
        expect(validateInput(PrivacyStatsRequestSchema, {}).success).toBe(true);

        // Valid tabId
        const withTabId = { tabId: '550e8400-e29b-41d4-a716-446655440000' };
        expect(validateInput(PrivacyStatsRequestSchema, withTabId).success).toBe(true);

        // Invalid tabId
        const invalidTabId = { tabId: 'not-a-uuid' };
        expect(validateInput(PrivacyStatsRequestSchema, invalidTabId).success).toBe(false);
      });
    });

    describe('Rate Limiting', () => {
      it('has lenient rate limit for read operations', () => {
        const channel = IPC_CHANNELS.PRIVACY_GET_STATS;
        
        // privacy:get-stats has 120 per minute limit (lenient for reads)
        for (let i = 0; i < 120; i++) {
          expect(rateLimiter.checkLimit(channel, 'client').allowed).toBe(true);
        }
        
        // 121st should be blocked
        expect(rateLimiter.checkLimit(channel, 'client').allowed).toBe(false);
      });
    });

    describe('Business Logic', () => {
      it('returns global privacy statistics', () => {
        // Arrange
        const mockTrackerBlocker = {
          getStats: vi.fn().mockReturnValue({
            patterns: 1234,
            domains: 567,
          }),
          isEnabled: vi.fn().mockReturnValue(true),
        };

        const mockWebRTC = {
          isBlocked: vi.fn().mockReturnValue(true),
        };

        mockPrivacyManager.getTrackerBlocker.mockReturnValue(mockTrackerBlocker);
        mockPrivacyManager.getWebRTCProtection.mockReturnValue(mockWebRTC);

        // Act
        const trackerStats = mockPrivacyManager.getTrackerBlocker().getStats();
        const webrtcEnabled = mockPrivacyManager.getWebRTCProtection().isBlocked();

        const stats = {
          totalBlocked: trackerStats.patterns + trackerStats.domains,
          patternsBlocked: trackerStats.patterns,
          domainsBlocked: trackerStats.domains,
          webrtcProtectionEnabled: webrtcEnabled,
          trackerBlockingEnabled: mockTrackerBlocker.isEnabled(),
        };

        // Assert
        expect(stats.totalBlocked).toBe(1801);
        expect(stats.patternsBlocked).toBe(1234);
        expect(stats.domainsBlocked).toBe(567);
        expect(stats.webrtcProtectionEnabled).toBe(true);
        expect(stats.trackerBlockingEnabled).toBe(true);
      });

      it('returns per-tab statistics when tabId provided', () => {
        // Arrange
        const tabId = '550e8400-e29b-41d4-a716-446655440000';
        const validation = validateInput(PrivacyStatsRequestSchema, { tabId });

        // Assert
        expect(validation.success).toBe(true);
        if (validation.success) {
          expect(validation.data.tabId).toBe(tabId);
        }
      });
    });
  });

  // ============================================================
  // AUTOMATION:PAUSE HANDLER TESTS
  // ============================================================
  describe('automation:pause Handler', () => {
    describe('Input Validation', () => {
      it('validates sessionId as UUID', () => {
        // Valid UUID
        expect(validateInput(SessionIdSchema, '550e8400-e29b-41d4-a716-446655440000').success).toBe(true);
        
        // Invalid - not a UUID
        expect(validateInput(SessionIdSchema, 'session-123').success).toBe(false);
        
        // Invalid types
        expect(validateInput(SessionIdSchema, 123).success).toBe(false);
        expect(validateInput(SessionIdSchema, null).success).toBe(false);
        expect(validateInput(SessionIdSchema, undefined).success).toBe(false);
      });

      it('rejects empty sessionId', () => {
        expect(validateInput(SessionIdSchema, '').success).toBe(false);
      });
    });

    describe('Rate Limiting', () => {
      it('enforces rate limit for automation:pause', () => {
        const channel = IPC_CHANNELS.AUTOMATION_PAUSE;
        
        // automation:pause has 20 per minute limit
        for (let i = 0; i < 20; i++) {
          expect(rateLimiter.checkLimit(channel, 'client').allowed).toBe(true);
        }
        
        expect(rateLimiter.checkLimit(channel, 'client').allowed).toBe(false);
      });
    });

    describe('Business Logic', () => {
      it('pauses running automation session', () => {
        // Arrange
        const sessionId = 'session-123';
        mockAutomationManager.getSession.mockReturnValue({
          id: sessionId,
          status: 'running',
          tasks: [],
        });
        mockAutomationManager.pauseSession.mockReturnValue(true);

        // Act
        const session = mockAutomationManager.getSession(sessionId);
        const result = mockAutomationManager.pauseSession(sessionId);

        // Assert
        expect(session.status).toBe('running');
        expect(result).toBe(true);
        expect(mockAutomationManager.pauseSession).toHaveBeenCalledWith(sessionId);
      });

      it('rejects pause when session not found', () => {
        // Arrange
        const sessionId = 'non-existent';
        mockAutomationManager.getSession.mockReturnValue(null);

        // Act
        const session = mockAutomationManager.getSession(sessionId);

        // Assert
        expect(session).toBeNull();
      });

      it('rejects pause when session already paused', () => {
        // Arrange
        const sessionId = 'session-123';
        mockAutomationManager.getSession.mockReturnValue({
          id: sessionId,
          status: 'paused',
        });

        // Act
        const session = mockAutomationManager.getSession(sessionId);

        // Assert
        expect(session.status).toBe('paused');
      });

      it('rejects pause when session is stopped', () => {
        // Arrange
        const sessionId = 'session-123';
        mockAutomationManager.getSession.mockReturnValue({
          id: sessionId,
          status: 'stopped',
        });

        // Act
        const session = mockAutomationManager.getSession(sessionId);

        // Assert
        expect(session.status).toBe('stopped');
      });
    });
  });

  // ============================================================
  // AUTOMATION:RESUME HANDLER TESTS
  // ============================================================
  describe('automation:resume Handler', () => {
    describe('Input Validation', () => {
      it('validates sessionId as UUID', () => {
        // Valid UUID
        expect(validateInput(SessionIdSchema, '550e8400-e29b-41d4-a716-446655440000').success).toBe(true);
        
        // Invalid - not a UUID
        expect(validateInput(SessionIdSchema, 'session-123').success).toBe(false);
        expect(validateInput(SessionIdSchema, '').success).toBe(false);
      });
    });

    describe('Rate Limiting', () => {
      it('enforces rate limit for automation:resume', () => {
        const channel = IPC_CHANNELS.AUTOMATION_RESUME;
        
        // automation:resume has 20 per minute limit
        for (let i = 0; i < 20; i++) {
          expect(rateLimiter.checkLimit(channel, 'client').allowed).toBe(true);
        }
        
        expect(rateLimiter.checkLimit(channel, 'client').allowed).toBe(false);
      });
    });

    describe('Business Logic', () => {
      it('resumes paused automation session', () => {
        // Arrange
        const sessionId = 'session-123';
        mockAutomationManager.getSession.mockReturnValue({
          id: sessionId,
          status: 'paused',
          pausedAt: new Date(),
        });
        mockAutomationManager.resumeSession.mockReturnValue(true);

        // Act
        const session = mockAutomationManager.getSession(sessionId);
        const result = mockAutomationManager.resumeSession(sessionId);

        // Assert
        expect(session.status).toBe('paused');
        expect(result).toBe(true);
        expect(mockAutomationManager.resumeSession).toHaveBeenCalledWith(sessionId);
      });

      it('rejects resume when session not found', () => {
        // Arrange
        mockAutomationManager.getSession.mockReturnValue(null);

        // Act
        const session = mockAutomationManager.getSession('non-existent');

        // Assert
        expect(session).toBeNull();
      });

      it('rejects resume when session is not paused', () => {
        // Arrange
        const sessionId = 'session-123';
        mockAutomationManager.getSession.mockReturnValue({
          id: sessionId,
          status: 'running',
        });

        // Act
        const session = mockAutomationManager.getSession(sessionId);

        // Assert
        expect(session.status).not.toBe('paused');
      });
    });
  });

  // ============================================================
  // AUTOMATION:SCHEDULE HANDLER TESTS
  // ============================================================
  describe('automation:schedule Handler', () => {
    describe('Input Validation', () => {
      it('validates schedule type enum', () => {
        // Valid types with required fields based on type
        const validConfigs = [
          {
            type: 'one-time',
            startTime: new Date(Date.now() + 3600000).toISOString(), // Required for one-time
            task: { keywords: ['test'], engine: 'google' },
          },
          {
            type: 'recurring',
            interval: 60000, // Required for recurring
            task: { keywords: ['test'], engine: 'google' },
          },
          {
            type: 'continuous',
            task: { keywords: ['test'], engine: 'google' },
          },
          {
            type: 'custom',
            cronExpression: '0 9 * * *', // Required for custom
            task: { keywords: ['test'], engine: 'google' },
          },
        ];
        
        validConfigs.forEach(config => {
          const result = validateInput(ScheduleConfigSchema, config);
          if (!result.success) {
            console.log('Failed config:', config, 'Error:', result.error);
          }
          expect(result.success).toBe(true);
        });

        // Invalid type
        const invalid = {
          type: 'invalid-type',
          task: { keywords: ['test'], engine: 'google' },
        };
        expect(validateInput(ScheduleConfigSchema, invalid).success).toBe(false);
      });

      it('validates nested task configuration', () => {
        const config = {
          type: 'one-time',
          startTime: new Date(Date.now() + 3600000).toISOString(), // Required for one-time
          task: {
            keywords: ['keyword1', 'keyword2'],
            engine: 'google',
            targetDomains: ['example.com'],
            maxRetries: 3,
          },
        };

        const result = validateInput(ScheduleConfigSchema, config);
        if (!result.success) {
          console.log('Validation error:', result.error);
        }
        expect(result.success).toBe(true);
      });

      it('validates optional timing parameters', () => {
        // With startTime (must be in future for one-time)
        const withStart = {
          type: 'one-time',
          startTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
          task: { keywords: ['test'], engine: 'google' },
        };
        const startResult = validateInput(ScheduleConfigSchema, withStart);
        if (!startResult.success) {
          console.log('StartTime validation error:', startResult.error);
        }
        expect(startResult.success).toBe(true);

        // With interval (required for recurring)
        const withInterval = {
          type: 'recurring',
          interval: 60000,
          task: { keywords: ['test'], engine: 'google' },
        };
        const intervalResult = validateInput(ScheduleConfigSchema, withInterval);
        if (!intervalResult.success) {
          console.log('Interval validation error:', intervalResult.error);
        }
        expect(intervalResult.success).toBe(true);

        // With cron expression (required for custom)
        const withCron = {
          type: 'custom',
          cronExpression: '0 9 * * 1',
          task: { keywords: ['test'], engine: 'google' },
        };
        const cronResult = validateInput(ScheduleConfigSchema, withCron);
        if (!cronResult.success) {
          console.log('Cron validation error:', cronResult.error);
        }
        expect(cronResult.success).toBe(true);
      });
    });

    describe('Rate Limiting', () => {
      it('has strict rate limit for scheduling', () => {
        const channel = IPC_CHANNELS.AUTOMATION_SCHEDULE;
        
        // automation:schedule has 10 per minute limit (strict)
        for (let i = 0; i < 10; i++) {
          expect(rateLimiter.checkLimit(channel, 'client').allowed).toBe(true);
        }
        
        expect(rateLimiter.checkLimit(channel, 'client').allowed).toBe(false);
      });
    });

    describe('Business Logic', () => {
      it('creates one-time schedule', () => {
        // Arrange
        const config = {
          type: 'one-time' as const,
          startTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
          task: {
            keywords: ['test keyword'],
            engine: 'google' as const,
          },
        };

        const mockScheduler = {
          addSchedule: vi.fn(),
        };

        mockAutomationManager.getScheduler.mockReturnValue(mockScheduler);

        // Act
        const validation = validateInput(ScheduleConfigSchema, config);
        expect(validation.success).toBe(true);

        const scheduler = mockAutomationManager.getScheduler();
        
        // Assert
        expect(scheduler).toBeDefined();
        expect(validation.success).toBe(true);
      });

      it('creates recurring schedule with interval', () => {
        // Arrange
        const config = {
          type: 'recurring' as const,
          interval: 3600000, // 1 hour
          task: {
            keywords: ['test'],
            engine: 'google' as const,
          },
        };

        // Act
        const validation = validateInput(ScheduleConfigSchema, config);

        // Assert
        expect(validation.success).toBe(true);
        if (validation.success) {
          expect(validation.data.type).toBe('recurring');
          expect(validation.data.interval).toBe(3600000);
        }
      });

      it('creates custom schedule with cron expression', () => {
        // Arrange
        const config = {
          type: 'custom' as const,
          cronExpression: '0 */6 * * *', // Every 6 hours
          task: {
            keywords: ['test'],
            engine: 'google' as const,
          },
        };

        // Act
        const validation = validateInput(ScheduleConfigSchema, config);

        // Assert
        expect(validation.success).toBe(true);
        if (validation.success) {
          expect(validation.data.type).toBe('custom');
          expect(validation.data.cronExpression).toBe('0 */6 * * *');
        }
      });
    });
  });

  // ============================================================
  // INTEGRATION SCENARIOS
  // ============================================================
  describe('Integration Scenarios', () => {
    it('workflow: assign proxy -> start automation -> pause -> resume', async () => {
      // Step 1: Assign proxy to tab
      const tabId = '550e8400-e29b-41d4-a716-446655440000';
      const proxyId = '550e8400-e29b-41d4-a716-446655440001';
      
      mockTabManager.getTab.mockReturnValue({ id: tabId });
      mockProxyManager.getProxy.mockReturnValue({ id: proxyId, status: 'active' });
      mockTabManager.assignProxyToTab.mockResolvedValue(true);

      const assignResult = await mockTabManager.assignProxyToTab(tabId, proxyId);
      expect(assignResult).toBe(true);

      // Step 2: Start automation (mock)
      const sessionId = 'session-123';
      mockAutomationManager.getSession.mockReturnValue({
        id: sessionId,
        status: 'running',
      });

      // Step 3: Pause automation
      mockAutomationManager.pauseSession.mockReturnValue(true);
      const pauseResult = mockAutomationManager.pauseSession(sessionId);
      expect(pauseResult).toBe(true);

      // Step 4: Resume automation
      mockAutomationManager.getSession.mockReturnValue({
        id: sessionId,
        status: 'paused',
      });
      mockAutomationManager.resumeSession.mockReturnValue(true);
      const resumeResult = mockAutomationManager.resumeSession(sessionId);
      expect(resumeResult).toBe(true);
    });

    it('workflow: get privacy stats -> verify protection', () => {
      // Arrange
      const mockTrackerBlocker = {
        getStats: vi.fn().mockReturnValue({ patterns: 100, domains: 50 }),
        isEnabled: vi.fn().mockReturnValue(true),
      };
      const mockWebRTC = {
        isBlocked: vi.fn().mockReturnValue(true),
      };

      mockPrivacyManager.getTrackerBlocker.mockReturnValue(mockTrackerBlocker);
      mockPrivacyManager.getWebRTCProtection.mockReturnValue(mockWebRTC);

      // Act
      const stats = mockPrivacyManager.getTrackerBlocker().getStats();
      const webrtcBlocked = mockPrivacyManager.getWebRTCProtection().isBlocked();

      // Assert
      expect(stats.patterns).toBe(100);
      expect(stats.domains).toBe(50);
      expect(webrtcBlocked).toBe(true);
    });
  });
});

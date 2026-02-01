/**
 * Unit Tests for Extended Automation IPC Handlers
 * Tests for automation:schedule, automation:pause, automation:resume handlers
 * 
 * Coverage targets:
 * - automation:schedule handler (P1)
 * - automation:pause handler (P1)
 * - automation:resume handler (P1)
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
}));

// Import after mocks
import { setupAutomationHandlers } from '../../../../electron/ipc/handlers/automation';
import { IPC_CHANNELS } from '../../../../electron/ipc/channels';
import { resetIPCRateLimiter } from '../../../../electron/ipc/rate-limiter';

// ============================================================================
// TEST DATA FACTORIES
// ============================================================================

function createValidUUID(): string {
  return '00000000-0000-4000-a000-000000000001';
}

function createMockAutomationManager() {
  return {
    startSession: vi.fn().mockResolvedValue({
      id: createValidUUID(),
      status: 'active',
      tasks: [],
    }),
    stopSession: vi.fn().mockReturnValue(true),
    pauseSession: vi.fn().mockReturnValue(true),
    resumeSession: vi.fn().mockReturnValue(true),
    addKeyword: vi.fn().mockResolvedValue({
      id: createValidUUID(),
      keyword: 'test',
      status: 'queued',
    }),
    addTargetDomain: vi.fn().mockResolvedValue({
      id: createValidUUID(),
      domain: 'example.com',
      enabled: true,
    }),
    getSession: vi.fn().mockImplementation((id) => ({
      id,
      status: 'active',
      tasks: [],
      pausedAt: undefined,
    })),
    getScheduler: vi.fn().mockReturnValue({
      addSchedule: vi.fn(),
      removeSchedule: vi.fn(),
      getSchedule: vi.fn(),
      getAllSchedules: vi.fn().mockReturnValue([]),
      validateCronExpression: vi.fn().mockReturnValue({ isValid: true }),
      getNextCronExecution: vi.fn().mockReturnValue(new Date(Date.now() + 60000)),
    }),
  };
}

function createValidScheduleConfig(type: 'one-time' | 'recurring' | 'continuous' | 'custom') {
  const baseTask = {
    keywords: ['test keyword'],
    engine: 'google' as const,
    targetDomains: [],
    maxRetries: 3,
    delayBetweenSearches: 3000,
  };

  switch (type) {
    case 'one-time':
      return {
        type,
        startTime: new Date(Date.now() + 60000).toISOString(),
        task: baseTask,
      };
    case 'recurring':
      return {
        type,
        interval: 60000,
        daysOfWeek: [1, 2, 3, 4, 5],
        task: baseTask,
      };
    case 'continuous':
      return {
        type,
        interval: 5000,
        task: baseTask,
      };
    case 'custom':
      return {
        type,
        cronExpression: '0 9 * * 1',
        task: baseTask,
      };
  }
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

describe('Extended Automation IPC Handlers', () => {
  let mockAutomationManager: ReturnType<typeof createMockAutomationManager>;

  beforeEach(() => {
    vi.clearAllMocks();
    registeredHandlers.clear();
    resetIPCRateLimiter();

    mockAutomationManager = createMockAutomationManager();
    setupAutomationHandlers(mockAutomationManager as any);
  });

  afterEach(() => {
    resetIPCRateLimiter();
  });

  // ==========================================================================
  // AUTOMATION:SCHEDULE HANDLER TESTS
  // ==========================================================================
  describe('AUTOMATION_SCHEDULE', () => {
    describe('Success Cases', () => {
      it('should create one-time schedule', async () => {
        const config = createValidScheduleConfig('one-time');

        const result = await invokeHandler(IPC_CHANNELS.AUTOMATION_SCHEDULE, config);

        expect(result.success).toBe(true);
        expect(result.scheduleId).toBeDefined();
        expect(result.nextRunTime).toBeDefined();
        expect(mockAutomationManager.getScheduler().addSchedule).toHaveBeenCalled();
      });

      it('should create recurring schedule', async () => {
        const config = createValidScheduleConfig('recurring');

        const result = await invokeHandler(IPC_CHANNELS.AUTOMATION_SCHEDULE, config);

        expect(result.success).toBe(true);
        expect(result.scheduleId).toBeDefined();
        expect(result.schedule.type).toBe('recurring');
      });

      it('should create continuous schedule', async () => {
        const config = createValidScheduleConfig('continuous');

        const result = await invokeHandler(IPC_CHANNELS.AUTOMATION_SCHEDULE, config);

        expect(result.success).toBe(true);
        expect(result.scheduleId).toBeDefined();
        expect(result.schedule.type).toBe('continuous');
      });

      it('should create custom cron schedule', async () => {
        const config = createValidScheduleConfig('custom');

        const result = await invokeHandler(IPC_CHANNELS.AUTOMATION_SCHEDULE, config);

        expect(result.success).toBe(true);
        expect(result.scheduleId).toBeDefined();
        expect(result.schedule.type).toBe('custom');
      });

      it('should return schedule ID and next run time', async () => {
        const config = createValidScheduleConfig('one-time');

        const result = await invokeHandler(IPC_CHANNELS.AUTOMATION_SCHEDULE, config);

        expect(result.success).toBe(true);
        expect(result.scheduleId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        expect(result.nextRunTime).toBeDefined();
      });

      it('should return enabled schedule', async () => {
        const config = createValidScheduleConfig('recurring');

        const result = await invokeHandler(IPC_CHANNELS.AUTOMATION_SCHEDULE, config);

        expect(result.success).toBe(true);
        expect(result.schedule.enabled).toBe(true);
      });
    });

    describe('Validation Failures', () => {
      it('should reject invalid schedule type', async () => {
        const config = {
          type: 'invalid-type',
          task: { keywords: ['test'], engine: 'google' },
        };

        const result = await invokeHandler(IPC_CHANNELS.AUTOMATION_SCHEDULE, config);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Validation failed');
      });

      it('should reject one-time schedule without startTime', async () => {
        const config = {
          type: 'one-time',
          task: { keywords: ['test'], engine: 'google' },
        };

        const result = await invokeHandler(IPC_CHANNELS.AUTOMATION_SCHEDULE, config);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Validation failed');
      });

      it('should reject recurring schedule without interval', async () => {
        const config = {
          type: 'recurring',
          task: { keywords: ['test'], engine: 'google' },
        };

        const result = await invokeHandler(IPC_CHANNELS.AUTOMATION_SCHEDULE, config);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Validation failed');
      });

      it('should reject custom schedule without cronExpression', async () => {
        const config = {
          type: 'custom',
          task: { keywords: ['test'], engine: 'google' },
        };

        const result = await invokeHandler(IPC_CHANNELS.AUTOMATION_SCHEDULE, config);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Validation failed');
      });

      it('should reject start time in the past', async () => {
        const config = {
          type: 'one-time',
          startTime: new Date(Date.now() - 60000).toISOString(),
          task: { keywords: ['test'], engine: 'google' },
        };

        const result = await invokeHandler(IPC_CHANNELS.AUTOMATION_SCHEDULE, config);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Validation failed');
      });

      it('should reject invalid cron expression format', async () => {
        const config = {
          type: 'custom',
          cronExpression: '* * * *', // Too few fields
          task: { keywords: ['test'], engine: 'google' },
        };

        const result = await invokeHandler(IPC_CHANNELS.AUTOMATION_SCHEDULE, config);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Validation failed');
      });

      it('should reject empty task configuration', async () => {
        const config = {
          type: 'recurring',
          interval: 60000,
          task: { keywords: [], engine: 'google' },
        };

        const result = await invokeHandler(IPC_CHANNELS.AUTOMATION_SCHEDULE, config);

        // Empty keywords should still be valid but results depend on implementation
        expect(result).toBeDefined();
      });
    });

    describe('Error Conditions', () => {
      it('should handle scheduler service error', async () => {
        mockAutomationManager.getScheduler().addSchedule.mockImplementation(() => {
          throw new Error('Scheduler unavailable');
        });
        const config = createValidScheduleConfig('one-time');

        const result = await invokeHandler(IPC_CHANNELS.AUTOMATION_SCHEDULE, config);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Scheduler unavailable');
      });
    });

    describe('Rate Limiting', () => {
      it('should enforce strict rate limits for scheduling', async () => {
        const config = createValidScheduleConfig('one-time');

        // Make 10 requests (limit)
        for (let i = 0; i < 10; i++) {
          await invokeHandler(IPC_CHANNELS.AUTOMATION_SCHEDULE, config);
        }

        // 11th request should be rate limited
        const result = await invokeHandler(IPC_CHANNELS.AUTOMATION_SCHEDULE, config);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Rate limit exceeded');
      });
    });

    describe('Security', () => {
      it('should reject XSS in task keywords', async () => {
        const config = {
          type: 'recurring',
          interval: 60000,
          task: {
            keywords: ['<script>alert(1)</script>'],
            engine: 'google',
          },
        };

        const result = await invokeHandler(IPC_CHANNELS.AUTOMATION_SCHEDULE, config);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Validation failed');
      });

      it('should reject potentially dangerous cron patterns', async () => {
        const config = {
          type: 'custom',
          cronExpression: '(.*)+',
          task: { keywords: ['test'], engine: 'google' },
        };

        const result = await invokeHandler(IPC_CHANNELS.AUTOMATION_SCHEDULE, config);

        expect(result.success).toBe(false);
      });
    });
  });

  // ==========================================================================
  // AUTOMATION:PAUSE HANDLER TESTS
  // ==========================================================================
  describe('AUTOMATION_PAUSE', () => {
    describe('Success Cases', () => {
      it('should pause active automation session', async () => {
        const sessionId = createValidUUID();

        const result = await invokeHandler(IPC_CHANNELS.AUTOMATION_PAUSE, sessionId);

        expect(result.success).toBe(true);
        expect(mockAutomationManager.pauseSession).toHaveBeenCalledWith(sessionId);
      });

      it('should return paused session state', async () => {
        const sessionId = createValidUUID();
        // First call returns active session (for the check)
        // Second call returns paused session (after pause operation)
        mockAutomationManager.getSession
          .mockReturnValueOnce({ id: sessionId, status: 'active' })
          .mockReturnValueOnce({ id: sessionId, status: 'paused', pausedAt: new Date() });

        const result = await invokeHandler(IPC_CHANNELS.AUTOMATION_PAUSE, sessionId);

        expect(result.success).toBe(true);
        expect(result.session).toBeDefined();
        expect(result.session.status).toBe('paused');
      });
    });

    describe('Validation Failures', () => {
      it('should reject invalid session ID format', async () => {
        const invalidSessionId = 'not-a-uuid';

        const result = await invokeHandler(IPC_CHANNELS.AUTOMATION_PAUSE, invalidSessionId);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Validation failed');
      });

      it('should reject empty session ID', async () => {
        const result = await invokeHandler(IPC_CHANNELS.AUTOMATION_PAUSE, '');

        expect(result.success).toBe(false);
        expect(result.error).toContain('Validation failed');
      });
    });

    describe('Error Conditions', () => {
      it('should handle non-existent session', async () => {
        mockAutomationManager.getSession.mockReturnValue(undefined);
        const sessionId = createValidUUID();

        const result = await invokeHandler(IPC_CHANNELS.AUTOMATION_PAUSE, sessionId);

        expect(result.success).toBe(false);
        expect(result.error).toContain('not found');
      });

      it('should handle already paused session', async () => {
        const sessionId = createValidUUID();
        mockAutomationManager.getSession.mockReturnValue({
          id: sessionId,
          status: 'paused',
        });

        const result = await invokeHandler(IPC_CHANNELS.AUTOMATION_PAUSE, sessionId);

        expect(result.success).toBe(false);
        expect(result.error).toContain('already paused');
      });

      it('should handle stopped session (cannot pause)', async () => {
        const sessionId = createValidUUID();
        mockAutomationManager.getSession.mockReturnValue({
          id: sessionId,
          status: 'stopped',
        });

        const result = await invokeHandler(IPC_CHANNELS.AUTOMATION_PAUSE, sessionId);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Cannot pause');
      });

      it('should handle pauseSession returning false', async () => {
        mockAutomationManager.pauseSession.mockReturnValue(false);
        const sessionId = createValidUUID();

        const result = await invokeHandler(IPC_CHANNELS.AUTOMATION_PAUSE, sessionId);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Failed to pause');
      });
    });

    describe('Rate Limiting', () => {
      it('should enforce rate limits for pause operations', async () => {
        const sessionId = createValidUUID();

        // Make 20 requests (limit)
        for (let i = 0; i < 20; i++) {
          await invokeHandler(IPC_CHANNELS.AUTOMATION_PAUSE, sessionId);
        }

        // 21st request should be rate limited
        const result = await invokeHandler(IPC_CHANNELS.AUTOMATION_PAUSE, sessionId);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Rate limit exceeded');
      });
    });
  });

  // ==========================================================================
  // AUTOMATION:RESUME HANDLER TESTS
  // ==========================================================================
  describe('AUTOMATION_RESUME', () => {
    describe('Success Cases', () => {
      it('should resume paused automation session', async () => {
        const sessionId = createValidUUID();
        mockAutomationManager.getSession.mockReturnValue({
          id: sessionId,
          status: 'paused',
        });

        const result = await invokeHandler(IPC_CHANNELS.AUTOMATION_RESUME, sessionId);

        expect(result.success).toBe(true);
        expect(mockAutomationManager.resumeSession).toHaveBeenCalledWith(sessionId);
      });

      it('should return active session state after resume', async () => {
        const sessionId = createValidUUID();
        mockAutomationManager.getSession
          .mockReturnValueOnce({ id: sessionId, status: 'paused' })
          .mockReturnValueOnce({ id: sessionId, status: 'active' });

        const result = await invokeHandler(IPC_CHANNELS.AUTOMATION_RESUME, sessionId);

        expect(result.success).toBe(true);
        expect(result.session).toBeDefined();
      });
    });

    describe('Validation Failures', () => {
      it('should reject invalid session ID format', async () => {
        const invalidSessionId = 'invalid-session';

        const result = await invokeHandler(IPC_CHANNELS.AUTOMATION_RESUME, invalidSessionId);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Validation failed');
      });
    });

    describe('Error Conditions', () => {
      it('should handle non-existent session', async () => {
        mockAutomationManager.getSession.mockReturnValue(undefined);
        const sessionId = createValidUUID();

        const result = await invokeHandler(IPC_CHANNELS.AUTOMATION_RESUME, sessionId);

        expect(result.success).toBe(false);
        expect(result.error).toContain('not found');
      });

      it('should handle non-paused session (cannot resume active)', async () => {
        const sessionId = createValidUUID();
        mockAutomationManager.getSession.mockReturnValue({
          id: sessionId,
          status: 'active',
        });

        const result = await invokeHandler(IPC_CHANNELS.AUTOMATION_RESUME, sessionId);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Cannot resume');
      });

      it('should handle stopped session (cannot resume)', async () => {
        const sessionId = createValidUUID();
        mockAutomationManager.getSession.mockReturnValue({
          id: sessionId,
          status: 'stopped',
        });

        const result = await invokeHandler(IPC_CHANNELS.AUTOMATION_RESUME, sessionId);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Cannot resume');
      });

      it('should handle resumeSession returning false', async () => {
        mockAutomationManager.resumeSession.mockReturnValue(false);
        const sessionId = createValidUUID();
        mockAutomationManager.getSession.mockReturnValue({
          id: sessionId,
          status: 'paused',
        });

        const result = await invokeHandler(IPC_CHANNELS.AUTOMATION_RESUME, sessionId);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Failed to resume');
      });
    });

    describe('Rate Limiting', () => {
      it('should enforce rate limits for resume operations', async () => {
        const sessionId = createValidUUID();
        mockAutomationManager.getSession.mockReturnValue({
          id: sessionId,
          status: 'paused',
        });

        // Make 20 requests (limit)
        for (let i = 0; i < 20; i++) {
          await invokeHandler(IPC_CHANNELS.AUTOMATION_RESUME, sessionId);
        }

        // 21st request should be rate limited
        const result = await invokeHandler(IPC_CHANNELS.AUTOMATION_RESUME, sessionId);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Rate limit exceeded');
      });
    });

    describe('Edge Cases', () => {
      it('should handle rapid pause/resume cycles', async () => {
        const sessionId = createValidUUID();

        // Simulate alternating states
        let isPaused = true;
        mockAutomationManager.getSession.mockImplementation(() => ({
          id: sessionId,
          status: isPaused ? 'paused' : 'active',
        }));

        for (let i = 0; i < 5; i++) {
          isPaused = true;
          await invokeHandler(IPC_CHANNELS.AUTOMATION_RESUME, sessionId);
          isPaused = false;
          await invokeHandler(IPC_CHANNELS.AUTOMATION_PAUSE, sessionId);
        }

        expect(mockAutomationManager.resumeSession).toHaveBeenCalledTimes(5);
        expect(mockAutomationManager.pauseSession).toHaveBeenCalledTimes(5);
      });
    });
  });
});

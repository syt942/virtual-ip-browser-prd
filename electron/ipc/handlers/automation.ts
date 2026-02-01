/**
 * Automation IPC Handlers
 * With Zod validation and rate limiting
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../channels';
import type { AutomationManager } from '../../core/automation/manager';
import { 
  AutomationConfigSchema, 
  SessionIdSchema, 
  KeywordSchema,
  DomainSchema,
  DomainPatternSchema,
  ScheduleConfigSchema,
  validateInput 
} from '../validation';
import { getIPCRateLimiter } from '../rate-limiter';

export function setupAutomationHandlers(automationManager: AutomationManager) {
  const rateLimiter = getIPCRateLimiter();

  // Start search session
  ipcMain.handle(IPC_CHANNELS.AUTOMATION_START_SEARCH, async (_event, config) => {
    // Rate limiting (strict for automation)
    const rateCheck = rateLimiter.checkLimit(IPC_CHANNELS.AUTOMATION_START_SEARCH);
    if (!rateCheck.allowed) {
      return { success: false, error: 'Rate limit exceeded', retryAfter: rateCheck.retryAfter };
    }

    // Validation
    const validation = validateInput(AutomationConfigSchema, config);
    if (!validation.success) {
      return { success: false, error: `Validation failed: ${validation.error}` };
    }

    try {
      const session = await automationManager.startSession(validation.data);
      return { success: true, session };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start automation session';
      console.error('[IPC:automation:startSearch] Error:', errorMessage, { 
        engine: validation.data.engine,
        keywordCount: validation.data.keywords?.length 
      });
      return { success: false, error: errorMessage };
    }
  });

  // Stop search session
  ipcMain.handle(IPC_CHANNELS.AUTOMATION_STOP_SEARCH, async (_event, sessionId: string) => {
    // Rate limiting
    const rateCheck = rateLimiter.checkLimit(IPC_CHANNELS.AUTOMATION_STOP_SEARCH);
    if (!rateCheck.allowed) {
      return { success: false, error: 'Rate limit exceeded', retryAfter: rateCheck.retryAfter };
    }

    // Validation
    const validation = validateInput(SessionIdSchema, sessionId);
    if (!validation.success) {
      return { success: false, error: `Validation failed: ${validation.error}` };
    }

    try {
      const result = automationManager.stopSession(validation.data);
      return { success: result };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to stop automation session';
      console.error('[IPC:automation:stopSearch] Error:', errorMessage, { sessionId: validation.data });
      return { success: false, error: errorMessage };
    }
  });

  // Add keyword
  ipcMain.handle(IPC_CHANNELS.AUTOMATION_ADD_KEYWORD, async (_event, sessionId: string, keyword: string) => {
    // Rate limiting
    const rateCheck = rateLimiter.checkLimit(IPC_CHANNELS.AUTOMATION_ADD_KEYWORD);
    if (!rateCheck.allowed) {
      return { success: false, error: 'Rate limit exceeded', retryAfter: rateCheck.retryAfter };
    }

    // Validation
    const sessionValidation = validateInput(SessionIdSchema, sessionId);
    if (!sessionValidation.success) {
      return { success: false, error: `Validation failed: ${sessionValidation.error}` };
    }

    const keywordValidation = validateInput(KeywordSchema, keyword);
    if (!keywordValidation.success) {
      return { success: false, error: `Validation failed: ${keywordValidation.error}` };
    }

    try {
      const task = await automationManager.addKeyword(sessionValidation.data, keywordValidation.data);
      return { success: true, task };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add keyword';
      console.error('[IPC:automation:addKeyword] Error:', errorMessage, { 
        sessionId: sessionValidation.data,
        keyword: keywordValidation.data.substring(0, 50) 
      });
      return { success: false, error: errorMessage };
    }
  });

  // Add domain
  ipcMain.handle(IPC_CHANNELS.AUTOMATION_ADD_DOMAIN, async (_event, domain: string, pattern?: string) => {
    // Rate limiting
    const rateCheck = rateLimiter.checkLimit(IPC_CHANNELS.AUTOMATION_ADD_DOMAIN);
    if (!rateCheck.allowed) {
      return { success: false, error: 'Rate limit exceeded', retryAfter: rateCheck.retryAfter };
    }

    // Validation
    const domainValidation = validateInput(DomainSchema, domain);
    if (!domainValidation.success) {
      return { success: false, error: `Validation failed: ${domainValidation.error}` };
    }

    if (pattern !== undefined) {
      const patternValidation = validateInput(DomainPatternSchema, pattern);
      if (!patternValidation.success) {
        return { success: false, error: `Validation failed: ${patternValidation.error}` };
      }
    }

    try {
      const targetDomain = await automationManager.addTargetDomain(domainValidation.data, pattern);
      return { success: true, domain: targetDomain };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add domain';
      console.error('[IPC:automation:addDomain] Error:', errorMessage, { domain: domainValidation.data });
      return { success: false, error: errorMessage };
    }
  });

  // Get tasks
  ipcMain.handle(IPC_CHANNELS.AUTOMATION_GET_TASKS, async (_event, sessionId: string) => {
    // Rate limiting
    const rateCheck = rateLimiter.checkLimit(IPC_CHANNELS.AUTOMATION_GET_TASKS);
    if (!rateCheck.allowed) {
      return { success: false, error: 'Rate limit exceeded', retryAfter: rateCheck.retryAfter };
    }

    // Validation
    const validation = validateInput(SessionIdSchema, sessionId);
    if (!validation.success) {
      return { success: false, error: `Validation failed: ${validation.error}` };
    }

    try {
      const session = automationManager.getSession(validation.data);
      return { success: true, tasks: session?.tasks || [] };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get tasks';
      console.error('[IPC:automation:getTasks] Error:', errorMessage, { sessionId: validation.data });
      return { success: false, error: errorMessage };
    }
  });

  /**
   * automation:schedule - Schedule an automation task
   * 
   * P1 Priority - Important for autonomous execution
   * 
   * Supports schedule types:
   * - one-time: Execute once at a specific time
   * - recurring: Execute at regular intervals
   * - continuous: Execute continuously with minimal delay
   * - custom: Execute based on cron expression
   * 
   * @param config - Schedule configuration including type, timing, and task details
   * @returns Schedule ID and next run time
   */
  ipcMain.handle(IPC_CHANNELS.AUTOMATION_SCHEDULE, async (_event, config) => {
    // Rate limiting (strict for scheduling)
    const rateCheck = rateLimiter.checkLimit(IPC_CHANNELS.AUTOMATION_SCHEDULE);
    if (!rateCheck.allowed) {
      return { success: false, error: 'Rate limit exceeded', retryAfter: rateCheck.retryAfter };
    }

    // Validation
    const validation = validateInput(ScheduleConfigSchema, config);
    if (!validation.success) {
      return { success: false, error: `Validation failed: ${validation.error}` };
    }

    try {
      const scheduler = automationManager.getScheduler();
      
      // Create schedule object with all required TaskSchedule fields
      const scheduleId = crypto.randomUUID();
      const schedule = {
        id: scheduleId,
        name: `Schedule ${new Date().toISOString()}`,
        type: validation.data.type,
        enabled: true,
        taskConfig: {
          keywords: validation.data.task.keywords,
          engine: validation.data.task.engine,
          targetDomains: validation.data.task.targetDomains,
          maxRetries: validation.data.task.maxRetries,
          delayBetweenSearches: validation.data.task.delayBetweenSearches,
          useRandomProxy: validation.data.task.useRandomProxy,
          clickThrough: validation.data.task.clickThrough,
          simulateHumanBehavior: validation.data.task.simulateHumanBehavior,
        },
        startTime: validation.data.startTime ? new Date(validation.data.startTime) : undefined,
        endTime: validation.data.endTime ? new Date(validation.data.endTime) : undefined,
        intervalMinutes: validation.data.interval ? Math.floor(validation.data.interval / 60000) : undefined,
        daysOfWeek: validation.data.daysOfWeek,
        cronExpression: validation.data.cronExpression,
        runCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Add schedule to scheduler
      scheduler.addSchedule(schedule);

      // Calculate next run time
      let nextRunTime: Date | null = null;
      if (validation.data.type === 'one-time' && validation.data.startTime) {
        nextRunTime = new Date(validation.data.startTime);
      } else if (validation.data.type === 'continuous') {
        nextRunTime = new Date(Date.now() + (validation.data.interval || 5000));
      } else if (validation.data.cronExpression) {
        nextRunTime = scheduler.getNextCronExecution?.(validation.data.cronExpression) || null;
      }

      return { 
        success: true, 
        scheduleId,
        nextRunTime: nextRunTime?.toISOString() || null,
        schedule: {
          id: scheduleId,
          type: validation.data.type,
          enabled: true,
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create schedule';
      console.error('[IPC:automation:schedule] Error:', errorMessage, { type: config?.type });
      return { success: false, error: errorMessage };
    }
  });

  /**
   * automation:pause - Pause an active automation session
   * 
   * P1 Priority - Important for user control
   * 
   * @param sessionId - UUID of the session to pause
   * @returns Success status and paused session state
   */
  ipcMain.handle(IPC_CHANNELS.AUTOMATION_PAUSE, async (_event, sessionId: string) => {
    // Rate limiting
    const rateCheck = rateLimiter.checkLimit(IPC_CHANNELS.AUTOMATION_PAUSE);
    if (!rateCheck.allowed) {
      return { success: false, error: 'Rate limit exceeded', retryAfter: rateCheck.retryAfter };
    }

    // Validation
    const validation = validateInput(SessionIdSchema, sessionId);
    if (!validation.success) {
      return { success: false, error: `Validation failed: ${validation.error}` };
    }

    try {
      // Check if session exists
      const session = automationManager.getSession(validation.data);
      if (!session) {
        return { success: false, error: `Session ${validation.data} not found` };
      }

      // Check if session can be paused
      if (session.status === 'paused') {
        return { success: false, error: 'Session is already paused' };
      }
      if (session.status === 'stopped') {
        return { success: false, error: `Cannot pause ${session.status} session` };
      }

      // Pause the session
      const result = automationManager.pauseSession(validation.data);
      
      if (!result) {
        return { success: false, error: 'Failed to pause session' };
      }

      // Get updated session state
      const pausedSession = automationManager.getSession(validation.data);

      return { 
        success: true, 
        session: pausedSession ? {
          id: pausedSession.id,
          status: pausedSession.status,
          pausedAt: pausedSession.pausedAt,
        } : null
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to pause session';
      console.error('[IPC:automation:pause] Error:', errorMessage, { sessionId: validation.data });
      return { success: false, error: errorMessage };
    }
  });

  /**
   * automation:resume - Resume a paused automation session
   * 
   * P1 Priority - Important for user control
   * 
   * @param sessionId - UUID of the session to resume
   * @returns Success status and resumed session state
   */
  ipcMain.handle(IPC_CHANNELS.AUTOMATION_RESUME, async (_event, sessionId: string) => {
    // Rate limiting
    const rateCheck = rateLimiter.checkLimit(IPC_CHANNELS.AUTOMATION_RESUME);
    if (!rateCheck.allowed) {
      return { success: false, error: 'Rate limit exceeded', retryAfter: rateCheck.retryAfter };
    }

    // Validation
    const validation = validateInput(SessionIdSchema, sessionId);
    if (!validation.success) {
      return { success: false, error: `Validation failed: ${validation.error}` };
    }

    try {
      // Check if session exists
      const session = automationManager.getSession(validation.data);
      if (!session) {
        return { success: false, error: `Session ${validation.data} not found` };
      }

      // Check if session can be resumed
      if (session.status !== 'paused') {
        return { success: false, error: `Cannot resume session with status: ${session.status}` };
      }

      // Resume the session
      const result = automationManager.resumeSession(validation.data);
      
      if (!result) {
        return { success: false, error: 'Failed to resume session' };
      }

      // Get updated session state
      const resumedSession = automationManager.getSession(validation.data);

      return { 
        success: true, 
        session: resumedSession ? {
          id: resumedSession.id,
          status: resumedSession.status,
        } : null
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to resume session';
      console.error('[IPC:automation:resume] Error:', errorMessage, { sessionId: validation.data });
      return { success: false, error: errorMessage };
    }
  });

  console.log('[Automation Handlers] Registered with validation and rate limiting');
}

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
      return { success: false, error: (error as Error).message };
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
      return { success: false, error: (error as Error).message };
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
      return { success: false, error: (error as Error).message };
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
      return { success: false, error: (error as Error).message };
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
      return { success: false, error: (error as Error).message };
    }
  });

  console.log('[Automation Handlers] Registered with validation and rate limiting');
}

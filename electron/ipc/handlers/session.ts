/**
 * Session IPC Handlers
 * Handles session save/load/list/delete/update operations
 * 
 * EP-010: Session Management
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../channels';
import type { SessionManager, SavedSession } from '../../core/session/manager';
import {
  validateInput,
  SessionIdSchema,
  SessionNameSchema,
} from '../validation';
import { getIPCRateLimiter } from '../rate-limiter';
import { z } from 'zod';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

/**
 * Schema for tab state in session save request
 */
const TabStateSchema = z.object({
  url: z.string().max(2048),
  title: z.string().max(500).optional(),
  favicon: z.string().max(10000).optional(),
  proxyId: z.string().uuid().optional().nullable(),
});

/**
 * Schema for window bounds
 */
const WindowBoundsSchema = z.object({
  x: z.number().int(),
  y: z.number().int(),
  width: z.number().int().min(200).max(10000),
  height: z.number().int().min(200).max(10000),
});

/**
 * Schema for session save request
 */
export const SessionSaveSchema = z.object({
  name: SessionNameSchema,
  tabs: z.array(TabStateSchema).max(50).default([]),
  windowBounds: WindowBoundsSchema,
});

/**
 * Schema for session update request
 */
export const SessionUpdateSchema = z.object({
  name: SessionNameSchema.optional(),
  tabs: z.array(TabStateSchema).max(50).optional(),
  windowBounds: WindowBoundsSchema.optional(),
});

// ============================================================================
// RESPONSE TYPES
// ============================================================================

interface SessionResponse {
  success: boolean;
  session?: SavedSession;
  error?: string;
  retryAfter?: number;
}

interface SessionListResponse {
  success: boolean;
  sessions?: SavedSession[];
  error?: string;
  retryAfter?: number;
}

interface SessionDeleteResponse {
  success: boolean;
  error?: string;
  retryAfter?: number;
}

// ============================================================================
// HANDLER SETUP
// ============================================================================

/**
 * Setup all session-related IPC handlers
 */
export function setupSessionHandlers(sessionManager: SessionManager): void {
  const rateLimiter = getIPCRateLimiter();

  // -------------------------------------------------------------------------
  // SESSION:SAVE
  // -------------------------------------------------------------------------
  ipcMain.handle(IPC_CHANNELS.SESSION_SAVE, async (_event, config): Promise<SessionResponse> => {
    // Rate limiting
    const rateCheck = rateLimiter.checkLimit(IPC_CHANNELS.SESSION_SAVE);
    if (!rateCheck.allowed) {
      return { 
        success: false, 
        error: 'Rate limit exceeded', 
        retryAfter: rateCheck.retryAfter 
      };
    }

    // Validation
    const validation = validateInput(SessionSaveSchema, config);
    if (!validation.success) {
      return { success: false, error: `Validation failed: ${validation.error}` };
    }

    try {
      const { name, tabs, windowBounds } = validation.data;
      const session = await sessionManager.saveSession(name, tabs, windowBounds);
      return { success: true, session };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save session';
      console.error('[IPC:session:save] Error:', errorMessage);
      return { success: false, error: errorMessage };
    }
  });

  // -------------------------------------------------------------------------
  // SESSION:LOAD
  // -------------------------------------------------------------------------
  ipcMain.handle(IPC_CHANNELS.SESSION_LOAD, async (_event, id: string): Promise<SessionResponse> => {
    // Rate limiting
    const rateCheck = rateLimiter.checkLimit(IPC_CHANNELS.SESSION_LOAD);
    if (!rateCheck.allowed) {
      return { 
        success: false, 
        error: 'Rate limit exceeded', 
        retryAfter: rateCheck.retryAfter 
      };
    }

    // Validation
    const validation = validateInput(SessionIdSchema, id);
    if (!validation.success) {
      return { success: false, error: `Validation failed: ${validation.error}` };
    }

    try {
      const session = await sessionManager.loadSession(validation.data);
      if (!session) {
        return { success: false, error: 'Session not found' };
      }
      return { success: true, session };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load session';
      console.error('[IPC:session:load] Error:', errorMessage, { sessionId: validation.data });
      return { success: false, error: errorMessage };
    }
  });

  // -------------------------------------------------------------------------
  // SESSION:LIST
  // -------------------------------------------------------------------------
  ipcMain.handle(IPC_CHANNELS.SESSION_LIST, async (): Promise<SessionListResponse> => {
    // Rate limiting (higher limit for read operations)
    const rateCheck = rateLimiter.checkLimit(IPC_CHANNELS.SESSION_LIST);
    if (!rateCheck.allowed) {
      return { 
        success: false, 
        error: 'Rate limit exceeded', 
        retryAfter: rateCheck.retryAfter 
      };
    }

    try {
      const sessions = await sessionManager.getAllSessions();
      return { success: true, sessions };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to list sessions';
      console.error('[IPC:session:list] Error:', errorMessage);
      return { success: false, error: errorMessage };
    }
  });

  // -------------------------------------------------------------------------
  // SESSION:DELETE
  // -------------------------------------------------------------------------
  ipcMain.handle(IPC_CHANNELS.SESSION_DELETE, async (_event, id: string): Promise<SessionDeleteResponse> => {
    // Rate limiting
    const rateCheck = rateLimiter.checkLimit(IPC_CHANNELS.SESSION_DELETE);
    if (!rateCheck.allowed) {
      return { 
        success: false, 
        error: 'Rate limit exceeded', 
        retryAfter: rateCheck.retryAfter 
      };
    }

    // Validation
    const validation = validateInput(SessionIdSchema, id);
    if (!validation.success) {
      return { success: false, error: `Validation failed: ${validation.error}` };
    }

    try {
      const result = await sessionManager.deleteSession(validation.data);
      if (!result) {
        return { success: false, error: 'Session not found or already deleted' };
      }
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete session';
      console.error('[IPC:session:delete] Error:', errorMessage, { sessionId: validation.data });
      return { success: false, error: errorMessage };
    }
  });

  // -------------------------------------------------------------------------
  // SESSION:UPDATE
  // -------------------------------------------------------------------------
  ipcMain.handle(IPC_CHANNELS.SESSION_UPDATE, async (_event, id: string, updates: unknown): Promise<SessionResponse> => {
    // Rate limiting
    const rateCheck = rateLimiter.checkLimit(IPC_CHANNELS.SESSION_UPDATE);
    if (!rateCheck.allowed) {
      return { 
        success: false, 
        error: 'Rate limit exceeded', 
        retryAfter: rateCheck.retryAfter 
      };
    }

    // Validate ID
    const idValidation = validateInput(SessionIdSchema, id);
    if (!idValidation.success) {
      return { success: false, error: `Validation failed: ${idValidation.error}` };
    }

    // Validate updates
    const updatesValidation = validateInput(SessionUpdateSchema, updates);
    if (!updatesValidation.success) {
      return { success: false, error: `Validation failed: ${updatesValidation.error}` };
    }

    try {
      const session = await sessionManager.updateSession(idValidation.data, updatesValidation.data);
      if (!session) {
        return { success: false, error: 'Session not found' };
      }
      return { success: true, session };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update session';
      console.error('[IPC:session:update] Error:', errorMessage, { sessionId: idValidation.data });
      return { success: false, error: errorMessage };
    }
  });

  console.log('[IPC Handlers] Session handlers registered');
}

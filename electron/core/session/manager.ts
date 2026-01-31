/**
 * Session Manager - SECURE VERSION
 * Manages session persistence and restoration with mandatory URL re-validation
 * 
 * SECURITY FIX: Re-validates all URLs on restore to prevent:
 * - Stored SSRF attacks
 * - JavaScript URL injection
 * - Local file access
 * - Cloud metadata endpoint access
 */

import { EventEmitter } from 'events';
import { z } from 'zod';
import type { DatabaseManager } from '../../database';
import type { PrivacyConfig } from '../privacy/manager';
import { SafeUrlSchema } from '../../ipc/validation';

// Security event types
export type SecurityEventType = 
  | 'dangerous_url_filtered'
  | 'session_sanitized'
  | 'validation_failed';

export interface SecurityEvent {
  type: SecurityEventType;
  sessionId: string;
  details: {
    url?: string;
    reason?: string;
    tabIndex?: number;
  };
  timestamp: Date;
}

export interface SavedSession {
  id: string;
  name: string;
  tabs: TabState[];
  windowBounds: WindowBounds;
  createdAt: Date;
  updatedAt: Date;
}

interface TabState {
  url: string;
  title: string;
  proxyId?: string;
  privacyConfig?: PrivacyConfig;
}

interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Zod schema for tab validation
const TabStateSchema = z.object({
  url: z.string().max(2048),
  title: z.string().max(500).default(''),
  proxyId: z.string().uuid().optional(),
  privacyConfig: z.object({}).passthrough().optional(),
});

const WindowBoundsSchema = z.object({
  x: z.number().int(),
  y: z.number().int(),
  width: z.number().int().min(100).max(10000),
  height: z.number().int().min(100).max(10000),
});

// UUID validation regex
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class SessionManager extends EventEmitter {
  private db: DatabaseManager;
  private currentSession: SavedSession | null = null;
  private securityEvents: SecurityEvent[] = [];
  private readonly MAX_SECURITY_EVENTS = 1000;

  constructor(db: DatabaseManager) {
    super();
    this.db = db;
  }

  /**
   * Save current session with URL validation
   */
  async saveSession(name: string, tabs: TabState[], windowBounds: WindowBounds): Promise<SavedSession> {
    // Validate and sanitize tabs before saving
    const sanitizedTabs = this.sanitizeTabs(tabs, 'save');

    const session: SavedSession = {
      id: crypto.randomUUID(),
      name: this.sanitizeSessionName(name),
      tabs: sanitizedTabs,
      windowBounds: this.validateWindowBounds(windowBounds),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Save to database
    const sql = `
      INSERT INTO sessions (id, name, tabs, window_bounds, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    this.db.execute(sql, [
      session.id,
      session.name,
      JSON.stringify(session.tabs),
      JSON.stringify(session.windowBounds),
      session.createdAt.toISOString(),
      session.updatedAt.toISOString()
    ]);

    this.currentSession = session;
    this.emit('session:saved', session);

    return session;
  }

  /**
   * Load session by ID with MANDATORY URL re-validation (SECURITY CRITICAL)
   */
  async loadSession(id: string): Promise<SavedSession | null> {
    // Validate session ID format
    if (!UUID_PATTERN.test(id)) {
      this.logSecurityEvent({
        type: 'validation_failed',
        sessionId: id,
        details: { reason: 'Invalid session ID format' },
        timestamp: new Date(),
      });
      return null;
    }

    const sql = `SELECT * FROM sessions WHERE id = ?`;
    interface SessionRow {
      id: string;
      name: string;
      tabs: string;
      window_bounds: string;
      created_at: string;
      updated_at: string;
    }
    const row = this.db.queryOne<SessionRow>(sql, [id]);

    if (!row) return null;

    // Parse stored data
    let rawTabs: unknown[];
    let rawWindowBounds: unknown;
    
    try {
      rawTabs = JSON.parse(row.tabs);
      rawWindowBounds = JSON.parse(row.window_bounds);
    } catch (error) {
      this.logSecurityEvent({
        type: 'validation_failed',
        sessionId: id,
        details: { reason: 'Failed to parse session data' },
        timestamp: new Date(),
      });
      return null;
    }

    // RE-VALIDATE all URLs (SECURITY CRITICAL)
    const sanitizedTabs = this.sanitizeTabs(rawTabs as TabState[], 'restore', id);

    // Validate window bounds
    const validatedBounds = this.validateWindowBounds(rawWindowBounds);

    const session: SavedSession = {
      id: row.id,
      name: row.name,
      tabs: sanitizedTabs,
      windowBounds: validatedBounds,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };

    // Log if any tabs were filtered
    if (sanitizedTabs.length < (rawTabs as TabState[]).length) {
      this.logSecurityEvent({
        type: 'session_sanitized',
        sessionId: id,
        details: {
          reason: `Filtered ${(rawTabs as TabState[]).length - sanitizedTabs.length} dangerous tabs`,
        },
        timestamp: new Date(),
      });
    }

    this.currentSession = session;
    this.emit('session:loaded', session);

    return session;
  }

  /**
   * Sanitize and validate tabs
   */
  private sanitizeTabs(
    tabs: TabState[], 
    _operation: 'save' | 'restore',
    sessionId?: string
  ): TabState[] {
    if (!Array.isArray(tabs)) return [];

    const sanitized: TabState[] = [];

    for (let i = 0; i < tabs.length; i++) {
      const tab = tabs[i];
      
      // Validate tab structure
      const tabValidation = TabStateSchema.safeParse(tab);
      if (!tabValidation.success) {
        this.logSecurityEvent({
          type: 'validation_failed',
          sessionId: sessionId || 'unknown',
          details: { 
            reason: 'Invalid tab structure',
            tabIndex: i,
          },
          timestamp: new Date(),
        });
        continue;
      }

      // Validate URL through SafeUrlSchema (SSRF protection)
      const urlValidation = SafeUrlSchema.safeParse(tab.url);
      if (!urlValidation.success) {
        this.logSecurityEvent({
          type: 'dangerous_url_filtered',
          sessionId: sessionId || 'unknown',
          details: {
            url: tab.url.substring(0, 100), // Truncate for logging
            reason: 'URL failed SSRF validation',
            tabIndex: i,
          },
          timestamp: new Date(),
        });
        
        // Skip this tab entirely - don't restore dangerous URLs
        continue;
      }

      // Additional security checks
      if (this.isProhibitedUrl(tab.url)) {
        this.logSecurityEvent({
          type: 'dangerous_url_filtered',
          sessionId: sessionId || 'unknown',
          details: {
            url: tab.url.substring(0, 100),
            reason: 'URL matches prohibited pattern',
            tabIndex: i,
          },
          timestamp: new Date(),
        });
        continue;
      }

      sanitized.push({
        url: urlValidation.data,
        title: this.sanitizeTitle(tab.title),
        proxyId: tab.proxyId,
        privacyConfig: tab.privacyConfig,
      });
    }

    return sanitized;
  }

  /**
   * Check for additional prohibited URL patterns
   */
  private isProhibitedUrl(url: string): boolean {
    const lower = url.toLowerCase();
    
    const prohibited = [
      // Dangerous protocols
      'javascript:',
      'vbscript:',
      'data:text/html',
      'data:application',
      'file://',
      'about:',
      'chrome://',
      'chrome-extension://',
      
      // Cloud metadata endpoints
      '169.254.169.254',
      '169.254.170.2',
      'metadata.google',
      'metadata.aws',
      
      // Internal/localhost
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '[::1]',
      
      // Common SSRF targets
      '/etc/passwd',
      '/proc/',
      'gopher://',
      'dict://',
    ];

    return prohibited.some(pattern => lower.includes(pattern));
  }

  /**
   * Sanitize session name
   */
  private sanitizeSessionName(name: string): string {
    return name
      .replace(/[<>'"]/g, '')
      .replace(/[\x00-\x1f]/g, '')
      .substring(0, 100)
      .trim() || 'Unnamed Session';
  }

  /**
   * Sanitize tab title
   */
  private sanitizeTitle(title: string): string {
    if (!title) return '';
    return title
      .replace(/[<>]/g, '')
      .replace(/[\x00-\x1f]/g, '')
      .substring(0, 500);
  }

  /**
   * Validate window bounds
   */
  private validateWindowBounds(bounds: unknown): WindowBounds {
    const validation = WindowBoundsSchema.safeParse(bounds);
    if (validation.success) {
      return validation.data;
    }
    
    // Return safe defaults
    return { x: 100, y: 100, width: 1200, height: 800 };
  }

  /**
   * Log security event
   */
  private logSecurityEvent(event: SecurityEvent): void {
    this.securityEvents.push(event);
    
    // Trim old events
    if (this.securityEvents.length > this.MAX_SECURITY_EVENTS) {
      this.securityEvents = this.securityEvents.slice(-this.MAX_SECURITY_EVENTS);
    }

    // Emit for monitoring
    this.emit('security:event', event);
    
    // Log to console
    console.warn('[SessionManager Security]', event.type, event.details);
  }

  /**
   * Get security events for monitoring
   */
  getSecurityEvents(): SecurityEvent[] {
    return [...this.securityEvents];
  }

  /**
   * Clear security events
   */
  clearSecurityEvents(): void {
    this.securityEvents = [];
  }

  /**
   * Get all saved sessions with URL re-validation
   */
  async getAllSessions(): Promise<SavedSession[]> {
    const sql = `SELECT * FROM sessions ORDER BY updated_at DESC`;
    interface SessionRow {
      id: string;
      name: string;
      tabs: string;
      window_bounds: string;
      created_at: string;
      updated_at: string;
    }
    const rows = this.db.query<SessionRow>(sql);

    // Re-validate all sessions on retrieval
    return rows.map(row => {
      let tabs: TabState[] = [];
      let windowBounds: WindowBounds = { x: 100, y: 100, width: 1200, height: 800 };
      
      try {
        const rawTabs = JSON.parse(row.tabs);
        tabs = this.sanitizeTabs(rawTabs, 'restore', row.id);
        windowBounds = this.validateWindowBounds(JSON.parse(row.window_bounds));
      } catch {
        // Use defaults on parse error
      }

      return {
        id: row.id,
        name: row.name,
        tabs,
        windowBounds,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      };
    });
  }

  /**
   * Delete session
   */
  async deleteSession(id: string): Promise<boolean> {
    // Validate ID format
    if (!UUID_PATTERN.test(id)) {
      return false;
    }

    const sql = `DELETE FROM sessions WHERE id = ?`;
    const result = this.db.execute(sql, [id]);

    if (result.changes > 0) {
      this.emit('session:deleted', id);
      return true;
    }

    return false;
  }

  /**
   * Update session with URL re-validation
   */
  async updateSession(id: string, updates: Partial<SavedSession>): Promise<SavedSession | null> {
    const session = await this.loadSession(id);
    if (!session) return null;

    // Re-validate any URL updates
    let updatedTabs = session.tabs;
    if (updates.tabs) {
      updatedTabs = this.sanitizeTabs(updates.tabs, 'save', id);
    }

    const updated: SavedSession = {
      ...session,
      ...updates,
      tabs: updatedTabs,
      updatedAt: new Date()
    };

    const sql = `
      UPDATE sessions
      SET name = ?, tabs = ?, window_bounds = ?, updated_at = ?
      WHERE id = ?
    `;

    this.db.execute(sql, [
      this.sanitizeSessionName(updated.name),
      JSON.stringify(updated.tabs),
      JSON.stringify(updated.windowBounds),
      updated.updatedAt.toISOString(),
      id
    ]);

    this.currentSession = updated;
    this.emit('session:updated', updated);

    return updated;
  }

  /**
   * Get current session
   */
  getCurrentSession(): SavedSession | null {
    return this.currentSession;
  }
}

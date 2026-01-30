/**
 * Session Manager
 * Manages session persistence and restoration
 */

import { EventEmitter } from 'events';
import type { DatabaseManager } from '../../database';
import type { PrivacyConfig } from '../privacy/manager';

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

export class SessionManager extends EventEmitter {
  private db: DatabaseManager;
  private currentSession: SavedSession | null = null;

  constructor(db: DatabaseManager) {
    super();
    this.db = db;
  }

  /**
   * Save current session
   */
  async saveSession(name: string, tabs: TabState[], windowBounds: WindowBounds): Promise<SavedSession> {
    const session: SavedSession = {
      id: crypto.randomUUID(),
      name,
      tabs,
      windowBounds,
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
   * Load session by ID
   */
  async loadSession(id: string): Promise<SavedSession | null> {
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

    const session: SavedSession = {
      id: row.id,
      name: row.name,
      tabs: JSON.parse(row.tabs),
      windowBounds: JSON.parse(row.window_bounds),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };

    this.currentSession = session;
    this.emit('session:loaded', session);

    return session;
  }

  /**
   * Get all saved sessions
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

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      tabs: JSON.parse(row.tabs),
      windowBounds: JSON.parse(row.window_bounds),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }));
  }

  /**
   * Delete session
   */
  async deleteSession(id: string): Promise<boolean> {
    const sql = `DELETE FROM sessions WHERE id = ?`;
    const result = this.db.execute(sql, [id]);

    if (result.changes > 0) {
      this.emit('session:deleted', id);
      return true;
    }

    return false;
  }

  /**
   * Update session
   */
  async updateSession(id: string, updates: Partial<SavedSession>): Promise<SavedSession | null> {
    const session = await this.loadSession(id);
    if (!session) return null;

    const updated: SavedSession = {
      ...session,
      ...updates,
      updatedAt: new Date()
    };

    const sql = `
      UPDATE sessions
      SET name = ?, tabs = ?, window_bounds = ?, updated_at = ?
      WHERE id = ?
    `;

    this.db.execute(sql, [
      updated.name,
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

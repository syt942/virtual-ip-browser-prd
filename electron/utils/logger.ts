/**
 * Application Logger
 * Centralized logging with database persistence
 */

import type { DatabaseManager } from '../database';

export type LogLevel = 'debug' | 'info' | 'warning' | 'error' | 'success';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  category: string;
  message: string;
  metadata?: any;
  sessionId?: string;
  tabId?: string;
  proxyId?: string;
}

export class Logger {
  private db: DatabaseManager;
  private sessionId?: string;

  constructor(db: DatabaseManager, sessionId?: string) {
    this.db = db;
    this.sessionId = sessionId;
  }

  /**
   * Log debug message
   */
  debug(category: string, message: string, metadata?: any): void {
    this.log('debug', category, message, metadata);
  }

  /**
   * Log info message
   */
  info(category: string, message: string, metadata?: any): void {
    this.log('info', category, message, metadata);
    console.log(`[${category}] ${message}`);
  }

  /**
   * Log warning message
   */
  warning(category: string, message: string, metadata?: any): void {
    this.log('warning', category, message, metadata);
    console.warn(`[${category}] ${message}`);
  }

  /**
   * Log error message
   */
  error(category: string, message: string, metadata?: any): void {
    this.log('error', category, message, metadata);
    console.error(`[${category}] ${message}`, metadata);
  }

  /**
   * Log success message
   */
  success(category: string, message: string, metadata?: any): void {
    this.log('success', category, message, metadata);
    console.log(`[${category}] ✓ ${message}`);
  }

  /**
   * Internal log method
   */
  private log(
    level: LogLevel,
    category: string,
    message: string,
    metadata?: any,
    tabId?: string,
    proxyId?: string
  ): void {
    const entry: LogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      level,
      category,
      message,
      metadata,
      sessionId: this.sessionId,
      tabId,
      proxyId
    };

    // Save to database
    try {
      const sql = `
        INSERT INTO activity_logs (
          id, timestamp, level, category, message, metadata,
          session_id, tab_id, proxy_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      this.db.execute(sql, [
        entry.id,
        entry.timestamp.toISOString(),
        entry.level,
        entry.category,
        entry.message,
        metadata ? JSON.stringify(metadata) : null,
        entry.sessionId || null,
        entry.tabId || null,
        entry.proxyId || null
      ]);
    } catch (error) {
      console.error('[Logger] Failed to save log:', error);
    }
  }

  /**
   * Get recent logs
   */
  getRecentLogs(limit: number = 100, level?: LogLevel): LogEntry[] {
    let sql = `
      SELECT * FROM activity_logs
      ${level ? 'WHERE level = ?' : ''}
      ORDER BY timestamp DESC
      LIMIT ?
    `;

    const params = level ? [level, limit] : [limit];
    const rows = this.db.query<any>(sql, params);

    return rows.map(row => ({
      id: row.id,
      timestamp: new Date(row.timestamp),
      level: row.level,
      category: row.category,
      message: row.message,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      sessionId: row.session_id,
      tabId: row.tab_id,
      proxyId: row.proxy_id
    }));
  }

  /**
   * Clear old logs
   */
  clearOldLogs(daysToKeep: number = 30): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const sql = `DELETE FROM activity_logs WHERE timestamp < ?`;
    const result = this.db.execute(sql, [cutoffDate.toISOString()]);

    return result.changes;
  }
}

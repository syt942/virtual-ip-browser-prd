/**
 * Keyword Queue Repository
 * Database operations for keyword queue persistence (PRD SA-001 #10)
 * 
 * Provides CRUD operations for search_keywords table, enabling
 * queue persistence across application restarts.
 */

import { randomUUID } from 'crypto';
import type Database from 'better-sqlite3';
import type { KeywordStatus } from '../../core/automation/keyword-queue';

/**
 * Database row representation for search_keywords table
 */
interface SearchKeywordRow {
  id: string;
  session_id: string;
  keyword: string;
  priority: number;
  status: string;
  retry_count: number;
  max_retries: number;
  metadata: string | null;
  added_at: string;
  updated_at: string;
  created_at: string;
}

/**
 * DTO for keyword queue entries
 */
export interface SearchKeywordDTO {
  id: string;
  sessionId: string;
  keyword: string;
  priority: number;
  status: KeywordStatus;
  retryCount: number;
  maxRetries: number;
  metadata?: Record<string, unknown>;
  addedAt: Date;
  updatedAt: Date;
  createdAt: Date;
}

/**
 * Input for creating a new keyword entry
 */
export interface CreateKeywordInput {
  id?: string;
  sessionId: string;
  keyword: string;
  priority?: number;
  status?: KeywordStatus;
  retryCount?: number;
  maxRetries?: number;
  metadata?: Record<string, unknown>;
  addedAt?: Date;
}

/**
 * Input for updating a keyword entry
 */
export interface UpdateKeywordInput {
  status?: KeywordStatus;
  retryCount?: number;
  priority?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Filter options for querying keywords
 */
export interface KeywordFilter {
  sessionId?: string;
  status?: KeywordStatus;
  statuses?: KeywordStatus[];
}

/**
 * Repository for keyword queue database operations
 */
export class KeywordQueueRepository {
  constructor(private db: Database.Database) {}

  /**
   * Convert database row to DTO
   */
  private toDTO(row: SearchKeywordRow): SearchKeywordDTO {
    return {
      id: row.id,
      sessionId: row.session_id,
      keyword: row.keyword,
      priority: row.priority,
      status: row.status as KeywordStatus,
      retryCount: row.retry_count,
      maxRetries: row.max_retries,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      addedAt: new Date(row.added_at),
      updatedAt: new Date(row.updated_at),
      createdAt: new Date(row.created_at),
    };
  }

  /**
   * Create a new keyword entry
   */
  create(input: CreateKeywordInput): SearchKeywordDTO {
    const id = input.id ?? randomUUID();
    const now = new Date().toISOString();
    const addedAt = input.addedAt?.toISOString() ?? now;

    this.db.prepare(`
      INSERT INTO search_keywords (
        id, session_id, keyword, priority, status,
        retry_count, max_retries, metadata, added_at,
        updated_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.sessionId,
      input.keyword,
      input.priority ?? 0,
      input.status ?? 'pending',
      input.retryCount ?? 0,
      input.maxRetries ?? 3,
      input.metadata ? JSON.stringify(input.metadata) : null,
      addedAt,
      now,
      now
    );

    return this.findById(id)!;
  }

  /**
   * Create multiple keywords in a transaction
   */
  createBulk(inputs: CreateKeywordInput[]): SearchKeywordDTO[] {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO search_keywords (
        id, session_id, keyword, priority, status,
        retry_count, max_retries, metadata, added_at,
        updated_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const ids: string[] = [];

    const insertAll = this.db.transaction(() => {
      for (const input of inputs) {
        const id = input.id ?? randomUUID();
        const addedAt = input.addedAt?.toISOString() ?? now;
        
        stmt.run(
          id,
          input.sessionId,
          input.keyword,
          input.priority ?? 0,
          input.status ?? 'pending',
          input.retryCount ?? 0,
          input.maxRetries ?? 3,
          input.metadata ? JSON.stringify(input.metadata) : null,
          addedAt,
          now,
          now
        );
        ids.push(id);
      }
    });

    insertAll();
    return ids.map(id => this.findById(id)!);
  }

  /**
   * Find keyword by ID
   */
  findById(id: string): SearchKeywordDTO | null {
    const row = this.db.prepare(
      'SELECT * FROM search_keywords WHERE id = ?'
    ).get(id) as SearchKeywordRow | undefined;
    
    return row ? this.toDTO(row) : null;
  }

  /**
   * Find all keywords for a session
   */
  findBySession(sessionId: string): SearchKeywordDTO[] {
    const rows = this.db.prepare(`
      SELECT * FROM search_keywords 
      WHERE session_id = ?
      ORDER BY priority DESC, added_at ASC
    `).all(sessionId) as SearchKeywordRow[];

    return rows.map(row => this.toDTO(row));
  }

  /**
   * Find keywords by filter
   */
  findByFilter(filter: KeywordFilter): SearchKeywordDTO[] {
    let sql = 'SELECT * FROM search_keywords WHERE 1=1';
    const params: unknown[] = [];

    if (filter.sessionId) {
      sql += ' AND session_id = ?';
      params.push(filter.sessionId);
    }

    if (filter.status) {
      sql += ' AND status = ?';
      params.push(filter.status);
    }

    if (filter.statuses && filter.statuses.length > 0) {
      const placeholders = filter.statuses.map(() => '?').join(',');
      sql += ` AND status IN (${placeholders})`;
      params.push(...filter.statuses);
    }

    sql += ' ORDER BY priority DESC, added_at ASC';

    const rows = this.db.prepare(sql).all(...params) as SearchKeywordRow[];
    return rows.map(row => this.toDTO(row));
  }

  /**
   * Update a keyword entry
   */
  update(id: string, input: UpdateKeywordInput): SearchKeywordDTO | null {
    const existing = this.findById(id);
    if (!existing) return null;

    const updates: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const params: unknown[] = [];

    if (input.status !== undefined) {
      updates.push('status = ?');
      params.push(input.status);
    }

    if (input.retryCount !== undefined) {
      updates.push('retry_count = ?');
      params.push(input.retryCount);
    }

    if (input.priority !== undefined) {
      updates.push('priority = ?');
      params.push(input.priority);
    }

    if (input.metadata !== undefined) {
      updates.push('metadata = ?');
      params.push(JSON.stringify(input.metadata));
    }

    if (updates.length === 1) return existing; // Only updated_at

    params.push(id);
    this.db.prepare(`
      UPDATE search_keywords SET ${updates.join(', ')} WHERE id = ?
    `).run(...params);

    return this.findById(id);
  }

  /**
   * Update multiple keywords' status in a transaction
   */
  updateStatusBatch(ids: string[], status: KeywordStatus): number {
    if (ids.length === 0) return 0;

    const placeholders = ids.map(() => '?').join(',');
    const result = this.db.prepare(`
      UPDATE search_keywords 
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id IN (${placeholders})
    `).run(status, ...ids);

    return result.changes;
  }

  /**
   * Delete a keyword by ID
   */
  delete(id: string): boolean {
    const result = this.db.prepare(
      'DELETE FROM search_keywords WHERE id = ?'
    ).run(id);
    return result.changes > 0;
  }

  /**
   * Delete all keywords for a session
   */
  deleteBySession(sessionId: string): number {
    const result = this.db.prepare(
      'DELETE FROM search_keywords WHERE session_id = ?'
    ).run(sessionId);
    return result.changes;
  }

  /**
   * Delete keywords by status for a session
   */
  deleteBySessionAndStatus(sessionId: string, status: KeywordStatus): number {
    const result = this.db.prepare(
      'DELETE FROM search_keywords WHERE session_id = ? AND status = ?'
    ).run(sessionId, status);
    return result.changes;
  }

  /**
   * Get statistics for a session
   */
  getSessionStats(sessionId: string): {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  } {
    const row = this.db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM search_keywords
      WHERE session_id = ?
    `).get(sessionId) as {
      total: number;
      pending: number;
      processing: number;
      completed: number;
      failed: number;
    };

    return {
      total: row.total ?? 0,
      pending: row.pending ?? 0,
      processing: row.processing ?? 0,
      completed: row.completed ?? 0,
      failed: row.failed ?? 0,
    };
  }

  /**
   * Get all unique session IDs
   */
  getSessionIds(): string[] {
    const rows = this.db.prepare(`
      SELECT session_id, MAX(created_at) as last_created
      FROM search_keywords
      GROUP BY session_id
      ORDER BY last_created DESC
    `).all() as { session_id: string; last_created: string }[];

    return rows.map(r => r.session_id);
  }

  /**
   * Check if a keyword exists in a session (for deduplication)
   */
  existsInSession(sessionId: string, keyword: string): boolean {
    const row = this.db.prepare(`
      SELECT 1 FROM search_keywords 
      WHERE session_id = ? AND LOWER(keyword) = LOWER(?)
      LIMIT 1
    `).get(sessionId, keyword);

    return !!row;
  }

  /**
   * Clean up old sessions (maintenance operation)
   */
  cleanupOldSessions(retentionDays: number): number {
    const result = this.db.prepare(`
      DELETE FROM search_keywords 
      WHERE created_at < datetime('now', '-' || ? || ' days')
    `).run(retentionDays);

    return result.changes;
  }
}

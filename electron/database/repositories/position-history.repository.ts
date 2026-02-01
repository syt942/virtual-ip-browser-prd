/**
 * Position History Repository
 * Database operations for SERP position tracking history
 * 
 * Implements the repository pattern to separate data access from business logic.
 * Used by PositionTracker for persistent storage of position records.
 * 
 * @module electron/database/repositories/position-history.repository
 */

import type Database from 'better-sqlite3';
import type { SearchEngine } from '../../core/automation/types';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Raw database entity for position records
 */
interface PositionRecordEntity {
  id: string;
  keyword: string;
  domain: string;
  engine: string;
  position: number | null;
  page: number;
  url: string;
  title: string;
  description: string;
  timestamp: string;
  proxy_region: string | null;
  metadata: string | null;
}

/**
 * DTO for position records (application layer)
 */
export interface PositionRecordDTO {
  id: string;
  keyword: string;
  domain: string;
  engine: SearchEngine;
  position: number | null;
  page: number;
  url: string;
  title: string;
  description: string;
  timestamp: Date;
  proxyRegion?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Input for creating a position record
 */
export interface CreatePositionRecordInput {
  id: string;
  keyword: string;
  domain: string;
  engine: SearchEngine;
  position: number | null;
  page: number;
  url: string;
  title: string;
  description: string;
  timestamp: Date;
  proxyRegion?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Filter options for querying position records
 */
export interface PositionRecordFilter {
  keyword?: string;
  domain?: string;
  engine?: SearchEngine;
  startDate?: Date;
  endDate?: Date;
  hasPosition?: boolean;
}

/**
 * Aggregated statistics for a keyword-domain pair
 */
export interface PositionAggregateStats {
  keyword: string;
  domain: string;
  engine: string;
  recordCount: number;
  avgPosition: number | null;
  bestPosition: number | null;
  worstPosition: number | null;
  lastRecordedAt: Date | null;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Maximum records per keyword-domain-engine combination */
const DEFAULT_HISTORY_LIMIT = 100;

/** Batch size for bulk operations */
const BATCH_INSERT_SIZE = 100;

// ============================================================================
// REPOSITORY CLASS
// ============================================================================

/**
 * Repository for managing position history records in the database.
 * 
 * Provides CRUD operations, filtering, aggregation, and cleanup functionality
 * for SERP position tracking data.
 * 
 * @example
 * ```typescript
 * const repo = new PositionHistoryRepository(db);
 * 
 * // Save a record
 * repo.save({
 *   id: 'uuid',
 *   keyword: 'best coffee',
 *   domain: 'example.com',
 *   engine: 'google',
 *   position: 5,
 *   page: 1,
 *   url: 'https://example.com/coffee',
 *   title: 'Best Coffee Guide',
 *   description: 'Your guide to coffee...',
 *   timestamp: new Date()
 * });
 * 
 * // Query records
 * const history = repo.findByKeywordDomainEngine('best coffee', 'example.com', 'google');
 * ```
 */
export class PositionHistoryRepository {
  constructor(private db: Database.Database) {
    this.ensureTable();
  }

  // --------------------------------------------------------------------------
  // Schema Management
  // --------------------------------------------------------------------------

  /**
   * Ensure the position_history table exists
   */
  private ensureTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS position_history (
        id TEXT PRIMARY KEY,
        keyword TEXT NOT NULL,
        domain TEXT NOT NULL,
        engine TEXT NOT NULL CHECK (engine IN ('google', 'bing', 'duckduckgo', 'yahoo', 'brave')),
        position INTEGER,
        page INTEGER NOT NULL,
        url TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        timestamp DATETIME NOT NULL,
        proxy_region TEXT,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_position_history_keyword_domain_engine 
        ON position_history(keyword, domain, engine);
      CREATE INDEX IF NOT EXISTS idx_position_history_timestamp 
        ON position_history(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_position_history_keyword 
        ON position_history(keyword);
      CREATE INDEX IF NOT EXISTS idx_position_history_domain 
        ON position_history(domain);
    `);
  }

  // --------------------------------------------------------------------------
  // CRUD Operations
  // --------------------------------------------------------------------------

  /**
   * Save a position record to the database
   * 
   * @param record - The record to save
   * @returns The saved record
   */
  save(record: CreatePositionRecordInput): PositionRecordDTO {
    this.db.prepare(`
      INSERT INTO position_history (
        id, keyword, domain, engine, position, page, url, 
        title, description, timestamp, proxy_region, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      record.id,
      record.keyword,
      record.domain,
      record.engine,
      record.position,
      record.page,
      record.url,
      record.title,
      record.description ?? '',
      record.timestamp.toISOString(),
      record.proxyRegion ?? null,
      record.metadata ? JSON.stringify(record.metadata) : null
    );

    return this.toDTO(record as unknown as PositionRecordEntity);
  }

  /**
   * Save multiple records in a batch transaction
   * 
   * @param records - Array of records to save
   * @returns Number of records saved
   */
  saveBatch(records: CreatePositionRecordInput[]): number {
    const stmt = this.db.prepare(`
      INSERT INTO position_history (
        id, keyword, domain, engine, position, page, url,
        title, description, timestamp, proxy_region, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction((items: CreatePositionRecordInput[]) => {
      let count = 0;
      for (const record of items) {
        stmt.run(
          record.id,
          record.keyword,
          record.domain,
          record.engine,
          record.position,
          record.page,
          record.url,
          record.title,
          record.description ?? '',
          record.timestamp.toISOString(),
          record.proxyRegion ?? null,
          record.metadata ? JSON.stringify(record.metadata) : null
        );
        count++;
      }
      return count;
    });

    // Process in batches for very large imports
    let totalSaved = 0;
    for (let i = 0; i < records.length; i += BATCH_INSERT_SIZE) {
      const batch = records.slice(i, i + BATCH_INSERT_SIZE);
      totalSaved += transaction(batch);
    }

    return totalSaved;
  }

  /**
   * Find a record by ID
   * 
   * @param id - The record ID
   * @returns The record or null if not found
   */
  findById(id: string): PositionRecordDTO | null {
    const entity = this.db.prepare(
      'SELECT * FROM position_history WHERE id = ?'
    ).get(id) as PositionRecordEntity | undefined;

    return entity ? this.toDTO(entity) : null;
  }

  /**
   * Delete a record by ID
   * 
   * @param id - The record ID
   * @returns True if deleted, false if not found
   */
  delete(id: string): boolean {
    const result = this.db.prepare(
      'DELETE FROM position_history WHERE id = ?'
    ).run(id);
    return result.changes > 0;
  }

  // --------------------------------------------------------------------------
  // Query Operations
  // --------------------------------------------------------------------------

  /**
   * Find records by keyword
   * 
   * @param keyword - The search keyword
   * @param limit - Maximum records to return
   * @returns Array of matching records
   */
  findByKeyword(keyword: string, limit: number = DEFAULT_HISTORY_LIMIT): PositionRecordDTO[] {
    const entities = this.db.prepare(`
      SELECT * FROM position_history 
      WHERE keyword = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(keyword, limit) as PositionRecordEntity[];

    return entities.map(e => this.toDTO(e));
  }

  /**
   * Find records by domain
   * 
   * @param domain - The target domain
   * @param limit - Maximum records to return
   * @returns Array of matching records
   */
  findByDomain(domain: string, limit: number = DEFAULT_HISTORY_LIMIT): PositionRecordDTO[] {
    const entities = this.db.prepare(`
      SELECT * FROM position_history 
      WHERE domain = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(domain, limit) as PositionRecordEntity[];

    return entities.map(e => this.toDTO(e));
  }

  /**
   * Find records by keyword, domain, and engine combination
   * 
   * @param keyword - The search keyword
   * @param domain - The target domain
   * @param engine - The search engine
   * @param limit - Maximum records to return
   * @returns Array of matching records sorted by timestamp descending
   */
  findByKeywordDomainEngine(
    keyword: string,
    domain: string,
    engine: SearchEngine,
    limit: number = DEFAULT_HISTORY_LIMIT
  ): PositionRecordDTO[] {
    const entities = this.db.prepare(`
      SELECT * FROM position_history 
      WHERE keyword = ? AND domain = ? AND engine = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(keyword, domain, engine, limit) as PositionRecordEntity[];

    return entities.map(e => this.toDTO(e));
  }

  /**
   * Find records within a date range
   * 
   * @param startDate - Start of the range
   * @param endDate - End of the range
   * @param filter - Optional additional filters
   * @returns Array of matching records
   */
  findInDateRange(
    startDate: Date,
    endDate: Date,
    filter?: Omit<PositionRecordFilter, 'startDate' | 'endDate'>
  ): PositionRecordDTO[] {
    let sql = `
      SELECT * FROM position_history 
      WHERE timestamp >= ? AND timestamp <= ?
    `;
    const params: unknown[] = [startDate.toISOString(), endDate.toISOString()];

    if (filter?.keyword) {
      sql += ' AND keyword = ?';
      params.push(filter.keyword);
    }
    if (filter?.domain) {
      sql += ' AND domain = ?';
      params.push(filter.domain);
    }
    if (filter?.engine) {
      sql += ' AND engine = ?';
      params.push(filter.engine);
    }
    if (filter?.hasPosition === true) {
      sql += ' AND position IS NOT NULL';
    } else if (filter?.hasPosition === false) {
      sql += ' AND position IS NULL';
    }

    sql += ' ORDER BY timestamp DESC';

    const entities = this.db.prepare(sql).all(...params) as PositionRecordEntity[];
    return entities.map(e => this.toDTO(e));
  }

  /**
   * Get the latest record for a keyword-domain-engine combination
   * 
   * @param keyword - The search keyword
   * @param domain - The target domain
   * @param engine - The search engine
   * @returns The latest record or null
   */
  findLatest(keyword: string, domain: string, engine: SearchEngine): PositionRecordDTO | null {
    const entity = this.db.prepare(`
      SELECT * FROM position_history 
      WHERE keyword = ? AND domain = ? AND engine = ?
      ORDER BY timestamp DESC
      LIMIT 1
    `).get(keyword, domain, engine) as PositionRecordEntity | undefined;

    return entity ? this.toDTO(entity) : null;
  }

  /**
   * Get all distinct keyword-domain-engine combinations
   * 
   * @returns Array of tracked pairs
   */
  getTrackedPairs(): Array<{ keyword: string; domain: string; engine: string }> {
    return this.db.prepare(`
      SELECT DISTINCT keyword, domain, engine 
      FROM position_history
      ORDER BY keyword, domain, engine
    `).all() as Array<{ keyword: string; domain: string; engine: string }>;
  }

  // --------------------------------------------------------------------------
  // Aggregation Operations
  // --------------------------------------------------------------------------

  /**
   * Get aggregated statistics for a keyword-domain-engine combination
   * 
   * @param keyword - The search keyword
   * @param domain - The target domain
   * @param engine - The search engine
   * @returns Aggregated statistics
   */
  getAggregateStats(keyword: string, domain: string, engine: SearchEngine): PositionAggregateStats {
    interface StatsRow {
      keyword: string;
      domain: string;
      engine: string;
      record_count: number;
      avg_position: number | null;
      best_position: number | null;
      worst_position: number | null;
      last_recorded_at: string | null;
    }

    const result = this.db.prepare(`
      SELECT 
        keyword,
        domain,
        engine,
        COUNT(*) as record_count,
        AVG(position) as avg_position,
        MIN(position) as best_position,
        MAX(position) as worst_position,
        MAX(timestamp) as last_recorded_at
      FROM position_history
      WHERE keyword = ? AND domain = ? AND engine = ?
      GROUP BY keyword, domain, engine
    `).get(keyword, domain, engine) as StatsRow | undefined;

    if (!result) {
      return {
        keyword,
        domain,
        engine,
        recordCount: 0,
        avgPosition: null,
        bestPosition: null,
        worstPosition: null,
        lastRecordedAt: null
      };
    }

    return {
      keyword: result.keyword,
      domain: result.domain,
      engine: result.engine,
      recordCount: result.record_count,
      avgPosition: result.avg_position ? Math.round(result.avg_position * 100) / 100 : null,
      bestPosition: result.best_position,
      worstPosition: result.worst_position,
      lastRecordedAt: result.last_recorded_at ? new Date(result.last_recorded_at) : null
    };
  }

  /**
   * Get total record count
   * 
   * @param filter - Optional filter criteria
   * @returns Total count of matching records
   */
  count(filter?: PositionRecordFilter): number {
    let sql = 'SELECT COUNT(*) as count FROM position_history WHERE 1=1';
    const params: unknown[] = [];

    if (filter?.keyword) {
      sql += ' AND keyword = ?';
      params.push(filter.keyword);
    }
    if (filter?.domain) {
      sql += ' AND domain = ?';
      params.push(filter.domain);
    }
    if (filter?.engine) {
      sql += ' AND engine = ?';
      params.push(filter.engine);
    }
    if (filter?.startDate) {
      sql += ' AND timestamp >= ?';
      params.push(filter.startDate.toISOString());
    }
    if (filter?.endDate) {
      sql += ' AND timestamp <= ?';
      params.push(filter.endDate.toISOString());
    }

    const result = this.db.prepare(sql).get(...params) as { count: number };
    return result.count;
  }

  // --------------------------------------------------------------------------
  // Cleanup Operations
  // --------------------------------------------------------------------------

  /**
   * Delete records older than a certain date
   * 
   * @param beforeDate - Delete records before this date
   * @returns Number of records deleted
   */
  deleteOlderThan(beforeDate: Date): number {
    const result = this.db.prepare(
      'DELETE FROM position_history WHERE timestamp < ?'
    ).run(beforeDate.toISOString());
    return result.changes;
  }

  /**
   * Delete all records for a keyword-domain-engine combination
   * 
   * @param keyword - The search keyword
   * @param domain - The target domain
   * @param engine - The search engine
   * @returns Number of records deleted
   */
  deleteByKeywordDomainEngine(keyword: string, domain: string, engine: SearchEngine): number {
    const result = this.db.prepare(
      'DELETE FROM position_history WHERE keyword = ? AND domain = ? AND engine = ?'
    ).run(keyword, domain, engine);
    return result.changes;
  }

  /**
   * Enforce history limit by keeping only the most recent N records
   * per keyword-domain-engine combination
   * 
   * @param limit - Maximum records to keep per combination
   * @returns Number of records deleted
   */
  enforceHistoryLimit(limit: number = DEFAULT_HISTORY_LIMIT): number {
    const pairs = this.getTrackedPairs();
    let totalDeleted = 0;

    const deleteStmt = this.db.prepare(`
      DELETE FROM position_history
      WHERE keyword = ? AND domain = ? AND engine = ?
      AND id NOT IN (
        SELECT id FROM position_history
        WHERE keyword = ? AND domain = ? AND engine = ?
        ORDER BY timestamp DESC
        LIMIT ?
      )
    `);

    const transaction = this.db.transaction(() => {
      for (const pair of pairs) {
        const result = deleteStmt.run(
          pair.keyword, pair.domain, pair.engine,
          pair.keyword, pair.domain, pair.engine,
          limit
        );
        totalDeleted += result.changes;
      }
    });

    transaction();
    return totalDeleted;
  }

  /**
   * Delete all position history records
   * 
   * @returns Number of records deleted
   */
  deleteAll(): number {
    const result = this.db.prepare('DELETE FROM position_history').run();
    return result.changes;
  }

  // --------------------------------------------------------------------------
  // Export Operations
  // --------------------------------------------------------------------------

  /**
   * Export all records (for backup/migration)
   * 
   * @returns Array of all position records
   */
  exportAll(): PositionRecordDTO[] {
    const entities = this.db.prepare(`
      SELECT * FROM position_history ORDER BY timestamp ASC
    `).all() as PositionRecordEntity[];

    return entities.map(e => this.toDTO(e));
  }

  // --------------------------------------------------------------------------
  // Private Helpers
  // --------------------------------------------------------------------------

  /**
   * Convert database entity to DTO
   */
  private toDTO(entity: PositionRecordEntity): PositionRecordDTO {
    return {
      id: entity.id,
      keyword: entity.keyword,
      domain: entity.domain,
      engine: entity.engine as SearchEngine,
      position: entity.position,
      page: entity.page,
      url: entity.url,
      title: entity.title,
      description: entity.description ?? '',
      timestamp: new Date(entity.timestamp),
      proxyRegion: entity.proxy_region ?? undefined,
      metadata: entity.metadata ? JSON.parse(entity.metadata) : undefined
    };
  }
}

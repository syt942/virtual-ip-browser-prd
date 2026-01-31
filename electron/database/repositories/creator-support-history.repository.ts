/**
 * Creator Support History Repository
 * Database operations for creator support action tracking
 */

import type Database from 'better-sqlite3';
import type {
  CreatorSupportHistoryEntity,
  CreatorSupportHistoryDTO,
  CreateCreatorSupportHistoryInput,
  CreatorSupportActionType,
  CreatorSupportStats
} from '../migrations/types';

export class CreatorSupportHistoryRepository {
  constructor(private db: Database.Database) {}

  /**
   * Convert entity to DTO
   */
  private toDTO(entity: CreatorSupportHistoryEntity): CreatorSupportHistoryDTO {
    return {
      id: entity.id,
      creatorId: entity.creator_id,
      actionType: entity.action_type as CreatorSupportActionType,
      targetUrl: entity.target_url,
      timestamp: new Date(entity.timestamp * 1000), // Unix timestamp to Date
      sessionId: entity.session_id,
      proxyId: entity.proxy_id,
      success: entity.success === 1,
      errorMessage: entity.error_message,
      metadata: entity.metadata ? JSON.parse(entity.metadata) : undefined
    };
  }

  /**
   * Record a new support action
   */
  create(input: CreateCreatorSupportHistoryInput): CreatorSupportHistoryDTO {
    const timestamp = input.timestamp instanceof Date 
      ? Math.floor(input.timestamp.getTime() / 1000)
      : input.timestamp;

    const result = this.db.prepare(`
      INSERT INTO creator_support_history (
        creator_id, action_type, target_url, timestamp,
        session_id, proxy_id, success, error_message, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      input.creatorId,
      input.actionType,
      input.targetUrl || null,
      timestamp,
      input.sessionId || null,
      input.proxyId || null,
      input.success !== false ? 1 : 0,
      input.errorMessage || null,
      input.metadata ? JSON.stringify(input.metadata) : null
    );

    return this.findById(Number(result.lastInsertRowid))!;
  }

  /**
   * Find by ID
   */
  findById(id: number): CreatorSupportHistoryDTO | null {
    const entity = this.db.prepare(
      'SELECT * FROM creator_support_history WHERE id = ?'
    ).get(id) as CreatorSupportHistoryEntity | undefined;
    
    return entity ? this.toDTO(entity) : null;
  }

  /**
   * Find by creator ID
   */
  findByCreatorId(creatorId: number, limit: number = 100): CreatorSupportHistoryDTO[] {
    const entities = this.db.prepare(`
      SELECT * FROM creator_support_history 
      WHERE creator_id = ?
      ORDER BY timestamp DESC 
      LIMIT ?
    `).all(creatorId, limit) as CreatorSupportHistoryEntity[];
    
    return entities.map(e => this.toDTO(e));
  }

  /**
   * Find by session ID
   */
  findBySessionId(sessionId: string): CreatorSupportHistoryDTO[] {
    const entities = this.db.prepare(`
      SELECT * FROM creator_support_history 
      WHERE session_id = ?
      ORDER BY timestamp DESC
    `).all(sessionId) as CreatorSupportHistoryEntity[];
    
    return entities.map(e => this.toDTO(e));
  }

  /**
   * Find by time range
   */
  findByTimeRange(startTime: Date, endTime: Date): CreatorSupportHistoryDTO[] {
    const startTimestamp = Math.floor(startTime.getTime() / 1000);
    const endTimestamp = Math.floor(endTime.getTime() / 1000);
    
    const entities = this.db.prepare(`
      SELECT * FROM creator_support_history 
      WHERE timestamp >= ? AND timestamp <= ?
      ORDER BY timestamp DESC
    `).all(startTimestamp, endTimestamp) as CreatorSupportHistoryEntity[];
    
    return entities.map(e => this.toDTO(e));
  }

  /**
   * Find by action type
   */
  findByActionType(actionType: CreatorSupportActionType, limit: number = 100): CreatorSupportHistoryDTO[] {
    const entities = this.db.prepare(`
      SELECT * FROM creator_support_history 
      WHERE action_type = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(actionType, limit) as CreatorSupportHistoryEntity[];
    
    return entities.map(e => this.toDTO(e));
  }

  /**
   * Find recent entries
   */
  findRecent(limit: number = 100): CreatorSupportHistoryDTO[] {
    const entities = this.db.prepare(`
      SELECT * FROM creator_support_history 
      ORDER BY timestamp DESC 
      LIMIT ?
    `).all(limit) as CreatorSupportHistoryEntity[];
    
    return entities.map(e => this.toDTO(e));
  }

  /**
   * Find failed actions
   */
  findFailed(limit: number = 100): CreatorSupportHistoryDTO[] {
    const entities = this.db.prepare(`
      SELECT * FROM creator_support_history 
      WHERE success = 0
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(limit) as CreatorSupportHistoryEntity[];
    
    return entities.map(e => this.toDTO(e));
  }

  /**
   * Get statistics for a creator
   */
  getCreatorStats(creatorId: number): CreatorSupportStats {
    interface CreatorStatsRow {
      total_actions: number;
      successful_actions: number;
      failed_actions: number;
      total_clicks: number;
      total_scrolls: number;
      total_visits: number;
      last_action_timestamp: number | null;
    }
    const result = this.db.prepare(`
      SELECT 
        COUNT(*) as total_actions,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_actions,
        SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed_actions,
        SUM(CASE WHEN action_type = 'click' THEN 1 ELSE 0 END) as total_clicks,
        SUM(CASE WHEN action_type = 'scroll' THEN 1 ELSE 0 END) as total_scrolls,
        SUM(CASE WHEN action_type = 'visit' THEN 1 ELSE 0 END) as total_visits,
        MAX(timestamp) as last_action_timestamp
      FROM creator_support_history
      WHERE creator_id = ?
    `).get(creatorId) as CreatorStatsRow;

    return {
      creatorId,
      totalActions: result.total_actions || 0,
      successfulActions: result.successful_actions || 0,
      failedActions: result.failed_actions || 0,
      totalClicks: result.total_clicks || 0,
      totalScrolls: result.total_scrolls || 0,
      totalVisits: result.total_visits || 0,
      lastActionTimestamp: result.last_action_timestamp 
        ? new Date(result.last_action_timestamp * 1000) 
        : undefined
    };
  }

  /**
   * Get action counts by type for time period
   */
  getActionCountsByType(hours: number = 24): Record<CreatorSupportActionType, number> {
    const startTimestamp = Math.floor((Date.now() - hours * 60 * 60 * 1000) / 1000);
    
    const rows = this.db.prepare(`
      SELECT action_type, COUNT(*) as count
      FROM creator_support_history
      WHERE timestamp >= ?
      GROUP BY action_type
    `).all(startTimestamp) as { action_type: CreatorSupportActionType; count: number }[];

    const result: Record<CreatorSupportActionType, number> = {
      click: 0,
      scroll: 0,
      visit: 0
    };

    for (const row of rows) {
      result[row.action_type] = row.count;
    }
    
    return result;
  }

  /**
   * Get hourly action counts for charting
   */
  getHourlyCounts(hours: number = 24): Array<{ hour: string; count: number }> {
    const startTimestamp = Math.floor((Date.now() - hours * 60 * 60 * 1000) / 1000);
    
    return this.db.prepare(`
      SELECT 
        strftime('%Y-%m-%d %H:00:00', timestamp, 'unixepoch') as hour,
        COUNT(*) as count
      FROM creator_support_history
      WHERE timestamp >= ?
      GROUP BY hour
      ORDER BY hour ASC
    `).all(startTimestamp) as Array<{ hour: string; count: number }>;
  }

  /**
   * Get success rate for a time period
   */
  getSuccessRate(hours: number = 24): number {
    const startTimestamp = Math.floor((Date.now() - hours * 60 * 60 * 1000) / 1000);
    
    const result = this.db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful
      FROM creator_support_history
      WHERE timestamp >= ?
    `).get(startTimestamp) as { total: number; successful: number };

    if (result.total === 0) {return 100;}
    return (result.successful / result.total) * 100;
  }

  /**
   * Get most active creators
   */
  getMostActiveCreators(limit: number = 10, hours: number = 24): Array<{
    creatorId: number;
    actionCount: number;
  }> {
    const startTimestamp = Math.floor((Date.now() - hours * 60 * 60 * 1000) / 1000);
    
    return this.db.prepare(`
      SELECT 
        creator_id,
        COUNT(*) as action_count
      FROM creator_support_history
      WHERE timestamp >= ?
      GROUP BY creator_id
      ORDER BY action_count DESC
      LIMIT ?
    `).all(startTimestamp, limit) as Array<{ creatorId: number; actionCount: number }>;
  }

  /**
   * Cleanup old records (retention policy)
   */
  cleanup(retentionDays: number = 30): number {
    const cutoffTimestamp = Math.floor((Date.now() - retentionDays * 24 * 60 * 60 * 1000) / 1000);
    const result = this.db.prepare(
      'DELETE FROM creator_support_history WHERE timestamp < ?'
    ).run(cutoffTimestamp);
    return result.changes;
  }

  /**
   * Delete all records for a creator
   */
  deleteByCreatorId(creatorId: number): number {
    const result = this.db.prepare(
      'DELETE FROM creator_support_history WHERE creator_id = ?'
    ).run(creatorId);
    return result.changes;
  }

  /**
   * Batch insert multiple records
   */
  batchCreate(inputs: CreateCreatorSupportHistoryInput[]): number {
    const stmt = this.db.prepare(`
      INSERT INTO creator_support_history (
        creator_id, action_type, target_url, timestamp,
        session_id, proxy_id, success, error_message, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction(() => {
      let count = 0;
      for (const input of inputs) {
        const timestamp = input.timestamp instanceof Date 
          ? Math.floor(input.timestamp.getTime() / 1000)
          : input.timestamp;

        stmt.run(
          input.creatorId,
          input.actionType,
          input.targetUrl || null,
          timestamp,
          input.sessionId || null,
          input.proxyId || null,
          input.success !== false ? 1 : 0,
          input.errorMessage || null,
          input.metadata ? JSON.stringify(input.metadata) : null
        );
        count++;
      }
      return count;
    });

    return transaction();
  }
}

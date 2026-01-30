/**
 * Rotation Events Repository
 * Database operations for rotation event audit logging
 */

import { randomUUID } from 'crypto';
import type Database from 'better-sqlite3';
import type {
  RotationEventEntity,
  RotationEventDTO,
  RecordRotationEventInput,
  RotationReason
} from '../migrations/types';

export class RotationEventsRepository {
  constructor(private db: Database.Database) {}

  /**
   * Convert entity to DTO
   */
  private toDTO(entity: RotationEventEntity): RotationEventDTO {
    return {
      id: entity.id,
      timestamp: new Date(entity.timestamp),
      configId: entity.config_id,
      previousProxyId: entity.previous_proxy_id,
      newProxyId: entity.new_proxy_id,
      reason: entity.reason,
      domain: entity.domain,
      url: entity.url,
      tabId: entity.tab_id,
      sessionId: entity.session_id,
      metadata: entity.metadata ? JSON.parse(entity.metadata) : undefined
    };
  }

  /**
   * Record a rotation event
   */
  record(input: RecordRotationEventInput): RotationEventDTO {
    const id = randomUUID();

    this.db.prepare(`
      INSERT INTO rotation_events (
        id, config_id, previous_proxy_id, new_proxy_id,
        reason, domain, url, tab_id, session_id, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.configId || null,
      input.previousProxyId || null,
      input.newProxyId || null,
      input.reason,
      input.domain || null,
      input.url || null,
      input.tabId || null,
      input.sessionId || null,
      input.metadata ? JSON.stringify(input.metadata) : null
    );

    return this.findById(id)!;
  }

  /**
   * Find by ID
   */
  findById(id: string): RotationEventDTO | null {
    const entity = this.db.prepare(
      'SELECT * FROM rotation_events WHERE id = ?'
    ).get(id) as RotationEventEntity | undefined;
    
    return entity ? this.toDTO(entity) : null;
  }

  /**
   * Find recent events
   */
  findRecent(limit: number = 100): RotationEventDTO[] {
    const entities = this.db.prepare(`
      SELECT * FROM rotation_events 
      ORDER BY timestamp DESC 
      LIMIT ?
    `).all(limit) as RotationEventEntity[];
    
    return entities.map(e => this.toDTO(e));
  }

  /**
   * Find events by time range
   */
  findByTimeRange(startTime: Date, endTime: Date): RotationEventDTO[] {
    const entities = this.db.prepare(`
      SELECT * FROM rotation_events 
      WHERE timestamp >= ? AND timestamp <= ?
      ORDER BY timestamp DESC
    `).all(startTime.toISOString(), endTime.toISOString()) as RotationEventEntity[];
    
    return entities.map(e => this.toDTO(e));
  }

  /**
   * Find events by reason
   */
  findByReason(reason: RotationReason, limit: number = 100): RotationEventDTO[] {
    const entities = this.db.prepare(`
      SELECT * FROM rotation_events 
      WHERE reason = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(reason, limit) as RotationEventEntity[];
    
    return entities.map(e => this.toDTO(e));
  }

  /**
   * Find events for a proxy
   */
  findByProxyId(proxyId: string, limit: number = 100): RotationEventDTO[] {
    const entities = this.db.prepare(`
      SELECT * FROM rotation_events 
      WHERE previous_proxy_id = ? OR new_proxy_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(proxyId, proxyId, limit) as RotationEventEntity[];
    
    return entities.map(e => this.toDTO(e));
  }

  /**
   * Find events for a config
   */
  findByConfigId(configId: string, limit: number = 100): RotationEventDTO[] {
    const entities = this.db.prepare(`
      SELECT * FROM rotation_events 
      WHERE config_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(configId, limit) as RotationEventEntity[];
    
    return entities.map(e => this.toDTO(e));
  }

  /**
   * Find events for a domain
   */
  findByDomain(domain: string, limit: number = 100): RotationEventDTO[] {
    const entities = this.db.prepare(`
      SELECT * FROM rotation_events 
      WHERE domain = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(domain, limit) as RotationEventEntity[];
    
    return entities.map(e => this.toDTO(e));
  }

  /**
   * Get rotation count by reason (last N hours)
   */
  getCountByReason(hours: number = 24): Record<RotationReason, number> {
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    
    const rows = this.db.prepare(`
      SELECT reason, COUNT(*) as count
      FROM rotation_events
      WHERE timestamp >= ?
      GROUP BY reason
    `).all(startTime) as { reason: RotationReason; count: number }[];

    const result: Partial<Record<RotationReason, number>> = {};
    for (const row of rows) {
      result[row.reason] = row.count;
    }
    
    return result as Record<RotationReason, number>;
  }

  /**
   * Get rotation frequency (rotations per hour)
   */
  getRotationFrequency(hours: number = 24): number {
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    
    const result = this.db.prepare(`
      SELECT COUNT(*) as count FROM rotation_events WHERE timestamp >= ?
    `).get(startTime) as { count: number };

    return result.count / hours;
  }

  /**
   * Get hourly rotation counts for charting
   */
  getHourlyCounts(hours: number = 24): Array<{ hour: string; count: number }> {
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    
    return this.db.prepare(`
      SELECT 
        strftime('%Y-%m-%d %H:00:00', timestamp) as hour,
        COUNT(*) as count
      FROM rotation_events
      WHERE timestamp >= ?
      GROUP BY hour
      ORDER BY hour ASC
    `).all(startTime) as Array<{ hour: string; count: number }>;
  }

  /**
   * Get most rotated proxies
   */
  getMostRotatedProxies(limit: number = 10, hours: number = 24): Array<{
    proxyId: string;
    rotationCount: number;
  }> {
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    
    return this.db.prepare(`
      SELECT 
        new_proxy_id as proxy_id,
        COUNT(*) as rotation_count
      FROM rotation_events
      WHERE timestamp >= ? AND new_proxy_id IS NOT NULL
      GROUP BY new_proxy_id
      ORDER BY rotation_count DESC
      LIMIT ?
    `).all(startTime, limit) as Array<{ proxyId: string; rotationCount: number }>;
  }

  /**
   * Cleanup old events (retention policy)
   */
  cleanup(retentionDays: number = 30): number {
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
    const result = this.db.prepare(
      'DELETE FROM rotation_events WHERE timestamp < ?'
    ).run(cutoff);
    return result.changes;
  }
}

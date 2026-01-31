/**
 * Proxy Usage Stats Repository
 * Database operations for proxy analytics and usage tracking
 */

import type Database from 'better-sqlite3';
import type {
  ProxyUsageStatsEntity,
  ProxyUsageStatsDTO,
  ErrorCounts,
  ProxyCurrentStatsView
} from '../migrations/types';
// randomUUID, CreateProxyUsageStatsInput, UpdateProxyUsageStatsInput reserved for future use

export interface AggregatedStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  successRate: number;
  avgLatencyMs: number;
  totalBytesSent: number;
  totalBytesReceived: number;
  totalRotations: number;
}

export interface TimeSeriesDataPoint {
  timeBucket: Date;
  requests: number;
  successRate: number;
  avgLatency: number;
}

export interface UsageRecord {
  proxyId: string;
  requests?: number;
  successful?: number;
  failed?: number;
  latencyMs?: number;
  bytesSent?: number;
  bytesReceived?: number;
  error?: { type: string; message: string };
  domain?: string;
  country?: string;
  sessionId?: string;
}

export class ProxyUsageStatsRepository {
  constructor(private db: Database.Database) {}

  /**
   * Convert entity to DTO
   */
  private toDTO(entity: ProxyUsageStatsEntity): ProxyUsageStatsDTO {
    return {
      id: entity.id,
      proxyId: entity.proxy_id,
      timeBucket: new Date(entity.time_bucket),
      totalRequests: entity.total_requests,
      successfulRequests: entity.successful_requests,
      failedRequests: entity.failed_requests,
      avgLatencyMs: entity.avg_latency_ms,
      minLatencyMs: entity.min_latency_ms,
      maxLatencyMs: entity.max_latency_ms,
      p95LatencyMs: entity.p95_latency_ms,
      bytesSent: entity.bytes_sent,
      bytesReceived: entity.bytes_received,
      rotationCount: entity.rotation_count,
      rotationReasons: entity.rotation_reasons ? JSON.parse(entity.rotation_reasons) : [],
      errorCounts: entity.error_counts ? JSON.parse(entity.error_counts) : {},
      lastError: entity.last_error,
      lastErrorAt: entity.last_error_at ? new Date(entity.last_error_at) : undefined,
      targetCountries: entity.target_countries ? JSON.parse(entity.target_countries) : [],
      uniqueDomains: entity.unique_domains,
      uniqueSessions: entity.unique_sessions,
      createdAt: new Date(entity.created_at),
      updatedAt: new Date(entity.updated_at)
    };
  }

  /**
   * Get or create time bucket (hourly granularity)
   */
  private getTimeBucket(date: Date = new Date()): string {
    const d = new Date(date);
    d.setMinutes(0, 0, 0);
    return d.toISOString();
  }

  /**
   * Record usage stats (upsert into current time bucket)
   */
  recordUsage(
    proxyId: string,
    stats: {
      requests?: number;
      successful?: number;
      failed?: number;
      latencyMs?: number;
      bytesSent?: number;
      bytesReceived?: number;
      error?: { type: string; message: string };
      domain?: string;
      country?: string;
      sessionId?: string;
    }
  ): void {
    const timeBucket = this.getTimeBucket();
    const id = `${proxyId}_${timeBucket}`;

    // Try to get existing record
    const existing = this.db.prepare(
      'SELECT * FROM proxy_usage_stats WHERE proxy_id = ? AND time_bucket = ?'
    ).get(proxyId, timeBucket) as ProxyUsageStatsEntity | undefined;

    if (existing) {
      // Update existing record
      const updates: string[] = [];
      const params: unknown[] = [];

      if (stats.requests) {
        updates.push('total_requests = total_requests + ?');
        params.push(stats.requests);
      }
      if (stats.successful) {
        updates.push('successful_requests = successful_requests + ?');
        params.push(stats.successful);
      }
      if (stats.failed) {
        updates.push('failed_requests = failed_requests + ?');
        params.push(stats.failed);
      }
      if (stats.bytesSent) {
        updates.push('bytes_sent = bytes_sent + ?');
        params.push(stats.bytesSent);
      }
      if (stats.bytesReceived) {
        updates.push('bytes_received = bytes_received + ?');
        params.push(stats.bytesReceived);
      }
      if (stats.latencyMs !== undefined) {
        // Update running average
        updates.push(`avg_latency_ms = (COALESCE(avg_latency_ms, 0) * total_requests + ?) / (total_requests + 1)`);
        params.push(stats.latencyMs);
        updates.push('min_latency_ms = MIN(COALESCE(min_latency_ms, ?), ?)');
        params.push(stats.latencyMs, stats.latencyMs);
        updates.push('max_latency_ms = MAX(COALESCE(max_latency_ms, 0), ?)');
        params.push(stats.latencyMs);
      }
      if (stats.error) {
        const errorCounts: ErrorCounts = existing.error_counts 
          ? JSON.parse(existing.error_counts) 
          : {};
        const errorType = stats.error.type as keyof ErrorCounts;
        errorCounts[errorType] = (errorCounts[errorType] || 0) + 1;
        updates.push('error_counts = ?');
        params.push(JSON.stringify(errorCounts));
        updates.push('last_error = ?');
        params.push(stats.error.message);
        updates.push('last_error_at = CURRENT_TIMESTAMP');
      }
      if (stats.country) {
        const countries: string[] = existing.target_countries 
          ? JSON.parse(existing.target_countries) 
          : [];
        if (!countries.includes(stats.country)) {
          countries.push(stats.country);
          updates.push('target_countries = ?');
          params.push(JSON.stringify(countries));
        }
      }

      if (updates.length > 0) {
        params.push(proxyId, timeBucket);
        this.db.prepare(`
          UPDATE proxy_usage_stats 
          SET ${updates.join(', ')}
          WHERE proxy_id = ? AND time_bucket = ?
        `).run(...params);
      }
    } else {
      // Insert new record
      const errorCounts: ErrorCounts = {};
      if (stats.error) {
        const errorType = stats.error.type as keyof ErrorCounts;
        errorCounts[errorType] = 1;
      }

      this.db.prepare(`
        INSERT INTO proxy_usage_stats (
          id, proxy_id, time_bucket,
          total_requests, successful_requests, failed_requests,
          avg_latency_ms, min_latency_ms, max_latency_ms,
          bytes_sent, bytes_received,
          error_counts, last_error, last_error_at,
          target_countries, unique_domains, unique_sessions
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        proxyId,
        timeBucket,
        stats.requests || 0,
        stats.successful || 0,
        stats.failed || 0,
        stats.latencyMs || null,
        stats.latencyMs || null,
        stats.latencyMs || null,
        stats.bytesSent || 0,
        stats.bytesReceived || 0,
        Object.keys(errorCounts).length > 0 ? JSON.stringify(errorCounts) : null,
        stats.error?.message || null,
        stats.error ? new Date().toISOString() : null,
        stats.country ? JSON.stringify([stats.country]) : null,
        stats.domain ? 1 : 0,
        stats.sessionId ? 1 : 0
      );
    }
  }

  /**
   * Record rotation event
   */
  recordRotation(proxyId: string, reason: string): void {
    const timeBucket = this.getTimeBucket();

    const existing = this.db.prepare(
      'SELECT rotation_reasons FROM proxy_usage_stats WHERE proxy_id = ? AND time_bucket = ?'
    ).get(proxyId, timeBucket) as { rotation_reasons: string | null } | undefined;

    if (existing) {
      const reasons: string[] = existing.rotation_reasons 
        ? JSON.parse(existing.rotation_reasons) 
        : [];
      reasons.push(reason);
      
      this.db.prepare(`
        UPDATE proxy_usage_stats 
        SET rotation_count = rotation_count + 1, rotation_reasons = ?
        WHERE proxy_id = ? AND time_bucket = ?
      `).run(JSON.stringify(reasons), proxyId, timeBucket);
    } else {
      this.db.prepare(`
        INSERT INTO proxy_usage_stats (id, proxy_id, time_bucket, rotation_count, rotation_reasons)
        VALUES (?, ?, ?, 1, ?)
      `).run(`${proxyId}_${timeBucket}`, proxyId, timeBucket, JSON.stringify([reason]));
    }
  }

  /**
   * Get stats for a proxy within time range
   */
  findByProxyId(
    proxyId: string,
    options?: { startTime?: Date; endTime?: Date; limit?: number }
  ): ProxyUsageStatsDTO[] {
    let sql = 'SELECT * FROM proxy_usage_stats WHERE proxy_id = ?';
    const params: unknown[] = [proxyId];

    if (options?.startTime) {
      sql += ' AND time_bucket >= ?';
      params.push(options.startTime.toISOString());
    }
    if (options?.endTime) {
      sql += ' AND time_bucket <= ?';
      params.push(options.endTime.toISOString());
    }

    sql += ' ORDER BY time_bucket DESC';

    if (options?.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }

    const entities = this.db.prepare(sql).all(...params) as ProxyUsageStatsEntity[];
    return entities.map(e => this.toDTO(e));
  }

  /**
   * Get aggregated stats for a proxy
   */
  getAggregatedStats(proxyId: string, hours: number = 24): AggregatedStats {
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    interface AggregatedStatsRow {
      total_requests: number;
      successful_requests: number;
      failed_requests: number;
      avg_latency_ms: number | null;
      bytes_sent: number;
      bytes_received: number;
      rotation_count: number;
    }

    const result = this.db.prepare(`
      SELECT 
        COALESCE(SUM(total_requests), 0) as total_requests,
        COALESCE(SUM(successful_requests), 0) as successful_requests,
        COALESCE(SUM(failed_requests), 0) as failed_requests,
        AVG(avg_latency_ms) as avg_latency_ms,
        COALESCE(SUM(bytes_sent), 0) as bytes_sent,
        COALESCE(SUM(bytes_received), 0) as bytes_received,
        COALESCE(SUM(rotation_count), 0) as rotation_count
      FROM proxy_usage_stats
      WHERE proxy_id = ? AND time_bucket >= ?
    `).get(proxyId, startTime) as AggregatedStatsRow;

    const totalRequests = result.total_requests || 0;
    const successfulRequests = result.successful_requests || 0;

    return {
      totalRequests,
      successfulRequests,
      failedRequests: result.failed_requests || 0,
      successRate: totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0,
      avgLatencyMs: result.avg_latency_ms || 0,
      totalBytesSent: result.bytes_sent || 0,
      totalBytesReceived: result.bytes_received || 0,
      totalRotations: result.rotation_count || 0
    };
  }

  /**
   * Get time series data for charting
   */
  getTimeSeries(proxyId: string, hours: number = 24): TimeSeriesDataPoint[] {
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    interface TimeSeriesRow {
      time_bucket: string;
      total_requests: number;
      successful_requests: number;
      avg_latency_ms: number | null;
    }

    const rows = this.db.prepare(`
      SELECT 
        time_bucket,
        total_requests,
        successful_requests,
        avg_latency_ms
      FROM proxy_usage_stats
      WHERE proxy_id = ? AND time_bucket >= ?
      ORDER BY time_bucket ASC
    `).all(proxyId, startTime) as TimeSeriesRow[];

    return rows.map(row => ({
      timeBucket: new Date(row.time_bucket),
      requests: row.total_requests || 0,
      successRate: row.total_requests > 0 
        ? ((row.successful_requests || 0) / row.total_requests) * 100 
        : 0,
      avgLatency: row.avg_latency_ms || 0
    }));
  }

  /**
   * Get current stats view (last 24h)
   */
  getCurrentStatsView(): ProxyCurrentStatsView[] {
    return this.db.prepare('SELECT * FROM v_proxy_current_stats').all() as ProxyCurrentStatsView[];
  }

  /**
   * Get top proxies by success rate
   */
  getTopProxiesBySuccessRate(limit: number = 10, hours: number = 24): Array<{
    proxyId: string;
    successRate: number;
    totalRequests: number;
  }> {
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    interface TopProxyRow {
      proxy_id: string;
      success_rate: number;
      total_requests: number;
    }

    const rows = this.db.prepare(`
      SELECT 
        proxy_id,
        SUM(successful_requests) * 100.0 / NULLIF(SUM(total_requests), 0) as success_rate,
        SUM(total_requests) as total_requests
      FROM proxy_usage_stats
      WHERE time_bucket >= ?
      GROUP BY proxy_id
      HAVING total_requests > 0
      ORDER BY success_rate DESC
      LIMIT ?
    `).all(startTime, limit) as TopProxyRow[];

    // Map database column names to camelCase
    return rows.map(row => ({
      proxyId: row.proxy_id,
      successRate: row.success_rate,
      totalRequests: row.total_requests
    }));
  }

  /**
   * Get error distribution across all proxies
   */
  getErrorDistribution(hours: number = 24): Record<string, number> {
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const rows = this.db.prepare(`
      SELECT error_counts FROM proxy_usage_stats
      WHERE time_bucket >= ? AND error_counts IS NOT NULL
    `).all(startTime) as { error_counts: string }[];

    const distribution: Record<string, number> = {};
    
    for (const row of rows) {
      const counts: ErrorCounts = JSON.parse(row.error_counts);
      for (const [type, count] of Object.entries(counts)) {
        distribution[type] = (distribution[type] || 0) + (count || 0);
      }
    }

    return distribution;
  }

  /**
   * Cleanup old stats (retention policy)
   */
  cleanup(retentionDays: number = 30): number {
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
    const result = this.db.prepare(
      'DELETE FROM proxy_usage_stats WHERE time_bucket < ?'
    ).run(cutoff);
    return result.changes;
  }

  /**
   * Batch record usage stats (optimized UPSERT pattern)
   * Fixes N+1 query issue by processing multiple records in a single transaction
   * 
   * @param records - Array of usage records to insert/update
   * @returns Number of records processed
   */
  recordUsageBatch(records: UsageRecord[]): number {
    if (records.length === 0) {return 0;}

    const timeBucket = this.getTimeBucket();
    
    // Use transaction for atomicity and performance
    const batchInsert = this.db.transaction((usageRecords: UsageRecord[]) => {
      let processed = 0;

      // Prepare statements once, reuse for all records
      const selectStmt = this.db.prepare(
        'SELECT * FROM proxy_usage_stats WHERE proxy_id = ? AND time_bucket = ?'
      );

      const insertStmt = this.db.prepare(`
        INSERT INTO proxy_usage_stats (
          id, proxy_id, time_bucket,
          total_requests, successful_requests, failed_requests,
          avg_latency_ms, min_latency_ms, max_latency_ms,
          bytes_sent, bytes_received,
          error_counts, last_error, last_error_at,
          target_countries, unique_domains, unique_sessions
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(proxy_id, time_bucket) DO UPDATE SET
          total_requests = total_requests + excluded.total_requests,
          successful_requests = successful_requests + excluded.successful_requests,
          failed_requests = failed_requests + excluded.failed_requests,
          bytes_sent = bytes_sent + excluded.bytes_sent,
          bytes_received = bytes_received + excluded.bytes_received,
          avg_latency_ms = CASE 
            WHEN excluded.avg_latency_ms IS NOT NULL 
            THEN (COALESCE(avg_latency_ms, 0) * total_requests + excluded.avg_latency_ms) / (total_requests + 1)
            ELSE avg_latency_ms 
          END,
          min_latency_ms = CASE 
            WHEN excluded.min_latency_ms IS NOT NULL 
            THEN MIN(COALESCE(min_latency_ms, excluded.min_latency_ms), excluded.min_latency_ms)
            ELSE min_latency_ms 
          END,
          max_latency_ms = CASE 
            WHEN excluded.max_latency_ms IS NOT NULL 
            THEN MAX(COALESCE(max_latency_ms, 0), excluded.max_latency_ms)
            ELSE max_latency_ms 
          END,
          unique_domains = unique_domains + excluded.unique_domains,
          unique_sessions = unique_sessions + excluded.unique_sessions,
          updated_at = CURRENT_TIMESTAMP
      `);

      // Process error counts separately (requires JSON merge)
      const updateErrorStmt = this.db.prepare(`
        UPDATE proxy_usage_stats 
        SET error_counts = ?, last_error = ?, last_error_at = CURRENT_TIMESTAMP
        WHERE proxy_id = ? AND time_bucket = ?
      `);

      const updateCountriesStmt = this.db.prepare(`
        UPDATE proxy_usage_stats 
        SET target_countries = ?
        WHERE proxy_id = ? AND time_bucket = ?
      `);

      for (const record of usageRecords) {
        const id = `${record.proxyId}_${timeBucket}`;
        
        // Prepare error counts JSON
        const errorCounts: ErrorCounts = {};
        if (record.error) {
          const errorType = record.error.type as keyof ErrorCounts;
          errorCounts[errorType] = 1;
        }

        // Execute UPSERT
        insertStmt.run(
          id,
          record.proxyId,
          timeBucket,
          record.requests || 0,
          record.successful || 0,
          record.failed || 0,
          record.latencyMs || null,
          record.latencyMs || null,
          record.latencyMs || null,
          record.bytesSent || 0,
          record.bytesReceived || 0,
          Object.keys(errorCounts).length > 0 ? JSON.stringify(errorCounts) : null,
          record.error?.message || null,
          record.error ? new Date().toISOString() : null,
          record.country ? JSON.stringify([record.country]) : null,
          record.domain ? 1 : 0,
          record.sessionId ? 1 : 0
        );

        // Handle error count merging for existing records
        if (record.error) {
          const existing = selectStmt.get(record.proxyId, timeBucket) as ProxyUsageStatsEntity | undefined;
          if (existing?.error_counts) {
            const existingErrors: ErrorCounts = JSON.parse(existing.error_counts);
            const errorType = record.error.type as keyof ErrorCounts;
            existingErrors[errorType] = (existingErrors[errorType] || 0) + 1;
            updateErrorStmt.run(
              JSON.stringify(existingErrors),
              record.error.message,
              record.proxyId,
              timeBucket
            );
          }
        }

        // Handle country array merging for existing records
        if (record.country) {
          const existing = selectStmt.get(record.proxyId, timeBucket) as ProxyUsageStatsEntity | undefined;
          if (existing?.target_countries) {
            const countries: string[] = JSON.parse(existing.target_countries);
            if (!countries.includes(record.country)) {
              countries.push(record.country);
              updateCountriesStmt.run(
                JSON.stringify(countries),
                record.proxyId,
                timeBucket
              );
            }
          }
        }

        processed++;
      }

      return processed;
    });

    return batchInsert(records);
  }

  /**
   * Batch record rotation events (optimized for multiple proxies)
   * 
   * @param rotations - Array of { proxyId, reason } objects
   * @returns Number of rotations recorded
   */
  recordRotationBatch(rotations: Array<{ proxyId: string; reason: string }>): number {
    if (rotations.length === 0) {return 0;}

    const timeBucket = this.getTimeBucket();

    const batchRotation = this.db.transaction((rotationRecords: Array<{ proxyId: string; reason: string }>) => {
      let processed = 0;

      const selectStmt = this.db.prepare(
        'SELECT rotation_reasons FROM proxy_usage_stats WHERE proxy_id = ? AND time_bucket = ?'
      );

      const upsertStmt = this.db.prepare(`
        INSERT INTO proxy_usage_stats (id, proxy_id, time_bucket, rotation_count, rotation_reasons)
        VALUES (?, ?, ?, 1, ?)
        ON CONFLICT(proxy_id, time_bucket) DO UPDATE SET
          rotation_count = rotation_count + 1,
          rotation_reasons = ?,
          updated_at = CURRENT_TIMESTAMP
      `);

      for (const { proxyId, reason } of rotationRecords) {
        const id = `${proxyId}_${timeBucket}`;
        const existing = selectStmt.get(proxyId, timeBucket) as { rotation_reasons: string | null } | undefined;
        
        const reasons: string[] = existing?.rotation_reasons 
          ? JSON.parse(existing.rotation_reasons) 
          : [];
        reasons.push(reason);
        const reasonsJson = JSON.stringify(reasons);

        upsertStmt.run(id, proxyId, timeBucket, reasonsJson, reasonsJson);
        processed++;
      }

      return processed;
    });

    return batchRotation(rotations);
  }
}

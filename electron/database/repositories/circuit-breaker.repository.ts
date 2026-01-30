/**
 * Circuit Breaker Repository
 * Handles persistence of circuit breaker state to SQLite database
 * 
 * PRD Section 6.2 P1: Circuit breaker state persistence across restarts
 */

import type * as Database from 'better-sqlite3';
import type {
  CircuitBreakerSnapshot,
  CircuitBreakerState,
  ServiceType,
  CircuitBreakerDbRow,
  CircuitBreakerConfig,
  CircuitBreakerMetrics
} from '../../core/resilience/types';

export class CircuitBreakerRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
    this.ensureTable();
  }

  /**
   * Ensure the circuit_breakers table exists
   */
  private ensureTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS circuit_breakers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        service_type TEXT NOT NULL CHECK (service_type IN ('proxy', 'search', 'api', 'translation', 'external')),
        service_id TEXT,
        state TEXT NOT NULL DEFAULT 'CLOSED' CHECK (state IN ('CLOSED', 'OPEN', 'HALF_OPEN')),
        failure_count INTEGER DEFAULT 0,
        success_count INTEGER DEFAULT 0,
        total_requests INTEGER DEFAULT 0,
        rejected_count INTEGER DEFAULT 0,
        trip_count INTEGER DEFAULT 0,
        consecutive_failures INTEGER DEFAULT 0,
        half_open_successes INTEGER DEFAULT 0,
        last_failure DATETIME,
        last_success DATETIME,
        last_state_change DATETIME,
        time_in_closed INTEGER DEFAULT 0,
        time_in_open INTEGER DEFAULT 0,
        time_in_half_open INTEGER DEFAULT 0,
        average_response_time REAL DEFAULT 0,
        config TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_circuit_breakers_service_type ON circuit_breakers(service_type);
      CREATE INDEX IF NOT EXISTS idx_circuit_breakers_state ON circuit_breakers(state);
      CREATE INDEX IF NOT EXISTS idx_circuit_breakers_service_id ON circuit_breakers(service_id);
    `);
  }

  /**
   * Save circuit breaker state
   */
  save(snapshot: CircuitBreakerSnapshot): void {
    const sql = `
      INSERT INTO circuit_breakers (
        id, name, service_type, service_id, state,
        failure_count, success_count, total_requests, rejected_count, trip_count,
        consecutive_failures, half_open_successes,
        last_failure, last_success, last_state_change,
        time_in_closed, time_in_open, time_in_half_open,
        average_response_time, config, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        state = excluded.state,
        failure_count = excluded.failure_count,
        success_count = excluded.success_count,
        total_requests = excluded.total_requests,
        rejected_count = excluded.rejected_count,
        trip_count = excluded.trip_count,
        consecutive_failures = excluded.consecutive_failures,
        half_open_successes = excluded.half_open_successes,
        last_failure = excluded.last_failure,
        last_success = excluded.last_success,
        last_state_change = excluded.last_state_change,
        time_in_closed = excluded.time_in_closed,
        time_in_open = excluded.time_in_open,
        time_in_half_open = excluded.time_in_half_open,
        average_response_time = excluded.average_response_time,
        config = excluded.config,
        updated_at = excluded.updated_at
    `;

    const stmt = this.db.prepare(sql);
    stmt.run(
      snapshot.id,
      snapshot.name,
      snapshot.serviceType,
      snapshot.serviceId || null,
      snapshot.state,
      snapshot.metrics.failureCount,
      snapshot.metrics.successCount,
      snapshot.metrics.totalRequests,
      snapshot.metrics.rejectedCount,
      snapshot.metrics.tripCount,
      snapshot.metrics.consecutiveFailures,
      snapshot.metrics.halfOpenSuccesses,
      snapshot.metrics.lastFailure?.toISOString() || null,
      snapshot.metrics.lastSuccess?.toISOString() || null,
      snapshot.metrics.lastStateChange?.toISOString() || null,
      snapshot.metrics.timeInState.CLOSED,
      snapshot.metrics.timeInState.OPEN,
      snapshot.metrics.timeInState.HALF_OPEN,
      snapshot.metrics.averageResponseTime,
      JSON.stringify(snapshot.config),
      snapshot.createdAt.toISOString(),
      snapshot.updatedAt.toISOString()
    );
  }

  /**
   * Save multiple snapshots in a transaction
   */
  saveAll(snapshots: CircuitBreakerSnapshot[]): void {
    const transaction = this.db.transaction(() => {
      for (const snapshot of snapshots) {
        this.save(snapshot);
      }
    });
    transaction();
  }

  /**
   * Load circuit breaker state by ID
   */
  findById(id: string): CircuitBreakerSnapshot | null {
    const sql = `SELECT * FROM circuit_breakers WHERE id = ?`;
    const stmt = this.db.prepare(sql);
    const row = stmt.get(id) as CircuitBreakerDbRow | undefined;
    
    return row ? this.rowToSnapshot(row) : null;
  }

  /**
   * Load all circuit breaker states
   */
  findAll(): CircuitBreakerSnapshot[] {
    const sql = `SELECT * FROM circuit_breakers ORDER BY updated_at DESC`;
    const stmt = this.db.prepare(sql);
    const rows = stmt.all() as CircuitBreakerDbRow[];
    
    return rows.map(row => this.rowToSnapshot(row));
  }

  /**
   * Find by service type
   */
  findByServiceType(serviceType: ServiceType): CircuitBreakerSnapshot[] {
    const sql = `SELECT * FROM circuit_breakers WHERE service_type = ? ORDER BY updated_at DESC`;
    const stmt = this.db.prepare(sql);
    const rows = stmt.all(serviceType) as CircuitBreakerDbRow[];
    
    return rows.map(row => this.rowToSnapshot(row));
  }

  /**
   * Find by state
   */
  findByState(state: CircuitBreakerState): CircuitBreakerSnapshot[] {
    const sql = `SELECT * FROM circuit_breakers WHERE state = ? ORDER BY updated_at DESC`;
    const stmt = this.db.prepare(sql);
    const rows = stmt.all(state) as CircuitBreakerDbRow[];
    
    return rows.map(row => this.rowToSnapshot(row));
  }

  /**
   * Find by service ID (e.g., proxy ID)
   */
  findByServiceId(serviceId: string): CircuitBreakerSnapshot | null {
    const sql = `SELECT * FROM circuit_breakers WHERE service_id = ?`;
    const stmt = this.db.prepare(sql);
    const row = stmt.get(serviceId) as CircuitBreakerDbRow | undefined;
    
    return row ? this.rowToSnapshot(row) : null;
  }

  /**
   * Delete circuit breaker state
   */
  delete(id: string): boolean {
    const sql = `DELETE FROM circuit_breakers WHERE id = ?`;
    const stmt = this.db.prepare(sql);
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Delete by service type
   */
  deleteByServiceType(serviceType: ServiceType): number {
    const sql = `DELETE FROM circuit_breakers WHERE service_type = ?`;
    const stmt = this.db.prepare(sql);
    const result = stmt.run(serviceType);
    return result.changes;
  }

  /**
   * Delete stale records (not updated in specified days)
   */
  deleteStale(daysOld: number = 7): number {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysOld);
    
    const sql = `DELETE FROM circuit_breakers WHERE updated_at < ?`;
    const stmt = this.db.prepare(sql);
    const result = stmt.run(cutoff.toISOString());
    return result.changes;
  }

  /**
   * Get aggregate statistics
   */
  getStatistics(): {
    total: number;
    byState: Record<CircuitBreakerState, number>;
    byServiceType: Record<ServiceType, number>;
    totalTrips: number;
    totalRejected: number;
  } {
    const total = this.db.prepare(`SELECT COUNT(*) as count FROM circuit_breakers`).get() as { count: number };
    
    const byStateRows = this.db.prepare(`
      SELECT state, COUNT(*) as count FROM circuit_breakers GROUP BY state
    `).all() as { state: string; count: number }[];
    
    const byServiceTypeRows = this.db.prepare(`
      SELECT service_type, COUNT(*) as count FROM circuit_breakers GROUP BY service_type
    `).all() as { service_type: string; count: number }[];
    
    const aggregates = this.db.prepare(`
      SELECT SUM(trip_count) as total_trips, SUM(rejected_count) as total_rejected FROM circuit_breakers
    `).get() as { total_trips: number | null; total_rejected: number | null };

    const byState: Record<CircuitBreakerState, number> = {
      CLOSED: 0,
      OPEN: 0,
      HALF_OPEN: 0
    };
    for (const row of byStateRows) {
      byState[row.state as CircuitBreakerState] = row.count;
    }

    const byServiceType: Record<ServiceType, number> = {
      proxy: 0,
      search: 0,
      api: 0,
      translation: 0,
      external: 0
    };
    for (const row of byServiceTypeRows) {
      byServiceType[row.service_type as ServiceType] = row.count;
    }

    return {
      total: total.count,
      byState,
      byServiceType,
      totalTrips: aggregates.total_trips || 0,
      totalRejected: aggregates.total_rejected || 0
    };
  }

  /**
   * Convert database row to snapshot
   */
  private rowToSnapshot(row: CircuitBreakerDbRow): CircuitBreakerSnapshot {
    const config = JSON.parse(row.config) as CircuitBreakerConfig;
    
    const metrics: CircuitBreakerMetrics = {
      totalRequests: row.total_requests,
      successCount: row.success_count,
      failureCount: row.failure_count,
      failureRate: row.total_requests > 0 ? (row.failure_count / row.total_requests) * 100 : 0,
      rejectedCount: row.rejected_count,
      tripCount: row.trip_count,
      timeInState: {
        CLOSED: row.time_in_closed,
        OPEN: row.time_in_open,
        HALF_OPEN: row.time_in_half_open
      },
      lastStateChange: row.last_state_change ? new Date(row.last_state_change) : null,
      lastFailure: row.last_failure ? new Date(row.last_failure) : null,
      lastSuccess: row.last_success ? new Date(row.last_success) : null,
      averageResponseTime: 0, // Not stored in DB
      halfOpenSuccesses: row.half_open_successes,
      consecutiveFailures: row.consecutive_failures
    };

    return {
      id: row.id,
      name: row.name,
      serviceType: row.service_type as ServiceType,
      serviceId: row.service_id || undefined,
      state: row.state as CircuitBreakerState,
      metrics,
      config,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}

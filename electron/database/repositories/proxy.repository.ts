/**
 * Proxy Repository Extension
 * Extended operations for proxies table with new weight and rotation_group columns
 */

import type Database from 'better-sqlite3';

/** Raw database row for proxy table */
interface ProxyRow {
  id: string;
  name: string;
  host: string;
  port: number;
  protocol: string;
  username?: string;
  password?: string;
  status: string;
  latency?: number;
  last_checked?: string;
  failure_count: number;
  total_requests: number;
  success_rate: number;
  region?: string;
  tags?: string;
  weight: number;
  rotation_group?: string;
  created_at: string;
  updated_at: string;
}

export interface ProxyWithRotationConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  protocol: string;
  username?: string;
  password?: string;
  status: string;
  latency?: number;
  lastChecked?: Date;
  failureCount: number;
  totalRequests: number;
  successRate: number;
  region?: string;
  tags?: string[];
  weight: number;
  rotationGroup?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class ProxyRepository {
  constructor(private db: Database.Database) {}

  /**
   * Update proxy weight
   */
  updateWeight(proxyId: string, weight: number): boolean {
    if (weight < 0 || weight > 100) {
      throw new Error('Weight must be between 0 and 100');
    }
    
    const result = this.db.prepare(
      'UPDATE proxies SET weight = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(weight, proxyId);
    
    return result.changes > 0;
  }

  /**
   * Update rotation group
   */
  updateRotationGroup(proxyId: string, rotationGroup: string | null): boolean {
    const result = this.db.prepare(
      'UPDATE proxies SET rotation_group = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(rotationGroup, proxyId);
    
    return result.changes > 0;
  }

  /**
   * Batch update weights for multiple proxies
   */
  batchUpdateWeights(updates: Array<{ proxyId: string; weight: number }>): void {
    const stmt = this.db.prepare(
      'UPDATE proxies SET weight = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    );

    const transaction = this.db.transaction(() => {
      for (const { proxyId, weight } of updates) {
        if (weight < 0 || weight > 100) {
          throw new Error(`Weight must be between 0 and 100 for proxy ${proxyId}`);
        }
        stmt.run(weight, proxyId);
      }
    });

    transaction();
  }

  /**
   * Batch update rotation groups
   */
  batchUpdateRotationGroups(updates: Array<{ proxyId: string; rotationGroup: string | null }>): void {
    const stmt = this.db.prepare(
      'UPDATE proxies SET rotation_group = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    );

    const transaction = this.db.transaction(() => {
      for (const { proxyId, rotationGroup } of updates) {
        stmt.run(rotationGroup, proxyId);
      }
    });

    transaction();
  }

  /**
   * Find proxies by rotation group
   */
  findByRotationGroup(rotationGroup: string): ProxyWithRotationConfig[] {
    const rows = this.db.prepare(`
      SELECT * FROM proxies 
      WHERE rotation_group = ? AND status = 'active'
      ORDER BY weight DESC, success_rate DESC
    `).all(rotationGroup) as ProxyRow[];

    return rows.map(row => this.toDTO(row));
  }

  /**
   * Find proxies by multiple rotation groups
   */
  findByRotationGroups(rotationGroups: string[]): ProxyWithRotationConfig[] {
    const placeholders = rotationGroups.map(() => '?').join(',');
    const rows = this.db.prepare(`
      SELECT * FROM proxies 
      WHERE rotation_group IN (${placeholders}) AND status = 'active'
      ORDER BY weight DESC, success_rate DESC
    `).all(...rotationGroups) as ProxyRow[];

    return rows.map(row => this.toDTO(row));
  }

  /**
   * Get all distinct rotation groups
   */
  getRotationGroups(): string[] {
    const rows = this.db.prepare(`
      SELECT DISTINCT rotation_group FROM proxies 
      WHERE rotation_group IS NOT NULL
      ORDER BY rotation_group
    `).all() as { rotation_group: string }[];

    return rows.map(r => r.rotation_group);
  }

  /**
   * Get proxies grouped by rotation group
   */
  getGroupedByRotationGroup(): Record<string, ProxyWithRotationConfig[]> {
    const rows = this.db.prepare(`
      SELECT * FROM proxies 
      WHERE status = 'active'
      ORDER BY rotation_group, weight DESC
    `).all() as ProxyRow[];

    const grouped: Record<string, ProxyWithRotationConfig[]> = {
      '_ungrouped': []
    };

    for (const row of rows) {
      const dto = this.toDTO(row);
      const group = dto.rotationGroup || '_ungrouped';
      
      if (!grouped[group]) {
        grouped[group] = [];
      }
      grouped[group].push(dto);
    }

    return grouped;
  }

  /**
   * Get active proxies sorted by weight (for weighted selection)
   */
  findActiveByWeight(): ProxyWithRotationConfig[] {
    const rows = this.db.prepare(`
      SELECT * FROM proxies 
      WHERE status = 'active' AND weight > 0
      ORDER BY weight DESC
    `).all() as ProxyRow[];

    return rows.map(row => this.toDTO(row));
  }

  /**
   * Calculate total weight for a rotation group
   */
  getTotalWeight(rotationGroup?: string): number {
    let sql = 'SELECT COALESCE(SUM(weight), 0) as total FROM proxies WHERE status = \'active\'';
    const params: unknown[] = [];

    if (rotationGroup) {
      sql += ' AND rotation_group = ?';
      params.push(rotationGroup);
    }

    const result = this.db.prepare(sql).get(...params) as { total: number };
    return result.total;
  }

  /**
   * Get weight distribution statistics
   */
  getWeightStats(rotationGroup?: string): {
    min: number;
    max: number;
    avg: number;
    total: number;
    count: number;
  } {
    let sql = `
      SELECT 
        COALESCE(MIN(weight), 0) as min,
        COALESCE(MAX(weight), 0) as max,
        COALESCE(AVG(weight), 0) as avg,
        COALESCE(SUM(weight), 0) as total,
        COUNT(*) as count
      FROM proxies 
      WHERE status = 'active'
    `;
    const params: unknown[] = [];

    if (rotationGroup) {
      sql += ' AND rotation_group = ?';
      params.push(rotationGroup);
    }

    interface WeightStats {
      min: number;
      max: number;
      avg: number;
      total: number;
      count: number;
    }
    return this.db.prepare(sql).get(...params) as WeightStats;
  }

  /**
   * Normalize weights within a rotation group (sum to 100)
   */
  normalizeWeights(rotationGroup?: string): void {
    const stats = this.getWeightStats(rotationGroup);
    if (stats.total === 0 || stats.count === 0) return;

    const factor = 100 / stats.total;

    let sql = `
      UPDATE proxies 
      SET weight = weight * ?, updated_at = CURRENT_TIMESTAMP
      WHERE status = 'active'
    `;
    const params: unknown[] = [factor];

    if (rotationGroup) {
      sql += ' AND rotation_group = ?';
      params.push(rotationGroup);
    }

    this.db.prepare(sql).run(...params);
  }

  /**
   * Set equal weights for all proxies in a group
   */
  equalizeWeights(rotationGroup?: string): void {
    let countSql = 'SELECT COUNT(*) as count FROM proxies WHERE status = \'active\'';
    const countParams: unknown[] = [];

    if (rotationGroup) {
      countSql += ' AND rotation_group = ?';
      countParams.push(rotationGroup);
    }

    const { count } = this.db.prepare(countSql).get(...countParams) as { count: number };
    if (count === 0) return;

    const equalWeight = 100 / count;

    let updateSql = `
      UPDATE proxies 
      SET weight = ?, updated_at = CURRENT_TIMESTAMP
      WHERE status = 'active'
    `;
    const updateParams: unknown[] = [equalWeight];

    if (rotationGroup) {
      updateSql += ' AND rotation_group = ?';
      updateParams.push(rotationGroup);
    }

    this.db.prepare(updateSql).run(...updateParams);
  }

  /**
   * Get proxy count by rotation group
   */
  getCountByRotationGroup(): Record<string, number> {
    const rows = this.db.prepare(`
      SELECT 
        COALESCE(rotation_group, '_ungrouped') as group_name,
        COUNT(*) as count
      FROM proxies
      WHERE status = 'active'
      GROUP BY rotation_group
    `).all() as { group_name: string; count: number }[];

    return rows.reduce((acc, row) => {
      acc[row.group_name] = row.count;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * Convert database row to DTO
   */
  private toDTO(row: ProxyRow): ProxyWithRotationConfig {
    return {
      id: row.id,
      name: row.name,
      host: row.host,
      port: row.port,
      protocol: row.protocol,
      username: row.username,
      password: row.password,
      status: row.status,
      latency: row.latency,
      lastChecked: row.last_checked ? new Date(row.last_checked) : undefined,
      failureCount: row.failure_count || 0,
      totalRequests: row.total_requests || 0,
      successRate: row.success_rate || 0,
      region: row.region,
      tags: row.tags ? JSON.parse(row.tags) : undefined,
      weight: row.weight ?? 1.0,
      rotationGroup: row.rotation_group,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}

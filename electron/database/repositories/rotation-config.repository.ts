/**
 * Rotation Config Repository
 * Database operations for proxy rotation configurations
 */

import { randomUUID } from 'crypto';
import type Database from 'better-sqlite3';
import type {
  RotationConfigEntity,
  RotationConfigDTO,
  CreateRotationConfigInput,
  UpdateRotationConfigInput,
  RotationConfigSummaryView
} from '../migrations/types';
// CommonRotationConfig and StrategyConfig types are used via parent types
import type { RotationConfig as RuntimeRotationConfig } from '../../core/proxy-engine/types';

export class RotationConfigRepository {
  constructor(private db: Database.Database) {}

  /**
   * Convert database entity to DTO
   */
  private toDTO(entity: RotationConfigEntity): RotationConfigDTO {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      strategy: entity.strategy,
      isActive: entity.is_active === 1,
      commonConfig: JSON.parse(entity.common_config || '{}'),
      strategyConfig: JSON.parse(entity.strategy_config || '{}'),
      targetGroup: entity.target_group,
      priority: entity.priority,
      enabled: entity.enabled === 1,
      createdAt: new Date(entity.created_at),
      updatedAt: new Date(entity.updated_at),
      createdBy: entity.created_by
    };
  }

  /**
   * Convert DTO to runtime RotationConfig used by ProxyRotationStrategy
   */
  toRuntimeConfig(dto: RotationConfigDTO): RuntimeRotationConfig {
    const common = dto.commonConfig;
    // Strategy config is dynamically typed based on strategy type
    interface StrategySpecificConfig {
      geographicPreferences?: string[];
      excludeCountries?: string[];
      preferredRegions?: string[];
      stickySessionTTL?: number;
      stickyHashAlgorithm?: 'consistent' | 'random' | 'round-robin';
      stickyFallbackOnFailure?: boolean;
      jitterPercent?: number;
      minInterval?: number;
      maxInterval?: number;
      rotateOnFailure?: boolean;
      scheduleWindows?: Array<{ startHour: number; endHour: number; daysOfWeek: number[] }>;
      weights?: Record<string, number>;
      rules?: RuntimeRotationConfig['rules'];
    }
    const strategy = dto.strategyConfig as StrategySpecificConfig;

    return {
      strategy: dto.strategy,
      interval: common.interval,
      maxRequestsPerProxy: common.maxRequestsPerProxy,
      failureThreshold: common.failureThreshold,
      cooldownPeriod: common.cooldownPeriod,
      // Geographic options
      geographicPreferences: strategy.geographicPreferences,
      excludeCountries: strategy.excludeCountries,
      preferredRegions: strategy.preferredRegions,
      // Sticky-session options
      stickySessionTTL: strategy.stickySessionTTL,
      stickyHashAlgorithm: strategy.stickyHashAlgorithm,
      stickyFallbackOnFailure: strategy.stickyFallbackOnFailure,
      // Time-based options
      jitterPercent: strategy.jitterPercent,
      minInterval: strategy.minInterval,
      maxInterval: strategy.maxInterval,
      rotateOnFailure: strategy.rotateOnFailure,
      scheduleWindows: strategy.scheduleWindows,
      // Weighted options
      weights: strategy.weights,
      // Custom rules
      rules: strategy.rules
    };
  }

  /**
   * Create a new rotation config
   */
  create(input: CreateRotationConfigInput): RotationConfigDTO {
    const id = randomUUID();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO rotation_configs (
        id, name, description, strategy, is_active,
        common_config, strategy_config, target_group,
        priority, enabled, created_at, updated_at, created_by
      ) VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      input.name,
      input.description || null,
      input.strategy,
      JSON.stringify(input.commonConfig || {}),
      JSON.stringify(input.strategyConfig || {}),
      input.targetGroup || null,
      input.priority ?? 0,
      input.enabled !== false ? 1 : 0,
      now,
      now,
      input.createdBy || null
    );

    return this.findById(id)!;
  }

  /**
   * Find config by ID
   */
  findById(id: string): RotationConfigDTO | null {
    const stmt = this.db.prepare('SELECT * FROM rotation_configs WHERE id = ?');
    const entity = stmt.get(id) as RotationConfigEntity | undefined;
    return entity ? this.toDTO(entity) : null;
  }

  /**
   * Find all configs
   */
  findAll(options?: { enabled?: boolean; strategy?: string }): RotationConfigDTO[] {
    let sql = 'SELECT * FROM rotation_configs WHERE 1=1';
    const params: unknown[] = [];

    if (options?.enabled !== undefined) {
      sql += ' AND enabled = ?';
      params.push(options.enabled ? 1 : 0);
    }

    if (options?.strategy) {
      sql += ' AND strategy = ?';
      params.push(options.strategy);
    }

    sql += ' ORDER BY priority DESC, created_at DESC';

    const stmt = this.db.prepare(sql);
    const entities = stmt.all(...params) as RotationConfigEntity[];
    return entities.map(e => this.toDTO(e));
  }

  /**
   * Find active config for a target group
   */
  findActive(targetGroup?: string): RotationConfigDTO | null {
    const stmt = this.db.prepare(`
      SELECT * FROM rotation_configs 
      WHERE is_active = 1 
        AND (target_group = ? OR (target_group IS NULL AND ? IS NULL))
      LIMIT 1
    `);
    const entity = stmt.get(targetGroup || null, targetGroup || null) as RotationConfigEntity | undefined;
    return entity ? this.toDTO(entity) : null;
  }

  /**
   * Get configs with summary (using view)
   */
  findAllWithSummary(): RotationConfigSummaryView[] {
    const stmt = this.db.prepare('SELECT * FROM v_rotation_configs_summary ORDER BY priority DESC');
    return stmt.all() as RotationConfigSummaryView[];
  }

  /**
   * Update config
   */
  update(id: string, input: UpdateRotationConfigInput): RotationConfigDTO | null {
    const existing = this.findById(id);
    if (!existing) return null;

    const updates: string[] = [];
    const params: unknown[] = [];

    if (input.name !== undefined) {
      updates.push('name = ?');
      params.push(input.name);
    }
    if (input.description !== undefined) {
      updates.push('description = ?');
      params.push(input.description);
    }
    if (input.strategy !== undefined) {
      updates.push('strategy = ?');
      params.push(input.strategy);
    }
    if (input.commonConfig !== undefined) {
      updates.push('common_config = ?');
      params.push(JSON.stringify(input.commonConfig));
    }
    if (input.strategyConfig !== undefined) {
      updates.push('strategy_config = ?');
      params.push(JSON.stringify(input.strategyConfig));
    }
    if (input.targetGroup !== undefined) {
      updates.push('target_group = ?');
      params.push(input.targetGroup);
    }
    if (input.priority !== undefined) {
      updates.push('priority = ?');
      params.push(input.priority);
    }
    if (input.enabled !== undefined) {
      updates.push('enabled = ?');
      params.push(input.enabled ? 1 : 0);
    }

    if (updates.length === 0) return existing;

    params.push(id);
    const stmt = this.db.prepare(`
      UPDATE rotation_configs SET ${updates.join(', ')} WHERE id = ?
    `);
    stmt.run(...params);

    return this.findById(id);
  }

  /**
   * Set config as active (deactivates others in same group)
   */
  setActive(id: string): boolean {
    const config = this.findById(id);
    if (!config) return false;

    const transaction = this.db.transaction(() => {
      // Deactivate other configs in the same target group
      this.db.prepare(`
        UPDATE rotation_configs 
        SET is_active = 0 
        WHERE is_active = 1 
          AND (target_group = ? OR (target_group IS NULL AND ? IS NULL))
      `).run(config.targetGroup || null, config.targetGroup || null);

      // Activate the specified config
      this.db.prepare('UPDATE rotation_configs SET is_active = 1 WHERE id = ?').run(id);
    });

    transaction();
    return true;
  }

  /**
   * Deactivate config
   */
  deactivate(id: string): boolean {
    const stmt = this.db.prepare('UPDATE rotation_configs SET is_active = 0 WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Delete config
   */
  delete(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM rotation_configs WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Duplicate config with new name
   */
  duplicate(id: string, newName: string): RotationConfigDTO | null {
    const original = this.findById(id);
    if (!original) return null;

    return this.create({
      name: newName,
      description: original.description,
      strategy: original.strategy,
      commonConfig: original.commonConfig,
      strategyConfig: original.strategyConfig,
      targetGroup: original.targetGroup,
      priority: original.priority,
      enabled: false // Duplicated configs start disabled
    });
  }

  /**
   * Get configs by target group
   */
  findByTargetGroup(targetGroup: string): RotationConfigDTO[] {
    const stmt = this.db.prepare(`
      SELECT * FROM rotation_configs 
      WHERE target_group = ? 
      ORDER BY priority DESC
    `);
    const entities = stmt.all(targetGroup) as RotationConfigEntity[];
    return entities.map(e => this.toDTO(e));
  }

  /**
   * Count configs by strategy
   */
  countByStrategy(): Record<string, number> {
    const stmt = this.db.prepare(`
      SELECT strategy, COUNT(*) as count 
      FROM rotation_configs 
      GROUP BY strategy
    `);
    const rows = stmt.all() as { strategy: string; count: number }[];
    return rows.reduce((acc, row) => {
      acc[row.strategy] = row.count;
      return acc;
    }, {} as Record<string, number>);
  }
}

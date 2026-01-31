/**
 * Rotation Rules Repository
 * Database operations for custom proxy rotation rules
 */

import { randomUUID } from 'crypto';
import type Database from 'better-sqlite3';
import type {
  ProxyRotationRuleEntity,
  ProxyRotationRuleDTO,
  CreateRotationRuleInput
} from '../migrations/types';
import type { RuleCondition, RuleActionConfig, ProxyRule } from '../../core/proxy-engine/types';

export class RotationRulesRepository {
  constructor(private db: Database.Database) {}

  /**
   * Convert entity to DTO
   */
  private toDTO(entity: ProxyRotationRuleEntity): ProxyRotationRuleDTO {
    return {
      id: entity.id,
      configId: entity.config_id,
      name: entity.name,
      description: entity.description,
      priority: entity.priority,
      conditions: JSON.parse(entity.conditions),
      conditionLogic: entity.condition_logic,
      actions: JSON.parse(entity.actions),
      stopOnMatch: entity.stop_on_match === 1,
      enabled: entity.enabled === 1,
      createdAt: new Date(entity.created_at),
      updatedAt: new Date(entity.updated_at)
    };
  }

  /**
   * Convert DTO to runtime ProxyRule format
   */
  toRuntimeRule(dto: ProxyRotationRuleDTO): ProxyRule {
    return {
      id: dto.id,
      name: dto.name,
      priority: dto.priority,
      conditions: dto.conditions,
      conditionLogic: dto.conditionLogic,
      actions: dto.actions,
      stopOnMatch: dto.stopOnMatch,
      enabled: dto.enabled
    };
  }

  /**
   * Create a new rule
   */
  create(input: CreateRotationRuleInput): ProxyRotationRuleDTO {
    const id = randomUUID();
    const now = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO proxy_rotation_rules (
        id, config_id, name, description, priority,
        conditions, condition_logic, actions,
        stop_on_match, enabled, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.configId,
      input.name,
      input.description || null,
      input.priority ?? 0,
      JSON.stringify(input.conditions),
      input.conditionLogic || 'AND',
      JSON.stringify(input.actions),
      input.stopOnMatch !== false ? 1 : 0,
      input.enabled !== false ? 1 : 0,
      now,
      now
    );

    return this.findById(id)!;
  }

  /**
   * Find by ID
   */
  findById(id: string): ProxyRotationRuleDTO | null {
    const entity = this.db.prepare(
      'SELECT * FROM proxy_rotation_rules WHERE id = ?'
    ).get(id) as ProxyRotationRuleEntity | undefined;
    
    return entity ? this.toDTO(entity) : null;
  }

  /**
   * Find all rules for a config (sorted by priority)
   */
  findByConfigId(configId: string, enabledOnly: boolean = false): ProxyRotationRuleDTO[] {
    let sql = 'SELECT * FROM proxy_rotation_rules WHERE config_id = ?';
    if (enabledOnly) {
      sql += ' AND enabled = 1';
    }
    sql += ' ORDER BY priority DESC';

    const entities = this.db.prepare(sql).all(configId) as ProxyRotationRuleEntity[];
    return entities.map(e => this.toDTO(e));
  }

  /**
   * Get runtime rules for a config
   */
  getRuntimeRules(configId: string): ProxyRule[] {
    const dtos = this.findByConfigId(configId, true);
    return dtos.map(dto => this.toRuntimeRule(dto));
  }

  /**
   * Update rule
   */
  update(
    id: string,
    input: Partial<Omit<CreateRotationRuleInput, 'configId'>>
  ): ProxyRotationRuleDTO | null {
    const existing = this.findById(id);
    if (!existing) {return null;}

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
    if (input.priority !== undefined) {
      updates.push('priority = ?');
      params.push(input.priority);
    }
    if (input.conditions !== undefined) {
      updates.push('conditions = ?');
      params.push(JSON.stringify(input.conditions));
    }
    if (input.conditionLogic !== undefined) {
      updates.push('condition_logic = ?');
      params.push(input.conditionLogic);
    }
    if (input.actions !== undefined) {
      updates.push('actions = ?');
      params.push(JSON.stringify(input.actions));
    }
    if (input.stopOnMatch !== undefined) {
      updates.push('stop_on_match = ?');
      params.push(input.stopOnMatch ? 1 : 0);
    }
    if (input.enabled !== undefined) {
      updates.push('enabled = ?');
      params.push(input.enabled ? 1 : 0);
    }

    if (updates.length === 0) {return existing;}

    params.push(id);
    this.db.prepare(`
      UPDATE proxy_rotation_rules SET ${updates.join(', ')} WHERE id = ?
    `).run(...params);

    return this.findById(id);
  }

  /**
   * Enable/disable rule
   */
  setEnabled(id: string, enabled: boolean): boolean {
    const result = this.db.prepare(
      'UPDATE proxy_rotation_rules SET enabled = ? WHERE id = ?'
    ).run(enabled ? 1 : 0, id);
    return result.changes > 0;
  }

  /**
   * Update priority
   */
  setPriority(id: string, priority: number): boolean {
    const result = this.db.prepare(
      'UPDATE proxy_rotation_rules SET priority = ? WHERE id = ?'
    ).run(priority, id);
    return result.changes > 0;
  }

  /**
   * Reorder rules (update priorities based on array order)
   */
  reorder(configId: string, ruleIds: string[]): void {
    const transaction = this.db.transaction(() => {
      for (let i = 0; i < ruleIds.length; i++) {
        // Higher index = lower priority (first in array = highest priority)
        const priority = ruleIds.length - i;
        this.db.prepare(
          'UPDATE proxy_rotation_rules SET priority = ? WHERE id = ? AND config_id = ?'
        ).run(priority, ruleIds[i], configId);
      }
    });
    transaction();
  }

  /**
   * Delete rule
   */
  delete(id: string): boolean {
    const result = this.db.prepare(
      'DELETE FROM proxy_rotation_rules WHERE id = ?'
    ).run(id);
    return result.changes > 0;
  }

  /**
   * Delete all rules for a config
   */
  deleteByConfigId(configId: string): number {
    const result = this.db.prepare(
      'DELETE FROM proxy_rotation_rules WHERE config_id = ?'
    ).run(configId);
    return result.changes;
  }

  /**
   * Duplicate rule to same or different config
   */
  duplicate(id: string, targetConfigId?: string, newName?: string): ProxyRotationRuleDTO | null {
    const original = this.findById(id);
    if (!original) {return null;}

    return this.create({
      configId: targetConfigId || original.configId,
      name: newName || `${original.name} (Copy)`,
      description: original.description,
      priority: original.priority,
      conditions: original.conditions,
      conditionLogic: original.conditionLogic,
      actions: original.actions,
      stopOnMatch: original.stopOnMatch,
      enabled: false // Duplicated rules start disabled
    });
  }

  /**
   * Add condition to rule
   */
  addCondition(id: string, condition: RuleCondition): boolean {
    const rule = this.findById(id);
    if (!rule) {return false;}

    const conditions = [...rule.conditions, condition];
    const result = this.db.prepare(
      'UPDATE proxy_rotation_rules SET conditions = ? WHERE id = ?'
    ).run(JSON.stringify(conditions), id);
    
    return result.changes > 0;
  }

  /**
   * Remove condition from rule
   */
  removeCondition(id: string, conditionIndex: number): boolean {
    const rule = this.findById(id);
    if (!rule || conditionIndex < 0 || conditionIndex >= rule.conditions.length) {
      return false;
    }

    const conditions = rule.conditions.filter((_, i) => i !== conditionIndex);
    const result = this.db.prepare(
      'UPDATE proxy_rotation_rules SET conditions = ? WHERE id = ?'
    ).run(JSON.stringify(conditions), id);
    
    return result.changes > 0;
  }

  /**
   * Add action to rule
   */
  addAction(id: string, action: RuleActionConfig): boolean {
    const rule = this.findById(id);
    if (!rule) {return false;}

    const actions = [...rule.actions, action];
    const result = this.db.prepare(
      'UPDATE proxy_rotation_rules SET actions = ? WHERE id = ?'
    ).run(JSON.stringify(actions), id);
    
    return result.changes > 0;
  }

  /**
   * Remove action from rule
   */
  removeAction(id: string, actionIndex: number): boolean {
    const rule = this.findById(id);
    if (!rule || actionIndex < 0 || actionIndex >= rule.actions.length) {
      return false;
    }

    const actions = rule.actions.filter((_, i) => i !== actionIndex);
    const result = this.db.prepare(
      'UPDATE proxy_rotation_rules SET actions = ? WHERE id = ?'
    ).run(JSON.stringify(actions), id);
    
    return result.changes > 0;
  }

  /**
   * Count rules by config
   */
  countByConfigId(configId: string): number {
    const result = this.db.prepare(
      'SELECT COUNT(*) as count FROM proxy_rotation_rules WHERE config_id = ?'
    ).get(configId) as { count: number };
    return result.count;
  }
}

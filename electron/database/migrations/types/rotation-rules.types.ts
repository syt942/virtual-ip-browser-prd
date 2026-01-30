/**
 * Proxy Rotation Rules Types
 * Type definitions for rotation rules database entities
 */

import type { RuleCondition, RuleActionConfig } from '../../../core/proxy-engine/types';

// ============================================================
// PROXY ROTATION RULE TYPES
// ============================================================

export interface ProxyRotationRuleEntity {
  id: string;
  config_id: string;
  name: string;
  description?: string;
  priority: number;
  conditions: string; // JSON string
  condition_logic: 'AND' | 'OR';
  actions: string; // JSON string
  stop_on_match: number; // SQLite boolean
  enabled: number; // SQLite boolean
  created_at: string;
  updated_at: string;
}

export interface ProxyRotationRuleDTO {
  id: string;
  configId: string;
  name: string;
  description?: string;
  priority: number;
  conditions: RuleCondition[];
  conditionLogic: 'AND' | 'OR';
  actions: RuleActionConfig[];
  stopOnMatch: boolean;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRotationRuleInput {
  configId: string;
  name: string;
  description?: string;
  priority?: number;
  conditions: RuleCondition[];
  conditionLogic?: 'AND' | 'OR';
  actions: RuleActionConfig[];
  stopOnMatch?: boolean;
  enabled?: boolean;
}

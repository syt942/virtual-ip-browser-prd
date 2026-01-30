/**
 * Database View Types
 * Type definitions for database views and common types
 */

import type { RotationStrategy } from '../../../core/proxy-engine/types';

// ============================================================
// VIEW TYPES
// ============================================================

export interface ProxyCurrentStatsView {
  id: string;
  name: string;
  host: string;
  port: number;
  protocol: string;
  status: string;
  weight: number;
  rotation_group?: string;
  region?: string;
  latency?: number;
  success_rate: number;
  requests_24h: number;
  success_24h: number;
  avg_latency_24h?: number;
  rotations_24h: number;
}

export interface RotationConfigSummaryView {
  id: string;
  name: string;
  strategy: RotationStrategy;
  is_active: number;
  enabled: number;
  target_group?: string;
  priority: number;
  rule_count: number;
  sticky_mapping_count: number;
  created_at: string;
  updated_at: string;
}

// ============================================================
// MIGRATION TYPES
// ============================================================

export interface SchemaMigration {
  id: number;
  version: string;
  name: string;
  applied_at: string;
  checksum?: string;
}

// ============================================================
// PROXY TABLE EXTENSIONS
// ============================================================

export interface ProxyEntityExtended {
  weight: number;
  rotation_group?: string;
}

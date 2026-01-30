/**
 * Rotation Config Types
 * Type definitions for rotation configuration database entities
 */

import type { 
  RotationStrategy, 
  ProxyRule, 
  TimeWindow
} from '../../../core/proxy-engine/types';

// ============================================================
// ROTATION CONFIG TYPES
// ============================================================

export interface CommonRotationConfig {
  interval?: number; // milliseconds between rotations
  maxRequestsPerProxy?: number;
  failureThreshold?: number;
  cooldownPeriod?: number; // milliseconds
}

export interface GeographicStrategyConfig {
  geographicPreferences?: string[];
  excludeCountries?: string[];
  preferredRegions?: string[];
}

export interface StickySessionStrategyConfig {
  stickySessionTTL?: number; // milliseconds
  stickyHashAlgorithm?: 'consistent' | 'random' | 'round-robin';
  stickyFallbackOnFailure?: boolean;
}

export interface TimeBasedStrategyConfig {
  jitterPercent?: number;
  minInterval?: number;
  maxInterval?: number;
  rotateOnFailure?: boolean;
  scheduleWindows?: TimeWindow[];
}

export interface WeightedStrategyConfig {
  weights?: Record<string, number>;
}

export interface CustomStrategyConfig {
  rules?: ProxyRule[];
}

export type StrategyConfig = 
  | GeographicStrategyConfig 
  | StickySessionStrategyConfig 
  | TimeBasedStrategyConfig 
  | WeightedStrategyConfig 
  | CustomStrategyConfig;

export interface RotationConfigEntity {
  id: string;
  name: string;
  description?: string;
  strategy: RotationStrategy;
  is_active: number; // SQLite boolean
  common_config: string; // JSON string
  strategy_config: string; // JSON string
  target_group?: string;
  priority: number;
  enabled: number; // SQLite boolean
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface RotationConfigDTO {
  id: string;
  name: string;
  description?: string;
  strategy: RotationStrategy;
  isActive: boolean;
  commonConfig: CommonRotationConfig;
  strategyConfig: StrategyConfig;
  targetGroup?: string;
  priority: number;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

export interface CreateRotationConfigInput {
  name: string;
  description?: string;
  strategy: RotationStrategy;
  commonConfig?: CommonRotationConfig;
  strategyConfig?: StrategyConfig;
  targetGroup?: string;
  priority?: number;
  enabled?: boolean;
  createdBy?: string;
}

export interface UpdateRotationConfigInput {
  name?: string;
  description?: string;
  strategy?: RotationStrategy;
  commonConfig?: CommonRotationConfig;
  strategyConfig?: StrategyConfig;
  targetGroup?: string;
  priority?: number;
  enabled?: boolean;
}

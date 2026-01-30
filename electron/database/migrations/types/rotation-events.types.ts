/**
 * Rotation Events Types
 * Type definitions for rotation event database entities
 */

// ============================================================
// ROTATION EVENT TYPES
// ============================================================

export type RotationReason = 
  | 'scheduled' 
  | 'failure' 
  | 'manual' 
  | 'startup' 
  | 'rule_triggered' 
  | 'ttl_expired' 
  | 'cooldown';

export interface RotationEventEntity {
  id: string;
  timestamp: string;
  config_id?: string;
  previous_proxy_id?: string;
  new_proxy_id?: string;
  reason: RotationReason;
  domain?: string;
  url?: string;
  tab_id?: string;
  session_id?: string;
  metadata?: string; // JSON string
}

export interface RotationEventDTO {
  id: string;
  timestamp: Date;
  configId?: string;
  previousProxyId?: string;
  newProxyId?: string;
  reason: RotationReason;
  domain?: string;
  url?: string;
  tabId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

export interface RecordRotationEventInput {
  configId?: string;
  previousProxyId?: string;
  newProxyId?: string;
  reason: RotationReason;
  domain?: string;
  url?: string;
  tabId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

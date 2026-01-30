/**
 * Sticky Session Types
 * Type definitions for sticky session mapping database entities
 */

// ============================================================
// STICKY SESSION MAPPING TYPES
// ============================================================

export interface StickySessionMappingEntity {
  id: string;
  domain: string;
  is_wildcard: number; // SQLite boolean
  proxy_id: string;
  config_id?: string;
  ttl_seconds?: number;
  expires_at?: string;
  request_count: number;
  last_used_at?: string;
  created_at: string;
  updated_at: string;
}

export interface StickySessionMappingDTO {
  id: string;
  domain: string;
  isWildcard: boolean;
  proxyId: string;
  configId?: string;
  ttlSeconds?: number;
  expiresAt?: Date;
  requestCount: number;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateStickyMappingInput {
  domain: string;
  proxyId: string;
  configId?: string;
  ttlSeconds?: number;
}

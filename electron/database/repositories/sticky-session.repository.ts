/**
 * Sticky Session Mapping Repository
 * Database operations for persistent domain-to-proxy mappings
 */

import { randomUUID } from 'crypto';
import type Database from 'better-sqlite3';
import type {
  StickySessionMappingEntity,
  StickySessionMappingDTO,
  CreateStickyMappingInput
} from '../migrations/types';

export class StickySessionRepository {
  constructor(private db: Database.Database) {}

  /**
   * Convert entity to DTO
   */
  private toDTO(entity: StickySessionMappingEntity): StickySessionMappingDTO {
    return {
      id: entity.id,
      domain: entity.domain,
      isWildcard: entity.is_wildcard === 1,
      proxyId: entity.proxy_id,
      configId: entity.config_id,
      ttlSeconds: entity.ttl_seconds,
      expiresAt: entity.expires_at ? new Date(entity.expires_at) : undefined,
      requestCount: entity.request_count,
      lastUsedAt: entity.last_used_at ? new Date(entity.last_used_at) : undefined,
      createdAt: new Date(entity.created_at),
      updatedAt: new Date(entity.updated_at)
    };
  }

  /**
   * Create or update sticky mapping
   */
  upsert(input: CreateStickyMappingInput): StickySessionMappingDTO {
    const id = randomUUID();
    const now = new Date();
    const isWildcard = input.domain.includes('*') ? 1 : 0;
    const expiresAt = input.ttlSeconds 
      ? new Date(now.getTime() + input.ttlSeconds * 1000).toISOString()
      : null;

    // Use INSERT OR REPLACE for upsert behavior
    this.db.prepare(`
      INSERT INTO sticky_session_mappings (
        id, domain, is_wildcard, proxy_id, config_id,
        ttl_seconds, expires_at, request_count, last_used_at,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
      ON CONFLICT(domain, config_id) DO UPDATE SET
        proxy_id = excluded.proxy_id,
        ttl_seconds = excluded.ttl_seconds,
        expires_at = excluded.expires_at,
        updated_at = excluded.updated_at
    `).run(
      id,
      input.domain,
      isWildcard,
      input.proxyId,
      input.configId || null,
      input.ttlSeconds || null,
      expiresAt,
      now.toISOString(),
      now.toISOString(),
      now.toISOString()
    );

    return this.findByDomain(input.domain, input.configId)!;
  }

  /**
   * Find mapping by domain
   */
  findByDomain(domain: string, configId?: string): StickySessionMappingDTO | null {
    const entity = this.db.prepare(`
      SELECT * FROM sticky_session_mappings 
      WHERE domain = ? AND (config_id = ? OR (config_id IS NULL AND ? IS NULL))
    `).get(domain, configId || null, configId || null) as StickySessionMappingEntity | undefined;

    return entity ? this.toDTO(entity) : null;
  }

  /**
   * Find mapping for domain (including wildcard matches)
   */
  findMappingForDomain(domain: string, configId?: string): StickySessionMappingDTO | null {
    // First try exact match
    const exact = this.findByDomain(domain, configId);
    if (exact && !this.isExpired(exact)) {
      return exact;
    }

    // Try wildcard matches
    const wildcardMappings = this.db.prepare(`
      SELECT * FROM sticky_session_mappings 
      WHERE is_wildcard = 1 
        AND (config_id = ? OR (config_id IS NULL AND ? IS NULL))
        AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
      ORDER BY LENGTH(domain) DESC
    `).all(configId || null, configId || null) as StickySessionMappingEntity[];

    for (const entity of wildcardMappings) {
      if (this.matchesWildcard(domain, entity.domain)) {
        return this.toDTO(entity);
      }
    }

    return null;
  }

  /**
   * Check if domain matches wildcard pattern
   */
  private matchesWildcard(domain: string, pattern: string): boolean {
    // Convert wildcard pattern to regex
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*');
    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(domain);
  }

  /**
   * Check if mapping is expired
   */
  private isExpired(mapping: StickySessionMappingDTO): boolean {
    if (!mapping.expiresAt) {return false;}
    return mapping.expiresAt < new Date();
  }

  /**
   * Record usage and update last_used_at
   */
  recordUsage(id: string): void {
    this.db.prepare(`
      UPDATE sticky_session_mappings 
      SET request_count = request_count + 1, last_used_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(id);
  }

  /**
   * Find all mappings for a config
   */
  findByConfigId(configId: string): StickySessionMappingDTO[] {
    const entities = this.db.prepare(
      'SELECT * FROM sticky_session_mappings WHERE config_id = ?'
    ).all(configId) as StickySessionMappingEntity[];
    
    return entities.map(e => this.toDTO(e));
  }

  /**
   * Find all mappings for a proxy
   */
  findByProxyId(proxyId: string): StickySessionMappingDTO[] {
    const entities = this.db.prepare(
      'SELECT * FROM sticky_session_mappings WHERE proxy_id = ?'
    ).all(proxyId) as StickySessionMappingEntity[];
    
    return entities.map(e => this.toDTO(e));
  }

  /**
   * Find all active (non-expired) mappings
   */
  findActive(): StickySessionMappingDTO[] {
    const entities = this.db.prepare(`
      SELECT * FROM sticky_session_mappings 
      WHERE expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP
      ORDER BY last_used_at DESC
    `).all() as StickySessionMappingEntity[];
    
    return entities.map(e => this.toDTO(e));
  }

  /**
   * Delete mapping
   */
  delete(id: string): boolean {
    const result = this.db.prepare(
      'DELETE FROM sticky_session_mappings WHERE id = ?'
    ).run(id);
    return result.changes > 0;
  }

  /**
   * Delete by domain
   */
  deleteByDomain(domain: string, configId?: string): boolean {
    const result = this.db.prepare(`
      DELETE FROM sticky_session_mappings 
      WHERE domain = ? AND (config_id = ? OR (config_id IS NULL AND ? IS NULL))
    `).run(domain, configId || null, configId || null);
    return result.changes > 0;
  }

  /**
   * Delete all mappings for a config
   */
  deleteByConfigId(configId: string): number {
    const result = this.db.prepare(
      'DELETE FROM sticky_session_mappings WHERE config_id = ?'
    ).run(configId);
    return result.changes;
  }

  /**
   * Delete expired mappings
   */
  cleanupExpired(): number {
    const result = this.db.prepare(`
      DELETE FROM sticky_session_mappings 
      WHERE expires_at IS NOT NULL AND expires_at <= CURRENT_TIMESTAMP
    `).run();
    return result.changes;
  }

  /**
   * Refresh TTL for a mapping
   */
  refreshTTL(id: string, ttlSeconds?: number): boolean {
    const mapping = this.db.prepare(
      'SELECT ttl_seconds FROM sticky_session_mappings WHERE id = ?'
    ).get(id) as { ttl_seconds: number | null } | undefined;

    if (!mapping) {return false;}

    const ttl = ttlSeconds ?? mapping.ttl_seconds;
    if (!ttl) {return false;}

    const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
    
    const result = this.db.prepare(
      'UPDATE sticky_session_mappings SET expires_at = ? WHERE id = ?'
    ).run(expiresAt, id);
    
    return result.changes > 0;
  }

  /**
   * Update proxy assignment
   */
  updateProxy(id: string, proxyId: string): boolean {
    const now = new Date().toISOString();
    const result = this.db.prepare(`
      UPDATE sticky_session_mappings 
      SET proxy_id = ?, updated_at = ?
      WHERE id = ?
    `).run(proxyId, now, id);
    return result.changes > 0;
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalMappings: number;
    activeMappings: number;
    expiredMappings: number;
    wildcardMappings: number;
  } {
    const result = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN expires_at IS NOT NULL AND expires_at <= CURRENT_TIMESTAMP THEN 1 ELSE 0 END) as expired,
        SUM(CASE WHEN is_wildcard = 1 THEN 1 ELSE 0 END) as wildcard
      FROM sticky_session_mappings
    `).get() as {
      total: number;
      active: number;
      expired: number;
      wildcard: number;
    };

    return {
      totalMappings: result.total || 0,
      activeMappings: result.active || 0,
      expiredMappings: result.expired || 0,
      wildcardMappings: result.wildcard || 0
    };
  }
}

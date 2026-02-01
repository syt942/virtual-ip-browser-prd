/**
 * Proxy Repository Extension
 * Extended operations for proxies table with new weight and rotation_group columns
 * 
 * SECURITY: Supports encrypted credential storage (REC-001)
 * - Credentials are stored encrypted in encrypted_credentials table
 * - Decryption only performed when explicitly requested
 * - No plaintext passwords in database or logs
 */

import type Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { encryptionService } from '../services/encryption.service';

// ============================================================
// INPUT VALIDATION SCHEMAS
// ============================================================

const ProxyIdSchema = z.string().uuid();

const AddProxyInputSchema = z.object({
  name: z.string().min(1).max(255),
  host: z.string().min(1).max(255),
  port: z.number().int().min(1).max(65535),
  protocol: z.enum(['http', 'https', 'socks4', 'socks5']),
  username: z.string().max(255).optional(),
  password: z.string().max(1024).optional(),
  region: z.string().max(100).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  weight: z.number().min(0).max(100).optional(),
  rotationGroup: z.string().max(100).optional()
});

const UpdateProxyInputSchema = AddProxyInputSchema.partial().extend({
  id: z.string().uuid()
});

export type AddProxyInput = z.infer<typeof AddProxyInputSchema>;
export type UpdateProxyInput = z.infer<typeof UpdateProxyInputSchema>;

/** Raw database row for proxy table */
interface ProxyRow {
  id: string;
  name: string;
  host: string;
  port: number;
  protocol: string;
  username?: string;
  password?: string;
  credential_id?: string;
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

/** Joined row with encrypted credentials */
interface ProxyWithCredentialsRow extends ProxyRow {
  encrypted_username?: string;
  encrypted_password?: string;
  encryption_key_id?: string;
}

export interface ProxyWithRotationConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  protocol: string;
  /** @deprecated Use getProxyWithCredentials() for decrypted credentials */
  username?: string;
  /** @deprecated Use getProxyWithCredentials() for decrypted credentials */
  password?: string;
  /** Whether this proxy has stored credentials */
  hasCredentials: boolean;
  /** Reference to encrypted_credentials table */
  credentialId?: string;
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

/** Proxy with decrypted credentials (use with caution - only for actual connections) */
export interface ProxyWithDecryptedCredentials extends ProxyWithRotationConfig {
  decryptedUsername?: string;
  decryptedPassword?: string;
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
    if (stats.total === 0 || stats.count === 0) {return;}

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
    if (count === 0) {return;}

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

  // ============================================================
  // SECURE CREDENTIAL OPERATIONS (REC-001)
  // ============================================================

  /**
   * Add a new proxy with encrypted credentials
   * Credentials are encrypted and stored in encrypted_credentials table
   * 
   * @param input - Validated proxy input
   * @returns Created proxy (without plaintext credentials)
   */
  addProxy(input: AddProxyInput): ProxyWithRotationConfig {
    // Validate input
    const validated = AddProxyInputSchema.parse(input);
    const proxyId = randomUUID();
    const now = new Date().toISOString();

    // Use transaction for atomicity
    const transaction = this.db.transaction(() => {
      let credentialId: string | null = null;

      // If credentials provided, encrypt and store them
      if (validated.password) {
        if (!encryptionService.isInitialized()) {
          throw new Error('Encryption service not initialized');
        }

        credentialId = randomUUID();
        const keyId = encryptionService.getKeyId();

        // Encrypt credentials
        let encryptedUsername: string | null = null;
        if (validated.username) {
          const usernameResult = encryptionService.encrypt(validated.username);
          encryptedUsername = usernameResult.encrypted;
        }

        const passwordResult = encryptionService.encrypt(validated.password);
        const encryptedPassword = passwordResult.encrypted;

        // Insert into encrypted_credentials
        // Using 'proxy_auth' credential_type (defined in migration 001 CHECK constraint)
        this.db.prepare(`
          INSERT INTO encrypted_credentials (
            id, proxy_id, credential_name, credential_type,
            encrypted_username, encrypted_password,
            encryption_version, key_id, algorithm, access_level,
            created_at, updated_at
          ) VALUES (?, ?, ?, 'proxy_auth', ?, ?, 1, ?, 'aes-256-gcm', 'private', ?, ?)
        `).run(
          credentialId,
          proxyId,
          `${validated.name}_credentials`,
          encryptedUsername,
          encryptedPassword,
          keyId,
          now,
          now
        );

        // Log security event (no credentials in log)
        console.log(`[ProxyRepository] Encrypted credentials stored for proxy: ${proxyId.substring(0, 8)}...`);
      }

      // Insert proxy (NO plaintext password stored)
      this.db.prepare(`
        INSERT INTO proxies (
          id, name, host, port, protocol, 
          credential_id, status, 
          failure_count, total_requests, success_rate,
          region, tags, weight, rotation_group,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'checking', 0, 0, 0, ?, ?, ?, ?, ?, ?)
      `).run(
        proxyId,
        validated.name,
        validated.host,
        validated.port,
        validated.protocol,
        credentialId,
        validated.region || null,
        validated.tags ? JSON.stringify(validated.tags) : null,
        validated.weight ?? 1.0,
        validated.rotationGroup || null,
        now,
        now
      );

      return proxyId;
    });

    const insertedId = transaction();

    // Fetch and return the created proxy
    const proxy = this.findById(insertedId);
    if (!proxy) {
      throw new Error('Failed to retrieve created proxy');
    }

    return proxy;
  }

  /**
   * Update proxy with optional credential update
   * If password is provided, updates encrypted credentials
   * 
   * @param input - Validated update input
   * @returns Updated proxy or null if not found
   */
  updateProxy(input: UpdateProxyInput): ProxyWithRotationConfig | null {
    // Validate input
    const validated = UpdateProxyInputSchema.parse(input);
    const { id, ...updates } = validated;

    // Validate proxy ID
    if (!ProxyIdSchema.safeParse(id).success) {
      throw new Error('Invalid proxy ID format');
    }

    const now = new Date().toISOString();

    const transaction = this.db.transaction(() => {
      // Get existing proxy
      const existing = this.db.prepare('SELECT * FROM proxies WHERE id = ?').get(id) as ProxyRow | undefined;
      if (!existing) {
        return null;
      }

      // Handle credential update if password provided
      if (updates.password !== undefined) {
        if (!encryptionService.isInitialized()) {
          throw new Error('Encryption service not initialized');
        }

        const keyId = encryptionService.getKeyId();

        // Encrypt new credentials
        let encryptedUsername: string | null = null;
        if (updates.username) {
          const usernameResult = encryptionService.encrypt(updates.username);
          encryptedUsername = usernameResult.encrypted;
        }

        const passwordResult = encryptionService.encrypt(updates.password);
        const encryptedPassword = passwordResult.encrypted;

        if (existing.credential_id) {
          // Update existing credential
          this.db.prepare(`
            UPDATE encrypted_credentials 
            SET encrypted_username = ?,
                encrypted_password = ?,
                key_id = ?,
                updated_at = ?
            WHERE id = ?
          `).run(encryptedUsername, encryptedPassword, keyId, now, existing.credential_id);

          console.log(`[ProxyRepository] Updated encrypted credentials for proxy: ${id.substring(0, 8)}...`);
        } else {
          // Create new credential
          const credentialId = randomUUID();

          // Using 'proxy_auth' credential_type (defined in migration 001 CHECK constraint)
          this.db.prepare(`
            INSERT INTO encrypted_credentials (
              id, proxy_id, credential_name, credential_type,
              encrypted_username, encrypted_password,
              encryption_version, key_id, algorithm, access_level,
              created_at, updated_at
            ) VALUES (?, ?, ?, 'proxy_auth', ?, ?, 1, ?, 'aes-256-gcm', 'private', ?, ?)
          `).run(
            credentialId,
            id,
            `${updates.name || existing.name}_credentials`,
            encryptedUsername,
            encryptedPassword,
            keyId,
            now,
            now
          );

          // Update proxy with credential reference
          this.db.prepare('UPDATE proxies SET credential_id = ? WHERE id = ?').run(credentialId, id);

          console.log(`[ProxyRepository] Created encrypted credentials for proxy: ${id.substring(0, 8)}...`);
        }
      }

      // Build update query for proxy fields (excluding credentials)
      const updateFields: string[] = ['updated_at = ?'];
      const updateParams: unknown[] = [now];

      if (updates.name !== undefined) {
        updateFields.push('name = ?');
        updateParams.push(updates.name);
      }
      if (updates.host !== undefined) {
        updateFields.push('host = ?');
        updateParams.push(updates.host);
      }
      if (updates.port !== undefined) {
        updateFields.push('port = ?');
        updateParams.push(updates.port);
      }
      if (updates.protocol !== undefined) {
        updateFields.push('protocol = ?');
        updateParams.push(updates.protocol);
      }
      if (updates.region !== undefined) {
        updateFields.push('region = ?');
        updateParams.push(updates.region);
      }
      if (updates.tags !== undefined) {
        updateFields.push('tags = ?');
        updateParams.push(JSON.stringify(updates.tags));
      }
      if (updates.weight !== undefined) {
        updateFields.push('weight = ?');
        updateParams.push(updates.weight);
      }
      if (updates.rotationGroup !== undefined) {
        updateFields.push('rotation_group = ?');
        updateParams.push(updates.rotationGroup);
      }

      // Execute update
      updateParams.push(id);
      this.db.prepare(`UPDATE proxies SET ${updateFields.join(', ')} WHERE id = ?`).run(...updateParams);

      return id;
    });

    const updatedId = transaction();
    return updatedId ? this.findById(updatedId) : null;
  }

  /**
   * Find proxy by ID
   * 
   * @param id - Proxy UUID
   * @returns Proxy without decrypted credentials
   */
  findById(id: string): ProxyWithRotationConfig | null {
    // Validate ID
    if (!ProxyIdSchema.safeParse(id).success) {
      return null;
    }

    const row = this.db.prepare('SELECT * FROM proxies WHERE id = ?').get(id) as ProxyRow | undefined;
    return row ? this.toDTO(row) : null;
  }

  /**
   * Find all proxies
   * 
   * @returns All proxies without decrypted credentials
   */
  findAll(): ProxyWithRotationConfig[] {
    const rows = this.db.prepare('SELECT * FROM proxies ORDER BY created_at DESC').all() as ProxyRow[];
    return rows.map(row => this.toDTO(row));
  }

  /**
   * Get proxy with decrypted credentials
   * USE WITH CAUTION: Only for actual proxy connections
   * 
   * @param id - Proxy UUID
   * @returns Proxy with decrypted credentials or null
   */
  getProxyWithCredentials(id: string): ProxyWithDecryptedCredentials | null {
    // Validate ID
    if (!ProxyIdSchema.safeParse(id).success) {
      console.warn('[ProxyRepository] Invalid proxy ID format');
      return null;
    }

    // Join with encrypted_credentials
    const row = this.db.prepare(`
      SELECT p.*, 
             ec.encrypted_username,
             ec.encrypted_password,
             ec.key_id as encryption_key_id
      FROM proxies p
      LEFT JOIN encrypted_credentials ec ON p.credential_id = ec.id
      WHERE p.id = ?
    `).get(id) as ProxyWithCredentialsRow | undefined;

    if (!row) {
      return null;
    }

    const baseProxy = this.toDTO(row);
    const result: ProxyWithDecryptedCredentials = { ...baseProxy };

    // Decrypt credentials if present
    if (row.encrypted_password && encryptionService.isInitialized()) {
      try {
        // Decrypt password
        const passwordResult = encryptionService.decrypt(row.encrypted_password);
        if (passwordResult.success) {
          result.decryptedPassword = passwordResult.decrypted;
        } else {
          console.error('[ProxyRepository] Failed to decrypt password:', passwordResult.error);
        }

        // Decrypt username if present
        if (row.encrypted_username) {
          const usernameResult = encryptionService.decrypt(row.encrypted_username);
          if (usernameResult.success) {
            result.decryptedUsername = usernameResult.decrypted;
          }
        }

        // Update access tracking
        if (row.credential_id) {
          this.db.prepare(`
            UPDATE encrypted_credentials 
            SET last_accessed_at = CURRENT_TIMESTAMP, access_count = access_count + 1
            WHERE id = ?
          `).run(row.credential_id);
        }
      } catch (error) {
        console.error('[ProxyRepository] Credential decryption error:',
          error instanceof Error ? error.message : 'Unknown error');
      }
    }

    return result;
  }

  /**
   * Delete proxy and associated credentials
   * 
   * @param id - Proxy UUID
   * @returns true if deleted
   */
  deleteProxy(id: string): boolean {
    // Validate ID
    if (!ProxyIdSchema.safeParse(id).success) {
      return false;
    }

    const transaction = this.db.transaction(() => {
      // Get credential ID first
      const proxy = this.db.prepare('SELECT credential_id FROM proxies WHERE id = ?').get(id) as { credential_id?: string } | undefined;

      // Delete credential if exists (should cascade, but explicit for safety)
      if (proxy?.credential_id) {
        this.db.prepare('DELETE FROM encrypted_credentials WHERE id = ?').run(proxy.credential_id);
        console.log(`[ProxyRepository] Deleted credentials for proxy: ${id.substring(0, 8)}...`);
      }

      // Delete proxy
      const result = this.db.prepare('DELETE FROM proxies WHERE id = ?').run(id);
      return result.changes > 0;
    });

    return transaction();
  }

  /**
   * Check if proxy has stored credentials
   * 
   * @param id - Proxy UUID
   * @returns true if proxy has encrypted credentials
   */
  hasCredentials(id: string): boolean {
    if (!ProxyIdSchema.safeParse(id).success) {
      return false;
    }

    const result = this.db.prepare(`
      SELECT COUNT(*) as count FROM proxies p
      INNER JOIN encrypted_credentials ec ON p.credential_id = ec.id
      WHERE p.id = ?
    `).get(id) as { count: number };

    return result.count > 0;
  }

  /**
   * Convert database row to DTO (safe - no credentials exposed)
   */
  private toDTO(row: ProxyRow): ProxyWithRotationConfig {
    return {
      id: row.id,
      name: row.name,
      host: row.host,
      port: row.port,
      protocol: row.protocol,
      // Deprecated fields - never expose plaintext
      username: undefined,
      password: undefined,
      // New secure fields
      hasCredentials: !!(row.credential_id || row.password),
      credentialId: row.credential_id,
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

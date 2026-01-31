/**
 * Encrypted Credentials Repository
 * Database operations for secure credential storage
 */

import { randomUUID } from 'crypto';
import type Database from 'better-sqlite3';
import type {
  EncryptedCredentialsEntity,
  EncryptedCredentialsDTO,
  CreateEncryptedCredentialsInput,
  CredentialType,
  AccessLevel
} from '../migrations/types';

export class EncryptedCredentialsRepository {
  constructor(private db: Database.Database) {}

  /**
   * Convert entity to DTO
   */
  private toDTO(entity: EncryptedCredentialsEntity): EncryptedCredentialsDTO {
    return {
      id: entity.id,
      proxyId: entity.proxy_id,
      credentialName: entity.credential_name,
      credentialType: entity.credential_type,
      encryptedUsername: entity.encrypted_username,
      encryptedPassword: entity.encrypted_password,
      encryptedData: entity.encrypted_data,
      encryptionVersion: entity.encryption_version,
      keyId: entity.key_id,
      algorithm: entity.algorithm,
      provider: entity.provider,
      expiresAt: entity.expires_at ? new Date(entity.expires_at) : undefined,
      lastRotatedAt: entity.last_rotated_at ? new Date(entity.last_rotated_at) : undefined,
      rotationRequired: entity.rotation_required === 1,
      accessLevel: entity.access_level,
      createdAt: new Date(entity.created_at),
      updatedAt: new Date(entity.updated_at),
      lastAccessedAt: entity.last_accessed_at ? new Date(entity.last_accessed_at) : undefined,
      accessCount: entity.access_count
    };
  }

  /**
   * Create new encrypted credentials
   */
  create(input: CreateEncryptedCredentialsInput): EncryptedCredentialsDTO {
    const id = randomUUID();
    const now = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO encrypted_credentials (
        id, proxy_id, credential_name, credential_type,
        encrypted_username, encrypted_password, encrypted_data,
        encryption_version, key_id, algorithm, provider,
        expires_at, access_level, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, 'aes-256-gcm', ?, ?, ?, ?, ?)
    `).run(
      id,
      input.proxyId || null,
      input.credentialName,
      input.credentialType,
      input.encryptedUsername || null,
      input.encryptedPassword || null,
      input.encryptedData || null,
      input.keyId || null,
      input.provider || null,
      input.expiresAt?.toISOString() || null,
      input.accessLevel || 'private',
      now,
      now
    );

    return this.findById(id)!;
  }

  /**
   * Find by ID
   */
  findById(id: string): EncryptedCredentialsDTO | null {
    const entity = this.db.prepare(
      'SELECT * FROM encrypted_credentials WHERE id = ?'
    ).get(id) as EncryptedCredentialsEntity | undefined;
    
    return entity ? this.toDTO(entity) : null;
  }

  /**
   * Find credentials for a proxy
   */
  findByProxyId(proxyId: string): EncryptedCredentialsDTO[] {
    const entities = this.db.prepare(
      'SELECT * FROM encrypted_credentials WHERE proxy_id = ?'
    ).all(proxyId) as EncryptedCredentialsEntity[];
    
    return entities.map(e => this.toDTO(e));
  }

  /**
   * Find by type
   */
  findByType(credentialType: CredentialType): EncryptedCredentialsDTO[] {
    const entities = this.db.prepare(
      'SELECT * FROM encrypted_credentials WHERE credential_type = ?'
    ).all(credentialType) as EncryptedCredentialsEntity[];
    
    return entities.map(e => this.toDTO(e));
  }

  /**
   * Find by provider
   */
  findByProvider(provider: string): EncryptedCredentialsDTO[] {
    const entities = this.db.prepare(
      'SELECT * FROM encrypted_credentials WHERE provider = ?'
    ).all(provider) as EncryptedCredentialsEntity[];
    
    return entities.map(e => this.toDTO(e));
  }

  /**
   * Get credentials and record access
   */
  getWithAccessTracking(id: string): EncryptedCredentialsDTO | null {
    const transaction = this.db.transaction(() => {
      this.db.prepare(`
        UPDATE encrypted_credentials 
        SET last_accessed_at = CURRENT_TIMESTAMP, access_count = access_count + 1
        WHERE id = ?
      `).run(id);
      
      return this.findById(id);
    });

    return transaction();
  }

  /**
   * Update encrypted data
   */
  updateEncryptedData(
    id: string,
    data: {
      encryptedUsername?: string;
      encryptedPassword?: string;
      encryptedData?: string;
      keyId?: string;
    }
  ): boolean {
    const updates: string[] = [];
    const params: unknown[] = [];

    if (data.encryptedUsername !== undefined) {
      updates.push('encrypted_username = ?');
      params.push(data.encryptedUsername);
    }
    if (data.encryptedPassword !== undefined) {
      updates.push('encrypted_password = ?');
      params.push(data.encryptedPassword);
    }
    if (data.encryptedData !== undefined) {
      updates.push('encrypted_data = ?');
      params.push(data.encryptedData);
    }
    if (data.keyId !== undefined) {
      updates.push('key_id = ?');
      params.push(data.keyId);
    }

    if (updates.length === 0) {return false;}

    updates.push('last_rotated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const result = this.db.prepare(`
      UPDATE encrypted_credentials SET ${updates.join(', ')} WHERE id = ?
    `).run(...params);

    return result.changes > 0;
  }

  /**
   * Mark credential for rotation
   */
  markForRotation(id: string): boolean {
    const result = this.db.prepare(
      'UPDATE encrypted_credentials SET rotation_required = 1 WHERE id = ?'
    ).run(id);
    return result.changes > 0;
  }

  /**
   * Clear rotation required flag
   */
  clearRotationRequired(id: string): boolean {
    const result = this.db.prepare(
      'UPDATE encrypted_credentials SET rotation_required = 0, last_rotated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(id);
    return result.changes > 0;
  }

  /**
   * Find credentials needing rotation
   */
  findNeedingRotation(): EncryptedCredentialsDTO[] {
    const entities = this.db.prepare(`
      SELECT * FROM encrypted_credentials 
      WHERE rotation_required = 1 
         OR (expires_at IS NOT NULL AND expires_at <= datetime('now', '+7 days'))
    `).all() as EncryptedCredentialsEntity[];
    
    return entities.map(e => this.toDTO(e));
  }

  /**
   * Find expired credentials
   */
  findExpired(): EncryptedCredentialsDTO[] {
    const entities = this.db.prepare(`
      SELECT * FROM encrypted_credentials 
      WHERE expires_at IS NOT NULL AND expires_at <= CURRENT_TIMESTAMP
    `).all() as EncryptedCredentialsEntity[];
    
    return entities.map(e => this.toDTO(e));
  }

  /**
   * Update expiration date
   */
  updateExpiration(id: string, expiresAt: Date | null): boolean {
    const result = this.db.prepare(
      'UPDATE encrypted_credentials SET expires_at = ? WHERE id = ?'
    ).run(expiresAt?.toISOString() || null, id);
    return result.changes > 0;
  }

  /**
   * Update access level
   */
  updateAccessLevel(id: string, accessLevel: AccessLevel): boolean {
    const result = this.db.prepare(
      'UPDATE encrypted_credentials SET access_level = ? WHERE id = ?'
    ).run(accessLevel, id);
    return result.changes > 0;
  }

  /**
   * Delete credential
   */
  delete(id: string): boolean {
    const result = this.db.prepare(
      'DELETE FROM encrypted_credentials WHERE id = ?'
    ).run(id);
    return result.changes > 0;
  }

  /**
   * Delete all credentials for a proxy
   */
  deleteByProxyId(proxyId: string): number {
    const result = this.db.prepare(
      'DELETE FROM encrypted_credentials WHERE proxy_id = ?'
    ).run(proxyId);
    return result.changes;
  }

  /**
   * Increment encryption version (for key rotation)
   */
  incrementEncryptionVersion(id: string): boolean {
    const result = this.db.prepare(
      'UPDATE encrypted_credentials SET encryption_version = encryption_version + 1 WHERE id = ?'
    ).run(id);
    return result.changes > 0;
  }

  /**
   * Find credentials by encryption version (for bulk key rotation)
   */
  findByEncryptionVersion(version: number): EncryptedCredentialsDTO[] {
    const entities = this.db.prepare(
      'SELECT * FROM encrypted_credentials WHERE encryption_version = ?'
    ).all(version) as EncryptedCredentialsEntity[];
    
    return entities.map(e => this.toDTO(e));
  }
}

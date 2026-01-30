/**
 * Encrypted Credentials Types
 * Type definitions for encrypted credentials database entities
 */

// ============================================================
// ENCRYPTED CREDENTIALS TYPES
// ============================================================

export type CredentialType = 
  | 'proxy_auth' 
  | 'api_key' 
  | 'oauth_token' 
  | 'certificate' 
  | 'ssh_key';

export type AccessLevel = 'private' | 'shared' | 'admin';

export interface EncryptedCredentialsEntity {
  id: string;
  proxy_id?: string;
  credential_name: string;
  credential_type: CredentialType;
  encrypted_username?: string;
  encrypted_password?: string;
  encrypted_data?: string;
  encryption_version: number;
  key_id?: string;
  algorithm: string;
  provider?: string;
  expires_at?: string;
  last_rotated_at?: string;
  rotation_required: number; // SQLite boolean
  access_level: AccessLevel;
  created_at: string;
  updated_at: string;
  last_accessed_at?: string;
  access_count: number;
}

export interface EncryptedCredentialsDTO {
  id: string;
  proxyId?: string;
  credentialName: string;
  credentialType: CredentialType;
  encryptedUsername?: string;
  encryptedPassword?: string;
  encryptedData?: string;
  encryptionVersion: number;
  keyId?: string;
  algorithm: string;
  provider?: string;
  expiresAt?: Date;
  lastRotatedAt?: Date;
  rotationRequired: boolean;
  accessLevel: AccessLevel;
  createdAt: Date;
  updatedAt: Date;
  lastAccessedAt?: Date;
  accessCount: number;
}

// Decrypted credentials (never stored, only in memory)
export interface DecryptedCredentials {
  username?: string;
  password?: string;
  data?: Record<string, any>;
}

export interface CreateEncryptedCredentialsInput {
  proxyId?: string;
  credentialName: string;
  credentialType: CredentialType;
  encryptedUsername?: string;
  encryptedPassword?: string;
  encryptedData?: string;
  keyId?: string;
  provider?: string;
  expiresAt?: Date;
  accessLevel?: AccessLevel;
}

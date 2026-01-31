/**
 * Credentials Test Fixtures
 * Reusable test data for encryption and credential-related tests
 */

import type { CredentialType, AccessLevel } from '../../electron/database/migrations/types';

// ============================================================================
// CREDENTIAL TEST CASES
// ============================================================================

export interface CredentialTestCase {
  credentialName: string;
  credentialType: CredentialType;
  username?: string;
  password?: string;
  data?: string;
  provider?: string;
  expiresAt?: Date;
  accessLevel: AccessLevel;
}

export const credentialTestCases: Record<string, CredentialTestCase> = {
  basic: {
    credentialName: 'Test Basic Auth',
    credentialType: 'basic',
    username: 'testuser',
    password: 'testpass123',
    accessLevel: 'private',
  },
  apiKey: {
    credentialName: 'Test API Key',
    credentialType: 'api_key',
    data: 'sk-test-key-12345',
    provider: 'test-provider',
    accessLevel: 'team',
  },
  oauth: {
    credentialName: 'OAuth Token',
    credentialType: 'oauth',
    data: JSON.stringify({
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
      expires_in: 3600,
    }),
    provider: 'oauth-provider',
    accessLevel: 'private',
  },
  withExpiry: {
    credentialName: 'Expiring Credential',
    credentialType: 'basic',
    username: 'expiring-user',
    password: 'expiring-pass',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    accessLevel: 'private',
  },
  expired: {
    credentialName: 'Expired Credential',
    credentialType: 'basic',
    username: 'expired-user',
    password: 'expired-pass',
    expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
    accessLevel: 'private',
  },
  expiringSoon: {
    credentialName: 'Expiring Soon',
    credentialType: 'basic',
    username: 'expiring-soon-user',
    password: 'expiring-soon-pass',
    expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
    accessLevel: 'private',
  },
};

// ============================================================================
// ENCRYPTION TEST DATA
// ============================================================================

export const encryptionTestData = {
  plainTexts: [
    'simple text',
    'text with special chars: !@#$%^&*()',
    'unicode: 你好世界 🎉',
    'very long text '.repeat(100),
    '',  // Empty string
    ' ',  // Whitespace only
    'text\nwith\nnewlines',
    'text\twith\ttabs',
  ],
  passwords: [
    'simple-master-password',
    'complex-P@ssw0rd!123',
    'unicode-密码-пароль',
    'very-long-' + 'x'.repeat(100),
  ],
  salts: [
    'simple-salt',
    'complex-salt-with-numbers-123',
    '0'.repeat(64), // Hex string
  ],
};

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

let credentialIdCounter = 0;

export interface MockEncryptedCredential {
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

/**
 * Create a mock encrypted credential
 */
export function createMockCredential(
  overrides: Partial<MockEncryptedCredential> = {}
): MockEncryptedCredential {
  const id = overrides.id || `cred-${credentialIdCounter++}`;
  const now = new Date();
  
  return {
    id,
    credentialName: `Credential ${credentialIdCounter}`,
    credentialType: 'basic',
    encryptedUsername: 'encrypted-user-data',
    encryptedPassword: 'encrypted-pass-data',
    encryptionVersion: 1,
    keyId: 'test-key-id-1234',
    algorithm: 'aes-256-gcm',
    rotationRequired: false,
    accessLevel: 'private',
    createdAt: now,
    updatedAt: now,
    accessCount: 0,
    ...overrides,
  };
}

/**
 * Create multiple credentials with different types
 */
export function createMixedTypeCredentials(): MockEncryptedCredential[] {
  const types: CredentialType[] = ['basic', 'api_key', 'oauth', 'certificate'];
  return types.map((credentialType, i) =>
    createMockCredential({
      credentialName: `${credentialType} Credential`,
      credentialType,
      provider: credentialType !== 'basic' ? `provider-${i}` : undefined,
    })
  );
}

/**
 * Create credentials needing rotation
 */
export function createCredentialsNeedingRotation(): MockEncryptedCredential[] {
  return [
    createMockCredential({ 
      credentialName: 'Rotation Required',
      rotationRequired: true 
    }),
    createMockCredential({ 
      credentialName: 'Expiring Soon',
      expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days
    }),
    createMockCredential({ 
      credentialName: 'Already Expired',
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
    }),
  ];
}

/**
 * Reset credential fixture counters
 */
export function resetCredentialFixtures(): void {
  credentialIdCounter = 0;
}

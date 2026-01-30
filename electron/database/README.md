# Database Schema - Proxy Rotation System

This document describes the database schema enhancements for the Virtual IP Browser proxy rotation system.

## Overview

The proxy rotation system adds persistent storage for:
- **Rotation Configurations** - Strategy settings (geographic, sticky-session, time-based, custom-rules)
- **Proxy Usage Statistics** - Analytics and performance tracking
- **Encrypted Credentials** - Secure storage for proxy authentication
- **Sticky Session Mappings** - Domain-to-proxy mappings with TTL
- **Rotation Events** - Audit log for rotation decisions
- **Custom Rules** - Rule-based proxy selection logic

## Schema Diagram

```
┌─────────────────┐       ┌────────────────────┐
│    proxies      │       │  rotation_configs  │
├─────────────────┤       ├────────────────────┤
│ + weight        │       │ id                 │
│ + rotation_group│◄──────│ strategy           │
└────────┬────────┘       │ common_config      │
         │                │ strategy_config    │
         │                │ target_group       │
         │                └─────────┬──────────┘
         │                          │
    ┌────┴────┐               ┌─────┴─────┐
    │         │               │           │
    ▼         ▼               ▼           ▼
┌──────────────────┐  ┌───────────────────────┐
│proxy_usage_stats │  │ proxy_rotation_rules  │
├──────────────────┤  ├───────────────────────┤
│ time_bucket      │  │ conditions (JSON)     │
│ requests         │  │ actions (JSON)        │
│ latency metrics  │  │ priority              │
│ error_counts     │  └───────────────────────┘
└──────────────────┘
                      ┌───────────────────────┐
┌──────────────────┐  │sticky_session_mappings│
│encrypted_creds   │  ├───────────────────────┤
├──────────────────┤  │ domain                │
│ encrypted_*      │  │ proxy_id              │
│ key_id           │  │ ttl_seconds           │
│ algorithm        │  │ expires_at            │
└──────────────────┘  └───────────────────────┘
```

## Tables

### 1. proxies (Extended)

New columns added to existing table:

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `weight` | REAL | 1.0 | Selection weight (0-100) for weighted rotation |
| `rotation_group` | TEXT | NULL | Logical grouping for rotation strategies |

### 2. rotation_configs

Stores persistent rotation strategy configurations.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PK | UUID |
| `name` | TEXT | Human-readable name |
| `strategy` | TEXT | round-robin, random, geographic, sticky-session, time-based, weighted, custom |
| `is_active` | INTEGER | Boolean - is this the active config? |
| `common_config` | TEXT | JSON - interval, maxRequestsPerProxy, failureThreshold, cooldownPeriod |
| `strategy_config` | TEXT | JSON - strategy-specific settings |
| `target_group` | TEXT | Proxy group this applies to (NULL = all) |
| `priority` | INTEGER | Config selection priority |
| `enabled` | INTEGER | Boolean - enable/disable |

### 3. proxy_usage_stats

Time-series analytics data (hourly buckets).

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PK | UUID |
| `proxy_id` | TEXT FK | Reference to proxy |
| `time_bucket` | DATETIME | Hour bucket for aggregation |
| `total_requests` | INTEGER | Request count |
| `successful_requests` | INTEGER | Success count |
| `failed_requests` | INTEGER | Failure count |
| `avg_latency_ms` | REAL | Average latency |
| `error_counts` | TEXT | JSON - errors by type |

### 4. encrypted_credentials

Secure credential storage with AES-256-GCM encryption.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PK | UUID |
| `proxy_id` | TEXT FK | Reference to proxy (nullable for shared) |
| `credential_type` | TEXT | proxy_auth, api_key, oauth_token, certificate, ssh_key |
| `encrypted_username` | TEXT | Encrypted username |
| `encrypted_password` | TEXT | Encrypted password |
| `encryption_version` | INTEGER | Key version for rotation |
| `key_id` | TEXT | Reference to encryption key |

### 5. sticky_session_mappings

Domain-to-proxy mappings for sticky sessions.

| Column | Type | Description |
|--------|------|-------------|
| `domain` | TEXT | Domain or wildcard pattern |
| `proxy_id` | TEXT FK | Assigned proxy |
| `ttl_seconds` | INTEGER | Time-to-live |
| `expires_at` | DATETIME | Expiration timestamp |

### 6. proxy_rotation_rules

Custom rules for rule-based rotation.

| Column | Type | Description |
|--------|------|-------------|
| `config_id` | TEXT FK | Parent rotation config |
| `conditions` | TEXT | JSON array of RuleCondition |
| `actions` | TEXT | JSON array of RuleActionConfig |
| `priority` | INTEGER | Evaluation order |

### 7. rotation_events

Audit log for rotation decisions.

| Column | Type | Description |
|--------|------|-------------|
| `previous_proxy_id` | TEXT | Proxy rotated from |
| `new_proxy_id` | TEXT | Proxy rotated to |
| `reason` | TEXT | scheduled, failure, manual, startup, rule_triggered, ttl_expired |

## Usage Examples

### Creating a Rotation Config

```typescript
import { db } from './database';

// Geographic rotation config
const geoConfig = db.rotationConfigs.create({
  name: 'US Geographic Rotation',
  strategy: 'geographic',
  commonConfig: {
    interval: 300000, // 5 minutes
    failureThreshold: 3,
    cooldownPeriod: 60000
  },
  strategyConfig: {
    geographicPreferences: ['US', 'CA'],
    excludeCountries: ['CN', 'RU'],
    preferredRegions: ['us-east', 'us-west']
  },
  targetGroup: 'us-proxies',
  enabled: true
});

// Activate the config
db.rotationConfigs.setActive(geoConfig.id);
```

### Recording Usage Statistics

```typescript
// Record successful request
db.proxyUsageStats.recordUsage('proxy-123', {
  requests: 1,
  successful: 1,
  latencyMs: 150,
  bytesSent: 1024,
  bytesReceived: 4096,
  domain: 'example.com',
  country: 'US'
});

// Record failure
db.proxyUsageStats.recordUsage('proxy-123', {
  requests: 1,
  failed: 1,
  error: { type: 'timeout', message: 'Connection timed out' }
});

// Get aggregated stats
const stats = db.proxyUsageStats.getAggregatedStats('proxy-123', 24);
console.log(`Success rate: ${stats.successRate}%`);
```

### Storing Encrypted Credentials

```typescript
import { encryptionService } from './database';

// Initialize encryption (do this once at app startup)
encryptionService.initialize('master-password', 'salt-value');

// Encrypt and store credentials
const { encryptedUsername, encryptedPassword, keyId } = 
  encryptionService.encryptCredentials('user@proxy.com', 'secret123');

db.encryptedCredentials.create({
  proxyId: 'proxy-123',
  credentialName: 'Primary Auth',
  credentialType: 'proxy_auth',
  encryptedUsername,
  encryptedPassword,
  keyId,
  provider: 'ProxyProvider Inc'
});

// Retrieve and decrypt
const creds = db.encryptedCredentials.getWithAccessTracking(credId);
const { username, password } = encryptionService.decryptCredentials(
  creds.encryptedUsername,
  creds.encryptedPassword
);
```

### Managing Sticky Sessions

```typescript
// Create sticky mapping
db.stickySession.upsert({
  domain: '*.google.com',
  proxyId: 'proxy-456',
  configId: geoConfig.id,
  ttlSeconds: 3600 // 1 hour
});

// Find mapping for a domain
const mapping = db.stickySession.findMappingForDomain('www.google.com');
if (mapping) {
  db.stickySession.recordUsage(mapping.id);
}

// Cleanup expired mappings
const deleted = db.stickySession.cleanupExpired();
```

### Creating Custom Rules

```typescript
// Add rule to block certain domains from specific proxies
db.rotationRules.create({
  configId: geoConfig.id,
  name: 'Block Banking Sites from Datacenter IPs',
  priority: 100,
  conditions: [
    { field: 'domain', operator: 'matches_regex', value: '.*\\.bank\\.com$' }
  ],
  conditionLogic: 'AND',
  actions: [
    { action: 'use_proxy_group', params: { group: 'residential' } }
  ],
  stopOnMatch: true
});
```

### Proxy Weight Management

```typescript
// Update individual weight
db.proxies.updateWeight('proxy-123', 2.5);

// Batch update weights
db.proxies.batchUpdateWeights([
  { proxyId: 'proxy-1', weight: 3.0 },
  { proxyId: 'proxy-2', weight: 1.5 },
  { proxyId: 'proxy-3', weight: 0.5 }
]);

// Normalize weights to sum to 100
db.proxies.normalizeWeights('premium-group');

// Get proxies by group sorted by weight
const proxies = db.proxies.findByRotationGroup('premium-group');
```

## Migration

The migration is backwards compatible and only adds new tables/columns. Run migrations automatically on startup:

```typescript
import { db } from './database';

await db.initialize(); // Automatically runs pending migrations
```

Or manually check and run:

```typescript
const runner = db.getMigrationRunner();

// Check status
const status = runner.getStatus();
console.log('Pending:', status.pending);
console.log('Current version:', status.current);

// Run with backup
const { results, backupCreated } = await runner.runWithBackup('/backups/db-backup.sqlite');
```

## Maintenance

```typescript
// Run periodic cleanup
const result = await db.runMaintenance({
  statsRetentionDays: 30,
  eventsRetentionDays: 30,
  vacuum: true
});

console.log(`Cleaned up ${result.statsDeleted} stats, ${result.eventsDeleted} events`);
```

## Security Considerations

1. **Encryption at Rest**: All credentials are encrypted with AES-256-GCM
2. **Key Management**: Encryption keys should be stored securely (not in database)
3. **Key Rotation**: Support for encryption version tracking enables key rotation
4. **Access Tracking**: Credential access is logged for audit purposes
5. **Least Privilege**: Use `access_level` to control credential visibility

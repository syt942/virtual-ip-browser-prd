# Database Codemap

**Last Updated:** 2025-01-28  
**Location:** `electron/database/`  
**Technology:** SQLite (better-sqlite3)

## Overview

The database layer provides persistent storage using SQLite with encryption for sensitive data. It includes a migration system, repository pattern for data access, and specialized services for credential encryption.

## Architecture

```
electron/database/
├── index.ts                # Database initialization
├── schema.sql              # Base schema definition
├── README.md               # Database documentation
├── migrations/
│   ├── index.ts            # Migration exports
│   ├── runner.ts           # Migration execution engine
│   ├── types.ts            # Migration type definitions
│   └── 001_proxy_rotation_system.sql
├── repositories/
│   ├── index.ts
│   ├── proxy.repository.ts
│   ├── rotation-config.repository.ts
│   ├── rotation-events.repository.ts
│   ├── rotation-rules.repository.ts
│   ├── sticky-session.repository.ts
│   ├── proxy-usage-stats.repository.ts
│   └── encrypted-credentials.repository.ts
└── services/
    ├── index.ts
    └── encryption.service.ts
```

## Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Database Layer                                   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                     Database Manager                              │   │
│  │  - Connection pool                                                │   │
│  │  - Transaction support                                            │   │
│  │  - Migration runner                                               │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                   │                                      │
│           ┌───────────────────────┼───────────────────────┐             │
│           │                       │                       │             │
│           ▼                       ▼                       ▼             │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐       │
│  │  Repositories   │   │    Services     │   │   Migrations    │       │
│  │                 │   │                 │   │                 │       │
│  │ - Proxy         │   │ - Encryption    │   │ - Runner        │       │
│  │ - RotationConfig│   │   (AES-256-GCM) │   │ - Version track │       │
│  │ - StickySession │   │                 │   │ - Up/Down       │       │
│  │ - UsageStats    │   │                 │   │                 │       │
│  └─────────────────┘   └─────────────────┘   └─────────────────┘       │
└─────────────────────────────────────────────────────────────────────────┘
```

## Schema Overview

### Core Tables

```sql
-- Proxy configurations
CREATE TABLE proxies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  host TEXT NOT NULL,
  port INTEGER NOT NULL,
  protocol TEXT NOT NULL CHECK (protocol IN ('http', 'https', 'socks4', 'socks5')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'failed', 'checking', 'disabled')),
  latency INTEGER,
  failure_count INTEGER DEFAULT 0,
  total_requests INTEGER DEFAULT 0,
  success_rate REAL DEFAULT 100.0,
  region TEXT,
  geolocation_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Encrypted credentials
CREATE TABLE encrypted_credentials (
  proxy_id TEXT PRIMARY KEY,
  encrypted_data TEXT NOT NULL,
  iv TEXT NOT NULL,
  auth_tag TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (proxy_id) REFERENCES proxies(id) ON DELETE CASCADE
);

-- Rotation configuration
CREATE TABLE rotation_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  strategy TEXT NOT NULL DEFAULT 'round-robin',
  interval_ms INTEGER,
  max_requests_per_proxy INTEGER,
  failure_threshold INTEGER,
  config_json TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sticky session mappings
CREATE TABLE sticky_sessions (
  domain TEXT PRIMARY KEY,
  proxy_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_used DATETIME DEFAULT CURRENT_TIMESTAMP,
  request_count INTEGER DEFAULT 1,
  ttl_ms INTEGER,
  is_wildcard BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (proxy_id) REFERENCES proxies(id) ON DELETE CASCADE
);

-- Rotation events history
CREATE TABLE rotation_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  previous_proxy_id TEXT,
  new_proxy_id TEXT,
  reason TEXT CHECK (reason IN ('scheduled', 'failure', 'manual', 'startup'))
);

-- Custom rotation rules
CREATE TABLE rotation_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  conditions_json TEXT NOT NULL,
  condition_logic TEXT DEFAULT 'AND' CHECK (condition_logic IN ('AND', 'OR')),
  actions_json TEXT NOT NULL,
  stop_on_match BOOLEAN DEFAULT TRUE,
  enabled BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Proxy usage statistics
CREATE TABLE proxy_usage_stats (
  proxy_id TEXT NOT NULL,
  date TEXT NOT NULL,
  request_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  total_latency_ms INTEGER DEFAULT 0,
  PRIMARY KEY (proxy_id, date),
  FOREIGN KEY (proxy_id) REFERENCES proxies(id) ON DELETE CASCADE
);
```

## Repository Pattern

### ProxyRepository

```typescript
class ProxyRepository {
  // CRUD
  create(proxy: ProxyInput): ProxyConfig;
  findById(id: string): ProxyConfig | null;
  findAll(): ProxyConfig[];
  update(id: string, updates: Partial<ProxyConfig>): ProxyConfig;
  delete(id: string): boolean;
  
  // Queries
  findByStatus(status: ProxyStatus): ProxyConfig[];
  findByProtocol(protocol: ProxyProtocol): ProxyConfig[];
  findByRegion(region: string): ProxyConfig[];
  
  // Statistics
  updateStats(id: string, success: boolean, latency?: number): void;
  getTopPerformers(limit: number): ProxyConfig[];
}
```

### RotationConfigRepository

```typescript
class RotationConfigRepository {
  get(): RotationConfig;
  update(config: Partial<RotationConfig>): RotationConfig;
  setStrategy(strategy: RotationStrategy): void;
}
```

### StickySessionRepository

```typescript
class StickySessionRepository {
  create(mapping: DomainProxyMapping): void;
  findByDomain(domain: string): DomainProxyMapping | null;
  findByProxy(proxyId: string): DomainProxyMapping[];
  update(domain: string, updates: Partial<DomainProxyMapping>): void;
  delete(domain: string): boolean;
  deleteExpired(): number;
  getAll(): DomainProxyMapping[];
}
```

## Encryption Service

```typescript
class EncryptionService {
  // Encryption (AES-256-GCM)
  encrypt(plaintext: string): EncryptedData;
  decrypt(encrypted: EncryptedData): string;
  
  // Key management
  generateKey(): Buffer;
  deriveKey(password: string, salt: Buffer): Buffer;
}

interface EncryptedData {
  ciphertext: string;  // Base64 encoded
  iv: string;          // Initialization vector
  authTag: string;     // Authentication tag
}
```

## Migration System

### Migration Runner

```typescript
class MigrationRunner {
  // Execute migrations
  up(): void;           // Run pending migrations
  down(steps?: number): void;  // Rollback migrations
  
  // Status
  getPending(): Migration[];
  getApplied(): Migration[];
  getCurrentVersion(): number;
}
```

### Migration File Format

```sql
-- Migration: 001_proxy_rotation_system
-- Description: Add tables for proxy rotation system

-- Up
CREATE TABLE IF NOT EXISTS rotation_config (...);
CREATE TABLE IF NOT EXISTS sticky_sessions (...);
CREATE TABLE IF NOT EXISTS rotation_events (...);
CREATE INDEX idx_sticky_sessions_proxy ON sticky_sessions(proxy_id);

-- Down
DROP TABLE IF EXISTS rotation_events;
DROP TABLE IF EXISTS sticky_sessions;
DROP TABLE IF EXISTS rotation_config;
```

## Indexes

```sql
-- Performance indexes
CREATE INDEX idx_proxies_status ON proxies(status);
CREATE INDEX idx_proxies_protocol ON proxies(protocol);
CREATE INDEX idx_proxies_region ON proxies(region);
CREATE INDEX idx_sticky_sessions_proxy ON sticky_sessions(proxy_id);
CREATE INDEX idx_rotation_events_timestamp ON rotation_events(timestamp);
CREATE INDEX idx_proxy_usage_date ON proxy_usage_stats(date);
```

## Usage Examples

### Initialize Database

```typescript
import { initDatabase } from './database';

const db = initDatabase({
  path: './data/browser.db',
  verbose: true
});

// Run migrations
await db.migrations.up();
```

### Repository Usage

```typescript
import { ProxyRepository, StickySessionRepository } from './database/repositories';

const proxyRepo = new ProxyRepository(db);
const stickyRepo = new StickySessionRepository(db);

// Add proxy
const proxy = proxyRepo.create({
  name: 'US Proxy 1',
  host: '192.168.1.100',
  port: 8080,
  protocol: 'http'
});

// Create sticky mapping
stickyRepo.create({
  domain: 'example.com',
  proxyId: proxy.id,
  ttl: 3600000
});
```

### Encrypted Credentials

```typescript
import { EncryptionService } from './database/services';
import { EncryptedCredentialsRepository } from './database/repositories';

const encryption = new EncryptionService();
const credRepo = new EncryptedCredentialsRepository(db);

// Store encrypted credentials
const encrypted = encryption.encrypt('my-password');
credRepo.save(proxyId, encrypted);

// Retrieve and decrypt
const stored = credRepo.findByProxyId(proxyId);
const password = encryption.decrypt(stored);
```

## Data Flow

```
┌──────────────┐     ┌──────────────────┐     ┌───────────────────┐
│  Application │────►│   Repository     │────►│   SQLite DB       │
│  Layer       │     │   Layer          │     │                   │
└──────────────┘     │                  │     │ - Prepared stmts  │
                     │ - Type mapping   │     │ - Transactions    │
                     │ - Validation     │     │ - Indexes         │
                     └──────────────────┘     └───────────────────┘
                              │
                              ▼
                     ┌──────────────────┐
                     │  Encryption      │
                     │  Service         │
                     │                  │
                     │ - AES-256-GCM    │
                     │ - Key derivation │
                     └──────────────────┘
```

## Related Modules

- [Proxy Engine](./proxy-engine.md) - Uses repositories for proxy storage
- [Automation](./automation.md) - Stores task configurations
- [Creator Support](./creator-support.md) - Persists creator tracking data

---

*See `electron/database/` for full implementation details.*

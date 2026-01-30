# Proxy Engine Codemap

**Last Updated:** 2025-01-28  
**Location:** `electron/core/proxy-engine/`  
**Entry Point:** `manager.ts`

## Overview

The Proxy Engine is the core module responsible for managing proxy configurations, implementing rotation strategies, validating proxy connections, and securely storing credentials. It supports 10 different rotation strategies including 4 advanced strategies added in the latest release.

## Architecture

```
electron/core/proxy-engine/
├── manager.ts           # Central proxy manager with EventEmitter
├── rotation.ts          # 10 rotation strategy implementations
├── validator.ts         # Proxy connectivity validation
├── credential-store.ts  # AES-256-GCM encrypted credential storage
└── types.ts             # TypeScript type definitions
```

## Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      ProxyManager                                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ ProxyRotation   │  │ ProxyValidator  │  │CredentialStore │ │
│  │ Strategy        │  │                 │  │                 │ │
│  │                 │  │ - validate()    │  │ - encrypt()     │ │
│  │ - selectProxy() │  │ - checkHealth() │  │ - decrypt()     │ │
│  │ - setConfig()   │  │ - measureLatency│  │ - store()       │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Rotation Strategies

### Basic Strategies (6)

| Strategy | Description | Use Case |
|----------|-------------|----------|
| `round-robin` | Sequential proxy selection | Even load distribution |
| `random` | Random proxy selection | Simple randomization |
| `least-used` | Select proxy with lowest usage count | Balance usage across proxies |
| `fastest` | Select proxy with lowest latency | Performance-critical tasks |
| `failure-aware` | Avoid proxies with high failure rates | Reliability-focused |
| `weighted` | Selection based on configured weights | Custom priority distribution |

### Advanced Strategies (4) - NEW

| Strategy | Description | Configuration |
|----------|-------------|---------------|
| `geographic` | Region-based proxy selection | `targetCountry`, `preferredRegions`, `excludeCountries` |
| `sticky-session` | Domain-to-proxy mapping with TTL | `stickySessionTTL`, `stickyHashAlgorithm`, `stickyFallbackOnFailure` |
| `time-based` | Scheduled rotation with jitter | `interval`, `jitterPercent`, `scheduleWindows` |
| `custom` | Rule-based conditional selection | `rules[]` with conditions and actions |

## Key Types

### ProxyConfig
```typescript
interface ProxyConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  protocol: 'http' | 'https' | 'socks4' | 'socks5';
  encryptedCredentials?: EncryptedCredential;
  requiresAuth: boolean;
  status: 'active' | 'failed' | 'checking' | 'disabled';
  latency?: number;
  failureCount: number;
  successRate: number;
  geolocation?: GeoLocation;
}
```

### RotationConfig
```typescript
interface RotationConfig {
  strategy: RotationStrategy;
  interval?: number;
  maxRequestsPerProxy?: number;
  failureThreshold?: number;
  // Geographic options
  excludeCountries?: string[];
  preferredRegions?: string[];
  // Sticky-session options
  stickySessionTTL?: number;
  stickyHashAlgorithm?: 'consistent' | 'random' | 'round-robin';
  // Time-based options
  jitterPercent?: number;
  scheduleWindows?: TimeWindow[];
  // Custom rules
  rules?: ProxyRule[];
}
```

### ProxyRule (Custom Strategy)
```typescript
interface ProxyRule {
  id: string;
  name: string;
  priority: number;
  conditions: RuleCondition[];
  conditionLogic?: 'AND' | 'OR';
  actions: RuleActionConfig[];
  stopOnMatch?: boolean;
  enabled: boolean;
}

interface RuleCondition {
  field: 'domain' | 'url' | 'path' | 'time_hour' | 'proxy_country' | ...;
  operator: 'equals' | 'contains' | 'matches_regex' | ...;
  value: string | number | string[];
}
```

## API Reference

### ProxyRotationStrategy Class

```typescript
class ProxyRotationStrategy {
  // Configuration
  setConfig(config: RotationConfig): void;
  
  // Core selection
  selectProxy(proxies: ProxyConfig[], context?: RotationContext): ProxyConfig | null;
  
  // Sticky-session management
  setStickyMapping(domain: string, proxyId: string, options?: Partial<DomainProxyMapping>): void;
  getStickyMappings(): DomainProxyMapping[];
  removeStickyMapping(domain: string): void;
  clearExpiredMappings(): number;
  
  // Time-based management
  forceRotation(): void;
  getRotationHistory(): RotationEvent[];
  
  // Custom rules management
  addRule(rule: ProxyRule): void;
  removeRule(ruleId: string): void;
  getRules(): ProxyRule[];
  
  // Statistics
  getUsageStats(): Map<string, number>;
}
```

## Usage Examples

### Geographic Rotation
```typescript
const rotation = new ProxyRotationStrategy();
rotation.setConfig({
  strategy: 'geographic',
  excludeCountries: ['CN', 'RU'],
  preferredRegions: ['US-CA', 'US-NY']
});

const proxy = rotation.selectProxy(proxies, {
  targetCountry: 'US'
});
```

### Sticky-Session Rotation
```typescript
rotation.setConfig({
  strategy: 'sticky-session',
  stickySessionTTL: 3600000, // 1 hour
  stickyHashAlgorithm: 'consistent',
  stickyFallbackOnFailure: true
});

// Same domain always gets same proxy (within TTL)
const proxy1 = rotation.selectProxy(proxies, { domain: 'example.com' });
const proxy2 = rotation.selectProxy(proxies, { domain: 'example.com' });
// proxy1.id === proxy2.id
```

### Time-Based Rotation
```typescript
rotation.setConfig({
  strategy: 'time-based',
  interval: 300000, // 5 minutes
  jitterPercent: 20,
  scheduleWindows: [{
    startHour: 9,
    endHour: 17,
    daysOfWeek: [1, 2, 3, 4, 5] // Mon-Fri
  }]
});
```

### Custom Rules
```typescript
rotation.setConfig({
  strategy: 'custom',
  rules: [{
    id: 'banking-rule',
    name: 'Use US proxy for banking sites',
    priority: 100,
    conditions: [{
      field: 'domain',
      operator: 'contains',
      value: 'bank'
    }],
    actions: [{
      action: 'use_country',
      params: { country: 'US' }
    }],
    enabled: true
  }]
});
```

## Data Flow

```
┌──────────┐    ┌────────────────┐    ┌─────────────────┐    ┌──────────┐
│  Request │───►│ RotationStrategy│───►│ Strategy Logic  │───►│  Proxy   │
│  Context │    │  selectProxy() │    │ (geo/sticky/etc)│    │ Selected │
└──────────┘    └────────────────┘    └─────────────────┘    └──────────┘
                        │
                        ▼
              ┌─────────────────┐
              │  Usage Stats    │
              │  Update         │
              └─────────────────┘
```

## Database Schema

```sql
-- Proxy configurations
CREATE TABLE proxies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  host TEXT NOT NULL,
  port INTEGER NOT NULL,
  protocol TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  latency INTEGER,
  failure_count INTEGER DEFAULT 0,
  success_rate REAL DEFAULT 100,
  geolocation_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sticky session mappings
CREATE TABLE sticky_sessions (
  domain TEXT PRIMARY KEY,
  proxy_id TEXT NOT NULL,
  created_at DATETIME,
  last_used DATETIME,
  request_count INTEGER DEFAULT 0,
  ttl INTEGER,
  FOREIGN KEY (proxy_id) REFERENCES proxies(id)
);

-- Rotation events history
CREATE TABLE rotation_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp DATETIME,
  previous_proxy_id TEXT,
  new_proxy_id TEXT,
  reason TEXT
);
```

## Security Considerations

1. **Encrypted Credentials**: All proxy credentials are encrypted using AES-256-GCM
2. **Memory Safety**: Plain text credentials are cleared after encryption
3. **Secure IPC**: Credentials never cross IPC boundary unencrypted
4. **Input Validation**: All proxy configurations are validated before use

## Related Modules

- [Automation](./automation.md) - Uses proxy selection for web automation
- [Database](./database.md) - Persists proxy configurations and stats
- [Privacy](../ARCHITECTURE.md#privacy--fingerprint-protection) - Coordinates with fingerprint settings

---

*See `electron/core/proxy-engine/rotation.ts` for full implementation details.*

# Comprehensive Execution Plan: Virtual IP Browser Major Improvements

## Executive Summary

This plan covers 5 major improvement tasks for the Virtual IP Browser project:
1. **TASK 1**: Fix 4 P0 Security Issues (Critical)
2. **TASK 2**: Write Missing Tests (44.79% → 80% coverage)
3. **TASK 3**: Database Optimization
4. **TASK 4**: Remove Dead Code (~888 lines)
5. **TASK 5**: UI Enhancement with Magic UI

**Total Estimated Effort**: 8-12 developer days
**Risk Level**: Medium (security fixes require careful testing)
**Tech Stack**: Electron 35, React 19, TypeScript 5.6, SQLite (better-sqlite3), Zustand 5, Vitest

---

## Execution Order & Dependencies

```
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 1: Security First (Critical Path)                        │
│  ┌─────────────┐                                                │
│  │  TASK 1     │ ← Must be first - security is non-negotiable  │
│  │  Security   │                                                │
│  │  Fixes      │                                                │
│  └─────────────┘                                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 2: Parallel Work (Independent Tasks)                     │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐           │
│  │  TASK 4     │   │  TASK 3     │   │  TASK 5     │           │
│  │  Dead Code  │   │  Database   │   │  Magic UI   │           │
│  │  Removal    │   │  Optimize   │   │  (partial)  │           │
│  └─────────────┘   └─────────────┘   └─────────────┘           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 3: Test Coverage (After Code Stabilizes)                 │
│  ┌─────────────────────────────────────────────────┐           │
│  │  TASK 2: Write Missing Tests (235 new tests)   │           │
│  │  - Database layer tests                         │           │
│  │  - Tab Manager tests                            │           │
│  │  - Zustand stores tests                         │           │
│  │  - IPC handlers tests                           │           │
│  └─────────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

### Dependency Rationale:
1. **Security fixes MUST come first** - they affect core encryption and validation logic
2. **Dead code removal before tests** - no point testing code that will be deleted
3. **Database optimization before tests** - tests should verify optimized code
4. **UI enhancement is independent** - can proceed in parallel with Phase 2
5. **Tests come last** - ensures we test the final, stable codebase

---

## Risk Assessment Matrix

| Task | Risk Level | Impact | Likelihood | Mitigation Strategy |
|------|------------|--------|------------|---------------------|
| TASK 1: Security Fixes | **HIGH** | Critical | Medium | Extensive testing, staged rollout, backup encryption keys |
| TASK 2: Test Coverage | LOW | High | Low | Incremental commits, CI validation |
| TASK 3: DB Optimization | MEDIUM | Medium | Medium | Database backups, migration testing |
| TASK 4: Dead Code | LOW | Low | Low | Git history preserved, staged deletion |
| TASK 5: Magic UI | LOW | Low | Low | Feature flags, A/B testing capability |

---

## TASK 1: Fix 4 P0 Security Issues

### Overview
Four critical security vulnerabilities requiring immediate attention. These affect encryption, input validation, and privacy protection.

### Issue 1.1: Static Encryption Key in config-manager.ts

**File**: `electron/main/config-manager.ts`
**Line**: 74
**Current Problem**:
```typescript
storeEncryptionKey = 'vip-browser-config-encryption-key-v1',  // STATIC KEY!
```

**Solution**: Use Electron's `safeStorage` API (already used in `credential-store.ts`)

**Implementation Steps**:

| Step | Action | File | Risk |
|------|--------|------|------|
| 1.1.1 | Import `safeStorage` from Electron | `config-manager.ts` | Low |
| 1.1.2 | Create `deriveEncryptionKey()` function using `safeStorage.encryptString()` | `config-manager.ts` | Medium |
| 1.1.3 | Add fallback for when `safeStorage` unavailable (tests, first run) | `config-manager.ts` | Medium |
| 1.1.4 | Implement key migration for existing installations | `config-manager.ts` | High |
| 1.1.5 | Update tests in `tests/unit/config-manager.test.ts` | Test file | Low |

**Code Change**:
```typescript
// Import at top
import { safeStorage } from 'electron';

// In constructor
private deriveEncryptionKey(): string {
  if (safeStorage && safeStorage.isEncryptionAvailable()) {
    // Derive key from OS keychain
    const baseKey = 'vip-browser-config-v2';
    const encrypted = safeStorage.encryptString(baseKey);
    return encrypted.toString('base64').substring(0, 32);
  }
  // Fallback: generate and persist a random key
  return this.getOrCreateFallbackKey();
}
```

**Testing Strategy**:
- Unit test: Key derivation produces consistent results
- Unit test: Fallback works when safeStorage unavailable
- Integration test: Existing data can be migrated
- E2E test: App starts correctly after upgrade

---

### Issue 1.2: ReDoS Vulnerability in tracker-blocker.ts

**File**: `electron/core/privacy/tracker-blocker.ts`
**Lines**: 95-103
**Current Problem**:
```typescript
private matchesPattern(url: string, pattern: string): boolean {
  // VULNERABLE: User input converted to regex without sanitization
  const regexPattern = pattern
    .replace(/\./g, '\\.')
    .replace(/\*/g, '.*')   // '.*' can cause catastrophic backtracking
    .replace(/\?/g, '.');
  
  const regex = new RegExp('^' + regexPattern + '$', 'i');
  return regex.test(url);  // ReDoS attack vector!
}
```

**Solution**: Replace regex with compiled filter lists (prefix tree / Bloom filter)

**Implementation Steps**:

| Step | Action | File | Risk |
|------|--------|------|------|
| 1.2.1 | Create `CompiledFilterList` class with Trie-based matching | New: `tracker-blocker-filter.ts` | Medium |
| 1.2.2 | Pre-compile blocklist patterns at initialization | `tracker-blocker.ts` | Low |
| 1.2.3 | Replace `matchesPattern()` with O(n) string matching | `tracker-blocker.ts` | Medium |
| 1.2.4 | Add pattern validation to reject dangerous patterns | `tracker-blocker.ts` | Low |
| 1.2.5 | Update tests in `tests/unit/privacy/tracker-blocker.test.ts` | Test file | Low |

**Code Change**:
```typescript
// New file: tracker-blocker-filter.ts
export class CompiledFilterList {
  private exactMatches: Set<string> = new Set();
  private prefixMatches: string[] = [];
  private suffixMatches: string[] = [];

  addPattern(pattern: string): void {
    // Validate pattern length to prevent DoS
    if (pattern.length > 500) {
      console.warn('[TrackerBlocker] Pattern too long, skipping:', pattern.substring(0, 50));
      return;
    }
    
    if (!pattern.includes('*')) {
      this.exactMatches.add(pattern.toLowerCase());
    } else if (pattern.startsWith('*') && !pattern.slice(1).includes('*')) {
      this.suffixMatches.push(pattern.slice(1).toLowerCase());
    } else if (pattern.endsWith('*') && !pattern.slice(0, -1).includes('*')) {
      this.prefixMatches.push(pattern.slice(0, -1).toLowerCase());
    }
    // Complex patterns: convert to safe regex with timeout
  }

  matches(url: string): boolean {
    const lowerUrl = url.toLowerCase();
    if (this.exactMatches.has(lowerUrl)) return true;
    for (const prefix of this.prefixMatches) {
      if (lowerUrl.startsWith(prefix)) return true;
    }
    for (const suffix of this.suffixMatches) {
      if (lowerUrl.endsWith(suffix)) return true;
    }
    return false;
  }
}
```

**Testing Strategy**:
- Unit test: Pattern matching correctness
- Unit test: ReDoS payload doesn't hang (timeout test)
- Performance test: 10,000 URLs matched in <100ms

---

### Issue 1.3: WebRTC Protection Bypass in webrtc.ts

**File**: `electron/core/privacy/webrtc.ts`
**Current Problem**: Only disables `RTCPeerConnection` constructor but doesn't handle:
- `navigator.mediaDevices.getUserMedia` IP leaks via STUN
- WebRTC data channels
- Legacy `webkitRTCPeerConnection`
- `RTCIceCandidate` leaking local IPs

**Solution**: Comprehensive IP handling with ICE candidate filtering

**Implementation Steps**:

| Step | Action | File | Risk |
|------|--------|------|------|
| 1.3.1 | Add ICE candidate interception to filter local IPs | `webrtc.ts` | Medium |
| 1.3.2 | Override `RTCPeerConnection.prototype.addIceCandidate` | `webrtc.ts` | Medium |
| 1.3.3 | Add `RTCPeerConnection.prototype.createOffer/Answer` spoofing | `webrtc.ts` | Medium |
| 1.3.4 | Implement STUN server blocking at network level | `webrtc.ts` | Low |
| 1.3.5 | Update tests in `tests/unit/privacy/webrtc.test.ts` | Test file | Low |

**Code Change** (addition to injection script):
```typescript
// Enhanced WebRTC protection
const originalRTCPeerConnection = window.RTCPeerConnection;

window.RTCPeerConnection = function(...args) {
  const pc = new originalRTCPeerConnection(...args);
  
  // Intercept ICE candidates to filter local IPs
  const originalAddIceCandidate = pc.addIceCandidate.bind(pc);
  pc.addIceCandidate = function(candidate) {
    if (candidate && candidate.candidate) {
      // Filter out local IP addresses (192.168.x.x, 10.x.x.x, etc.)
      const localIPRegex = /(\b(192\.168|10\.|172\.(1[6-9]|2[0-9]|3[01]))\.\d{1,3}\.\d{1,3}\b)/g;
      if (localIPRegex.test(candidate.candidate)) {
        console.log('[WebRTC Protection] Blocked local IP leak');
        return Promise.resolve();
      }
    }
    return originalAddIceCandidate(candidate);
  };
  
  // Override onicecandidate to filter outgoing candidates
  const originalOnIceCandidate = Object.getOwnPropertyDescriptor(
    RTCPeerConnection.prototype, 'onicecandidate'
  );
  // ... additional filtering logic
  
  return pc;
};
```

**Testing Strategy**:
- Unit test: Local IPs filtered from ICE candidates
- E2E test: WebRTC leak test sites show no IP leak
- Integration test: WebRTC-based features gracefully degraded

---

### Issue 1.4: Session URL Validation Gap in session/manager.ts

**File**: `electron/core/session/manager.ts`
**Lines**: 92-99
**Current Problem**:
```typescript
async loadSession(id: string): Promise<SavedSession | null> {
  // ... load from DB ...
  const session: SavedSession = {
    // URLs from tabs are NOT re-validated on restore!
    tabs: JSON.parse(row.tabs),  // Could contain javascript: URLs
    // ...
  };
  return session;
}
```

**Solution**: Re-validate all URLs when restoring sessions

**Implementation Steps**:

| Step | Action | File | Risk |
|------|--------|------|------|
| 1.4.1 | Create `validateSessionUrls()` helper function | `session/manager.ts` | Low |
| 1.4.2 | Apply validation in `loadSession()` | `session/manager.ts` | Low |
| 1.4.3 | Apply validation in `getAllSessions()` | `session/manager.ts` | Low |
| 1.4.4 | Add URL sanitization from existing `sanitize.ts` utils | `session/manager.ts` | Low |
| 1.4.5 | Update tests in `tests/unit/session-manager.test.ts` | Test file | Low |

**Code Change**:
```typescript
import { sanitizeUrl } from '../../utils/security';

// Dangerous URL protocols to block
const DANGEROUS_PROTOCOLS = ['javascript:', 'vbscript:', 'data:', 'file:'];

private validateAndSanitizeTabs(tabs: TabState[]): TabState[] {
  return tabs.map(tab => ({
    ...tab,
    url: this.sanitizeTabUrl(tab.url)
  })).filter(tab => tab.url !== ''); // Remove invalid tabs
}

private sanitizeTabUrl(url: string): string {
  if (!url || typeof url !== 'string') return 'about:blank';
  
  const lowerUrl = url.toLowerCase().trim();
  for (const proto of DANGEROUS_PROTOCOLS) {
    if (lowerUrl.startsWith(proto)) {
      console.warn('[SessionManager] Blocked dangerous URL:', url.substring(0, 50));
      return 'about:blank';
    }
  }
  return url;
}

async loadSession(id: string): Promise<SavedSession | null> {
  // ... existing code ...
  const session: SavedSession = {
    id: row.id,
    name: row.name,
    tabs: this.validateAndSanitizeTabs(JSON.parse(row.tabs)), // VALIDATED!
    windowBounds: JSON.parse(row.window_bounds),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  };
  return session;
}
```

**Testing Strategy**:
- Unit test: `javascript:` URLs blocked
- Unit test: Valid URLs pass through unchanged
- Unit test: Malformed tabs filtered out
- E2E test: Restored sessions don't execute injected scripts

### TASK 1 Summary

| Issue | Effort | Priority | Files Changed |
|-------|--------|----------|---------------|
| 1.1 Static encryption key | 4-6 hours | P0 | 2 files |
| 1.2 ReDoS vulnerability | 4-6 hours | P0 | 3 files |
| 1.3 WebRTC bypass | 3-4 hours | P0 | 2 files |
| 1.4 Session URL validation | 2-3 hours | P0 | 2 files |
| **Total** | **13-19 hours** | | **9 files** |

---

## TASK 2: Write Missing Tests (44.79% → 80% Coverage)

### Overview
Current test coverage is at 44.79%. Target is 80% coverage with 235 new tests across 4 major areas.

### Coverage Gap Analysis

| Module | Current Lines | Current Coverage | Target Coverage | Tests Needed |
|--------|---------------|------------------|-----------------|--------------|
| Database Layer | ~2,500 | 0% | 80% | ~100 tests |
| Tab Manager | 343 | 0% | 80% | ~35 tests |
| Zustand Stores | 657 | 0% | 80% | ~50 tests |
| IPC Handlers | ~570 | ~20% | 80% | ~50 tests |
| **Total** | ~4,070 | ~15% | 80% | **~235 tests** |

### Phase 2.1: Database Layer Tests (~100 tests)

**Target Files** (in `electron/database/repositories/`):
- `proxy-usage-stats.repository.ts` (419 lines) - **Partial tests exist**
- `creator-support-history.repository.ts` (338 lines)
- `encrypted-credentials.repository.ts` (289 lines)
- `execution-logs.repository.ts` (440 lines) - **Partial tests exist**
- `rotation-rules.repository.ts` (323 lines)
- `circuit-breaker.repository.ts` (289 lines) - **Partial tests exist**

**Test Structure**:
```
tests/unit/database/
├── proxy-usage-stats.repository.test.ts  (exists - extend)
├── creator-support-history.repository.test.ts (new)
├── encrypted-credentials.repository.test.ts (new)
├── execution-logs.repository.test.ts (exists - extend)
├── rotation-rules.repository.test.ts (new)
└── circuit-breaker.repository.test.ts (exists - extend)
```

**Test Categories per Repository**:
1. **CRUD Operations** (~5 tests each)
   - Create with valid data
   - Create with invalid data (validation)
   - Read by ID
   - Update existing record
   - Delete and verify cascade

2. **Query Operations** (~5 tests each)
   - Find by foreign key
   - Find with filters
   - Pagination
   - Sorting
   - Aggregations

3. **Edge Cases** (~5 tests each)
   - Empty table queries
   - Large dataset handling
   - Concurrent access
   - Transaction rollback
   - NULL handling

**Example Test (new file)**:
```typescript
// tests/unit/database/encrypted-credentials.repository.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDatabase, cleanupTestDatabase } from './test-helpers';
import { EncryptedCredentialsRepository } from '../../../electron/database/repositories';

describe('EncryptedCredentialsRepository', () => {
  let db: Database.Database;
  let repo: EncryptedCredentialsRepository;

  beforeEach(() => {
    db = createTestDatabase();
    repo = new EncryptedCredentialsRepository(db);
  });

  afterEach(() => {
    cleanupTestDatabase(db);
  });

  describe('store()', () => {
    it('should store encrypted credentials with valid data', () => {
      const result = repo.store('proxy-1', {
        username: 'user',
        password: 'encrypted-password'
      });
      expect(result.id).toBeDefined();
      expect(result.proxyId).toBe('proxy-1');
    });

    it('should throw on duplicate proxy ID', () => {
      repo.store('proxy-1', { username: 'user', password: 'pass' });
      expect(() => repo.store('proxy-1', { username: 'user2', password: 'pass2' }))
        .toThrow();
    });
  });

  describe('retrieve()', () => {
    it('should return null for non-existent credentials', () => {
      expect(repo.retrieve('non-existent')).toBeNull();
    });

    it('should decrypt and return stored credentials', () => {
      repo.store('proxy-1', { username: 'user', password: 'secret' });
      const result = repo.retrieve('proxy-1');
      expect(result?.username).toBe('user');
    });
  });

  // ... 15 more tests
});
```

### Phase 2.2: Tab Manager Tests (~35 tests)

**Target File**: `electron/core/tabs/manager.ts` (343 lines)
**Test File**: `tests/unit/tab-manager.test.ts` (exists - extend significantly)

**Test Categories**:

| Category | Tests | Description |
|----------|-------|-------------|
| Tab Lifecycle | 8 | create, close, update, duplicate |
| Navigation | 6 | navigate, goBack, goForward, reload |
| Session Management | 5 | proxy application, fingerprint injection |
| View Management | 6 | setActiveTab, bounds calculation, auto-resize |
| Event Emission | 5 | tab:created, tab:updated, tab:closed events |
| Error Handling | 5 | missing window, invalid URLs, failed loads |

**Key Test Scenarios**:
```typescript
describe('TabManager', () => {
  describe('createTab()', () => {
    it('should create tab with isolated session partition');
    it('should apply proxy settings from ProxyManager');
    it('should inject fingerprint protection script');
    it('should emit tab:created event');
    it('should set new tab as active');
    it('should throw if window not set');
  });

  describe('setActiveTab()', () => {
    it('should remove previous view from window');
    it('should add new view with correct bounds');
    it('should emit tab:activated event');
    it('should handle rapid tab switching');
  });

  describe('navigation', () => {
    it('should update tab URL after navigation');
    it('should update title from page-title-updated event');
    it('should handle navigation failures gracefully');
  });
});
```

### Phase 2.3: Zustand Stores Tests (~50 tests)

**Target Files**:
- `src/stores/tabStore.ts` (125 lines) - 15 tests
- `src/stores/proxyStore.ts` (178 lines) - 15 tests
- `src/stores/automationStore.ts` (172 lines) - 10 tests
- `src/stores/privacyStore.ts` (215 lines) - 10 tests

**Test File Structure**:
```
tests/unit/stores/
├── tabStore.test.ts (new)
├── proxyStore.test.ts (new)
├── automationStore.test.ts (new)
└── privacyStore.test.ts (new)
```

**Testing Approach**:
```typescript
// tests/unit/stores/proxyStore.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useProxyStore } from '../../../src/stores/proxyStore';
import { act, renderHook } from '@testing-library/react';

// Mock window.api
vi.mock('window.api', () => ({
  proxy: {
    add: vi.fn(),
    remove: vi.fn(),
    list: vi.fn(),
    validate: vi.fn(),
    setRotation: vi.fn()
  }
}));

describe('useProxyStore', () => {
  beforeEach(() => {
    // Reset store state between tests
    useProxyStore.setState({ proxies: [], isLoading: false });
    vi.clearAllMocks();
  });

  describe('addProxy', () => {
    it('should add proxy to state on success', async () => {
      window.api.proxy.add.mockResolvedValue({ 
        success: true, 
        proxy: { id: '1', name: 'Test Proxy' } 
      });

      const { result } = renderHook(() => useProxyStore());
      
      await act(async () => {
        await result.current.addProxy({ name: 'Test', host: 'test.com', port: 8080 });
      });

      expect(result.current.proxies).toHaveLength(1);
      expect(result.current.proxies[0].name).toBe('Test Proxy');
    });

    it('should set isLoading during async operation');
    it('should throw on API failure');
    it('should not duplicate existing proxy');
  });

  describe('getActiveProxies', () => {
    it('should filter only active status proxies');
    it('should return empty array when no active proxies');
  });
});
```

### Phase 2.4: IPC Handlers Tests (~50 tests)

**Target Files** (in `electron/ipc/handlers/`):
- `index.ts` (247 lines) - 20 tests
- `automation.ts` (161 lines) - 15 tests
- `navigation.ts` (118 lines) - 10 tests
- `privacy.ts` (114 lines) - 5 tests

**Test File**: `tests/unit/ipc-handlers.test.ts` (exists - extend)

**Test Categories**:

| Category | Tests | Description |
|----------|-------|-------------|
| Input Validation | 15 | Zod schema validation for all handlers |
| Rate Limiting | 10 | Rate limit enforcement and reset |
| Error Handling | 10 | Graceful error responses |
| Success Paths | 15 | Happy path for all handlers |

**Example Tests**:
```typescript
describe('IPC Handlers', () => {
  describe('PROXY_ADD handler', () => {
    it('should reject invalid proxy config', async () => {
      const result = await ipcMain.handle('proxy:add', {}, { host: '' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
    });

    it('should enforce rate limiting', async () => {
      // Make 10 rapid requests
      for (let i = 0; i < 10; i++) {
        await ipcMain.handle('proxy:add', {}, validProxy);
      }
      const result = await ipcMain.handle('proxy:add', {}, validProxy);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Rate limit');
    });

    it('should return proxy on success');
  });
});
```

### TASK 2 Summary

| Phase | Tests | Effort | Dependencies |
|-------|-------|--------|--------------|
| 2.1 Database Layer | 100 | 3-4 days | test-helpers.ts |
| 2.2 Tab Manager | 35 | 1 day | Electron mocks |
| 2.3 Zustand Stores | 50 | 1-2 days | window.api mocks |
| 2.4 IPC Handlers | 50 | 1-2 days | Manager mocks |
| **Total** | **235** | **6-9 days** | |

---

## TASK 3: Database Optimization

### Overview
Optimize database performance through missing indexes, query optimization, and transaction management.

### Issue 3.1: Missing Indexes

**Current State Analysis**:
```sql
-- search_tasks table is missing proxy_id index (used in JOINs)
-- Missing composite indexes for common query patterns
```

**Required Indexes**:

| Table | Index | Columns | Reason |
|-------|-------|---------|--------|
| search_tasks | idx_search_tasks_proxy_id | proxy_id | FK lookups, JOINs |
| search_tasks | idx_search_tasks_session_status | session_id, status | Common filter combo |
| proxy_usage_stats | idx_usage_proxy_time | proxy_id, time_bucket | Time-series queries |
| activity_logs | idx_logs_proxy_timestamp | proxy_id, timestamp | Proxy activity lookup |
| rotation_events | idx_rotation_proxy_time | proxy_id, timestamp | Rotation history |

**Implementation**:
```sql
-- New migration: 003_performance_indexes.sql

-- Search tasks optimization
CREATE INDEX IF NOT EXISTS idx_search_tasks_proxy_id 
  ON search_tasks(proxy_id);
CREATE INDEX IF NOT EXISTS idx_search_tasks_session_status 
  ON search_tasks(session_id, status);

-- Proxy usage stats optimization  
CREATE INDEX IF NOT EXISTS idx_usage_proxy_time 
  ON proxy_usage_stats(proxy_id, time_bucket);

-- Activity logs optimization
CREATE INDEX IF NOT EXISTS idx_logs_proxy_timestamp 
  ON activity_logs(proxy_id, timestamp DESC);

-- Analyze tables after index creation
ANALYZE search_tasks;
ANALYZE proxy_usage_stats;
ANALYZE activity_logs;
```

### Issue 3.2: N+1 Query in recordUsage()

**File**: `electron/database/repositories/proxy-usage-stats.repository.ts`
**Lines**: 77-201

**Current Problem**:
```typescript
recordUsage(proxyId: string, stats: {...}): void {
  // PROBLEM: Two separate queries for every call
  const existing = this.db.prepare(
    'SELECT * FROM proxy_usage_stats WHERE proxy_id = ? AND time_bucket = ?'
  ).get(proxyId, timeBucket);  // Query 1

  if (existing) {
    this.db.prepare(`UPDATE ...`).run(...);  // Query 2a
  } else {
    this.db.prepare(`INSERT ...`).run(...);  // Query 2b
  }
}
```

**Solution**: Use SQLite UPSERT (INSERT ... ON CONFLICT)

```typescript
recordUsage(proxyId: string, stats: {...}): void {
  const timeBucket = this.getTimeBucket();
  const id = `${proxyId}_${timeBucket}`;

  // Single UPSERT query instead of SELECT + INSERT/UPDATE
  this.db.prepare(`
    INSERT INTO proxy_usage_stats (
      id, proxy_id, time_bucket,
      total_requests, successful_requests, failed_requests,
      avg_latency_ms, min_latency_ms, max_latency_ms,
      bytes_sent, bytes_received
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      total_requests = total_requests + excluded.total_requests,
      successful_requests = successful_requests + excluded.successful_requests,
      failed_requests = failed_requests + excluded.failed_requests,
      avg_latency_ms = (avg_latency_ms * total_requests + excluded.avg_latency_ms) 
                       / (total_requests + 1),
      min_latency_ms = MIN(min_latency_ms, excluded.min_latency_ms),
      max_latency_ms = MAX(max_latency_ms, excluded.max_latency_ms),
      bytes_sent = bytes_sent + excluded.bytes_sent,
      bytes_received = bytes_received + excluded.bytes_received,
      updated_at = CURRENT_TIMESTAMP
  `).run(
    id, proxyId, timeBucket,
    stats.requests || 0,
    stats.successful || 0,
    stats.failed || 0,
    stats.latencyMs || null,
    stats.latencyMs || null,
    stats.latencyMs || null,
    stats.bytesSent || 0,
    stats.bytesReceived || 0
  );
}
```

### Issue 3.3: Missing Transaction Wrapping

**Problem**: Batch operations lack transaction boundaries

**Files to Update**:
- `proxy.repository.ts` - bulkInsert, bulkUpdate
- `rotation-events.repository.ts` - recordMultiple
- `execution-logs.repository.ts` - bulkCreate

**Solution Pattern**:
```typescript
bulkInsert(proxies: ProxyDTO[]): void {
  // Wrap in transaction for atomicity and performance
  const insertStmt = this.db.prepare(`
    INSERT INTO proxies (id, name, host, port, protocol, ...)
    VALUES (?, ?, ?, ?, ?, ...)
  `);

  const insertMany = this.db.transaction((items: ProxyDTO[]) => {
    for (const proxy of items) {
      insertStmt.run(
        proxy.id,
        proxy.name,
        proxy.host,
        proxy.port,
        proxy.protocol,
        // ...
      );
    }
  });

  insertMany(proxies);  // All inserts in single transaction
}
```

### TASK 3 Summary

| Optimization | Effort | Impact | Risk |
|--------------|--------|--------|------|
| 3.1 Add indexes | 2 hours | High | Low |
| 3.2 Fix N+1 queries | 4 hours | High | Medium |
| 3.3 Transaction wrapping | 3 hours | Medium | Low |
| **Total** | **9 hours** | | |

---

## TASK 4: Remove Dead Code (~888 lines)

### Overview
Remove 8 unused files totaling approximately 888 lines of dead code.

### Files to Delete

| File | Lines | Reason | Verification |
|------|-------|--------|--------------|
| `src/hooks/useActivityLogs.ts` | 136 | Replaced by `useDashboardData.ts` | No imports found |
| `src/hooks/useProxyPerformance.ts` | 106 | Replaced by `useDashboardData.ts` | No imports found |
| `src/utils/sanitize.ts` | 171 | Duplicate of `sanitization.ts` | Compare functions |
| `src/components/dashboard/AnalyticsDashboard.tsx` | ~337 | Replaced by `EnhancedStatsPanel` | Check routing |

### Verification Steps

**Step 4.1: Verify No Active Imports**
```bash
# Check for imports of each file
grep -r "useActivityLogs" src/ --include="*.ts" --include="*.tsx"
grep -r "useProxyPerformance" src/ --include="*.ts" --include="*.tsx"
grep -r "from.*sanitize" src/ --include="*.ts" --include="*.tsx"
grep -r "AnalyticsDashboard" src/ --include="*.ts" --include="*.tsx"
```

**Step 4.2: Compare Duplicate Functions**
```typescript
// sanitize.ts vs sanitization.ts - verify identical functionality
// sanitize.ts functions:
- sanitizeUrl()
- sanitizeTextInput()
- escapeHtml()
- sanitizeDomain()
- sanitizeKeyword()
- isValidUUID()
- sanitizeProxyHost()
- sanitizePort()

// Verify sanitization.ts has equivalent or better implementations
```

**Step 4.3: Update Any Remaining References**
- Update imports to use `sanitization.ts` instead of `sanitize.ts`
- Update any component references

### Implementation Steps

| Step | Action | Risk |
|------|--------|------|
| 4.1 | Run grep verification for all files | None |
| 4.2 | Create backup branch | None |
| 4.3 | Delete `useActivityLogs.ts` | Low |
| 4.4 | Delete `useProxyPerformance.ts` | Low |
| 4.5 | Migrate any sanitize.ts usages to sanitization.ts | Low |
| 4.6 | Delete `sanitize.ts` | Low |
| 4.7 | Verify AnalyticsDashboard not in routes | Low |
| 4.8 | Delete `AnalyticsDashboard.tsx` | Low |
| 4.9 | Run full test suite | None |
| 4.10 | Run TypeScript compilation | None |

### TASK 4 Summary

| Action | Files | Lines Removed | Effort |
|--------|-------|---------------|--------|
| Delete unused hooks | 2 | 242 | 30 min |
| Delete duplicate utils | 1 | 171 | 30 min |
| Delete old components | 1 | ~337 | 30 min |
| Verification & testing | - | - | 1 hour |
| **Total** | **4** | **~750** | **2.5 hours** |

---

## TASK 5: UI Enhancement with Magic UI

### Overview
Integrate Magic UI components to enhance visual appeal of key panels.

### Current Magic UI Components Available
```
src/components/ui/
├── border-beam.tsx      ✓ Exists
├── number-ticker.tsx    ✓ Exists
├── pulsating-button.tsx ✓ Exists
├── shimmer-button.tsx   ✓ Exists
└── toast.tsx            ✓ Exists
```

### Components to Add

| Component | Source | Target Usage |
|-----------|--------|--------------|
| NeonGradientCard | Magic UI | Panel headers, feature cards |
| AnimatedBeam | Magic UI | Connection visualizations |
| Particles | Magic UI | Background ambiance |

### Enhancement Targets

#### 5.1: ProxyPanel Enhancement

**File**: `src/components/panels/ProxyPanel.tsx`

**Current State**: Static proxy list with basic styling

**Enhancements**:
```tsx
import { BorderBeam } from '@components/ui/border-beam';
import { NumberTicker } from '@components/ui/number-ticker';

export function ProxyPanel() {
  return (
    <div className="relative h-full">
      {/* Add subtle border animation */}
      <BorderBeam size={100} duration={10} />
      
      {/* Stats Footer with animated numbers */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <NumberTicker value={stats.total} />
          <span>Total</span>
        </div>
        <div>
          <NumberTicker value={stats.active} className="text-green-500" />
          <span>Active</span>
        </div>
        {/* ... */}
      </div>
    </div>
  );
}
```

#### 5.2: StatsPanel Enhancement

**File**: `src/components/panels/StatsPanel.tsx` (currently wraps EnhancedStatsPanel)

**Enhancements**:
- Add Particles background for visual depth
- Use AnimatedBeam for proxy connection visualization
- Apply NeonGradientCard for stat cards

#### 5.3: Create CreatorSupportPanel (New)

**New File**: `src/components/panels/CreatorSupportPanel.tsx`

```tsx
import { BorderBeam } from '@components/ui/border-beam';
import { ShimmerButton } from '@components/ui/shimmer-button';

export function CreatorSupportPanel() {
  return (
    <div className="relative p-4">
      <BorderBeam size={150} duration={8} colorFrom="#ff6b6b" colorTo="#feca57" />
      
      <h2>Creator Support</h2>
      
      {/* Creator cards with hover effects */}
      {creators.map(creator => (
        <NeonGradientCard key={creator.id}>
          <img src={creator.thumbnail} />
          <h3>{creator.name}</h3>
          <ShimmerButton onClick={() => support(creator.id)}>
            Support Now
          </ShimmerButton>
        </NeonGradientCard>
      ))}
    </div>
  );
}
```

### Implementation Steps

| Step | Action | File | Effort |
|------|--------|------|--------|
| 5.1 | Add NeonGradientCard component | `ui/neon-gradient-card.tsx` | 1 hour |
| 5.2 | Add AnimatedBeam component | `ui/animated-beam.tsx` | 1 hour |
| 5.3 | Add Particles component | `ui/particles.tsx` | 1 hour |
| 5.4 | Enhance ProxyPanel | `panels/ProxyPanel.tsx` | 2 hours |
| 5.5 | Enhance StatsPanel | `dashboard/EnhancedStatsPanel.tsx` | 2 hours |
| 5.6 | Create CreatorSupportPanel | `panels/CreatorSupportPanel.tsx` | 3 hours |
| 5.7 | Performance testing | - | 1 hour |
| **Total** | | | **11 hours** |

### Performance Considerations

- Use `will-change: transform` for animated elements
- Implement `IntersectionObserver` to pause off-screen animations
- Add `prefers-reduced-motion` media query support
- Lazy-load particle effects

---

## Testing Strategy

### Test Pyramid

```
                    ┌─────────┐
                    │   E2E   │  10%
                    │ (15-20) │
                  ┌─┴─────────┴─┐
                  │ Integration │  20%
                  │   (40-50)   │
                ┌─┴─────────────┴─┐
                │   Unit Tests    │  70%
                │    (165-175)    │
                └─────────────────┘
```

### Critical Test Paths

1. **Security Fixes (TASK 1)**
   - Each fix requires dedicated unit tests
   - Integration tests for encryption migration
   - E2E tests for session restoration

2. **Database (TASK 3)**
   - Performance benchmarks before/after
   - Transaction rollback scenarios
   - Concurrent access tests

3. **UI (TASK 5)**
   - Visual regression tests
   - Performance benchmarks (FPS, memory)
   - Accessibility tests

---

## Rollback Plan

### TASK 1: Security Fixes

| Issue | Rollback Strategy |
|-------|-------------------|
| 1.1 Encryption | Keep old key derivation as fallback; version config schema |
| 1.2 ReDoS | Feature flag for old regex matcher |
| 1.3 WebRTC | Toggle between simple/comprehensive protection |
| 1.4 Session URLs | Add config option to skip validation |

### TASK 2: Tests

**Rollback**: Not applicable - tests are additive

### TASK 3: Database

**Rollback Strategy**:
1. Keep migration version in `schema_migrations` table
2. Create rollback migration for each forward migration
3. Database backup before each migration run

```sql
-- 003_performance_indexes_rollback.sql
DROP INDEX IF EXISTS idx_search_tasks_proxy_id;
DROP INDEX IF EXISTS idx_search_tasks_session_status;
DROP INDEX IF EXISTS idx_usage_proxy_time;
-- ...
```

### TASK 4: Dead Code

**Rollback**: Git history preserves all deleted files
```bash
# Restore deleted file
git checkout HEAD~1 -- src/hooks/useActivityLogs.ts
```

### TASK 5: UI

**Rollback Strategy**:
- Feature flag: `ENABLE_MAGIC_UI=false`
- Keep original components alongside enhanced versions
- Gradual rollout via A/B testing

---

## Timeline Estimate

### Phase 1: Security (Critical) - Days 1-2
| Day | Tasks | Hours |
|-----|-------|-------|
| 1 | Issues 1.1, 1.2 | 8 |
| 2 | Issues 1.3, 1.4 + Testing | 8 |

### Phase 2: Parallel Work - Days 3-5
| Day | Tasks | Hours |
|-----|-------|-------|
| 3 | TASK 4 (Dead Code) + TASK 3 (DB Indexes) | 8 |
| 4 | TASK 3 (N+1, Transactions) + TASK 5 (Components) | 8 |
| 5 | TASK 5 (Panel Enhancements) | 8 |

### Phase 3: Test Coverage - Days 6-12
| Day | Tasks | Hours |
|-----|-------|-------|
| 6-7 | Database layer tests (100 tests) | 16 |
| 8-9 | Tab Manager + IPC tests (85 tests) | 16 |
| 10-11 | Zustand store tests (50 tests) | 16 |
| 12 | Integration, cleanup, documentation | 8 |

### Total Timeline
- **Minimum**: 8 developer days
- **Expected**: 10-12 developer days
- **Buffer**: 2 days for unexpected issues

---

## Success Criteria

### TASK 1: Security
- [ ] All 4 P0 issues resolved
- [ ] No new security vulnerabilities introduced
- [ ] Existing functionality preserved
- [ ] Migration path for existing users

### TASK 2: Test Coverage
- [ ] Coverage increased from 44.79% to 80%+
- [ ] 235+ new tests passing
- [ ] No flaky tests
- [ ] CI pipeline green

### TASK 3: Database
- [ ] Query performance improved (benchmark)
- [ ] No regression in functionality
- [ ] Migrations reversible

### TASK 4: Dead Code
- [ ] 750+ lines removed
- [ ] No broken imports
- [ ] All tests passing

### TASK 5: UI
- [ ] 3 new Magic UI components integrated
- [ ] 3 panels enhanced
- [ ] No performance regression
- [ ] Respects `prefers-reduced-motion`

---

## Appendix A: File Reference

### Files Modified by Task

| Task | Files Modified | Files Created | Files Deleted |
|------|----------------|---------------|---------------|
| TASK 1 | 4 source + 4 test | 1 (filter) | 0 |
| TASK 2 | 4 test files | 4 test files | 0 |
| TASK 3 | 3 repositories | 1 migration | 0 |
| TASK 4 | 0 | 0 | 4 |
| TASK 5 | 3 panels | 4 components | 0 |

### Dependency Graph

```
TASK 1 (Security)
    │
    ├──► TASK 4 (Dead Code) ──► TASK 2 (Tests)
    │
    ├──► TASK 3 (Database) ──► TASK 2 (Tests)
    │
    └──► TASK 5 (UI) ──► TASK 2 (Tests)
```

---

*Document Version: 1.0*
*Last Updated: 2025*
*Author: Planning Specialist Agent*

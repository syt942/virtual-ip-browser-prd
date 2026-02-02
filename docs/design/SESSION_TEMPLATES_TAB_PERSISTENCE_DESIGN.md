# System Design Impact Analysis: Session Templates + Full Tab Persistence

## Document Information

| Field | Value |
|-------|-------|
| **Feature** | Session Templates + Full Tab Persistence |
| **Version** | 1.0.0 |
| **Date** | 2026-01-27 |
| **Status** | Design Review |
| **PRD Reference** | Section 5.8 (Epic EP-010: Session Management) |

---

## 1. Executive Summary

This document analyzes the system design impact of implementing **Session Templates** and **Full Tab Persistence** features. These features enable users to save, restore, and reuse browser session configurations including all tab states, proxy assignments, fingerprint settings, and privacy configurations.

### 1.1 Current State

The existing `SessionManager` provides basic session save/restore with:
- Session ID, name, and timestamps
- Basic tab state (URL, title, favicon, proxy assignment)
- Window bounds
- URL re-validation on restore (security feature)

### 1.2 Gap Analysis

| Capability | Current | Required | Gap |
|------------|---------|----------|-----|
| Tab URL persistence | ✅ Yes | ✅ Yes | None |
| Tab title/favicon | ✅ Yes | ✅ Yes | None |
| Proxy assignment per tab | ✅ Yes | ✅ Yes | None |
| Fingerprint config per tab | ❌ No | ✅ Yes | **Missing** |
| Privacy settings per tab | ❌ No | ✅ Yes | **Missing** |
| Navigation history | ❌ No | ✅ Yes | **Missing** |
| Scroll position | ❌ No | ✅ Yes | **Missing** |
| Form data (optional) | ❌ No | ⚪ Optional | **Missing** |
| Session templates | ❌ No | ✅ Yes | **Missing** |
| Template categories | ❌ No | ✅ Yes | **Missing** |
| Template sharing/export | ❌ No | ✅ Yes | **Missing** |
| Tab groups | ❌ No | ⚪ Optional | **Missing** |
| Pinned tab state | ❌ No | ✅ Yes | **Missing** |

---

## 2. Feature Specifications

### 2.1 Session Templates

Session templates are reusable configurations that can be applied to create new sessions with predefined settings.

#### 2.1.1 Template Types

| Type | Description | Use Case |
|------|-------------|----------|
| **Privacy Profile** | Fingerprint + privacy settings only | Quick privacy mode switching |
| **Workspace** | Full tab layout + URLs + settings | Project-specific browsing |
| **Automation Setup** | Tabs + proxy rotation + target domains | SEO/automation workflows |
| **Research Session** | Tabs + notes + bookmarks | Investigation workflows |

#### 2.1.2 Template Capabilities

- Create template from current session
- Create template from scratch
- Apply template to new session
- Apply template to existing session (merge/replace)
- Export template to JSON file
- Import template from JSON file
- Share templates (future: cloud sync)

### 2.2 Full Tab Persistence

Complete tab state capture and restoration beyond basic URL/title.

#### 2.2.1 Persisted Tab State

| State Component | Priority | Storage Size Impact |
|-----------------|----------|---------------------|
| URL | P0 | Low (~200 bytes) |
| Title | P0 | Low (~100 bytes) |
| Favicon | P0 | Medium (~5KB base64) |
| Proxy ID | P0 | Low (~36 bytes UUID) |
| Fingerprint seed | P0 | Low (~64 bytes) |
| Fingerprint config | P1 | Low (~500 bytes JSON) |
| Privacy config | P1 | Low (~300 bytes JSON) |
| Navigation history | P1 | Medium (~2KB for 20 entries) |
| Scroll position | P2 | Low (~20 bytes) |
| Zoom level | P2 | Low (~8 bytes) |
| Tab order/index | P0 | Low (~4 bytes) |
| Pinned state | P1 | Low (~1 byte) |
| Tab group ID | P2 | Low (~36 bytes) |
| Created timestamp | P0 | Low (~24 bytes) |
| Last active timestamp | P1 | Low (~24 bytes) |

---

## 3. Data Model Changes

### 3.1 Current Data Models

#### 3.1.1 Current `TabState` (in SessionManager)

```typescript
// Current - electron/core/session/manager.ts
interface TabState {
  url: string;
  title: string;
  favicon?: string;
  proxyId?: string;
}
```

#### 3.1.2 Current `SavedSession`

```typescript
// Current - electron/core/session/manager.ts
interface SavedSession {
  id: string;
  name: string;
  tabs: TabState[];
  windowBounds: WindowBounds;
  createdAt: Date;
  updatedAt: Date;
}
```

#### 3.1.3 Current `sessions` Table

```sql
-- Current - electron/database/schema.sql
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tabs TEXT,           -- JSON blob
  window_bounds TEXT,  -- JSON blob
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 3.2 Proposed Data Model Changes

#### 3.2.1 Enhanced `TabState` Interface

```typescript
// NEW - electron/core/session/types.ts
export interface PersistedTabState {
  // Identity
  id: string;                          // NEW: Tab UUID for reference
  index: number;                       // NEW: Tab order position
  
  // Navigation
  url: string;
  title: string;
  favicon?: string;
  navigationHistory?: NavigationEntry[]; // NEW: Back/forward history
  
  // Proxy Configuration
  proxyId?: string;
  proxyConfig?: {                      // NEW: Snapshot of proxy settings
    host: string;
    port: number;
    protocol: string;
  };
  
  // Privacy & Fingerprint
  fingerprintSeed?: string;            // NEW: Deterministic fingerprint seed
  fingerprintConfig?: FingerprintConfig; // NEW: Full fingerprint settings
  privacyConfig?: TabPrivacyConfig;    // NEW: Per-tab privacy overrides
  
  // UI State
  isPinned: boolean;                   // NEW: Pinned tab state
  isActive: boolean;                   // NEW: Was this the active tab
  scrollPosition?: ScrollPosition;     // NEW: Scroll X/Y
  zoomLevel?: number;                  // NEW: Zoom factor
  
  // Grouping (Phase 2)
  groupId?: string;                    // NEW: Tab group membership
  groupColor?: string;                 // NEW: Tab group color
  groupName?: string;                  // NEW: Tab group name
  
  // Timestamps
  createdAt: Date;
  lastActiveAt?: Date;                 // NEW: Last interaction time
}

export interface NavigationEntry {
  url: string;
  title: string;
  timestamp: Date;
}

export interface ScrollPosition {
  x: number;
  y: number;
}

export interface TabPrivacyConfig {
  webrtcPolicy?: 'disable' | 'disable_non_proxied' | 'proxy_only' | 'default';
  trackerBlocking?: boolean;
  fingerprintSpoofing?: boolean;
  // Inherits from global if not specified
}
```

#### 3.2.2 Enhanced `SavedSession` Interface

```typescript
// NEW - electron/core/session/types.ts
export interface EnhancedSavedSession {
  // Identity
  id: string;
  name: string;
  description?: string;                // NEW: User description
  
  // Content
  tabs: PersistedTabState[];
  tabGroups?: TabGroup[];              // NEW: Tab group definitions
  
  // Window State
  windowBounds: WindowBounds;
  windowState?: 'normal' | 'maximized' | 'fullscreen'; // NEW
  
  // Global Settings Snapshot
  globalPrivacyConfig?: PrivacyConfig; // NEW: Privacy settings at save time
  proxyRotationStrategy?: string;      // NEW: Active rotation strategy
  
  // Metadata
  version: number;                     // NEW: Schema version for migrations
  createdAt: Date;
  updatedAt: Date;
  lastRestoredAt?: Date;               // NEW: Track restoration
  restoreCount: number;                // NEW: Usage tracking
  
  // Template Reference
  templateId?: string;                 // NEW: If created from template
}

export interface TabGroup {
  id: string;
  name: string;
  color: string;
  collapsed: boolean;
}
```

#### 3.2.3 New `SessionTemplate` Interface

```typescript
// NEW - electron/core/session/types.ts
export interface SessionTemplate {
  // Identity
  id: string;
  name: string;
  description?: string;
  category: TemplateCategory;
  
  // Template Content
  tabs: TemplateTabConfig[];
  tabGroups?: TabGroup[];
  
  // Settings
  defaultPrivacyConfig?: PrivacyConfig;
  defaultProxyStrategy?: string;
  defaultProxyId?: string;             // Optional default proxy
  
  // Metadata
  version: number;
  isBuiltIn: boolean;                  // System-provided vs user-created
  isShared: boolean;                   // Available for export
  tags: string[];
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt?: Date;
  useCount: number;
}

export type TemplateCategory = 
  | 'privacy'      // Privacy-focused templates
  | 'workspace'    // Project/work templates
  | 'automation'   // SEO/automation templates
  | 'research'     // Research/investigation
  | 'custom';      // User-defined

export interface TemplateTabConfig {
  // URL can be literal, pattern, or placeholder
  url: string | UrlPattern;
  title?: string;
  
  // Settings
  proxyId?: string | 'auto' | 'none';
  fingerprintConfig?: FingerprintConfig;
  privacyConfig?: TabPrivacyConfig;
  
  // UI
  isPinned?: boolean;
  groupId?: string;
}

export interface UrlPattern {
  type: 'literal' | 'placeholder' | 'variable';
  value: string;
  defaultValue?: string;
  label?: string;  // For UI: "Enter search query"
}
```

### 3.3 Database Schema Changes

#### 3.3.1 Enhanced `sessions` Table

```sql
-- Migration: 007_enhanced_sessions.sql

-- Add new columns to sessions table
ALTER TABLE sessions ADD COLUMN description TEXT;
ALTER TABLE sessions ADD COLUMN tab_groups TEXT;        -- JSON array
ALTER TABLE sessions ADD COLUMN window_state TEXT DEFAULT 'normal';
ALTER TABLE sessions ADD COLUMN global_privacy_config TEXT;  -- JSON
ALTER TABLE sessions ADD COLUMN proxy_rotation_strategy TEXT;
ALTER TABLE sessions ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE sessions ADD COLUMN last_restored_at DATETIME;
ALTER TABLE sessions ADD COLUMN restore_count INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN template_id TEXT;

-- Add foreign key index
CREATE INDEX IF NOT EXISTS idx_sessions_template_id ON sessions(template_id);
```

#### 3.3.2 New `session_templates` Table

```sql
-- Migration: 007_enhanced_sessions.sql

CREATE TABLE IF NOT EXISTS session_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('privacy', 'workspace', 'automation', 'research', 'custom')),
  
  -- Template content (JSON)
  tabs TEXT NOT NULL,                  -- JSON array of TemplateTabConfig
  tab_groups TEXT,                     -- JSON array of TabGroup
  
  -- Default settings (JSON)
  default_privacy_config TEXT,
  default_proxy_strategy TEXT,
  default_proxy_id TEXT,
  
  -- Metadata
  version INTEGER DEFAULT 1,
  is_built_in INTEGER DEFAULT 0,
  is_shared INTEGER DEFAULT 0,
  tags TEXT,                           -- JSON array of strings
  
  -- Usage tracking
  use_count INTEGER DEFAULT 0,
  last_used_at DATETIME,
  
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_session_templates_category ON session_templates(category);
CREATE INDEX IF NOT EXISTS idx_session_templates_is_built_in ON session_templates(is_built_in);
CREATE INDEX IF NOT EXISTS idx_session_templates_use_count ON session_templates(use_count DESC);
```

#### 3.3.3 New `tab_navigation_history` Table (Optional - for large history)

```sql
-- Migration: 007_enhanced_sessions.sql
-- Optional: Separate table for navigation history to keep sessions table lean

CREATE TABLE IF NOT EXISTS tab_navigation_history (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  tab_id TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT,
  visited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tab_nav_history_session ON tab_navigation_history(session_id);
CREATE INDEX IF NOT EXISTS idx_tab_nav_history_tab ON tab_navigation_history(tab_id);
CREATE INDEX IF NOT EXISTS idx_tab_nav_history_visited ON tab_navigation_history(visited_at DESC);
```

---

## 4. Component Architecture Changes

### 4.1 New Components Required

```
┌─────────────────────────────────────────────────────────────────┐
│                    Session Management System                     │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ SessionManager  │  │ TemplateManager │  │ TabStateCapture │ │
│  │ (Enhanced)      │  │ (NEW)           │  │ (NEW)           │ │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘ │
│           │                    │                    │           │
│  ┌────────┴────────────────────┴────────────────────┴────────┐ │
│  │                  SessionRepository (NEW)                   │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│  ┌───────────────────────────┴───────────────────────────────┐ │
│  │                    DatabaseManager                         │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Component Responsibilities

#### 4.2.1 `SessionManager` (Enhanced)

**Current Responsibilities:**
- Save/load sessions
- URL validation on restore
- Session CRUD operations

**New Responsibilities:**
- Capture full tab state via `TabStateCapture`
- Restore complete tab state including fingerprint/privacy
- Manage session versioning and migrations
- Track restoration statistics

#### 4.2.2 `TemplateManager` (New)

**Responsibilities:**
- CRUD operations for templates
- Apply template to create new session
- Apply template to existing session (merge/replace modes)
- Export/import templates (JSON format)
- Manage built-in templates
- Template validation

#### 4.2.3 `TabStateCapture` (New)

**Responsibilities:**
- Capture current tab state from BrowserView
- Extract navigation history from webContents
- Capture scroll position via executeJavaScript
- Serialize fingerprint/privacy config
- Validate captured state

#### 4.2.4 `SessionRepository` (New)

**Responsibilities:**
- Database operations for sessions and templates
- Schema migrations
- Query optimization
- Data integrity validation

### 4.3 File Structure Changes

```
electron/core/session/
├── manager.ts              # Enhanced SessionManager
├── types.ts                # NEW: All session/template types
├── template-manager.ts     # NEW: Template operations
├── tab-state-capture.ts    # NEW: Tab state extraction
├── migration.ts            # NEW: Session data migration
└── validators.ts           # NEW: Zod schemas for validation

electron/database/repositories/
├── session.repository.ts   # NEW: Session DB operations
└── template.repository.ts  # NEW: Template DB operations

electron/database/migrations/
└── 007_enhanced_sessions.sql  # NEW: Schema migration

src/stores/
└── sessionStore.ts         # NEW: Frontend session state
```

---

## 5. API Changes

### 5.1 New IPC Channels

#### 5.1.1 Session API Extensions

```typescript
// electron/ipc/channels.ts - New channels

export const SESSION_CHANNELS = {
  // Existing
  SAVE: 'session:save',
  LOAD: 'session:load',
  LIST: 'session:list',
  DELETE: 'session:delete',
  UPDATE: 'session:update',
  
  // NEW
  SAVE_FULL: 'session:saveFull',           // Save with complete tab state
  RESTORE_FULL: 'session:restoreFull',     // Restore with complete tab state
  EXPORT: 'session:export',                 // Export to JSON file
  IMPORT: 'session:import',                 // Import from JSON file
  GET_CURRENT_STATE: 'session:getCurrentState', // Get current session state
} as const;
```

#### 5.1.2 Template API

```typescript
// electron/ipc/channels.ts - New channels

export const TEMPLATE_CHANNELS = {
  CREATE: 'template:create',
  LIST: 'template:list',
  GET: 'template:get',
  UPDATE: 'template:update',
  DELETE: 'template:delete',
  APPLY: 'template:apply',
  CREATE_FROM_SESSION: 'template:createFromSession',
  EXPORT: 'template:export',
  IMPORT: 'template:import',
  GET_BUILT_IN: 'template:getBuiltIn',
} as const;
```

### 5.2 API Specifications

#### 5.2.1 `session:saveFull`

**Request:**
```typescript
interface SaveFullSessionRequest {
  name: string;
  description?: string;
  includeHistory?: boolean;      // Include navigation history
  includeScrollPosition?: boolean;
  capturePrivacyConfig?: boolean;
}
```

**Response:**
```typescript
interface SaveFullSessionResponse {
  success: boolean;
  session?: EnhancedSavedSession;
  error?: string;
}
```

#### 5.2.2 `template:apply`

**Request:**
```typescript
interface ApplyTemplateRequest {
  templateId: string;
  mode: 'new' | 'replace' | 'merge';
  variables?: Record<string, string>;  // For URL placeholders
}
```

**Response:**
```typescript
interface ApplyTemplateResponse {
  success: boolean;
  sessionId?: string;
  tabsCreated?: number;
  error?: string;
}
```

---

## 6. Migration Strategy

### 6.1 Data Migration

#### 6.1.1 Session Data Migration

```typescript
// Migrate existing sessions to new format
interface MigrationPlan {
  version: number;
  migrate: (oldData: unknown) => EnhancedSavedSession;
}

const migrations: MigrationPlan[] = [
  {
    version: 1,
    migrate: (old: OldTabState[]) => ({
      // Map old TabState to PersistedTabState
      tabs: old.map((tab, index) => ({
        id: generateUUID(),
        index,
        url: tab.url,
        title: tab.title,
        favicon: tab.favicon,
        proxyId: tab.proxyId,
        isPinned: false,
        isActive: index === 0,
        createdAt: new Date(),
        // New fields get defaults
        fingerprintSeed: generateFingerprintSeed(),
        fingerprintConfig: getDefaultFingerprintConfig(),
      })),
      version: 2,
      // ... other fields
    })
  }
];
```

### 6.2 Backward Compatibility

- Existing sessions will be auto-migrated on first load
- Version field tracks schema version
- Graceful fallback for missing fields
- Export format includes version for cross-version compatibility

---

## 7. Security Considerations

### 7.1 Existing Security (Maintained)

- ✅ URL re-validation on restore (SSRF protection)
- ✅ Session ID format validation
- ✅ Session name sanitization

### 7.2 New Security Requirements

| Concern | Mitigation |
|---------|------------|
| Template injection | Validate all template URLs before applying |
| Sensitive data in exports | Option to exclude proxy credentials |
| Large navigation history | Limit history entries (max 50) |
| Malicious imported templates | Validate imported JSON against schema |
| Cross-session data leak | Ensure fingerprint seeds are unique per restore |

### 7.3 Security Validation Schema

```typescript
// NEW validation schemas
const TemplateImportSchema = z.object({
  version: z.number().min(1),
  name: z.string().min(1).max(100),
  tabs: z.array(TemplateTabSchema).max(50),
  // ... strict validation
});

const PersistedTabSchema = z.object({
  url: SafeUrlSchema,  // Reuse existing secure URL validation
  // ... other fields
});
```

---

## 8. Performance Considerations

### 8.1 Storage Impact

| Scenario | Current Size | New Size | Increase |
|----------|--------------|----------|----------|
| 10 tabs, basic | ~5 KB | ~15 KB | 3x |
| 10 tabs, full history | ~5 KB | ~50 KB | 10x |
| 50 tabs, full state | ~25 KB | ~250 KB | 10x |

### 8.2 Optimization Strategies

1. **Lazy History Loading**: Load navigation history only when needed
2. **Favicon Compression**: Store favicon URLs instead of base64 when possible
3. **Incremental Saves**: Only save changed tabs
4. **History Pruning**: Auto-prune history older than 30 days
5. **Separate History Table**: Keep sessions table lean

### 8.3 Performance Targets

| Operation | Target | Method |
|-----------|--------|--------|
| Save session (10 tabs) | < 100ms | Batch insert |
| Restore session (10 tabs) | < 500ms | Parallel tab creation |
| List sessions | < 50ms | Index on updated_at |
| Apply template | < 300ms | Pre-validated URLs |

---

## 9. Frontend Store Changes

### 9.1 New `sessionStore.ts`

```typescript
// src/stores/sessionStore.ts

interface SessionState {
  // State
  sessions: EnhancedSavedSession[];
  templates: SessionTemplate[];
  currentSessionId: string | null;
  isLoading: boolean;
  
  // Session Actions
  saveCurrentSession: (name: string, options?: SaveOptions) => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  exportSession: (sessionId: string, filePath: string) => Promise<void>;
  importSession: (filePath: string) => Promise<void>;
  
  // Template Actions
  createTemplate: (template: CreateTemplateInput) => Promise<void>;
  createTemplateFromCurrent: (name: string, category: TemplateCategory) => Promise<void>;
  applyTemplate: (templateId: string, mode: ApplyMode) => Promise<void>;
  deleteTemplate: (templateId: string) => Promise<void>;
  
  // Selectors
  getSessionById: (id: string) => EnhancedSavedSession | undefined;
  getTemplatesByCategory: (category: TemplateCategory) => SessionTemplate[];
  getRecentSessions: (limit: number) => EnhancedSavedSession[];
}
```

---

## 10. Implementation Phases

### Phase 1: Core Tab Persistence (Week 1-2)

- [ ] Define new TypeScript interfaces
- [ ] Create database migration
- [ ] Implement `TabStateCapture`
- [ ] Enhance `SessionManager` for full state
- [ ] Add `session:saveFull` and `session:restoreFull` IPC handlers
- [ ] Unit tests for new components

### Phase 2: Template System (Week 3-4)

- [ ] Implement `TemplateManager`
- [ ] Create `session_templates` table
- [ ] Add template IPC handlers
- [ ] Create built-in templates
- [ ] Template validation and security
- [ ] Unit and integration tests

### Phase 3: Frontend Integration (Week 5)

- [ ] Create `sessionStore.ts`
- [ ] Session management UI components
- [ ] Template browser UI
- [ ] Export/import dialogs
- [ ] E2E tests

### Phase 4: Polish & Optimization (Week 6)

- [ ] Performance optimization
- [ ] Data migration for existing sessions
- [ ] Documentation
- [ ] User testing and feedback

---

## 11. Testing Requirements

### 11.1 Unit Tests

| Component | Test Cases |
|-----------|------------|
| `TabStateCapture` | Capture URL, history, scroll, fingerprint |
| `TemplateManager` | CRUD, apply, validate, import/export |
| `SessionRepository` | All database operations |
| Migration | Version upgrades, backward compat |

### 11.2 Integration Tests

| Scenario | Components |
|----------|------------|
| Save/restore full session | SessionManager + TabManager + Database |
| Apply template | TemplateManager + TabManager + ProxyManager |
| Export/import cycle | SessionManager + FileSystem |

### 11.3 E2E Tests

| Test | Steps |
|------|-------|
| Full session lifecycle | Create tabs → Save → Close → Restore → Verify |
| Template workflow | Create template → Apply → Verify tabs created |
| Import external template | Import JSON → Validate → Apply |

---

## 12. Summary of Changes

### 12.1 New Files Required

| File | Purpose |
|------|---------|
| `electron/core/session/types.ts` | Type definitions |
| `electron/core/session/template-manager.ts` | Template operations |
| `electron/core/session/tab-state-capture.ts` | Tab state extraction |
| `electron/core/session/validators.ts` | Zod validation schemas |
| `electron/database/repositories/session.repository.ts` | Session DB ops |
| `electron/database/repositories/template.repository.ts` | Template DB ops |
| `electron/database/migrations/007_enhanced_sessions.sql` | Schema migration |
| `electron/ipc/handlers/session.ts` | Session IPC handlers |
| `electron/ipc/handlers/template.ts` | Template IPC handlers |
| `src/stores/sessionStore.ts` | Frontend state |

### 12.2 Modified Files

| File | Changes |
|------|---------|
| `electron/core/session/manager.ts` | Enhance for full tab state |
| `electron/core/tabs/manager.ts` | Add state extraction methods |
| `electron/core/tabs/types.ts` | Import from new types file |
| `electron/ipc/channels.ts` | Add new channels |
| `electron/ipc/handlers/index.ts` | Register new handlers |
| `electron/database/schema.sql` | Reference new migration |

### 12.3 Database Changes Summary

| Change Type | Details |
|-------------|---------|
| New Table | `session_templates` |
| New Table (Optional) | `tab_navigation_history` |
| Altered Table | `sessions` - 9 new columns |
| New Indexes | 4 new indexes |

---

## 13. Open Questions

1. **History Limit**: Should we cap navigation history at 20, 50, or make it configurable?
2. **Favicon Storage**: Store as URL reference or base64? (Trade-off: offline availability vs storage)
3. **Template Sharing**: Should templates include proxy credentials or just proxy IDs?
4. **Tab Groups**: Include in Phase 1 or defer to Phase 2?
5. **Auto-save**: Should sessions auto-save periodically?

---

## 14. Appendix: Type Definitions Summary

```typescript
// Complete type exports for reference
export {
  // Tab State
  PersistedTabState,
  NavigationEntry,
  ScrollPosition,
  TabPrivacyConfig,
  
  // Session
  EnhancedSavedSession,
  TabGroup,
  WindowBounds,
  
  // Template
  SessionTemplate,
  TemplateCategory,
  TemplateTabConfig,
  UrlPattern,
  
  // API
  SaveFullSessionRequest,
  SaveFullSessionResponse,
  ApplyTemplateRequest,
  ApplyTemplateResponse,
} from './electron/core/session/types';
```

---

**END OF DOCUMENT**

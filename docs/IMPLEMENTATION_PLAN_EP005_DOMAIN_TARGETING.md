# Implementation Plan: Domain Targeting System (EP-005)

## Overview

The Domain Targeting System enables automated identification and interaction with target domains found in search results. This system builds upon the existing `SearchEngineAutomation` class to add sophisticated click simulation, human-like page interaction, bounce rate control, and domain allowlist/blocklist management.

## Requirements Summary

From PRD User Stories DT-001, DT-002, DT-003:

1. **Target Domain Configuration** - Manage domains to find in search results
2. **Domain Click Simulation** - Human-like clicking on target domains
3. **Page Interaction** - Natural scrolling, hovering, and dwell time
4. **Bounce Rate Control** - Configurable visit duration and exit behavior
5. **Domain Allowlist/Blocklist** - Filter which domains to interact with

## Current State Analysis

### Existing Components

| Component | File | Current Capability |
|-----------|------|-------------------|
| `SearchEngineAutomation` | `electron/core/automation/search-engine.ts` | Basic search, result extraction, simple click |
| `TaskExecutor` | `electron/core/automation/executor.ts` | Task execution with retry logic |
| `AutomationManager` | `electron/core/automation/manager.ts` | Session management, basic domain add |
| `TabManager` | `electron/core/tabs/manager.ts` | Tab isolation, proxy assignment |
| `PrivacyManager` | `electron/core/privacy/manager.ts` | Fingerprint protection |

### Gaps to Address

1. No dedicated domain targeting module
2. Limited human-like behavior (only basic scroll)
3. No mouse movement simulation
4. No bounce rate control
5. No allowlist/blocklist system
6. No interaction depth configuration
7. No dwell time management

## Architecture Changes

```
electron/core/automation/
├── search-engine.ts          # Existing - enhance result extraction
├── domain-targeting/         # NEW - Domain targeting module
│   ├── index.ts             # Module exports
│   ├── types.ts             # Type definitions
│   ├── domain-manager.ts    # Domain list management (allow/block)
│   ├── click-simulator.ts   # Human-like click simulation
│   ├── page-interactor.ts   # Page interaction (scroll, hover, dwell)
│   ├── behavior-patterns.ts # Human behavior pattern library
│   └── bounce-controller.ts # Bounce rate control
├── executor.ts              # Existing - integrate domain targeting
├── manager.ts               # Existing - add domain targeting config
└── types.ts                 # Existing - extend types
```

## Implementation Steps

### Phase 1: Type Definitions & Domain Manager

#### Step 1.1: Create Domain Targeting Types
**File:** `electron/core/automation/domain-targeting/types.ts`

```typescript
// Core types for domain targeting system
export interface DomainTarget {
  id: string;
  domain: string;
  pattern?: string;           // Regex pattern for flexible matching
  matchType: 'exact' | 'contains' | 'regex' | 'wildcard';
  enabled: boolean;
  priority: number;           // Higher = more important
  listType: 'allow' | 'block' | 'target';
  visitCount: number;
  lastVisited?: Date;
  avgPosition?: number;
  interactionConfig?: InteractionConfig;
  createdAt: Date;
  updatedAt: Date;
}

export interface InteractionConfig {
  minDwellTime: number;       // Minimum time on page (seconds)
  maxDwellTime: number;       // Maximum time on page (seconds)
  scrollDepth: 'shallow' | 'medium' | 'deep' | 'full';
  clickInternalLinks: boolean;
  maxInternalClicks: number;
  hoverElements: boolean;
  simulateReading: boolean;
}

export interface ClickSimulationConfig {
  mouseSpeed: 'slow' | 'normal' | 'fast' | 'variable';
  hoverBeforeClick: boolean;
  hoverDuration: { min: number; max: number };
  clickOffset: { x: number; y: number };  // Random offset from center
  doubleClickChance: number;  // Probability of accidental double click
}

export interface PageInteractionResult {
  success: boolean;
  dwellTime: number;
  scrollDepth: number;        // 0-100 percentage
  internalLinksClicked: number;
  elementsHovered: number;
  error?: string;
}

export interface BounceConfig {
  targetBounceRate: number;   // 0-100, percentage that should "bounce"
  minBounceTime: number;      // Minimum time before bounce (seconds)
  maxBounceTime: number;      // Maximum time before bounce (seconds)
  bounceActions: ('back' | 'close' | 'newSearch')[];
}

export interface DomainVisitResult {
  domainId: string;
  domain: string;
  url: string;
  position: number;
  visitStarted: Date;
  visitEnded: Date;
  dwellTime: number;
  didBounce: boolean;
  interactionResult: PageInteractionResult;
  searchKeyword: string;
  searchEngine: string;
}
```

**Action:** Create new file with type definitions
**Why:** Establishes type safety and clear contracts for the module
**Dependencies:** None
**Risk:** Low

#### Step 1.2: Create Domain Manager
**File:** `electron/core/automation/domain-targeting/domain-manager.ts`

```typescript
// Manages allowlist, blocklist, and target domain configurations
export class DomainManager extends EventEmitter {
  private domains: Map<string, DomainTarget>;
  private compiledPatterns: Map<string, RegExp>;
  private db: DatabaseManager;

  // Core methods:
  // - addDomain(config): Add domain to list
  // - removeDomain(id): Remove domain
  // - updateDomain(id, updates): Update domain config
  // - getDomains(listType): Get domains by type
  // - matchDomain(url): Check if URL matches any domain
  // - isAllowed(url): Check allowlist
  // - isBlocked(url): Check blocklist
  // - findTargetInResults(results): Find target domains in search results
  // - compilePattern(domain): Compile regex for matching
}
```

**Action:** Implement domain management with database persistence
**Why:** Central management of all domain lists with efficient matching
**Dependencies:** Step 1.1
**Risk:** Low

---

### Phase 2: Human-Like Behavior Engine

#### Step 2.1: Create Behavior Patterns Library
**File:** `electron/core/automation/domain-targeting/behavior-patterns.ts`

```typescript
// Human behavior pattern library
export class BehaviorPatterns {
  // Mouse movement patterns
  static generateBezierPath(start: Point, end: Point): Point[];
  static generateNaturalMousePath(start: Point, end: Point, complexity: number): Point[];
  
  // Scroll patterns
  static generateScrollPattern(type: ScrollDepth): ScrollStep[];
  static getReadingScrollSpeed(contentLength: number): number;
  
  // Timing patterns
  static getHumanDelay(min: number, max: number): number;  // Gaussian distribution
  static getReadingTime(textLength: number): number;
  static getTypingDelay(): number;
  
  // Randomization helpers
  static shouldPerformAction(probability: number): boolean;
  static selectRandom<T>(items: T[], weights?: number[]): T;
  static addJitter(value: number, jitterPercent: number): number;
}

interface Point { x: number; y: number; }
interface ScrollStep { 
  deltaY: number; 
  duration: number; 
  pauseAfter: number;
}
type ScrollDepth = 'shallow' | 'medium' | 'deep' | 'full';
```

**Action:** Implement human behavior simulation utilities
**Why:** Provides realistic, non-detectable automation patterns
**Dependencies:** None
**Risk:** Medium - requires tuning for realism

#### Step 2.2: Create Click Simulator
**File:** `electron/core/automation/domain-targeting/click-simulator.ts`

```typescript
// Simulates human-like mouse movements and clicks
export class ClickSimulator {
  private view: BrowserView;
  private config: ClickSimulationConfig;
  
  constructor(view: BrowserView, config?: Partial<ClickSimulationConfig>);
  
  // Core methods:
  async clickElement(selector: string): Promise<boolean>;
  async clickAtPosition(x: number, y: number): Promise<boolean>;
  async hoverElement(selector: string, duration?: number): Promise<boolean>;
  async moveToElement(selector: string): Promise<boolean>;
  
  // Internal methods:
  private async getElementBounds(selector: string): Promise<DOMRect | null>;
  private async simulateMouseMove(path: Point[]): Promise<void>;
  private async simulateClick(x: number, y: number): Promise<void>;
  private calculateClickPoint(bounds: DOMRect): Point;
  private generateMousePath(start: Point, end: Point): Point[];
}
```

**Action:** Implement realistic click simulation using `webContents.sendInputEvent`
**Why:** Makes automated clicks indistinguishable from human clicks
**Dependencies:** Step 2.1
**Risk:** Medium - browser detection techniques vary

#### Step 2.3: Create Page Interactor
**File:** `electron/core/automation/domain-targeting/page-interactor.ts`

```typescript
// Handles all page interaction behaviors
export class PageInteractor {
  private view: BrowserView;
  private clickSimulator: ClickSimulator;
  private config: InteractionConfig;
  
  constructor(view: BrowserView, config: InteractionConfig);
  
  // Core interaction methods:
  async interact(): Promise<PageInteractionResult>;
  async scroll(depth: ScrollDepth): Promise<number>;
  async simulateReading(): Promise<void>;
  async clickInternalLinks(maxClicks: number): Promise<number>;
  async hoverRandomElements(count: number): Promise<number>;
  
  // Scroll methods:
  private async scrollToPercent(percent: number): Promise<void>;
  private async smoothScroll(deltaY: number, duration: number): Promise<void>;
  private async scrollWithPauses(pattern: ScrollStep[]): Promise<void>;
  
  // Content analysis:
  private async getPageHeight(): Promise<number>;
  private async getVisibleLinks(): Promise<string[]>;
  private async getHoverableElements(): Promise<string[]>;
  private async estimateReadingTime(): Promise<number>;
}
```

**Action:** Implement comprehensive page interaction system
**Why:** Creates authentic page engagement patterns
**Dependencies:** Steps 2.1, 2.2
**Risk:** Medium

---

### Phase 3: Bounce Rate Control

#### Step 3.1: Create Bounce Controller
**File:** `electron/core/automation/domain-targeting/bounce-controller.ts`

```typescript
// Controls bounce rate and exit behaviors
export class BounceController {
  private config: BounceConfig;
  private visitStats: Map<string, VisitStats>;
  
  constructor(config: BounceConfig);
  
  // Core methods:
  shouldBounce(domainId: string): boolean;
  getBounceTime(): number;
  getBounceAction(): 'back' | 'close' | 'newSearch';
  recordVisit(result: DomainVisitResult): void;
  
  // Statistics:
  getCurrentBounceRate(): number;
  getVisitStats(domainId?: string): VisitStats;
  adjustForTarget(): void;  // Auto-adjust to hit target bounce rate
  
  // Configuration:
  setConfig(config: Partial<BounceConfig>): void;
  getConfig(): BounceConfig;
}

interface VisitStats {
  totalVisits: number;
  bounces: number;
  bounceRate: number;
  avgDwellTime: number;
}
```

**Action:** Implement bounce rate management system
**Why:** Allows control over visit authenticity metrics
**Dependencies:** Step 1.1
**Risk:** Low

---

### Phase 4: Integration & Orchestration

#### Step 4.1: Create Domain Targeting Orchestrator
**File:** `electron/core/automation/domain-targeting/index.ts`

```typescript
// Main orchestrator for domain targeting operations
export class DomainTargetingEngine extends EventEmitter {
  private domainManager: DomainManager;
  private bounceController: BounceController;
  private db: DatabaseManager;
  
  constructor(db: DatabaseManager, config?: DomainTargetingConfig);
  
  // Main workflow:
  async processSearchResults(
    view: BrowserView,
    results: SearchResult[],
    config: SearchConfig
  ): Promise<DomainVisitResult | null>;
  
  // Domain operations:
  async visitTargetDomain(
    view: BrowserView,
    result: SearchResult,
    keyword: string,
    engine: string
  ): Promise<DomainVisitResult>;
  
  // Configuration:
  setDefaultInteractionConfig(config: InteractionConfig): void;
  setBounceConfig(config: BounceConfig): void;
  
  // Domain management (delegated):
  addTargetDomain(domain: string, config?: Partial<DomainTarget>): Promise<DomainTarget>;
  addToAllowlist(domain: string): Promise<DomainTarget>;
  addToBlocklist(domain: string): Promise<DomainTarget>;
  removeDomain(id: string): Promise<boolean>;
  getDomains(listType?: 'allow' | 'block' | 'target'): Promise<DomainTarget[]>;
  
  // Statistics:
  getVisitHistory(domainId?: string): Promise<DomainVisitResult[]>;
  getStatistics(): Promise<DomainTargetingStats>;
}

export interface DomainTargetingConfig {
  defaultInteraction: InteractionConfig;
  defaultBounce: BounceConfig;
  defaultClick: ClickSimulationConfig;
}
```

**Action:** Create main orchestrator that coordinates all components
**Why:** Single entry point for domain targeting functionality
**Dependencies:** Steps 1.2, 2.3, 3.1
**Risk:** Medium - complex coordination

#### Step 4.2: Extend SearchEngineAutomation
**File:** `electron/core/automation/search-engine.ts` (modify existing)

**Changes:**
1. Add method to extract element coordinates for clicking
2. Improve result extraction with more metadata
3. Add support for pagination to find targets beyond page 1

```typescript
// Add to SearchEngineAutomation class:

/**
 * Get clickable element bounds for a search result
 */
async getResultElementBounds(
  view: BrowserView,
  position: number,
  engine: SearchEngine
): Promise<DOMRect | null>;

/**
 * Extract enhanced search results with element positions
 */
async extractEnhancedResults(
  view: BrowserView,
  engine: SearchEngine
): Promise<EnhancedSearchResult[]>;

/**
 * Navigate to next page of results
 */
async goToNextPage(view: BrowserView, engine: SearchEngine): Promise<boolean>;

interface EnhancedSearchResult extends SearchResult {
  elementBounds?: DOMRect;
  isOrganic: boolean;
  isAd: boolean;
  hasRichSnippet: boolean;
}
```

**Action:** Extend existing search engine class
**Why:** Provides necessary data for click simulation
**Dependencies:** None
**Risk:** Low - additive changes

#### Step 4.3: Integrate with TaskExecutor
**File:** `electron/core/automation/executor.ts` (modify existing)

**Changes:**
1. Add DomainTargetingEngine integration
2. Update task execution flow to use new targeting system
3. Add domain visit tracking

```typescript
// Modify TaskExecutor class:

export class TaskExecutor extends EventEmitter {
  private searchEngine: SearchEngineAutomation;
  private domainTargeting: DomainTargetingEngine;  // NEW
  
  constructor(domainTargeting?: DomainTargetingEngine) {
    // ...
    this.domainTargeting = domainTargeting || new DomainTargetingEngine(db);
  }
  
  // Update executeSearchTask to use domain targeting:
  async executeSearchTask(task, config, view): Promise<void> {
    // ... existing search logic ...
    
    if (config.targetDomains?.length > 0 && config.clickThrough) {
      // Use new domain targeting engine instead of basic click
      const visitResult = await this.domainTargeting.processSearchResults(
        view,
        results,
        config
      );
      
      if (visitResult) {
        task.position = visitResult.position;
        task.domainVisit = visitResult;  // Store full visit data
      }
    }
  }
}
```

**Action:** Integrate domain targeting into task execution
**Why:** Enables domain targeting in automation workflows
**Dependencies:** Step 4.1
**Risk:** Medium - modifies core execution flow

#### Step 4.4: Update AutomationManager
**File:** `electron/core/automation/manager.ts` (modify existing)

**Changes:**
1. Add domain targeting configuration
2. Expose domain management methods
3. Add domain visit statistics

```typescript
// Add to AutomationManager class:

private domainTargeting: DomainTargetingEngine;

// New methods:
async addTargetDomain(domain: string, config?: Partial<DomainTarget>): Promise<DomainTarget>;
async addToAllowlist(domain: string): Promise<DomainTarget>;
async addToBlocklist(domain: string): Promise<DomainTarget>;
async removeDomain(id: string): Promise<boolean>;
async getDomains(listType?: 'allow' | 'block' | 'target'): Promise<DomainTarget[]>;
async updateDomain(id: string, updates: Partial<DomainTarget>): Promise<DomainTarget>;

// Configuration:
setDomainTargetingConfig(config: DomainTargetingConfig): void;
getDomainTargetingStats(): Promise<DomainTargetingStats>;
```

**Action:** Expose domain targeting through automation manager
**Why:** Provides clean API for UI and IPC handlers
**Dependencies:** Step 4.1
**Risk:** Low - additive changes

---

### Phase 5: Database Schema Updates

#### Step 5.1: Create Migration for Domain Targeting
**File:** `electron/database/migrations/002_domain_targeting.sql`

```sql
-- Domain targeting enhancements

-- Update target_domains table with new columns
ALTER TABLE target_domains ADD COLUMN match_type TEXT DEFAULT 'contains' 
  CHECK (match_type IN ('exact', 'contains', 'regex', 'wildcard'));
ALTER TABLE target_domains ADD COLUMN list_type TEXT DEFAULT 'target' 
  CHECK (list_type IN ('allow', 'block', 'target'));
ALTER TABLE target_domains ADD COLUMN interaction_config TEXT;  -- JSON

-- Create domain_visits table for tracking
CREATE TABLE IF NOT EXISTS domain_visits (
  id TEXT PRIMARY KEY,
  domain_id TEXT NOT NULL,
  domain TEXT NOT NULL,
  url TEXT NOT NULL,
  position INTEGER,
  search_keyword TEXT,
  search_engine TEXT,
  visit_started DATETIME NOT NULL,
  visit_ended DATETIME,
  dwell_time INTEGER,  -- seconds
  did_bounce INTEGER DEFAULT 0,
  scroll_depth REAL,  -- 0-100
  internal_links_clicked INTEGER DEFAULT 0,
  elements_hovered INTEGER DEFAULT 0,
  interaction_success INTEGER DEFAULT 1,
  error TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (domain_id) REFERENCES target_domains(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_domain_visits_domain ON domain_visits(domain_id);
CREATE INDEX IF NOT EXISTS idx_domain_visits_keyword ON domain_visits(search_keyword);
CREATE INDEX IF NOT EXISTS idx_domain_visits_created ON domain_visits(created_at DESC);

-- Create bounce_stats table for tracking bounce rates
CREATE TABLE IF NOT EXISTS bounce_stats (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  domain_id TEXT,
  total_visits INTEGER DEFAULT 0,
  bounces INTEGER DEFAULT 0,
  bounce_rate REAL DEFAULT 0,
  avg_dwell_time REAL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(date, domain_id)
);

CREATE INDEX IF NOT EXISTS idx_bounce_stats_date ON bounce_stats(date DESC);
```

**Action:** Create database migration for domain targeting data
**Why:** Persists domain configurations and visit history
**Dependencies:** None
**Risk:** Low

#### Step 5.2: Create Domain Repository
**File:** `electron/database/repositories/domain-targeting.repository.ts`

```typescript
// Repository for domain targeting data access
export class DomainTargetingRepository {
  constructor(private db: DatabaseManager);
  
  // Domain CRUD:
  async createDomain(domain: DomainTarget): Promise<DomainTarget>;
  async getDomain(id: string): Promise<DomainTarget | null>;
  async getDomainByName(domain: string): Promise<DomainTarget | null>;
  async getDomains(listType?: string): Promise<DomainTarget[]>;
  async updateDomain(id: string, updates: Partial<DomainTarget>): Promise<DomainTarget>;
  async deleteDomain(id: string): Promise<boolean>;
  
  // Visit tracking:
  async recordVisit(visit: DomainVisitResult): Promise<void>;
  async getVisits(domainId?: string, limit?: number): Promise<DomainVisitResult[]>;
  async getVisitStats(domainId?: string): Promise<VisitStats>;
  
  // Bounce tracking:
  async updateBounceStats(domainId: string | null): Promise<void>;
  async getBounceStats(domainId?: string): Promise<BounceStats>;
}
```

**Action:** Implement data access layer for domain targeting
**Why:** Clean separation of database operations
**Dependencies:** Step 5.1
**Risk:** Low

---

### Phase 6: IPC Handlers & UI Integration

#### Step 6.1: Create Domain Targeting IPC Handlers
**File:** `electron/ipc/handlers/domain-targeting.ts`

```typescript
// IPC handlers for domain targeting
export function setupDomainTargetingHandlers(automationManager: AutomationManager) {
  // Domain management
  ipcMain.handle('domain:add-target', async (_e, domain, config) => {...});
  ipcMain.handle('domain:add-allowlist', async (_e, domain) => {...});
  ipcMain.handle('domain:add-blocklist', async (_e, domain) => {...});
  ipcMain.handle('domain:remove', async (_e, id) => {...});
  ipcMain.handle('domain:update', async (_e, id, updates) => {...});
  ipcMain.handle('domain:get-all', async (_e, listType?) => {...});
  ipcMain.handle('domain:get-by-id', async (_e, id) => {...});
  
  // Bulk operations
  ipcMain.handle('domain:import', async (_e, domains) => {...});
  ipcMain.handle('domain:export', async (_e, listType?) => {...});
  
  // Configuration
  ipcMain.handle('domain:set-config', async (_e, config) => {...});
  ipcMain.handle('domain:get-config', async () => {...});
  
  // Statistics
  ipcMain.handle('domain:get-stats', async (_e, domainId?) => {...});
  ipcMain.handle('domain:get-visits', async (_e, domainId?, limit?) => {...});
}
```

**Action:** Create IPC handlers for renderer communication
**Why:** Enables UI to interact with domain targeting system
**Dependencies:** Step 4.4
**Risk:** Low

#### Step 6.2: Update IPC Channels
**File:** `electron/ipc/channels.ts` (modify existing)

```typescript
// Add domain targeting channels
export const IPC_CHANNELS = {
  // ... existing channels ...
  
  // Domain Targeting
  DOMAIN_ADD_TARGET: 'domain:add-target',
  DOMAIN_ADD_ALLOWLIST: 'domain:add-allowlist',
  DOMAIN_ADD_BLOCKLIST: 'domain:add-blocklist',
  DOMAIN_REMOVE: 'domain:remove',
  DOMAIN_UPDATE: 'domain:update',
  DOMAIN_GET_ALL: 'domain:get-all',
  DOMAIN_GET_BY_ID: 'domain:get-by-id',
  DOMAIN_IMPORT: 'domain:import',
  DOMAIN_EXPORT: 'domain:export',
  DOMAIN_SET_CONFIG: 'domain:set-config',
  DOMAIN_GET_CONFIG: 'domain:get-config',
  DOMAIN_GET_STATS: 'domain:get-stats',
  DOMAIN_GET_VISITS: 'domain:get-visits',
} as const;
```

**Action:** Add IPC channel constants
**Why:** Type-safe channel references
**Dependencies:** None
**Risk:** Low

#### Step 6.3: Update Preload Script
**File:** `electron/main/preload.ts` (modify existing)

```typescript
// Add domain targeting API to contextBridge
domainTargeting: {
  addTarget: (domain: string, config?: Partial<DomainTarget>) => 
    ipcRenderer.invoke('domain:add-target', domain, config),
  addToAllowlist: (domain: string) => 
    ipcRenderer.invoke('domain:add-allowlist', domain),
  addToBlocklist: (domain: string) => 
    ipcRenderer.invoke('domain:add-blocklist', domain),
  remove: (id: string) => 
    ipcRenderer.invoke('domain:remove', id),
  update: (id: string, updates: Partial<DomainTarget>) => 
    ipcRenderer.invoke('domain:update', id, updates),
  getAll: (listType?: string) => 
    ipcRenderer.invoke('domain:get-all', listType),
  getById: (id: string) => 
    ipcRenderer.invoke('domain:get-by-id', id),
  import: (domains: string[]) => 
    ipcRenderer.invoke('domain:import', domains),
  export: (listType?: string) => 
    ipcRenderer.invoke('domain:export', listType),
  setConfig: (config: DomainTargetingConfig) => 
    ipcRenderer.invoke('domain:set-config', config),
  getConfig: () => 
    ipcRenderer.invoke('domain:get-config'),
  getStats: (domainId?: string) => 
    ipcRenderer.invoke('domain:get-stats', domainId),
  getVisits: (domainId?: string, limit?: number) => 
    ipcRenderer.invoke('domain:get-visits', domainId, limit),
}
```

**Action:** Expose domain targeting API to renderer
**Why:** Enables React components to use domain targeting
**Dependencies:** Step 6.1
**Risk:** Low

---

### Phase 7: Frontend Components

#### Step 7.1: Create Domain Targeting Store
**File:** `src/stores/domainTargetingStore.ts`

```typescript
// Zustand store for domain targeting state
interface DomainTargetingState {
  domains: DomainTarget[];
  targetDomains: DomainTarget[];
  allowlist: DomainTarget[];
  blocklist: DomainTarget[];
  config: DomainTargetingConfig;
  stats: DomainTargetingStats | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchDomains: () => Promise<void>;
  addTarget: (domain: string, config?: Partial<DomainTarget>) => Promise<void>;
  addToAllowlist: (domain: string) => Promise<void>;
  addToBlocklist: (domain: string) => Promise<void>;
  removeDomain: (id: string) => Promise<void>;
  updateDomain: (id: string, updates: Partial<DomainTarget>) => Promise<void>;
  importDomains: (domains: string[], listType: string) => Promise<void>;
  setConfig: (config: Partial<DomainTargetingConfig>) => Promise<void>;
  fetchStats: () => Promise<void>;
}

export const useDomainTargetingStore = create<DomainTargetingState>(...);
```

**Action:** Create Zustand store for domain targeting state
**Why:** Centralized state management for UI components
**Dependencies:** Step 6.3
**Risk:** Low

#### Step 7.2: Create Domain Panel Component
**File:** `src/components/panels/DomainPanel.tsx`

```tsx
// Domain targeting panel UI
export function DomainPanel() {
  // Tabs: Target Domains | Allowlist | Blocklist | Settings | Analytics
  
  return (
    <div className="domain-panel">
      <Tabs>
        <TabList>
          <Tab>Target Domains</Tab>
          <Tab>Allowlist</Tab>
          <Tab>Blocklist</Tab>
          <Tab>Settings</Tab>
          <Tab>Analytics</Tab>
        </TabList>
        
        <TabPanels>
          <TabPanel><DomainList listType="target" /></TabPanel>
          <TabPanel><DomainList listType="allow" /></TabPanel>
          <TabPanel><DomainList listType="block" /></TabPanel>
          <TabPanel><DomainSettings /></TabPanel>
          <TabPanel><DomainAnalytics /></TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  );
}
```

**Action:** Create domain management UI panel
**Why:** User interface for domain targeting configuration
**Dependencies:** Step 7.1
**Risk:** Low

---

## File Structure Summary

### New Files to Create

```
electron/core/automation/domain-targeting/
├── index.ts                    # Module exports & DomainTargetingEngine
├── types.ts                    # Type definitions
├── domain-manager.ts           # Domain list management
├── click-simulator.ts          # Human-like click simulation
├── page-interactor.ts          # Page interaction behaviors
├── behavior-patterns.ts        # Human behavior patterns library
└── bounce-controller.ts        # Bounce rate control

electron/database/
├── migrations/
│   └── 002_domain_targeting.sql    # Database migration
└── repositories/
    └── domain-targeting.repository.ts  # Data access layer

electron/ipc/handlers/
└── domain-targeting.ts         # IPC handlers

src/stores/
└── domainTargetingStore.ts     # Zustand store

src/components/panels/
└── DomainPanel.tsx             # UI component (with sub-components)
```

### Files to Modify

```
electron/core/automation/
├── search-engine.ts            # Add enhanced result extraction
├── executor.ts                 # Integrate domain targeting
├── manager.ts                  # Expose domain targeting API
└── types.ts                    # Extend type definitions

electron/ipc/
├── channels.ts                 # Add IPC channels
└── handlers/index.ts           # Register new handlers

electron/main/
├── index.ts                    # Initialize domain targeting
└── preload.ts                  # Expose API to renderer
```

---

## Testing Strategy

### Unit Tests

**File:** `tests/unit/domain-targeting.test.ts`

| Test ID | Description | Component |
|---------|-------------|-----------|
| DT-UT-001 | Domain pattern matching (exact) | DomainManager |
| DT-UT-002 | Domain pattern matching (contains) | DomainManager |
| DT-UT-003 | Domain pattern matching (regex) | DomainManager |
| DT-UT-004 | Domain pattern matching (wildcard) | DomainManager |
| DT-UT-005 | Allowlist filtering | DomainManager |
| DT-UT-006 | Blocklist filtering | DomainManager |
| DT-UT-007 | Bezier path generation | BehaviorPatterns |
| DT-UT-008 | Gaussian delay distribution | BehaviorPatterns |
| DT-UT-009 | Scroll pattern generation | BehaviorPatterns |
| DT-UT-010 | Bounce rate calculation | BounceController |
| DT-UT-011 | Bounce decision making | BounceController |
| DT-UT-012 | Target bounce rate adjustment | BounceController |

### Integration Tests

**File:** `tests/integration/domain-targeting.test.ts`

| Test ID | Description | Components |
|---------|-------------|------------|
| DT-IT-001 | Find target in search results | DomainManager + SearchEngine |
| DT-IT-002 | Click target domain | ClickSimulator + TabManager |
| DT-IT-003 | Page interaction flow | PageInteractor + TabManager |
| DT-IT-004 | Bounce behavior | BounceController + PageInteractor |
| DT-IT-005 | Full visit workflow | DomainTargetingEngine |
| DT-IT-006 | Database persistence | Repository + SQLite |
| DT-IT-007 | IPC communication | Handlers + Manager |

### E2E Tests

**File:** `tests/e2e/domain-targeting.spec.ts`

| Test ID | Description | Steps |
|---------|-------------|-------|
| DT-E2E-001 | Add target domain via UI | Open panel → Add domain → Verify in list |
| DT-E2E-002 | Bulk import domains | Import file → Verify count → Check list |
| DT-E2E-003 | Configure interaction | Open settings → Adjust → Save → Verify |
| DT-E2E-004 | Run search with targeting | Add keywords → Enable targeting → Run → Verify visit |
| DT-E2E-005 | Verify human-like behavior | Record clicks → Analyze patterns → Verify randomness |

---

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Bot detection by search engines | High | High | Multiple behavior patterns, randomization, rate limiting |
| Performance impact from mouse simulation | Medium | Medium | Optimize path calculation, use requestAnimationFrame |
| Memory leaks in long-running sessions | Medium | High | Proper cleanup, periodic garbage collection |
| Database growth from visit history | Low | Medium | Implement data retention policies, archival |
| Cross-platform input event differences | Medium | Medium | Platform-specific testing, fallback methods |

---

## Success Criteria

- [ ] Domain allowlist/blocklist correctly filters URLs
- [ ] Target domains found in search results with >95% accuracy
- [ ] Click simulation passes bot detection on major search engines
- [ ] Page interaction patterns appear human-like (validated manually)
- [ ] Bounce rate stays within 5% of configured target
- [ ] Dwell time variance follows natural distribution
- [ ] All unit tests pass with >80% coverage
- [ ] E2E tests pass on Windows, macOS, Linux
- [ ] UI is responsive and intuitive
- [ ] No memory leaks after 100+ domain visits

---

## Implementation Order

1. **Week 1:** Types (1.1) → Domain Manager (1.2) → Behavior Patterns (2.1)
2. **Week 2:** Click Simulator (2.2) → Page Interactor (2.3) → Bounce Controller (3.1)
3. **Week 3:** Domain Targeting Engine (4.1) → Extend SearchEngine (4.2) → Integrate Executor (4.3)
4. **Week 4:** Database Migration (5.1) → Repository (5.2) → IPC Handlers (6.1-6.3)
5. **Week 5:** Frontend Store (7.1) → UI Components (7.2) → Testing & Refinement

---

## Dependencies

### External Libraries (already in project)
- Electron (BrowserView, webContents.sendInputEvent)
- better-sqlite3 (database)
- Zustand (state management)

### No Additional Dependencies Required
The implementation uses native Electron APIs for input simulation, avoiding the need for Playwright or Puppeteer as mentioned in the original request. This approach provides:
- Tighter integration with existing TabManager
- Lower memory footprint
- No additional process overhead
- Direct access to BrowserView APIs

---

**Document Version:** 1.0
**Created:** Implementation Planning Phase
**Status:** Ready for Implementation


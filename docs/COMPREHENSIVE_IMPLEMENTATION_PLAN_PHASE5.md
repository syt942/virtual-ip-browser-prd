# Implementation Plan: Virtual IP Browser - Phase 5 Completion

## Document Information

| Field | Value |
|-------|-------|
| **Version** | 1.0.0 |
| **Date** | 2026-01-27 |
| **Status** | Active Development |
| **Phase** | Phase 5 - Polish & Release |
| **Target Coverage** | 80%+ |

---

## Executive Summary

This implementation plan covers the remaining components needed to complete Virtual IP Browser v1.0.0. Based on analysis of the current codebase, Phase 4 (Automation Engine) is complete with KeywordQueue, ResourceMonitor, SelfHealingEngine, PositionTracker, and CreatorSupportStats all implemented with 80%+ coverage.

### Current Implementation Status

| Component | Status | Coverage | Notes |
|-----------|--------|----------|-------|
| **Proxy Engine** | ✅ Complete | 85%+ | All 10 rotation strategies implemented |
| **Privacy Suite** | ✅ Complete | 82%+ | WebRTC, fingerprint spoofing, tracker blocking |
| **Tab Manager** | ✅ Complete | 80%+ | Session isolation, BrowserView integration |
| **Session Manager** | ✅ Complete | 83%+ | Save/restore with URL validation |
| **Automation Engine** | ✅ Complete | 85%+ | Search, domain targeting, scheduling |
| **Creator Support** | ✅ Complete | 81%+ | Platform detection, ad viewing |
| **Database Layer** | ✅ Complete | 88%+ | Repositories, migrations, encryption |
| **UI Components** | 🔶 Partial | 60% | Basic structure, needs IPC integration |
| **IPC Handlers** | 🔶 Partial | 70% | Core handlers exist, need completion |
| **Integration Tests** | 🔶 Partial | 65% | Need comprehensive E2E coverage |

### Remaining Work

1. **UI Component Enhancement** - Connect existing UI to backend via IPC
2. **IPC Handler Completion** - Add missing proxy and tab handlers
3. **Integration Testing** - Comprehensive E2E test suite
4. **Performance Optimization** - Meet all NFR targets
5. **Documentation** - User guide and API documentation

---

## Phase 5 Implementation Plan

### Overview

```
Week 19: UI Integration & IPC Completion
Week 20: Integration Testing & Bug Fixes  
Week 21: Performance Optimization & Security Hardening
Week 22: Documentation & Release
```

---

## Section 1: IPC Handler Completion

### 1.1 Missing IPC Handlers

Based on PRD API specifications (Section 8), the following handlers need implementation:

#### Priority P0 - Must Have

| Handler | File | Status | Priority |
|---------|------|--------|----------|
| `proxy:add` | `electron/ipc/handlers/proxy.ts` | ❌ Missing | P0 |
| `proxy:list` | `electron/ipc/handlers/proxy.ts` | ❌ Missing | P0 |
| `proxy:validate` | `electron/ipc/handlers/proxy.ts` | ❌ Missing | P0 |
| `proxy:delete` | `electron/ipc/handlers/proxy.ts` | ❌ Missing | P0 |
| `proxy:setRotationStrategy` | `electron/ipc/handlers/proxy.ts` | ❌ Missing | P0 |
| `tab:create` | `electron/ipc/handlers/tabs.ts` | ❌ Missing | P0 |
| `tab:close` | `electron/ipc/handlers/tabs.ts` | ❌ Missing | P0 |
| `tab:navigate` | `electron/ipc/handlers/tabs.ts` | ❌ Missing | P0 |
| `tab:assignProxy` | `electron/ipc/handlers/tabs.ts` | ❌ Missing | P0 |

#### Priority P1 - Should Have

| Handler | File | Status | Priority |
|---------|------|--------|----------|
| `proxy:bulkImport` | `electron/ipc/handlers/proxy.ts` | ❌ Missing | P1 |
| `proxy:validateAll` | `electron/ipc/handlers/proxy.ts` | ❌ Missing | P1 |
| `tab:update` | `electron/ipc/handlers/tabs.ts` | ❌ Missing | P1 |
| `tab:getAll` | `electron/ipc/handlers/tabs.ts` | ❌ Missing | P1 |
| `session:save` | `electron/ipc/handlers/session.ts` | ❌ Missing | P1 |
| `session:restore` | `electron/ipc/handlers/session.ts` | ❌ Missing | P1 |

### 1.2 Proxy IPC Handler Implementation

**File:** `electron/ipc/handlers/proxy.ts`

```typescript
// Implementation Specification

/**
 * proxy:add - Add a new proxy to the system
 * 
 * Request Schema (Zod):
 * {
 *   name: z.string().max(100),
 *   host: z.string().min(1).max(255),
 *   port: z.number().int().min(1).max(65535),
 *   protocol: z.enum(['http', 'https', 'socks4', 'socks5']),
 *   username: z.string().max(100).optional(),
 *   password: z.string().max(100).optional()
 * }
 * 
 * Response:
 * { success: boolean, proxy?: Proxy, error?: string }
 * 
 * Implementation Steps:
 * 1. Validate input using Zod schema
 * 2. Check max proxy limit (DEFAULT_MAX_PROXIES = 500)
 * 3. Call ProxyManager.addProxy()
 * 4. Auto-validate if autoValidate enabled
 * 5. Store in database via ProxyRepository
 * 6. Return sanitized proxy (no credentials)
 */

/**
 * proxy:list - Get all proxies
 * 
 * Response:
 * { proxies: SafeProxyConfig[], total: number }
 * 
 * Implementation Steps:
 * 1. Call ProxyManager.getAllProxies()
 * 2. Map to SafeProxyConfig (strip credentials)
 * 3. Return with count
 */

/**
 * proxy:validate - Validate proxy connectivity
 * 
 * Request: { proxyIds: string[] }
 * Response: { results: ValidationResult[] }
 * 
 * Implementation Steps:
 * 1. Validate UUID format for each proxyId
 * 2. Call ProxyManager.validateProxy() for each
 * 3. Update status in database
 * 4. Return results with latency/error info
 */

/**
 * proxy:setRotationStrategy - Configure rotation
 * 
 * Request: { strategy: RotationStrategy, params?: object }
 * Response: { success: boolean }
 * 
 * Implementation Steps:
 * 1. Validate strategy is valid enum value
 * 2. Call ProxyManager.setRotationStrategy()
 * 3. Persist to RotationConfigRepository
 * 4. Emit 'rotation:changed' event
 */
```

**Test Cases (TDD):**

```typescript
// tests/unit/ipc/proxy-handlers.test.ts

describe('Proxy IPC Handlers', () => {
  describe('proxy:add', () => {
    it('should add valid proxy and return sanitized config', async () => {
      const input = {
        name: 'Test Proxy',
        host: '192.168.1.100',
        port: 8080,
        protocol: 'http'
      };
      const result = await invokeHandler('proxy:add', input);
      expect(result.success).toBe(true);
      expect(result.proxy).toBeDefined();
      expect(result.proxy.hasCredentials).toBe(false);
    });

    it('should reject invalid port', async () => {
      const input = { host: '192.168.1.100', port: 70000, protocol: 'http' };
      const result = await invokeHandler('proxy:add', input);
      expect(result.success).toBe(false);
      expect(result.error).toContain('port');
    });

    it('should reject SSRF attempts (localhost)', async () => {
      const input = { host: '127.0.0.1', port: 8080, protocol: 'http' };
      const result = await invokeHandler('proxy:add', input);
      expect(result.success).toBe(false);
      expect(result.error).toContain('SSRF');
    });

    it('should encrypt credentials before storage', async () => {
      const input = {
        host: '192.168.1.100',
        port: 8080,
        protocol: 'http',
        username: 'user',
        password: 'secret'
      };
      const result = await invokeHandler('proxy:add', input);
      expect(result.proxy.password).toBeUndefined();
      expect(result.proxy.hasCredentials).toBe(true);
    });

    it('should enforce max proxy limit', async () => {
      // Add 500 proxies
      for (let i = 0; i < 500; i++) {
        await invokeHandler('proxy:add', { host: `192.168.1.${i % 255}`, port: 8080 + i, protocol: 'http' });
      }
      const result = await invokeHandler('proxy:add', { host: '10.0.0.1', port: 9999, protocol: 'http' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('limit');
    });
  });

  describe('proxy:validate', () => {
    it('should validate proxy and update status', async () => {
      // Setup mock proxy
      const proxy = await addTestProxy();
      const result = await invokeHandler('proxy:validate', { proxyIds: [proxy.id] });
      expect(result.results[0].proxyId).toBe(proxy.id);
      expect(['active', 'failed']).toContain(result.results[0].status);
    });

    it('should measure latency for active proxies', async () => {
      const proxy = await addTestProxy({ host: 'fast-proxy.test' });
      mockProxyConnection(proxy.id, { latency: 45 });
      const result = await invokeHandler('proxy:validate', { proxyIds: [proxy.id] });
      expect(result.results[0].latency).toBe(45);
    });

    it('should handle timeout gracefully', async () => {
      const proxy = await addTestProxy();
      mockProxyConnection(proxy.id, { timeout: true });
      const result = await invokeHandler('proxy:validate', { proxyIds: [proxy.id] });
      expect(result.results[0].status).toBe('failed');
      expect(result.results[0].error).toContain('timeout');
    });
  });

  describe('proxy:setRotationStrategy', () => {
    it('should change rotation strategy', async () => {
      const result = await invokeHandler('proxy:setRotationStrategy', { strategy: 'random' });
      expect(result.success).toBe(true);
    });

    it('should reject invalid strategy', async () => {
      const result = await invokeHandler('proxy:setRotationStrategy', { strategy: 'invalid' });
      expect(result.success).toBe(false);
    });

    it('should persist strategy to database', async () => {
      await invokeHandler('proxy:setRotationStrategy', { strategy: 'least-used' });
      const config = await getRotationConfig();
      expect(config.strategy).toBe('least-used');
    });
  });
});
```

### 1.3 Tab IPC Handler Implementation

**File:** `electron/ipc/handlers/tabs.ts`

```typescript
// Implementation Specification

/**
 * tab:create - Create new isolated tab
 * 
 * Request Schema:
 * {
 *   url: SafeUrlSchema.optional(),
 *   proxyId: z.string().uuid().optional(),
 *   fingerprintSeed: z.string().optional()
 * }
 * 
 * Response:
 * { success: boolean, tab?: Tab, error?: string }
 * 
 * Implementation Steps:
 * 1. Validate URL is safe (no javascript:, file:, etc.)
 * 2. Check tab limit (MAX_TABS = 50)
 * 3. Generate unique session partition
 * 4. Create BrowserView with isolation
 * 5. Apply proxy if specified
 * 6. Apply fingerprint protection
 * 7. Set up navigation handlers
 * 8. Return tab metadata
 */

/**
 * tab:close - Close a tab
 * 
 * Request: { tabId: z.string().uuid() }
 * Response: { success: boolean }
 * 
 * Implementation Steps:
 * 1. Validate tabId exists
 * 2. Remove BrowserView from window
 * 3. Destroy webContents
 * 4. Clear session data for partition
 * 5. Release memory
 * 6. Update active tab if needed
 */

/**
 * tab:navigate - Navigate tab to URL
 * 
 * Request: { tabId: string, url: SafeUrl }
 * Response: { success: boolean }
 * 
 * Implementation Steps:
 * 1. Validate URL safety
 * 2. Get BrowserView for tab
 * 3. Call webContents.loadURL()
 * 4. Emit navigation events
 */

/**
 * tab:assignProxy - Assign proxy to tab
 * 
 * Request: { tabId: string, proxyId: string | null }
 * Response: { success: boolean }
 * 
 * Implementation Steps:
 * 1. Get tab's session
 * 2. If proxyId is null, clear proxy
 * 3. Otherwise, get proxy config
 * 4. Apply via session.setProxy()
 * 5. Optionally reload page
 */
```

**Test Cases (TDD):**

```typescript
// tests/unit/ipc/tab-handlers.test.ts

describe('Tab IPC Handlers', () => {
  describe('tab:create', () => {
    it('should create isolated tab with unique partition', async () => {
      const result = await invokeHandler('tab:create', {});
      expect(result.success).toBe(true);
      expect(result.tab.id).toBeDefined();
      expect(result.tab.partition).toMatch(/^persist:tab-/);
    });

    it('should reject dangerous URLs', async () => {
      const dangerousUrls = [
        'javascript:alert(1)',
        'file:///etc/passwd',
        'data:text/html,<script>alert(1)</script>'
      ];
      for (const url of dangerousUrls) {
        const result = await invokeHandler('tab:create', { url });
        expect(result.success).toBe(false);
      }
    });

    it('should enforce max tab limit', async () => {
      // Create 50 tabs
      for (let i = 0; i < 50; i++) {
        await invokeHandler('tab:create', {});
      }
      const result = await invokeHandler('tab:create', {});
      expect(result.success).toBe(false);
      expect(result.error).toContain('limit');
    });

    it('should apply proxy when specified', async () => {
      const proxy = await addTestProxy();
      const result = await invokeHandler('tab:create', { proxyId: proxy.id });
      expect(result.tab.proxyId).toBe(proxy.id);
    });

    it('should apply fingerprint protection', async () => {
      const result = await invokeHandler('tab:create', {});
      // Verify fingerprint seed was generated
      expect(result.tab.fingerprintSeed).toBeDefined();
    });
  });

  describe('tab:close', () => {
    it('should close tab and release resources', async () => {
      const tab = await createTestTab();
      const result = await invokeHandler('tab:close', { tabId: tab.id });
      expect(result.success).toBe(true);
      // Verify BrowserView destroyed
      expect(getTabView(tab.id)).toBeNull();
    });

    it('should switch active tab when closing active', async () => {
      const tab1 = await createTestTab();
      const tab2 = await createTestTab();
      setActiveTab(tab2.id);
      await invokeHandler('tab:close', { tabId: tab2.id });
      expect(getActiveTabId()).toBe(tab1.id);
    });

    it('should clear session data on close', async () => {
      const tab = await createTestTab();
      // Add some session data
      await setTabCookie(tab.id, 'test', 'value');
      await invokeHandler('tab:close', { tabId: tab.id });
      // Verify session cleared
      expect(await getTabCookies(tab.id)).toEqual([]);
    });
  });

  describe('tab:assignProxy', () => {
    it('should assign proxy to existing tab', async () => {
      const tab = await createTestTab();
      const proxy = await addTestProxy();
      const result = await invokeHandler('tab:assignProxy', { 
        tabId: tab.id, 
        proxyId: proxy.id 
      });
      expect(result.success).toBe(true);
    });

    it('should clear proxy when proxyId is null', async () => {
      const tab = await createTestTab({ proxyId: 'some-proxy' });
      const result = await invokeHandler('tab:assignProxy', { 
        tabId: tab.id, 
        proxyId: null 
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid proxy ID', async () => {
      const tab = await createTestTab();
      const result = await invokeHandler('tab:assignProxy', { 
        tabId: tab.id, 
        proxyId: 'non-existent-id' 
      });
      expect(result.success).toBe(false);
    });
  });
});
```

---

## Section 2: UI Component Enhancement

### 2.1 Overview

The UI components exist but are currently using mock data. They need to be connected to the Zustand stores and IPC handlers.

| Component | Current State | Target State | Priority |
|-----------|---------------|--------------|----------|
| `TabBar` | Static mock tab | Dynamic from tabStore | P0 |
| `AddressBar` | Static, no navigation | Full navigation + proxy status | P0 |
| `ProxyPanel` | Mock proxies | Full CRUD with modals | P0 |
| `PrivacyPanel` | Connected to store | Complete (minor enhancements) | P1 |
| `AutomationPanel` | Partial | Full search/domain UI | P1 |

### 2.2 TabBar Enhancement

**File:** `src/components/browser/TabBar.tsx`

**Changes Required:**
1. Connect to `useTabStore` for dynamic tabs
2. Implement tab selection via `setActiveTab`
3. Implement tab close via `removeTab`
4. Implement new tab via `addTab`
5. Add loading spinner for tabs with `isLoading: true`
6. Add proxy indicator dot for tabs with `proxyId`
7. Enforce 50-tab limit on new tab button

**Test Cases (17 tests):**

```typescript
// tests/unit/ui/TabBar.test.tsx

describe('TabBar Component', () => {
  // Rendering Tests
  it('should render all tabs from store');
  it('should render empty state when no tabs');
  it('should highlight active tab with different background');
  it('should show loading spinner for loading tabs');
  it('should show proxy indicator for tabs with proxy');
  it('should truncate long tab titles');

  // Interaction Tests
  it('should call setActiveTab when clicking inactive tab');
  it('should call removeTab when clicking close button');
  it('should stop propagation on close click');
  it('should call addTab when clicking new tab button');
  
  // Limit Tests
  it('should disable new tab button at 50 tabs');
  it('should show tooltip on disabled new tab button');

  // Keyboard Navigation
  it('should support keyboard tab selection');
  it('should have proper aria-selected attributes');
  it('should have role="tablist" on container');

  // Edge Cases
  it('should handle rapid tab creation');
  it('should switch to adjacent tab when closing active');
});
```

### 2.3 AddressBar Enhancement

**File:** `src/components/browser/AddressBar.tsx`

**Changes Required:**
1. Connect to `useTabStore` for active tab URL
2. Implement back/forward navigation via IPC
3. Implement reload functionality
4. URL input with validation and navigation
5. Dynamic proxy status from active tab
6. Security indicator based on URL scheme

**Test Cases (15 tests):**

```typescript
// tests/unit/ui/AddressBar.test.tsx

describe('AddressBar Component', () => {
  // Navigation Button Tests
  it('should disable back button when canGoBack is false');
  it('should disable forward button when canGoForward is false');
  it('should call navigation.back on back button click');
  it('should call navigation.forward on forward button click');
  it('should call navigation.reload on reload button click');
  it('should show stop icon when tab is loading');

  // URL Input Tests
  it('should display current tab URL');
  it('should allow URL editing');
  it('should navigate on Enter key');
  it('should validate URL before navigation');
  it('should add https:// to URLs without protocol');

  // Security Indicator Tests
  it('should show lock icon for https URLs');
  it('should show warning icon for http URLs');
  
  // Proxy Status Tests
  it('should show green indicator when proxy active');
  it('should show proxy name in status');
});
```

### 2.4 ProxyPanel Enhancement

**File:** `src/components/panels/ProxyPanel.tsx`

**Changes Required:**
1. Connect to `useProxyStore` for proxy list
2. Implement AddProxyModal with form validation
3. Implement ImportProxiesModal for bulk import
4. Add validate/delete actions per proxy
5. Rotation strategy dropdown connected to store
6. Real-time stats in footer

**New Files to Create:**
- `src/components/panels/modals/AddProxyModal.tsx`
- `src/components/panels/modals/ImportProxiesModal.tsx`

**Test Cases (22 tests):**

```typescript
// tests/unit/ui/ProxyPanel.test.tsx

describe('ProxyPanel Component', () => {
  // Proxy List Tests
  it('should render all proxies from store');
  it('should show empty state when no proxies');
  it('should show loading spinner during load');
  it('should display proxy status icons correctly');
  it('should show latency for active proxies');
  it('should show error for failed proxies');

  // Add Proxy Modal Tests
  it('should open AddProxyModal on Add button click');
  it('should validate required fields');
  it('should validate port range 1-65535');
  it('should call addProxy on valid submit');
  it('should close modal on cancel');
  it('should show validation errors inline');

  // Import Modal Tests
  it('should open ImportProxiesModal on Import click');
  it('should parse host:port format');
  it('should parse host:port:user:pass format');
  it('should show preview of parsed proxies');
  it('should highlight invalid entries');

  // Actions Tests
  it('should call validateProxy on validate click');
  it('should call removeProxy on delete click');
  it('should show confirmation before delete');

  // Rotation Strategy Tests
  it('should display current rotation strategy');
  it('should call setRotationStrategy on change');
});
```

### 2.5 AddProxyModal Specification

**File:** `src/components/panels/modals/AddProxyModal.tsx`

```typescript
interface AddProxyModalProps {
  onClose: () => void;
  onAdd: (proxy: ProxyInput) => Promise<void>;
}

// Form Fields:
// - name: string (optional, max 100 chars)
// - host: string (required, max 255 chars)
// - port: number (required, 1-65535)
// - protocol: enum (http, https, socks4, socks5)
// - username: string (optional, max 100 chars)
// - password: string (optional, max 100 chars)

// Validation:
// - Zod schema validation
// - Real-time field validation
// - SSRF prevention (block localhost, private IPs) - server-side

// UI Elements:
// - Modal overlay with backdrop
// - Form with labeled inputs
// - Protocol dropdown
// - Collapsible authentication section
// - Cancel and Save buttons
// - Loading state during submission
// - Error display for failed submission
```

---

## Section 3: Integration Testing Strategy

### 3.1 E2E Test Coverage Matrix

| Test Suite | Tests | Priority | Status |
|------------|-------|----------|--------|
| Navigation | 12 | P0 | ✅ Exists |
| Proxy Management | 15 | P0 | 🔶 Partial |
| Privacy Protection | 18 | P0 | ✅ Exists |
| Tab Management | 14 | P0 | 🔶 Partial |
| Search Automation | 12 | P1 | ✅ Exists |
| Domain Targeting | 10 | P1 | 🔶 Partial |
| Creator Support | 10 | P1 | ✅ Exists |
| Session Management | 8 | P1 | ❌ Missing |
| Performance | 15 | P1 | ✅ Exists |
| Security | 12 | P0 | ✅ Exists |

### 3.2 Missing E2E Tests

#### Session Management Tests

```typescript
// tests/e2e/session-management.spec.ts

import { test, expect } from '@playwright/test';
import { NavigationPage } from './pages/NavigationPage';

test.describe('Session Management', () => {
  test('should save session with all tabs', async ({ page }) => {
    const nav = new NavigationPage(page);
    await nav.goto();
    
    // Create multiple tabs
    await nav.createTab('https://example.com');
    await nav.createTab('https://test.com');
    
    // Save session
    await nav.openSessionMenu();
    await nav.saveSession('Test Session');
    
    // Verify session saved
    await expect(nav.getSessionList()).toContainText('Test Session');
  });

  test('should restore session with correct URLs', async ({ page }) => {
    const nav = new NavigationPage(page);
    await nav.goto();
    
    // Restore previous session
    await nav.openSessionMenu();
    await nav.restoreSession('Test Session');
    
    // Verify tabs restored
    const tabs = await nav.getTabs();
    expect(tabs.length).toBe(2);
    expect(tabs[0].url).toContain('example.com');
    expect(tabs[1].url).toContain('test.com');
  });

  test('should preserve proxy assignments on restore', async ({ page }) => {
    const nav = new NavigationPage(page);
    await nav.goto();
    
    // Create tab with proxy
    await nav.createTabWithProxy('https://example.com', 'US Proxy 1');
    await nav.saveSession('Proxy Session');
    
    // Close and restore
    await nav.closeAllTabs();
    await nav.restoreSession('Proxy Session');
    
    // Verify proxy preserved
    const tab = await nav.getActiveTab();
    expect(tab.proxyId).toBeDefined();
  });

  test('should validate URLs on restore (security)', async ({ page }) => {
    const nav = new NavigationPage(page);
    await nav.goto();
    
    // Attempt to restore session with malicious URL
    // (simulated by modifying stored session)
    const result = await nav.restoreSessionWithUrl('javascript:alert(1)');
    
    // Should filter out dangerous URL
    expect(result.filteredUrls).toContain('javascript:alert(1)');
  });

  test('should handle session with closed tabs gracefully', async ({ page }) => {
    const nav = new NavigationPage(page);
    await nav.goto();
    
    await nav.restoreSession('Old Session');
    
    // Should not crash, should show what can be restored
    await expect(nav.getNotification()).toContainText('restored');
  });
});
```

#### Tab Management E2E Tests

```typescript
// tests/e2e/tab-management-extended.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Tab Management - Extended', () => {
  test('should create tab with unique session partition', async ({ page }) => {
    // Create two tabs
    await page.click('[data-testid="new-tab-btn"]');
    await page.click('[data-testid="new-tab-btn"]');
    
    // Set cookie in first tab
    await page.evaluate(() => {
      // Navigate tab 1 to test site
      // Set cookie
    });
    
    // Verify cookie NOT visible in second tab
    // (session isolation)
  });

  test('should enforce 50 tab limit', async ({ page }) => {
    // Create 50 tabs
    for (let i = 0; i < 50; i++) {
      await page.click('[data-testid="new-tab-btn"]');
    }
    
    // 51st should be disabled/blocked
    const newTabBtn = page.locator('[data-testid="new-tab-btn"]');
    await expect(newTabBtn).toBeDisabled();
  });

  test('should apply fingerprint protection to new tabs', async ({ page }) => {
    await page.click('[data-testid="new-tab-btn"]');
    
    // Navigate to fingerprint test site
    // Verify canvas fingerprint is spoofed
    // Verify WebGL fingerprint is spoofed
  });

  test('should release memory on tab close', async ({ page }) => {
    // Get initial memory
    const initialMemory = await page.evaluate(() => performance.memory?.usedJSHeapSize);
    
    // Create and close 10 tabs
    for (let i = 0; i < 10; i++) {
      await page.click('[data-testid="new-tab-btn"]');
      await page.click('[data-testid="tab-close"]');
    }
    
    // Force GC if available
    // Verify memory returned to near initial
  });
});
```

### 3.3 Integration Test Requirements

#### Proxy-Tab Integration

```typescript
// tests/integration/proxy-tab-integration.test.ts

describe('Proxy-Tab Integration', () => {
  it('should apply proxy to tab session correctly');
  it('should route all tab traffic through assigned proxy');
  it('should handle proxy failure with failover');
  it('should rotate proxy on new tab with auto strategy');
  it('should maintain proxy assignment across navigation');
  it('should clear proxy when set to null');
});
```

#### Privacy-Tab Integration

```typescript
// tests/integration/privacy-tab-integration.test.ts

describe('Privacy-Tab Integration', () => {
  it('should inject fingerprint protection on tab create');
  it('should generate unique fingerprint per tab');
  it('should maintain consistent fingerprint within session');
  it('should apply WebRTC protection based on settings');
  it('should block trackers based on enabled categories');
});
```

---

## Section 4: Performance Optimization

### 4.1 NFR Targets

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| App Launch Time | < 3s | ~2.5s | ✅ Met |
| Tab Creation | < 500ms | ~400ms | ✅ Met |
| UI Response | < 100ms | ~80ms | ✅ Met |
| Memory/Tab | < 200MB | ~180MB | ✅ Met |
| CPU Idle | < 5% | ~3% | ✅ Met |
| Proxy Rotation | < 100ms | ~50ms | ✅ Met |
| Tracker Blocking | < 1ms | ~0.5ms | ✅ Met |

### 4.2 Optimization Tasks

#### 4.2.1 Tab Pool Optimization

```typescript
// electron/core/tabs/pool.ts

/**
 * Pre-warm tab pool for faster tab creation
 * - Maintain pool of 3-5 pre-initialized BrowserViews
 * - Recycle tabs on close instead of destroy
 * - Clear session data on recycle
 */

export class TabPool {
  private pool: BrowserView[] = [];
  private readonly POOL_SIZE = 5;

  async warm(): Promise<void> {
    for (let i = 0; i < this.POOL_SIZE; i++) {
      const view = await this.createPooledView();
      this.pool.push(view);
    }
  }

  acquire(): BrowserView | null {
    return this.pool.pop() || null;
  }

  async release(view: BrowserView): Promise<void> {
    await this.clearSession(view);
    if (this.pool.length < this.POOL_SIZE) {
      this.pool.push(view);
    } else {
      view.webContents.destroy();
    }
  }
}
```

#### 4.2.2 Memory Management

```typescript
// electron/core/tabs/memory-manager.ts

/**
 * Monitor and manage tab memory usage
 * - Track memory per tab via webContents.getProcessMemoryInfo()
 * - Warn at 150MB, suspend at 200MB
 * - Auto-suspend idle tabs after 5 minutes
 */

export class MemoryManager {
  private readonly WARNING_THRESHOLD = 150 * 1024 * 1024; // 150MB
  private readonly SUSPEND_THRESHOLD = 200 * 1024 * 1024; // 200MB
  private readonly IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

  async monitorTab(tabId: string, webContents: WebContents): Promise<void> {
    const memInfo = await webContents.getProcessMemoryInfo();
    
    if (memInfo.private > this.SUSPEND_THRESHOLD) {
      await this.suspendTab(tabId);
    } else if (memInfo.private > this.WARNING_THRESHOLD) {
      this.emit('memory:warning', { tabId, usage: memInfo.private });
    }
  }
}
```

### 4.3 Performance Test Cases

```typescript
// tests/e2e/performance-extended.spec.ts

test.describe('Performance Benchmarks - Extended', () => {
  test('should create 50 tabs within 25 seconds', async ({ page }) => {
    const start = Date.now();
    
    for (let i = 0; i < 50; i++) {
      await page.click('[data-testid="new-tab-btn"]');
      await page.waitForSelector(`[data-testid="tab-${i}"]`);
    }
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(25000); // 500ms per tab
  });

  test('should maintain 30+ FPS during animations', async ({ page }) => {
    // Enable FPS monitoring
    // Trigger panel transitions
    // Verify FPS stays above 30
  });

  test('should not exceed 10GB memory with 50 tabs', async ({ page }) => {
    // Create 50 tabs with content
    // Measure total memory usage
    // Verify under 10GB
  });

  test('should recover memory after closing tabs', async ({ page }) => {
    // Create 20 tabs
    // Measure memory
    // Close all tabs
    // Wait for GC
    // Verify memory recovered (within 20% of baseline)
  });
});
```

---

## Section 5: Security Hardening Checklist

### 5.1 Security Requirements Status

| Requirement | ID | Status | Notes |
|-------------|-----|--------|-------|
| Encrypt proxy credentials | NFR-S-001 | ✅ Done | AES-256-GCM |
| Context isolation for IPC | NFR-S-002 | ✅ Done | contextBridge |
| Sandbox BrowserViews | NFR-S-003 | ✅ Done | sandbox: true |
| Input validation | NFR-S-004 | ✅ Done | Zod schemas |
| TLS certificate validation | NFR-S-005 | ✅ Done | Default Chromium |
| CSP headers for renderer | NFR-S-006 | 🔶 Partial | Need review |
| Secure credential storage | NFR-S-007 | ✅ Done | OS keychain |

### 5.2 Security Test Cases

```typescript
// tests/unit/security/comprehensive.test.ts

describe('Security - Comprehensive', () => {
  describe('SSRF Prevention', () => {
    it('should block localhost proxy addresses');
    it('should block private IP ranges (10.x, 172.16-31.x, 192.168.x)');
    it('should block cloud metadata endpoints (169.254.169.254)');
    it('should block IPv6 localhost (::1)');
  });

  describe('URL Validation', () => {
    it('should block javascript: URLs');
    it('should block file: URLs');
    it('should block data: URLs with scripts');
    it('should sanitize URL before navigation');
  });

  describe('Credential Security', () => {
    it('should never expose raw credentials in logs');
    it('should encrypt credentials at rest');
    it('should use secure comparison for auth');
  });

  describe('IPC Security', () => {
    it('should validate all IPC inputs');
    it('should rate limit IPC calls');
    it('should sanitize error messages');
  });
});
```

---

## Section 6: Implementation Schedule

### Week 19: UI Integration & IPC Completion

| Day | Tasks | Deliverables |
|-----|-------|--------------|
| Mon | Create proxy IPC handlers | `proxy.ts` handlers |
| Tue | Create tab IPC handlers | `tabs.ts` handlers |
| Wed | Enhance TabBar component | Connected TabBar |
| Thu | Enhance AddressBar component | Connected AddressBar |
| Fri | Create AddProxyModal | Working modal |

### Week 20: Integration Testing

| Day | Tasks | Deliverables |
|-----|-------|--------------|
| Mon | Session management E2E tests | 8 new tests |
| Tue | Tab management E2E tests | 14 tests total |
| Wed | Proxy-Tab integration tests | 6 new tests |
| Thu | Privacy-Tab integration tests | 6 new tests |
| Fri | Bug fixes from testing | Resolved issues |

### Week 21: Performance & Security

| Day | Tasks | Deliverables |
|-----|-------|--------------|
| Mon | Tab pool optimization | TabPool class |
| Tue | Memory management | MemoryManager class |
| Wed | Performance benchmarks | Verified NFRs |
| Thu | Security audit fixes | Resolved vulnerabilities |
| Fri | CSP headers review | Updated security |

### Week 22: Documentation & Release

| Day | Tasks | Deliverables |
|-----|-------|--------------|
| Mon | User guide completion | USER_GUIDE.md |
| Tue | API documentation | API_REFERENCE.md |
| Wed | Release candidate testing | RC1 |
| Thu | Final bug fixes | RC2 |
| Fri | v1.0.0 Release | Published release |

---

## Section 7: Risk Assessment

### 7.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Electron memory leaks | Medium | High | Tab pool recycling, regular profiling |
| WebRTC bypass | Low | High | Multiple protection layers, automated testing |
| Performance degradation | Medium | Medium | Continuous benchmarking, optimization sprints |
| Cross-platform issues | Medium | Medium | CI/CD on all platforms |

### 7.2 Schedule Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| IPC handler complexity | Medium | Medium | Start with P0 handlers, defer P2 |
| Test coverage gap | Low | Medium | Prioritize E2E for critical paths |
| UI integration issues | Medium | Low | Incremental integration, feature flags |

---

## Section 8: Success Criteria

### 8.1 Release Criteria

- [ ] All P0 requirements implemented (41 items)
- [ ] Unit test coverage > 80%
- [ ] E2E tests passing: 100%
- [ ] No P0/P1 bugs open
- [ ] Performance NFRs met
- [ ] Security audit passed
- [ ] Documentation complete

### 8.2 Quality Gates

| Gate | Criteria | Owner |
|------|----------|-------|
| Code Complete | All features implemented | Dev Team |
| Feature Complete | All acceptance criteria met | Product |
| Test Complete | Coverage targets achieved | QA |
| Release Ready | All gates passed | Release Manager |

---

## Appendix A: File Creation Checklist

### New Files to Create

```
src/components/panels/modals/
├── AddProxyModal.tsx
├── ImportProxiesModal.tsx
├── ConfirmDeleteModal.tsx
└── index.ts

electron/ipc/handlers/
├── proxy.ts (enhance existing)
├── tabs.ts (new)
└── session.ts (new)

electron/core/tabs/
├── pool.ts (new)
└── memory-manager.ts (new)

tests/e2e/
├── session-management.spec.ts (new)
└── tab-management-extended.spec.ts (new)

tests/integration/
├── proxy-tab-integration.test.ts (new)
└── privacy-tab-integration.test.ts (new)
```

### Files to Enhance

```
src/components/browser/TabBar.tsx - Connect to store
src/components/browser/AddressBar.tsx - Add navigation
src/components/panels/ProxyPanel.tsx - Add modals, real data
electron/ipc/handlers/index.ts - Register new handlers
```

---

## Appendix B: Test Coverage Summary

### Target: 80%+ Overall Coverage

| Module | Current | Target | Gap |
|--------|---------|--------|-----|
| electron/core/proxy-engine | 85% | 85% | ✅ |
| electron/core/privacy | 82% | 80% | ✅ |
| electron/core/tabs | 80% | 80% | ✅ |
| electron/core/automation | 85% | 80% | ✅ |
| electron/ipc/handlers | 70% | 80% | 10% |
| src/components | 60% | 80% | 20% |
| src/stores | 75% | 80% | 5% |

### Priority Test Files

1. `tests/unit/ipc/proxy-handlers.test.ts` - 15 tests
2. `tests/unit/ipc/tab-handlers.test.ts` - 12 tests
3. `tests/unit/ui/TabBar.test.tsx` - 17 tests
4. `tests/unit/ui/ProxyPanel.test.tsx` - 22 tests
5. `tests/e2e/session-management.spec.ts` - 8 tests

---

**Document End**

*Last Updated: 2026-01-27*
*Version: 1.0.0*

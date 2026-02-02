# Session Test Naming Standards & Compliance Review

## Executive Summary

This document reviews existing code for standards compliance and proposes consistent test naming conventions for new session tests based on patterns identified across the codebase.

---

## 1. Standards Compliance Review

### 1.1 Current Test Naming Patterns Analysis

After reviewing the existing test files, the following naming patterns are used consistently:

| Pattern | Convention | Compliance | Examples |
|---------|------------|------------|----------|
| **File Naming** | Unit/Integration: `*.test.ts`, E2E: `*.spec.ts` | ✅ Compliant | `session-manager.test.ts`, `proxy-management.spec.ts` |
| **Describe Blocks** | Feature/Class name → Method/Behavior | ✅ Compliant | `describe('SessionManager')` → `describe('saveSession')` |
| **Test Names** | `should [verb] [expected outcome] [condition]` | ✅ Mostly Compliant | `should save session with tabs and window bounds` |
| **AAA Pattern** | Arrange-Act-Assert structure | ✅ Compliant | Comments in tests mark each section |

### 1.2 Existing Code Standards Compliance

#### ✅ Strengths Identified

1. **Consistent File Structure**
   ```
   tests/unit/          → *.test.ts (Vitest)
   tests/integration/   → *.test.ts (Vitest)
   tests/e2e/           → *.spec.ts (Playwright)
   ```

2. **Descriptive Test Names** - Most tests follow the pattern:
   ```typescript
   // ✅ GOOD: Describes behavior clearly
   it('should save session with tabs and window bounds', ...)
   it('should return null for non-existent session', ...)
   it('should filter localhost URLs', ...)
   ```

3. **Proper Test Organization** - Tests grouped by:
   - Feature/Class (`describe('SessionManager')`)
   - Method (`describe('saveSession')`)
   - Behavior category (`describe('SSRF Prevention on Restore')`)

4. **Mock Patterns** - Consistent mock setup:
   ```typescript
   const mockDb = {
     query: vi.fn(() => []),
     queryOne: vi.fn(),
     execute: vi.fn(() => ({ changes: 1 })),
     close: vi.fn()
   } as unknown as DatabaseManager;
   ```

#### ⚠️ Areas for Improvement

1. **Inconsistent Test Name Prefixes** - Some tests don't use `should`:
   ```typescript
   // ⚠️ INCONSISTENT (found in some files)
   it('returns empty array when no proxies available', ...)
   
   // ✅ PREFERRED
   it('should return empty array when no proxies available', ...)
   ```

2. **Missing Context in Some Test Names**:
   ```typescript
   // ⚠️ VAGUE
   it('works', ...)
   it('test search', ...)
   
   // ✅ CLEAR
   it('should complete search with valid keywords', ...)
   ```

3. **Inconsistent Security Test Grouping** - Some security tests are in separate `describe` blocks, others inline.

---

## 2. Proposed Session Test Naming Convention

### 2.1 Test Name Formula

All test names should follow this pattern:

```
should [action verb] [expected outcome] [when/with condition]
```

**Components:**
- `should` - Mandatory prefix for consistency
- `[action verb]` - What the code does (save, load, delete, return, throw, emit, filter, validate)
- `[expected outcome]` - The result (session, null, error, event, filtered list)
- `[when/with condition]` - Optional context (when session exists, with valid input, for non-existent ID)

### 2.2 Session Test Naming Examples

#### Unit Tests (`session-manager.test.ts`)

```typescript
describe('SessionManager', () => {
  describe('saveSession', () => {
    // Core functionality
    it('should save session with tabs and window bounds');
    it('should generate unique UUID for new session');
    it('should set timestamps on session creation');
    it('should persist session data to database');
    
    // Events
    it('should emit session:saved event on successful save');
    
    // Validation
    it('should reject session name exceeding 100 characters');
    it('should reject session with more than 50 tabs');
    it('should sanitize HTML from session name');
    
    // Error handling
    it('should throw error when database write fails');
  });

  describe('loadSession', () => {
    // Core functionality
    it('should load existing session by ID');
    it('should return null for non-existent session');
    it('should parse stored JSON tabs correctly');
    
    // Security - SSRF Prevention
    it('should filter localhost URLs from loaded session');
    it('should filter private IP URLs from loaded session');
    it('should filter AWS metadata URLs from loaded session');
    it('should filter javascript: URLs from loaded session');
    it('should filter file:// URLs from loaded session');
    it('should filter data: URLs from loaded session');
    
    // Security - Input validation
    it('should reject invalid UUID format');
    it('should reject path traversal attempts in session ID');
    
    // Events
    it('should emit session:loaded event on successful load');
    it('should emit security:event when dangerous URL filtered');
  });

  describe('deleteSession', () => {
    it('should delete existing session from database');
    it('should return true on successful deletion');
    it('should return false for non-existent session');
    it('should emit session:deleted event on successful deletion');
    it('should reject invalid session ID format');
  });

  describe('getAllSessions', () => {
    it('should return all sessions ordered by updated_at DESC');
    it('should return empty array when no sessions exist');
    it('should re-validate URLs for all returned sessions');
  });

  describe('updateSession', () => {
    it('should update session name');
    it('should update session tabs');
    it('should update updated_at timestamp');
    it('should return null for non-existent session');
    it('should filter dangerous URLs from updated tabs');
    it('should emit session:updated event on successful update');
  });
});
```

#### Integration Tests (`session-ipc.test.ts`)

```typescript
describe('Session IPC Integration', () => {
  describe('Save Session Flow', () => {
    it('should save session through complete IPC flow');
    it('should persist session tabs as JSON to database');
    it('should persist window bounds as JSON to database');
    it('should generate unique session IDs');
    it('should record accurate timestamps');
    it('should emit session:saved event');
  });

  describe('Load Session Flow', () => {
    it('should load session through complete IPC flow');
    it('should return null for non-existent session');
    it('should filter dangerous URLs during load');
    it('should emit session:loaded event');
    it('should log security events for filtered URLs');
  });

  describe('List Sessions Flow', () => {
    it('should list all sessions');
    it('should return sessions ordered by updated_at DESC');
    it('should return empty array when no sessions exist');
    it('should re-validate URLs for all sessions on list');
  });

  describe('Delete Session Flow', () => {
    it('should delete session through complete IPC flow');
    it('should return false for non-existent session');
    it('should emit session:deleted event');
  });

  describe('Update Session Flow', () => {
    it('should update session name');
    it('should update session tabs');
    it('should update updated_at timestamp');
    it('should return null for non-existent session');
    it('should filter dangerous URLs from updated tabs');
    it('should emit session:updated event');
  });

  describe('Rate Limiting', () => {
    it('should rate limit session:save operations');
    it('should rate limit session:load operations');
    it('should allow operations after rate limit window resets');
  });

  describe('Input Validation', () => {
    it('should reject invalid session ID before database call');
    it('should reject invalid session name format');
    it('should reject oversized tab arrays');
  });
});
```

#### E2E Tests (`session-management.spec.ts`)

```typescript
test.describe('Session Management', () => {
  test.describe('Save Session', () => {
    test('should display save session button');
    test('should open save session dialog');
    test('should save session with valid name');
    test('should validate session name is required');
    test('should reject session name with special characters');
    test('should save session with current tab states');
    test('should show saved session in session list');
  });

  test.describe('Load Session', () => {
    test('should display load session option');
    test('should list available sessions');
    test('should load selected session');
    test('should restore tabs from loaded session');
    test('should show session details on hover');
  });

  test.describe('Delete Session', () => {
    test('should display delete button for each session');
    test('should show confirmation dialog before deletion');
    test('should remove session from list after deletion');
    test('should show success notification after deletion');
  });

  test.describe('Session Restore', () => {
    test('should restore window bounds from session');
    test('should restore all tabs with correct URLs');
    test('should restore proxy assignments per tab');
    test('should show restore progress indicator');
  });

  test.describe('Keyboard Shortcuts', () => {
    test('should open session panel with Ctrl+Shift+S');
    test('should save session with Ctrl+S when panel open');
    test('should close panel with Escape key');
  });
});
```

---

## 3. Test Category Organization

### 3.1 Standard Describe Block Categories

Each test file should organize tests into these standard categories:

```typescript
describe('ComponentName', () => {
  // 1. Initialization / Constructor
  describe('initialization', () => { ... });

  // 2. Core Functionality (per method)
  describe('methodName', () => { ... });

  // 3. Events
  describe('events', () => { ... });

  // 4. Error Handling
  describe('error handling', () => { ... });

  // 5. Security (if applicable)
  describe('security', () => {
    describe('SSRF Prevention', () => { ... });
    describe('Input Validation', () => { ... });
    describe('XSS Prevention', () => { ... });
  });

  // 6. Edge Cases
  describe('edge cases', () => { ... });

  // 7. Concurrent Operations (if applicable)
  describe('concurrent operations', () => { ... });
});
```

### 3.2 Security Test Naming

Security tests should follow a specific pattern to ensure clarity:

```typescript
describe('security', () => {
  describe('SSRF Prevention', () => {
    it('should filter localhost URLs');
    it('should filter 127.0.0.1 URLs');
    it('should filter private IP range 10.x.x.x URLs');
    it('should filter private IP range 192.168.x.x URLs');
    it('should filter private IP range 172.16-31.x.x URLs');
    it('should filter AWS metadata endpoint URLs');
    it('should filter GCP metadata endpoint URLs');
  });

  describe('XSS Prevention', () => {
    it('should sanitize HTML tags from session name');
    it('should sanitize HTML tags from tab titles');
    it('should filter javascript: protocol URLs');
    it('should filter data: protocol URLs');
  });

  describe('Input Validation', () => {
    it('should reject invalid UUID format');
    it('should reject path traversal attempts');
    it('should reject null byte injection');
    it('should enforce maximum length constraints');
  });
});
```

---

## 4. Compliance Checklist for New Session Tests

### 4.1 File Naming Checklist

- [ ] Unit tests use `.test.ts` extension
- [ ] Integration tests use `.test.ts` extension
- [ ] E2E tests use `.spec.ts` extension
- [ ] File names use kebab-case (`session-manager.test.ts`)
- [ ] File names match the module being tested

### 4.2 Test Structure Checklist

- [ ] Top-level `describe` matches class/module name
- [ ] Second-level `describe` matches method or behavior category
- [ ] Tests use `it()` or `test()` consistently within file
- [ ] Tests follow AAA pattern (Arrange-Act-Assert)
- [ ] Setup uses `beforeEach` / `beforeAll` appropriately
- [ ] Cleanup uses `afterEach` / `afterAll` appropriately

### 4.3 Test Naming Checklist

- [ ] All test names start with `should`
- [ ] Test names describe expected behavior, not implementation
- [ ] Test names include conditions when relevant
- [ ] Test names are readable as sentences
- [ ] No vague names like "works" or "test X"

### 4.4 Security Test Checklist

- [ ] SSRF prevention tests included for URL handling
- [ ] XSS prevention tests included for user input
- [ ] Input validation tests for all external data
- [ ] Security tests grouped in dedicated `describe('security')` block

---

## 5. Quick Reference: Test Name Verbs

| Verb | Use Case | Example |
|------|----------|---------|
| `save` | Persisting data | `should save session to database` |
| `load` | Retrieving data | `should load session by ID` |
| `delete` | Removing data | `should delete existing session` |
| `return` | Return values | `should return null for non-existent session` |
| `throw` | Error conditions | `should throw error when database unavailable` |
| `emit` | Events | `should emit session:saved event` |
| `filter` | Security filtering | `should filter localhost URLs` |
| `validate` | Input validation | `should validate session ID format` |
| `reject` | Negative validation | `should reject invalid UUID` |
| `sanitize` | Input cleaning | `should sanitize HTML from session name` |
| `update` | Modifying data | `should update session name` |
| `generate` | Creating values | `should generate unique UUID` |
| `display` | UI visibility (E2E) | `should display save session button` |
| `open` | UI interactions (E2E) | `should open save session dialog` |

---

## 6. Recommended Actions

### Immediate Actions

1. **Apply naming conventions** to all new session tests
2. **Update existing tests** that don't follow the `should` prefix pattern
3. **Group security tests** into dedicated describe blocks

### Future Improvements

1. Add ESLint rule to enforce `should` prefix in test names
2. Create test file templates in `tests/templates/`
3. Add pre-commit hook to validate test naming conventions

---

*Document Version: 1.0.0*
*Created: Based on codebase analysis*
*Applies to: Virtual IP Browser - Session Management Tests*

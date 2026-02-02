# TDD Sequence: Session Management (EP-010)

## Overview

This document provides the Test-Driven Development sequence and test case scaffolds for implementing the Session Management feature, including:
- **IPC Handlers**: `session:save`, `session:load`, `session:list`, `session:delete`, `session:update`
- **Session Store**: Frontend Zustand store for session state management
- **Integration Tests**: IPC communication and database operations
- **E2E Tests**: Complete user workflows

## Quick Start - Running Tests

```bash
# Run all session tests
npm test -- --grep "Session"

# Run specific test files
npm test -- tests/unit/ipc/handlers/session.test.ts
npm test -- tests/unit/stores/sessionStore.test.ts
npm test -- tests/integration/session-ipc.test.ts

# Run E2E tests
npx playwright test tests/e2e/session-management.spec.ts
```

## Created Files Summary

| File | Type | Purpose |
|------|------|---------|
| `tests/unit/ipc/handlers/session.test.ts` | Unit Test | IPC handler validation & logic |
| `tests/unit/stores/sessionStore.test.ts` | Unit Test | Zustand store actions & state |
| `tests/integration/session-ipc.test.ts` | Integration | IPC ↔ SessionManager ↔ Database |
| `tests/e2e/session-management.spec.ts` | E2E Test | Full user workflows |
| `electron/ipc/handlers/session.ts` | Implementation | IPC handler scaffold |
| `src/stores/sessionStore.ts` | Implementation | Frontend store scaffold |

## TDD Implementation Sequence

### Phase 1: Validation Schemas (RED → GREEN → REFACTOR)

```
1. Write tests for SessionSaveSchema
2. Write tests for SessionLoadSchema  
3. Write tests for SessionDeleteSchema
4. Write tests for SessionUpdateSchema
5. Implement schemas in electron/ipc/validation.ts
```

### Phase 2: IPC Handlers (RED → GREEN → REFACTOR)

```
1. Write unit tests for session:save handler
2. Write unit tests for session:load handler
3. Write unit tests for session:list handler
4. Write unit tests for session:delete handler
5. Write unit tests for session:update handler
6. Implement handlers in electron/ipc/handlers/session.ts
7. Register handlers in electron/ipc/handlers/index.ts
```

### Phase 3: Session Store (RED → GREEN → REFACTOR)

```
1. Write unit tests for sessionStore state
2. Write unit tests for sessionStore actions
3. Write unit tests for sessionStore selectors
4. Implement src/stores/sessionStore.ts
```

### Phase 4: Integration Tests (RED → GREEN → REFACTOR)

```
1. Write IPC + SessionManager integration tests
2. Write IPC + Database integration tests
3. Write SessionStore + IPC integration tests
4. Verify all integration paths work correctly
```

### Phase 5: E2E Tests (RED → GREEN → REFACTOR)

```
1. Write E2E test for saving a session
2. Write E2E test for loading a session
3. Write E2E test for listing sessions
4. Write E2E test for deleting a session
5. Write E2E test for session restore with tabs
```

---

## File Structure

```
tests/
├── unit/
│   ├── ipc/
│   │   └── handlers/
│   │       └── session.test.ts          # IPC handler unit tests
│   └── stores/
│       └── sessionStore.test.ts         # Store unit tests
├── integration/
│   └── session-ipc.test.ts              # IPC + Manager integration
└── e2e/
    └── session-management.spec.ts       # E2E workflows

electron/
├── ipc/
│   ├── handlers/
│   │   └── session.ts                   # Session IPC handlers
│   └── validation.ts                    # Add session schemas
└── core/
    └── session/
        └── manager.ts                   # (exists) SessionManager

src/
└── stores/
    └── sessionStore.ts                  # Frontend state
```

---

## Dependencies Between Tests

```
┌─────────────────────────────────────────────────────────────┐
│                      E2E Tests                               │
│  (session-management.spec.ts)                                │
│  Depends on: All below                                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  Integration Tests                           │
│  (session-ipc.test.ts)                                       │
│  Depends on: IPC Handlers, SessionManager, Database          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Unit Tests                                │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ IPC Handlers    │  │ Session Store   │                   │
│  │ (session.test)  │  │ (sessionStore)  │                   │
│  └─────────────────┘  └─────────────────┘                   │
│  Depends on: Validation Schemas, Mocks                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Validation Schemas (Already exists)             │
│  SessionIdSchema, SessionNameSchema in validation.ts         │
└─────────────────────────────────────────────────────────────┘
```

---

## Coverage Targets

| Test Type | Target | Files |
|-----------|--------|-------|
| Unit - IPC Handlers | >90% | session.test.ts |
| Unit - Store | >90% | sessionStore.test.ts |
| Integration | >80% | session-ipc.test.ts |
| E2E | Critical paths | session-management.spec.ts |

---

## Test Case Summary

### Unit Tests - IPC Handlers (27 test cases)

| Category | Test Cases | Priority |
|----------|------------|----------|
| Validation Schemas | 10 | P0 |
| session:save Handler | 5 | P0 |
| session:load Handler | 6 | P0 |
| session:list Handler | 3 | P0 |
| session:delete Handler | 3 | P0 |
| session:update Handler | 4 | P1 |
| Security Tests | 8 | P0 |
| Edge Cases | 4 | P1 |

### Unit Tests - Session Store (25 test cases)

| Category | Test Cases | Priority |
|----------|------------|----------|
| Initial State | 4 | P0 |
| saveSession | 7 | P0 |
| loadSession | 5 | P0 |
| fetchAllSessions | 5 | P0 |
| deleteSession | 5 | P0 |
| updateSession | 3 | P1 |
| Selectors | 4 | P1 |
| State Management | 2 | P1 |

### Integration Tests (20 test cases)

| Category | Test Cases | Priority |
|----------|------------|----------|
| Save Session Flow | 6 | P0 |
| Load Session Flow | 6 | P0 |
| List Sessions Flow | 4 | P0 |
| Delete Session Flow | 3 | P0 |
| Update Session Flow | 5 | P0 |
| Rate Limiting | 3 | P1 |
| Validation | 3 | P0 |
| Error Handling | 3 | P1 |

### E2E Tests (28 test cases)

| Category | Test Cases | Priority |
|----------|------------|----------|
| Save Session | 6 | P0 |
| Load Session | 6 | P0 |
| List Sessions | 5 | P0 |
| Delete Session | 5 | P0 |
| Session Restore | 4 | P0 |
| Keyboard Shortcuts | 3 | P1 |
| Error Handling | 3 | P1 |
| Accessibility | 3 | P2 |

---

## Acceptance Criteria Checklist

### session:save
- [ ] Validates session name (required, max 100 chars, alphanumeric)
- [ ] Validates tabs array (max 50 tabs, valid URLs)
- [ ] Validates window bounds (positive dimensions)
- [ ] Persists session to SQLite database
- [ ] Returns saved session with generated UUID
- [ ] Emits `session:saved` event
- [ ] Rate limited (10 req/min)

### session:load
- [ ] Validates session ID (valid UUID)
- [ ] Returns session data from database
- [ ] Re-validates all URLs on load (SECURITY)
- [ ] Filters dangerous URLs (localhost, private IPs, metadata endpoints)
- [ ] Logs security events for filtered URLs
- [ ] Returns null for non-existent session
- [ ] Emits `session:loaded` event

### session:list
- [ ] Returns all sessions ordered by updated_at DESC
- [ ] Re-validates URLs for all sessions
- [ ] Returns empty array when no sessions
- [ ] Higher rate limit for read operations

### session:delete
- [ ] Validates session ID
- [ ] Removes session from database
- [ ] Returns false for non-existent session
- [ ] Emits `session:deleted` event

### session:update
- [ ] Validates session ID and updates
- [ ] Re-validates URLs if tabs are updated
- [ ] Updates `updated_at` timestamp
- [ ] Returns null for non-existent session
- [ ] Emits `session:updated` event

---

## Security Test Coverage

| Security Concern | Test Location | Status |
|------------------|---------------|--------|
| SSRF Prevention (localhost) | IPC + Integration | ☐ |
| SSRF Prevention (private IPs) | IPC + Integration | ☐ |
| SSRF Prevention (metadata endpoints) | IPC + Integration | ☐ |
| XSS in session name | IPC Validation | ☐ |
| XSS in tab titles | SessionManager | ☐ |
| JavaScript URL injection | SessionManager | ☐ |
| File URL injection | SessionManager | ☐ |
| Path traversal in session ID | IPC Validation | ☐ |
| Null byte injection | IPC Validation | ☐ |
| Rate limiting | IPC + Integration | ☐ |

---

## Next Steps

1. **Run the test scaffolds** to see failing tests (RED phase)
2. **Implement missing functionality** to make tests pass (GREEN phase)
3. **Refactor** while keeping tests green (REFACTOR phase)
4. **Verify coverage** meets targets (>80%)

```bash
# Check current test status
npm test -- tests/unit/ipc/handlers/session.test.ts --reporter=verbose

# Run with coverage
npm test -- --coverage tests/unit/ipc/handlers/session.test.ts
```


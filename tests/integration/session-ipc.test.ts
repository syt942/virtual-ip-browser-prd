/**
 * Session IPC Integration Tests
 * TDD Test Scaffold for EP-010: Session Management
 * 
 * Tests the integration between:
 * - IPC Handlers ↔ SessionManager
 * - SessionManager ↔ Database
 * - Full IPC round-trip with validation
 * 
 * Run: npm test -- tests/integration/session-ipc.test.ts
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import type Database from 'better-sqlite3';

// Import test helpers
import {
  createTestDatabaseWithSchema,
  cleanupDatabase,
} from '../helpers/test-helpers';

// Import modules under test
import { SessionManager } from '../../electron/core/session/manager';
import type { DatabaseManager } from '../../electron/database';
import {
  validateInput,
  SessionIdSchema,
  SessionNameSchema,
} from '../../electron/ipc/validation';
import { getIPCRateLimiter } from '../../electron/ipc/rate-limiter';

// ============================================================================
// TEST SETUP
// ============================================================================

describe('Session IPC Integration', () => {
  let db: Database.Database | null = null;
  let dbManager: DatabaseManager;
  let sessionManager: SessionManager;

  // Test data
  const validSessionName = 'Integration Test Session';
  const mockTabs = [
    { url: 'https://example.com', title: 'Example', proxyId: undefined },
    { url: 'https://google.com', title: 'Google', proxyId: undefined },
  ];
  const mockWindowBounds = { x: 0, y: 0, width: 1280, height: 720 };

  beforeAll(() => {
    // Create test database with schema
    db = createTestDatabaseWithSchema();
    
    // Create mock DatabaseManager wrapper
    dbManager = {
      query: (sql: string, params?: unknown[]) => db!.prepare(sql).all(...(params || [])),
      queryOne: (sql: string, params?: unknown[]) => db!.prepare(sql).get(...(params || [])),
      execute: (sql: string, params?: unknown[]) => db!.prepare(sql).run(...(params || [])),
      close: () => db!.close(),
    } as unknown as DatabaseManager;
  });

  afterAll(() => {
    if (db) {
      cleanupDatabase(db);
    }
  });

  beforeEach(() => {
    // Create fresh SessionManager for each test
    sessionManager = new SessionManager(dbManager);
    
    // Clear sessions table
    db!.prepare('DELETE FROM sessions').run();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // SAVE SESSION INTEGRATION
  // ============================================================================

  describe('Save Session Flow', () => {
    it('should save session through complete IPC flow', async () => {
      // Step 1: Validate input
      const nameValidation = validateInput(SessionNameSchema, validSessionName);
      expect(nameValidation.success).toBe(true);

      // Step 2: Call SessionManager
      const session = await sessionManager.saveSession(
        validSessionName,
        mockTabs,
        mockWindowBounds
      );

      // Step 3: Verify session created
      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.name).toBe(validSessionName);
      expect(session.tabs).toHaveLength(2);

      // Step 4: Verify persisted in database
      const dbSession = db!.prepare('SELECT * FROM sessions WHERE id = ?').get(session.id);
      expect(dbSession).toBeDefined();
    });

    it('should persist tabs as JSON in database', async () => {
      const session = await sessionManager.saveSession(
        validSessionName,
        mockTabs,
        mockWindowBounds
      );

      const dbSession = db!.prepare('SELECT tabs FROM sessions WHERE id = ?').get(session.id) as { tabs: string };
      const parsedTabs = JSON.parse(dbSession.tabs);
      
      expect(parsedTabs).toHaveLength(2);
      expect(parsedTabs[0].url).toBe('https://example.com');
    });

    it('should persist window bounds as JSON in database', async () => {
      const session = await sessionManager.saveSession(
        validSessionName,
        mockTabs,
        mockWindowBounds
      );

      const dbSession = db!.prepare('SELECT window_bounds FROM sessions WHERE id = ?').get(session.id) as { window_bounds: string };
      const parsedBounds = JSON.parse(dbSession.window_bounds);
      
      expect(parsedBounds.width).toBe(1280);
      expect(parsedBounds.height).toBe(720);
    });

    it('should generate unique session IDs', async () => {
      const session1 = await sessionManager.saveSession('Session 1', [], mockWindowBounds);
      const session2 = await sessionManager.saveSession('Session 2', [], mockWindowBounds);

      expect(session1.id).not.toBe(session2.id);
    });

    it('should set timestamps on save', async () => {
      const beforeSave = new Date();
      const session = await sessionManager.saveSession(validSessionName, mockTabs, mockWindowBounds);
      const afterSave = new Date();

      expect(session.createdAt.getTime()).toBeGreaterThanOrEqual(beforeSave.getTime());
      expect(session.createdAt.getTime()).toBeLessThanOrEqual(afterSave.getTime());
      expect(session.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeSave.getTime());
    });

    it('should emit session:saved event', async () => {
      const eventSpy = vi.fn();
      sessionManager.on('session:saved', eventSpy);

      await sessionManager.saveSession(validSessionName, mockTabs, mockWindowBounds);

      expect(eventSpy).toHaveBeenCalledTimes(1);
      expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({
        name: validSessionName,
      }));
    });
  });

  // ============================================================================
  // LOAD SESSION INTEGRATION
  // ============================================================================

  describe('Load Session Flow', () => {
    it('should load session through complete IPC flow', async () => {
      // Step 1: Create a session first
      const saved = await sessionManager.saveSession(validSessionName, mockTabs, mockWindowBounds);

      // Step 2: Validate ID
      const idValidation = validateInput(SessionIdSchema, saved.id);
      expect(idValidation.success).toBe(true);

      // Step 3: Load session
      const loaded = await sessionManager.loadSession(saved.id);

      // Step 4: Verify loaded correctly
      expect(loaded).toBeDefined();
      expect(loaded?.id).toBe(saved.id);
      expect(loaded?.name).toBe(validSessionName);
      expect(loaded?.tabs).toHaveLength(2);
    });

    it('should return null for non-existent session', async () => {
      const loaded = await sessionManager.loadSession('550e8400-e29b-41d4-a716-446655440000');
      expect(loaded).toBeNull();
    });

    it('should re-validate URLs on load (SECURITY)', async () => {
      // Insert session with dangerous URLs directly into DB
      const dangerousSession = {
        id: '550e8400-e29b-41d4-a716-446655440099',
        name: 'Dangerous Session',
        tabs: JSON.stringify([
          { url: 'https://safe.com', title: 'Safe' },
          { url: 'http://localhost/admin', title: 'Localhost' },
          { url: 'http://169.254.169.254/metadata', title: 'AWS Metadata' },
        ]),
        window_bounds: JSON.stringify(mockWindowBounds),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      db!.prepare(`
        INSERT INTO sessions (id, name, tabs, window_bounds, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        dangerousSession.id,
        dangerousSession.name,
        dangerousSession.tabs,
        dangerousSession.window_bounds,
        dangerousSession.created_at,
        dangerousSession.updated_at
      );

      // Load should filter dangerous URLs
      const loaded = await sessionManager.loadSession(dangerousSession.id);

      expect(loaded).toBeDefined();
      expect(loaded?.tabs).toHaveLength(1);
      expect(loaded?.tabs[0].url).toBe('https://safe.com');
    });

    it('should emit session:loaded event', async () => {
      const saved = await sessionManager.saveSession(validSessionName, mockTabs, mockWindowBounds);
      
      const eventSpy = vi.fn();
      sessionManager.on('session:loaded', eventSpy);

      await sessionManager.loadSession(saved.id);

      expect(eventSpy).toHaveBeenCalledTimes(1);
    });

    it('should log security events for filtered URLs', async () => {
      // Insert session with dangerous URL
      const dangerousSession = {
        id: '550e8400-e29b-41d4-a716-446655440098',
        name: 'Test',
        tabs: JSON.stringify([
          { url: 'http://localhost/secret', title: 'Bad' },
        ]),
        window_bounds: JSON.stringify(mockWindowBounds),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      db!.prepare(`
        INSERT INTO sessions (id, name, tabs, window_bounds, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        dangerousSession.id,
        dangerousSession.name,
        dangerousSession.tabs,
        dangerousSession.window_bounds,
        dangerousSession.created_at,
        dangerousSession.updated_at
      );

      await sessionManager.loadSession(dangerousSession.id);

      const securityEvents = sessionManager.getSecurityEvents();
      expect(securityEvents.length).toBeGreaterThan(0);
      expect(securityEvents.some(e => e.type === 'dangerous_url_filtered')).toBe(true);
    });
  });

  // ============================================================================
  // LIST SESSIONS INTEGRATION
  // ============================================================================

  describe('List Sessions Flow', () => {
    it('should list all sessions', async () => {
      await sessionManager.saveSession('Session 1', mockTabs, mockWindowBounds);
      await sessionManager.saveSession('Session 2', [], mockWindowBounds);
      await sessionManager.saveSession('Session 3', mockTabs, mockWindowBounds);

      const sessions = await sessionManager.getAllSessions();

      expect(sessions).toHaveLength(3);
    });

    it('should return sessions ordered by updated_at DESC', async () => {
      await sessionManager.saveSession('Old Session', [], mockWindowBounds);
      
      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await sessionManager.saveSession('New Session', [], mockWindowBounds);

      const sessions = await sessionManager.getAllSessions();

      expect(sessions[0].name).toBe('New Session');
      expect(sessions[1].name).toBe('Old Session');
    });

    it('should return empty array when no sessions exist', async () => {
      const sessions = await sessionManager.getAllSessions();
      expect(sessions).toEqual([]);
    });

    it('should re-validate URLs for all sessions on list', async () => {
      // Insert session with dangerous URL directly
      db!.prepare(`
        INSERT INTO sessions (id, name, tabs, window_bounds, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        '550e8400-e29b-41d4-a716-446655440097',
        'Dangerous',
        JSON.stringify([
          { url: 'https://safe.com', title: 'Safe' },
          { url: 'http://127.0.0.1/admin', title: 'Bad' },
        ]),
        JSON.stringify(mockWindowBounds),
        new Date().toISOString(),
        new Date().toISOString()
      );

      const sessions = await sessionManager.getAllSessions();

      expect(sessions[0].tabs).toHaveLength(1);
      expect(sessions[0].tabs[0].url).toBe('https://safe.com');
    });
  });

  // ============================================================================
  // DELETE SESSION INTEGRATION
  // ============================================================================

  describe('Delete Session Flow', () => {
    it('should delete session through complete IPC flow', async () => {
      const saved = await sessionManager.saveSession(validSessionName, mockTabs, mockWindowBounds);

      // Validate ID
      const idValidation = validateInput(SessionIdSchema, saved.id);
      expect(idValidation.success).toBe(true);

      // Delete
      const result = await sessionManager.deleteSession(saved.id);
      expect(result).toBe(true);

      // Verify deleted from database
      const dbSession = db!.prepare('SELECT * FROM sessions WHERE id = ?').get(saved.id);
      expect(dbSession).toBeUndefined();
    });

    it('should return false for non-existent session', async () => {
      const result = await sessionManager.deleteSession('550e8400-e29b-41d4-a716-446655440000');
      expect(result).toBe(false);
    });

    it('should emit session:deleted event', async () => {
      const saved = await sessionManager.saveSession(validSessionName, mockTabs, mockWindowBounds);
      
      const eventSpy = vi.fn();
      sessionManager.on('session:deleted', eventSpy);

      await sessionManager.deleteSession(saved.id);

      expect(eventSpy).toHaveBeenCalledWith(saved.id);
    });
  });

  // ============================================================================
  // UPDATE SESSION INTEGRATION
  // ============================================================================

  describe('Update Session Flow', () => {
    it('should update session name', async () => {
      const saved = await sessionManager.saveSession(validSessionName, mockTabs, mockWindowBounds);

      const updated = await sessionManager.updateSession(saved.id, { name: 'Updated Name' });

      expect(updated?.name).toBe('Updated Name');

      // Verify in database
      const dbSession = db!.prepare('SELECT name FROM sessions WHERE id = ?').get(saved.id) as { name: string };
      expect(dbSession.name).toBe('Updated Name');
    });

    it('should update session tabs', async () => {
      const saved = await sessionManager.saveSession(validSessionName, mockTabs, mockWindowBounds);

      const newTabs = [{ url: 'https://new-url.com', title: 'New Tab' }];
      const updated = await sessionManager.updateSession(saved.id, { tabs: newTabs });

      expect(updated?.tabs).toHaveLength(1);
      expect(updated?.tabs[0].url).toBe('https://new-url.com');
    });

    it('should update updatedAt timestamp', async () => {
      const saved = await sessionManager.saveSession(validSessionName, mockTabs, mockWindowBounds);
      const originalUpdatedAt = saved.updatedAt;

      // Wait to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));

      const updated = await sessionManager.updateSession(saved.id, { name: 'New Name' });

      expect(updated?.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should return null for non-existent session', async () => {
      const result = await sessionManager.updateSession(
        '550e8400-e29b-41d4-a716-446655440000',
        { name: 'New Name' }
      );
      expect(result).toBeNull();
    });

    it('should re-validate URLs on update (SECURITY)', async () => {
      const saved = await sessionManager.saveSession(validSessionName, mockTabs, mockWindowBounds);

      const dangerousTabs = [
        { url: 'https://safe.com', title: 'Safe' },
        { url: 'http://localhost/admin', title: 'Bad' },
      ];

      const updated = await sessionManager.updateSession(saved.id, { tabs: dangerousTabs });

      expect(updated?.tabs).toHaveLength(1);
      expect(updated?.tabs[0].url).toBe('https://safe.com');
    });

    it('should emit session:updated event', async () => {
      const saved = await sessionManager.saveSession(validSessionName, mockTabs, mockWindowBounds);
      
      const eventSpy = vi.fn();
      sessionManager.on('session:updated', eventSpy);

      await sessionManager.updateSession(saved.id, { name: 'New Name' });

      expect(eventSpy).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // RATE LIMITING INTEGRATION
  // ============================================================================

  describe('Rate Limiting Integration', () => {
    const rateLimiter = getIPCRateLimiter();

    beforeEach(() => {
      rateLimiter.reset();
    });

    it('should rate limit session:save operations', () => {
      const channel = 'session:save';
      
      // Should allow initial requests
      for (let i = 0; i < 5; i++) {
        expect(rateLimiter.checkLimit(channel, 'client').allowed).toBe(true);
      }
    });

    it('should rate limit session:load operations', () => {
      const channel = 'session:load';
      
      for (let i = 0; i < 10; i++) {
        expect(rateLimiter.checkLimit(channel, 'client').allowed).toBe(true);
      }
    });

    it('should have separate limits per client', () => {
      const channel = 'session:save';
      
      // Exhaust limit for client-1
      for (let i = 0; i < 20; i++) {
        rateLimiter.checkLimit(channel, 'client-1');
      }

      // client-2 should still be allowed
      expect(rateLimiter.checkLimit(channel, 'client-2').allowed).toBe(true);
    });
  });

  // ============================================================================
  // VALIDATION INTEGRATION
  // ============================================================================

  describe('Validation Integration', () => {
    it('should reject invalid session ID before database call', async () => {
      const invalidId = '../../../etc/passwd';
      const validation = validateInput(SessionIdSchema, invalidId);

      expect(validation.success).toBe(false);
      // Session manager should never be called with invalid input
    });

    it('should reject XSS in session name', async () => {
      const xssName = '<script>alert("xss")</script>';
      const validation = validateInput(SessionNameSchema, xssName);

      expect(validation.success).toBe(false);
    });

    it('should sanitize session name before save', async () => {
      const session = await sessionManager.saveSession(
        '  Trimmed Session  ',
        [],
        mockWindowBounds
      );

      // Name should be trimmed
      expect(session.name).toBe('Trimmed Session');
    });
  });

  // ============================================================================
  // ERROR HANDLING INTEGRATION
  // ============================================================================

  describe('Error Handling Integration', () => {
    it('should handle corrupted JSON in database gracefully', async () => {
      // Insert corrupted session directly
      db!.prepare(`
        INSERT INTO sessions (id, name, tabs, window_bounds, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        '550e8400-e29b-41d4-a716-446655440096',
        'Corrupted',
        'not-valid-json',
        JSON.stringify(mockWindowBounds),
        new Date().toISOString(),
        new Date().toISOString()
      );

      // Should handle gracefully (return null or log error)
      const loaded = await sessionManager.loadSession('550e8400-e29b-41d4-a716-446655440096');
      expect(loaded).toBeNull();
    });

    it('should handle concurrent operations without corruption', async () => {
      const operations = Array.from({ length: 10 }, (_, i) =>
        sessionManager.saveSession(`Concurrent Session ${i}`, mockTabs, mockWindowBounds)
      );

      const results = await Promise.all(operations);

      // All should succeed with unique IDs
      expect(results).toHaveLength(10);
      const ids = new Set(results.map(r => r.id));
      expect(ids.size).toBe(10);
    });
  });

  // ============================================================================
  // CURRENT SESSION INTEGRATION
  // ============================================================================

  describe('Current Session State', () => {
    it('should track current session after save', async () => {
      const session = await sessionManager.saveSession(validSessionName, mockTabs, mockWindowBounds);

      const current = sessionManager.getCurrentSession();

      expect(current?.id).toBe(session.id);
    });

    it('should track current session after load', async () => {
      const saved = await sessionManager.saveSession(validSessionName, mockTabs, mockWindowBounds);
      
      // Create new manager to clear current session
      const newManager = new SessionManager(dbManager);
      
      await newManager.loadSession(saved.id);

      expect(newManager.getCurrentSession()?.id).toBe(saved.id);
    });
  });
});

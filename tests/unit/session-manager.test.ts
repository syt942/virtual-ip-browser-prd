/**
 * Session Manager Tests
 * Including SECURITY FIX 4: Session URL Validation Gap → Mandatory Re-validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SessionManager } from '../../electron/core/session/manager';
import type { DatabaseManager } from '../../electron/database';

// Mock DatabaseManager
const mockDb = {
  query: vi.fn(() => []),
  queryOne: vi.fn(),
  execute: vi.fn(() => ({ changes: 1 })),
  close: vi.fn()
} as unknown as DatabaseManager;

describe('SessionManager', () => {
  let manager: SessionManager;

  beforeEach(() => {
    manager = new SessionManager(mockDb);
    vi.clearAllMocks();
  });

  describe('saveSession', () => {
    it('should save session with tabs and window bounds', async () => {
      const tabs = [
        { url: 'https://google.com', title: 'Google', proxyId: '550e8400-e29b-41d4-a716-446655440000' }
      ];
      const windowBounds = { x: 0, y: 0, width: 1200, height: 800 };

      const session = await manager.saveSession('My Session', tabs, windowBounds);

      expect(session.id).toBeDefined();
      expect(session.name).toBe('My Session');
      expect(session.tabs).toHaveLength(1);
      expect(session.windowBounds).toEqual(windowBounds);
      expect(mockDb.execute).toHaveBeenCalled();
    });

    it('should emit session:saved event', async () => {
      const listener = vi.fn();
      manager.on('session:saved', listener);

      await manager.saveSession('Test', [], { x: 0, y: 0, width: 800, height: 600 });

      expect(listener).toHaveBeenCalled();
    });
  });

  describe('loadSession', () => {
    it('should load existing session', async () => {
      const mockSession = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Session',
        tabs: JSON.stringify([{ url: 'https://test.com', title: 'Test' }]),
        window_bounds: JSON.stringify({ x: 0, y: 0, width: 1200, height: 800 }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      (mockDb.queryOne as any).mockReturnValue(mockSession);

      const session = await manager.loadSession('550e8400-e29b-41d4-a716-446655440000');

      expect(session).toBeDefined();
      expect(session?.name).toBe('Test Session');
      expect(session?.tabs).toHaveLength(1);
    });

    it('should return null for non-existent session', async () => {
      (mockDb.queryOne as any).mockReturnValue(null);

      const session = await manager.loadSession('550e8400-e29b-41d4-a716-446655440000');

      expect(session).toBeNull();
    });
  });

  describe('deleteSession', () => {
    it('should delete existing session', async () => {
      const result = await manager.deleteSession('550e8400-e29b-41d4-a716-446655440000');

      expect(result).toBe(true);
      expect(mockDb.execute).toHaveBeenCalled();
    });

    it('should return false when delete fails', async () => {
      (mockDb.execute as any).mockReturnValue({ changes: 0 });

      const result = await manager.deleteSession('550e8400-e29b-41d4-a716-446655440000');

      expect(result).toBe(false);
    });
  });
});

/**
 * SECURITY FIX 4: Session URL Validation Tests
 */
describe('SessionManager Security', () => {
  let manager: SessionManager;

  const mockDb = {
    query: vi.fn(() => []),
    queryOne: vi.fn(),
    execute: vi.fn(() => ({ changes: 1 })),
    close: vi.fn()
  } as unknown as DatabaseManager;

  beforeEach(() => {
    manager = new SessionManager(mockDb);
    vi.clearAllMocks();
  });

  describe('SSRF Prevention on Restore', () => {
    it('should filter localhost URLs', async () => {
      const mockSession = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Session',
        tabs: JSON.stringify([
          { url: 'http://localhost/admin', title: 'Admin' },
          { url: 'https://safe-site.com/', title: 'Safe' },
        ]),
        window_bounds: JSON.stringify({ x: 0, y: 0, width: 1200, height: 800 }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      (mockDb.queryOne as any).mockReturnValue(mockSession);

      const session = await manager.loadSession(mockSession.id);

      expect(session).toBeDefined();
      expect(session?.tabs).toHaveLength(1);
      expect(session?.tabs[0].url).toBe('https://safe-site.com/');
    });

    it('should filter AWS metadata URLs', async () => {
      const mockSession = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Session',
        tabs: JSON.stringify([
          { url: 'http://169.254.169.254/latest/meta-data/', title: 'Metadata' },
          { url: 'https://example.com/', title: 'Example' },
        ]),
        window_bounds: JSON.stringify({ x: 0, y: 0, width: 1200, height: 800 }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      (mockDb.queryOne as any).mockReturnValue(mockSession);

      const session = await manager.loadSession(mockSession.id);

      expect(session?.tabs).toHaveLength(1);
      expect(session?.tabs[0].url).not.toContain('169.254');
    });

    it('should filter private IP URLs', async () => {
      const mockSession = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Session',
        tabs: JSON.stringify([
          { url: 'http://192.168.1.1/', title: 'Router' },
          { url: 'http://10.0.0.1/admin', title: 'Internal' },
          { url: 'http://172.16.0.1/', title: 'Private' },
          { url: 'https://public-site.com/', title: 'Public' },
        ]),
        window_bounds: JSON.stringify({ x: 0, y: 0, width: 1200, height: 800 }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      (mockDb.queryOne as any).mockReturnValue(mockSession);

      const session = await manager.loadSession(mockSession.id);

      expect(session?.tabs).toHaveLength(1);
      expect(session?.tabs[0].url).toBe('https://public-site.com/');
    });

    it('should filter 127.0.0.1 URLs', async () => {
      const mockSession = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Session',
        tabs: JSON.stringify([
          { url: 'http://127.0.0.1:8080/', title: 'Local' },
          { url: 'https://safe.com/', title: 'Safe' },
        ]),
        window_bounds: JSON.stringify({ x: 0, y: 0, width: 1200, height: 800 }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      (mockDb.queryOne as any).mockReturnValue(mockSession);

      const session = await manager.loadSession(mockSession.id);

      expect(session?.tabs).toHaveLength(1);
      expect(session?.tabs[0].url).toBe('https://safe.com/');
    });
  });

  describe('JavaScript URL Prevention', () => {
    it('should filter javascript: URLs', async () => {
      const mockSession = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Session',
        tabs: JSON.stringify([
          { url: 'javascript:alert(document.cookie)', title: 'XSS' },
          { url: 'https://safe.com/', title: 'Safe' },
        ]),
        window_bounds: JSON.stringify({ x: 0, y: 0, width: 1200, height: 800 }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      (mockDb.queryOne as any).mockReturnValue(mockSession);

      const session = await manager.loadSession(mockSession.id);

      expect(session?.tabs).toHaveLength(1);
      expect(session?.tabs[0].url).not.toContain('javascript:');
    });

    it('should filter data: URLs', async () => {
      const mockSession = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Session',
        tabs: JSON.stringify([
          { url: 'data:text/html,<script>alert(1)</script>', title: 'Data XSS' },
          { url: 'https://safe.com/', title: 'Safe' },
        ]),
        window_bounds: JSON.stringify({ x: 0, y: 0, width: 1200, height: 800 }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      (mockDb.queryOne as any).mockReturnValue(mockSession);

      const session = await manager.loadSession(mockSession.id);

      expect(session?.tabs).toHaveLength(1);
      expect(session?.tabs[0].url).not.toContain('data:');
    });
  });

  describe('File URL Prevention', () => {
    it('should filter file:// URLs', async () => {
      const mockSession = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Session',
        tabs: JSON.stringify([
          { url: 'file:///etc/passwd', title: 'Passwd' },
          { url: 'file:///C:/Windows/System32/config/SAM', title: 'SAM' },
          { url: 'https://safe.com/', title: 'Safe' },
        ]),
        window_bounds: JSON.stringify({ x: 0, y: 0, width: 1200, height: 800 }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      (mockDb.queryOne as any).mockReturnValue(mockSession);

      const session = await manager.loadSession(mockSession.id);

      expect(session?.tabs).toHaveLength(1);
      expect(session?.tabs[0].url).not.toContain('file://');
    });
  });

  describe('Security Event Logging', () => {
    it('should log filtered URLs', async () => {
      const mockSession = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Session',
        tabs: JSON.stringify([
          { url: 'http://localhost/', title: 'Local' },
        ]),
        window_bounds: JSON.stringify({ x: 0, y: 0, width: 1200, height: 800 }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      (mockDb.queryOne as any).mockReturnValue(mockSession);

      const securityListener = vi.fn();
      manager.on('security:event', securityListener);

      await manager.loadSession(mockSession.id);

      expect(securityListener).toHaveBeenCalled();
      const event = securityListener.mock.calls[0][0];
      expect(event.type).toBe('dangerous_url_filtered');
    });

    it('should provide security events for monitoring', async () => {
      const mockSession = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Session',
        tabs: JSON.stringify([
          { url: 'http://127.0.0.1/', title: 'Local' },
        ]),
        window_bounds: JSON.stringify({ x: 0, y: 0, width: 1200, height: 800 }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      (mockDb.queryOne as any).mockReturnValue(mockSession);

      await manager.loadSession(mockSession.id);

      const events = manager.getSecurityEvents();
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].type).toBe('dangerous_url_filtered');
    });

    it('should clear security events', async () => {
      const mockSession = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Session',
        tabs: JSON.stringify([
          { url: 'http://localhost/', title: 'Local' },
        ]),
        window_bounds: JSON.stringify({ x: 0, y: 0, width: 1200, height: 800 }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      (mockDb.queryOne as any).mockReturnValue(mockSession);

      await manager.loadSession(mockSession.id);
      expect(manager.getSecurityEvents().length).toBeGreaterThan(0);

      manager.clearSecurityEvents();
      expect(manager.getSecurityEvents().length).toBe(0);
    });
  });

  describe('Session ID Validation', () => {
    it('should reject invalid session IDs', async () => {
      const result = await manager.loadSession('invalid-id');
      expect(result).toBeNull();
    });

    it('should reject path traversal attempts', async () => {
      const result = await manager.loadSession('../../../etc/passwd');
      expect(result).toBeNull();
    });

    it('should accept valid UUIDs', async () => {
      const mockSession = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Session',
        tabs: JSON.stringify([]),
        window_bounds: JSON.stringify({ x: 0, y: 0, width: 1200, height: 800 }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      (mockDb.queryOne as any).mockReturnValue(mockSession);

      const session = await manager.loadSession(mockSession.id);
      expect(session).toBeDefined();
    });

    it('should reject delete with invalid ID', async () => {
      const result = await manager.deleteSession('invalid-id');
      expect(result).toBe(false);
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize session names', async () => {
      const tabs = [{ url: 'https://example.com/', title: 'Example' }];
      const windowBounds = { x: 0, y: 0, width: 1200, height: 800 };

      await manager.saveSession('<script>alert(1)</script>', tabs, windowBounds);

      const savedCall = (mockDb.execute as any).mock.calls[0];
      const savedName = savedCall[1][1];
      expect(savedName).not.toContain('<script>');
    });

    it('should sanitize tab titles', async () => {
      const mockSession = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test',
        tabs: JSON.stringify([
          { url: 'https://example.com/', title: '<img src=x onerror=alert(1)>' },
        ]),
        window_bounds: JSON.stringify({ x: 0, y: 0, width: 1200, height: 800 }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      (mockDb.queryOne as any).mockReturnValue(mockSession);

      const session = await manager.loadSession(mockSession.id);

      expect(session?.tabs[0].title).not.toContain('<');
      expect(session?.tabs[0].title).not.toContain('>');
    });
  });

  describe('Window Bounds Validation', () => {
    it('should use safe defaults for invalid bounds', async () => {
      const mockSession = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test',
        tabs: JSON.stringify([]),
        window_bounds: JSON.stringify({ x: 'invalid', y: null, width: -100, height: 99999 }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      (mockDb.queryOne as any).mockReturnValue(mockSession);

      const session = await manager.loadSession(mockSession.id);

      expect(session?.windowBounds.width).toBeGreaterThan(0);
      expect(session?.windowBounds.height).toBeGreaterThan(0);
    });
  });

  describe('getAllSessions URL Re-validation', () => {
    it('should re-validate URLs when getting all sessions', async () => {
      const mockSessions = [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          name: 'Session 1',
          tabs: JSON.stringify([
            { url: 'http://localhost/', title: 'Bad' },
            { url: 'https://safe.com/', title: 'Good' },
          ]),
          window_bounds: JSON.stringify({ x: 0, y: 0, width: 1200, height: 800 }),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
      ];

      (mockDb.query as any).mockReturnValue(mockSessions);

      const sessions = await manager.getAllSessions();

      expect(sessions[0].tabs).toHaveLength(1);
      expect(sessions[0].tabs[0].url).toBe('https://safe.com/');
    });
  });
});

/**
 * Session Manager Tests
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
        { url: 'https://google.com', title: 'Google', proxyId: 'proxy1' }
      ];
      const windowBounds = { x: 0, y: 0, width: 1200, height: 800 };

      const session = await manager.saveSession('My Session', tabs, windowBounds);

      expect(session.id).toBeDefined();
      expect(session.name).toBe('My Session');
      expect(session.tabs).toEqual(tabs);
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
        id: 'test-id',
        name: 'Test Session',
        tabs: JSON.stringify([{ url: 'https://test.com', title: 'Test' }]),
        window_bounds: JSON.stringify({ x: 0, y: 0, width: 1200, height: 800 }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      (mockDb.queryOne as any).mockReturnValue(mockSession);

      const session = await manager.loadSession('test-id');

      expect(session).toBeDefined();
      expect(session?.name).toBe('Test Session');
      expect(session?.tabs).toHaveLength(1);
    });

    it('should return null for non-existent session', async () => {
      (mockDb.queryOne as any).mockReturnValue(null);

      const session = await manager.loadSession('non-existent');

      expect(session).toBeNull();
    });
  });

  describe('deleteSession', () => {
    it('should delete existing session', async () => {
      const result = await manager.deleteSession('test-id');

      expect(result).toBe(true);
      expect(mockDb.execute).toHaveBeenCalled();
    });

    it('should return false when delete fails', async () => {
      (mockDb.execute as any).mockReturnValue({ changes: 0 });

      const result = await manager.deleteSession('non-existent');

      expect(result).toBe(false);
    });
  });
});

/**
 * Automation Manager Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AutomationManager } from '../../electron/core/automation/manager';
import type { DatabaseManager } from '../../electron/database';

// Mock DatabaseManager
const mockDb = {
  query: vi.fn(),
  queryOne: vi.fn(),
  execute: vi.fn(),
  close: vi.fn()
} as unknown as DatabaseManager;

describe('AutomationManager', () => {
  let manager: AutomationManager;

  beforeEach(() => {
    manager = new AutomationManager(mockDb);
    vi.clearAllMocks();
  });

  describe('startSession', () => {
    it('should create automation session with tasks', async () => {
      const config = {
        keywords: ['test1', 'test2'],
        engine: 'google' as const,
        targetDomains: ['example.com'],
        maxRetries: 3,
        delayBetweenSearches: 3000,
        useRandomProxy: true,
        clickThrough: true,
        simulateHumanBehavior: true
      };

      const session = await manager.startSession(config);

      expect(session.id).toBeDefined();
      expect(session.tasks).toHaveLength(2);
      expect(session.tasks[0].keyword).toBe('test1');
      expect(session.tasks[1].keyword).toBe('test2');
      expect(session.status).toBe('active');
    });

    it('should emit session:started event', async () => {
      const listener = vi.fn();
      manager.on('session:started', listener);

      const config = {
        keywords: ['test'],
        engine: 'google' as const,
        targetDomains: [],
        maxRetries: 3,
        delayBetweenSearches: 3000,
        useRandomProxy: false,
        clickThrough: false,
        simulateHumanBehavior: false
      };

      await manager.startSession(config);

      expect(listener).toHaveBeenCalled();
    });
  });

  describe('stopSession', () => {
    it('should stop active session', async () => {
      const config = {
        keywords: ['test'],
        engine: 'google' as const,
        targetDomains: [],
        maxRetries: 3,
        delayBetweenSearches: 3000,
        useRandomProxy: false,
        clickThrough: false,
        simulateHumanBehavior: false
      };

      const session = await manager.startSession(config);
      const result = manager.stopSession(session.id);

      expect(result).toBe(true);
      
      const stoppedSession = manager.getSession(session.id);
      expect(stoppedSession?.status).toBe('stopped');
    });

    it('should return false for non-existent session', () => {
      const result = manager.stopSession('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('addKeyword', () => {
    it('should add keyword to existing session', async () => {
      const config = {
        keywords: ['test1'],
        engine: 'google' as const,
        targetDomains: [],
        maxRetries: 3,
        delayBetweenSearches: 3000,
        useRandomProxy: false,
        clickThrough: false,
        simulateHumanBehavior: false
      };

      const session = await manager.startSession(config);
      const task = await manager.addKeyword(session.id, 'test2');

      expect(task.keyword).toBe('test2');
      expect(task.sessionId).toBe(session.id);
      
      const updatedSession = manager.getSession(session.id);
      expect(updatedSession?.tasks).toHaveLength(2);
    });
  });

  describe('getAllSessions', () => {
    it('should return all sessions', async () => {
      const config = {
        keywords: ['test'],
        engine: 'google' as const,
        targetDomains: [],
        maxRetries: 3,
        delayBetweenSearches: 3000,
        useRandomProxy: false,
        clickThrough: false,
        simulateHumanBehavior: false
      };

      await manager.startSession(config);
      await manager.startSession(config);

      const sessions = manager.getAllSessions();
      expect(sessions).toHaveLength(2);
    });
  });
});

/**
 * KeywordQueue Unit Tests
 * Tests for keyword queue management in automation
 * 
 * Following TDD pattern: Tests written first, implementation verified
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KeywordQueue, QueuedKeyword, KeywordQueueConfig } from '@electron/core/automation/keyword-queue';

// ============================================================================
// TESTS
// ============================================================================

describe('KeywordQueue', () => {
  let queue: KeywordQueue;

  beforeEach(() => {
    queue = new KeywordQueue();
  });

  // --------------------------------------------------------------------------
  // Initialization Tests
  // --------------------------------------------------------------------------
  describe('initialization', () => {
    it('should create empty queue with default config', () => {
      expect(queue.size).toBe(0);
      expect(queue.isEmpty).toBe(true);
      expect(queue.isFull).toBe(false);
    });

    it('should accept custom configuration', () => {
      const customQueue = new KeywordQueue({
        maxSize: 100,
        deduplication: false,
        priorityEnabled: false,
        defaultMaxRetries: 5,
      });
      expect(customQueue.size).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Add Keyword Tests
  // --------------------------------------------------------------------------
  describe('add', () => {
    it('should add keyword to queue', () => {
      const result = queue.add('test keyword');
      
      expect(result).not.toBeNull();
      expect(result?.keyword).toBe('test keyword');
      expect(result?.status).toBe('pending');
      expect(result?.retryCount).toBe(0);
      expect(queue.size).toBe(1);
    });

    it('should trim whitespace from keywords', () => {
      const result = queue.add('  trimmed keyword  ');
      
      expect(result?.keyword).toBe('trimmed keyword');
    });

    it('should reject empty keywords', () => {
      const result = queue.add('');
      
      expect(result).toBeNull();
      expect(queue.size).toBe(0);
    });

    it('should reject whitespace-only keywords', () => {
      const result = queue.add('   ');
      
      expect(result).toBeNull();
      expect(queue.size).toBe(0);
    });

    it('should prevent duplicate keywords by default', () => {
      queue.add('duplicate');
      const result = queue.add('duplicate');
      
      expect(result).toBeNull();
      expect(queue.size).toBe(1);
    });

    it('should handle case-insensitive deduplication', () => {
      queue.add('Test Keyword');
      const result = queue.add('test keyword');
      
      expect(result).toBeNull();
      expect(queue.size).toBe(1);
    });

    it('should allow duplicates when deduplication is disabled', () => {
      const customQueue = new KeywordQueue({ deduplication: false });
      customQueue.add('duplicate');
      const result = customQueue.add('duplicate');
      
      expect(result).not.toBeNull();
      expect(customQueue.size).toBe(2);
    });

    it('should respect maxSize limit', () => {
      const smallQueue = new KeywordQueue({ maxSize: 3 });
      smallQueue.add('keyword1');
      smallQueue.add('keyword2');
      smallQueue.add('keyword3');
      const result = smallQueue.add('keyword4');
      
      expect(result).toBeNull();
      expect(smallQueue.size).toBe(3);
      expect(smallQueue.isFull).toBe(true);
    });

    it('should assign priority to keywords', () => {
      queue.add('low priority', { priority: 1 });
      queue.add('high priority', { priority: 10 });
      queue.add('medium priority', { priority: 5 });
      
      const all = queue.getAll();
      expect(all[0].keyword).toBe('high priority');
      expect(all[1].keyword).toBe('medium priority');
      expect(all[2].keyword).toBe('low priority');
    });

    it('should accept metadata with keywords', () => {
      const result = queue.add('keyword with meta', {
        metadata: { source: 'test', category: 'demo' }
      });
      
      expect(result?.metadata).toEqual({ source: 'test', category: 'demo' });
    });
  });

  // --------------------------------------------------------------------------
  // Bulk Add Tests
  // --------------------------------------------------------------------------
  describe('addBulk', () => {
    it('should add multiple keywords at once', () => {
      const keywords = ['keyword1', 'keyword2', 'keyword3'];
      const results = queue.addBulk(keywords);
      
      expect(results).toHaveLength(3);
      expect(queue.size).toBe(3);
    });

    it('should skip duplicates in bulk add', () => {
      const keywords = ['keyword1', 'keyword2', 'keyword1', 'keyword3'];
      const results = queue.addBulk(keywords);
      
      expect(results).toHaveLength(3);
      expect(queue.size).toBe(3);
    });

    it('should skip empty strings in bulk add', () => {
      const keywords = ['keyword1', '', 'keyword2', '  '];
      const results = queue.addBulk(keywords);
      
      expect(results).toHaveLength(2);
      expect(queue.size).toBe(2);
    });

    it('should apply options to all keywords in bulk', () => {
      const keywords = ['kw1', 'kw2'];
      const results = queue.addBulk(keywords, { priority: 5 });
      
      expect(results[0].priority).toBe(5);
      expect(results[1].priority).toBe(5);
    });
  });

  // --------------------------------------------------------------------------
  // Queue Processing Tests
  // --------------------------------------------------------------------------
  describe('next', () => {
    it('should return next pending keyword', () => {
      queue.add('keyword1');
      queue.add('keyword2');
      
      const next = queue.next();
      
      expect(next?.keyword).toBe('keyword1');
      expect(next?.status).toBe('processing');
    });

    it('should return null when queue is empty', () => {
      const next = queue.next();
      
      expect(next).toBeNull();
    });

    it('should skip already processing keywords', () => {
      queue.add('keyword1');
      queue.add('keyword2');
      
      queue.next(); // keyword1 now processing
      const next = queue.next();
      
      expect(next?.keyword).toBe('keyword2');
    });

    it('should respect priority order when getting next', () => {
      queue.add('low', { priority: 1 });
      queue.add('high', { priority: 10 });
      
      const next = queue.next();
      
      expect(next?.keyword).toBe('high');
    });
  });

  // --------------------------------------------------------------------------
  // Complete/Fail Tests
  // --------------------------------------------------------------------------
  describe('complete', () => {
    it('should mark keyword as completed', () => {
      const added = queue.add('keyword')!;
      queue.next(); // start processing
      
      const result = queue.complete(added.id);
      
      expect(result).toBe(true);
      expect(queue.getStats().completed).toBe(1);
    });

    it('should return false for non-existent keyword', () => {
      const result = queue.complete('non-existent-id');
      
      expect(result).toBe(false);
    });
  });

  describe('fail', () => {
    it('should mark keyword as failed and retry', () => {
      const added = queue.add('keyword', { maxRetries: 3 })!;
      queue.next();
      
      queue.fail(added.id, true);
      
      const keyword = queue.getAll().find(k => k.id === added.id);
      expect(keyword?.status).toBe('pending');
      expect(keyword?.retryCount).toBe(1);
    });

    it('should mark as failed when max retries exceeded', () => {
      const added = queue.add('keyword', { maxRetries: 1 })!;
      queue.next();
      
      queue.fail(added.id, true); // First failure, now at max
      
      const keyword = queue.getAll().find(k => k.id === added.id);
      expect(keyword?.status).toBe('failed');
    });

    it('should immediately fail when retry is false', () => {
      const added = queue.add('keyword', { maxRetries: 5 })!;
      queue.next();
      
      queue.fail(added.id, false);
      
      const keyword = queue.getAll().find(k => k.id === added.id);
      expect(keyword?.status).toBe('failed');
    });

    it('should return false for non-existent keyword', () => {
      const result = queue.fail('non-existent-id');
      
      expect(result).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Remove/Clear Tests
  // --------------------------------------------------------------------------
  describe('remove', () => {
    it('should remove keyword from queue', () => {
      const added = queue.add('keyword')!;
      
      const result = queue.remove(added.id);
      
      expect(result).toBe(true);
      expect(queue.size).toBe(0);
    });

    it('should return false for non-existent keyword', () => {
      const result = queue.remove('non-existent-id');
      
      expect(result).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all keywords from queue', () => {
      queue.addBulk(['kw1', 'kw2', 'kw3']);
      
      queue.clear();
      
      expect(queue.size).toBe(0);
      expect(queue.isEmpty).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Statistics Tests
  // --------------------------------------------------------------------------
  describe('getStats', () => {
    it('should return accurate statistics', () => {
      // Add 5 keywords - all start as 'pending'
      queue.add('keyword1');
      queue.add('keyword2');
      queue.add('keyword3');
      queue.add('keyword4');
      queue.add('keyword5');
      
      // Process first -> changes to 'processing', then complete
      const first = queue.next()!;
      queue.complete(first.id);
      
      // Process second -> changes to 'processing', then fail
      const second = queue.next()!;
      queue.fail(second.id, false);
      
      // Process third -> stays as 'processing'
      queue.next();
      
      // keyword4 and keyword5 remain 'pending'
      const stats = queue.getStats();
      
      expect(stats.total).toBe(5);
      expect(stats.pending).toBe(2);
      expect(stats.processing).toBe(1);
      expect(stats.completed).toBe(1);
      expect(stats.failed).toBe(1);
    });

    it('should return zero stats for empty queue', () => {
      const stats = queue.getStats();
      
      expect(stats.total).toBe(0);
      expect(stats.pending).toBe(0);
      expect(stats.processing).toBe(0);
      expect(stats.completed).toBe(0);
      expect(stats.failed).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Edge Cases
  // --------------------------------------------------------------------------
  describe('edge cases', () => {
    it('should handle special characters in keywords', () => {
      const specialKeywords = [
        'keyword with spaces',
        'keyword-with-dashes',
        'keyword_with_underscores',
        'keyword.with.dots',
        'keyword/with/slashes',
        'keyword?with=query&params',
        'keyword#with#hash',
        'keyword+with+plus',
      ];
      
      const results = queue.addBulk(specialKeywords);
      
      expect(results).toHaveLength(specialKeywords.length);
    });

    it('should handle unicode keywords', () => {
      const unicodeKeywords = [
        '日本語キーワード',
        '한국어 키워드',
        '中文关键词',
        'Ключевое слово',
        'מילת מפתח',
        '🔍 emoji keyword',
      ];
      
      const results = queue.addBulk(unicodeKeywords);
      
      expect(results).toHaveLength(unicodeKeywords.length);
    });

    it('should handle very long keywords', () => {
      const longKeyword = 'a'.repeat(1000);
      const result = queue.add(longKeyword);
      
      expect(result).not.toBeNull();
      expect(result?.keyword).toBe(longKeyword);
    });

    it('should handle rapid add/remove cycles', () => {
      for (let i = 0; i < 100; i++) {
        const added = queue.add(`keyword${i}`);
        if (added && i % 2 === 0) {
          queue.remove(added.id);
        }
      }
      
      expect(queue.size).toBe(50);
    });

    it('should maintain queue integrity after multiple operations', () => {
      // Add keywords: kw1, kw2, kw3, kw4, kw5 (all pending)
      queue.addBulk(['kw1', 'kw2', 'kw3', 'kw4', 'kw5']);
      
      // Process kw1 -> complete (1 completed)
      const first = queue.next()!;
      queue.complete(first.id);
      
      // Process kw2 -> fail with retry (goes back to pending)
      const second = queue.next()!;
      queue.fail(second.id, true);
      
      // Process kw3 -> remove from queue
      const third = queue.next()!;
      queue.remove(third.id);
      
      // Add kw6 (pending)
      queue.add('kw6');
      
      // Final state:
      // - kw1: completed (1)
      // - kw2: pending (retried)
      // - kw3: removed
      // - kw4: pending
      // - kw5: pending
      // - kw6: pending
      // Total: 5 (6 added - 1 removed)
      // Pending: 4 (kw2, kw4, kw5, kw6)
      const stats = queue.getStats();
      expect(stats.total).toBe(5); // 5 - 1 removed + 1 added
      expect(stats.completed).toBe(1);
      expect(stats.pending).toBe(4); // kw2 (retried), kw4, kw5, kw6
    });
  });

  // --------------------------------------------------------------------------
  // Persistence Tests (PRD SA-001 Acceptance Criterion #10)
  // "Queue persists across restarts"
  // --------------------------------------------------------------------------
  describe('persistence (PRD SA-001 #10)', () => {
    it('should support session ID for persistence grouping', () => {
      const sessionQueue = new KeywordQueue({ sessionId: 'test-session-123' });
      expect(sessionQueue.sessionId).toBe('test-session-123');
    });

    it('should generate default session ID if not provided', () => {
      const sessionQueue = new KeywordQueue();
      expect(sessionQueue.sessionId).toBeDefined();
      expect(typeof sessionQueue.sessionId).toBe('string');
      expect(sessionQueue.sessionId.length).toBeGreaterThan(0);
    });

    it('should export queue state for persistence', () => {
      queue.add('keyword1', { priority: 5 });
      queue.add('keyword2', { priority: 10 });
      
      const exported = queue.exportState();
      
      expect(exported.keywords).toHaveLength(2);
      expect(exported.sessionId).toBeDefined();
      expect(exported.keywords[0].keyword).toBe('keyword2'); // Higher priority first
      expect(exported.keywords[1].keyword).toBe('keyword1');
    });

    it('should import queue state for restoration', () => {
      const state = {
        sessionId: 'restored-session',
        keywords: [
          {
            id: 'kw-1',
            keyword: 'restored keyword 1',
            priority: 5,
            addedAt: new Date().toISOString(),
            status: 'pending' as const,
            retryCount: 0,
            maxRetries: 3,
          },
          {
            id: 'kw-2',
            keyword: 'restored keyword 2',
            priority: 10,
            addedAt: new Date().toISOString(),
            status: 'completed' as const,
            retryCount: 1,
            maxRetries: 3,
          },
        ],
      };
      
      const restoredQueue = KeywordQueue.fromState(state);
      
      expect(restoredQueue.sessionId).toBe('restored-session');
      expect(restoredQueue.size).toBe(2);
      expect(restoredQueue.getStats().pending).toBe(1);
      expect(restoredQueue.getStats().completed).toBe(1);
    });

    it('should preserve keyword status during export/import cycle', () => {
      // Add keywords with different priorities to control order
      queue.add('pending-kw', { priority: 1 });      // Will stay pending (lowest priority)
      queue.add('processing-kw', { priority: 2 });   // Will be processing
      queue.add('completed-kw', { priority: 3 });    // Will be completed (highest priority, processed first)
      
      // Process highest priority first (completed-kw)
      const first = queue.next()!;
      expect(first.keyword).toBe('completed-kw');
      queue.complete(first.id);
      
      // Process next (processing-kw) but don't complete
      const second = queue.next()!;
      expect(second.keyword).toBe('processing-kw');
      // Leave as processing
      
      // pending-kw stays pending
      
      const exported = queue.exportState();
      const restoredQueue = KeywordQueue.fromState(exported);
      
      const stats = restoredQueue.getStats();
      expect(stats.pending).toBe(1);
      expect(stats.processing).toBe(1);
      expect(stats.completed).toBe(1);
    });

    it('should preserve retry count during restoration', () => {
      const kw = queue.add('retry-keyword', { maxRetries: 3 })!;
      queue.next();
      queue.fail(kw.id, true); // retryCount = 1
      queue.next();
      queue.fail(kw.id, true); // retryCount = 2
      
      const exported = queue.exportState();
      const restoredQueue = KeywordQueue.fromState(exported);
      
      const restored = restoredQueue.getAll().find(k => k.keyword === 'retry-keyword');
      expect(restored?.retryCount).toBe(2);
    });

    it('should preserve metadata during restoration', () => {
      queue.add('meta-keyword', {
        metadata: { source: 'test', tags: ['important', 'urgent'] }
      });
      
      const exported = queue.exportState();
      const restoredQueue = KeywordQueue.fromState(exported);
      
      const restored = restoredQueue.getAll()[0];
      expect(restored.metadata).toEqual({ source: 'test', tags: ['important', 'urgent'] });
    });
  });
});

/**
 * KeywordQueueRepository Unit Tests
 * Tests for database persistence of keyword queue (PRD SA-001 #10)
 * 
 * Following TDD pattern: Tests for database operations
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { KeywordQueueRepository } from '@electron/database/repositories/keyword-queue.repository';
import { MIGRATION_006_SQL } from '@electron/database/migrations/embedded-sql/006-search-keywords.sql';

describe('KeywordQueueRepository', () => {
  let db: Database.Database;
  let repository: KeywordQueueRepository;

  beforeEach(() => {
    // Create in-memory database for testing
    db = new Database(':memory:');
    
    // Create required tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        checksum TEXT
      )
    `);
    
    // Run migration
    db.exec(MIGRATION_006_SQL);
    
    repository = new KeywordQueueRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  // --------------------------------------------------------------------------
  // Create Operations
  // --------------------------------------------------------------------------
  describe('create', () => {
    it('should create a keyword entry', () => {
      const keyword = repository.create({
        sessionId: 'session-1',
        keyword: 'test keyword',
        priority: 5,
      });

      expect(keyword).toBeDefined();
      expect(keyword.id).toBeDefined();
      expect(keyword.sessionId).toBe('session-1');
      expect(keyword.keyword).toBe('test keyword');
      expect(keyword.priority).toBe(5);
      expect(keyword.status).toBe('pending');
      expect(keyword.retryCount).toBe(0);
    });

    it('should create keyword with all optional fields', () => {
      const addedAt = new Date('2025-01-01');
      const keyword = repository.create({
        id: 'custom-id',
        sessionId: 'session-1',
        keyword: 'full keyword',
        priority: 10,
        status: 'processing',
        retryCount: 2,
        maxRetries: 5,
        metadata: { source: 'test', tags: ['important'] },
        addedAt,
      });

      expect(keyword.id).toBe('custom-id');
      expect(keyword.priority).toBe(10);
      expect(keyword.status).toBe('processing');
      expect(keyword.retryCount).toBe(2);
      expect(keyword.maxRetries).toBe(5);
      expect(keyword.metadata).toEqual({ source: 'test', tags: ['important'] });
    });

    it('should create multiple keywords in bulk', () => {
      const keywords = repository.createBulk([
        { sessionId: 'session-1', keyword: 'keyword 1' },
        { sessionId: 'session-1', keyword: 'keyword 2' },
        { sessionId: 'session-1', keyword: 'keyword 3' },
      ]);

      expect(keywords).toHaveLength(3);
      expect(keywords[0].keyword).toBe('keyword 1');
      expect(keywords[1].keyword).toBe('keyword 2');
      expect(keywords[2].keyword).toBe('keyword 3');
    });
  });

  // --------------------------------------------------------------------------
  // Read Operations
  // --------------------------------------------------------------------------
  describe('find', () => {
    beforeEach(() => {
      repository.createBulk([
        { sessionId: 'session-1', keyword: 'kw1', priority: 10, status: 'pending' },
        { sessionId: 'session-1', keyword: 'kw2', priority: 5, status: 'completed' },
        { sessionId: 'session-1', keyword: 'kw3', priority: 15, status: 'pending' },
        { sessionId: 'session-2', keyword: 'kw4', priority: 1, status: 'failed' },
      ]);
    });

    it('should find keyword by ID', () => {
      const created = repository.create({
        sessionId: 'session-test',
        keyword: 'find me',
      });

      const found = repository.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.keyword).toBe('find me');
    });

    it('should return null for non-existent ID', () => {
      const found = repository.findById('non-existent');

      expect(found).toBeNull();
    });

    it('should find all keywords for a session ordered by priority', () => {
      const keywords = repository.findBySession('session-1');

      expect(keywords).toHaveLength(3);
      expect(keywords[0].keyword).toBe('kw3'); // Priority 15 (highest)
      expect(keywords[1].keyword).toBe('kw1'); // Priority 10
      expect(keywords[2].keyword).toBe('kw2'); // Priority 5 (lowest)
    });

    it('should find keywords by status filter', () => {
      const pending = repository.findByFilter({
        sessionId: 'session-1',
        status: 'pending',
      });

      expect(pending).toHaveLength(2);
      expect(pending.every(k => k.status === 'pending')).toBe(true);
    });

    it('should find keywords by multiple statuses', () => {
      const keywords = repository.findByFilter({
        statuses: ['pending', 'failed'],
      });

      expect(keywords).toHaveLength(3); // 2 pending + 1 failed
    });
  });

  // --------------------------------------------------------------------------
  // Update Operations
  // --------------------------------------------------------------------------
  describe('update', () => {
    it('should update keyword status', () => {
      const created = repository.create({
        sessionId: 'session-1',
        keyword: 'update me',
      });

      const updated = repository.update(created.id, { status: 'completed' });

      expect(updated?.status).toBe('completed');
    });

    it('should update retry count', () => {
      const created = repository.create({
        sessionId: 'session-1',
        keyword: 'retry me',
      });

      const updated = repository.update(created.id, { retryCount: 3 });

      expect(updated?.retryCount).toBe(3);
    });

    it('should update multiple keywords status in batch', () => {
      const kw1 = repository.create({ sessionId: 's1', keyword: 'batch1' });
      const kw2 = repository.create({ sessionId: 's1', keyword: 'batch2' });
      const kw3 = repository.create({ sessionId: 's1', keyword: 'batch3' });

      const updated = repository.updateStatusBatch(
        [kw1.id, kw2.id, kw3.id],
        'completed'
      );

      expect(updated).toBe(3);
      expect(repository.findById(kw1.id)?.status).toBe('completed');
      expect(repository.findById(kw2.id)?.status).toBe('completed');
      expect(repository.findById(kw3.id)?.status).toBe('completed');
    });

    it('should return null when updating non-existent keyword', () => {
      const updated = repository.update('non-existent', { status: 'completed' });

      expect(updated).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // Delete Operations
  // --------------------------------------------------------------------------
  describe('delete', () => {
    it('should delete keyword by ID', () => {
      const created = repository.create({
        sessionId: 'session-1',
        keyword: 'delete me',
      });

      const deleted = repository.delete(created.id);

      expect(deleted).toBe(true);
      expect(repository.findById(created.id)).toBeNull();
    });

    it('should return false when deleting non-existent keyword', () => {
      const deleted = repository.delete('non-existent');

      expect(deleted).toBe(false);
    });

    it('should delete all keywords for a session', () => {
      repository.createBulk([
        { sessionId: 'session-to-delete', keyword: 'kw1' },
        { sessionId: 'session-to-delete', keyword: 'kw2' },
        { sessionId: 'session-to-keep', keyword: 'kw3' },
      ]);

      const deleted = repository.deleteBySession('session-to-delete');

      expect(deleted).toBe(2);
      expect(repository.findBySession('session-to-delete')).toHaveLength(0);
      expect(repository.findBySession('session-to-keep')).toHaveLength(1);
    });

    it('should delete keywords by session and status', () => {
      repository.createBulk([
        { sessionId: 's1', keyword: 'pending1', status: 'pending' },
        { sessionId: 's1', keyword: 'completed1', status: 'completed' },
        { sessionId: 's1', keyword: 'pending2', status: 'pending' },
      ]);

      const deleted = repository.deleteBySessionAndStatus('s1', 'completed');

      expect(deleted).toBe(1);
      expect(repository.findBySession('s1')).toHaveLength(2);
    });
  });

  // --------------------------------------------------------------------------
  // Statistics
  // --------------------------------------------------------------------------
  describe('statistics', () => {
    it('should get session statistics', () => {
      repository.createBulk([
        { sessionId: 's1', keyword: 'kw1', status: 'pending' },
        { sessionId: 's1', keyword: 'kw2', status: 'pending' },
        { sessionId: 's1', keyword: 'kw3', status: 'processing' },
        { sessionId: 's1', keyword: 'kw4', status: 'completed' },
        { sessionId: 's1', keyword: 'kw5', status: 'failed' },
      ]);

      const stats = repository.getSessionStats('s1');

      expect(stats.total).toBe(5);
      expect(stats.pending).toBe(2);
      expect(stats.processing).toBe(1);
      expect(stats.completed).toBe(1);
      expect(stats.failed).toBe(1);
    });

    it('should return zero stats for non-existent session', () => {
      const stats = repository.getSessionStats('non-existent');

      expect(stats.total).toBe(0);
      expect(stats.pending).toBe(0);
    });

    it('should get all session IDs', () => {
      repository.createBulk([
        { sessionId: 'session-a', keyword: 'kw1' },
        { sessionId: 'session-b', keyword: 'kw2' },
        { sessionId: 'session-a', keyword: 'kw3' },
      ]);

      const sessionIds = repository.getSessionIds();

      expect(sessionIds).toContain('session-a');
      expect(sessionIds).toContain('session-b');
      expect(sessionIds.length).toBe(2);
    });
  });

  // --------------------------------------------------------------------------
  // Deduplication
  // --------------------------------------------------------------------------
  describe('deduplication', () => {
    it('should check if keyword exists in session (case-insensitive)', () => {
      repository.create({
        sessionId: 'session-1',
        keyword: 'Test Keyword',
      });

      expect(repository.existsInSession('session-1', 'Test Keyword')).toBe(true);
      expect(repository.existsInSession('session-1', 'test keyword')).toBe(true);
      expect(repository.existsInSession('session-1', 'TEST KEYWORD')).toBe(true);
      expect(repository.existsInSession('session-1', 'Other Keyword')).toBe(false);
      expect(repository.existsInSession('session-2', 'Test Keyword')).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Persistence Across Restarts (PRD SA-001 #10)
  // --------------------------------------------------------------------------
  describe('persistence (PRD SA-001 #10)', () => {
    it('should persist keywords that survive simulated restart', () => {
      // Add keywords
      repository.createBulk([
        { sessionId: 'persist-session', keyword: 'keyword 1', priority: 10 },
        { sessionId: 'persist-session', keyword: 'keyword 2', priority: 5, status: 'completed' },
        { sessionId: 'persist-session', keyword: 'keyword 3', priority: 15, retryCount: 2 },
      ]);

      // Simulate restart by creating new repository with same database
      const newRepository = new KeywordQueueRepository(db);

      // Verify keywords persisted
      const keywords = newRepository.findBySession('persist-session');

      expect(keywords).toHaveLength(3);
      expect(keywords[0].keyword).toBe('keyword 3'); // Highest priority
      expect(keywords[0].retryCount).toBe(2);
      expect(keywords[1].keyword).toBe('keyword 1');
      expect(keywords[2].keyword).toBe('keyword 2');
      expect(keywords[2].status).toBe('completed');
    });

    it('should preserve metadata across persistence', () => {
      repository.create({
        sessionId: 'meta-session',
        keyword: 'keyword with metadata',
        metadata: { source: 'import', tags: ['priority', 'seo'] },
      });

      const newRepository = new KeywordQueueRepository(db);
      const keywords = newRepository.findBySession('meta-session');

      expect(keywords[0].metadata).toEqual({
        source: 'import',
        tags: ['priority', 'seo'],
      });
    });
  });
});

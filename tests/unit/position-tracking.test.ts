/**
 * Position Tracking Unit Tests
 * Tests for SERP position tracking and history
 * 
 * Following TDD pattern: Tests written first, implementation verified
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  PositionTracker,
  PositionRecord,
  PositionChange,
  PositionTrend,
  PositionTrackerConfig
} from '../../electron/core/automation/position-tracker';

// ============================================================================
// TESTS
// ============================================================================

describe('PositionTracker', () => {
  let tracker: PositionTracker;

  beforeEach(() => {
    tracker = new PositionTracker();
  });

  // --------------------------------------------------------------------------
  // Recording Tests
  // --------------------------------------------------------------------------
  describe('record', () => {
    it('should record a position', () => {
      const record = tracker.record({
        keyword: 'test keyword',
        domain: 'example.com',
        engine: 'google',
        position: 5,
        page: 1,
        url: 'https://example.com/page',
        title: 'Example Page',
        description: 'Description text',
      });

      expect(record.id).toBeDefined();
      expect(record.keyword).toBe('test keyword');
      expect(record.position).toBe(5);
      expect(record.timestamp).toBeInstanceOf(Date);
    });

    it('should record position not found (null)', () => {
      const record = tracker.record({
        keyword: 'test keyword',
        domain: 'notfound.com',
        engine: 'google',
        position: null,
        page: 10,
        url: '',
        title: '',
        description: '',
      });

      expect(record.position).toBeNull();
    });

    it('should emit position:recorded event', () => {
      const spy = vi.fn();
      tracker.on('position:recorded', spy);

      tracker.record({
        keyword: 'test',
        domain: 'example.com',
        engine: 'google',
        position: 1,
        page: 1,
        url: 'https://example.com',
        title: 'Test',
        description: 'Test',
      });

      expect(spy).toHaveBeenCalled();
    });

    it('should emit position:new for first record', () => {
      const spy = vi.fn();
      tracker.on('position:new', spy);

      tracker.record({
        keyword: 'new keyword',
        domain: 'example.com',
        engine: 'google',
        position: 1,
        page: 1,
        url: 'https://example.com',
        title: 'Test',
        description: 'Test',
      });

      expect(spy).toHaveBeenCalled();
    });

    it('should emit position:changed when position changes', () => {
      const spy = vi.fn();
      tracker.on('position:changed', spy);

      tracker.record({
        keyword: 'test',
        domain: 'example.com',
        engine: 'google',
        position: 5,
        page: 1,
        url: '',
        title: '',
        description: '',
      });

      tracker.record({
        keyword: 'test',
        domain: 'example.com',
        engine: 'google',
        position: 3,
        page: 1,
        url: '',
        title: '',
        description: '',
      });

      expect(spy).toHaveBeenCalled();
      expect(spy.mock.calls[0][0].direction).toBe('up');
    });

    it('should emit position:alert on significant change', () => {
      const spy = vi.fn();
      tracker.on('position:alert', spy);

      tracker.record({
        keyword: 'test',
        domain: 'example.com',
        engine: 'google',
        position: 5,
        page: 1,
        url: '',
        title: '',
        description: '',
      });

      tracker.record({
        keyword: 'test',
        domain: 'example.com',
        engine: 'google',
        position: 25,
        page: 3,
        url: '',
        title: '',
        description: '',
      });

      expect(spy).toHaveBeenCalled();
    });

    it('should enforce history limit', () => {
      const limitedTracker = new PositionTracker({ historyLimit: 5 });

      for (let i = 0; i < 10; i++) {
        limitedTracker.record({
          keyword: 'test',
          domain: 'example.com',
          engine: 'google',
          position: i + 1,
          page: 1,
          url: '',
          title: '',
          description: '',
        });
      }

      const history = limitedTracker.getHistory('test', 'example.com', 'google');
      expect(history.length).toBe(5);
      expect(history[0].position).toBe(6); // First 5 should be removed
    });
  });

  // --------------------------------------------------------------------------
  // History Tests
  // --------------------------------------------------------------------------
  describe('getHistory', () => {
    it('should return empty array for unknown keyword', () => {
      const history = tracker.getHistory('unknown', 'domain.com', 'google');
      expect(history).toEqual([]);
    });

    it('should return all records for keyword-domain pair', () => {
      tracker.record({ keyword: 'test', domain: 'example.com', engine: 'google', position: 1, page: 1, url: '', title: '', description: '' });
      tracker.record({ keyword: 'test', domain: 'example.com', engine: 'google', position: 2, page: 1, url: '', title: '', description: '' });
      tracker.record({ keyword: 'test', domain: 'example.com', engine: 'google', position: 3, page: 1, url: '', title: '', description: '' });

      const history = tracker.getHistory('test', 'example.com', 'google');
      expect(history).toHaveLength(3);
    });

    it('should separate history by engine', () => {
      tracker.record({ keyword: 'test', domain: 'example.com', engine: 'google', position: 1, page: 1, url: '', title: '', description: '' });
      tracker.record({ keyword: 'test', domain: 'example.com', engine: 'bing', position: 5, page: 1, url: '', title: '', description: '' });

      const googleHistory = tracker.getHistory('test', 'example.com', 'google');
      const bingHistory = tracker.getHistory('test', 'example.com', 'bing');

      expect(googleHistory).toHaveLength(1);
      expect(bingHistory).toHaveLength(1);
      expect(googleHistory[0].position).toBe(1);
      expect(bingHistory[0].position).toBe(5);
    });
  });

  // --------------------------------------------------------------------------
  // Latest Position Tests
  // --------------------------------------------------------------------------
  describe('getLatest', () => {
    it('should return null for unknown keyword', () => {
      expect(tracker.getLatest('unknown', 'domain.com', 'google')).toBeNull();
    });

    it('should return most recent record', () => {
      tracker.record({ keyword: 'test', domain: 'example.com', engine: 'google', position: 1, page: 1, url: '', title: '', description: '' });
      tracker.record({ keyword: 'test', domain: 'example.com', engine: 'google', position: 5, page: 1, url: '', title: '', description: '' });
      tracker.record({ keyword: 'test', domain: 'example.com', engine: 'google', position: 3, page: 1, url: '', title: '', description: '' });

      const latest = tracker.getLatest('test', 'example.com', 'google');
      expect(latest?.position).toBe(3);
    });
  });

  // --------------------------------------------------------------------------
  // Trend Analysis Tests
  // --------------------------------------------------------------------------
  describe('getTrend', () => {
    it('should return insufficient-data for no records', () => {
      const trend = tracker.getTrend('unknown', 'domain.com', 'google');
      
      expect(trend.trend).toBe('insufficient-data');
      expect(trend.dataPoints).toBe(0);
    });

    it('should return insufficient-data for single record', () => {
      tracker.record({ keyword: 'test', domain: 'example.com', engine: 'google', position: 5, page: 1, url: '', title: '', description: '' });

      const trend = tracker.getTrend('test', 'example.com', 'google');
      
      expect(trend.trend).toBe('insufficient-data');
      expect(trend.dataPoints).toBe(1);
      expect(trend.avgPosition).toBe(5);
    });

    it('should calculate improving trend', () => {
      // Positions getting better (lower)
      [10, 9, 8, 7, 6, 5, 4, 3, 2, 1].forEach(pos => {
        tracker.record({ keyword: 'test', domain: 'example.com', engine: 'google', position: pos, page: 1, url: '', title: '', description: '' });
      });

      const trend = tracker.getTrend('test', 'example.com', 'google');
      
      expect(trend.trend).toBe('improving');
      expect(trend.bestPosition).toBe(1);
      expect(trend.worstPosition).toBe(10);
    });

    it('should calculate declining trend', () => {
      // Positions getting worse (higher)
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].forEach(pos => {
        tracker.record({ keyword: 'test', domain: 'example.com', engine: 'google', position: pos, page: 1, url: '', title: '', description: '' });
      });

      const trend = tracker.getTrend('test', 'example.com', 'google');
      
      expect(trend.trend).toBe('declining');
    });

    it('should calculate stable trend', () => {
      // Positions staying similar
      [5, 5, 6, 5, 4, 5, 5, 6, 5, 5].forEach(pos => {
        tracker.record({ keyword: 'test', domain: 'example.com', engine: 'google', position: pos, page: 1, url: '', title: '', description: '' });
      });

      const trend = tracker.getTrend('test', 'example.com', 'google');
      
      expect(trend.trend).toBe('stable');
    });

    it('should calculate volatility', () => {
      // High volatility positions
      [1, 50, 2, 48, 3, 47, 4, 46, 5, 45].forEach(pos => {
        tracker.record({ keyword: 'test', domain: 'example.com', engine: 'google', position: pos, page: 1, url: '', title: '', description: '' });
      });

      const trend = tracker.getTrend('test', 'example.com', 'google');
      
      expect(trend.volatility).toBeGreaterThan(15);
    });

    it('should ignore null positions in trend calculation', () => {
      tracker.record({ keyword: 'test', domain: 'example.com', engine: 'google', position: 5, page: 1, url: '', title: '', description: '' });
      tracker.record({ keyword: 'test', domain: 'example.com', engine: 'google', position: null, page: 10, url: '', title: '', description: '' });
      tracker.record({ keyword: 'test', domain: 'example.com', engine: 'google', position: 3, page: 1, url: '', title: '', description: '' });

      const trend = tracker.getTrend('test', 'example.com', 'google');
      
      expect(trend.dataPoints).toBe(2);
    });
  });

  // --------------------------------------------------------------------------
  // Changes Tests
  // --------------------------------------------------------------------------
  describe('getChanges', () => {
    it('should return position changes', () => {
      tracker.record({ keyword: 'test', domain: 'example.com', engine: 'google', position: 5, page: 1, url: '', title: '', description: '' });
      tracker.record({ keyword: 'test', domain: 'example.com', engine: 'google', position: 3, page: 1, url: '', title: '', description: '' });
      tracker.record({ keyword: 'test', domain: 'example.com', engine: 'google', position: 7, page: 1, url: '', title: '', description: '' });

      const changes = tracker.getChanges('test', 'example.com', 'google');

      expect(changes).toHaveLength(2);
      expect(changes[0].direction).toBe('up');
      expect(changes[0].change).toBe(2); // 5 -> 3 = +2 improvement
      expect(changes[1].direction).toBe('down');
      expect(changes[1].change).toBe(-4); // 3 -> 7 = -4 decline
    });

    it('should detect new appearance', () => {
      tracker.record({ keyword: 'test', domain: 'example.com', engine: 'google', position: null, page: 10, url: '', title: '', description: '' });
      tracker.record({ keyword: 'test', domain: 'example.com', engine: 'google', position: 5, page: 1, url: '', title: '', description: '' });

      const changes = tracker.getChanges('test', 'example.com', 'google');

      expect(changes[0].direction).toBe('new');
    });

    it('should detect lost position', () => {
      tracker.record({ keyword: 'test', domain: 'example.com', engine: 'google', position: 5, page: 1, url: '', title: '', description: '' });
      tracker.record({ keyword: 'test', domain: 'example.com', engine: 'google', position: null, page: 10, url: '', title: '', description: '' });

      const changes = tracker.getChanges('test', 'example.com', 'google');

      expect(changes[0].direction).toBe('lost');
    });

    it('should filter by date', () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      tracker.record({ keyword: 'test', domain: 'example.com', engine: 'google', position: 5, page: 1, url: '', title: '', description: '' });
      tracker.record({ keyword: 'test', domain: 'example.com', engine: 'google', position: 3, page: 1, url: '', title: '', description: '' });

      const changes = tracker.getChanges('test', 'example.com', 'google', now);

      // Should only include changes from now onwards
      expect(changes.every(c => c.timestamp >= now)).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Export/Import Tests
  // --------------------------------------------------------------------------
  describe('export/import', () => {
    it('should export all records', () => {
      tracker.record({ keyword: 'kw1', domain: 'd1.com', engine: 'google', position: 1, page: 1, url: '', title: '', description: '' });
      tracker.record({ keyword: 'kw2', domain: 'd2.com', engine: 'bing', position: 5, page: 1, url: '', title: '', description: '' });

      const exported = tracker.export();

      expect(exported).toHaveLength(2);
    });

    it('should import records', () => {
      const records: PositionRecord[] = [
        { id: 'id-1', keyword: 'imported', domain: 'import.com', engine: 'google', position: 1, page: 1, url: '', title: '', description: '', timestamp: new Date() },
      ];

      const count = tracker.import(records);

      expect(count).toBe(1);
      expect(tracker.getLatest('imported', 'import.com', 'google')).not.toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // Clear Tests
  // --------------------------------------------------------------------------
  describe('clear', () => {
    it('should clear all data', () => {
      tracker.record({ keyword: 'test', domain: 'example.com', engine: 'google', position: 1, page: 1, url: '', title: '', description: '' });
      tracker.record({ keyword: 'test2', domain: 'example2.com', engine: 'bing', position: 1, page: 1, url: '', title: '', description: '' });

      tracker.clear();

      expect(tracker.export()).toHaveLength(0);
    });

    it('should clear specific pair', () => {
      tracker.record({ keyword: 'test1', domain: 'example.com', engine: 'google', position: 1, page: 1, url: '', title: '', description: '' });
      tracker.record({ keyword: 'test2', domain: 'example.com', engine: 'google', position: 1, page: 1, url: '', title: '', description: '' });

      const result = tracker.clearPair('test1', 'example.com', 'google');

      expect(result).toBe(true);
      expect(tracker.getLatest('test1', 'example.com', 'google')).toBeNull();
      expect(tracker.getLatest('test2', 'example.com', 'google')).not.toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // Tracked Pairs Tests
  // --------------------------------------------------------------------------
  describe('getTrackedPairs', () => {
    it('should return all tracked pairs', () => {
      tracker.record({ keyword: 'kw1', domain: 'd1.com', engine: 'google', position: 1, page: 1, url: '', title: '', description: '' });
      tracker.record({ keyword: 'kw2', domain: 'd2.com', engine: 'bing', position: 1, page: 1, url: '', title: '', description: '' });
      tracker.record({ keyword: 'kw1', domain: 'd1.com', engine: 'google', position: 2, page: 1, url: '', title: '', description: '' });

      const pairs = tracker.getTrackedPairs();

      expect(pairs).toHaveLength(2);
      expect(pairs).toContainEqual({ keyword: 'kw1', domain: 'd1.com', engine: 'google' });
      expect(pairs).toContainEqual({ keyword: 'kw2', domain: 'd2.com', engine: 'bing' });
    });
  });
});

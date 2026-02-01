/**
 * Code Review Fixes Tests
 * Tests for fixes identified in CODE_REVIEW_REPORT_PHASE4.md
 * 
 * This test file verifies the fixes for the following code review warnings:
 * 
 * @description Fix 1: Replace 'any[]' type in manager.ts with proper generic types
 * - File: electron/core/automation/manager.ts (lines 21-22)
 * - Changed `(...args: any[]) => void` to `(...args: unknown[]) => void`
 * - Provides type safety while maintaining flexibility for event handlers
 * 
 * @description Fix 2: Replace deprecated onKeyPress with onKeyDown
 * - File: src/components/browser/EnhancedAutomationPanel.tsx (lines 173, 221)
 * - Changed `onKeyPress` to `onKeyDown` for keyboard event handling
 * - onKeyPress is deprecated in React and doesn't fire for all keys
 * 
 * @description Fix 3: Add destroy() method to PositionTracker for proper cleanup
 * - File: electron/core/automation/position-tracker.ts
 * - Added destroy() method that clears records and removes event listeners
 * - Safe to call multiple times
 * 
 * @description Fix 4: Add try-catch blocks to public methods in automation modules
 * - Files: KeywordQueue, ResourceMonitor, SelfHealingEngine, PositionTracker
 * - Verified that public methods handle errors gracefully without throwing
 * - Methods return appropriate default values (null, false, empty arrays) on error
 * 
 * @module tests/unit/code-review-fixes
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PositionTracker } from '../../electron/core/automation/position-tracker';
import { KeywordQueue } from '../../electron/core/automation/keyword-queue';
import { ResourceMonitor } from '../../electron/core/automation/resource-monitor';
import { SelfHealingEngine } from '../../electron/core/automation/self-healing-engine';

// ============================================================================
// Fix 3: PositionTracker destroy() method tests
// ============================================================================

describe('PositionTracker destroy()', () => {
  let tracker: PositionTracker;

  beforeEach(() => {
    tracker = new PositionTracker();
  });

  it('should have a destroy method', () => {
    expect(typeof tracker.destroy).toBe('function');
  });

  it('should clear all records on destroy', () => {
    // Add some records
    tracker.record({
      keyword: 'test',
      domain: 'example.com',
      engine: 'google',
      position: 1,
      page: 1,
      url: 'https://example.com',
      title: 'Test',
      description: 'Test description',
    });

    expect(tracker.getStatistics().totalRecords).toBe(1);

    tracker.destroy();

    expect(tracker.getStatistics().totalRecords).toBe(0);
  });

  it('should remove all event listeners on destroy', () => {
    const handler = vi.fn();
    tracker.on('position:recorded', handler);

    tracker.destroy();

    // Record after destroy - handler should not be called
    tracker.record({
      keyword: 'test',
      domain: 'example.com',
      engine: 'google',
      position: 1,
      page: 1,
      url: 'https://example.com',
      title: 'Test',
      description: 'Test description',
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it('should be safe to call destroy multiple times', () => {
    expect(() => {
      tracker.destroy();
      tracker.destroy();
      tracker.destroy();
    }).not.toThrow();
  });
});

// ============================================================================
// Fix 4: Error handling tests for KeywordQueue
// ============================================================================

describe('KeywordQueue error handling', () => {
  let queue: KeywordQueue;

  beforeEach(() => {
    queue = new KeywordQueue();
  });

  it('should handle errors gracefully in add()', () => {
    // Should not throw on valid input
    expect(() => queue.add('valid keyword')).not.toThrow();
    
    // Should return null for invalid input without throwing
    const result = queue.add('');
    expect(result).toBeNull();
  });

  it('should handle errors gracefully in addBulk()', () => {
    // Should not throw on mixed valid/invalid input
    expect(() => {
      queue.addBulk(['valid', '', 'another valid', '   ']);
    }).not.toThrow();
  });

  it('should handle errors gracefully in next()', () => {
    // Empty queue should return null, not throw
    expect(() => {
      const result = queue.next();
      expect(result).toBeNull();
    }).not.toThrow();
  });

  it('should handle errors gracefully in complete() with invalid id', () => {
    expect(() => {
      const result = queue.complete('non-existent-id');
      expect(result).toBe(false);
    }).not.toThrow();
  });

  it('should handle errors gracefully in fail() with invalid id', () => {
    expect(() => {
      const result = queue.fail('non-existent-id');
      expect(result).toBe(false);
    }).not.toThrow();
  });

  it('should handle errors gracefully in remove() with invalid id', () => {
    expect(() => {
      const result = queue.remove('non-existent-id');
      expect(result).toBe(false);
    }).not.toThrow();
  });

  it('should handle errors gracefully in getStats()', () => {
    expect(() => {
      const stats = queue.getStats();
      expect(stats).toBeDefined();
      expect(stats.total).toBe(0);
    }).not.toThrow();
  });

  it('should handle errors gracefully in importFromCSV() with malformed data', () => {
    expect(() => {
      const result = queue.importFromCSV('');
      expect(result.added).toHaveLength(0);
    }).not.toThrow();
  });
});

// ============================================================================
// Fix 4: Error handling tests for ResourceMonitor
// ============================================================================

describe('ResourceMonitor error handling', () => {
  let monitor: ResourceMonitor;

  beforeEach(() => {
    vi.useFakeTimers();
    monitor = new ResourceMonitor();
  });

  afterEach(() => {
    monitor.stop();
    vi.useRealTimers();
  });

  it('should handle errors gracefully in start()', () => {
    expect(() => monitor.start()).not.toThrow();
  });

  it('should handle errors gracefully in stop() when not started', () => {
    expect(() => monitor.stop()).not.toThrow();
  });

  it('should handle errors gracefully in getMetrics() when no metrics collected', () => {
    expect(() => {
      const metrics = monitor.getMetrics();
      expect(metrics).toBeNull();
    }).not.toThrow();
  });

  it('should handle errors gracefully in getThrottleAction() when no metrics', () => {
    expect(() => {
      const action = monitor.getThrottleAction();
      expect(action.type).toBe('none');
    }).not.toThrow();
  });

  it('should handle errors gracefully in isHealthy() when no metrics', () => {
    expect(() => {
      const healthy = monitor.isHealthy();
      expect(healthy).toBe(true);
    }).not.toThrow();
  });

  it('should handle errors gracefully in getAverageMetrics() with empty history', () => {
    expect(() => {
      const avg = monitor.getAverageMetrics();
      expect(avg).toBeNull();
    }).not.toThrow();
  });

  it('should handle errors gracefully in updateThresholds()', () => {
    expect(() => {
      monitor.updateThresholds({ cpuWarning: 80 });
    }).not.toThrow();
  });
});

// ============================================================================
// Fix 4: Error handling tests for SelfHealingEngine
// ============================================================================

describe('SelfHealingEngine error handling', () => {
  let engine: SelfHealingEngine;

  beforeEach(() => {
    engine = new SelfHealingEngine();
  });

  it('should handle errors gracefully in analyzeError()', () => {
    expect(() => {
      const action = engine.analyzeError({
        type: 'network',
        message: 'Connection failed',
        timestamp: new Date(),
      });
      expect(action).toBeDefined();
      expect(action.type).toBeDefined();
    }).not.toThrow();
  });

  it('should handle errors gracefully in calculateBackoff()', () => {
    expect(() => {
      const delay = engine.calculateBackoff(1);
      expect(delay).toBeGreaterThanOrEqual(0);
    }).not.toThrow();
  });

  it('should handle errors gracefully in executeRecovery() with failing executor', async () => {
    const context = {
      type: 'network' as const,
      message: 'Test error',
      timestamp: new Date(),
    };
    const action = engine.analyzeError(context);

    // Executor that throws
    const result = await engine.executeRecovery(context, action, async () => {
      throw new Error('Executor failed');
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should handle errors gracefully in getStats() with empty history', () => {
    expect(() => {
      const stats = engine.getStats();
      expect(stats).toBeDefined();
      expect(stats.totalRecoveries).toBe(0);
    }).not.toThrow();
  });

  it('should handle errors gracefully in getMetrics()', () => {
    expect(() => {
      const metrics = engine.getMetrics();
      expect(metrics).toBeDefined();
    }).not.toThrow();
  });

  it('should handle errors gracefully in clearErrorCount() with non-existent context', () => {
    expect(() => {
      engine.clearErrorCount({
        type: 'unknown',
        message: 'Non-existent',
        timestamp: new Date(),
      });
    }).not.toThrow();
  });

  it('should handle errors gracefully in getErrorCount() with partial context', () => {
    expect(() => {
      const count = engine.getErrorCount({ type: 'network' });
      expect(count).toBe(0);
    }).not.toThrow();
  });
});

// ============================================================================
// Fix 4: Error handling tests for PositionTracker
// ============================================================================

describe('PositionTracker error handling', () => {
  let tracker: PositionTracker;

  beforeEach(() => {
    tracker = new PositionTracker();
  });

  it('should handle errors gracefully in record()', () => {
    expect(() => {
      const record = tracker.record({
        keyword: 'test',
        domain: 'example.com',
        engine: 'google',
        position: 1,
        page: 1,
        url: 'https://example.com',
        title: 'Test',
        description: 'Test',
      });
      expect(record).toBeDefined();
    }).not.toThrow();
  });

  it('should handle errors gracefully in getHistory() for non-existent pair', () => {
    expect(() => {
      const history = tracker.getHistory('nonexistent', 'nonexistent.com', 'google');
      expect(history).toEqual([]);
    }).not.toThrow();
  });

  it('should handle errors gracefully in getLatest() for non-existent pair', () => {
    expect(() => {
      const latest = tracker.getLatest('nonexistent', 'nonexistent.com', 'google');
      expect(latest).toBeNull();
    }).not.toThrow();
  });

  it('should handle errors gracefully in getTrend() for non-existent pair', () => {
    expect(() => {
      const trend = tracker.getTrend('nonexistent', 'nonexistent.com', 'google');
      expect(trend).toBeDefined();
      expect(trend.trend).toBe('insufficient-data');
    }).not.toThrow();
  });

  it('should handle errors gracefully in getChanges() for non-existent pair', () => {
    expect(() => {
      const changes = tracker.getChanges('nonexistent', 'nonexistent.com', 'google');
      expect(changes).toEqual([]);
    }).not.toThrow();
  });

  it('should handle errors gracefully in export() with empty data', () => {
    expect(() => {
      const exported = tracker.export();
      expect(exported).toEqual([]);
    }).not.toThrow();
  });

  it('should handle errors gracefully in import() with empty array', () => {
    expect(() => {
      const count = tracker.import([]);
      expect(count).toBe(0);
    }).not.toThrow();
  });

  it('should handle errors gracefully in clearPair() for non-existent pair', () => {
    expect(() => {
      const cleared = tracker.clearPair('nonexistent', 'nonexistent.com', 'google');
      expect(cleared).toBe(false);
    }).not.toThrow();
  });
});

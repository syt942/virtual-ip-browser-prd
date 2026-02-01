/**
 * ResourceMonitor Unit Tests
 * Tests for system resource monitoring during automation
 *
 * Following TDD pattern: Tests written first, implementation verified
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  ResourceMonitor,
  ResourceMetrics,
  ResourceThresholds,
  ThrottleAction,
  ResourceEventType,
} from '../../electron/core/automation/resource-monitor';

// ============================================================================
// TESTS
// ============================================================================

describe('ResourceMonitor', () => {
  let monitor: ResourceMonitor;

  beforeEach(() => {
    vi.useFakeTimers();
    monitor = new ResourceMonitor();
  });

  afterEach(() => {
    monitor.stop();
    vi.useRealTimers();
  });

  // --------------------------------------------------------------------------
  // Initialization Tests
  // --------------------------------------------------------------------------
  describe('initialization', () => {
    it('should create monitor with default thresholds matching PRD AE-003 (80%)', () => {
      const thresholds = monitor.getThresholds();
      
      // PRD AE-003 Acceptance Criteria #1-2: CPU and memory warning thresholds at 80%
      expect(thresholds.cpuWarning).toBe(80);
      expect(thresholds.cpuCritical).toBe(90);
      expect(thresholds.memoryWarning).toBe(80);
      expect(thresholds.memoryCritical).toBe(85);
      expect(thresholds.maxTabs).toBe(50);
    });

    it('should emit warning at exactly 80% CPU usage (PRD AE-003 requirement)', () => {
      const spy = vi.fn();
      monitor.on('threshold:warning', spy);
      
      // 79% should NOT trigger warning
      monitor.setMetrics({ cpu: 79, memory: 50 });
      expect(spy).not.toHaveBeenCalled();
      
      // Reset for next test - need new monitor to clear debounce
      const monitor2 = new ResourceMonitor();
      const spy2 = vi.fn();
      monitor2.on('threshold:warning', spy2);
      
      // 80% should trigger warning
      monitor2.setMetrics({ cpu: 80, memory: 50 });
      expect(spy2).toHaveBeenCalledWith({ type: 'cpu', value: 80 });
      monitor2.stop();
    });

    it('should emit warning at exactly 80% memory usage (PRD AE-003 requirement)', () => {
      const spy = vi.fn();
      monitor.on('threshold:warning', spy);
      
      // 79% should NOT trigger warning
      monitor.setMetrics({ cpu: 50, memory: 79 });
      expect(spy).not.toHaveBeenCalled();
      
      // Reset for next test
      const monitor2 = new ResourceMonitor();
      const spy2 = vi.fn();
      monitor2.on('threshold:warning', spy2);
      
      // 80% should trigger warning
      monitor2.setMetrics({ cpu: 50, memory: 80 });
      expect(spy2).toHaveBeenCalledWith({ type: 'memory', value: 80 });
      monitor2.stop();
    });

    it('should accept custom thresholds', () => {
      const customMonitor = new ResourceMonitor({
        cpuWarning: 60,
        cpuCritical: 80,
        memoryWarning: 65,
        memoryCritical: 80,
        maxTabs: 30,
      });
      
      const thresholds = customMonitor.getThresholds();
      expect(thresholds.cpuWarning).toBe(60);
      expect(thresholds.maxTabs).toBe(30);
    });

    it('should not be monitoring initially', () => {
      expect(monitor.monitoring).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Monitoring Control Tests
  // --------------------------------------------------------------------------
  describe('start/stop', () => {
    it('should start monitoring', () => {
      monitor.start(1000);
      
      expect(monitor.monitoring).toBe(true);
    });

    it('should stop monitoring', () => {
      monitor.start(1000);
      monitor.stop();
      
      expect(monitor.monitoring).toBe(false);
    });

    it('should not start twice', () => {
      const spy = vi.fn();
      monitor.on('metrics:updated', spy);
      
      monitor.start(1000);
      monitor.start(1000);
      
      expect(spy).toHaveBeenCalledTimes(1); // Only once on initial start
    });

    it('should collect metrics at specified interval', () => {
      const spy = vi.fn();
      monitor.on('metrics:updated', spy);
      
      monitor.start(1000);
      
      vi.advanceTimersByTime(3000);
      
      expect(spy).toHaveBeenCalledTimes(4); // Initial + 3 intervals
    });
  });

  // --------------------------------------------------------------------------
  // Metrics Collection Tests
  // --------------------------------------------------------------------------
  describe('metrics', () => {
    it('should return null when no metrics collected', () => {
      expect(monitor.getMetrics()).toBeNull();
    });

    it('should return current metrics after collection', () => {
      monitor.setMetrics({ cpu: 50, memory: 60 });
      
      const metrics = monitor.getMetrics();
      expect(metrics).not.toBeNull();
      expect(metrics?.cpu).toBe(50);
      expect(metrics?.memory).toBe(60);
    });

    it('should maintain metrics history', () => {
      monitor.setMetrics({ cpu: 50 });
      monitor.setMetrics({ cpu: 55 });
      monitor.setMetrics({ cpu: 60 });
      
      const history = monitor.getHistory();
      expect(history).toHaveLength(3);
    });

    it('should limit history size', () => {
      for (let i = 0; i < 150; i++) {
        monitor.setMetrics({ cpu: i % 100 });
      }
      
      const history = monitor.getHistory();
      expect(history.length).toBeLessThanOrEqual(100);
    });

    it('should calculate average metrics', () => {
      monitor.setMetrics({ cpu: 40, memory: 50 });
      monitor.setMetrics({ cpu: 60, memory: 70 });
      
      const avg = monitor.getAverageMetrics();
      expect(avg?.avgCpu).toBe(50);
      expect(avg?.avgMemory).toBe(60);
    });

    it('should return null average when no history', () => {
      expect(monitor.getAverageMetrics()).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // Threshold Detection Tests
  // --------------------------------------------------------------------------
  describe('threshold detection', () => {
    it('should emit warning on CPU warning threshold (80% per PRD AE-003)', () => {
      const spy = vi.fn();
      monitor.on('threshold:warning', spy);
      
      // 80% is the warning threshold per PRD AE-003
      monitor.setMetrics({ cpu: 85 });
      
      expect(spy).toHaveBeenCalledWith({ type: 'cpu', value: 85 });
    });

    it('should emit critical on CPU critical threshold', () => {
      const spy = vi.fn();
      monitor.on('threshold:critical', spy);
      
      monitor.setMetrics({ cpu: 95 });
      
      expect(spy).toHaveBeenCalledWith({ type: 'cpu', value: 95 });
    });

    it('should emit warning on memory warning threshold (80% per PRD AE-003)', () => {
      const spy = vi.fn();
      monitor.on('threshold:warning', spy);
      
      // 80% is the warning threshold per PRD AE-003
      monitor.setMetrics({ memory: 82 });
      
      expect(spy).toHaveBeenCalledWith({ type: 'memory', value: 82 });
    });

    it('should emit critical on memory critical threshold', () => {
      const spy = vi.fn();
      monitor.on('threshold:critical', spy);
      
      monitor.setMetrics({ memory: 90 });
      
      expect(spy).toHaveBeenCalledWith({ type: 'memory', value: 90 });
    });

    it('should emit critical on tab limit reached', () => {
      const spy = vi.fn();
      monitor.on('threshold:critical', spy);
      
      monitor.setMetrics({ tabCount: 50 });
      
      expect(spy).toHaveBeenCalledWith({ type: 'tabs', value: 50 });
    });

    it('should not emit events for normal values (below 80%)', () => {
      const warningSpy = vi.fn();
      const criticalSpy = vi.fn();
      monitor.on('threshold:warning', warningSpy);
      monitor.on('threshold:critical', criticalSpy);
      
      // 79% is below the 80% warning threshold
      monitor.setMetrics({ cpu: 79, memory: 79, tabCount: 10 });
      
      expect(warningSpy).not.toHaveBeenCalled();
      expect(criticalSpy).not.toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // Throttle Action Tests
  // --------------------------------------------------------------------------
  describe('getThrottleAction', () => {
    it('should return none when no metrics', () => {
      const action = monitor.getThrottleAction();
      
      expect(action.type).toBe('none');
      expect(action.severity).toBe('normal');
    });

    it('should return none for normal resource usage', () => {
      monitor.setMetrics({ cpu: 50, memory: 50, tabCount: 10 });
      
      const action = monitor.getThrottleAction();
      
      expect(action.type).toBe('none');
      expect(action.severity).toBe('normal');
    });

    it('should return increase-delay for warning level (80%+ per PRD AE-003)', () => {
      // 80% is the warning threshold per PRD AE-003
      monitor.setMetrics({ cpu: 85, memory: 50 });
      
      const action = monitor.getThrottleAction();
      
      expect(action.type).toBe('increase-delay');
      expect(action.severity).toBe('warning');
    });

    it('should return pause for critical CPU', () => {
      monitor.setMetrics({ cpu: 95, memory: 50 });
      
      const action = monitor.getThrottleAction();
      
      expect(action.type).toBe('pause');
      expect(action.severity).toBe('critical');
    });

    it('should return reduce-tabs for critical memory', () => {
      monitor.setMetrics({ cpu: 50, memory: 90 });
      
      const action = monitor.getThrottleAction();
      
      expect(action.type).toBe('reduce-tabs');
      expect(action.severity).toBe('critical');
    });

    it('should return stop for both CPU and memory critical', () => {
      monitor.setMetrics({ cpu: 95, memory: 90 });
      
      const action = monitor.getThrottleAction();
      
      expect(action.type).toBe('stop');
      expect(action.severity).toBe('critical');
    });

    it('should return reduce-tabs when tab limit reached', () => {
      monitor.setMetrics({ cpu: 50, memory: 50, tabCount: 50 });
      
      const action = monitor.getThrottleAction();
      
      expect(action.type).toBe('reduce-tabs');
      expect(action.severity).toBe('warning');
    });
  });

  // --------------------------------------------------------------------------
  // Health Check Tests
  // --------------------------------------------------------------------------
  describe('isHealthy', () => {
    it('should return true when no metrics', () => {
      expect(monitor.isHealthy()).toBe(true);
    });

    it('should return true for normal resources', () => {
      monitor.setMetrics({ cpu: 50, memory: 50, tabCount: 10 });
      
      expect(monitor.isHealthy()).toBe(true);
    });

    it('should return false when CPU exceeds warning (80% per PRD AE-003)', () => {
      // 85% exceeds the 80% warning threshold
      monitor.setMetrics({ cpu: 85, memory: 50, tabCount: 10 });
      
      expect(monitor.isHealthy()).toBe(false);
    });

    it('should return false when memory exceeds warning (80% per PRD AE-003)', () => {
      // 85% exceeds the 80% warning threshold
      monitor.setMetrics({ cpu: 50, memory: 85, tabCount: 10 });
      
      expect(monitor.isHealthy()).toBe(false);
    });

    it('should return false when tabs exceed limit', () => {
      monitor.setMetrics({ cpu: 50, memory: 50, tabCount: 50 });
      
      expect(monitor.isHealthy()).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Threshold Update Tests
  // --------------------------------------------------------------------------
  describe('updateThresholds', () => {
    it('should update individual thresholds', () => {
      monitor.updateThresholds({ cpuWarning: 60 });
      
      const thresholds = monitor.getThresholds();
      expect(thresholds.cpuWarning).toBe(60);
      expect(thresholds.cpuCritical).toBe(90); // Unchanged
    });

    it('should update multiple thresholds', () => {
      monitor.updateThresholds({
        cpuWarning: 60,
        memoryWarning: 65,
        maxTabs: 30,
      });
      
      const thresholds = monitor.getThresholds();
      expect(thresholds.cpuWarning).toBe(60);
      expect(thresholds.memoryWarning).toBe(65);
      expect(thresholds.maxTabs).toBe(30);
    });
  });

  // --------------------------------------------------------------------------
  // Event Handling Tests
  // --------------------------------------------------------------------------
  describe('event handling', () => {
    it('should register event handlers', () => {
      const spy = vi.fn();
      monitor.on('metrics:updated', spy);
      
      monitor.setMetrics({ cpu: 50 });
      
      expect(spy).toHaveBeenCalled();
    });

    it('should remove event handlers', () => {
      const spy = vi.fn();
      monitor.on('metrics:updated', spy);
      monitor.off('metrics:updated', spy);
      
      monitor.setMetrics({ cpu: 50 });
      
      expect(spy).not.toHaveBeenCalled();
    });

    it('should support multiple handlers for same event', () => {
      const spy1 = vi.fn();
      const spy2 = vi.fn();
      monitor.on('metrics:updated', spy1);
      monitor.on('metrics:updated', spy2);
      
      monitor.setMetrics({ cpu: 50 });
      
      expect(spy1).toHaveBeenCalled();
      expect(spy2).toHaveBeenCalled();
    });
  });
});

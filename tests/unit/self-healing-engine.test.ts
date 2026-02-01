/**
 * SelfHealingEngine Unit Tests
 * Tests for self-healing automation recovery mechanisms
 * 
 * Following TDD pattern: Tests written first, implementation verified
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  SelfHealingEngine,
  ErrorContext,
  RecoveryAction,
} from '../../electron/core/automation/self-healing-engine';

// ============================================================================
// TESTS
// ============================================================================

describe('SelfHealingEngine', () => {
  let engine: SelfHealingEngine;

  beforeEach(() => {
    vi.useFakeTimers();
    engine = new SelfHealingEngine();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // --------------------------------------------------------------------------
  // Initialization Tests
  // --------------------------------------------------------------------------
  describe('initialization', () => {
    it('should create engine with default config', () => {
      const config = engine.getConfig();
      
      expect(config.maxRetries).toBe(3);
      expect(config.baseBackoffMs).toBe(1000);
      expect(config.maxBackoffMs).toBe(30000);
      expect(config.backoffMultiplier).toBe(2);
      expect(config.proxyFailoverEnabled).toBe(true);
      expect(config.tabRestartEnabled).toBe(true);
      expect(config.captchaHandling).toBe('skip');
    });

    it('should accept custom config', () => {
      const customEngine = new SelfHealingEngine({
        maxRetries: 5,
        baseBackoffMs: 2000,
        captchaHandling: 'pause',
      });
      
      const config = customEngine.getConfig();
      expect(config.maxRetries).toBe(5);
      expect(config.baseBackoffMs).toBe(2000);
      expect(config.captchaHandling).toBe('pause');
    });
  });

  // --------------------------------------------------------------------------
  // Error Analysis Tests
  // --------------------------------------------------------------------------
  describe('analyzeError', () => {
    describe('network errors', () => {
      it('should return retry action for network error', () => {
        const context: ErrorContext = {
          type: 'network',
          message: 'Connection refused',
          timestamp: new Date(),
        };
        
        const action = engine.analyzeError(context);
        
        expect(action.type).toBe('retry');
        expect(action.delay).toBeGreaterThan(0);
      });

      it('should abort after max retries', () => {
        const context: ErrorContext = {
          type: 'network',
          message: 'Connection refused',
          taskId: 'task-1',
          timestamp: new Date(),
        };
        
        // Trigger 4 errors (1 more than max)
        engine.analyzeError(context);
        engine.analyzeError(context);
        engine.analyzeError(context);
        const action = engine.analyzeError(context);
        
        expect(action.type).toBe('abort');
        expect(action.reason).toContain('Max retries');
      });
    });

    describe('proxy errors', () => {
      it('should switch proxy when failover enabled', () => {
        const context: ErrorContext = {
          type: 'proxy',
          message: 'Proxy connection failed',
          proxyId: 'proxy-1',
          timestamp: new Date(),
        };
        
        const action = engine.analyzeError(context);
        
        expect(action.type).toBe('switch-proxy');
      });

      it('should retry when failover disabled', () => {
        const customEngine = new SelfHealingEngine({ proxyFailoverEnabled: false });
        const context: ErrorContext = {
          type: 'proxy',
          message: 'Proxy connection failed',
          timestamp: new Date(),
        };
        
        const action = customEngine.analyzeError(context);
        
        expect(action.type).toBe('retry');
      });
    });

    describe('captcha errors', () => {
      it('should skip task with default captcha handling', () => {
        const context: ErrorContext = {
          type: 'captcha',
          message: 'reCAPTCHA detected',
          timestamp: new Date(),
        };
        
        const action = engine.analyzeError(context);
        
        expect(action.type).toBe('skip');
      });

      it('should pause when captcha handling is pause', () => {
        const customEngine = new SelfHealingEngine({ captchaHandling: 'pause' });
        const context: ErrorContext = {
          type: 'captcha',
          message: 'reCAPTCHA detected',
          timestamp: new Date(),
        };
        
        const action = customEngine.analyzeError(context);
        
        expect(action.type).toBe('backoff');
        expect(action.delay).toBe(60000);
      });

      it('should abort when captcha handling is abort', () => {
        const customEngine = new SelfHealingEngine({ captchaHandling: 'abort' });
        const context: ErrorContext = {
          type: 'captcha',
          message: 'reCAPTCHA detected',
          timestamp: new Date(),
        };
        
        const action = customEngine.analyzeError(context);
        
        expect(action.type).toBe('abort');
      });
    });

    describe('timeout errors', () => {
      it('should retry on first timeout', () => {
        const context: ErrorContext = {
          type: 'timeout',
          message: 'Page load timeout',
          timestamp: new Date(),
        };
        
        const action = engine.analyzeError(context);
        
        expect(action.type).toBe('retry');
      });

      it('should restart tab after multiple timeouts', () => {
        const context: ErrorContext = {
          type: 'timeout',
          message: 'Page load timeout',
          taskId: 'task-timeout',
          timestamp: new Date(),
        };
        
        engine.analyzeError(context); // First timeout
        const action = engine.analyzeError(context); // Second timeout
        
        expect(action.type).toBe('restart-tab');
      });
    });

    describe('rate-limit errors', () => {
      it('should backoff on rate limit', () => {
        const context: ErrorContext = {
          type: 'rate-limit',
          message: 'Too many requests',
          timestamp: new Date(),
        };
        
        const action = engine.analyzeError(context);
        
        expect(action.type).toBe('backoff');
        expect(action.delay).toBeGreaterThan(0);
      });
    });

    describe('crash errors', () => {
      it('should restart tab on crash', () => {
        const context: ErrorContext = {
          type: 'crash',
          message: 'Tab crashed',
          timestamp: new Date(),
        };
        
        const action = engine.analyzeError(context);
        
        expect(action.type).toBe('restart-tab');
      });

      it('should abort when tab restart disabled', () => {
        const customEngine = new SelfHealingEngine({ tabRestartEnabled: false });
        const context: ErrorContext = {
          type: 'crash',
          message: 'Tab crashed',
          timestamp: new Date(),
        };
        
        const action = customEngine.analyzeError(context);
        
        expect(action.type).toBe('abort');
      });
    });

    describe('unknown errors', () => {
      it('should retry on unknown error', () => {
        const context: ErrorContext = {
          type: 'unknown',
          message: 'Something went wrong',
          timestamp: new Date(),
        };
        
        const action = engine.analyzeError(context);
        
        expect(action.type).toBe('retry');
      });
    });
  });

  // --------------------------------------------------------------------------
  // Backoff Calculation Tests
  // --------------------------------------------------------------------------
  describe('calculateBackoff', () => {
    it('should calculate exponential backoff', () => {
      const delay1 = engine.calculateBackoff(1);
      const delay2 = engine.calculateBackoff(2);
      const delay3 = engine.calculateBackoff(3);
      
      // With base 1000 and multiplier 2:
      // Attempt 1: ~1000ms, Attempt 2: ~2000ms, Attempt 3: ~4000ms
      expect(delay1).toBeGreaterThanOrEqual(900);
      expect(delay1).toBeLessThanOrEqual(1100);
      expect(delay2).toBeGreaterThan(delay1);
      expect(delay3).toBeGreaterThan(delay2);
    });

    it('should not exceed max backoff', () => {
      const delay = engine.calculateBackoff(100);
      
      expect(delay).toBeLessThanOrEqual(30000);
    });
  });

  // --------------------------------------------------------------------------
  // Recovery Execution Tests
  // --------------------------------------------------------------------------
  describe('executeRecovery', () => {
    it('should execute recovery action successfully', async () => {
      const context: ErrorContext = {
        type: 'network',
        message: 'Connection failed',
        timestamp: new Date(),
      };
      const action: RecoveryAction = {
        type: 'retry',
        reason: 'Network error',
        delay: 100,
      };
      const executor = vi.fn().mockResolvedValue(true);
      
      const resultPromise = engine.executeRecovery(context, action, executor);
      await vi.advanceTimersByTimeAsync(200);
      const result = await resultPromise;
      
      expect(result.success).toBe(true);
      expect(executor).toHaveBeenCalledWith(action);
    });

    it('should track failed recovery', async () => {
      const context: ErrorContext = {
        type: 'proxy',
        message: 'Proxy failed',
        timestamp: new Date(),
      };
      const action: RecoveryAction = {
        type: 'switch-proxy',
        reason: 'Proxy error',
      };
      const executor = vi.fn().mockResolvedValue(false);
      
      const result = await engine.executeRecovery(context, action, executor);
      
      expect(result.success).toBe(false);
    });

    it('should handle executor exceptions', async () => {
      const context: ErrorContext = {
        type: 'crash',
        message: 'Tab crashed',
        timestamp: new Date(),
      };
      const action: RecoveryAction = {
        type: 'restart-tab',
        reason: 'Crash recovery',
      };
      const executor = vi.fn().mockRejectedValue(new Error('Restart failed'));
      
      const result = await engine.executeRecovery(context, action, executor);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Restart failed');
    });

    it('should emit events during recovery', async () => {
      const startedSpy = vi.fn();
      const successSpy = vi.fn();
      engine.on('recovery:started', startedSpy);
      engine.on('recovery:success', successSpy);
      
      const context: ErrorContext = {
        type: 'network',
        message: 'Error',
        timestamp: new Date(),
      };
      const action: RecoveryAction = { type: 'retry', reason: 'Test' };
      const executor = vi.fn().mockResolvedValue(true);
      
      await engine.executeRecovery(context, action, executor);
      
      expect(startedSpy).toHaveBeenCalled();
      expect(successSpy).toHaveBeenCalled();
    });

    it('should clear error count on successful recovery', async () => {
      const context: ErrorContext = {
        type: 'network',
        message: 'Error',
        taskId: 'task-clear',
        timestamp: new Date(),
      };
      
      // Generate some errors
      engine.analyzeError(context);
      engine.analyzeError(context);
      expect(engine.getErrorCount({ type: 'network', taskId: 'task-clear' })).toBe(2);
      
      // Successful recovery
      const action: RecoveryAction = { type: 'retry', reason: 'Test' };
      await engine.executeRecovery(context, action, async () => true);
      
      expect(engine.getErrorCount({ type: 'network', taskId: 'task-clear' })).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Statistics Tests
  // --------------------------------------------------------------------------
  describe('getStats', () => {
    it('should return empty stats initially', () => {
      const stats = engine.getStats();
      
      expect(stats.totalRecoveries).toBe(0);
      expect(stats.successRate).toBe(0);
    });

    it('should track recovery statistics', async () => {
      const context: ErrorContext = {
        type: 'network',
        message: 'Error',
        timestamp: new Date(),
      };
      
      // Execute some recoveries
      await engine.executeRecovery(
        context,
        { type: 'retry', reason: 'Test' },
        async () => true
      );
      await engine.executeRecovery(
        context,
        { type: 'retry', reason: 'Test' },
        async () => false
      );
      
      const stats = engine.getStats();
      
      expect(stats.totalRecoveries).toBe(2);
      expect(stats.successfulRecoveries).toBe(1);
      expect(stats.failedRecoveries).toBe(1);
      expect(stats.successRate).toBe(50);
      expect(stats.byActionType['retry']).toBe(2);
    });
  });

  // --------------------------------------------------------------------------
  // History Tests
  // --------------------------------------------------------------------------
  describe('history', () => {
    it('should track recovery history', async () => {
      const context: ErrorContext = {
        type: 'network',
        message: 'Error',
        timestamp: new Date(),
      };
      
      await engine.executeRecovery(
        context,
        { type: 'retry', reason: 'Test' },
        async () => true
      );
      
      const history = engine.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].action.type).toBe('retry');
    });

    it('should clear history', async () => {
      const context: ErrorContext = {
        type: 'network',
        message: 'Error',
        timestamp: new Date(),
      };
      
      await engine.executeRecovery(
        context,
        { type: 'retry', reason: 'Test' },
        async () => true
      );
      
      engine.clearHistory();
      
      expect(engine.getHistory()).toHaveLength(0);
    });
  });

  // --------------------------------------------------------------------------
  // Configuration Tests
  // --------------------------------------------------------------------------
  describe('configuration', () => {
    it('should update configuration', () => {
      engine.updateConfig({ maxRetries: 5 });
      
      expect(engine.getConfig().maxRetries).toBe(5);
    });

    it('should preserve other config values when updating', () => {
      engine.updateConfig({ maxRetries: 5 });
      
      expect(engine.getConfig().baseBackoffMs).toBe(1000);
    });
  });

  // --------------------------------------------------------------------------
  // Error Count Management Tests
  // --------------------------------------------------------------------------
  describe('error count management', () => {
    it('should track error counts per context', () => {
      const context1: ErrorContext = {
        type: 'network',
        message: 'Error',
        taskId: 'task-1',
        timestamp: new Date(),
      };
      const context2: ErrorContext = {
        type: 'network',
        message: 'Error',
        taskId: 'task-2',
        timestamp: new Date(),
      };
      
      engine.analyzeError(context1);
      engine.analyzeError(context1);
      engine.analyzeError(context2);
      
      expect(engine.getErrorCount({ type: 'network', taskId: 'task-1' })).toBe(2);
      expect(engine.getErrorCount({ type: 'network', taskId: 'task-2' })).toBe(1);
    });

    it('should clear all error counts', () => {
      const context: ErrorContext = {
        type: 'network',
        message: 'Error',
        taskId: 'task-1',
        timestamp: new Date(),
      };
      
      engine.analyzeError(context);
      engine.analyzeError(context);
      engine.clearAllErrorCounts();
      
      expect(engine.getErrorCount({ type: 'network', taskId: 'task-1' })).toBe(0);
    });
  });
});

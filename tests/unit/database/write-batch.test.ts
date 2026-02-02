/**
 * Database Write Batch Unit Tests
 * Critical Action: DB write batching to reduce lock contention
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WriteBatch } from '../../../electron/database/write-batch';

interface TestOperation {
  id: string;
  type: 'insert' | 'update' | 'delete';
  table: string;
  data: unknown;
}

const createMockOperation = (overrides: Partial<TestOperation> = {}): TestOperation => ({
  id: `op-${Math.random().toString(36).substr(2, 9)}`,
  type: 'insert',
  table: 'test_table',
  data: { test: true },
  ...overrides,
});

describe('WriteBatch', () => {
  let batch: WriteBatch<TestOperation>;
  let mockExecutor: any;

  beforeEach(() => {
    mockExecutor = {
      execute: vi.fn().mockResolvedValue({ success: true, rowsAffected: 1 }),
    };

    batch = new WriteBatch({
      flushInterval: 100,
      maxBatchSize: 50,
      executor: mockExecutor,
    });
  });

  afterEach(async () => {
    await batch.destroy();
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should create with flush interval and max batch size', () => {
      expect(batch.getConfig().flushInterval).toBe(100);
      expect(batch.getConfig().maxBatchSize).toBe(50);
    });

    it('should start with empty queue', () => {
      expect(batch.getMetrics().queuedOperations).toBe(0);
    });
  });

  describe('enqueue', () => {
    it('should add operation to queue', async () => {
      const op = createMockOperation();
      await batch.enqueue(op);

      expect(batch.getMetrics().queuedOperations).toBe(1);
    });

    it('should accumulate multiple operations', async () => {
      const op1 = createMockOperation();
      const op2 = createMockOperation();
      const op3 = createMockOperation();

      await batch.enqueue(op1);
      await batch.enqueue(op2);
      await batch.enqueue(op3);

      expect(batch.getMetrics().queuedOperations).toBe(3);
    });

    it('should flush when max batch size reached', async () => {
      const ops = Array.from({ length: 50 }, () => createMockOperation());

      for (const op of ops) {
        await batch.enqueue(op);
      }

      // Give executor time to run
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockExecutor.execute).toHaveBeenCalled();
      expect(batch.getMetrics().queuedOperations).toBeLessThan(50);
    });

    it('should reject operations when queue full', async () => {
      batch = new WriteBatch({
        flushInterval: 1000,
        maxBatchSize: 5,
        executor: mockExecutor,
      });

      const ops = Array.from({ length: 10 }, () => createMockOperation());

      for (let i = 0; i < 5; i++) {
        await batch.enqueue(ops[i]);
      }

      await expect(batch.enqueue(ops[5])).rejects.toThrow();
    });
  });

  describe('flush', () => {
    it('should execute all queued operations', async () => {
      const op1 = createMockOperation();
      const op2 = createMockOperation();

      await batch.enqueue(op1);
      await batch.enqueue(op2);

      await batch.flush();

      expect(mockExecutor.execute).toHaveBeenCalledWith([op1, op2]);
      expect(batch.getMetrics().queuedOperations).toBe(0);
    });

    it('should clear queue after successful flush', async () => {
      const op = createMockOperation();
      await batch.enqueue(op);

      await batch.flush();

      expect(batch.getMetrics().queuedOperations).toBe(0);
    });

    it('should track flush count', async () => {
      const op = createMockOperation();
      await batch.enqueue(op);

      const beforeFlushes = batch.getMetrics().flushCount;
      await batch.flush();

      expect(batch.getMetrics().flushCount).toBeGreaterThan(beforeFlushes);
    });

    it('should handle flush failures gracefully', async () => {
      mockExecutor.execute.mockRejectedValueOnce(new Error('DB error'));

      const op = createMockOperation();
      await batch.enqueue(op);

      await expect(batch.flush()).rejects.toThrow('DB error');
    });

    it('should calculate batch efficiency', async () => {
      const ops = Array.from({ length: 25 }, () => createMockOperation());

      for (const op of ops) {
        await batch.enqueue(op);
      }

      await batch.flush();

      const metrics = batch.getMetrics();
      expect(metrics.avgBatchSize).toBe(25);
    });
  });

  describe('metrics', () => {
    it('should track total operations processed', async () => {
      const ops = Array.from({ length: 10 }, () => createMockOperation());

      for (const op of ops) {
        await batch.enqueue(op);
      }

      await batch.flush();

      expect(batch.getMetrics().totalProcessed).toBe(10);
    });

    it('should track average batch size', async () => {
      const ops = Array.from({ length: 15 }, () => createMockOperation());

      for (const op of ops) {
        await batch.enqueue(op);
      }

      await batch.flush();

      expect(batch.getMetrics().avgBatchSize).toBeGreaterThan(0);
    });

    it('should track failed operations', async () => {
      mockExecutor.execute.mockRejectedValueOnce(new Error('DB error'));

      const op = createMockOperation();
      await batch.enqueue(op);

      try {
        await batch.flush();
      } catch {
        // Expected
      }

      expect(batch.getMetrics().failedOperations).toBeGreaterThan(0);
    });
  });

  describe('destroy', () => {
    it('should flush pending operations before destroying', async () => {
      const op = createMockOperation();
      await batch.enqueue(op);

      await batch.destroy();

      expect(mockExecutor.execute).toHaveBeenCalled();
    });

    it('should clear all state', async () => {
      const op = createMockOperation();
      await batch.enqueue(op);

      await batch.destroy();

      expect(batch.getMetrics().queuedOperations).toBe(0);
    });
  });
});

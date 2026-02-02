/**
 * IPC Event Batch Unit Tests
 * Critical Action: Batch rapid IPC events to reduce overhead
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventBatch } from '../../../electron/ipc/event-batch';

interface TestEvent {
  id: string;
  channel: string;
  data: unknown;
  timestamp: number;
}

const createMockEvent = (overrides: Partial<TestEvent> = {}): TestEvent => ({
  id: `evt-${Math.random().toString(36).substr(2, 9)}`,
  channel: 'test:event',
  data: { test: true },
  timestamp: Date.now(),
  ...overrides,
});

describe('EventBatch', () => {
  let batch: EventBatch<TestEvent>;
  let mockEmitter: any;

  beforeEach(() => {
    mockEmitter = {
      emit: vi.fn(),
    };

    batch = new EventBatch({
      batchWindow: 50,
      maxBatchSize: 100,
      emitter: mockEmitter,
    });
  });

  afterEach(async () => {
    await batch.destroy();
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should create with batch window and max batch size', () => {
      expect(batch.getConfig().batchWindow).toBe(50);
      expect(batch.getConfig().maxBatchSize).toBe(100);
    });
  });

  describe('enqueue', () => {
    it('should queue an event', async () => {
      const evt = createMockEvent();
      batch.enqueue(evt);

      expect(batch.getMetrics().queuedEvents).toBe(1);
    });

    it('should accumulate multiple events', async () => {
      const evt1 = createMockEvent();
      const evt2 = createMockEvent();
      const evt3 = createMockEvent();

      batch.enqueue(evt1);
      batch.enqueue(evt2);
      batch.enqueue(evt3);

      expect(batch.getMetrics().queuedEvents).toBe(3);
    });

    it('should emit when max batch size reached', async () => {
      const events = Array.from({ length: 100 }, () => createMockEvent());

      for (const evt of events) {
        batch.enqueue(evt);
      }

      // Give emitter time to run
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockEmitter.emit).toHaveBeenCalled();
    });

    it('should emit batched events after batch window', async () => {
      vi.useFakeTimers();

      const evt1 = createMockEvent();
      const evt2 = createMockEvent();

      batch.enqueue(evt1);
      batch.enqueue(evt2);

      // Advance time past batch window
      vi.advanceTimersByTime(60);

      // Allow microtasks to run
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockEmitter.emit).toHaveBeenCalled();

      vi.useRealTimers();
    });
  }),

  describe('metrics', () => {
    it('should track queued events', () => {
      const evt = createMockEvent();
      batch.queue(evt);

      expect(batch.getMetrics().queuedEvents).toBe(1);
    });

    it('should track total emitted events', async () => {
      vi.useFakeTimers();

      const events = Array.from({ length: 5 }, () => createMockEvent());

      for (const evt of events) {
        batch.queue(evt);
      }

      vi.advanceTimersByTime(60);
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(batch.getMetrics().totalEmitted).toBeGreaterThanOrEqual(5);

      vi.useRealTimers();
    });

    it('should track batch count', async () => {
      vi.useFakeTimers();

      const beforeBatches = batch.getMetrics().batchCount;

      const evt = createMockEvent();
      batch.queue(evt);

      vi.advanceTimersByTime(60);
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(batch.getMetrics().batchCount).toBeGreaterThan(beforeBatches);

      vi.useRealTimers();
    });

    it('should calculate average batch size', async () => {
      vi.useFakeTimers();

      const events = Array.from({ length: 15 }, () => createMockEvent());

      for (const evt of events) {
        batch.queue(evt);
      }

      vi.advanceTimersByTime(60);
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(batch.getMetrics().avgBatchSize).toBeGreaterThan(0);

      vi.useRealTimers();
    });
  });

  describe('destroy', () => {
    it('should emit pending events before destroying', async () => {
      const evt = createMockEvent();
      batch.queue(evt);

      await batch.destroy();

      expect(mockEmitter.emit).toHaveBeenCalled();
    });

    it('should clear all state', async () => {
      const evt = createMockEvent();
      batch.queue(evt);

      await batch.destroy();

      expect(batch.getMetrics().queuedEvents).toBe(0);
    });
  });
});

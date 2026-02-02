/**
 * Database Write Batch Manager
 * Batches database write operations to reduce lock contention and improve throughput.
 * Implements automatic flushing on interval or size threshold.
 */

export interface WriteBatchConfig {
  flushInterval: number; // Milliseconds between flushes
  maxBatchSize: number; // Maximum operations per batch
  executor: {
    execute: (operations: unknown[]) => Promise<{ success: boolean; rowsAffected: number }>;
  };
}

export interface WriteBatchMetrics {
  queuedOperations: number;
  totalProcessed: number;
  flushCount: number;
  avgBatchSize: number;
  failedOperations: number;
}

export class WriteBatch<T> {
  private static readonly MAX_METRIC_SAMPLES = 1000;

  private config: WriteBatchConfig;
  private queue: T[] = [];
  private flushTimerId?: NodeJS.Timeout;
  private metrics = {
    totalProcessed: 0,
    flushCount: 0,
    failedOperations: 0,
    batchSizes: [] as number[],
  };

  constructor(config: WriteBatchConfig) {
    this.config = config;
    this.startAutoFlush();
  }

  /**
   * Enqueue an operation for batching.
   */
  async enqueue(operation: T): Promise<void> {
    if (this.queue.length >= this.config.maxBatchSize) {
      throw new Error(`Batch queue full (max ${this.config.maxBatchSize})`);
    }

    this.queue.push(operation);

    // Flush if we've reached max batch size
    if (this.queue.length >= this.config.maxBatchSize) {
      await this.flush();
    }
  }

  /**
   * Flush all queued operations to the executor.
   */
  async flush(): Promise<void> {
    if (this.queue.length === 0) {
      return;
    }

    const batch = this.queue.splice(0, this.queue.length);

    try {
      const result = await this.config.executor.execute(batch);

      if (result.success) {
        this.metrics.totalProcessed += batch.length;
        this.metrics.flushCount++;
        this.addBatchSize(batch.length);
      } else {
        this.metrics.failedOperations += batch.length;
      }
    } catch (error) {
      this.metrics.failedOperations += batch.length;
      throw error;
    }
  }

  /**
   * Add batch size to metrics with bounded history.
   */
  private addBatchSize(size: number): void {
    this.metrics.batchSizes.push(size);
    if (this.metrics.batchSizes.length > WriteBatch.MAX_METRIC_SAMPLES) {
      this.metrics.batchSizes.shift();
    }
  }

  /**
   * Get current batch configuration.
   */
  getConfig(): WriteBatchConfig {
    return this.config;
  }

  /**
   * Get current metrics.
   */
  getMetrics(): WriteBatchMetrics {
    const batchSizes = this.metrics.batchSizes;
    const avgBatchSize =
      batchSizes.length > 0
        ? batchSizes.reduce((a, b) => a + b, 0) / batchSizes.length
        : 0;

    return {
      queuedOperations: this.queue.length,
      totalProcessed: this.metrics.totalProcessed,
      flushCount: this.metrics.flushCount,
      avgBatchSize,
      failedOperations: this.metrics.failedOperations,
    };
  }

  /**
   * Start automatic flushing on interval.
   */
  private startAutoFlush(): void {
    this.flushTimerId = setInterval(() => {
      this.flush().catch((error) => {
        console.error('Auto-flush error:', error);
      });
    }, this.config.flushInterval);
  }

  /**
   * Destroy the batch manager and flush pending operations.
   */
  async destroy(): Promise<void> {
    if (this.flushTimerId) {
      clearInterval(this.flushTimerId);
    }

    // Flush any remaining operations
    await this.flush().catch((error) => {
      console.error('Final flush error during destroy:', error);
    });

    this.queue = [];
    this.metrics = {
      totalProcessed: 0,
      flushCount: 0,
      failedOperations: 0,
      batchSizes: [],
    };
  }
}

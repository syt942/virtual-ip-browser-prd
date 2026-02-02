/**
 * IPC Event Batch Manager
 * Batches rapid IPC events to reduce overhead and improve throughput.
 * Implements automatic emission on interval or size threshold.
 */

export interface EventBatchConfig {
  batchWindow: number; // Milliseconds between emissions
  maxBatchSize: number; // Maximum events per batch
  emitter: {
    emit: (events: unknown[]) => void;
  };
}

export interface EventBatchMetrics {
  queuedEvents: number;
  totalEmitted: number;
  batchCount: number;
  avgBatchSize: number;
}

export class EventBatch<T> {
  private static readonly MAX_METRIC_SAMPLES = 1000;

  private config: EventBatchConfig;
  private eventQueue: T[] = [];
  private batchTimerId?: NodeJS.Timeout;
  private metrics = {
    totalEmitted: 0,
    batchCount: 0,
    batchSizes: [] as number[],
    failedBatches: 0,
    lastError: null as string | null,
  };

  constructor(config: EventBatchConfig) {
    this.config = config;
    this.startBatchEmitter();
  }

  /**
   * Queue an event for batched emission.
   */
  enqueue(event: T): void {
    this.eventQueue.push(event);

    // Emit immediately if we've reached max batch size
    if (this.eventQueue.length >= this.config.maxBatchSize) {
      this.emit();
    }
  }

  /**
   * Emit all queued events.
   */
  private emit(): void {
    if (this.eventQueue.length === 0) {
      return;
    }

    const batch = this.eventQueue.splice(0, this.eventQueue.length);

    try {
      this.config.emitter.emit(batch);

      this.metrics.totalEmitted += batch.length;
      this.metrics.batchCount++;
      this.addBatchSize(batch.length);
      this.metrics.lastError = null;
    } catch (error) {
      this.metrics.failedBatches++;
      this.metrics.lastError = error instanceof Error ? error.message : 'Unknown error';
      console.error('Event batch emission error:', error);
    }
  }

  /**
   * Add batch size to metrics with bounded history.
   */
  private addBatchSize(size: number): void {
    this.metrics.batchSizes.push(size);
    if (this.metrics.batchSizes.length > EventBatch.MAX_METRIC_SAMPLES) {
      this.metrics.batchSizes.shift();
    }
  }

  /**
   * Get current configuration.
   */
  getConfig(): EventBatchConfig {
    return this.config;
  }

  /**
   * Get current metrics.
   */
  getMetrics(): EventBatchMetrics {
    const batchSizes = this.metrics.batchSizes;
    const avgBatchSize =
      batchSizes.length > 0
        ? batchSizes.reduce((a, b) => a + b, 0) / batchSizes.length
        : 0;

    return {
      queuedEvents: this.eventQueue.length,
      totalEmitted: this.metrics.totalEmitted,
      batchCount: this.metrics.batchCount,
      avgBatchSize,
    };
  }

  /**
   * Start automatic emission on batch window interval.
   */
  private startBatchEmitter(): void {
    this.batchTimerId = setInterval(() => {
      this.emit();
    }, this.config.batchWindow);
  }

  /**
   * Destroy the batch manager and emit pending events.
   */
  async destroy(): Promise<void> {
    if (this.batchTimerId) {
      clearInterval(this.batchTimerId);
    }

    // Emit any remaining events
    this.emit();

    this.eventQueue = [];
    this.metrics = {
      totalEmitted: 0,
      batchCount: 0,
      batchSizes: [],
      failedBatches: 0,
      lastError: null,
    };
  }
}

/**
 * KeywordQueue Module
 * Manages keyword queue for search automation in Virtual IP Browser
 * 
 * Features:
 * - CRUD operations for keywords
 * - Efficient batch operations with optimized memory handling
 * - Duplicate detection (case-insensitive)
 * - Priority-based queue ordering
 * - Retry mechanism for failed keywords
 * - Statistics tracking with caching
 * - Streaming support for large CSV import/export
 * 
 * @module electron/core/automation/keyword-queue
 */

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default maximum queue size */
const DEFAULT_MAX_QUEUE_SIZE = 10000;

/** Default maximum retries for failed keywords */
const DEFAULT_MAX_RETRIES = 3;

/** Batch size for bulk operations */
const BULK_OPERATION_BATCH_SIZE = 1000;

/** Statistics cache TTL in milliseconds */
const STATS_CACHE_TTL_MS = 100;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Represents a keyword in the queue
 */
export interface QueuedKeyword {
  /** Unique identifier */
  id: string;
  /** The search keyword */
  keyword: string;
  /** Priority (higher = processed first) */
  priority: number;
  /** When the keyword was added */
  addedAt: Date;
  /** Current processing status */
  status: KeywordStatus;
  /** Number of retry attempts */
  retryCount: number;
  /** Maximum retry attempts allowed */
  maxRetries: number;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/** Keyword processing status */
export type KeywordStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Configuration options for KeywordQueue
 */
export interface KeywordQueueConfig {
  /** Maximum number of keywords in queue */
  maxSize: number;
  /** Enable duplicate detection */
  deduplication: boolean;
  /** Enable priority-based ordering */
  priorityEnabled: boolean;
  /** Default max retries for new keywords */
  defaultMaxRetries: number;
  /** Session ID for persistence grouping (PRD SA-001 #10) */
  sessionId?: string;
}

/**
 * Serialized keyword for persistence
 */
export interface SerializedKeyword {
  id: string;
  keyword: string;
  priority: number;
  addedAt: string;
  status: KeywordStatus;
  retryCount: number;
  maxRetries: number;
  metadata?: Record<string, unknown>;
}

/**
 * Exported queue state for persistence (PRD SA-001 #10)
 */
export interface KeywordQueueState {
  sessionId: string;
  keywords: SerializedKeyword[];
}

/**
 * Queue statistics
 */
export interface KeywordQueueStats {
  /** Total keywords in queue */
  total: number;
  /** Pending keywords count */
  pending: number;
  /** Currently processing count */
  processing: number;
  /** Completed keywords count */
  completed: number;
  /** Failed keywords count */
  failed: number;
}

/**
 * Result of bulk add operation
 */
export interface BulkAddResult {
  /** Successfully added keywords */
  added: QueuedKeyword[];
  /** Number of keywords skipped (queue full) */
  skipped: number;
  /** Number of duplicates detected */
  duplicates: number;
  /** Number of invalid entries */
  invalid: number;
}

/**
 * Options for adding keywords
 */
export interface AddKeywordOptions {
  /** Priority level */
  priority?: number;
  /** Max retries override */
  maxRetries?: number;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * CSV export options
 */
export interface CSVExportOptions {
  /** Include headers in output */
  includeHeaders?: boolean;
  /** Custom delimiter */
  delimiter?: string;
  /** Include metadata column */
  includeMetadata?: boolean;
}

// ============================================================================
// STATISTICS CACHE
// ============================================================================

/**
 * Caches queue statistics to avoid recalculation on every access
 */
class StatsCache {
  private stats: KeywordQueueStats | null = null;
  private lastCalculated: number = 0;
  private readonly ttlMs: number;

  constructor(ttlMs: number = STATS_CACHE_TTL_MS) {
    this.ttlMs = ttlMs;
  }

  /**
   * Get cached stats or null if expired
   */
  get(): KeywordQueueStats | null {
    if (this.stats && Date.now() - this.lastCalculated < this.ttlMs) {
      return this.stats;
    }
    return null;
  }

  /**
   * Set stats in cache
   */
  set(stats: KeywordQueueStats): void {
    this.stats = stats;
    this.lastCalculated = Date.now();
  }

  /**
   * Invalidate the cache
   */
  invalidate(): void {
    this.stats = null;
    this.lastCalculated = 0;
  }
}

// ============================================================================
// ID GENERATOR
// ============================================================================

/**
 * Generates unique IDs for keywords
 */
class IdGenerator {
  private static counter = 0;

  /**
   * Generate a unique ID
   */
  static generate(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback for environments without crypto.randomUUID
    return `kw-${Date.now()}-${++this.counter}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

// ============================================================================
// KEYWORD QUEUE CLASS
// ============================================================================

/**
 * KeywordQueue class for managing search keywords
 * 
 * Supports priority ordering, deduplication, retry logic, and efficient
 * batch operations for large keyword lists.
 * 
 * @example
 * ```typescript
 * const queue = new KeywordQueue({ maxSize: 5000 });
 * 
 * // Add single keyword
 * queue.add('best coffee shops');
 * 
 * // Add with priority
 * queue.add('urgent keyword', { priority: 10 });
 * 
 * // Bulk add
 * const result = queue.addBulk(['keyword1', 'keyword2', 'keyword3']);
 * console.log(`Added: ${result.added.length}, Duplicates: ${result.duplicates}`);
 * 
 * // Process keywords
 * while (const keyword = queue.next()) {
 *   // Process keyword...
 *   queue.complete(keyword.id);
 * }
 * ```
 */
export class KeywordQueue {
  private queue: QueuedKeyword[] = [];
  private config: KeywordQueueConfig;
  private processedKeywords: Set<string> = new Set();
  private normalizedKeywordIndex: Set<string> = new Set();
  private statsCache: StatsCache;
  private _sessionId: string;

  /**
   * Create a new KeywordQueue instance
   * 
   * @param config - Configuration options
   */
  constructor(config: Partial<KeywordQueueConfig> = {}) {
    this.config = {
      maxSize: config.maxSize ?? DEFAULT_MAX_QUEUE_SIZE,
      deduplication: config.deduplication ?? true,
      priorityEnabled: config.priorityEnabled ?? true,
      defaultMaxRetries: config.defaultMaxRetries ?? DEFAULT_MAX_RETRIES,
    };
    this._sessionId = config.sessionId ?? IdGenerator.generate();
    this.statsCache = new StatsCache();
  }

  /**
   * Get the session ID for this queue (PRD SA-001 #10)
   */
  get sessionId(): string {
    return this._sessionId;
  }

  // --------------------------------------------------------------------------
  // Add Operations
  // --------------------------------------------------------------------------

  /**
   * Add a single keyword to the queue
   * 
   * @param keyword - The keyword to add
   * @param options - Optional configuration for the keyword
   * @returns The queued keyword or null if validation fails
   */
  add(keyword: string, options: AddKeywordOptions = {}): QueuedKeyword | null {
    const trimmed = keyword.trim();
    if (!this.validateKeyword(trimmed)) {
      return null;
    }

    if (this.isDuplicate(trimmed)) {
      return null;
    }

    if (this.isFull) {
      return null;
    }

    const queuedKeyword = this.createQueuedKeyword(trimmed, options);
    this.insertKeyword(queuedKeyword);
    this.indexKeyword(trimmed);
    this.statsCache.invalidate();

    return queuedKeyword;
  }

  /**
   * Add multiple keywords in bulk with optimized batch processing
   * 
   * @param keywords - Array of keywords to add
   * @param options - Optional configuration applied to all keywords
   * @returns Array of successfully added keywords
   */
  addBulk(keywords: string[], options: AddKeywordOptions = {}): QueuedKeyword[] {
    const result: BulkAddResult = {
      added: [],
      skipped: 0,
      duplicates: 0,
      invalid: 0
    };

    // Process in batches for memory efficiency
    for (let i = 0; i < keywords.length; i += BULK_OPERATION_BATCH_SIZE) {
      const batch = keywords.slice(i, i + BULK_OPERATION_BATCH_SIZE);
      this.processBatch(batch, options, result);
    }

    // Sort once after all additions if priority is enabled
    if (this.config.priorityEnabled && result.added.length > 0) {
      this.sortByPriority();
    }

    this.statsCache.invalidate();
    return result.added;
  }

  /**
   * Add multiple keywords in bulk with detailed results
   * 
   * @param keywords - Array of keywords to add
   * @param options - Optional configuration applied to all keywords
   * @returns Detailed result including added, skipped, duplicates, invalid counts
   */
  addBulkWithDetails(keywords: string[], options: AddKeywordOptions = {}): BulkAddResult {
    const result: BulkAddResult = {
      added: [],
      skipped: 0,
      duplicates: 0,
      invalid: 0
    };

    // Process in batches for memory efficiency
    for (let i = 0; i < keywords.length; i += BULK_OPERATION_BATCH_SIZE) {
      const batch = keywords.slice(i, i + BULK_OPERATION_BATCH_SIZE);
      this.processBatch(batch, options, result);
    }

    // Sort once after all additions if priority is enabled
    if (this.config.priorityEnabled && result.added.length > 0) {
      this.sortByPriority();
    }

    this.statsCache.invalidate();
    return result;
  }

  /**
   * Process a batch of keywords
   */
  private processBatch(
    batch: string[],
    options: AddKeywordOptions,
    result: BulkAddResult
  ): void {
    for (const keyword of batch) {
      const trimmed = keyword.trim();

      if (!this.validateKeyword(trimmed)) {
        result.invalid++;
        continue;
      }

      if (this.isDuplicate(trimmed)) {
        result.duplicates++;
        continue;
      }

      if (this.isFull) {
        result.skipped++;
        continue;
      }

      const queuedKeyword = this.createQueuedKeyword(trimmed, options);
      this.queue.push(queuedKeyword); // Direct push, sort later
      this.indexKeyword(trimmed);
      result.added.push(queuedKeyword);
    }
  }

  /**
   * Import keywords from CSV string with streaming-like processing
   * 
   * @param csvContent - CSV content string
   * @param options - Add options for imported keywords
   * @returns Bulk add result
   */
  importFromCSV(csvContent: string, options: AddKeywordOptions = {}): BulkAddResult {
    const lines = csvContent.split(/\r?\n/);
    const keywords: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      // Skip empty lines and potential header
      if (trimmed && !trimmed.toLowerCase().startsWith('keyword')) {
        keywords.push(trimmed);
      }
    }

    return this.addBulkWithDetails(keywords, options);
  }

  // --------------------------------------------------------------------------
  // Processing Operations
  // --------------------------------------------------------------------------

  /**
   * Get the next pending keyword to process
   * Keywords are returned in priority order (highest first)
   * 
   * @returns The next keyword or null if none pending
   */
  next(): QueuedKeyword | null {
    const pending = this.queue.find(k => k.status === 'pending');
    if (pending) {
      pending.status = 'processing';
      this.statsCache.invalidate();
      return pending;
    }
    return null;
  }

  /**
   * Get multiple pending keywords (batch processing)
   * 
   * @param count - Number of keywords to get
   * @returns Array of keywords marked as processing
   */
  nextBatch(count: number): QueuedKeyword[] {
    const pending = this.queue.filter(k => k.status === 'pending').slice(0, count);
    pending.forEach(k => k.status = 'processing');
    
    if (pending.length > 0) {
      this.statsCache.invalidate();
    }
    
    return pending;
  }

  /**
   * Mark a keyword as completed
   * 
   * @param id - The keyword ID to complete
   * @returns true if successful, false if not found
   */
  complete(id: string): boolean {
    const keyword = this.findById(id);
    if (keyword) {
      keyword.status = 'completed';
      this.processedKeywords.add(keyword.keyword.toLowerCase());
      this.statsCache.invalidate();
      return true;
    }
    return false;
  }

  /**
   * Mark a keyword as failed with optional retry
   * 
   * @param id - The keyword ID to fail
   * @param shouldRetry - Whether to retry the keyword (default: true)
   * @returns true if successful, false if not found
   */
  fail(id: string, shouldRetry: boolean = true): boolean {
    const keyword = this.findById(id);
    if (keyword) {
      keyword.retryCount++;
      
      if (shouldRetry && keyword.retryCount < keyword.maxRetries) {
        keyword.status = 'pending';
      } else {
        keyword.status = 'failed';
      }
      
      this.statsCache.invalidate();
      return true;
    }
    return false;
  }

  /**
   * Reset a failed keyword back to pending status
   * 
   * @param id - The keyword ID to reset
   * @returns true if successful, false if not found or not failed
   */
  retry(id: string): boolean {
    const keyword = this.findById(id);
    if (keyword && keyword.status === 'failed') {
      keyword.status = 'pending';
      keyword.retryCount = 0;
      this.statsCache.invalidate();
      return true;
    }
    return false;
  }

  // --------------------------------------------------------------------------
  // Remove Operations
  // --------------------------------------------------------------------------

  /**
   * Remove a keyword from the queue by ID
   * 
   * @param id - The keyword ID to remove
   * @returns true if removed, false if not found
   */
  remove(id: string): boolean {
    const index = this.queue.findIndex(k => k.id === id);
    if (index > -1) {
      const keyword = this.queue[index];
      this.normalizedKeywordIndex.delete(keyword.keyword.toLowerCase());
      this.queue.splice(index, 1);
      this.statsCache.invalidate();
      return true;
    }
    return false;
  }

  /**
   * Remove multiple keywords by IDs
   * 
   * @param ids - Array of keyword IDs to remove
   * @returns Number of keywords removed
   */
  removeBatch(ids: string[]): number {
    const idSet = new Set(ids);
    const initialLength = this.queue.length;
    
    this.queue = this.queue.filter(k => {
      if (idSet.has(k.id)) {
        this.normalizedKeywordIndex.delete(k.keyword.toLowerCase());
        return false;
      }
      return true;
    });
    
    const removed = initialLength - this.queue.length;
    if (removed > 0) {
      this.statsCache.invalidate();
    }
    
    return removed;
  }

  /**
   * Remove all keywords with a specific status
   * 
   * @param status - The status to filter by
   * @returns Number of keywords removed
   */
  removeByStatus(status: KeywordStatus): number {
    const initialLength = this.queue.length;
    
    this.queue = this.queue.filter(k => {
      if (k.status === status) {
        this.normalizedKeywordIndex.delete(k.keyword.toLowerCase());
        return false;
      }
      return true;
    });
    
    const removed = initialLength - this.queue.length;
    if (removed > 0) {
      this.statsCache.invalidate();
    }
    
    return removed;
  }

  /**
   * Clear all keywords from the queue
   */
  clear(): void {
    this.queue = [];
    this.processedKeywords.clear();
    this.normalizedKeywordIndex.clear();
    this.statsCache.invalidate();
  }

  // --------------------------------------------------------------------------
  // Query Operations
  // --------------------------------------------------------------------------

  /**
   * Get all keywords in the queue
   * 
   * @returns Copy of the keyword array
   */
  getAll(): QueuedKeyword[] {
    return [...this.queue];
  }

  /**
   * Get a keyword by ID
   * 
   * @param id - The keyword ID to find
   * @returns The keyword or undefined if not found
   */
  getById(id: string): QueuedKeyword | undefined {
    return this.findById(id);
  }

  /**
   * Get keywords by status
   * 
   * @param status - The status to filter by
   * @returns Array of keywords with the given status
   */
  getByStatus(status: KeywordStatus): QueuedKeyword[] {
    return this.queue.filter(k => k.status === status);
  }

  /**
   * Search keywords by text (case-insensitive partial match)
   * 
   * @param searchText - Text to search for
   * @param limit - Maximum results to return
   * @returns Array of matching keywords
   */
  search(searchText: string, limit: number = 100): QueuedKeyword[] {
    const normalized = searchText.toLowerCase();
    return this.queue
      .filter(k => k.keyword.toLowerCase().includes(normalized))
      .slice(0, limit);
  }

  /**
   * Get queue statistics (cached for performance)
   * 
   * @returns Object containing count by status
   */
  getStats(): KeywordQueueStats {
    const cached = this.statsCache.get();
    if (cached) {
      return cached;
    }

    const stats = this.calculateStats();
    this.statsCache.set(stats);
    return stats;
  }

  /**
   * Calculate statistics (bypasses cache)
   */
  private calculateStats(): KeywordQueueStats {
    const stats: KeywordQueueStats = {
      total: this.queue.length,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    };

    for (const keyword of this.queue) {
      stats[keyword.status]++;
    }

    return stats;
  }

  // --------------------------------------------------------------------------
  // Export Operations
  // --------------------------------------------------------------------------

  /**
   * Export queue to CSV format
   * 
   * @param options - Export options
   * @returns CSV string
   */
  exportToCSV(options: CSVExportOptions = {}): string {
    const {
      includeHeaders = true,
      delimiter = ',',
      includeMetadata = false
    } = options;

    const lines: string[] = [];

    if (includeHeaders) {
      const headers = ['keyword', 'status', 'priority', 'retryCount', 'addedAt'];
      if (includeMetadata) headers.push('metadata');
      lines.push(headers.join(delimiter));
    }

    for (const k of this.queue) {
      const row = [
        `"${k.keyword.replace(/"/g, '""')}"`,
        k.status,
        k.priority.toString(),
        k.retryCount.toString(),
        k.addedAt.toISOString()
      ];
      if (includeMetadata) {
        row.push(k.metadata ? JSON.stringify(k.metadata) : '');
      }
      lines.push(row.join(delimiter));
    }

    return lines.join('\n');
  }

  /**
   * Export keywords only (just the keyword strings)
   * 
   * @param status - Optional status filter
   * @returns Array of keyword strings
   */
  exportKeywords(status?: KeywordStatus): string[] {
    const keywords = status 
      ? this.queue.filter(k => k.status === status)
      : this.queue;
    return keywords.map(k => k.keyword);
  }

  // --------------------------------------------------------------------------
  // Properties
  // --------------------------------------------------------------------------

  /**
   * Get the current queue size
   */
  get size(): number {
    return this.queue.length;
  }

  /**
   * Check if the queue is empty
   */
  get isEmpty(): boolean {
    return this.queue.length === 0;
  }

  /**
   * Check if the queue is full
   */
  get isFull(): boolean {
    return this.queue.length >= this.config.maxSize;
  }

  /**
   * Get remaining capacity
   */
  get remainingCapacity(): number {
    return Math.max(0, this.config.maxSize - this.queue.length);
  }

  /**
   * Get the current configuration
   */
  get configuration(): KeywordQueueConfig {
    return { ...this.config };
  }

  // --------------------------------------------------------------------------
  // Persistence Operations (PRD SA-001 #10)
  // --------------------------------------------------------------------------

  /**
   * Export queue state for persistence
   * Serializes all keywords to a format suitable for database storage
   * 
   * @returns Serialized queue state
   */
  exportState(): KeywordQueueState {
    return {
      sessionId: this._sessionId,
      keywords: this.queue.map(k => ({
        id: k.id,
        keyword: k.keyword,
        priority: k.priority,
        addedAt: k.addedAt.toISOString(),
        status: k.status,
        retryCount: k.retryCount,
        maxRetries: k.maxRetries,
        metadata: k.metadata,
      })),
    };
  }

  /**
   * Create a KeywordQueue from exported state
   * Restores all keywords with their original status, priority, and metadata
   * 
   * @param state - Previously exported queue state
   * @param config - Optional configuration overrides
   * @returns Restored KeywordQueue instance
   */
  static fromState(
    state: KeywordQueueState,
    config: Partial<KeywordQueueConfig> = {}
  ): KeywordQueue {
    const queue = new KeywordQueue({
      ...config,
      sessionId: state.sessionId,
    });

    // Restore keywords directly without validation/deduplication
    // since they were already validated when originally added
    for (const serialized of state.keywords) {
      const keyword: QueuedKeyword = {
        id: serialized.id,
        keyword: serialized.keyword,
        priority: serialized.priority,
        addedAt: new Date(serialized.addedAt),
        status: serialized.status,
        retryCount: serialized.retryCount,
        maxRetries: serialized.maxRetries,
        metadata: serialized.metadata,
      };
      queue.queue.push(keyword);
      queue.normalizedKeywordIndex.add(keyword.keyword.toLowerCase());
      
      if (keyword.status === 'completed') {
        queue.processedKeywords.add(keyword.keyword.toLowerCase());
      }
    }

    // Sort by priority if enabled
    if (queue.config.priorityEnabled) {
      queue.sortByPriority();
    }

    return queue;
  }

  // --------------------------------------------------------------------------
  // Private Helper Methods
  // --------------------------------------------------------------------------

  /**
   * Find keyword by ID
   */
  private findById(id: string): QueuedKeyword | undefined {
    return this.queue.find(k => k.id === id);
  }

  /**
   * Validate keyword input
   * Only rejects empty strings; all other content is allowed
   */
  private validateKeyword(keyword: string): boolean {
    return keyword.length > 0;
  }

  /**
   * Check if keyword is a duplicate
   */
  private isDuplicate(keyword: string): boolean {
    if (!this.config.deduplication) {
      return false;
    }
    return this.normalizedKeywordIndex.has(keyword.toLowerCase());
  }

  /**
   * Index keyword for deduplication
   */
  private indexKeyword(keyword: string): void {
    if (this.config.deduplication) {
      this.normalizedKeywordIndex.add(keyword.toLowerCase());
    }
  }

  /**
   * Create a new queued keyword object
   */
  private createQueuedKeyword(keyword: string, options: AddKeywordOptions): QueuedKeyword {
    return {
      id: IdGenerator.generate(),
      keyword,
      priority: options.priority ?? 0,
      addedAt: new Date(),
      status: 'pending',
      retryCount: 0,
      maxRetries: options.maxRetries ?? this.config.defaultMaxRetries,
      metadata: options.metadata,
    };
  }

  /**
   * Insert keyword maintaining priority order
   */
  private insertKeyword(keyword: QueuedKeyword): void {
    if (!this.config.priorityEnabled || this.queue.length === 0) {
      this.queue.push(keyword);
      return;
    }

    // Binary search for insertion point (maintain sorted order)
    let left = 0;
    let right = this.queue.length;

    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (this.queue[mid].priority >= keyword.priority) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }

    this.queue.splice(left, 0, keyword);
  }

  /**
   * Sort the queue by priority (descending)
   */
  private sortByPriority(): void {
    this.queue.sort((a, b) => b.priority - a.priority);
  }
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default KeywordQueue;

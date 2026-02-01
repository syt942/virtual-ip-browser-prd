/**
 * Position Tracker Module
 * SERP position tracking and history management for Virtual IP Browser
 * 
 * Features:
 * - Position recording with full metadata
 * - History storage with configurable limits (in-memory with optional persistence)
 * - Trend analysis (improving/declining/stable)
 * - Position change detection and alerts
 * - Export/Import functionality
 * - Event-driven architecture
 * - Repository pattern support for database persistence
 * 
 * @module electron/core/automation/position-tracker
 */

import { SearchEngine } from './types';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default maximum history entries per keyword-domain-engine combination */
const DEFAULT_HISTORY_LIMIT = 100;

/** Default alert threshold for significant position changes */
const DEFAULT_ALERT_THRESHOLD = 10;

/** Minimum data points required for trend analysis */
const MIN_TREND_DATA_POINTS = 2;

/** Threshold for determining if position is stable (position difference) */
const TREND_STABILITY_THRESHOLD = 2;

/** Key separator for composite keys */
const KEY_SEPARATOR = '|||';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * A single position record from SERP tracking
 */
export interface PositionRecord {
  /** Unique identifier */
  id: string;
  /** Search keyword */
  keyword: string;
  /** Target domain being tracked */
  domain: string;
  /** Search engine used */
  engine: SearchEngine;
  /** Position in SERP (null if not found) */
  position: number | null;
  /** Page number where found */
  page: number;
  /** Full URL of the result */
  url: string;
  /** Title of the search result */
  title: string;
  /** Description/snippet of the result */
  description: string;
  /** When this position was recorded */
  timestamp: Date;
  /** Proxy region used for the search */
  proxyRegion?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Represents a change in position between two records
 */
export interface PositionChange {
  /** Search keyword */
  keyword: string;
  /** Target domain */
  domain: string;
  /** Previous position (null if wasn't found) */
  previousPosition: number | null;
  /** Current position (null if not found) */
  currentPosition: number | null;
  /** Numeric change (positive = improved, null if can't calculate) */
  change: number | null;
  /** Direction of change */
  direction: PositionChangeDirection;
  /** When this change was recorded */
  timestamp: Date;
}

/** Direction of position change */
export type PositionChangeDirection = 'up' | 'down' | 'same' | 'new' | 'lost';

/**
 * Trend analysis result for a keyword-domain pair
 */
export interface PositionTrend {
  /** Search keyword */
  keyword: string;
  /** Target domain */
  domain: string;
  /** Average position over the period */
  avgPosition: number | null;
  /** Best (lowest) position achieved */
  bestPosition: number | null;
  /** Worst (highest) position recorded */
  worstPosition: number | null;
  /** Position volatility (standard deviation) */
  volatility: number;
  /** Number of data points used */
  dataPoints: number;
  /** Overall trend direction */
  trend: TrendDirection;
}

/** Trend direction enumeration */
export type TrendDirection = 'improving' | 'declining' | 'stable' | 'insufficient-data';

/**
 * Configuration options for PositionTracker
 */
export interface PositionTrackerConfig {
  /** Maximum history entries per keyword-domain-engine combination */
  historyLimit: number;
  /** Whether to track "not found" results */
  trackNotFound: boolean;
  /** Alert threshold for significant position changes */
  alertOnChange: number;
}

/**
 * Input data for recording a position (without auto-generated fields)
 */
export type PositionRecordInput = Omit<PositionRecord, 'id' | 'timestamp'>;

/**
 * Tracked pair information
 */
export interface TrackedPair {
  keyword: string;
  domain: string;
  engine: string;
}

/**
 * Position tracker statistics
 */
export interface PositionTrackerStats {
  totalPairs: number;
  totalRecords: number;
  avgRecordsPerPair: number;
}

/**
 * Event types emitted by PositionTracker
 */
export type PositionEventType = 
  | 'position:recorded'
  | 'position:changed'
  | 'position:new'
  | 'position:alert';

/** Event handler function type */
export type PositionEventHandler<T = unknown> = (data: T) => void;

// ============================================================================
// TREND ANALYZER
// ============================================================================

/**
 * Analyzes position trends from historical data.
 * Extracted for clarity and testability.
 */
class TrendAnalyzer {
  /**
   * Calculate trend statistics from position history
   * 
   * @param positions - Array of numeric positions (excluding null values)
   * @returns Trend statistics
   */
  static analyze(positions: number[]): {
    avg: number | null;
    best: number | null;
    worst: number | null;
    volatility: number;
    trend: TrendDirection;
  } {
    if (positions.length < MIN_TREND_DATA_POINTS) {
      return {
        avg: positions.length === 1 ? positions[0] : null,
        best: positions.length === 1 ? positions[0] : null,
        worst: positions.length === 1 ? positions[0] : null,
        volatility: 0,
        trend: 'insufficient-data'
      };
    }

    const avg = this.calculateAverage(positions);
    const best = Math.min(...positions);
    const worst = Math.max(...positions);
    const volatility = this.calculateStandardDeviation(positions, avg);
    const trend = this.determineTrend(positions);

    return {
      avg: this.roundToTwoDecimals(avg),
      best,
      worst,
      volatility: this.roundToTwoDecimals(volatility),
      trend
    };
  }

  /**
   * Calculate average of positions
   */
  private static calculateAverage(positions: number[]): number {
    return positions.reduce((sum, p) => sum + p, 0) / positions.length;
  }

  /**
   * Calculate standard deviation (volatility)
   */
  private static calculateStandardDeviation(positions: number[], mean: number): number {
    const squaredDiffs = positions.map(p => Math.pow(p - mean, 2));
    const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / positions.length;
    return Math.sqrt(variance);
  }

  /**
   * Determine trend by comparing first half to second half averages
   */
  private static determineTrend(positions: number[]): TrendDirection {
    const midpoint = Math.floor(positions.length / 2);
    const firstHalf = positions.slice(0, midpoint);
    const secondHalf = positions.slice(midpoint);

    const firstAvg = this.calculateAverage(firstHalf);
    const secondAvg = this.calculateAverage(secondHalf);

    // Positive difference means lower (better) positions in second half
    const difference = firstAvg - secondAvg;

    if (Math.abs(difference) < TREND_STABILITY_THRESHOLD) {
      return 'stable';
    }
    return difference > 0 ? 'improving' : 'declining';
  }

  /**
   * Round number to two decimal places
   */
  private static roundToTwoDecimals(value: number): number {
    return Math.round(value * 100) / 100;
  }
}

// ============================================================================
// CHANGE CALCULATOR
// ============================================================================

/**
 * Calculates position changes between records.
 * Extracted for clarity and testability.
 */
class ChangeCalculator {
  /**
   * Calculate the change between two position records
   * 
   * @param previous - Previous position record
   * @param current - Current position record
   * @returns Position change analysis
   */
  static calculate(previous: PositionRecord, current: PositionRecord): PositionChange {
    const direction = this.determineDirection(previous.position, current.position);
    const change = this.calculateNumericChange(previous.position, current.position);

    return {
      keyword: current.keyword,
      domain: current.domain,
      previousPosition: previous.position,
      currentPosition: current.position,
      change,
      direction,
      timestamp: current.timestamp
    };
  }

  /**
   * Determine the direction of position change
   */
  private static determineDirection(
    previousPos: number | null,
    currentPos: number | null
  ): PositionChangeDirection {
    if (previousPos === null && currentPos !== null) {
      return 'new';
    }
    if (previousPos !== null && currentPos === null) {
      return 'lost';
    }
    if (previousPos === null && currentPos === null) {
      return 'same';
    }
    if (previousPos !== null && currentPos !== null) {
      const diff = previousPos - currentPos;
      if (diff > 0) return 'up';
      if (diff < 0) return 'down';
      return 'same';
    }
    return 'same';
  }

  /**
   * Calculate numeric position change (positive = improved)
   */
  private static calculateNumericChange(
    previousPos: number | null,
    currentPos: number | null
  ): number | null {
    if (previousPos !== null && currentPos !== null) {
      return previousPos - currentPos;
    }
    return null;
  }
}

// ============================================================================
// POSITION TRACKER CLASS
// ============================================================================

/**
 * PositionTracker for tracking SERP positions over time
 * 
 * @example
 * ```typescript
 * const tracker = new PositionTracker({ historyLimit: 100 });
 * 
 * // Record a position
 * tracker.record({
 *   keyword: 'best coffee',
 *   domain: 'example.com',
 *   engine: 'google',
 *   position: 5,
 *   page: 1,
 *   url: 'https://example.com/coffee',
 *   title: 'Best Coffee Guide',
 *   description: 'Your guide to the best coffee...'
 * });
 * 
 * // Get trend analysis
 * const trend = tracker.getTrend('best coffee', 'example.com', 'google');
 * console.log(trend.trend); // 'improving' | 'declining' | 'stable' | 'insufficient-data'
 * ```
 */
export class PositionTracker {
  private records: Map<string, PositionRecord[]> = new Map();
  private config: PositionTrackerConfig;
  private eventHandlers: Map<PositionEventType, PositionEventHandler[]> = new Map();

  /**
   * Create a new PositionTracker instance
   * 
   * @param config - Configuration options
   */
  constructor(config: Partial<PositionTrackerConfig> = {}) {
    this.config = {
      historyLimit: config.historyLimit ?? DEFAULT_HISTORY_LIMIT,
      trackNotFound: config.trackNotFound ?? true,
      alertOnChange: config.alertOnChange ?? DEFAULT_ALERT_THRESHOLD,
    };
  }

  // --------------------------------------------------------------------------
  // Recording Methods
  // --------------------------------------------------------------------------

  /**
   * Record a new position
   * 
   * @param data - Position data to record
   * @returns The created position record with id and timestamp
   */
  record(data: PositionRecordInput): PositionRecord {
    const record: PositionRecord = {
      ...data,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };

    const key = this.createCompositeKey(data.keyword, data.domain, data.engine);
    const history = this.getOrCreateHistory(key);

    this.handlePositionChange(history, record);
    this.addToHistory(history, record, key);
    this.emit('position:recorded', record);

    return record;
  }

  /**
   * Handle position change detection and events
   */
  private handlePositionChange(history: PositionRecord[], record: PositionRecord): void {
    if (history.length === 0) {
      this.emit('position:new', record);
      return;
    }

    const lastRecord = history[history.length - 1];
    const change = ChangeCalculator.calculate(lastRecord, record);

    if (change.direction !== 'same') {
      this.emit('position:changed', change);
    }

    if (this.isSignificantChange(change)) {
      this.emit('position:alert', change);
    }
  }

  /**
   * Check if a change is significant enough to trigger an alert
   */
  private isSignificantChange(change: PositionChange): boolean {
    return change.change !== null && Math.abs(change.change) >= this.config.alertOnChange;
  }

  /**
   * Add record to history and enforce limits
   */
  private addToHistory(history: PositionRecord[], record: PositionRecord, key: string): void {
    history.push(record);

    while (history.length > this.config.historyLimit) {
      history.shift();
    }

    this.records.set(key, history);
  }

  /**
   * Get or create history array for a key
   */
  private getOrCreateHistory(key: string): PositionRecord[] {
    if (!this.records.has(key)) {
      this.records.set(key, []);
    }
    return this.records.get(key)!;
  }

  // --------------------------------------------------------------------------
  // Query Methods
  // --------------------------------------------------------------------------

  /**
   * Get position history for a keyword-domain pair
   * 
   * @param keyword - Search keyword
   * @param domain - Target domain
   * @param engine - Search engine
   * @returns Array of position records
   */
  getHistory(keyword: string, domain: string, engine: string): PositionRecord[] {
    const key = this.createCompositeKey(keyword, domain, engine);
    return this.records.get(key) ?? [];
  }

  /**
   * Get latest position for a keyword-domain pair
   * 
   * @param keyword - Search keyword
   * @param domain - Target domain
   * @param engine - Search engine
   * @returns Latest position record or null if none exists
   */
  getLatest(keyword: string, domain: string, engine: string): PositionRecord | null {
    const history = this.getHistory(keyword, domain, engine);
    return history.length > 0 ? history[history.length - 1] : null;
  }

  /**
   * Get all tracked keyword-domain pairs
   * 
   * @returns Array of tracked pairs with keyword, domain, and engine
   */
  getTrackedPairs(): TrackedPair[] {
    return Array.from(this.records.keys()).map(key => {
      const [keyword, domain, engine] = key.split(KEY_SEPARATOR);
      return { keyword, domain, engine };
    });
  }

  // --------------------------------------------------------------------------
  // Analysis Methods
  // --------------------------------------------------------------------------

  /**
   * Get position trend analysis
   * 
   * @param keyword - Search keyword
   * @param domain - Target domain
   * @param engine - Search engine
   * @returns Trend analysis with statistics
   */
  getTrend(keyword: string, domain: string, engine: string): PositionTrend {
    const history = this.getHistory(keyword, domain, engine);
    const positions = history
      .filter(r => r.position !== null)
      .map(r => r.position as number);

    const analysis = TrendAnalyzer.analyze(positions);

    return {
      keyword,
      domain,
      avgPosition: analysis.avg,
      bestPosition: analysis.best,
      worstPosition: analysis.worst,
      volatility: analysis.volatility,
      dataPoints: positions.length,
      trend: analysis.trend,
    };
  }

  /**
   * Get position changes over time period
   * 
   * @param keyword - Search keyword
   * @param domain - Target domain
   * @param engine - Search engine
   * @param since - Optional date filter (only changes after this date)
   * @returns Array of position changes
   */
  getChanges(keyword: string, domain: string, engine: string, since?: Date): PositionChange[] {
    const history = this.getHistory(keyword, domain, engine);
    const changes: PositionChange[] = [];

    for (let i = 1; i < history.length; i++) {
      const change = ChangeCalculator.calculate(history[i - 1], history[i]);
      if (!since || change.timestamp >= since) {
        changes.push(change);
      }
    }

    return changes;
  }

  // --------------------------------------------------------------------------
  // Statistics Methods
  // --------------------------------------------------------------------------

  /**
   * Get statistics summary for all tracked data
   * 
   * @returns Summary statistics
   */
  getStatistics(): PositionTrackerStats {
    const totalPairs = this.records.size;
    let totalRecords = 0;

    this.records.forEach(records => {
      totalRecords += records.length;
    });

    return {
      totalPairs,
      totalRecords,
      avgRecordsPerPair: totalPairs > 0 
        ? Math.round((totalRecords / totalPairs) * 100) / 100 
        : 0,
    };
  }

  // --------------------------------------------------------------------------
  // Export/Import Methods
  // --------------------------------------------------------------------------

  /**
   * Export all position data
   * 
   * @returns All position records sorted by timestamp
   */
  export(): PositionRecord[] {
    const all: PositionRecord[] = [];
    this.records.forEach(records => all.push(...records));
    return all.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Import position records
   * 
   * @param records - Array of position records to import
   * @returns Number of records imported
   */
  import(records: PositionRecord[]): number {
    let imported = 0;
    for (const record of records) {
      const key = this.createCompositeKey(record.keyword, record.domain, record.engine);
      const history = this.getOrCreateHistory(key);
      history.push(record);
      imported++;
    }
    return imported;
  }

  // --------------------------------------------------------------------------
  // Data Management Methods
  // --------------------------------------------------------------------------

  /**
   * Clear all tracked data
   */
  clear(): void {
    this.records.clear();
  }

  /**
   * Clear data for specific keyword-domain pair
   * 
   * @param keyword - Search keyword
   * @param domain - Target domain
   * @param engine - Search engine
   * @returns True if data was cleared, false if pair didn't exist
   */
  clearPair(keyword: string, domain: string, engine: string): boolean {
    const key = this.createCompositeKey(keyword, domain, engine);
    return this.records.delete(key);
  }

  /**
   * Destroy the tracker and clean up all resources.
   * Clears all records, removes all event listeners, and resets state.
   * Safe to call multiple times.
   * 
   * @example
   * ```typescript
   * const tracker = new PositionTracker();
   * // ... use tracker ...
   * tracker.destroy(); // Clean up when done
   * ```
   */
  destroy(): void {
    // Clear all position records
    this.records.clear();
    
    // Remove all event listeners
    this.eventHandlers.clear();
  }

  // --------------------------------------------------------------------------
  // Configuration Methods
  // --------------------------------------------------------------------------

  /**
   * Update configuration
   * 
   * @param config - Partial configuration to update
   */
  updateConfig(config: Partial<PositionTrackerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   * 
   * @returns Current configuration
   */
  getConfig(): PositionTrackerConfig {
    return { ...this.config };
  }

  // --------------------------------------------------------------------------
  // Event Handling Methods
  // --------------------------------------------------------------------------

  /**
   * Register an event handler
   * 
   * @param event - Event name (position:recorded, position:changed, position:new, position:alert)
   * @param handler - Handler function
   */
  on<T = unknown>(event: PositionEventType, handler: PositionEventHandler<T>): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler as PositionEventHandler);
  }

  /**
   * Remove an event handler
   * 
   * @param event - Event name
   * @param handler - Handler function to remove
   */
  off<T = unknown>(event: PositionEventType, handler: PositionEventHandler<T>): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler as PositionEventHandler);
      if (index > -1) handlers.splice(index, 1);
    }
  }

  /**
   * Emit an event
   * 
   * @param event - Event name
   * @param data - Event data
   */
  private emit(event: PositionEventType, data: unknown): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  // --------------------------------------------------------------------------
  // Private Utility Methods
  // --------------------------------------------------------------------------

  /**
   * Create composite key for keyword-domain-engine combination
   * 
   * @param keyword - Search keyword
   * @param domain - Target domain
   * @param engine - Search engine
   * @returns Composite key string
   */
  private createCompositeKey(keyword: string, domain: string, engine: string): string {
    return `${keyword}${KEY_SEPARATOR}${domain}${KEY_SEPARATOR}${engine}`;
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a new PositionTracker instance
 * 
 * @param config - Optional configuration
 * @returns New PositionTracker instance
 */
export function createPositionTracker(config?: Partial<PositionTrackerConfig>): PositionTracker {
  return new PositionTracker(config);
}

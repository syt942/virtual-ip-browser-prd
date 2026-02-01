/**
 * ResourceMonitor - System Resource Monitoring for Automation
 *
 * Monitors CPU, memory, and tab usage during automation tasks.
 * Provides threshold detection, throttling recommendations, and health checks.
 *
 * Features:
 * - Configurable polling intervals with exponential backoff
 * - Memory pressure detection
 * - Event debouncing for threshold notifications
 * - Metrics history with statistical analysis
 *
 * @module electron/core/automation/resource-monitor
 */

import * as os from 'os';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default polling interval in milliseconds */
const DEFAULT_POLL_INTERVAL_MS = 5000;

/** Minimum polling interval (prevents CPU spinning) */
const MIN_POLL_INTERVAL_MS = 1000;

/** Maximum polling interval (for backoff) */
const MAX_POLL_INTERVAL_MS = 30000;

/** Maximum metrics history size */
const MAX_HISTORY_SIZE = 100;

/** Backoff multiplier for adaptive polling */
const BACKOFF_MULTIPLIER = 1.5;

/** Recovery divisor for reducing interval */
const RECOVERY_DIVISOR = 1.2;

/** Event debounce window in milliseconds */
const EVENT_DEBOUNCE_MS = 5000;

/** Memory pressure detection threshold (percentage) */
const MEMORY_PRESSURE_THRESHOLD = 90;

/** High memory pressure threshold for critical alerts */
const CRITICAL_MEMORY_PRESSURE = 95;

// ============================================================================
// DEFAULT THRESHOLDS
// PRD AE-003 Acceptance Criteria #1-2 specify 80% thresholds for warnings
// ============================================================================

const DEFAULT_THRESHOLDS: ResourceThresholds = {
  cpuWarning: 80,      // PRD AE-003 criterion #1: CPU warning at 80%
  cpuCritical: 90,
  memoryWarning: 80,   // PRD AE-003 criterion #2: Memory warning at 80%
  memoryCritical: 85,
  maxTabs: 50,
};

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Current system resource metrics
 */
export interface ResourceMetrics {
  /** CPU usage percentage (0-100) */
  cpu: number;
  /** Memory usage percentage (0-100) */
  memory: number;
  /** Memory used in bytes */
  memoryUsed: number;
  /** Total system memory in bytes */
  memoryTotal: number;
  /** Available memory in bytes */
  memoryAvailable: number;
  /** Number of active browser tabs */
  tabCount: number;
  /** Whether system is under memory pressure */
  memoryPressure: boolean;
  /** Timestamp when metrics were collected */
  timestamp: Date;
}

/**
 * Configurable resource thresholds
 * Default values align with PRD AE-003 requirements
 */
export interface ResourceThresholds {
  /** CPU warning threshold (default: 80% per PRD AE-003) */
  cpuWarning: number;
  /** CPU critical threshold (default: 90%) */
  cpuCritical: number;
  /** Memory warning threshold (default: 80% per PRD AE-003) */
  memoryWarning: number;
  /** Memory critical threshold (default: 85%) */
  memoryCritical: number;
  /** Maximum allowed tabs (default: 50) */
  maxTabs: number;
}

/**
 * Resource monitor configuration
 */
export interface ResourceMonitorConfig {
  /** Base polling interval in milliseconds */
  pollIntervalMs: number;
  /** Enable adaptive polling (exponential backoff) */
  adaptivePolling: boolean;
  /** Enable event debouncing */
  debounceEvents: boolean;
  /** Debounce window in milliseconds */
  debounceWindowMs: number;
  /** Maximum history entries to keep */
  maxHistorySize: number;
}

/**
 * Recommended throttle action based on resource usage
 */
export interface ThrottleAction {
  /** Type of throttle action to take */
  type: ThrottleActionType;
  /** Human-readable reason for the action */
  reason: string;
  /** Severity level */
  severity: ThrottleSeverity;
  /** Suggested delay multiplier */
  delayMultiplier?: number;
  /** Suggested tab reduction count */
  reduceTabsBy?: number;
}

/** Throttle action types */
export type ThrottleActionType = 'none' | 'reduce-tabs' | 'increase-delay' | 'pause' | 'stop';

/** Throttle severity levels */
export type ThrottleSeverity = 'normal' | 'warning' | 'critical';

/**
 * Event types emitted by ResourceMonitor
 */
export type ResourceEventType =
  | 'metrics:updated'
  | 'threshold:warning'
  | 'threshold:critical'
  | 'memory:pressure'
  | 'memory:pressure:critical'
  | 'throttle:recommended';

/**
 * Threshold event data
 */
export interface ThresholdEventData {
  type: 'cpu' | 'memory' | 'tabs';
  value: number;
}

/**
 * Event handler function type
 */
export type ResourceEventHandler<T = unknown> = (data: T) => void;

/**
 * Average metrics result
 */
export interface AverageMetrics {
  avgCpu: number;
  avgMemory: number;
  minCpu: number;
  maxCpu: number;
  minMemory: number;
  maxMemory: number;
}

// ============================================================================
// EVENT DEBOUNCER
// ============================================================================

/**
 * Debounces events to prevent excessive notifications
 */
class EventDebouncer {
  private lastEmitted: Map<string, number> = new Map();
  private windowMs: number;

  constructor(windowMs: number = EVENT_DEBOUNCE_MS) {
    this.windowMs = windowMs;
  }

  /**
   * Check if event should be emitted (not debounced)
   */
  shouldEmit(eventKey: string): boolean {
    const now = Date.now();
    const lastTime = this.lastEmitted.get(eventKey);

    if (!lastTime || now - lastTime >= this.windowMs) {
      this.lastEmitted.set(eventKey, now);
      return true;
    }

    return false;
  }

  /**
   * Clear debounce state
   */
  clear(): void {
    this.lastEmitted.clear();
  }

  /**
   * Update debounce window
   */
  setWindow(windowMs: number): void {
    this.windowMs = windowMs;
  }
}

// ============================================================================
// ADAPTIVE POLLING CONTROLLER
// ============================================================================

/**
 * Controls polling interval with exponential backoff
 */
class AdaptivePollingController {
  private currentInterval: number;
  private readonly baseInterval: number;
  private readonly minInterval: number;
  private readonly maxInterval: number;

  constructor(
    baseInterval: number,
    minInterval: number = MIN_POLL_INTERVAL_MS,
    maxInterval: number = MAX_POLL_INTERVAL_MS
  ) {
    this.baseInterval = baseInterval;
    this.currentInterval = baseInterval;
    this.minInterval = minInterval;
    this.maxInterval = maxInterval;
  }

  /**
   * Get current polling interval
   */
  getInterval(): number {
    return this.currentInterval;
  }

  /**
   * Increase interval (backoff) due to high resource usage
   */
  backoff(): number {
    this.currentInterval = Math.min(
      this.currentInterval * BACKOFF_MULTIPLIER,
      this.maxInterval
    );
    return this.currentInterval;
  }

  /**
   * Decrease interval (recover) due to low resource usage
   */
  recover(): number {
    this.currentInterval = Math.max(
      this.currentInterval / RECOVERY_DIVISOR,
      this.minInterval,
      this.baseInterval
    );
    return this.currentInterval;
  }

  /**
   * Reset to base interval
   */
  reset(): void {
    this.currentInterval = this.baseInterval;
  }
}

// ============================================================================
// CPU USAGE CALCULATOR
// ============================================================================

/**
 * Calculates CPU usage from OS metrics
 */
class CpuUsageCalculator {
  private previousCpuInfo: os.CpuInfo[] | null = null;

  /**
   * Calculate current CPU usage percentage
   */
  calculate(): number {
    const cpus = os.cpus();

    if (!this.previousCpuInfo) {
      this.previousCpuInfo = cpus;
      return 0;
    }

    let totalIdle = 0;
    let totalTick = 0;

    for (let i = 0; i < cpus.length; i++) {
      const cpu = cpus[i];
      const prevCpu = this.previousCpuInfo[i];

      const idle = cpu.times.idle - prevCpu.times.idle;
      const total =
        cpu.times.user - prevCpu.times.user +
        cpu.times.nice - prevCpu.times.nice +
        cpu.times.sys - prevCpu.times.sys +
        cpu.times.irq - prevCpu.times.irq +
        idle;

      totalIdle += idle;
      totalTick += total;
    }

    this.previousCpuInfo = cpus;

    if (totalTick === 0) return 0;

    const usage = ((totalTick - totalIdle) / totalTick) * 100;
    return this.roundToTwoDecimals(usage);
  }

  /**
   * Reset calculator state
   */
  reset(): void {
    this.previousCpuInfo = null;
  }

  private roundToTwoDecimals(value: number): number {
    return Math.round(value * 100) / 100;
  }
}

// ============================================================================
// RESOURCE MONITOR CLASS
// ============================================================================

/**
 * ResourceMonitor class for monitoring system resources during automation.
 *
 * Features:
 * - Configurable polling intervals with adaptive backoff
 * - Memory pressure detection
 * - Event debouncing for threshold notifications
 * - Comprehensive throttling recommendations
 * - Metrics history for statistical analysis
 *
 * @example
 * ```typescript
 * const monitor = new ResourceMonitor({ cpuWarning: 60 });
 *
 * monitor.on('threshold:warning', (data) => {
 *   console.log(`Warning: ${data.type} at ${data.value}%`);
 * });
 *
 * monitor.on('memory:pressure', () => {
 *   console.log('System under memory pressure!');
 * });
 *
 * monitor.start();
 *
 * // Later...
 * const action = monitor.getThrottleAction();
 * if (action.type !== 'none') {
 *   console.log(`Throttling required: ${action.reason}`);
 * }
 *
 * monitor.stop();
 * ```
 */
export class ResourceMonitor {
  private thresholds: ResourceThresholds;
  private config: ResourceMonitorConfig;
  private currentMetrics: ResourceMetrics | null = null;
  private isMonitoring: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private eventHandlers: Map<ResourceEventType, ResourceEventHandler[]> = new Map();
  private metricsHistory: ResourceMetrics[] = [];
  private tabCountProvider: (() => number) | null = null;

  // Helpers
  private cpuCalculator: CpuUsageCalculator;
  private debouncer: EventDebouncer;
  private pollingController: AdaptivePollingController;

  /**
   * Creates a new ResourceMonitor instance.
   *
   * @param thresholds - Optional partial thresholds to override defaults
   * @param config - Optional configuration options
   */
  constructor(
    thresholds: Partial<ResourceThresholds> = {},
    config: Partial<ResourceMonitorConfig> = {}
  ) {
    this.thresholds = {
      ...DEFAULT_THRESHOLDS,
      ...thresholds,
    };

    this.config = {
      pollIntervalMs: config.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS,
      adaptivePolling: config.adaptivePolling ?? true,
      debounceEvents: config.debounceEvents ?? true,
      debounceWindowMs: config.debounceWindowMs ?? EVENT_DEBOUNCE_MS,
      maxHistorySize: config.maxHistorySize ?? MAX_HISTORY_SIZE,
    };

    this.cpuCalculator = new CpuUsageCalculator();
    this.debouncer = new EventDebouncer(this.config.debounceWindowMs);
    this.pollingController = new AdaptivePollingController(this.config.pollIntervalMs);
  }

  // ==========================================================================
  // Monitoring Control
  // ==========================================================================

  /**
   * Start monitoring system resources.
   *
   * @param intervalMs - Optional override for polling interval
   */
  start(intervalMs?: number): void {
    if (this.isMonitoring) return;

    if (intervalMs !== undefined) {
      this.config.pollIntervalMs = intervalMs;
      this.pollingController = new AdaptivePollingController(intervalMs);
    }

    this.isMonitoring = true;
    this.cpuCalculator.reset();

    // Collect initial metrics
    this.collectMetrics();

    // Start periodic collection
    this.scheduleNextCollection();
  }

  /**
   * Stop monitoring system resources.
   * Clears the monitoring interval but preserves collected metrics.
   */
  stop(): void {
    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearTimeout(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Check if monitoring is currently active.
   */
  get monitoring(): boolean {
    return this.isMonitoring;
  }

  /**
   * Get current polling interval
   */
  get currentPollInterval(): number {
    return this.pollingController.getInterval();
  }

  // ==========================================================================
  // Metrics Access
  // ==========================================================================

  /**
   * Get the most recent metrics snapshot.
   *
   * @returns Current metrics or null if none collected
   */
  getMetrics(): ResourceMetrics | null {
    return this.currentMetrics;
  }

  /**
   * Get the complete metrics history.
   *
   * @returns Copy of the metrics history array
   */
  getHistory(): ResourceMetrics[] {
    return [...this.metricsHistory];
  }

  /**
   * Calculate average and min/max metrics over history.
   *
   * @returns Average metrics or null if no history exists
   */
  getAverageMetrics(): AverageMetrics | null {
    if (this.metricsHistory.length === 0) return null;

    const cpuValues = this.metricsHistory.map(m => m.cpu);
    const memoryValues = this.metricsHistory.map(m => m.memory);

    return {
      avgCpu: this.calculateAverage(cpuValues),
      avgMemory: this.calculateAverage(memoryValues),
      minCpu: Math.min(...cpuValues),
      maxCpu: Math.max(...cpuValues),
      minMemory: Math.min(...memoryValues),
      maxMemory: Math.max(...memoryValues),
    };
  }

  /**
   * Manually set metrics (primarily for testing).
   *
   * @param metrics - Partial metrics to set
   */
  setMetrics(metrics: Partial<ResourceMetrics>): void {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memoryUsed = metrics.memoryUsed ?? (totalMem - freeMem);
    const memoryPercent = metrics.memory ?? ((memoryUsed / totalMem) * 100);

    this.currentMetrics = {
      cpu: metrics.cpu ?? 50,
      memory: memoryPercent,
      memoryUsed,
      memoryTotal: metrics.memoryTotal ?? totalMem,
      memoryAvailable: metrics.memoryAvailable ?? freeMem,
      tabCount: metrics.tabCount ?? 0,
      memoryPressure: memoryPercent >= MEMORY_PRESSURE_THRESHOLD,
      timestamp: metrics.timestamp ?? new Date(),
    };

    this.addToHistory(this.currentMetrics);
    this.emit('metrics:updated', this.currentMetrics);
    this.checkThresholds(this.currentMetrics);
  }

  /**
   * Set a function to provide current tab count.
   *
   * @param provider - Function returning current tab count
   */
  setTabCountProvider(provider: () => number): void {
    this.tabCountProvider = provider;
  }

  // ==========================================================================
  // Thresholds Configuration
  // ==========================================================================

  /**
   * Get current threshold configuration.
   *
   * @returns Copy of current thresholds
   */
  getThresholds(): ResourceThresholds {
    return { ...this.thresholds };
  }

  /**
   * Update threshold values.
   *
   * @param thresholds - Partial thresholds to update
   */
  updateThresholds(thresholds: Partial<ResourceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  /**
   * Update monitor configuration.
   *
   * @param config - Partial configuration to update
   */
  updateConfig(config: Partial<ResourceMonitorConfig>): void {
    this.config = { ...this.config, ...config };

    if (config.debounceWindowMs !== undefined) {
      this.debouncer.setWindow(config.debounceWindowMs);
    }

    if (config.pollIntervalMs !== undefined) {
      this.pollingController = new AdaptivePollingController(config.pollIntervalMs);
    }
  }

  // ==========================================================================
  // Health & Throttling
  // ==========================================================================

  /**
   * Check if system resources are within healthy limits.
   *
   * @returns true if all resources below warning thresholds
   */
  isHealthy(): boolean {
    if (!this.currentMetrics) return true;

    return (
      this.currentMetrics.cpu < this.thresholds.cpuWarning &&
      this.currentMetrics.memory < this.thresholds.memoryWarning &&
      this.currentMetrics.tabCount < this.thresholds.maxTabs &&
      !this.currentMetrics.memoryPressure
    );
  }

  /**
   * Check if system is under memory pressure.
   *
   * @returns true if memory usage is critically high
   */
  isUnderMemoryPressure(): boolean {
    return this.currentMetrics?.memoryPressure ?? false;
  }

  /**
   * Get recommended throttle action based on current resource usage.
   *
   * @returns Throttle action recommendation
   */
  getThrottleAction(): ThrottleAction {
    if (!this.currentMetrics) {
      return {
        type: 'none',
        reason: 'No metrics available',
        severity: 'normal',
      };
    }

    const { cpu, memory, tabCount, memoryPressure } = this.currentMetrics;

    // Critical memory pressure - stop immediately
    if (memory >= CRITICAL_MEMORY_PRESSURE) {
      return {
        type: 'stop',
        reason: `Critical memory pressure: ${memory.toFixed(1)}%`,
        severity: 'critical',
      };
    }

    // Both CPU and memory critical - stop
    if (cpu >= this.thresholds.cpuCritical && memory >= this.thresholds.memoryCritical) {
      return {
        type: 'stop',
        reason: `Critical: CPU at ${cpu.toFixed(1)}% and Memory at ${memory.toFixed(1)}%`,
        severity: 'critical',
      };
    }

    // High CPU - pause automation
    if (cpu >= this.thresholds.cpuCritical) {
      return {
        type: 'pause',
        reason: `Critical CPU usage: ${cpu.toFixed(1)}%`,
        severity: 'critical',
      };
    }

    // High memory or memory pressure - reduce tabs
    if (memory >= this.thresholds.memoryCritical || memoryPressure) {
      const reduceBy = Math.max(1, Math.floor(tabCount * 0.25));
      return {
        type: 'reduce-tabs',
        reason: memoryPressure 
          ? `Memory pressure detected: ${memory.toFixed(1)}%`
          : `Critical memory usage: ${memory.toFixed(1)}%`,
        severity: 'critical',
        reduceTabsBy: reduceBy,
      };
    }

    // Warning conditions - increase delays
    if (cpu >= this.thresholds.cpuWarning || memory >= this.thresholds.memoryWarning) {
      const delayMultiplier = 1 + Math.max(
        (cpu - this.thresholds.cpuWarning) / 50,
        (memory - this.thresholds.memoryWarning) / 50
      );
      return {
        type: 'increase-delay',
        reason: `Warning: CPU at ${cpu.toFixed(1)}%, Memory at ${memory.toFixed(1)}%`,
        severity: 'warning',
        delayMultiplier: Math.round(delayMultiplier * 100) / 100,
      };
    }

    // Tab limit reached
    if (tabCount >= this.thresholds.maxTabs) {
      return {
        type: 'reduce-tabs',
        reason: `Tab limit reached: ${tabCount}/${this.thresholds.maxTabs}`,
        severity: 'warning',
        reduceTabsBy: 1,
      };
    }

    return {
      type: 'none',
      reason: 'Resources within normal limits',
      severity: 'normal',
    };
  }

  // ==========================================================================
  // Event Handling
  // ==========================================================================

  /**
   * Register an event handler.
   *
   * @param event - Event type to listen for
   * @param handler - Handler function
   */
  on<T = unknown>(event: ResourceEventType, handler: ResourceEventHandler<T>): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler as ResourceEventHandler);
  }

  /**
   * Remove an event handler.
   *
   * @param event - Event type
   * @param handler - Handler function to remove
   */
  off<T = unknown>(event: ResourceEventType, handler: ResourceEventHandler<T>): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler as ResourceEventHandler);
      if (index > -1) handlers.splice(index, 1);
    }
  }

  /**
   * Remove all event handlers.
   */
  removeAllListeners(): void {
    this.eventHandlers.clear();
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Schedule next metrics collection with adaptive interval
   */
  private scheduleNextCollection(): void {
    if (!this.isMonitoring) return;

    const interval = this.pollingController.getInterval();
    this.monitoringInterval = setTimeout(() => {
      this.collectMetrics();
      this.scheduleNextCollection();
    }, interval);
  }

  /**
   * Collect current system metrics.
   */
  private collectMetrics(): void {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memoryPercent = (usedMem / totalMem) * 100;

    const metrics: ResourceMetrics = {
      cpu: this.cpuCalculator.calculate(),
      memory: this.roundToTwoDecimals(memoryPercent),
      memoryUsed: usedMem,
      memoryTotal: totalMem,
      memoryAvailable: freeMem,
      tabCount: this.getTabCount(),
      memoryPressure: memoryPercent >= MEMORY_PRESSURE_THRESHOLD,
      timestamp: new Date(),
    };

    this.currentMetrics = metrics;
    this.addToHistory(metrics);
    this.emit('metrics:updated', metrics);
    this.checkThresholds(metrics);
    this.adjustPollingInterval(metrics);
  }

  /**
   * Get current tab count from provider or default.
   */
  private getTabCount(): number {
    return this.tabCountProvider?.() ?? 0;
  }

  /**
   * Add metrics to history, maintaining max size.
   */
  private addToHistory(metrics: ResourceMetrics): void {
    this.metricsHistory.push(metrics);

    while (this.metricsHistory.length > this.config.maxHistorySize) {
      this.metricsHistory.shift();
    }
  }

  /**
   * Check thresholds and emit appropriate events.
   */
  private checkThresholds(metrics: ResourceMetrics): void {
    // CPU checks
    if (metrics.cpu >= this.thresholds.cpuCritical) {
      this.emitDebounced('threshold:critical', {
        type: 'cpu',
        value: metrics.cpu,
      });
    } else if (metrics.cpu >= this.thresholds.cpuWarning) {
      this.emitDebounced('threshold:warning', {
        type: 'cpu',
        value: metrics.cpu,
      });
    }

    // Memory checks
    if (metrics.memory >= this.thresholds.memoryCritical) {
      this.emitDebounced('threshold:critical', {
        type: 'memory',
        value: metrics.memory,
      });
    } else if (metrics.memory >= this.thresholds.memoryWarning) {
      this.emitDebounced('threshold:warning', {
        type: 'memory',
        value: metrics.memory,
      });
    }

    // Memory pressure checks
    if (metrics.memory >= CRITICAL_MEMORY_PRESSURE) {
      this.emitDebounced('memory:pressure:critical', { memory: metrics.memory });
    } else if (metrics.memoryPressure) {
      this.emitDebounced('memory:pressure', { memory: metrics.memory });
    }

    // Tab count checks
    if (metrics.tabCount >= this.thresholds.maxTabs) {
      this.emitDebounced('threshold:critical', {
        type: 'tabs',
        value: metrics.tabCount,
      });
    }

    // Emit throttle recommendation if needed
    const action = this.getThrottleAction();
    if (action.type !== 'none') {
      this.emitDebounced('throttle:recommended', action);
    }
  }

  /**
   * Adjust polling interval based on resource usage
   */
  private adjustPollingInterval(metrics: ResourceMetrics): void {
    if (!this.config.adaptivePolling) return;

    const isHighUsage = 
      metrics.cpu >= this.thresholds.cpuWarning ||
      metrics.memory >= this.thresholds.memoryWarning;

    if (isHighUsage) {
      this.pollingController.backoff();
    } else {
      this.pollingController.recover();
    }
  }

  /**
   * Emit event with debouncing support
   */
  private emitDebounced(event: ResourceEventType, data: unknown): void {
    if (this.config.debounceEvents) {
      const eventKey = `${event}:${JSON.stringify(data)}`;
      if (!this.debouncer.shouldEmit(eventKey)) {
        return;
      }
    }
    this.emit(event, data);
  }

  /**
   * Emit an event to all registered handlers.
   */
  private emit(event: ResourceEventType, data: unknown): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in ResourceMonitor event handler for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Calculate average of an array of numbers
   */
  private calculateAverage(values: number[]): number {
    const sum = values.reduce((a, b) => a + b, 0);
    return this.roundToTwoDecimals(sum / values.length);
  }

  /**
   * Round to two decimal places
   */
  private roundToTwoDecimals(value: number): number {
    return Math.round(value * 100) / 100;
  }
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default ResourceMonitor;

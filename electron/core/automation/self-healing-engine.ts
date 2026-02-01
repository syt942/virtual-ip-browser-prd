/**
 * SelfHealingEngine - Automated Error Recovery for Virtual IP Browser
 * 
 * Provides self-healing capabilities for automation tasks including:
 * - Pluggable retry strategies (immediate, linear, exponential, custom)
 * - Configurable circuit breaker integration
 * - Error categorization and appropriate recovery strategies
 * - Proxy failover on proxy errors
 * - Tab restart on crashes/timeouts
 * - Comprehensive metrics collection and monitoring
 * 
 * @module electron/core/automation/self-healing-engine
 */

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default maximum retry attempts */
const DEFAULT_MAX_RETRIES = 3;

/** Default base backoff delay in milliseconds */
const DEFAULT_BASE_BACKOFF_MS = 1000;

/** Default maximum backoff delay in milliseconds */
const DEFAULT_MAX_BACKOFF_MS = 30000;

/** Default backoff multiplier for exponential strategy */
const DEFAULT_BACKOFF_MULTIPLIER = 2;

/** Jitter percentage for backoff randomization */
const JITTER_PERCENTAGE = 0.1;

/** Maximum history entries to keep */
const MAX_HISTORY_SIZE = 1000;

/** Delay for proxy failover (ms) */
const PROXY_FAILOVER_DELAY_MS = 500;

/** Delay for tab restart (ms) */
const TAB_RESTART_DELAY_MS = 2000;

/** Pause delay for captcha handling (ms) */
const CAPTCHA_PAUSE_DELAY_MS = 60000;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Error context with categorization
 */
export interface ErrorContext {
  /** Type of error */
  type: ErrorType;
  /** Error message */
  message: string;
  /** Associated task ID */
  taskId?: string;
  /** Associated tab ID */
  tabId?: string;
  /** Associated proxy ID */
  proxyId?: string;
  /** URL where error occurred */
  url?: string;
  /** When the error occurred */
  timestamp: Date;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/** Supported error types */
export type ErrorType = 'network' | 'proxy' | 'captcha' | 'timeout' | 'rate-limit' | 'crash' | 'unknown';

/**
 * Recovery action to be executed
 */
export interface RecoveryAction {
  /** Type of recovery action */
  type: RecoveryActionType;
  /** Human-readable reason */
  reason: string;
  /** Delay before action in ms */
  delay?: number;
  /** Max attempts for this action */
  maxAttempts?: number;
  /** New proxy ID for switch-proxy action */
  newProxyId?: string;
}

/** Recovery action types */
export type RecoveryActionType = 'retry' | 'switch-proxy' | 'restart-tab' | 'backoff' | 'skip' | 'abort';

/**
 * Result of a recovery attempt
 */
export interface RecoveryResult {
  /** Whether recovery succeeded */
  success: boolean;
  /** Action that was executed */
  action: RecoveryAction;
  /** Number of attempts made */
  attempts: number;
  /** Duration of recovery in ms */
  duration: number;
  /** Error message if failed */
  error?: string;
}

/**
 * Self-healing engine configuration
 */
export interface SelfHealingConfig {
  /** Maximum retry attempts */
  maxRetries: number;
  /** Base backoff delay in ms */
  baseBackoffMs: number;
  /** Maximum backoff delay in ms */
  maxBackoffMs: number;
  /** Backoff multiplier for exponential strategy */
  backoffMultiplier: number;
  /** Enable proxy failover */
  proxyFailoverEnabled: boolean;
  /** Enable tab restart */
  tabRestartEnabled: boolean;
  /** How to handle captcha errors */
  captchaHandling: CaptchaHandlingMode;
  /** Retry strategy to use */
  retryStrategy: RetryStrategyType;
}

/** Captcha handling modes */
export type CaptchaHandlingMode = 'skip' | 'pause' | 'abort';

/** Available retry strategies */
export type RetryStrategyType = 'immediate' | 'linear' | 'exponential' | 'fibonacci';

/**
 * Recovery statistics
 */
export interface RecoveryStats {
  /** Total recovery attempts */
  totalRecoveries: number;
  /** Successful recoveries */
  successfulRecoveries: number;
  /** Failed recoveries */
  failedRecoveries: number;
  /** Success rate percentage */
  successRate: number;
  /** Average recovery duration in ms */
  avgDuration: number;
  /** Count by action type */
  byActionType: Record<string, number>;
  /** Count by error type */
  byErrorType: Record<string, number>;
  /** Recovery rate by error type */
  recoveryRateByErrorType: Record<string, number>;
}

/**
 * Metrics for monitoring
 */
export interface HealingMetrics {
  /** Timestamp of metrics collection */
  timestamp: Date;
  /** Current error counts by type */
  activeErrorCounts: Record<string, number>;
  /** Recovery attempts in last hour */
  recentRecoveryAttempts: number;
  /** Recent success rate */
  recentSuccessRate: number;
  /** Average backoff delay in use */
  avgBackoffDelay: number;
}

/** Event types emitted */
export type HealingEventType = 
  | 'recovery:started'
  | 'recovery:success'
  | 'recovery:failed'
  | 'action:executed'
  | 'backoff:applied'
  | 'metrics:updated';

/** Event handler type */
export type HealingEventHandler<T = unknown> = (data: T) => void;

// ============================================================================
// RETRY STRATEGIES
// ============================================================================

/**
 * Base interface for retry strategies
 */
interface RetryStrategy {
  /** Calculate delay for given attempt */
  calculateDelay(attempt: number): number;
  /** Get strategy name */
  readonly name: string;
}

/**
 * Immediate retry with no delay
 */
class ImmediateRetryStrategy implements RetryStrategy {
  readonly name = 'immediate';

  calculateDelay(_attempt: number): number {
    return 0;
  }
}

/**
 * Linear backoff strategy: delay = baseDelay * attempt
 */
class LinearRetryStrategy implements RetryStrategy {
  readonly name = 'linear';

  constructor(
    private baseDelayMs: number,
    private maxDelayMs: number
  ) {}

  calculateDelay(attempt: number): number {
    const delay = this.baseDelayMs * attempt;
    return Math.min(delay, this.maxDelayMs);
  }
}

/**
 * Exponential backoff strategy: delay = baseDelay * (multiplier ^ (attempt - 1))
 */
class ExponentialRetryStrategy implements RetryStrategy {
  readonly name = 'exponential';

  constructor(
    private baseDelayMs: number,
    private maxDelayMs: number,
    private multiplier: number
  ) {}

  calculateDelay(attempt: number): number {
    const delay = this.baseDelayMs * Math.pow(this.multiplier, attempt - 1);
    return Math.min(delay, this.maxDelayMs);
  }
}

/**
 * Fibonacci backoff strategy for gentler increase
 */
class FibonacciRetryStrategy implements RetryStrategy {
  readonly name = 'fibonacci';
  private fibCache: number[] = [0, 1];

  constructor(
    private baseDelayMs: number,
    private maxDelayMs: number
  ) {}

  calculateDelay(attempt: number): number {
    const fibNumber = this.getFibonacci(attempt);
    const delay = this.baseDelayMs * fibNumber;
    return Math.min(delay, this.maxDelayMs);
  }

  private getFibonacci(n: number): number {
    if (n < this.fibCache.length) {
      return this.fibCache[n];
    }

    for (let i = this.fibCache.length; i <= n; i++) {
      this.fibCache[i] = this.fibCache[i - 1] + this.fibCache[i - 2];
    }

    return this.fibCache[n];
  }
}

/**
 * Factory for creating retry strategies
 */
class RetryStrategyFactory {
  static create(
    type: RetryStrategyType,
    baseDelayMs: number,
    maxDelayMs: number,
    multiplier: number
  ): RetryStrategy {
    switch (type) {
      case 'immediate':
        return new ImmediateRetryStrategy();
      case 'linear':
        return new LinearRetryStrategy(baseDelayMs, maxDelayMs);
      case 'exponential':
        return new ExponentialRetryStrategy(baseDelayMs, maxDelayMs, multiplier);
      case 'fibonacci':
        return new FibonacciRetryStrategy(baseDelayMs, maxDelayMs);
      default:
        return new ExponentialRetryStrategy(baseDelayMs, maxDelayMs, multiplier);
    }
  }
}

// ============================================================================
// ERROR TYPE HANDLERS
// ============================================================================

/**
 * Handler for specific error types
 */
interface ErrorTypeHandler {
  handle(context: ErrorContext, errorCount: number, config: SelfHealingConfig): RecoveryAction;
}

/**
 * Network error handler
 */
class NetworkErrorHandler implements ErrorTypeHandler {
  constructor(private strategy: RetryStrategy) {}

  handle(context: ErrorContext, errorCount: number, config: SelfHealingConfig): RecoveryAction {
    const delay = this.addJitter(this.strategy.calculateDelay(errorCount));
    return {
      type: 'retry',
      reason: `Network error: ${context.message}`,
      delay,
      maxAttempts: config.maxRetries,
    };
  }

  private addJitter(delay: number): number {
    const jitter = delay * JITTER_PERCENTAGE * (Math.random() * 2 - 1);
    return Math.round(delay + jitter);
  }
}

/**
 * Proxy error handler
 */
class ProxyErrorHandler implements ErrorTypeHandler {
  constructor(private strategy: RetryStrategy) {}

  handle(context: ErrorContext, errorCount: number, config: SelfHealingConfig): RecoveryAction {
    if (config.proxyFailoverEnabled) {
      return {
        type: 'switch-proxy',
        reason: `Proxy failed: ${context.message}`,
        delay: PROXY_FAILOVER_DELAY_MS,
      };
    }
    return {
      type: 'retry',
      reason: `Proxy error (failover disabled): ${context.message}`,
      delay: this.strategy.calculateDelay(errorCount),
    };
  }
}

/**
 * Captcha error handler
 */
class CaptchaErrorHandler implements ErrorTypeHandler {
  handle(_context: ErrorContext, _errorCount: number, config: SelfHealingConfig): RecoveryAction {
    switch (config.captchaHandling) {
      case 'skip':
        return { type: 'skip', reason: 'Captcha detected, skipping task' };
      case 'pause':
        return { type: 'backoff', reason: 'Captcha detected, pausing', delay: CAPTCHA_PAUSE_DELAY_MS };
      case 'abort':
        return { type: 'abort', reason: 'Captcha detected, aborting' };
    }
  }
}

/**
 * Timeout error handler
 */
class TimeoutErrorHandler implements ErrorTypeHandler {
  constructor(private strategy: RetryStrategy) {}

  handle(context: ErrorContext, errorCount: number, config: SelfHealingConfig): RecoveryAction {
    if (errorCount >= 2 && config.tabRestartEnabled) {
      return {
        type: 'restart-tab',
        reason: 'Multiple timeouts, restarting tab',
        delay: TAB_RESTART_DELAY_MS / 2,
      };
    }
    return {
      type: 'retry',
      reason: `Timeout error: ${context.message}`,
      delay: this.strategy.calculateDelay(errorCount),
    };
  }
}

/**
 * Rate limit error handler
 */
class RateLimitErrorHandler implements ErrorTypeHandler {
  constructor(private strategy: RetryStrategy, private maxBackoffMs: number) {}

  handle(_context: ErrorContext, errorCount: number, _config: SelfHealingConfig): RecoveryAction {
    // Double the backoff for rate limits
    const baseDelay = this.strategy.calculateDelay(errorCount);
    const delay = Math.min(baseDelay * 2, this.maxBackoffMs);
    return {
      type: 'backoff',
      reason: 'Rate limited, applying extended backoff',
      delay,
    };
  }
}

/**
 * Crash error handler
 */
class CrashErrorHandler implements ErrorTypeHandler {
  handle(context: ErrorContext, _errorCount: number, config: SelfHealingConfig): RecoveryAction {
    if (config.tabRestartEnabled) {
      return {
        type: 'restart-tab',
        reason: `Tab crashed: ${context.message}`,
        delay: TAB_RESTART_DELAY_MS,
      };
    }
    return {
      type: 'abort',
      reason: 'Tab crashed and restart disabled',
    };
  }
}

/**
 * Unknown error handler
 */
class UnknownErrorHandler implements ErrorTypeHandler {
  constructor(private strategy: RetryStrategy) {}

  handle(context: ErrorContext, errorCount: number, config: SelfHealingConfig): RecoveryAction {
    return {
      type: 'retry',
      reason: `Unknown error: ${context.message}`,
      delay: this.strategy.calculateDelay(errorCount),
      maxAttempts: config.maxRetries,
    };
  }
}

// ============================================================================
// SELF HEALING ENGINE CLASS
// ============================================================================

/**
 * SelfHealingEngine for automated error recovery in browser automation
 * 
 * Features:
 * - Pluggable retry strategies (immediate, linear, exponential, fibonacci)
 * - Error-type-specific handlers with appropriate recovery actions
 * - Comprehensive metrics collection for monitoring
 * - Event-driven architecture for integration
 * 
 * @example
 * ```typescript
 * const engine = new SelfHealingEngine({
 *   maxRetries: 5,
 *   retryStrategy: 'exponential',
 *   proxyFailoverEnabled: true
 * });
 * 
 * engine.on('recovery:success', (result) => {
 *   console.log(`Recovered in ${result.duration}ms`);
 * });
 * 
 * // Analyze and handle error
 * const action = engine.analyzeError({
 *   type: 'network',
 *   message: 'Connection refused',
 *   timestamp: new Date()
 * });
 * 
 * // Execute recovery
 * const result = await engine.executeRecovery(context, action, async (a) => {
 *   // Perform actual recovery logic
 *   return true;
 * });
 * ```
 */
export class SelfHealingEngine {
  private config: SelfHealingConfig;
  private errorCounts: Map<string, number> = new Map();
  private lastErrors: Map<string, Date> = new Map();
  private recoveryHistory: RecoveryResult[] = [];
  private eventHandlers: Map<HealingEventType, HealingEventHandler[]> = new Map();
  
  // Strategies and handlers
  private retryStrategy: RetryStrategy;
  private errorHandlers: Map<ErrorType, ErrorTypeHandler>;

  /**
   * Create a new SelfHealingEngine instance
   * 
   * @param config - Configuration options
   */
  constructor(config: Partial<SelfHealingConfig> = {}) {
    this.config = {
      maxRetries: config.maxRetries ?? DEFAULT_MAX_RETRIES,
      baseBackoffMs: config.baseBackoffMs ?? DEFAULT_BASE_BACKOFF_MS,
      maxBackoffMs: config.maxBackoffMs ?? DEFAULT_MAX_BACKOFF_MS,
      backoffMultiplier: config.backoffMultiplier ?? DEFAULT_BACKOFF_MULTIPLIER,
      proxyFailoverEnabled: config.proxyFailoverEnabled ?? true,
      tabRestartEnabled: config.tabRestartEnabled ?? true,
      captchaHandling: config.captchaHandling ?? 'skip',
      retryStrategy: config.retryStrategy ?? 'exponential',
    };

    this.retryStrategy = RetryStrategyFactory.create(
      this.config.retryStrategy,
      this.config.baseBackoffMs,
      this.config.maxBackoffMs,
      this.config.backoffMultiplier
    );

    this.errorHandlers = this.createErrorHandlers();
  }

  /**
   * Create error handlers for each error type
   */
  private createErrorHandlers(): Map<ErrorType, ErrorTypeHandler> {
    const handlers = new Map<ErrorType, ErrorTypeHandler>();
    
    handlers.set('network', new NetworkErrorHandler(this.retryStrategy));
    handlers.set('proxy', new ProxyErrorHandler(this.retryStrategy));
    handlers.set('captcha', new CaptchaErrorHandler());
    handlers.set('timeout', new TimeoutErrorHandler(this.retryStrategy));
    handlers.set('rate-limit', new RateLimitErrorHandler(this.retryStrategy, this.config.maxBackoffMs));
    handlers.set('crash', new CrashErrorHandler());
    handlers.set('unknown', new UnknownErrorHandler(this.retryStrategy));

    return handlers;
  }

  // --------------------------------------------------------------------------
  // Error Analysis
  // --------------------------------------------------------------------------

  /**
   * Analyze error and determine recovery action
   * 
   * @param context - Error context with type, message, and metadata
   * @returns Recovery action to be executed
   */
  analyzeError(context: ErrorContext): RecoveryAction {
    const errorKey = this.createErrorKey(context);
    const errorCount = this.incrementErrorCount(errorKey);
    this.lastErrors.set(errorKey, context.timestamp);

    // Check if max retries exceeded
    if (errorCount > this.config.maxRetries) {
      return {
        type: 'abort',
        reason: `Max retries (${this.config.maxRetries}) exceeded for ${context.type} error`,
      };
    }

    // Get handler for error type
    const handler = this.errorHandlers.get(context.type) ?? this.errorHandlers.get('unknown')!;
    return handler.handle(context, errorCount, this.config);
  }

  // --------------------------------------------------------------------------
  // Backoff Calculation
  // --------------------------------------------------------------------------

  /**
   * Calculate backoff delay for a given attempt
   * 
   * @param attempt - Current attempt number (1-based)
   * @returns Delay in milliseconds with jitter applied
   */
  calculateBackoff(attempt: number): number {
    const baseDelay = this.retryStrategy.calculateDelay(attempt);
    return this.addJitter(baseDelay);
  }

  /**
   * Add random jitter to delay
   */
  private addJitter(delay: number): number {
    const jitter = delay * JITTER_PERCENTAGE * (Math.random() * 2 - 1);
    return Math.min(Math.round(delay + jitter), this.config.maxBackoffMs);
  }

  // --------------------------------------------------------------------------
  // Recovery Execution
  // --------------------------------------------------------------------------

  /**
   * Execute recovery action
   * 
   * @param context - Error context
   * @param action - Recovery action to execute
   * @param executor - Function that executes the actual recovery
   * @returns Recovery result with success status, attempts, and duration
   */
  async executeRecovery(
    context: ErrorContext,
    action: RecoveryAction,
    executor: (action: RecoveryAction) => Promise<boolean>
  ): Promise<RecoveryResult> {
    const startTime = Date.now();
    const errorKey = this.createErrorKey(context);
    const attempts = this.errorCounts.get(errorKey) ?? 1;

    this.emit('recovery:started', { context, action, attempts });

    try {
      // Apply delay if specified
      if (action.delay && action.delay > 0) {
        this.emit('backoff:applied', { delay: action.delay, strategy: this.retryStrategy.name });
        await this.delay(action.delay);
      }

      // Execute the recovery action
      const success = await executor(action);
      this.emit('action:executed', { action, success });

      const result: RecoveryResult = {
        success,
        action,
        attempts,
        duration: Date.now() - startTime,
      };

      if (success) {
        this.clearErrorCount(context);
        this.emit('recovery:success', result);
      } else {
        this.emit('recovery:failed', result);
      }

      this.addToHistory(result, context.type);
      return result;
    } catch (error) {
      const result: RecoveryResult = {
        success: false,
        action,
        attempts,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
      
      this.emit('recovery:failed', result);
      this.addToHistory(result, context.type);
      return result;
    }
  }

  // --------------------------------------------------------------------------
  // Error Count Management
  // --------------------------------------------------------------------------

  /**
   * Clear error count for a specific context
   */
  clearErrorCount(context: ErrorContext): void {
    const errorKey = this.createErrorKey(context);
    this.errorCounts.delete(errorKey);
    this.lastErrors.delete(errorKey);
  }

  /**
   * Clear all error counts
   */
  clearAllErrorCounts(): void {
    this.errorCounts.clear();
    this.lastErrors.clear();
  }

  /**
   * Get error count for a context
   */
  getErrorCount(context: Partial<ErrorContext>): number {
    const errorKey = `${context.type ?? 'unknown'}:${context.taskId ?? 'global'}:${context.proxyId ?? 'none'}`;
    return this.errorCounts.get(errorKey) ?? 0;
  }

  // --------------------------------------------------------------------------
  // Statistics & Metrics
  // --------------------------------------------------------------------------

  /**
   * Get comprehensive recovery statistics
   */
  getStats(): RecoveryStats {
    const total = this.recoveryHistory.length;
    const successful = this.recoveryHistory.filter(r => r.success).length;
    
    const totalDuration = this.recoveryHistory.reduce((sum, r) => sum + r.duration, 0);
    const avgDuration = total > 0 ? totalDuration / total : 0;

    // Count by action type
    const byActionType: Record<string, number> = {};
    this.recoveryHistory.forEach(r => {
      byActionType[r.action.type] = (byActionType[r.action.type] ?? 0) + 1;
    });

    // Count by error type (from extended history)
    const byErrorType: Record<string, number> = {};
    const successByErrorType: Record<string, number> = {};
    
    (this.recoveryHistory as Array<RecoveryResult & { errorType?: string }>).forEach(r => {
      const errorType = r.errorType ?? 'unknown';
      byErrorType[errorType] = (byErrorType[errorType] ?? 0) + 1;
      if (r.success) {
        successByErrorType[errorType] = (successByErrorType[errorType] ?? 0) + 1;
      }
    });

    // Calculate recovery rate by error type
    const recoveryRateByErrorType: Record<string, number> = {};
    Object.keys(byErrorType).forEach(type => {
      const typeTotal = byErrorType[type];
      const typeSuccess = successByErrorType[type] ?? 0;
      recoveryRateByErrorType[type] = typeTotal > 0 ? (typeSuccess / typeTotal) * 100 : 0;
    });

    return {
      totalRecoveries: total,
      successfulRecoveries: successful,
      failedRecoveries: total - successful,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      avgDuration,
      byActionType,
      byErrorType,
      recoveryRateByErrorType,
    };
  }

  /**
   * Get current metrics for monitoring
   */
  getMetrics(): HealingMetrics {
    const now = Date.now();
    const oneHourAgo = now - 3600000;

    // Filter recent recoveries
    const recentRecoveries = this.recoveryHistory.filter(r => 
      r.duration && (now - r.duration) < 3600000
    );

    const recentSuccess = recentRecoveries.filter(r => r.success).length;

    // Calculate average backoff from recent recoveries with delay
    const recentWithDelay = recentRecoveries.filter(r => r.action.delay && r.action.delay > 0);
    const avgBackoff = recentWithDelay.length > 0
      ? recentWithDelay.reduce((sum, r) => sum + (r.action.delay ?? 0), 0) / recentWithDelay.length
      : 0;

    // Get active error counts
    const activeErrorCounts: Record<string, number> = {};
    this.errorCounts.forEach((count, key) => {
      const lastError = this.lastErrors.get(key);
      if (lastError && lastError.getTime() > oneHourAgo) {
        const [type] = key.split(':');
        activeErrorCounts[type] = (activeErrorCounts[type] ?? 0) + count;
      }
    });

    const metrics: HealingMetrics = {
      timestamp: new Date(),
      activeErrorCounts,
      recentRecoveryAttempts: recentRecoveries.length,
      recentSuccessRate: recentRecoveries.length > 0 
        ? (recentSuccess / recentRecoveries.length) * 100 
        : 100,
      avgBackoffDelay: avgBackoff,
    };

    this.emit('metrics:updated', metrics);
    return metrics;
  }

  // --------------------------------------------------------------------------
  // History Management
  // --------------------------------------------------------------------------

  /**
   * Get recovery history
   */
  getHistory(): RecoveryResult[] {
    return [...this.recoveryHistory];
  }

  /**
   * Clear recovery history
   */
  clearHistory(): void {
    this.recoveryHistory = [];
  }

  // --------------------------------------------------------------------------
  // Configuration
  // --------------------------------------------------------------------------

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SelfHealingConfig>): void {
    this.config = { ...this.config, ...config };

    // Recreate strategy if changed
    if (config.retryStrategy || config.baseBackoffMs || config.maxBackoffMs || config.backoffMultiplier) {
      this.retryStrategy = RetryStrategyFactory.create(
        this.config.retryStrategy,
        this.config.baseBackoffMs,
        this.config.maxBackoffMs,
        this.config.backoffMultiplier
      );
      this.errorHandlers = this.createErrorHandlers();
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): SelfHealingConfig {
    return { ...this.config };
  }

  /**
   * Get current retry strategy name
   */
  getRetryStrategyName(): string {
    return this.retryStrategy.name;
  }

  // --------------------------------------------------------------------------
  // Event Handling
  // --------------------------------------------------------------------------

  /**
   * Register event handler
   */
  on<T = unknown>(event: HealingEventType, handler: HealingEventHandler<T>): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler as HealingEventHandler);
  }

  /**
   * Unregister event handler
   */
  off<T = unknown>(event: HealingEventType, handler: HealingEventHandler<T>): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler as HealingEventHandler);
      if (index > -1) handlers.splice(index, 1);
    }
  }

  /**
   * Remove all event handlers
   */
  removeAllListeners(): void {
    this.eventHandlers.clear();
  }

  // --------------------------------------------------------------------------
  // Private Methods
  // --------------------------------------------------------------------------

  /**
   * Create unique key for error tracking
   */
  private createErrorKey(context: ErrorContext): string {
    return `${context.type}:${context.taskId ?? 'global'}:${context.proxyId ?? 'none'}`;
  }

  /**
   * Increment and return error count
   */
  private incrementErrorCount(errorKey: string): number {
    const count = (this.errorCounts.get(errorKey) ?? 0) + 1;
    this.errorCounts.set(errorKey, count);
    return count;
  }

  /**
   * Add result to history with error type tracking
   */
  private addToHistory(result: RecoveryResult, errorType: ErrorType): void {
    const extendedResult = { ...result, errorType };
    this.recoveryHistory.push(extendedResult as RecoveryResult);

    // Enforce history limit
    while (this.recoveryHistory.length > MAX_HISTORY_SIZE) {
      this.recoveryHistory.shift();
    }
  }

  /**
   * Emit event to all registered handlers
   */
  private emit(event: HealingEventType, data: unknown): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in SelfHealingEngine event handler for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Promise-based delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default SelfHealingEngine;

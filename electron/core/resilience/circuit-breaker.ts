/**
 * Circuit Breaker Implementation
 * Provides fault tolerance for proxy connections, search automation, and external API calls
 * 
 * PRD Section 6.2 P1: Circuit breaker pattern implementation
 * 
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Circuit is tripped, requests are rejected immediately  
 * - HALF_OPEN: Testing recovery, limited requests allowed
 */

import { EventEmitter } from 'events';
import type {
  CircuitBreakerState,
  CircuitBreakerConfig,
  CircuitBreakerMetrics,
  CircuitBreakerCallbacks,
  CircuitBreakerStateChangeEvent,
  CircuitBreakerSnapshot,
  CircuitBreakerRequestResult,
  ExecuteOptions,
  StateChangeReason,
  ServiceType,
  CircuitBreaker as ICircuitBreaker
} from './types';
import {
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
  SERVICE_TYPE_PRESETS,
  CircuitBreakerOpenError
} from './types';

/**
 * Circuit Breaker class implementing the circuit breaker pattern
 */
export class CircuitBreaker extends EventEmitter implements ICircuitBreaker {
  public readonly id: string;
  public readonly config: CircuitBreakerConfig;
  
  private state: CircuitBreakerState = 'CLOSED';
  private requestHistory: CircuitBreakerRequestResult[] = [];
  private metrics: CircuitBreakerMetrics;
  private stateEnteredAt: Date;
  private resetTimer: NodeJS.Timeout | null = null;
  private callbacks: CircuitBreakerCallbacks = {};
  private destroyed = false;

  /**
   * Create a new CircuitBreaker instance
   */
  constructor(
    config: Partial<CircuitBreakerConfig> & { id: string; name: string; serviceType: ServiceType },
    callbacks?: CircuitBreakerCallbacks
  ) {
    super();
    
    // Apply service type preset, then defaults, then user config
    const preset = SERVICE_TYPE_PRESETS[config.serviceType] || {};
    this.config = {
      ...DEFAULT_CIRCUIT_BREAKER_CONFIG,
      ...preset,
      ...config
    } as CircuitBreakerConfig;
    
    this.id = config.id;
    this.callbacks = callbacks || {};
    this.stateEnteredAt = new Date();
    
    // Initialize metrics
    this.metrics = this.createInitialMetrics();
  }

  /**
   * Get current circuit breaker state
   */
  getState(): CircuitBreakerState {
    return this.state;
  }

  /**
   * Get current metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    // Update time in current state
    const now = Date.now();
    const timeInCurrentState = now - this.stateEnteredAt.getTime();
    
    return {
      ...this.metrics,
      timeInState: {
        ...this.metrics.timeInState,
        [this.state]: this.metrics.timeInState[this.state] + timeInCurrentState
      },
      failureRate: this.calculateFailureRate()
    };
  }

  /**
   * Check if a request can be executed
   */
  canExecute(): boolean {
    if (this.destroyed) return false;
    
    switch (this.state) {
      case 'CLOSED':
        return true;
      
      case 'OPEN':
        // Check if reset timeout has elapsed
        if (this.shouldAttemptReset()) {
          this.transitionTo('HALF_OPEN', 'reset_timeout_elapsed');
          return true;
        }
        return false;
      
      case 'HALF_OPEN':
        // Allow limited requests in half-open state
        return this.metrics.halfOpenSuccesses < this.config.halfOpenMaxRequests;
      
      default:
        return false;
    }
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>, options?: ExecuteOptions): Promise<T> {
    if (this.destroyed) {
      throw new Error(`Circuit breaker '${this.id}' has been destroyed`);
    }

    // Check if circuit allows execution
    if (!this.canExecute()) {
      this.metrics.rejectedCount++;
      this.callbacks.onReject?.(this.id);
      this.emit('reject', this.id);

      if (options?.fallback) {
        return options.fallback();
      }

      if (options?.throwOnReject !== false) {
        throw new CircuitBreakerOpenError(
          this.id,
          this.config.serviceType,
          this.config.serviceId
        );
      }

      return undefined as T;
    }

    const startTime = Date.now();

    try {
      // Execute with optional timeout
      let result: T;
      
      if (options?.timeout) {
        result = await this.executeWithTimeout(fn, options.timeout);
      } else {
        result = await fn();
      }

      const duration = Date.now() - startTime;
      this.recordSuccess(duration);
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.recordFailure(errorMessage);
      options?.onError?.(error instanceof Error ? error : new Error(errorMessage));
      
      throw error;
    }
  }

  /**
   * Record a successful request
   */
  recordSuccess(duration?: number): void {
    if (this.destroyed) return;

    const now = new Date();
    
    // Add to request history
    this.requestHistory.push({
      success: true,
      timestamp: now,
      duration
    });
    
    // Cleanup old entries
    this.cleanupRequestHistory();

    // Update metrics
    this.metrics.totalRequests++;
    this.metrics.successCount++;
    this.metrics.lastSuccess = now;
    this.metrics.consecutiveFailures = 0;
    
    if (duration !== undefined) {
      this.updateAverageResponseTime(duration);
    }

    // Handle state-specific logic
    if (this.state === 'HALF_OPEN') {
      this.metrics.halfOpenSuccesses++;
      
      // Check if we've met success threshold
      if (this.metrics.halfOpenSuccesses >= this.config.successThreshold) {
        this.transitionTo('CLOSED', 'success_threshold_met');
      }
    }

    this.callbacks.onSuccess?.(this.id, duration || 0);
    this.emit('success', this.id, duration);
  }

  /**
   * Record a failed request
   */
  recordFailure(error?: string): void {
    if (this.destroyed) return;

    const now = new Date();
    
    // Add to request history
    this.requestHistory.push({
      success: false,
      timestamp: now,
      error
    });
    
    // Cleanup old entries
    this.cleanupRequestHistory();

    // Update metrics
    this.metrics.totalRequests++;
    this.metrics.failureCount++;
    this.metrics.lastFailure = now;
    this.metrics.consecutiveFailures++;
    this.metrics.failureRate = this.calculateFailureRate();

    // Handle state-specific logic
    switch (this.state) {
      case 'CLOSED':
        this.evaluateTripConditions();
        break;
      
      case 'HALF_OPEN':
        // Single failure in half-open immediately opens circuit
        this.transitionTo('OPEN', 'half_open_failure');
        break;
    }

    this.callbacks.onFailure?.(this.id, error || 'Unknown error');
    this.emit('failure', this.id, error);
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    if (this.destroyed) return;
    
    this.clearResetTimer();
    this.metrics.halfOpenSuccesses = 0;
    this.metrics.consecutiveFailures = 0;
    this.transitionTo('CLOSED', 'manual_reset');
  }

  /**
   * Manually trip the circuit breaker
   */
  trip(_reason?: string): void {
    if (this.destroyed) return;
    
    this.transitionTo('OPEN', 'manual_trip');
  }

  /**
   * Get a snapshot of current state for persistence
   */
  getSnapshot(): CircuitBreakerSnapshot {
    return {
      id: this.id,
      name: this.config.name,
      serviceType: this.config.serviceType,
      serviceId: this.config.serviceId,
      state: this.state,
      metrics: this.getMetrics(),
      config: this.config,
      createdAt: this.stateEnteredAt, // Approximate
      updatedAt: new Date()
    };
  }

  /**
   * Restore state from a snapshot
   */
  restoreFromSnapshot(snapshot: Partial<CircuitBreakerSnapshot>): void {
    if (this.destroyed) return;
    
    if (snapshot.state) {
      this.state = snapshot.state;
    }
    
    if (snapshot.metrics) {
      this.metrics = {
        ...this.metrics,
        ...snapshot.metrics
      };
    }
    
    this.stateEnteredAt = snapshot.updatedAt || new Date();
    
    // If restored to OPEN state, start reset timer
    if (this.state === 'OPEN') {
      this.startResetTimer();
    }
  }

  /**
   * Destroy the circuit breaker and cleanup resources
   */
  destroy(): void {
    this.destroyed = true;
    this.clearResetTimer();
    this.requestHistory = [];
    this.removeAllListeners();
  }

  /**
   * Register event callbacks
   */
  setCallbacks(callbacks: CircuitBreakerCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  // ============================================================
  // PRIVATE METHODS
  // ============================================================

  /**
   * Transition to a new state
   */
  private transitionTo(newState: CircuitBreakerState, reason: StateChangeReason): void {
    if (this.state === newState) return;

    const previousState = this.state;
    const now = new Date();
    
    // Update time in previous state
    const timeInPreviousState = now.getTime() - this.stateEnteredAt.getTime();
    this.metrics.timeInState[previousState] += timeInPreviousState;
    
    // Update state
    this.state = newState;
    this.stateEnteredAt = now;
    this.metrics.lastStateChange = now;

    // State-specific initialization
    if (newState === 'OPEN') {
      this.metrics.tripCount++;
      this.metrics.halfOpenSuccesses = 0;
      this.startResetTimer();
    } else if (newState === 'HALF_OPEN') {
      this.metrics.halfOpenSuccesses = 0;
      this.clearResetTimer();
    } else if (newState === 'CLOSED') {
      this.metrics.halfOpenSuccesses = 0;
      this.metrics.consecutiveFailures = 0;
      this.clearResetTimer();
    }

    // Create event
    const event: CircuitBreakerStateChangeEvent = {
      circuitBreakerId: this.id,
      previousState,
      newState,
      timestamp: now,
      reason,
      metrics: this.getMetrics()
    };

    // Emit events
    this.emit('stateChange', event);
    this.callbacks.onStateChange?.(event);

    // State-specific callbacks
    switch (newState) {
      case 'OPEN':
        this.callbacks.onOpen?.(event);
        this.emit('open', event);
        break;
      case 'CLOSED':
        this.callbacks.onClose?.(event);
        this.emit('close', event);
        break;
      case 'HALF_OPEN':
        this.callbacks.onHalfOpen?.(event);
        this.emit('halfOpen', event);
        break;
    }
  }

  /**
   * Evaluate whether to trip the circuit
   */
  private evaluateTripConditions(): void {
    // Check consecutive failure threshold
    if (this.metrics.consecutiveFailures >= this.config.failureThreshold) {
      this.transitionTo('OPEN', 'failure_threshold_exceeded');
      return;
    }

    // Check failure rate (only if minimum requests met)
    if (this.metrics.totalRequests >= this.config.minimumRequestThreshold) {
      const failureRate = this.calculateFailureRate();
      if (failureRate >= this.config.failureRateThreshold) {
        this.transitionTo('OPEN', 'failure_rate_exceeded');
        return;
      }
    }
  }

  /**
   * Calculate current failure rate from sliding window
   */
  private calculateFailureRate(): number {
    const windowStart = Date.now() - this.config.slidingWindowSize;
    const recentRequests = this.requestHistory.filter(
      r => r.timestamp.getTime() >= windowStart
    );

    if (recentRequests.length === 0) return 0;

    const failures = recentRequests.filter(r => !r.success).length;
    return (failures / recentRequests.length) * 100;
  }

  /**
   * Check if reset timeout has elapsed
   */
  private shouldAttemptReset(): boolean {
    const timeInOpen = Date.now() - this.stateEnteredAt.getTime();
    return timeInOpen >= this.config.resetTimeout;
  }

  /**
   * Start the reset timer for transitioning from OPEN to HALF_OPEN
   */
  private startResetTimer(): void {
    this.clearResetTimer();
    
    this.resetTimer = setTimeout(() => {
      if (this.state === 'OPEN' && !this.destroyed) {
        this.transitionTo('HALF_OPEN', 'reset_timeout_elapsed');
      }
    }, this.config.resetTimeout);
  }

  /**
   * Clear the reset timer
   */
  private clearResetTimer(): void {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }
  }

  /**
   * Execute function with timeout
   */
  private async executeWithTimeout<T>(fn: () => Promise<T>, timeout: number): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) => {
        setTimeout(() => reject(new Error(`Operation timed out after ${timeout}ms`)), timeout);
      })
    ]);
  }

  /**
   * Cleanup old request history entries outside sliding window
   */
  private cleanupRequestHistory(): void {
    const windowStart = Date.now() - this.config.slidingWindowSize;
    this.requestHistory = this.requestHistory.filter(
      r => r.timestamp.getTime() >= windowStart
    );

    // Limit history size
    if (this.requestHistory.length > 1000) {
      this.requestHistory = this.requestHistory.slice(-500);
    }
  }

  /**
   * Update average response time
   */
  private updateAverageResponseTime(duration: number): void {
    const successfulWithDuration = this.requestHistory.filter(
      r => r.success && r.duration !== undefined
    );

    if (successfulWithDuration.length === 0) {
      this.metrics.averageResponseTime = duration;
    } else {
      const total = successfulWithDuration.reduce((sum, r) => sum + (r.duration || 0), 0);
      this.metrics.averageResponseTime = total / successfulWithDuration.length;
    }
  }

  /**
   * Create initial metrics object
   */
  private createInitialMetrics(): CircuitBreakerMetrics {
    return {
      totalRequests: 0,
      successCount: 0,
      failureCount: 0,
      failureRate: 0,
      rejectedCount: 0,
      tripCount: 0,
      timeInState: {
        CLOSED: 0,
        OPEN: 0,
        HALF_OPEN: 0
      },
      lastStateChange: null,
      lastFailure: null,
      lastSuccess: null,
      averageResponseTime: 0,
      halfOpenSuccesses: 0,
      consecutiveFailures: 0
    };
  }
}

/**
 * Factory function to create a circuit breaker with service-specific defaults
 */
export function createCircuitBreaker(
  id: string,
  name: string,
  serviceType: ServiceType,
  config?: Partial<CircuitBreakerConfig>,
  callbacks?: CircuitBreakerCallbacks
): CircuitBreaker {
  return new CircuitBreaker(
    {
      id,
      name,
      serviceType,
      ...config
    },
    callbacks
  );
}

/**
 * Create a circuit breaker for a specific proxy
 */
export function createProxyCircuitBreaker(
  proxyId: string,
  proxyName: string,
  config?: Partial<CircuitBreakerConfig>,
  callbacks?: CircuitBreakerCallbacks
): CircuitBreaker {
  return createCircuitBreaker(
    `proxy-${proxyId}`,
    `Proxy: ${proxyName}`,
    'proxy',
    { serviceId: proxyId, ...config },
    callbacks
  );
}

/**
 * Create a circuit breaker for search automation
 */
export function createSearchCircuitBreaker(
  searchEngine: string,
  config?: Partial<CircuitBreakerConfig>,
  callbacks?: CircuitBreakerCallbacks
): CircuitBreaker {
  return createCircuitBreaker(
    `search-${searchEngine}`,
    `Search: ${searchEngine}`,
    'search',
    { serviceId: searchEngine, ...config },
    callbacks
  );
}

/**
 * Create a circuit breaker for external API calls
 */
export function createApiCircuitBreaker(
  apiName: string,
  endpoint?: string,
  config?: Partial<CircuitBreakerConfig>,
  callbacks?: CircuitBreakerCallbacks
): CircuitBreaker {
  return createCircuitBreaker(
    `api-${apiName}`,
    `API: ${apiName}`,
    'api',
    { serviceId: endpoint, ...config },
    callbacks
  );
}

/**
 * Circuit Breaker Types
 * Type definitions for the resilience/circuit breaker pattern implementation
 * 
 * PRD Section 6.2 P1: Circuit breaker for proxy connections and external API calls
 */

/**
 * Circuit breaker states
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Circuit is tripped, requests are rejected immediately
 * - HALF_OPEN: Testing recovery, limited requests allowed
 */
export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/**
 * Service types that can be protected by circuit breakers
 */
export type ServiceType = 'proxy' | 'search' | 'api' | 'translation' | 'external';

/**
 * Circuit breaker configuration options
 */
export interface CircuitBreakerConfig {
  /** Unique identifier for this circuit breaker instance */
  id: string;
  
  /** Human-readable name */
  name: string;
  
  /** Service type being protected */
  serviceType: ServiceType;
  
  /** Optional service identifier (e.g., proxy ID, API endpoint) */
  serviceId?: string;
  
  /** Number of failures before circuit opens (default: 5) */
  failureThreshold: number;
  
  /** Failure rate percentage to trip circuit (0-100, default: 50) */
  failureRateThreshold: number;
  
  /** Minimum number of requests before failure rate is considered (default: 10) */
  minimumRequestThreshold: number;
  
  /** Time in ms circuit stays open before moving to half-open (default: 30000) */
  resetTimeout: number;
  
  /** Number of successful requests in half-open to close circuit (default: 3) */
  successThreshold: number;
  
  /** Sliding window size in ms for calculating failure rate (default: 60000) */
  slidingWindowSize: number;
  
  /** Maximum number of requests allowed in half-open state (default: 3) */
  halfOpenMaxRequests: number;
  
  /** Whether to persist state to database (default: true) */
  persistState: boolean;
}

/**
 * Default circuit breaker configuration
 */
export const DEFAULT_CIRCUIT_BREAKER_CONFIG: Omit<CircuitBreakerConfig, 'id' | 'name' | 'serviceType'> = {
  failureThreshold: 5,
  failureRateThreshold: 50,
  minimumRequestThreshold: 10,
  resetTimeout: 30000,
  successThreshold: 3,
  slidingWindowSize: 60000,
  halfOpenMaxRequests: 3,
  persistState: true
};

/**
 * Preset configurations for different service types
 */
export const SERVICE_TYPE_PRESETS: Record<ServiceType, Partial<CircuitBreakerConfig>> = {
  proxy: {
    failureThreshold: 3,
    failureRateThreshold: 40,
    resetTimeout: 60000,
    minimumRequestThreshold: 5
  },
  search: {
    failureThreshold: 5,
    failureRateThreshold: 50,
    resetTimeout: 30000,
    minimumRequestThreshold: 10
  },
  api: {
    failureThreshold: 5,
    failureRateThreshold: 60,
    resetTimeout: 45000,
    minimumRequestThreshold: 10
  },
  translation: {
    failureThreshold: 3,
    failureRateThreshold: 50,
    resetTimeout: 20000,
    minimumRequestThreshold: 5
  },
  external: {
    failureThreshold: 5,
    failureRateThreshold: 50,
    resetTimeout: 60000,
    minimumRequestThreshold: 10
  }
};

/**
 * Request result for circuit breaker tracking
 */
export interface CircuitBreakerRequestResult {
  success: boolean;
  timestamp: Date;
  duration?: number;
  error?: string;
}

/**
 * Circuit breaker metrics
 */
export interface CircuitBreakerMetrics {
  /** Total requests processed */
  totalRequests: number;
  
  /** Successful requests */
  successCount: number;
  
  /** Failed requests */
  failureCount: number;
  
  /** Current failure rate (0-100) */
  failureRate: number;
  
  /** Requests rejected due to open circuit */
  rejectedCount: number;
  
  /** Number of times circuit has tripped */
  tripCount: number;
  
  /** Time spent in each state (ms) */
  timeInState: {
    CLOSED: number;
    OPEN: number;
    HALF_OPEN: number;
  };
  
  /** Last state transition timestamp */
  lastStateChange: Date | null;
  
  /** Last failure timestamp */
  lastFailure: Date | null;
  
  /** Last success timestamp */
  lastSuccess: Date | null;
  
  /** Average response time (ms) */
  averageResponseTime: number;
  
  /** Consecutive successes in half-open state */
  halfOpenSuccesses: number;
  
  /** Consecutive failures in current window */
  consecutiveFailures: number;
}

/**
 * State change event data
 */
export interface CircuitBreakerStateChangeEvent {
  circuitBreakerId: string;
  previousState: CircuitBreakerState;
  newState: CircuitBreakerState;
  timestamp: Date;
  reason: StateChangeReason;
  metrics: CircuitBreakerMetrics;
}

/**
 * Reasons for state changes
 */
export type StateChangeReason = 
  | 'failure_threshold_exceeded'
  | 'failure_rate_exceeded'
  | 'reset_timeout_elapsed'
  | 'success_threshold_met'
  | 'half_open_failure'
  | 'manual_reset'
  | 'manual_trip'
  | 'initialization';

/**
 * Event callbacks for circuit breaker
 */
export interface CircuitBreakerCallbacks {
  /** Called when state changes */
  onStateChange?: (event: CircuitBreakerStateChangeEvent) => void;
  
  /** Called when circuit opens (trips) */
  onOpen?: (event: CircuitBreakerStateChangeEvent) => void;
  
  /** Called when circuit closes (recovers) */
  onClose?: (event: CircuitBreakerStateChangeEvent) => void;
  
  /** Called when circuit enters half-open state */
  onHalfOpen?: (event: CircuitBreakerStateChangeEvent) => void;
  
  /** Called when a request is rejected due to open circuit */
  onReject?: (circuitBreakerId: string) => void;
  
  /** Called on request success */
  onSuccess?: (circuitBreakerId: string, duration: number) => void;
  
  /** Called on request failure */
  onFailure?: (circuitBreakerId: string, error: string) => void;
}

/**
 * Snapshot of circuit breaker state for persistence
 */
export interface CircuitBreakerSnapshot {
  id: string;
  name: string;
  serviceType: ServiceType;
  serviceId?: string;
  state: CircuitBreakerState;
  metrics: CircuitBreakerMetrics;
  config: CircuitBreakerConfig;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Database row representation
 */
export interface CircuitBreakerDbRow {
  id: string;
  name: string;
  service_type: string;
  service_id: string | null;
  state: string;
  failure_count: number;
  success_count: number;
  total_requests: number;
  rejected_count: number;
  trip_count: number;
  consecutive_failures: number;
  half_open_successes: number;
  last_failure: string | null;
  last_success: string | null;
  last_state_change: string | null;
  time_in_closed: number;
  time_in_open: number;
  time_in_half_open: number;
  config: string;
  created_at: string;
  updated_at: string;
}

/**
 * Circuit breaker execution options
 */
export interface ExecuteOptions {
  /** Timeout for the operation in ms */
  timeout?: number;
  
  /** Custom error handler */
  onError?: (error: Error) => void;
  
  /** Whether to throw on rejection (default: true) */
  throwOnReject?: boolean;
  
  /** Fallback value if circuit is open */
  fallback?: () => any;
}

/**
 * Error thrown when circuit is open
 */
export class CircuitBreakerOpenError extends Error {
  constructor(
    public readonly circuitBreakerId: string,
    public readonly serviceType: ServiceType,
    public readonly serviceId?: string
  ) {
    super(`Circuit breaker '${circuitBreakerId}' is OPEN for ${serviceType}${serviceId ? `:${serviceId}` : ''}`);
    this.name = 'CircuitBreakerOpenError';
    Object.setPrototypeOf(this, CircuitBreakerOpenError.prototype);
  }
}

/**
 * Circuit breaker registry for managing multiple instances
 */
export interface CircuitBreakerRegistry {
  /** Get or create a circuit breaker by ID */
  get(id: string): CircuitBreaker | undefined;
  
  /** Get circuit breaker for a specific proxy */
  getForProxy(proxyId: string): CircuitBreaker;
  
  /** Get circuit breaker for a specific service */
  getForService(serviceType: ServiceType, serviceId?: string): CircuitBreaker;
  
  /** Get all circuit breakers */
  getAll(): CircuitBreaker[];
  
  /** Get circuit breakers by state */
  getByState(state: CircuitBreakerState): CircuitBreaker[];
  
  /** Reset all circuit breakers */
  resetAll(): void;
  
  /** Get aggregate metrics */
  getAggregateMetrics(): AggregateCircuitBreakerMetrics;
}

/**
 * Aggregate metrics across all circuit breakers
 */
export interface AggregateCircuitBreakerMetrics {
  totalCircuitBreakers: number;
  byState: Record<CircuitBreakerState, number>;
  byServiceType: Record<ServiceType, number>;
  totalRequests: number;
  totalRejected: number;
  totalTrips: number;
  overallFailureRate: number;
}

// Forward declaration for CircuitBreaker interface
export interface CircuitBreaker {
  readonly id: string;
  readonly config: CircuitBreakerConfig;
  getState(): CircuitBreakerState;
  getMetrics(): CircuitBreakerMetrics;
  canExecute(): boolean;
  execute<T>(fn: () => Promise<T>, options?: ExecuteOptions): Promise<T>;
  recordSuccess(duration?: number): void;
  recordFailure(error?: string): void;
  reset(): void;
  trip(reason?: string): void;
  getSnapshot(): CircuitBreakerSnapshot;
  destroy(): void;
}

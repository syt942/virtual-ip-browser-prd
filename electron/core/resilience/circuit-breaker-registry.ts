/**
 * Circuit Breaker Registry
 * Manages multiple circuit breaker instances for different services
 */

import { EventEmitter } from 'events';
import { CircuitBreaker, createProxyCircuitBreaker, createSearchCircuitBreaker, createApiCircuitBreaker } from './circuit-breaker';
import type {
  CircuitBreakerState,
  CircuitBreakerConfig,
  CircuitBreakerCallbacks,
  ServiceType,
  AggregateCircuitBreakerMetrics,
  CircuitBreakerRegistry as ICircuitBreakerRegistry,
  CircuitBreakerStateChangeEvent
} from './types';

/**
 * Registry configuration
 */
export interface CircuitBreakerRegistryConfig {
  /** Default callbacks for all circuit breakers */
  defaultCallbacks?: CircuitBreakerCallbacks;
  
  /** Default config overrides by service type */
  serviceTypeConfigs?: Partial<Record<ServiceType, Partial<CircuitBreakerConfig>>>;
  
  /** Enable automatic cleanup of destroyed circuit breakers */
  autoCleanup?: boolean;
  
  /** Cleanup interval in ms (default: 60000) */
  cleanupInterval?: number;
}

/**
 * Circuit Breaker Registry implementation
 */
export class CircuitBreakerRegistry extends EventEmitter implements ICircuitBreakerRegistry {
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private config: CircuitBreakerRegistryConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config: CircuitBreakerRegistryConfig = {}) {
    super();
    this.config = {
      autoCleanup: true,
      cleanupInterval: 60000,
      ...config
    };

    if (this.config.autoCleanup) {
      this.startCleanupTimer();
    }
  }

  /**
   * Get a circuit breaker by ID
   */
  get(id: string): CircuitBreaker | undefined {
    return this.circuitBreakers.get(id);
  }

  /**
   * Get or create a circuit breaker for a specific proxy
   */
  getForProxy(proxyId: string, proxyName?: string): CircuitBreaker {
    const id = `proxy-${proxyId}`;
    
    let cb = this.circuitBreakers.get(id);
    if (!cb) {
      cb = createProxyCircuitBreaker(
        proxyId,
        proxyName || proxyId,
        this.config.serviceTypeConfigs?.proxy,
        this.createCallbacksWithForwarding()
      );
      this.circuitBreakers.set(id, cb);
      this.emit('created', cb);
    }
    
    return cb;
  }

  /**
   * Get or create a circuit breaker for a specific service
   */
  getForService(serviceType: ServiceType, serviceId?: string): CircuitBreaker {
    const id = serviceId ? `${serviceType}-${serviceId}` : serviceType;
    
    let cb = this.circuitBreakers.get(id);
    if (!cb) {
      const serviceConfig = this.config.serviceTypeConfigs?.[serviceType];
      
      switch (serviceType) {
        case 'search':
          cb = createSearchCircuitBreaker(
            serviceId || 'default',
            serviceConfig,
            this.createCallbacksWithForwarding()
          );
          break;
        case 'api':
          cb = createApiCircuitBreaker(
            serviceId || 'default',
            undefined,
            serviceConfig,
            this.createCallbacksWithForwarding()
          );
          break;
        default:
          cb = new CircuitBreaker(
            {
              id,
              name: `${serviceType}: ${serviceId || 'default'}`,
              serviceType,
              serviceId,
              ...serviceConfig
            },
            this.createCallbacksWithForwarding()
          );
      }
      
      this.circuitBreakers.set(id, cb);
      this.emit('created', cb);
    }
    
    return cb;
  }

  /**
   * Register an existing circuit breaker
   */
  register(circuitBreaker: CircuitBreaker): void {
    if (this.circuitBreakers.has(circuitBreaker.id)) {
      throw new Error(`Circuit breaker with ID '${circuitBreaker.id}' already exists`);
    }
    
    this.circuitBreakers.set(circuitBreaker.id, circuitBreaker);
    this.emit('created', circuitBreaker);
  }

  /**
   * Remove a circuit breaker
   */
  remove(id: string): boolean {
    const cb = this.circuitBreakers.get(id);
    if (cb) {
      cb.destroy();
      this.circuitBreakers.delete(id);
      this.emit('removed', id);
      return true;
    }
    return false;
  }

  /**
   * Get all circuit breakers
   */
  getAll(): CircuitBreaker[] {
    return Array.from(this.circuitBreakers.values());
  }

  /**
   * Get circuit breakers by state
   */
  getByState(state: CircuitBreakerState): CircuitBreaker[] {
    return this.getAll().filter(cb => cb.getState() === state);
  }

  /**
   * Get circuit breakers by service type
   */
  getByServiceType(serviceType: ServiceType): CircuitBreaker[] {
    return this.getAll().filter(cb => cb.config.serviceType === serviceType);
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const cb of Array.from(this.circuitBreakers.values())) {
      cb.reset();
    }
    this.emit('resetAll');
  }

  /**
   * Reset circuit breakers by service type
   */
  resetByServiceType(serviceType: ServiceType): void {
    for (const cb of this.getByServiceType(serviceType)) {
      cb.reset();
    }
  }

  /**
   * Get aggregate metrics across all circuit breakers
   */
  getAggregateMetrics(): AggregateCircuitBreakerMetrics {
    const all = this.getAll();
    
    const byState: Record<CircuitBreakerState, number> = {
      CLOSED: 0,
      OPEN: 0,
      HALF_OPEN: 0
    };
    
    const byServiceType: Record<ServiceType, number> = {
      proxy: 0,
      search: 0,
      api: 0,
      translation: 0,
      external: 0
    };
    
    let totalRequests = 0;
    let totalRejected = 0;
    let totalTrips = 0;
    let totalFailures = 0;

    for (const cb of all) {
      const state = cb.getState();
      const metrics = cb.getMetrics();
      
      byState[state]++;
      byServiceType[cb.config.serviceType]++;
      
      totalRequests += metrics.totalRequests;
      totalRejected += metrics.rejectedCount;
      totalTrips += metrics.tripCount;
      totalFailures += metrics.failureCount;
    }

    return {
      totalCircuitBreakers: all.length,
      byState,
      byServiceType,
      totalRequests,
      totalRejected,
      totalTrips,
      overallFailureRate: totalRequests > 0 ? (totalFailures / totalRequests) * 100 : 0
    };
  }

  /**
   * Get all snapshots for persistence
   */
  getAllSnapshots() {
    return this.getAll().map(cb => cb.getSnapshot());
  }

  /**
   * Destroy the registry and all circuit breakers
   */
  destroy(): void {
    this.stopCleanupTimer();
    
    for (const cb of Array.from(this.circuitBreakers.values())) {
      cb.destroy();
    }
    
    this.circuitBreakers.clear();
    this.removeAllListeners();
  }

  // ============================================================
  // PRIVATE METHODS
  // ============================================================

  /**
   * Create callbacks that forward events to registry
   */
  private createCallbacksWithForwarding(): CircuitBreakerCallbacks {
    return {
      ...this.config.defaultCallbacks,
      onStateChange: (event: CircuitBreakerStateChangeEvent) => {
        this.config.defaultCallbacks?.onStateChange?.(event);
        this.emit('stateChange', event);
      },
      onOpen: (event: CircuitBreakerStateChangeEvent) => {
        this.config.defaultCallbacks?.onOpen?.(event);
        this.emit('open', event);
      },
      onClose: (event: CircuitBreakerStateChangeEvent) => {
        this.config.defaultCallbacks?.onClose?.(event);
        this.emit('close', event);
      },
      onHalfOpen: (event: CircuitBreakerStateChangeEvent) => {
        this.config.defaultCallbacks?.onHalfOpen?.(event);
        this.emit('halfOpen', event);
      }
    };
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      // Cleanup any stale entries if needed
      // Currently a no-op but can be extended
    }, this.config.cleanupInterval);
  }

  /**
   * Stop cleanup timer
   */
  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

// Singleton instance
let registryInstance: CircuitBreakerRegistry | null = null;

/**
 * Get the global circuit breaker registry instance
 */
export function getCircuitBreakerRegistry(config?: CircuitBreakerRegistryConfig): CircuitBreakerRegistry {
  if (!registryInstance) {
    registryInstance = new CircuitBreakerRegistry(config);
  }
  return registryInstance;
}

/**
 * Reset the global registry (useful for testing)
 */
export function resetCircuitBreakerRegistry(): void {
  if (registryInstance) {
    registryInstance.destroy();
    registryInstance = null;
  }
}

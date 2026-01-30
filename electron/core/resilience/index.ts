/**
 * Resilience Module
 * Circuit breaker pattern implementation for fault tolerance
 * 
 * PRD Section 6.2 P1: Circuit breaker for proxy connections and external API calls
 * 
 * Usage:
 * ```typescript
 * import { getCircuitBreakerRegistry, CircuitBreaker } from './resilience';
 * 
 * // Get the global registry
 * const registry = getCircuitBreakerRegistry();
 * 
 * // Get or create circuit breaker for a proxy
 * const proxyBreaker = registry.getForProxy('proxy-123', 'US Proxy');
 * 
 * // Execute with circuit breaker protection
 * const result = await proxyBreaker.execute(async () => {
 *   return await makeProxyRequest();
 * });
 * 
 * // Or use for search engines
 * const searchBreaker = registry.getForService('search', 'google');
 * await searchBreaker.execute(async () => {
 *   return await performSearch();
 * });
 * ```
 */

// Core circuit breaker
export { 
  CircuitBreaker,
  createCircuitBreaker,
  createProxyCircuitBreaker,
  createSearchCircuitBreaker,
  createApiCircuitBreaker
} from './circuit-breaker';

// Registry for managing multiple circuit breakers
export {
  CircuitBreakerRegistry,
  getCircuitBreakerRegistry,
  resetCircuitBreakerRegistry
} from './circuit-breaker-registry';

// Types and interfaces
export type {
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
  AggregateCircuitBreakerMetrics,
  CircuitBreakerRegistry as ICircuitBreakerRegistry,
  CircuitBreaker as ICircuitBreaker,
  CircuitBreakerDbRow
} from './types';

// Constants and presets
export {
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
  SERVICE_TYPE_PRESETS,
  CircuitBreakerOpenError
} from './types';

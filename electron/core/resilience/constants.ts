/**
 * Circuit Breaker Constants
 * Named constants for circuit breaker pattern implementation
 * 
 * @module electron/core/resilience/constants
 */

// =============================================================================
// Request History Management
// =============================================================================

/**
 * Maximum number of request history entries to keep
 * Prevents memory bloat while maintaining enough history for analysis
 */
export const MAX_REQUEST_HISTORY_SIZE = 1000;

/**
 * Number of entries to keep when trimming request history
 * When history exceeds MAX_REQUEST_HISTORY_SIZE, trim to this count
 */
export const TRIMMED_REQUEST_HISTORY_SIZE = 500;

// =============================================================================
// Default Circuit Breaker Configuration Values
// These are also defined in types.ts for the config interface
// =============================================================================

/**
 * Default number of consecutive failures before circuit opens
 */
export const DEFAULT_FAILURE_THRESHOLD = 5;

/**
 * Default failure rate percentage to trip circuit (0-100)
 */
export const DEFAULT_FAILURE_RATE_THRESHOLD = 50;

/**
 * Default minimum number of requests before failure rate is considered
 */
export const DEFAULT_MINIMUM_REQUEST_THRESHOLD = 10;

/**
 * Default time in ms circuit stays open before moving to half-open
 */
export const DEFAULT_RESET_TIMEOUT_MS = 30000;

/**
 * Default number of successful requests in half-open to close circuit
 */
export const DEFAULT_SUCCESS_THRESHOLD = 3;

/**
 * Default sliding window size in ms for calculating failure rate
 */
export const DEFAULT_SLIDING_WINDOW_SIZE_MS = 60000;

/**
 * Default maximum requests allowed in half-open state
 */
export const DEFAULT_HALF_OPEN_MAX_REQUESTS = 3;

// =============================================================================
// Service Type Preset Values
// =============================================================================

/** Proxy service failure threshold (more sensitive) */
export const PROXY_FAILURE_THRESHOLD = 3;

/** Proxy service failure rate threshold */
export const PROXY_FAILURE_RATE_THRESHOLD = 40;

/** Proxy service reset timeout (longer recovery time) */
export const PROXY_RESET_TIMEOUT_MS = 60000;

/** Proxy service minimum request threshold */
export const PROXY_MINIMUM_REQUEST_THRESHOLD = 5;

/** Search service reset timeout */
export const SEARCH_RESET_TIMEOUT_MS = 30000;

/** API service failure rate threshold (more tolerant) */
export const API_FAILURE_RATE_THRESHOLD = 60;

/** API service reset timeout */
export const API_RESET_TIMEOUT_MS = 45000;

/** Translation service failure threshold */
export const TRANSLATION_FAILURE_THRESHOLD = 3;

/** Translation service reset timeout (faster recovery) */
export const TRANSLATION_RESET_TIMEOUT_MS = 20000;

/** External service reset timeout */
export const EXTERNAL_RESET_TIMEOUT_MS = 60000;

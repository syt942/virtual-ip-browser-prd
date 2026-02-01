/**
 * Error Message Sanitization
 * 
 * SECURITY: Prevents sensitive information leakage through error messages.
 * All errors exposed to users or logs should be sanitized.
 */

// ============================================================================
// SENSITIVE PATTERNS TO REDACT
// ============================================================================

/**
 * Patterns that indicate sensitive data in error messages
 */
const SENSITIVE_PATTERNS = [
  // File paths
  /(?:\/[a-zA-Z_][a-zA-Z0-9_-]*)+(?:\/[a-zA-Z0-9_.-]+)+/g,
  /[A-Z]:\\(?:[^\\/:*?"<>|\r\n]+\\)*[^\\/:*?"<>|\r\n]*/gi,
  
  // Environment variables references
  /process\.env\.\w+/gi,
  
  // API keys and tokens (common patterns)
  /(?:api[_-]?key|token|secret|password|credential)[=:]\s*['"]?[\w-]+['"]?/gi,
  /sk-[a-zA-Z0-9]{20,}/g,  // OpenAI keys
  /ghp_[a-zA-Z0-9]{36}/g,  // GitHub tokens
  /xox[baprs]-[a-zA-Z0-9-]+/g,  // Slack tokens
  
  // Connection strings
  /(?:mongodb|postgres|mysql|redis):\/\/[^\s]+/gi,
  
  // IP addresses (internal)
  /\b(?:10|172\.(?:1[6-9]|2\d|3[01])|192\.168)\.\d{1,3}\.\d{1,3}\b/g,
  /\b127\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
  
  // Email addresses
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  
  // Stack trace paths
  /at\s+[\w.]+\s+\([^)]+\)/g,
  /\s+at\s+[^\n]+/g,
];

/**
 * Error categories for structured logging
 */
export type ErrorCategory =
  | 'validation'
  | 'network'
  | 'timeout'
  | 'permission'
  | 'not_found'
  | 'rate_limit'
  | 'internal'
  | 'unknown';

/**
 * Safe error structure for external exposure
 */
export interface SafeError {
  category: ErrorCategory;
  message: string;
  code?: string;
  retryable: boolean;
}

// ============================================================================
// ERROR MESSAGE SANITIZATION
// ============================================================================

/**
 * Redact sensitive information from error message
 */
export function redactSensitiveInfo(message: string): string {
  if (typeof message !== 'string') {
    return 'An error occurred';
  }

  let sanitized = message;

  for (const pattern of SENSITIVE_PATTERNS) {
    // Reset lastIndex for global regexes
    pattern.lastIndex = 0;
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }

  // Remove any remaining path-like sequences
  sanitized = sanitized.replace(/(?:\/[\w.-]+){3,}/g, '[PATH]');

  return sanitized;
}

/**
 * Remove stack traces from error messages
 */
export function removeStackTrace(message: string): string {
  if (typeof message !== 'string') {
    return 'An error occurred';
  }

  // Remove common stack trace patterns
  return message
    .replace(/\n\s*at\s+[^\n]+/g, '')
    .replace(/Error:\s*/g, '')
    .replace(/\s*\n\s*\n/g, ' ')
    .trim();
}

/**
 * Sanitize error message for user display
 */
export function sanitizeErrorMessage(error: unknown): string {
  let message: string;

  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  } else if (error && typeof error === 'object' && 'message' in error) {
    message = String((error as { message: unknown }).message);
  } else {
    message = 'An unexpected error occurred';
  }

  // Remove stack trace
  message = removeStackTrace(message);

  // Redact sensitive information
  message = redactSensitiveInfo(message);

  // Limit length
  if (message.length > 200) {
    message = message.substring(0, 200) + '...';
  }

  return message || 'An error occurred';
}

// ============================================================================
// ERROR CATEGORIZATION
// ============================================================================

/**
 * Categorize error for structured handling
 */
export function categorizeError(error: unknown): ErrorCategory {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  if (message.includes('valid') || message.includes('invalid') || message.includes('required')) {
    return 'validation';
  }

  if (message.includes('econnrefused') || message.includes('enotfound') || 
      message.includes('network') || message.includes('fetch') ||
      message.includes('connection')) {
    return 'network';
  }

  if (message.includes('timeout') || message.includes('etimedout') ||
      message.includes('timed out')) {
    return 'timeout';
  }

  if (message.includes('permission') || message.includes('denied') ||
      message.includes('unauthorized') || message.includes('forbidden')) {
    return 'permission';
  }

  if (message.includes('not found') || message.includes('enoent') ||
      message.includes('404') || message.includes('does not exist')) {
    return 'not_found';
  }

  if (message.includes('rate') || message.includes('limit') ||
      message.includes('too many') || message.includes('429')) {
    return 'rate_limit';
  }

  if (message.includes('internal') || message.includes('500')) {
    return 'internal';
  }

  return 'unknown';
}

/**
 * Create a safe error object for external exposure
 */
export function createSafeError(error: unknown, customMessage?: string): SafeError {
  const category = categorizeError(error);
  const message = customMessage || sanitizeErrorMessage(error);

  // Determine if error is retryable
  const retryable = ['network', 'timeout', 'rate_limit'].includes(category);

  // Get error code if available
  let code: string | undefined;
  if (error instanceof Error && 'code' in error) {
    code = String((error as Error & { code?: string }).code);
  }

  return {
    category,
    message,
    code,
    retryable,
  };
}

// ============================================================================
// STRUCTURED ERROR LOGGING
// ============================================================================

/**
 * Log level for structured logging
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Structured log entry
 */
export interface StructuredLogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  context?: Record<string, unknown>;
  error?: SafeError;
}

/**
 * Create a structured log entry
 */
export function createLogEntry(
  level: LogLevel,
  category: string,
  message: string,
  context?: Record<string, unknown>,
  error?: unknown
): StructuredLogEntry {
  const entry: StructuredLogEntry = {
    timestamp: new Date().toISOString(),
    level,
    category,
    message: redactSensitiveInfo(message),
  };

  // Sanitize context values
  if (context) {
    entry.context = sanitizeContext(context);
  }

  // Add error info if present
  if (error) {
    entry.error = createSafeError(error);
  }

  return entry;
}

/**
 * Sanitize context object for logging
 */
function sanitizeContext(context: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(context)) {
    // Skip sensitive keys
    const lowerKey = key.toLowerCase();
    if (lowerKey.includes('password') || lowerKey.includes('secret') ||
        lowerKey.includes('token') || lowerKey.includes('key') ||
        lowerKey.includes('credential')) {
      sanitized[key] = '[REDACTED]';
      continue;
    }

    // Sanitize string values
    if (typeof value === 'string') {
      sanitized[key] = redactSensitiveInfo(value);
    } else if (typeof value === 'object' && value !== null) {
      // Recursively sanitize nested objects (limit depth)
      sanitized[key] = '[Object]';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

// ============================================================================
// PRODUCTION ERROR MESSAGES
// ============================================================================

/**
 * User-friendly error messages by category
 */
const USER_FRIENDLY_MESSAGES: Record<ErrorCategory, string> = {
  validation: 'The provided input is invalid. Please check and try again.',
  network: 'A network error occurred. Please check your connection and try again.',
  timeout: 'The operation timed out. Please try again.',
  permission: 'You do not have permission to perform this action.',
  not_found: 'The requested resource was not found.',
  rate_limit: 'Too many requests. Please wait a moment and try again.',
  internal: 'An internal error occurred. Please try again later.',
  unknown: 'An unexpected error occurred. Please try again.',
};

/**
 * Get user-friendly error message
 * Use in production to avoid exposing internal details
 */
export function getUserFriendlyMessage(error: unknown): string {
  const category = categorizeError(error);
  return USER_FRIENDLY_MESSAGES[category];
}

/**
 * Check if running in production
 */
function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Get error message appropriate for current environment
 * - Production: User-friendly message only
 * - Development: Sanitized detailed message
 */
export function getEnvironmentAppropriateMessage(error: unknown): string {
  if (isProduction()) {
    return getUserFriendlyMessage(error);
  }
  return sanitizeErrorMessage(error);
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  redactSensitiveInfo,
  removeStackTrace,
  sanitizeErrorMessage,
  categorizeError,
  createSafeError,
  createLogEntry,
  getUserFriendlyMessage,
  getEnvironmentAppropriateMessage,
};

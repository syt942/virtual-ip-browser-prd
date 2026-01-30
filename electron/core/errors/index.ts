/**
 * Custom Error Classes for Virtual IP Browser
 * Provides structured error handling with context and actionable information
 * 
 * @module electron/core/errors
 */

// ============================================================================
// BASE ERROR CLASS
// ============================================================================

/**
 * Base application error with enhanced context
 */
export class AppError extends Error {
  /** Error code for programmatic handling */
  public readonly code: string;
  /** Operation that was being performed when error occurred */
  public readonly operation: string;
  /** Additional context for debugging */
  public readonly context?: Record<string, unknown>;
  /** Whether this error is recoverable */
  public readonly recoverable: boolean;
  /** Suggested action for recovery */
  public readonly suggestedAction?: string;
  /** Timestamp when error occurred */
  public readonly timestamp: Date;
  /** Original error that caused this error */
  public readonly cause?: Error;

  constructor(
    message: string,
    options: {
      code: string;
      operation: string;
      context?: Record<string, unknown>;
      recoverable?: boolean;
      suggestedAction?: string;
      cause?: Error;
    }
  ) {
    super(message);
    this.name = 'AppError';
    this.code = options.code;
    this.operation = options.operation;
    this.context = options.context;
    this.recoverable = options.recoverable ?? false;
    this.suggestedAction = options.suggestedAction;
    this.timestamp = new Date();
    this.cause = options.cause;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to a loggable format
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      operation: this.operation,
      context: this.context,
      recoverable: this.recoverable,
      suggestedAction: this.suggestedAction,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
      cause: this.cause?.message
    };
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    if (this.suggestedAction) {
      return `${this.message}. ${this.suggestedAction}`;
    }
    return this.message;
  }
}

// ============================================================================
// PROXY ERRORS
// ============================================================================

/**
 * Error codes for proxy operations
 */
export const ProxyErrorCode = {
  CONNECTION_FAILED: 'PROXY_CONNECTION_FAILED',
  AUTHENTICATION_FAILED: 'PROXY_AUTH_FAILED',
  TIMEOUT: 'PROXY_TIMEOUT',
  INVALID_CONFIG: 'PROXY_INVALID_CONFIG',
  NOT_FOUND: 'PROXY_NOT_FOUND',
  VALIDATION_FAILED: 'PROXY_VALIDATION_FAILED',
  SSRF_BLOCKED: 'PROXY_SSRF_BLOCKED',
  ROTATION_FAILED: 'PROXY_ROTATION_FAILED',
  CREDENTIAL_DECRYPT_FAILED: 'PROXY_CREDENTIAL_DECRYPT_FAILED',
  ALL_PROXIES_EXHAUSTED: 'PROXY_ALL_EXHAUSTED'
} as const;

export type ProxyErrorCodeType = typeof ProxyErrorCode[keyof typeof ProxyErrorCode];

/**
 * Proxy-specific error with connection details
 */
export class ProxyConnectionError extends AppError {
  /** Proxy ID if available */
  public readonly proxyId?: string;
  /** Proxy host */
  public readonly host?: string;
  /** Proxy port */
  public readonly port?: number;
  /** Number of retry attempts made */
  public readonly retryAttempts: number;

  constructor(
    message: string,
    options: {
      code: ProxyErrorCodeType;
      operation: string;
      proxyId?: string;
      host?: string;
      port?: number;
      retryAttempts?: number;
      context?: Record<string, unknown>;
      cause?: Error;
      suggestedAction?: string;
    }
  ) {
    super(message, {
      code: options.code,
      operation: options.operation,
      context: {
        ...options.context,
        proxyId: options.proxyId,
        host: options.host,
        port: options.port
      },
      recoverable: true, // Proxy errors are usually recoverable via retry or rotation
      suggestedAction: options.suggestedAction ?? 'Try using a different proxy or check your proxy configuration',
      cause: options.cause
    });
    this.name = 'ProxyConnectionError';
    this.proxyId = options.proxyId;
    this.host = options.host;
    this.port = options.port;
    this.retryAttempts = options.retryAttempts ?? 0;
  }
}

// ============================================================================
// DATABASE ERRORS
// ============================================================================

/**
 * Error codes for database operations
 */
export const DatabaseErrorCode = {
  CONNECTION_FAILED: 'DB_CONNECTION_FAILED',
  QUERY_FAILED: 'DB_QUERY_FAILED',
  MIGRATION_FAILED: 'DB_MIGRATION_FAILED',
  CONSTRAINT_VIOLATION: 'DB_CONSTRAINT_VIOLATION',
  NOT_FOUND: 'DB_NOT_FOUND',
  TRANSACTION_FAILED: 'DB_TRANSACTION_FAILED',
  CORRUPTION_DETECTED: 'DB_CORRUPTION',
  SCHEMA_MISMATCH: 'DB_SCHEMA_MISMATCH'
} as const;

export type DatabaseErrorCodeType = typeof DatabaseErrorCode[keyof typeof DatabaseErrorCode];

/**
 * Database-specific error with query context
 */
export class DatabaseError extends AppError {
  /** SQL query that failed (sanitized) */
  public readonly query?: string;
  /** Table involved in the operation */
  public readonly table?: string;
  /** SQLite error code if available */
  public readonly sqliteCode?: string;

  constructor(
    message: string,
    options: {
      code: DatabaseErrorCodeType;
      operation: string;
      query?: string;
      table?: string;
      sqliteCode?: string;
      context?: Record<string, unknown>;
      cause?: Error;
      suggestedAction?: string;
    }
  ) {
    super(message, {
      code: options.code,
      operation: options.operation,
      context: {
        ...options.context,
        table: options.table,
        sqliteCode: options.sqliteCode
      },
      recoverable: options.code !== DatabaseErrorCode.CORRUPTION_DETECTED,
      suggestedAction: options.suggestedAction ?? 'Check database connection and retry the operation',
      cause: options.cause
    });
    this.name = 'DatabaseError';
    // Sanitize query to avoid logging sensitive data
    this.query = options.query ? this.sanitizeQuery(options.query) : undefined;
    this.table = options.table;
    this.sqliteCode = options.sqliteCode;
  }

  private sanitizeQuery(query: string): string {
    // Remove potential sensitive values from query for logging
    return query.replace(/VALUES\s*\([^)]+\)/gi, 'VALUES (...)');
  }
}

// ============================================================================
// IPC ERRORS
// ============================================================================

/**
 * Error codes for IPC operations
 */
export const IPCErrorCode = {
  VALIDATION_FAILED: 'IPC_VALIDATION_FAILED',
  RATE_LIMITED: 'IPC_RATE_LIMITED',
  UNAUTHORIZED_CHANNEL: 'IPC_UNAUTHORIZED',
  HANDLER_ERROR: 'IPC_HANDLER_ERROR',
  TIMEOUT: 'IPC_TIMEOUT',
  SERIALIZATION_FAILED: 'IPC_SERIALIZATION_FAILED'
} as const;

export type IPCErrorCodeType = typeof IPCErrorCode[keyof typeof IPCErrorCode];

/**
 * IPC-specific error
 */
export class IPCError extends AppError {
  /** IPC channel name */
  public readonly channel: string;
  /** Retry after (ms) if rate limited */
  public readonly retryAfter?: number;

  constructor(
    message: string,
    options: {
      code: IPCErrorCodeType;
      channel: string;
      operation?: string;
      retryAfter?: number;
      context?: Record<string, unknown>;
      cause?: Error;
      suggestedAction?: string;
    }
  ) {
    super(message, {
      code: options.code,
      operation: options.operation ?? `IPC:${options.channel}`,
      context: {
        ...options.context,
        channel: options.channel
      },
      recoverable: options.code === IPCErrorCode.RATE_LIMITED,
      suggestedAction: options.suggestedAction,
      cause: options.cause
    });
    this.name = 'IPCError';
    this.channel = options.channel;
    this.retryAfter = options.retryAfter;
  }
}

// ============================================================================
// AUTOMATION ERRORS
// ============================================================================

/**
 * Error codes for automation operations
 */
export const AutomationErrorCode = {
  SESSION_NOT_FOUND: 'AUTO_SESSION_NOT_FOUND',
  TASK_FAILED: 'AUTO_TASK_FAILED',
  CAPTCHA_DETECTED: 'AUTO_CAPTCHA_DETECTED',
  PAGE_LOAD_FAILED: 'AUTO_PAGE_LOAD_FAILED',
  SEARCH_FAILED: 'AUTO_SEARCH_FAILED',
  CLICK_FAILED: 'AUTO_CLICK_FAILED',
  TIMEOUT: 'AUTO_TIMEOUT',
  SCHEDULE_ERROR: 'AUTO_SCHEDULE_ERROR',
  CRON_PARSE_ERROR: 'AUTO_CRON_PARSE_ERROR'
} as const;

export type AutomationErrorCodeType = typeof AutomationErrorCode[keyof typeof AutomationErrorCode];

/**
 * Automation-specific error
 */
export class AutomationError extends AppError {
  /** Session ID if applicable */
  public readonly sessionId?: string;
  /** Task ID if applicable */
  public readonly taskId?: string;
  /** URL being processed when error occurred */
  public readonly url?: string;

  constructor(
    message: string,
    options: {
      code: AutomationErrorCodeType;
      operation: string;
      sessionId?: string;
      taskId?: string;
      url?: string;
      context?: Record<string, unknown>;
      cause?: Error;
      suggestedAction?: string;
    }
  ) {
    super(message, {
      code: options.code,
      operation: options.operation,
      context: {
        ...options.context,
        sessionId: options.sessionId,
        taskId: options.taskId,
        url: options.url
      },
      recoverable: options.code !== AutomationErrorCode.CAPTCHA_DETECTED,
      suggestedAction: options.suggestedAction ?? 'Retry the operation or check automation configuration',
      cause: options.cause
    });
    this.name = 'AutomationError';
    this.sessionId = options.sessionId;
    this.taskId = options.taskId;
    this.url = options.url;
  }
}

// ============================================================================
// ENCRYPTION ERRORS
// ============================================================================

/**
 * Error codes for encryption operations
 */
export const EncryptionErrorCode = {
  ENCRYPTION_FAILED: 'ENC_ENCRYPTION_FAILED',
  DECRYPTION_FAILED: 'ENC_DECRYPTION_FAILED',
  INVALID_KEY: 'ENC_INVALID_KEY',
  KEY_DERIVATION_FAILED: 'ENC_KEY_DERIVATION_FAILED',
  SAFE_STORAGE_UNAVAILABLE: 'ENC_SAFE_STORAGE_UNAVAILABLE',
  DATA_CORRUPTED: 'ENC_DATA_CORRUPTED'
} as const;

export type EncryptionErrorCodeType = typeof EncryptionErrorCode[keyof typeof EncryptionErrorCode];

/**
 * Encryption-specific error
 */
export class EncryptionError extends AppError {
  constructor(
    message: string,
    options: {
      code: EncryptionErrorCodeType;
      operation: string;
      context?: Record<string, unknown>;
      cause?: Error;
      suggestedAction?: string;
    }
  ) {
    super(message, {
      code: options.code,
      operation: options.operation,
      context: options.context,
      recoverable: false, // Encryption errors usually require user intervention
      suggestedAction: options.suggestedAction ?? 'Check encryption keys and re-encrypt data if necessary',
      cause: options.cause
    });
    this.name = 'EncryptionError';
  }
}

// ============================================================================
// NETWORK ERRORS
// ============================================================================

/**
 * Error codes for network operations
 */
export const NetworkErrorCode = {
  CONNECTION_REFUSED: 'NET_CONNECTION_REFUSED',
  DNS_RESOLUTION_FAILED: 'NET_DNS_FAILED',
  TIMEOUT: 'NET_TIMEOUT',
  SSL_ERROR: 'NET_SSL_ERROR',
  RESPONSE_ERROR: 'NET_RESPONSE_ERROR',
  ABORT: 'NET_ABORTED'
} as const;

export type NetworkErrorCodeType = typeof NetworkErrorCode[keyof typeof NetworkErrorCode];

/**
 * Network-specific error
 */
export class NetworkError extends AppError {
  /** HTTP status code if applicable */
  public readonly statusCode?: number;
  /** URL that failed */
  public readonly url?: string;

  constructor(
    message: string,
    options: {
      code: NetworkErrorCodeType;
      operation: string;
      statusCode?: number;
      url?: string;
      context?: Record<string, unknown>;
      cause?: Error;
      suggestedAction?: string;
    }
  ) {
    super(message, {
      code: options.code,
      operation: options.operation,
      context: {
        ...options.context,
        statusCode: options.statusCode,
        url: options.url
      },
      recoverable: true,
      suggestedAction: options.suggestedAction ?? 'Check network connection and retry',
      cause: options.cause
    });
    this.name = 'NetworkError';
    this.statusCode = options.statusCode;
    this.url = options.url;
  }
}

// ============================================================================
// ERROR HELPER FUNCTIONS
// ============================================================================

/**
 * Type guard to check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Extract error message safely from unknown error type
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
}

/**
 * Extract error code safely
 */
export function getErrorCode(error: unknown): string {
  if (isAppError(error)) {
    return error.code;
  }
  if (error instanceof Error && 'code' in error) {
    return String((error as Error & { code: unknown }).code);
  }
  return 'UNKNOWN_ERROR';
}

/**
 * Wrap an unknown error in an AppError
 */
export function wrapError(
  error: unknown,
  operation: string,
  context?: Record<string, unknown>
): AppError {
  if (isAppError(error)) {
    return error;
  }

  const originalError = error instanceof Error ? error : new Error(getErrorMessage(error));

  return new AppError(originalError.message, {
    code: 'WRAPPED_ERROR',
    operation,
    context,
    recoverable: false,
    cause: originalError
  });
}

/**
 * Format error for logging with consistent structure
 */
export function formatErrorForLogging(
  error: unknown,
  additionalContext?: Record<string, unknown>
): Record<string, unknown> {
  if (isAppError(error)) {
    return {
      ...error.toJSON(),
      ...additionalContext
    };
  }

  const errorObj = error instanceof Error ? error : new Error(getErrorMessage(error));
  
  return {
    name: errorObj.name,
    message: errorObj.message,
    stack: errorObj.stack,
    ...additionalContext
  };
}

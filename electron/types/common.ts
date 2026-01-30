/**
 * Common Type Definitions
 * Shared types used across the Virtual IP Browser application
 * @module electron/types/common
 */

// Types for common patterns across the application

// ============================================================================
// LOGGING TYPES
// ============================================================================

/**
 * Log metadata - structured data attached to log entries
 * Use Record<string, unknown> for type safety while allowing flexibility
 */
export type LogMetadata = Record<string, unknown>;

/**
 * Log levels supported by the application
 */
export type LogLevel = 'debug' | 'info' | 'warning' | 'error' | 'success';

/**
 * Database row for activity logs (raw from SQLite)
 */
export interface ActivityLogRow {
  id: string;
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  metadata: string | null;
  session_id: string | null;
  tab_id: string | null;
  proxy_id: string | null;
}

// ============================================================================
// DATABASE TYPES
// ============================================================================

/**
 * SQLite parameter types that can be bound to prepared statements
 */
export type SqliteParam = string | number | bigint | Buffer | null | undefined;

/**
 * Array of SQLite parameters for prepared statement binding
 */
export type SqliteParams = SqliteParam[];

/**
 * Generic database row type for query results
 * Use this when the exact structure is not known at compile time
 */
export type DatabaseRow = Record<string, SqliteParam>;

/**
 * Session row from database (raw)
 */
export interface SessionRow {
  id: string;
  name: string;
  tabs: string;
  window_bounds: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// NAVIGATOR/FINGERPRINT TYPES
// ============================================================================

/**
 * Navigator spoofing configuration for privacy protection
 */
export interface NavigatorSpoofConfig {
  userAgent?: string;
  platform?: string;
  language?: string;
  languages?: string[];
  vendor?: string;
  hardwareConcurrency?: number;
  deviceMemory?: number;
  maxTouchPoints?: number;
  oscpu?: string;
}

/**
 * Fingerprint configuration for tab isolation
 */
export interface FingerprintConfig {
  canvas?: boolean;
  webgl?: boolean;
  audio?: boolean;
  navigator?: boolean | NavigatorSpoofConfig;
  timezone?: boolean | string;
  webrtc?: boolean;
  trackerBlocking?: boolean;
  language?: string;
}

/**
 * Privacy configuration used across the application
 */
export interface PrivacyConfig {
  canvas: boolean;
  webgl: boolean;
  audio: boolean;
  navigator: boolean;
  timezone: boolean;
  webrtc: boolean;
  trackerBlocking: boolean;
  navigatorConfig?: NavigatorSpoofConfig;
  timezoneRegion?: string;
}

// ============================================================================
// IPC/API RESPONSE TYPES
// ============================================================================

/**
 * Standard API response structure
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  total?: number;
}

/**
 * Activity log API response
 */
export interface ActivityLogApiResponse extends ApiResponse<ActivityLogRow[]> {
  total?: number;
}

// ============================================================================
// ZOD ERROR TYPES
// ============================================================================

/**
 * Zod validation issue structure (compatible with multiple Zod versions)
 */
export interface ZodValidationIssue {
  path?: (string | number)[];
  message: string;
  code?: string;
}

/**
 * Zod error structure for validation failures
 */
export interface ZodErrorLike {
  issues?: ZodValidationIssue[];
  errors?: ZodValidationIssue[];
  message?: string;
}

// ============================================================================
// RULE ACTION PARAMS
// ============================================================================

/**
 * Parameters for proxy rule actions
 * More specific than Record<string, any>
 */
export interface RuleActionParams {
  proxyId?: string;
  proxyIds?: string[];
  groupName?: string;
  country?: string;
  countries?: string[];
  excludeProxyId?: string;
  excludeCountry?: string;
  [key: string]: string | string[] | number | boolean | undefined;
}

// ============================================================================
// ELECTRON VIEW TYPE
// ============================================================================

/**
 * BrowserView-like interface for automation tasks
 * Used when we need to pass a view to automation functions
 */
export interface BrowserViewLike {
  webContents: {
    loadURL: (url: string) => Promise<void>;
    executeJavaScript: (code: string) => Promise<unknown>;
    getURL: () => string;
    goBack: () => void;
    goForward: () => void;
    reload: () => void;
    canGoBack: () => boolean;
    canGoForward: () => boolean;
    on: (event: string, callback: (...args: unknown[]) => void) => void;
  };
}

// ============================================================================
// SCHEDULE TYPES
// ============================================================================

/**
 * Schedule event data emitted by scheduler
 */
export interface ScheduleEventData {
  id: string;
  name?: string;
  type: string;
  taskConfig: unknown;
  nextRun?: Date;
}

// ============================================================================
// EVENT HANDLER TYPES
// ============================================================================

/**
 * Generic event handler function type
 */
export type EventHandler<T = unknown> = (data: T) => void;

/**
 * Async event handler function type  
 */
export type AsyncEventHandler<T = unknown> = (data: T) => void | Promise<void>;

/**
 * IPC Validation Schemas
 * Zod schemas for validating all IPC handler inputs
 * 
 * SECURITY FEATURES:
 * - Input length limits to prevent DoS
 * - Pattern validation to prevent injection attacks
 * - Protocol whitelisting for URLs
 * - Private IP blocking for SSRF prevention
 * - Null byte stripping
 * - XSS pattern detection
 */

import { z } from 'zod';

// ============================================================================
// SECURITY HELPERS
// ============================================================================

/**
 * Dangerous patterns that indicate XSS/injection attempts
 */
const XSS_PATTERNS = /<script|javascript:|on\w+\s*=|data:text\/html|vbscript:|expression\s*\(/i;

/**
 * Strip null bytes and trim whitespace for security
 */
function sanitize(value: string): string {
  return value.replace(/\0/g, '').trim();
}

/**
 * Check if string contains XSS patterns
 */
function hasXSSPatterns(value: string): boolean {
  return XSS_PATTERNS.test(value);
}

/**
 * Private IP ranges that should be blocked (SSRF prevention)
 */
function isPrivateOrBlockedIP(hostname: string): boolean {
  // Block metadata endpoints
  const blockedHosts = [
    'localhost', '127.0.0.1', '0.0.0.0', '::1',
    '169.254.169.254', // AWS metadata
    '169.254.170.2',   // AWS ECS
    'metadata.google.internal',
    'metadata.goog'
  ];
  
  if (blockedHosts.includes(hostname.toLowerCase())) {return true;}
  
  // Check for IP addresses
  const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipPattern.test(hostname)) {
    const octets = hostname.split('.').map(Number);
    if (octets.some(o => o < 0 || o > 255)) {return true;}
    
    // 10.x.x.x, 172.16-31.x.x, 192.168.x.x, 127.x.x.x, 0.x.x.x
    if (octets[0] === 10) {return true;}
    if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) {return true;}
    if (octets[0] === 192 && octets[1] === 168) {return true;}
    if (octets[0] === 127) {return true;}
    if (octets[0] === 0) {return true;}
    if (octets[0] === 169 && octets[1] === 254) {return true;}
  }
  
  return false;
}

// ============================================================================
// PROXY VALIDATION SCHEMAS
// ============================================================================

// ============================================================================
// PROXY VALIDATION CONSTANTS
// ============================================================================

/** Valid port range constraints */
const PORT_RANGE = {
  MIN: 1,
  MAX: 65535,
} as const;

/** Maximum length constraints for proxy fields */
const PROXY_FIELD_LIMITS = {
  HOST_MAX_LENGTH: 255,
  USERNAME_MAX_LENGTH: 255,
  PASSWORD_MAX_LENGTH: 255,
  NAME_MAX_LENGTH: 100,
  REGION_MAX_LENGTH: 100,
  TAG_MAX_LENGTH: 50,
  MAX_TAGS_COUNT: 20,
} as const;

/** Regex pattern for valid hostname format */
const VALID_HOSTNAME_PATTERN = /^[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?$/;

export const ProxyConfigSchema = z.object({
  host: z.string()
    .min(1, 'Proxy host is required - please provide an IP address or hostname')
    .max(PROXY_FIELD_LIMITS.HOST_MAX_LENGTH, `Proxy host must not exceed ${PROXY_FIELD_LIMITS.HOST_MAX_LENGTH} characters`)
    .transform(sanitize)
    .refine(
      (host) => VALID_HOSTNAME_PATTERN.test(host),
      { message: 'Proxy host must be a valid hostname or IP address (e.g., proxy.example.com or 192.168.1.1)' }
    )
    .refine(
      (host) => !hasXSSPatterns(host),
      { message: 'Proxy host contains potentially dangerous characters that are not allowed' }
    ),
  port: z.number()
    .int('Proxy port must be a whole number')
    .min(PORT_RANGE.MIN, `Proxy port must be at least ${PORT_RANGE.MIN}`)
    .max(PORT_RANGE.MAX, `Proxy port must be between ${PORT_RANGE.MIN} and ${PORT_RANGE.MAX}`),
  protocol: z.enum(['http', 'https', 'socks4', 'socks5'], {
    errorMap: () => ({ message: 'Proxy protocol must be one of: http, https, socks4, or socks5' })
  }),
  username: z.string().max(PROXY_FIELD_LIMITS.USERNAME_MAX_LENGTH, `Username must not exceed ${PROXY_FIELD_LIMITS.USERNAME_MAX_LENGTH} characters`).transform(sanitize).optional(),
  password: z.string().max(PROXY_FIELD_LIMITS.PASSWORD_MAX_LENGTH, `Password must not exceed ${PROXY_FIELD_LIMITS.PASSWORD_MAX_LENGTH} characters`).transform(sanitize).optional(),
  name: z.string().max(PROXY_FIELD_LIMITS.NAME_MAX_LENGTH, `Proxy name must not exceed ${PROXY_FIELD_LIMITS.NAME_MAX_LENGTH} characters`).transform(sanitize).default(''),
  region: z.string().max(PROXY_FIELD_LIMITS.REGION_MAX_LENGTH, `Region must not exceed ${PROXY_FIELD_LIMITS.REGION_MAX_LENGTH} characters`).transform(sanitize).optional(),
  tags: z.array(z.string().max(PROXY_FIELD_LIMITS.TAG_MAX_LENGTH, `Each tag must not exceed ${PROXY_FIELD_LIMITS.TAG_MAX_LENGTH} characters`).transform(sanitize)).max(PROXY_FIELD_LIMITS.MAX_TAGS_COUNT, `Maximum ${PROXY_FIELD_LIMITS.MAX_TAGS_COUNT} tags allowed`).optional(),
});

export const ProxyIdSchema = z.string().uuid('Proxy ID must be a valid UUID format (e.g., 123e4567-e89b-12d3-a456-426614174000)');

/** Rotation configuration constraints */
const ROTATION_LIMITS = {
  MAX_INTERVAL_MS: 3600000, // 1 hour in milliseconds
  MIN_FAILURES: 1,
  MAX_FAILURES: 100,
} as const;

/** Available rotation strategies */
const VALID_ROTATION_STRATEGIES = ['round-robin', 'random', 'least-used', 'fastest', 'failure-aware'] as const;

export const RotationConfigSchema = z.object({
  strategy: z.enum(VALID_ROTATION_STRATEGIES, {
    errorMap: () => ({ message: `Rotation strategy must be one of: ${VALID_ROTATION_STRATEGIES.join(', ')}` })
  }),
  interval: z.number()
    .int('Rotation interval must be a whole number')
    .min(0, 'Rotation interval cannot be negative')
    .max(ROTATION_LIMITS.MAX_INTERVAL_MS, `Rotation interval must not exceed ${ROTATION_LIMITS.MAX_INTERVAL_MS}ms (1 hour)`)
    .optional(),
  maxFailures: z.number()
    .int('Max failures must be a whole number')
    .min(ROTATION_LIMITS.MIN_FAILURES, `Max failures must be at least ${ROTATION_LIMITS.MIN_FAILURES}`)
    .max(ROTATION_LIMITS.MAX_FAILURES, `Max failures must not exceed ${ROTATION_LIMITS.MAX_FAILURES}`)
    .optional(),
}).strict();

// ============================================================================
// TAB VALIDATION SCHEMAS
// ============================================================================

/** URL validation constraints */
const URL_LIMITS = {
  MAX_LENGTH: 2048,
} as const;

/** Allowed URL protocols for navigation */
const ALLOWED_URL_PROTOCOLS = ['http:', 'https:'] as const;

/**
 * Check if URL is a valid relative path
 */
function isValidRelativeUrl(url: string): boolean {
  return url.startsWith('/') || url.startsWith('./');
}

/**
 * Check if URL protocol is allowed
 */
function hasAllowedProtocol(parsedUrl: URL): boolean {
  return ALLOWED_URL_PROTOCOLS.includes(parsedUrl.protocol as typeof ALLOWED_URL_PROTOCOLS[number]);
}

/**
 * Check if URL contains embedded credentials
 */
function hasEmbeddedCredentials(parsedUrl: URL): boolean {
  return Boolean(parsedUrl.username || parsedUrl.password);
}

/**
 * Safe URL schema with SSRF protection
 */
export const SafeUrlSchema = z.string()
  .max(URL_LIMITS.MAX_LENGTH, `URL must not exceed ${URL_LIMITS.MAX_LENGTH} characters`)
  .transform(sanitize)
  .refine(
    (url) => {
      if (!url) { return true; }
      
      try {
        const parsedUrl = new URL(url);
        
        if (!hasAllowedProtocol(parsedUrl)) {
          return false;
        }
        
        if (isPrivateOrBlockedIP(parsedUrl.hostname)) {
          return false;
        }
        
        if (hasEmbeddedCredentials(parsedUrl)) {
          return false;
        }
        
        return true;
      } catch {
        // URL parsing failed - allow relative URLs
        return isValidRelativeUrl(url);
      }
    },
    { message: 'URL must be a valid HTTP/HTTPS URL. Private IPs, credentials in URL, and non-HTTP protocols are not allowed.' }
  );

/** Tab field constraints */
const TAB_FIELD_LIMITS = {
  TITLE_MAX_LENGTH: 500,
} as const;

export const TabConfigSchema = z.object({
  url: SafeUrlSchema.optional(),
  title: z.string().max(TAB_FIELD_LIMITS.TITLE_MAX_LENGTH, `Tab title must not exceed ${TAB_FIELD_LIMITS.TITLE_MAX_LENGTH} characters`).transform(sanitize).optional(),
  proxyId: z.string().uuid('Proxy ID must be a valid UUID format').optional(),
}).strict();

export const TabIdSchema = z.string().uuid('Tab ID must be a valid UUID format (e.g., 123e4567-e89b-12d3-a456-426614174000)');

export const TabUpdateSchema = z.object({
  title: z.string().max(TAB_FIELD_LIMITS.TITLE_MAX_LENGTH, `Tab title must not exceed ${TAB_FIELD_LIMITS.TITLE_MAX_LENGTH} characters`).transform(sanitize).optional(),
  url: SafeUrlSchema.optional(),
  active: z.boolean({ invalid_type_error: 'Active state must be a boolean (true or false)' }).optional(),
}).strict();

export const NavigationSchema = z.object({
  tabId: z.string().uuid('Tab ID must be a valid UUID format'),
  url: SafeUrlSchema,
}).strict();

// ============================================================================
// AUTOMATION VALIDATION SCHEMAS
// ============================================================================

/** Automation field constraints */
const AUTOMATION_FIELD_LIMITS = {
  KEYWORD_MIN_LENGTH: 1,
  KEYWORD_MAX_LENGTH: 200,
  DOMAIN_MAX_LENGTH: 255,
  PATTERN_MAX_LENGTH: 200,
} as const;

/** Valid domain name pattern */
const VALID_DOMAIN_PATTERN = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/;

/** Patterns that could cause ReDoS (Regular Expression Denial of Service) */
const REDOS_VULNERABILITY_PATTERNS = [/\(\.\*\)\+/, /\(\.\+\)\+/, /\([^)]+\+\)\+/];

/**
 * Check if a regex pattern could cause ReDoS vulnerability
 */
function couldCauseReDoS(pattern: string): boolean {
  return REDOS_VULNERABILITY_PATTERNS.some(vulnerablePattern => vulnerablePattern.test(pattern));
}

/**
 * Check if a string is a valid regex pattern
 */
function isValidRegexPattern(pattern: string): boolean {
  try {
    new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
}

export const KeywordSchema = z.string()
  .min(AUTOMATION_FIELD_LIMITS.KEYWORD_MIN_LENGTH, 'Search keyword is required - please provide at least one keyword')
  .max(AUTOMATION_FIELD_LIMITS.KEYWORD_MAX_LENGTH, `Search keyword must not exceed ${AUTOMATION_FIELD_LIMITS.KEYWORD_MAX_LENGTH} characters`)
  .transform(sanitize)
  .refine(
    (keyword) => !hasXSSPatterns(keyword),
    { message: 'Search keyword contains potentially dangerous patterns that are not allowed' }
  );

export const DomainSchema = z.string()
  .min(1, 'Target domain is required - please provide a domain name (e.g., example.com)')
  .max(AUTOMATION_FIELD_LIMITS.DOMAIN_MAX_LENGTH, `Domain name must not exceed ${AUTOMATION_FIELD_LIMITS.DOMAIN_MAX_LENGTH} characters`)
  .transform(sanitize)
  .transform(domain => domain.toLowerCase())
  .refine(
    (domain) => VALID_DOMAIN_PATTERN.test(domain),
    { message: 'Domain must be a valid format (e.g., example.com or sub.example.com). No protocols or paths allowed.' }
  );

export const DomainPatternSchema = z.string()
  .max(AUTOMATION_FIELD_LIMITS.PATTERN_MAX_LENGTH, `Domain pattern must not exceed ${AUTOMATION_FIELD_LIMITS.PATTERN_MAX_LENGTH} characters`)
  .transform(sanitize)
  .refine(
    (pattern) => {
      if (!pattern) { return true; }
      return !couldCauseReDoS(pattern);
    },
    { message: 'Domain pattern contains patterns that could cause performance issues (ReDoS vulnerability)' }
  )
  .refine(
    (pattern) => {
      if (!pattern) { return true; }
      return isValidRegexPattern(pattern);
    },
    { message: 'Domain pattern must be a valid regular expression' }
  )
  .optional();

/** Automation configuration constraints */
const AUTOMATION_CONFIG_LIMITS = {
  MAX_KEYWORDS: 100,
  MAX_TARGET_DOMAINS: 50,
  MAX_RETRIES: 10,
  MIN_DELAY_MS: 1000,
  MAX_DELAY_MS: 60000,
  DEFAULT_DELAY_MS: 3000,
  DEFAULT_RETRIES: 3,
  MAX_RESULTS: 100,
} as const;

/** Supported search engines */
const SUPPORTED_SEARCH_ENGINES = ['google', 'bing', 'duckduckgo', 'yahoo', 'brave'] as const;

export const AutomationConfigSchema = z.object({
  keywords: z.array(KeywordSchema)
    .max(AUTOMATION_CONFIG_LIMITS.MAX_KEYWORDS, `Maximum ${AUTOMATION_CONFIG_LIMITS.MAX_KEYWORDS} keywords allowed per automation session`)
    .default([]),
  engine: z.enum(SUPPORTED_SEARCH_ENGINES, {
    errorMap: () => ({ message: `Search engine must be one of: ${SUPPORTED_SEARCH_ENGINES.join(', ')}` })
  }).default('google'),
  targetDomains: z.array(DomainSchema)
    .max(AUTOMATION_CONFIG_LIMITS.MAX_TARGET_DOMAINS, `Maximum ${AUTOMATION_CONFIG_LIMITS.MAX_TARGET_DOMAINS} target domains allowed`)
    .default([]),
  maxRetries: z.number()
    .int('Max retries must be a whole number')
    .min(0, 'Max retries cannot be negative')
    .max(AUTOMATION_CONFIG_LIMITS.MAX_RETRIES, `Max retries must not exceed ${AUTOMATION_CONFIG_LIMITS.MAX_RETRIES}`)
    .default(AUTOMATION_CONFIG_LIMITS.DEFAULT_RETRIES),
  delayBetweenSearches: z.number()
    .int('Delay must be a whole number in milliseconds')
    .min(AUTOMATION_CONFIG_LIMITS.MIN_DELAY_MS, `Delay must be at least ${AUTOMATION_CONFIG_LIMITS.MIN_DELAY_MS}ms (1 second) to avoid rate limiting`)
    .max(AUTOMATION_CONFIG_LIMITS.MAX_DELAY_MS, `Delay must not exceed ${AUTOMATION_CONFIG_LIMITS.MAX_DELAY_MS}ms (60 seconds)`)
    .default(AUTOMATION_CONFIG_LIMITS.DEFAULT_DELAY_MS),
  useRandomProxy: z.boolean({ invalid_type_error: 'useRandomProxy must be true or false' }).default(false),
  clickThrough: z.boolean({ invalid_type_error: 'clickThrough must be true or false' }).default(true),
  simulateHumanBehavior: z.boolean({ invalid_type_error: 'simulateHumanBehavior must be true or false' }).default(true),
  // Legacy fields for backward compatibility
  searchEngine: z.enum(SUPPORTED_SEARCH_ENGINES).optional(),
  maxResults: z.number()
    .int('Max results must be a whole number')
    .min(1, 'Max results must be at least 1')
    .max(AUTOMATION_CONFIG_LIMITS.MAX_RESULTS, `Max results must not exceed ${AUTOMATION_CONFIG_LIMITS.MAX_RESULTS}`)
    .optional(),
  delayMs: z.number()
    .int('Delay must be a whole number in milliseconds')
    .min(AUTOMATION_CONFIG_LIMITS.MIN_DELAY_MS)
    .max(AUTOMATION_CONFIG_LIMITS.MAX_DELAY_MS)
    .optional(),
});

export const SessionIdSchema = z.string().uuid('Session ID must be a valid UUID format (e.g., 123e4567-e89b-12d3-a456-426614174000)');

// ============================================================================
// PRIVACY VALIDATION SCHEMAS
// ============================================================================

/** Privacy field constraints */
const PRIVACY_FIELD_LIMITS = {
  LANGUAGE_CODE_MAX_LENGTH: 10,
  TIMEZONE_MAX_LENGTH: 100,
} as const;

/** Valid language code pattern (e.g., en, en-US) */
const LANGUAGE_CODE_PATTERN = /^[a-z]{2}(-[A-Z]{2})?$/;

/**
 * Check if a timezone string is valid using Intl API
 */
function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

export const LanguageCodeSchema = z.string()
  .max(PRIVACY_FIELD_LIMITS.LANGUAGE_CODE_MAX_LENGTH, `Language code must not exceed ${PRIVACY_FIELD_LIMITS.LANGUAGE_CODE_MAX_LENGTH} characters`)
  .regex(LANGUAGE_CODE_PATTERN, 'Language code must be in format: xx or xx-XX (e.g., en or en-US)');

export const TimezoneSchema = z.string()
  .max(PRIVACY_FIELD_LIMITS.TIMEZONE_MAX_LENGTH, `Timezone must not exceed ${PRIVACY_FIELD_LIMITS.TIMEZONE_MAX_LENGTH} characters`)
  .transform(sanitize)
  .refine(
    isValidTimezone,
    { message: 'Timezone must be a valid IANA timezone identifier (e.g., America/New_York, Europe/London, Asia/Tokyo)' }
  );

/** Screen resolution constraints */
const SCREEN_RESOLUTION_LIMITS = {
  MIN_WIDTH: 320,
  MAX_WIDTH: 7680,  // 8K resolution
  MIN_HEIGHT: 240,
  MAX_HEIGHT: 4320, // 8K resolution
} as const;

/** Hardware spoofing constraints */
const HARDWARE_SPOOF_LIMITS = {
  MIN_CPU_CORES: 1,
  MAX_CPU_CORES: 32,
  MIN_DEVICE_MEMORY_GB: 1,
  MAX_DEVICE_MEMORY_GB: 64,
  USER_AGENT_MAX_LENGTH: 500,
} as const;

/** Supported platform values for navigator spoofing */
const SUPPORTED_PLATFORMS = ['Win32', 'MacIntel', 'Linux x86_64'] as const;

export const FingerprintConfigSchema = z.object({
  canvas: z.boolean({ invalid_type_error: 'Canvas spoofing must be true or false' }).default(true),
  webgl: z.boolean({ invalid_type_error: 'WebGL spoofing must be true or false' }).default(true),
  audio: z.boolean({ invalid_type_error: 'Audio spoofing must be true or false' }).default(true),
  navigator: z.boolean({ invalid_type_error: 'Navigator spoofing must be true or false' }).default(true),
  webrtc: z.boolean({ invalid_type_error: 'WebRTC protection must be true or false' }).default(true),
  trackerBlocking: z.boolean({ invalid_type_error: 'Tracker blocking must be true or false' }).default(true),
  timezone: TimezoneSchema.optional(),
  language: LanguageCodeSchema.optional(),
  screen: z.object({
    width: z.number()
      .int('Screen width must be a whole number')
      .min(SCREEN_RESOLUTION_LIMITS.MIN_WIDTH, `Screen width must be at least ${SCREEN_RESOLUTION_LIMITS.MIN_WIDTH}px`)
      .max(SCREEN_RESOLUTION_LIMITS.MAX_WIDTH, `Screen width must not exceed ${SCREEN_RESOLUTION_LIMITS.MAX_WIDTH}px`)
      .optional(),
    height: z.number()
      .int('Screen height must be a whole number')
      .min(SCREEN_RESOLUTION_LIMITS.MIN_HEIGHT, `Screen height must be at least ${SCREEN_RESOLUTION_LIMITS.MIN_HEIGHT}px`)
      .max(SCREEN_RESOLUTION_LIMITS.MAX_HEIGHT, `Screen height must not exceed ${SCREEN_RESOLUTION_LIMITS.MAX_HEIGHT}px`)
      .optional(),
  }).optional(),
  // Navigator spoofing
  userAgent: z.string()
    .max(HARDWARE_SPOOF_LIMITS.USER_AGENT_MAX_LENGTH, `User agent must not exceed ${HARDWARE_SPOOF_LIMITS.USER_AGENT_MAX_LENGTH} characters`)
    .transform(sanitize)
    .optional(),
  platform: z.enum(SUPPORTED_PLATFORMS, {
    errorMap: () => ({ message: `Platform must be one of: ${SUPPORTED_PLATFORMS.join(', ')}` })
  }).optional(),
  hardwareConcurrency: z.number()
    .int('Hardware concurrency (CPU cores) must be a whole number')
    .min(HARDWARE_SPOOF_LIMITS.MIN_CPU_CORES, `CPU cores must be at least ${HARDWARE_SPOOF_LIMITS.MIN_CPU_CORES}`)
    .max(HARDWARE_SPOOF_LIMITS.MAX_CPU_CORES, `CPU cores must not exceed ${HARDWARE_SPOOF_LIMITS.MAX_CPU_CORES}`)
    .optional(),
  deviceMemory: z.number()
    .min(HARDWARE_SPOOF_LIMITS.MIN_DEVICE_MEMORY_GB, `Device memory must be at least ${HARDWARE_SPOOF_LIMITS.MIN_DEVICE_MEMORY_GB}GB`)
    .max(HARDWARE_SPOOF_LIMITS.MAX_DEVICE_MEMORY_GB, `Device memory must not exceed ${HARDWARE_SPOOF_LIMITS.MAX_DEVICE_MEMORY_GB}GB`)
    .optional(),
});

export const WebRTCToggleSchema = z.boolean({
  required_error: 'WebRTC toggle value is required',
  invalid_type_error: 'WebRTC toggle must be true (enabled) or false (disabled)'
});

export const TrackerBlockingToggleSchema = z.boolean({
  required_error: 'Tracker blocking toggle value is required',
  invalid_type_error: 'Tracker blocking toggle must be true (enabled) or false (disabled)'
});

// ============================================================================
// SESSION VALIDATION SCHEMAS
// ============================================================================

/** Session field constraints */
const SESSION_FIELD_LIMITS = {
  NAME_MIN_LENGTH: 1,
  NAME_MAX_LENGTH: 100,
} as const;

/** Valid characters for session names (alphanumeric, spaces, underscores, hyphens) */
const VALID_SESSION_NAME_PATTERN = /^[a-zA-Z0-9\s_-]+$/;

export const SessionNameSchema = z.string()
  .min(SESSION_FIELD_LIMITS.NAME_MIN_LENGTH, 'Session name is required - please provide a descriptive name')
  .max(SESSION_FIELD_LIMITS.NAME_MAX_LENGTH, `Session name must not exceed ${SESSION_FIELD_LIMITS.NAME_MAX_LENGTH} characters`)
  .transform(sanitize)
  .refine(
    (name) => VALID_SESSION_NAME_PATTERN.test(name),
    { message: 'Session name can only contain letters, numbers, spaces, underscores, and hyphens' }
  );

export const SessionLoadIdSchema = z.string().uuid('Session ID must be a valid UUID format for loading saved sessions');

// ============================================================================
// TAB PROXY ASSIGNMENT SCHEMAS
// ============================================================================

export const TabAssignProxySchema = z.object({
  tabId: z.string().uuid('Tab ID must be a valid UUID format'),
  proxyId: z.string().uuid('Proxy ID must be a valid UUID format').nullable(),
}).strict();

// ============================================================================
// PRIVACY STATS SCHEMAS
// ============================================================================

export const PrivacyStatsRequestSchema = z.object({
  tabId: z.string().uuid('Tab ID must be a valid UUID format for per-tab statistics').optional(),
}).strict().optional();

// ============================================================================
// AUTOMATION SCHEDULING SCHEMAS
// ============================================================================

/** Schedule interval constraints */
const SCHEDULE_LIMITS = {
  MIN_INTERVAL_MS: 1000,      // 1 second minimum
  MAX_INTERVAL_MS: 86400000,  // 24 hours maximum
  CRON_MAX_LENGTH: 100,
  CRON_FIELD_COUNT: 5,
  DAYS_OF_WEEK_MIN: 0,        // Sunday
  DAYS_OF_WEEK_MAX: 6,        // Saturday
  MAX_DAYS_SELECTED: 7,
} as const;

/** Available schedule types */
const SCHEDULE_TYPES = ['one-time', 'recurring', 'continuous', 'custom'] as const;

/**
 * Check if cron expression has valid structure (5 fields)
 */
function hasValidCronStructure(cronExpression: string): boolean {
  const fields = cronExpression.trim().split(/\s+/);
  return fields.length === SCHEDULE_LIMITS.CRON_FIELD_COUNT;
}

/**
 * Check if schedule has required fields based on type
 */
function hasRequiredFieldsForScheduleType(data: { 
  type: string; 
  startTime?: string; 
  interval?: number; 
  cronExpression?: string 
}): boolean {
  switch (data.type) {
    case 'one-time':
      return Boolean(data.startTime);
    case 'recurring':
      return Boolean(data.interval);
    case 'custom':
      return Boolean(data.cronExpression);
    default:
      return true;
  }
}

/**
 * Check if start time is in the future
 */
function isStartTimeInFuture(startTime: string): boolean {
  const startDate = new Date(startTime);
  return startDate.getTime() > Date.now();
}

export const ScheduleTypeSchema = z.enum(SCHEDULE_TYPES, {
  errorMap: () => ({ message: `Schedule type must be one of: ${SCHEDULE_TYPES.join(', ')}` })
});

export const ScheduleConfigSchema = z.object({
  type: ScheduleTypeSchema,
  startTime: z.string().datetime('Start time must be a valid ISO 8601 datetime string').optional(),
  endTime: z.string().datetime('End time must be a valid ISO 8601 datetime string').optional(),
  interval: z.number()
    .int('Interval must be a whole number in milliseconds')
    .min(SCHEDULE_LIMITS.MIN_INTERVAL_MS, `Interval must be at least ${SCHEDULE_LIMITS.MIN_INTERVAL_MS}ms (1 second)`)
    .max(SCHEDULE_LIMITS.MAX_INTERVAL_MS, `Interval must not exceed ${SCHEDULE_LIMITS.MAX_INTERVAL_MS}ms (24 hours)`)
    .optional(),
  daysOfWeek: z.array(
    z.number()
      .int('Day of week must be a whole number')
      .min(SCHEDULE_LIMITS.DAYS_OF_WEEK_MIN, 'Day of week must be 0 (Sunday) through 6 (Saturday)')
      .max(SCHEDULE_LIMITS.DAYS_OF_WEEK_MAX, 'Day of week must be 0 (Sunday) through 6 (Saturday)')
  ).max(SCHEDULE_LIMITS.MAX_DAYS_SELECTED, 'Cannot select more than 7 days').optional(),
  cronExpression: z.string()
    .max(SCHEDULE_LIMITS.CRON_MAX_LENGTH, `Cron expression must not exceed ${SCHEDULE_LIMITS.CRON_MAX_LENGTH} characters`)
    .transform(sanitize)
    .refine(
      (cron) => {
        if (!cron) { return true; }
        return hasValidCronStructure(cron);
      },
      { message: 'Cron expression must have exactly 5 fields: minute hour day-of-month month day-of-week (e.g., "0 9 * * 1-5")' }
    )
    .refine(
      (cron) => {
        if (!cron) { return true; }
        return !couldCauseReDoS(cron);
      },
      { message: 'Cron expression contains patterns that could cause performance issues' }
    )
    .optional(),
  task: AutomationConfigSchema,
}).strict().refine(
  hasRequiredFieldsForScheduleType,
  { message: 'Missing required fields: one-time schedules require startTime, recurring schedules require interval, custom schedules require cronExpression' }
).refine(
  (data) => {
    if (data.type === 'one-time' && data.startTime) {
      return isStartTimeInFuture(data.startTime);
    }
    return true;
  },
  { message: 'Start time must be in the future for one-time schedules' }
);

// ============================================================================
// VALIDATION HELPER
// ============================================================================

/**
 * Validate input against schema and return result
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  input: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(input);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  // Handle different Zod versions - some have .errors array, some have .issues
  let errorMessages = 'Validation failed';
  
  /** Zod validation issue structure */
  interface ZodIssue {
    path?: (string | number)[];
    message: string;
  }
  
  /** Zod error-like structure compatible with multiple versions */
  interface ZodErrorLike {
    issues?: ZodIssue[];
    errors?: ZodIssue[];
    message?: string;
  }
  
  try {
    const zodError = result.error as ZodErrorLike;
    if (zodError && typeof zodError === 'object') {
      // Try to get issues/errors array
      const issues = zodError.issues || zodError.errors;
      if (Array.isArray(issues)) {
        errorMessages = issues
          .map((e: ZodIssue) => `${e.path?.length ? e.path.join('.') + ': ' : ''}${e.message}`)
          .join(', ');
      } else if (zodError.message) {
        // Try to parse the message as JSON (newer Zod versions)
        try {
          const parsed = JSON.parse(zodError.message) as ZodIssue[];
          if (Array.isArray(parsed)) {
            errorMessages = parsed
              .map((e: ZodIssue) => `${e.path?.length ? e.path.join('.') + ': ' : ''}${e.message}`)
              .join(', ');
          }
        } catch (parseError) {
          // JSON parse of error message failed - use raw message
          console.debug('[IPC Validation] Failed to parse Zod error JSON:', 
            parseError instanceof Error ? parseError.message : 'Parse error');
          errorMessages = zodError.message;
        }
      }
    }
  } catch (extractError) {
    // Failed to extract error details - use fallback message
    console.debug('[IPC Validation] Failed to extract validation error details:',
      extractError instanceof Error ? extractError.message : 'Unknown error');
  }
  
  return { success: false, error: errorMessages };
}

/**
 * Create a validated IPC handler wrapper
 */
export function createValidatedHandler<TInput, TOutput>(
  schema: z.ZodSchema<TInput>,
  handler: (data: TInput) => Promise<TOutput>
): (input: unknown) => Promise<{ success: boolean; data?: TOutput; error?: string }> {
  return async (input: unknown) => {
    const validation = validateInput(schema, input);
    if (!validation.success) {
      console.warn('[IPC Validation] Invalid input:', validation.error);
      return { success: false, error: validation.error };
    }
    try {
      // Type assertion is safe here because we checked success above
      const validData = (validation as { success: true; data: TInput }).data;
      const result = await handler(validData);
      return { success: true, data: result };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown handler error';
      console.error('[IPC Validation] Handler execution failed:', errorMessage);
      return { success: false, error: errorMessage };
    }
  };
}

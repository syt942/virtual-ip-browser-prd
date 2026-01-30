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
  
  if (blockedHosts.includes(hostname.toLowerCase())) return true;
  
  // Check for IP addresses
  const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipPattern.test(hostname)) {
    const octets = hostname.split('.').map(Number);
    if (octets.some(o => o < 0 || o > 255)) return true;
    
    // 10.x.x.x, 172.16-31.x.x, 192.168.x.x, 127.x.x.x, 0.x.x.x
    if (octets[0] === 10) return true;
    if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return true;
    if (octets[0] === 192 && octets[1] === 168) return true;
    if (octets[0] === 127) return true;
    if (octets[0] === 0) return true;
    if (octets[0] === 169 && octets[1] === 254) return true;
  }
  
  return false;
}

// ============================================================================
// PROXY VALIDATION SCHEMAS
// ============================================================================

export const ProxyConfigSchema = z.object({
  host: z.string()
    .min(1, 'Host is required')
    .max(255, 'Host too long')
    .transform(sanitize)
    .refine(
      (host) => /^[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?$/.test(host),
      { message: 'Invalid host format' }
    )
    .refine(
      (host) => !hasXSSPatterns(host),
      { message: 'Host contains invalid characters' }
    ),
  port: z.number().int().min(1).max(65535),
  protocol: z.enum(['http', 'https', 'socks4', 'socks5']),
  username: z.string().max(255).transform(sanitize).optional(),
  password: z.string().max(255).transform(sanitize).optional(),
  name: z.string().max(100).transform(sanitize).default(''),
  region: z.string().max(100).transform(sanitize).optional(),
  tags: z.array(z.string().max(50).transform(sanitize)).max(20).optional(),
});

export const ProxyIdSchema = z.string().uuid('Invalid proxy ID');

export const RotationConfigSchema = z.object({
  strategy: z.enum(['round-robin', 'random', 'least-used', 'fastest', 'failure-aware']),
  interval: z.number().int().min(0).max(3600000).optional(), // Max 1 hour
  maxFailures: z.number().int().min(1).max(100).optional(),
}).strict();

// ============================================================================
// TAB VALIDATION SCHEMAS
// ============================================================================

/**
 * Safe URL schema with SSRF protection
 */
export const SafeUrlSchema = z.string()
  .max(2048, 'URL too long')
  .transform(sanitize)
  .refine(
    (url) => {
      if (!url) return true;
      
      try {
        const parsed = new URL(url);
        
        // Only allow http/https
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          return false;
        }
        
        // Block private IPs and metadata endpoints
        if (isPrivateOrBlockedIP(parsed.hostname)) {
          return false;
        }
        
        // Block credentials in URL
        if (parsed.username || parsed.password) {
          return false;
        }
        
        return true;
      } catch (error) {
        // URL parsing failed - allow relative URLs but log for debugging
        // This is expected for relative paths like "/page" or "./resource"
        const isRelativeUrl = url.startsWith('/') || url.startsWith('./');
        if (!isRelativeUrl) {
          console.debug('[IPC Validation] URL parse failed, not a relative URL:', 
            url.substring(0, 50), error instanceof Error ? error.message : 'Parse error');
        }
        return isRelativeUrl;
      }
    },
    { message: 'Invalid or blocked URL' }
  );

export const TabConfigSchema = z.object({
  url: SafeUrlSchema.optional(),
  title: z.string().max(500).transform(sanitize).optional(),
  proxyId: z.string().uuid().optional(),
}).strict();

export const TabIdSchema = z.string().uuid('Invalid tab ID');

export const TabUpdateSchema = z.object({
  title: z.string().max(500).transform(sanitize).optional(),
  url: SafeUrlSchema.optional(),
  active: z.boolean().optional(),
}).strict();

export const NavigationSchema = z.object({
  tabId: z.string().uuid('Invalid tab ID'),
  url: SafeUrlSchema,
}).strict();

// ============================================================================
// AUTOMATION VALIDATION SCHEMAS
// ============================================================================

export const KeywordSchema = z.string()
  .min(1, 'Keyword required')
  .max(200, 'Keyword too long')
  .transform(sanitize)
  .refine(
    (kw) => !hasXSSPatterns(kw),
    { message: 'Keyword contains invalid patterns' }
  );

export const DomainSchema = z.string()
  .min(1, 'Domain required')
  .max(255, 'Domain too long')
  .transform(sanitize)
  .transform(v => v.toLowerCase())
  .refine(
    (d) => /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/.test(d),
    { message: 'Invalid domain format' }
  );

export const DomainPatternSchema = z.string()
  .max(200, 'Pattern too long')
  .transform(sanitize)
  .refine(
    (pattern) => {
      if (!pattern) return true;
      // Check for ReDoS patterns
      const redosPatterns = [/\(\.\*\)\+/, /\(\.\+\)\+/, /\([^)]+\+\)\+/];
      return !redosPatterns.some(p => p.test(pattern));
    },
    { message: 'Pattern may cause ReDoS' }
  )
  .refine(
    (pattern) => {
      if (!pattern) return true;
      try { 
        new RegExp(pattern); 
        return true; 
      } catch (error) { 
        // Invalid regex pattern - log for debugging
        console.debug('[IPC Validation] Invalid regex pattern:', pattern,
          error instanceof Error ? error.message : 'Invalid regex');
        return false; 
      }
    },
    { message: 'Invalid regex pattern' }
  )
  .optional();

export const AutomationConfigSchema = z.object({
  keywords: z.array(KeywordSchema).max(100).default([]),
  engine: z.enum(['google', 'bing', 'duckduckgo', 'yahoo', 'brave']).default('google'),
  targetDomains: z.array(DomainSchema).max(50).default([]),
  maxRetries: z.number().int().min(0).max(10).default(3),
  delayBetweenSearches: z.number().int().min(1000).max(60000).default(3000),
  useRandomProxy: z.boolean().default(false),
  clickThrough: z.boolean().default(true),
  simulateHumanBehavior: z.boolean().default(true),
  // Legacy fields for backward compatibility
  searchEngine: z.enum(['google', 'bing', 'duckduckgo', 'yahoo', 'brave']).optional(),
  maxResults: z.number().int().min(1).max(100).optional(),
  delayMs: z.number().int().min(1000).max(60000).optional(),
});

export const SessionIdSchema = z.string().uuid('Invalid session ID');

// ============================================================================
// PRIVACY VALIDATION SCHEMAS
// ============================================================================

export const LanguageCodeSchema = z.string()
  .max(10)
  .regex(/^[a-z]{2}(-[A-Z]{2})?$/, 'Invalid language code (e.g., en-US)');

export const TimezoneSchema = z.string()
  .max(100)
  .transform(sanitize)
  .refine(
    (tz) => {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: tz });
        return true;
      } catch (error) { 
        // Invalid timezone - Intl.DateTimeFormat threw an error
        console.debug('[IPC Validation] Invalid timezone:', tz,
          error instanceof Error ? error.message : 'Invalid timezone');
        return false; 
      }
    },
    { message: 'Invalid timezone' }
  );

export const FingerprintConfigSchema = z.object({
  canvas: z.boolean().default(true),
  webgl: z.boolean().default(true),
  audio: z.boolean().default(true),
  navigator: z.boolean().default(true),
  webrtc: z.boolean().default(true),
  trackerBlocking: z.boolean().default(true),
  timezone: TimezoneSchema.optional(),
  language: LanguageCodeSchema.optional(),
  screen: z.object({
    width: z.number().int().min(320).max(7680).optional(),
    height: z.number().int().min(240).max(4320).optional(),
  }).optional(),
  // Navigator spoofing
  userAgent: z.string().max(500).transform(sanitize).optional(),
  platform: z.enum(['Win32', 'MacIntel', 'Linux x86_64']).optional(),
  hardwareConcurrency: z.number().int().min(1).max(32).optional(),
  deviceMemory: z.number().min(1).max(64).optional(),
});

export const WebRTCToggleSchema = z.boolean();

export const TrackerBlockingToggleSchema = z.boolean();

// ============================================================================
// SESSION VALIDATION SCHEMAS
// ============================================================================

export const SessionNameSchema = z.string()
  .min(1, 'Session name required')
  .max(100, 'Session name too long')
  .transform(sanitize)
  .refine(
    (name) => /^[a-zA-Z0-9\s_-]+$/.test(name),
    { message: 'Session name contains invalid characters' }
  );

export const SessionLoadIdSchema = z.string().uuid('Invalid session ID');

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

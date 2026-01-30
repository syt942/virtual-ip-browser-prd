/**
 * Security Utilities
 * Common security functions for input sanitization, CSP, and ReDoS protection
 */

// ============================================================================
// INPUT SANITIZATION
// ============================================================================

/**
 * Sanitize URL input
 */
export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  // Trim and normalize
  const trimmed = url.trim();

  // Check for dangerous protocols
  const dangerousProtocols = [
    'javascript:',
    'vbscript:',
    'data:',
    'file:',
    'about:',
  ];

  const lowerUrl = trimmed.toLowerCase();
  for (const proto of dangerousProtocols) {
    if (lowerUrl.startsWith(proto)) {
      throw new Error(`Dangerous protocol: ${proto}`);
    }
  }

  // Add https:// if no protocol
  if (!trimmed.match(/^https?:\/\//i)) {
    return 'https://' + trimmed;
  }

  return trimmed;
}

/**
 * Sanitize text input (keywords, domains, etc.)
 */
export function sanitizeTextInput(input: string, maxLength: number = 1000): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove null bytes
  let sanitized = input.replace(/\x00/g, '');

  // Trim
  sanitized = sanitized.trim();

  // Truncate
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  // Encode HTML entities for display
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');

  return sanitized;
}

/**
 * Sanitize domain input
 */
export function sanitizeDomain(domain: string): string {
  if (!domain || typeof domain !== 'string') {
    return '';
  }

  // Remove protocol if present
  let sanitized = domain.replace(/^https?:\/\//i, '');

  // Remove path and query
  sanitized = sanitized.split('/')[0].split('?')[0].split('#')[0];

  // Validate domain format
  if (!/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/.test(sanitized)) {
    throw new Error('Invalid domain format');
  }

  // Check length
  if (sanitized.length > 255) {
    throw new Error('Domain too long');
  }

  return sanitized.toLowerCase();
}

/**
 * Sanitize CSS selector to prevent injection
 */
export function sanitizeSelector(selector: string): string {
  // Check for null/undefined
  if (!selector || typeof selector !== 'string') {
    throw new Error('Invalid selector: must be a non-empty string');
  }

  // Length limit to prevent DoS
  if (selector.length > 500) {
    throw new Error('Selector too long');
  }

  // Check for null bytes
  if (selector.includes('\x00')) {
    throw new Error('Null byte detected in selector');
  }

  // Check for dangerous patterns
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /eval\s*\(/i,
    /expression\s*\(/i,
    /url\s*\(/i,
    /import\s*\(/i,
    /@import/i,
    /binding\s*:/i,
    /-moz-binding/i,
    /behavior\s*:/i,
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(selector)) {
      throw new Error(`Dangerous pattern detected in selector`);
    }
  }
  
  // Remove dangerous characters, allow CSS selector syntax
  const sanitized = selector.replace(/[^\w\s.\-#\[\]="':,>+~*()@]/g, '');
  
  // Check for quote escape attempts
  if ((sanitized.includes("'") && selector.includes("\\'")) ||
      (sanitized.includes('"') && selector.includes('\\"'))) {
    throw new Error('Quote escape detected in selector');
  }

  // Verify balanced brackets
  const openBrackets = (sanitized.match(/\[/g) || []).length;
  const closeBrackets = (sanitized.match(/\]/g) || []).length;
  if (openBrackets !== closeBrackets) {
    throw new Error('Unbalanced brackets in selector');
  }
  
  return sanitized;
}

// ============================================================================
// ReDoS PROTECTION
// ============================================================================

/**
 * Compile regex safely with ReDoS protection
 */
export function compileRegexSafely(pattern: string): RegExp {
  // Check pattern length
  if (pattern.length > 200) {
    throw new Error('Regex pattern too long');
  }

  // Check for known ReDoS patterns
  const redosPatterns = [
    // Nested quantifiers: (a+)+, (a*)+, (a+)*, etc.
    /\([^)]*[+*]\)[+*]/,
    // Quantified groups with braces: (a){2,}+
    /\([^)]*\)\{\d+,\d*\}[+*]/,
    // Repeated quantified groups: ([a-z]+)+
    /\(\[[^\]]*\][+*]\)[+*]/,
    // Quantified alternation: (a|b)+
    /\([^)]*\|[^)]*\)[+*]/,
    // Multiple wildcards that can overlap: (.*)+, (.*){2,}
    /\(\.\*\)[+*{]/,
    // Nested groups with quantifiers
    /\([^)]*\([^)]*[+*]\)[^)]*\)[+*]/,
  ];

  for (const redos of redosPatterns) {
    if (redos.test(pattern)) {
      throw new Error('Potential ReDoS pattern detected');
    }
  }

  // Attempt to compile
  try {
    return new RegExp(pattern);
  } catch (e) {
    throw new Error(`Invalid regex pattern: ${(e as Error).message}`);
  }
}

/**
 * Test regex with input length protection
 */
export function testRegexSafely(regex: RegExp, input: string, maxLength: number = 10000): boolean {
  // For very long inputs, reject immediately
  if (input.length > maxLength) {
    throw new Error('Input too long for regex matching');
  }

  return regex.test(input);
}

// ============================================================================
// CSP (CONTENT SECURITY POLICY)
// ============================================================================

export interface CSPOptions {
  nonce?: string;
  reportUri?: string;
  strict?: boolean;
}

/**
 * Generate Content Security Policy header
 */
export function generateCSP(options: CSPOptions = {}): string {
  const { nonce, reportUri, strict = true } = options;
  
  const directives: string[] = [];
  
  // Default source
  directives.push("default-src 'self'");
  
  // Script source
  if (nonce) {
    directives.push(`script-src 'self' 'nonce-${nonce}'`);
  } else if (strict) {
    directives.push("script-src 'self'");
  } else {
    directives.push("script-src 'self' 'unsafe-inline'");
  }
  
  // Style source (unsafe-inline often needed for CSS-in-JS)
  directives.push("style-src 'self' 'unsafe-inline'");
  
  // Image source
  directives.push("img-src 'self' data: https:");
  
  // Font source
  directives.push("font-src 'self' data:");
  
  // Connect source (for API calls)
  directives.push("connect-src 'self' https:");
  
  // Frame ancestors (clickjacking protection)
  directives.push("frame-ancestors 'none'");
  
  // Form action
  directives.push("form-action 'self'");
  
  // Base URI
  directives.push("base-uri 'self'");
  
  // Object source (block plugins)
  directives.push("object-src 'none'");
  
  // Upgrade insecure requests
  directives.push("upgrade-insecure-requests");
  
  // Block mixed content
  directives.push("block-all-mixed-content");
  
  // Report URI
  if (reportUri) {
    directives.push(`report-uri ${reportUri}`);
  }
  
  return directives.join('; ');
}

/**
 * Validate CSP header for common weaknesses
 */
export function validateCSP(csp: string): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Check for unsafe-eval
  if (csp.includes("'unsafe-eval'")) {
    issues.push("Contains 'unsafe-eval' which allows eval()");
  }
  
  // Check for wildcard sources
  if (/\*(?!\.)/.test(csp) || csp.includes('* ')) {
    issues.push("Contains wildcard source");
  }
  
  // Check for data: in script-src
  if (/script-src[^;]*data:/.test(csp)) {
    issues.push("script-src allows data: URIs");
  }
  
  // Check for missing frame-ancestors
  if (!csp.includes('frame-ancestors')) {
    issues.push("Missing frame-ancestors directive");
  }
  
  // Check for missing object-src
  if (!csp.includes('object-src')) {
    issues.push("Missing object-src directive");
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
}

/**
 * Generate a cryptographically secure nonce for CSP
 */
export function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// ============================================================================
// IPC CHANNEL WHITELIST
// ============================================================================

/**
 * Whitelist of allowed IPC invoke channels
 */
export const IPC_INVOKE_WHITELIST = new Set([
  'proxy:add',
  'proxy:remove',
  'proxy:update',
  'proxy:list',
  'proxy:validate',
  'proxy:set-rotation',
  'tab:create',
  'tab:close',
  'tab:update',
  'tab:list',
  'tab:navigate',
  'tab:go-back',
  'tab:go-forward',
  'tab:reload',
  'privacy:set-fingerprint',
  'privacy:toggle-webrtc',
  'privacy:toggle-tracker-blocking',
  'automation:start-search',
  'automation:stop-search',
  'automation:add-keyword',
  'automation:add-domain',
  'automation:get-tasks',
  'session:save',
  'session:load',
  'session:list',
]);

/**
 * Whitelist of allowed IPC event channels
 */
export const IPC_EVENT_WHITELIST = new Set([
  'proxy:updated',
  'proxy:validated',
  'tab:created',
  'tab:closed',
  'tab:updated',
  'automation:task:completed',
  'automation:task:failed',
  'automation:session:updated',
  'privacy:updated',
  'session:saved',
  'session:loaded',
]);

/**
 * Check if an IPC channel is allowed
 */
export function isChannelAllowed(channel: string, type: 'invoke' | 'event'): boolean {
  const whitelist = type === 'invoke' ? IPC_INVOKE_WHITELIST : IPC_EVENT_WHITELIST;
  return whitelist.has(channel);
}

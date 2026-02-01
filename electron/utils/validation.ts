/**
 * Centralized Validation Utilities for Main Process
 * 
 * SECURITY: This module provides validation functions for all IPC inputs
 * and automation operations. All user inputs should pass through these
 * validators before processing.
 */

import { z } from 'zod';

// ============================================================================
// SECURITY CONSTANTS
// ============================================================================

/**
 * Maximum lengths for various inputs to prevent DoS
 */
export const MAX_LENGTHS = {
  KEYWORD: 200,
  DOMAIN: 255,
  URL: 2048,
  SELECTOR: 500,
  REGEX_PATTERN: 200,
  SESSION_NAME: 100,
  PROXY_NAME: 100,
  TAG: 50,
  USERNAME: 255,
  PASSWORD: 255,
} as const;

/**
 * Maximum queue/collection sizes to prevent memory exhaustion
 */
export const MAX_SIZES = {
  KEYWORDS_QUEUE: 10000,
  TARGET_DOMAINS: 500,
  SEARCH_RESULTS: 100,
  PROXY_LIST: 1000,
  TAGS: 20,
  CONCURRENT_TABS: 50,
  BATCH_IMPORT: 500,
} as const;

/**
 * Timeout limits in milliseconds
 */
export const TIMEOUTS = {
  OPERATION_DEFAULT: 30000,
  OPERATION_MAX: 120000,
  PAGE_LOAD: 60000,
  SCRIPT_EXECUTION: 10000,
} as const;

// ============================================================================
// XSS & INJECTION DETECTION PATTERNS
// ============================================================================

/**
 * Dangerous patterns that indicate XSS/injection attempts
 */
const XSS_PATTERNS = [
  /<script/i,
  /javascript:/i,
  /on\w+\s*=/i,
  /data:text\/html/i,
  /vbscript:/i,
  /expression\s*\(/i,
  /eval\s*\(/i,
  /import\s*\(/i,
  /@import/i,
  /url\s*\(/i,
  /binding\s*:/i,
  /-moz-binding/i,
  /behavior\s*:/i,
];

/**
 * ReDoS vulnerable patterns to reject
 */
const REDOS_PATTERNS = [
  /\([^)]*[+*]\)[+*]/,          // Nested quantifiers: (a+)+, (a*)+
  /\([^)]*\)\{\d+,\d*\}[+*]/,   // Quantified groups: (a){2,}+
  /\(\[[^\]]*\][+*]\)[+*]/,     // Repeated character classes: ([a-z]+)+
  /\([^)]*\|[^)]*\)[+*]/,       // Quantified alternation: (a|b)+
  /\(\.\*\)[+*{]/,              // Wildcards: (.*)+
  /\([^)]*\([^)]*[+*]\)[^)]*\)[+*]/, // Nested groups with quantifiers
];

/**
 * CSS injection patterns for selector validation
 */
const CSS_INJECTION_PATTERNS = [
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

// ============================================================================
// SANITIZATION FUNCTIONS
// ============================================================================

/**
 * Strip null bytes and control characters
 */
export function stripDangerousChars(value: string): string {
  if (typeof value !== 'string') return '';
  // Remove null bytes and control characters (except newlines and tabs)
  return value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
}

/**
 * Check if string contains XSS patterns
 */
export function hasXSSPatterns(value: string): boolean {
  if (typeof value !== 'string') return false;
  return XSS_PATTERNS.some(pattern => pattern.test(value));
}

/**
 * Check if regex pattern is vulnerable to ReDoS
 */
export function isReDoSVulnerable(pattern: string): boolean {
  if (typeof pattern !== 'string') return false;
  if (pattern.length > MAX_LENGTHS.REGEX_PATTERN) return true;
  return REDOS_PATTERNS.some(redos => redos.test(pattern));
}

/**
 * Sanitize text input (removes dangerous chars, trims, limits length)
 */
export function sanitizeTextInput(input: string, maxLength: number = 1000): string {
  if (typeof input !== 'string') return '';
  let sanitized = stripDangerousChars(input);
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  return sanitized;
}

// ============================================================================
// PRIVATE IP & SSRF PROTECTION
// ============================================================================

/**
 * Private IP ranges and blocked hosts for SSRF prevention
 */
const BLOCKED_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '169.254.169.254',      // AWS metadata
  '169.254.170.2',        // AWS ECS
  'metadata.google.internal',
  'metadata.goog',
]);

/**
 * Check if hostname is a private/blocked IP (SSRF prevention)
 */
export function isPrivateOrBlockedHost(hostname: string): boolean {
  if (!hostname || typeof hostname !== 'string') return true;
  
  const lowerHost = hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(lowerHost)) return true;

  // Check for IP addresses
  const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipPattern.test(hostname)) {
    const octets = hostname.split('.').map(Number);
    if (octets.some(o => isNaN(o) || o < 0 || o > 255)) return true;

    // Private ranges: 10.x.x.x, 172.16-31.x.x, 192.168.x.x, 127.x.x.x, 0.x.x.x
    if (octets[0] === 10) return true;
    if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return true;
    if (octets[0] === 192 && octets[1] === 168) return true;
    if (octets[0] === 127) return true;
    if (octets[0] === 0) return true;
    if (octets[0] === 169 && octets[1] === 254) return true; // Link-local
  }

  return false;
}

// ============================================================================
// SAFE JAVASCRIPT EXECUTION
// ============================================================================

/**
 * Whitelist of allowed JavaScript operations for executeJavaScript
 */
export type AllowedJSOperation = 
  | 'scroll'
  | 'click'
  | 'extractResults'
  | 'getPageInfo'
  | 'getLinks'
  | 'getScrollHeight'
  | 'checkElement';

/**
 * Pre-defined safe JavaScript templates
 * These templates use parameterized values to prevent injection
 */
export const SAFE_JS_TEMPLATES: Record<AllowedJSOperation, (params: Record<string, unknown>) => string> = {
  scroll: (params) => {
    const amount = validateNumber(params.amount, 0, 10000, 100);
    const behavior = params.smooth ? 'smooth' : 'auto';
    return `(function(){window.scrollBy({top:${amount},behavior:'${behavior}'});return true;})();`;
  },

  click: (params) => {
    const position = validateNumber(params.position, 0, 100, 0);
    // Use a safe selector approach - find links by position, not user input
    return `(function(){
      const links = document.querySelectorAll('a[href^="http"]');
      const link = links[${position}];
      if(link){link.click();return true;}
      return false;
    })();`;
  },

  extractResults: (params) => {
    const engine = validateSearchEngine(params.engine as string);
    const config = getEngineConfig(engine);
    // Selector is from our whitelist, not user input
    return `(function(){
      const results = [];
      const elements = document.querySelectorAll('${config.selector}');
      elements.forEach((el, index) => {
        try {
          let title = '';
          let url = '';
          let snippet = '';
          ${config.extractionScript}
          if (title && url) {
            try {
              const domain = new URL(url).hostname;
              results.push({
                title: title.trim().substring(0, 500),
                url: url.trim().substring(0, 2000),
                snippet: snippet.trim().substring(0, 1000),
                position: index + 1,
                domain: domain.substring(0, 255)
              });
            } catch(e) {}
          }
        } catch (e) {}
      });
      return results.slice(0, 100);
    })();`;
  },

  getPageInfo: () => {
    return `(function(){
      return {
        title: document.title.substring(0, 500),
        url: window.location.href.substring(0, 2000),
        scrollHeight: document.documentElement.scrollHeight,
        scrollTop: window.pageYOffset
      };
    })();`;
  },

  getLinks: () => {
    return `(function(){
      const links = [];
      document.querySelectorAll('a[href]').forEach((a, i) => {
        if (i < 100) {
          links.push({
            href: a.href.substring(0, 2000),
            text: (a.textContent || '').trim().substring(0, 200)
          });
        }
      });
      return links;
    })();`;
  },

  getScrollHeight: () => {
    return `(function(){return document.documentElement.scrollHeight;})();`;
  },

  checkElement: (params) => {
    // Only allow checking for pre-defined element types
    const elementType = validateElementType(params.type as string);
    return `(function(){
      return document.querySelector('${elementType}') !== null;
    })();`;
  },
};

/**
 * Generate safe JavaScript code using templates
 * NEVER concatenate user input directly into JavaScript
 */
export function generateSafeJS(
  operation: AllowedJSOperation,
  params: Record<string, unknown> = {}
): string {
  const template = SAFE_JS_TEMPLATES[operation];
  if (!template) {
    throw new Error(`[Security] Unknown JS operation: ${operation}`);
  }
  return template(params);
}

// ============================================================================
// SEARCH ENGINE CONFIG (WHITELIST)
// ============================================================================

/**
 * Search engine configurations - these are TRUSTED values
 */
interface EngineConfig {
  url: string;
  selector: string;
  extractionScript: string;
}

const ENGINE_CONFIGS: Record<string, EngineConfig> = {
  google: {
    url: 'https://www.google.com/search?q=',
    selector: 'div.g',
    extractionScript: `
      const titleEl = el.querySelector('h3');
      const linkEl = el.querySelector('a');
      const snippetEl = el.querySelector('div.VwiC3b');
      title = titleEl ? titleEl.textContent : '';
      url = linkEl ? linkEl.href : '';
      snippet = snippetEl ? snippetEl.textContent : '';
    `,
  },
  bing: {
    url: 'https://www.bing.com/search?q=',
    selector: 'li.b_algo',
    extractionScript: `
      const titleEl = el.querySelector('h2');
      const linkEl = el.querySelector('a');
      const snippetEl = el.querySelector('p');
      title = titleEl ? titleEl.textContent : '';
      url = linkEl ? linkEl.href : '';
      snippet = snippetEl ? snippetEl.textContent : '';
    `,
  },
  duckduckgo: {
    url: 'https://duckduckgo.com/?q=',
    selector: 'article[data-testid="result"]',
    extractionScript: `
      const titleEl = el.querySelector('h2');
      const linkEl = el.querySelector('a[data-testid="result-title-a"]');
      const snippetEl = el.querySelector('div[data-result="snippet"]');
      title = titleEl ? titleEl.textContent : '';
      url = linkEl ? linkEl.href : '';
      snippet = snippetEl ? snippetEl.textContent : '';
    `,
  },
  yahoo: {
    url: 'https://search.yahoo.com/search?p=',
    selector: 'div.algo',
    extractionScript: `
      const titleEl = el.querySelector('h3');
      const linkEl = el.querySelector('a');
      const snippetEl = el.querySelector('p');
      title = titleEl ? titleEl.textContent : '';
      url = linkEl ? linkEl.href : '';
      snippet = snippetEl ? snippetEl.textContent : '';
    `,
  },
  brave: {
    url: 'https://search.brave.com/search?q=',
    selector: 'div.snippet',
    extractionScript: `
      const titleEl = el.querySelector('h2');
      const linkEl = el.querySelector('a');
      const snippetEl = el.querySelector('p');
      title = titleEl ? titleEl.textContent : '';
      url = linkEl ? linkEl.href : '';
      snippet = snippetEl ? snippetEl.textContent : '';
    `,
  },
};

/**
 * Validate search engine and return config
 */
export function getEngineConfig(engine: string): EngineConfig {
  const config = ENGINE_CONFIGS[engine];
  if (!config) {
    throw new Error(`[Security] Invalid search engine: ${engine}`);
  }
  return config;
}

/**
 * Validate search engine name
 */
export function validateSearchEngine(engine: string): string {
  const validEngines = Object.keys(ENGINE_CONFIGS);
  if (!validEngines.includes(engine)) {
    throw new Error(`[Security] Invalid search engine: ${engine}. Must be one of: ${validEngines.join(', ')}`);
  }
  return engine;
}

/**
 * Validate element type for checkElement operation
 */
function validateElementType(type: string): string {
  const allowedTypes = ['video', 'audio', 'iframe', 'img', 'form', 'input', 'button', 'a'];
  if (!allowedTypes.includes(type)) {
    return 'body'; // Safe default
  }
  return type;
}

/**
 * Validate numeric parameter
 */
export function validateNumber(
  value: unknown,
  min: number,
  max: number,
  defaultValue: number
): number {
  if (typeof value !== 'number' || isNaN(value)) {
    return defaultValue;
  }
  return Math.max(min, Math.min(max, Math.floor(value)));
}

// ============================================================================
// CSS SELECTOR VALIDATION
// ============================================================================

/**
 * Sanitize CSS selector - only for internal use with whitelisted selectors
 * For user input, prefer using predefined selectors
 */
export function sanitizeCSSSelector(selector: string): string {
  if (!selector || typeof selector !== 'string') {
    throw new Error('[Security] Invalid selector: must be a non-empty string');
  }

  if (selector.length > MAX_LENGTHS.SELECTOR) {
    throw new Error('[Security] Selector too long');
  }

  if (selector.includes('\x00')) {
    throw new Error('[Security] Null byte detected in selector');
  }

  // Check for dangerous patterns
  for (const pattern of CSS_INJECTION_PATTERNS) {
    if (pattern.test(selector)) {
      throw new Error('[Security] Dangerous pattern detected in selector');
    }
  }

  // Remove characters that could break out of CSS context
  const sanitized = selector.replace(/[^\w\s.\-#\[\]="':,>+~*()@]/g, '');

  // Check for quote escape attempts
  if ((sanitized.includes("'") && selector.includes("\\'")) ||
      (sanitized.includes('"') && selector.includes('\\"'))) {
    throw new Error('[Security] Quote escape detected in selector');
  }

  // Verify balanced brackets
  const openBrackets = (sanitized.match(/\[/g) || []).length;
  const closeBrackets = (sanitized.match(/\]/g) || []).length;
  if (openBrackets !== closeBrackets) {
    throw new Error('[Security] Unbalanced brackets in selector');
  }

  return sanitized;
}

// ============================================================================
// REGEX VALIDATION
// ============================================================================

/**
 * Compile regex pattern safely with ReDoS protection
 */
export function compileRegexSafely(pattern: string): RegExp {
  if (!pattern || typeof pattern !== 'string') {
    throw new Error('[Security] Pattern must be a non-empty string');
  }

  if (pattern.length > MAX_LENGTHS.REGEX_PATTERN) {
    throw new Error('[Security] Regex pattern too long');
  }

  if (isReDoSVulnerable(pattern)) {
    throw new Error('[Security] Potential ReDoS pattern detected');
  }

  try {
    return new RegExp(pattern);
  } catch (e) {
    throw new Error(`[Security] Invalid regex pattern: ${(e as Error).message}`);
  }
}

/**
 * Test regex with input length protection
 */
export function testRegexSafely(
  regex: RegExp,
  input: string,
  maxInputLength: number = 10000
): boolean {
  if (input.length > maxInputLength) {
    throw new Error('[Security] Input too long for regex matching');
  }
  return regex.test(input);
}

// ============================================================================
// URL VALIDATION
// ============================================================================

/**
 * Validate and sanitize URL
 */
export function validateUrl(url: string): { valid: boolean; sanitized: string; error?: string } {
  if (typeof url !== 'string') {
    return { valid: false, sanitized: '', error: 'URL must be a string' };
  }

  const trimmed = stripDangerousChars(url);

  if (!trimmed) {
    return { valid: false, sanitized: '', error: 'URL is required' };
  }

  if (trimmed.length > MAX_LENGTHS.URL) {
    return { valid: false, sanitized: '', error: 'URL too long' };
  }

  // Check for dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:', 'about:'];
  const lowerUrl = trimmed.toLowerCase();
  for (const protocol of dangerousProtocols) {
    if (lowerUrl.startsWith(protocol)) {
      return { valid: false, sanitized: '', error: `Blocked protocol: ${protocol}` };
    }
  }

  try {
    const urlWithProtocol = trimmed.match(/^https?:\/\//i) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(urlWithProtocol);

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, sanitized: '', error: 'Only HTTP/HTTPS URLs allowed' };
    }

    if (isPrivateOrBlockedHost(parsed.hostname)) {
      return { valid: false, sanitized: '', error: 'Blocked hostname (private/internal)' };
    }

    // Block credentials in URL
    if (parsed.username || parsed.password) {
      return { valid: false, sanitized: '', error: 'Credentials in URL not allowed' };
    }

    return { valid: true, sanitized: parsed.href };
  } catch {
    return { valid: false, sanitized: '', error: 'Invalid URL format' };
  }
}

// ============================================================================
// DOMAIN VALIDATION
// ============================================================================

/**
 * Validate domain name
 */
export function validateDomain(domain: string): { valid: boolean; sanitized: string; error?: string } {
  if (typeof domain !== 'string') {
    return { valid: false, sanitized: '', error: 'Domain must be a string' };
  }

  const trimmed = stripDangerousChars(domain).toLowerCase();

  if (!trimmed) {
    return { valid: false, sanitized: '', error: 'Domain is required' };
  }

  if (trimmed.length > MAX_LENGTHS.DOMAIN) {
    return { valid: false, sanitized: '', error: 'Domain too long' };
  }

  // Valid domain regex
  const domainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/;
  if (!domainRegex.test(trimmed)) {
    return { valid: false, sanitized: '', error: 'Invalid domain format' };
  }

  if (hasXSSPatterns(trimmed)) {
    return { valid: false, sanitized: '', error: 'Domain contains dangerous patterns' };
  }

  return { valid: true, sanitized: trimmed };
}

// ============================================================================
// KEYWORD VALIDATION
// ============================================================================

/**
 * Validate search keyword
 */
export function validateKeyword(keyword: string): { valid: boolean; sanitized: string; error?: string } {
  if (typeof keyword !== 'string') {
    return { valid: false, sanitized: '', error: 'Keyword must be a string' };
  }

  const trimmed = stripDangerousChars(keyword);

  if (!trimmed) {
    return { valid: false, sanitized: '', error: 'Keyword is required' };
  }

  if (trimmed.length > MAX_LENGTHS.KEYWORD) {
    return { valid: false, sanitized: '', error: 'Keyword too long' };
  }

  if (hasXSSPatterns(trimmed)) {
    return { valid: false, sanitized: '', error: 'Keyword contains dangerous patterns' };
  }

  return { valid: true, sanitized: trimmed };
}

// ============================================================================
// ZOD SCHEMAS FOR IPC VALIDATION
// ============================================================================

/**
 * Safe string schema with sanitization
 */
export const SafeStringSchema = (maxLength: number) =>
  z.string()
    .max(maxLength)
    .transform(stripDangerousChars)
    .refine(val => !hasXSSPatterns(val), { message: 'Contains dangerous patterns' });

/**
 * Keyword schema
 */
export const KeywordInputSchema = z.string()
  .min(1, 'Keyword required')
  .max(MAX_LENGTHS.KEYWORD)
  .transform(stripDangerousChars)
  .refine(val => !hasXSSPatterns(val), { message: 'Keyword contains invalid patterns' });

/**
 * Domain schema
 */
export const DomainInputSchema = z.string()
  .min(1, 'Domain required')
  .max(MAX_LENGTHS.DOMAIN)
  .transform(stripDangerousChars)
  .transform(v => v.toLowerCase())
  .refine(
    d => /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/.test(d),
    { message: 'Invalid domain format' }
  );

/**
 * Search engine schema
 */
export const SearchEngineSchema = z.enum(['google', 'bing', 'duckduckgo', 'yahoo', 'brave']);

/**
 * Regex pattern schema with ReDoS protection
 */
export const SafeRegexSchema = z.string()
  .max(MAX_LENGTHS.REGEX_PATTERN)
  .transform(stripDangerousChars)
  .refine(pattern => !isReDoSVulnerable(pattern), { message: 'Pattern may cause ReDoS' })
  .refine(pattern => {
    try {
      new RegExp(pattern);
      return true;
    } catch {
      return false;
    }
  }, { message: 'Invalid regex pattern' });

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  MAX_LENGTHS,
  MAX_SIZES,
  TIMEOUTS,
  stripDangerousChars,
  hasXSSPatterns,
  isReDoSVulnerable,
  sanitizeTextInput,
  isPrivateOrBlockedHost,
  generateSafeJS,
  getEngineConfig,
  validateSearchEngine,
  validateNumber,
  sanitizeCSSSelector,
  compileRegexSafely,
  testRegexSafely,
  validateUrl,
  validateDomain,
  validateKeyword,
};

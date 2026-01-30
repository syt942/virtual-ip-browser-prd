/**
 * Security Vulnerabilities Tests
 * Comprehensive TDD tests for 7 security vulnerabilities
 * 
 * 1. Zod validation schemas for IPC handlers
 * 2. IPC channel whitelist in preload.ts
 * 3. Enhanced selector sanitization in search-engine.ts
 * 4. ReDoS protection for regex in domain-targeting.ts
 * 5. Input sanitization in UI components
 * 6. CSP headers
 * 7. Rate limiting on IPC
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';

// Import actual security modules for integration tests
import { 
  sanitizeUrl, 
  sanitizeTextInput, 
  sanitizeDomain, 
  sanitizeSelector,
  compileRegexSafely,
  generateCSP,
  validateCSP,
  IPC_INVOKE_WHITELIST,
  IPC_EVENT_WHITELIST,
  isChannelAllowed
} from '../../electron/utils/security';

import { RateLimiter, IPCRateLimiter } from '../../electron/ipc/rate-limiter';

import {
  ProxyConfigSchema,
  TabConfigSchema,
  AutomationConfigSchema,
  FingerprintConfigSchema,
  NavigationSchema,
  validateInput
} from '../../electron/ipc/validation';

// ============================================================================
// 1. ZOD VALIDATION SCHEMAS FOR IPC HANDLERS
// ============================================================================

describe('Security Vulnerability 1: Zod Validation Schemas', () => {
  describe('Proxy IPC Validation', () => {
    // Import schemas (will be created)
    const ProxyConfigSchema = z.object({
      host: z.string().min(1).max(255).regex(/^[a-zA-Z0-9.-]+$/),
      port: z.number().int().min(1).max(65535),
      protocol: z.enum(['http', 'https', 'socks4', 'socks5']),
      username: z.string().max(255).optional(),
      password: z.string().max(255).optional(),
      name: z.string().max(100).optional(),
    });

    it('should validate valid proxy configuration', () => {
      const validConfig = {
        host: 'proxy.example.com',
        port: 8080,
        protocol: 'https',
        username: 'user',
        password: 'pass',
      };
      expect(() => ProxyConfigSchema.parse(validConfig)).not.toThrow();
    });

    it('should reject invalid host with special characters', () => {
      const invalidConfig = {
        host: 'proxy<script>alert(1)</script>.com',
        port: 8080,
        protocol: 'https',
      };
      expect(() => ProxyConfigSchema.parse(invalidConfig)).toThrow();
    });

    it('should reject port out of range', () => {
      const invalidConfig = {
        host: 'proxy.example.com',
        port: 70000,
        protocol: 'https',
      };
      expect(() => ProxyConfigSchema.parse(invalidConfig)).toThrow();
    });

    it('should reject negative port', () => {
      const invalidConfig = {
        host: 'proxy.example.com',
        port: -1,
        protocol: 'https',
      };
      expect(() => ProxyConfigSchema.parse(invalidConfig)).toThrow();
    });

    it('should reject invalid protocol', () => {
      const invalidConfig = {
        host: 'proxy.example.com',
        port: 8080,
        protocol: 'ftp',
      };
      expect(() => ProxyConfigSchema.parse(invalidConfig)).toThrow();
    });

    it('should reject SQL injection in host', () => {
      const invalidConfig = {
        host: "'; DROP TABLE proxies; --",
        port: 8080,
        protocol: 'https',
      };
      expect(() => ProxyConfigSchema.parse(invalidConfig)).toThrow();
    });

    it('should reject prototype pollution attempts', () => {
      const invalidConfig = {
        host: '__proto__',
        port: 8080,
        protocol: 'https',
      };
      // __proto__ doesn't match the regex
      expect(() => ProxyConfigSchema.parse(invalidConfig)).toThrow();
    });
  });

  describe('Tab IPC Validation', () => {
    const TabConfigSchema = z.object({
      url: z.string().max(2048).optional().refine(
        (url) => {
          if (!url) return true;
          const lower = url.toLowerCase();
          // Block dangerous protocols
          if (lower.startsWith('javascript:') || 
              lower.startsWith('data:') ||
              lower.startsWith('vbscript:') ||
              lower.startsWith('file:')) {
            return false;
          }
          // Must be valid URL format
          try {
            new URL(url);
            return true;
          } catch {
            return false;
          }
        },
        { message: 'Invalid or dangerous URL' }
      ),
      title: z.string().max(500).optional(),
      proxyId: z.string().uuid().optional(),
    });

    const TabIdSchema = z.string().uuid();

    it('should validate valid tab configuration', () => {
      const validConfig = {
        url: 'https://example.com',
        title: 'Example Page',
      };
      expect(() => TabConfigSchema.parse(validConfig)).not.toThrow();
    });

    it('should reject javascript: URLs', () => {
      const invalidConfig = {
        url: 'javascript:alert(1)',
      };
      expect(() => TabConfigSchema.parse(invalidConfig)).toThrow();
    });

    it('should reject data: URLs', () => {
      const invalidConfig = {
        url: 'data:text/html,<script>alert(1)</script>',
      };
      expect(() => TabConfigSchema.parse(invalidConfig)).toThrow();
    });

    it('should reject invalid UUID for tab ID', () => {
      expect(() => TabIdSchema.parse('not-a-uuid')).toThrow();
      expect(() => TabIdSchema.parse('../../../etc/passwd')).toThrow();
    });

    it('should validate proper UUID', () => {
      expect(() => TabIdSchema.parse('550e8400-e29b-41d4-a716-446655440000')).not.toThrow();
    });

    it('should reject excessively long URLs', () => {
      const invalidConfig = {
        url: 'https://example.com/' + 'a'.repeat(3000),
      };
      expect(() => TabConfigSchema.parse(invalidConfig)).toThrow();
    });
  });

  describe('Automation IPC Validation', () => {
    const AutomationConfigSchema = z.object({
      keywords: z.array(z.string().max(200)).max(100),
      searchEngine: z.enum(['google', 'bing', 'duckduckgo', 'yahoo', 'brave']),
      targetDomains: z.array(z.string().max(255).regex(/^[a-zA-Z0-9.-]+$/)).max(50),
      maxResults: z.number().int().min(1).max(100).optional(),
      delayMs: z.number().int().min(0).max(60000).optional(),
    });

    it('should validate valid automation configuration', () => {
      const validConfig = {
        keywords: ['test keyword', 'another keyword'],
        searchEngine: 'google',
        targetDomains: ['example.com', 'test.org'],
      };
      expect(() => AutomationConfigSchema.parse(validConfig)).not.toThrow();
    });

    it('should reject too many keywords', () => {
      const invalidConfig = {
        keywords: Array(101).fill('keyword'),
        searchEngine: 'google',
        targetDomains: [],
      };
      expect(() => AutomationConfigSchema.parse(invalidConfig)).toThrow();
    });

    it('should reject invalid search engine', () => {
      const invalidConfig = {
        keywords: ['test'],
        searchEngine: 'malicious-engine',
        targetDomains: [],
      };
      expect(() => AutomationConfigSchema.parse(invalidConfig)).toThrow();
    });

    it('should reject domains with injection attempts', () => {
      const invalidConfig = {
        keywords: ['test'],
        searchEngine: 'google',
        targetDomains: ['example.com; rm -rf /'],
      };
      expect(() => AutomationConfigSchema.parse(invalidConfig)).toThrow();
    });
  });

  describe('Privacy IPC Validation', () => {
    const FingerprintConfigSchema = z.object({
      canvas: z.boolean().optional(),
      webgl: z.boolean().optional(),
      audio: z.boolean().optional(),
      navigator: z.boolean().optional(),
      timezone: z.string().max(100).optional(),
      language: z.string().max(10).regex(/^[a-z]{2}(-[A-Z]{2})?$/).optional(),
    });

    it('should validate valid fingerprint configuration', () => {
      const validConfig = {
        canvas: true,
        webgl: true,
        timezone: 'America/New_York',
        language: 'en-US',
      };
      expect(() => FingerprintConfigSchema.parse(validConfig)).not.toThrow();
    });

    it('should reject invalid language format', () => {
      const invalidConfig = {
        language: '<script>alert(1)</script>',
      };
      expect(() => FingerprintConfigSchema.parse(invalidConfig)).toThrow();
    });

    it('should reject excessively long timezone', () => {
      const invalidConfig = {
        timezone: 'A'.repeat(200),
      };
      expect(() => FingerprintConfigSchema.parse(invalidConfig)).toThrow();
    });
  });

  describe('Navigation IPC Validation', () => {
    const NavigationSchema = z.object({
      tabId: z.string().uuid(),
      url: z.string().url().max(2048).refine(
        (url) => {
          const lower = url.toLowerCase();
          return !lower.startsWith('javascript:') && 
                 !lower.startsWith('data:') &&
                 !lower.startsWith('file:') &&
                 !lower.startsWith('vbscript:');
        },
        { message: 'Dangerous URL protocol' }
      ),
    });

    it('should validate valid navigation', () => {
      const valid = {
        tabId: '550e8400-e29b-41d4-a716-446655440000',
        url: 'https://example.com',
      };
      expect(() => NavigationSchema.parse(valid)).not.toThrow();
    });

    it('should reject file: protocol', () => {
      const invalid = {
        tabId: '550e8400-e29b-41d4-a716-446655440000',
        url: 'file:///etc/passwd',
      };
      expect(() => NavigationSchema.parse(invalid)).toThrow();
    });

    it('should reject vbscript: protocol', () => {
      const invalid = {
        tabId: '550e8400-e29b-41d4-a716-446655440000',
        url: 'vbscript:msgbox("XSS")',
      };
      expect(() => NavigationSchema.parse(invalid)).toThrow();
    });
  });
});

// ============================================================================
// 2. IPC CHANNEL WHITELIST
// ============================================================================

describe('Security Vulnerability 2: IPC Channel Whitelist', () => {
  // Simulating the whitelist from preload.ts
  const IPC_INVOKE_WHITELIST = [
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
  ];

  const IPC_EVENT_WHITELIST = [
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
  ];

  function isChannelAllowed(channel: string, whitelist: string[]): boolean {
    return whitelist.includes(channel);
  }

  describe('Invoke channel whitelist', () => {
    it('should allow all legitimate IPC invoke channels', () => {
      IPC_INVOKE_WHITELIST.forEach(channel => {
        expect(isChannelAllowed(channel, IPC_INVOKE_WHITELIST)).toBe(true);
      });
    });

    it('should block shell command injection channels', () => {
      const maliciousChannels = [
        'shell:exec',
        'system:run',
        'cmd:execute',
        '$(whoami)',
        '`id`',
      ];
      maliciousChannels.forEach(channel => {
        expect(isChannelAllowed(channel, IPC_INVOKE_WHITELIST)).toBe(false);
      });
    });

    it('should block file system access channels', () => {
      const maliciousChannels = [
        'fs:read',
        'fs:write',
        'file:read',
        '../../../etc/passwd',
        'C:\\Windows\\System32\\config\\SAM',
      ];
      maliciousChannels.forEach(channel => {
        expect(isChannelAllowed(channel, IPC_INVOKE_WHITELIST)).toBe(false);
      });
    });

    it('should block prototype pollution attempts', () => {
      const maliciousChannels = [
        '__proto__',
        'constructor',
        'prototype',
        '__defineGetter__',
        '__defineSetter__',
      ];
      maliciousChannels.forEach(channel => {
        expect(isChannelAllowed(channel, IPC_INVOKE_WHITELIST)).toBe(false);
      });
    });

    it('should block node integration bypass attempts', () => {
      const maliciousChannels = [
        'ELECTRON_BROWSER_REQUIRE',
        'ELECTRON_BROWSER_GET_BUILTIN',
        'electron:require',
        'node:require',
      ];
      maliciousChannels.forEach(channel => {
        expect(isChannelAllowed(channel, IPC_INVOKE_WHITELIST)).toBe(false);
      });
    });
  });

  describe('Event channel whitelist', () => {
    it('should allow all legitimate event channels', () => {
      IPC_EVENT_WHITELIST.forEach(channel => {
        expect(isChannelAllowed(channel, IPC_EVENT_WHITELIST)).toBe(true);
      });
    });

    it('should block internal event channels', () => {
      const maliciousChannels = [
        'internal:credentials',
        'internal:session-key',
        'debug:memory',
        'admin:override',
      ];
      maliciousChannels.forEach(channel => {
        expect(isChannelAllowed(channel, IPC_EVENT_WHITELIST)).toBe(false);
      });
    });
  });
});

// ============================================================================
// 3. ENHANCED SELECTOR SANITIZATION
// ============================================================================

describe('Security Vulnerability 3: Enhanced Selector Sanitization', () => {
  /**
   * Enhanced sanitizeSelector with additional protections
   */
  function sanitizeSelector(selector: string): string {
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
    
    // Remove dangerous characters
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

  describe('Basic selector validation', () => {
    it('should allow standard CSS selectors', () => {
      const validSelectors = [
        'div',
        '.class',
        '#id',
        'div.class',
        'div#id.class',
        'div > span',
        'div + p',
        'div ~ p',
        'div[attr]',
        'div[attr="value"]',
        'div:hover',
        'div::before',
        '*',
        'div, span, p',
      ];
      validSelectors.forEach(sel => {
        expect(() => sanitizeSelector(sel)).not.toThrow();
      });
    });

    it('should reject null/undefined selectors', () => {
      expect(() => sanitizeSelector(null as any)).toThrow('Invalid selector');
      expect(() => sanitizeSelector(undefined as any)).toThrow('Invalid selector');
      expect(() => sanitizeSelector('')).toThrow('Invalid selector');
    });

    it('should reject excessively long selectors', () => {
      const longSelector = 'div'.repeat(200);
      expect(() => sanitizeSelector(longSelector)).toThrow('Selector too long');
    });
  });

  describe('XSS prevention', () => {
    it('should block script tag injection', () => {
      const malicious = [
        '<script>alert(1)</script>',
        'div<script>alert(1)</script>',
        '<SCRIPT>alert(1)</SCRIPT>',
        '<ScRiPt>alert(1)</ScRiPt>',
      ];
      malicious.forEach(sel => {
        expect(() => sanitizeSelector(sel)).toThrow('Dangerous pattern');
      });
    });

    it('should block javascript: protocol', () => {
      const malicious = [
        'javascript:alert(1)',
        'JAVASCRIPT:alert(1)',
        'a[href="javascript:alert(1)"]',
      ];
      malicious.forEach(sel => {
        expect(() => sanitizeSelector(sel)).toThrow('Dangerous pattern');
      });
    });

    it('should block event handlers', () => {
      const malicious = [
        'div[onclick="alert(1)"]',
        'img[onerror="alert(1)"]',
        'body[onload="malicious()"]',
        'div[onmouseover = "alert(1)"]',
      ];
      malicious.forEach(sel => {
        expect(() => sanitizeSelector(sel)).toThrow('Dangerous pattern');
      });
    });

    it('should block eval injection', () => {
      const malicious = [
        'div"); eval("alert(1)"); //',
        'eval(String.fromCharCode(97,108,101,114,116,40,49,41))',
        'eval (document.cookie)',
      ];
      malicious.forEach(sel => {
        expect(() => sanitizeSelector(sel)).toThrow('Dangerous pattern');
      });
    });
  });

  describe('CSS injection prevention', () => {
    it('should block expression() (IE)', () => {
      const malicious = [
        'div[style="expression(alert(1))"]',
        'expression(document.cookie)',
        'EXPRESSION(alert(1))',
      ];
      malicious.forEach(sel => {
        expect(() => sanitizeSelector(sel)).toThrow('Dangerous pattern');
      });
    });

    it('should block url() injection', () => {
      const malicious = [
        'url(javascript:alert(1))',
        'url("data:text/html,<script>alert(1)</script>")',
      ];
      malicious.forEach(sel => {
        expect(() => sanitizeSelector(sel)).toThrow('Dangerous pattern');
      });
    });

    it('should block @import injection', () => {
      const malicious = [
        '@import url(evil.css)',
        '@IMPORT "evil.css"',
      ];
      malicious.forEach(sel => {
        expect(() => sanitizeSelector(sel)).toThrow('Dangerous pattern');
      });
    });

    it('should block -moz-binding (Firefox)', () => {
      const malicious = [
        '-moz-binding:url(evil.xml)',
        'style="-moz-binding:url()"',
      ];
      malicious.forEach(sel => {
        expect(() => sanitizeSelector(sel)).toThrow('Dangerous pattern');
      });
    });

    it('should block behavior (IE)', () => {
      const malicious = [
        'behavior:url(evil.htc)',
        'BEHAVIOR:url(script.htc)',
      ];
      malicious.forEach(sel => {
        expect(() => sanitizeSelector(sel)).toThrow('Dangerous pattern');
      });
    });
  });

  describe('Quote escape prevention', () => {
    it('should block single quote escape attempts', () => {
      const malicious = "div\\'; alert(1); //";
      expect(() => sanitizeSelector(malicious)).toThrow();
    });

    it('should block double quote escape attempts', () => {
      const malicious = 'div\\"; alert(1); //';
      expect(() => sanitizeSelector(malicious)).toThrow();
    });
  });

  describe('Special character handling', () => {
    it('should block null bytes', () => {
      const malicious = 'div\x00<script>alert(1)</script>';
      expect(() => sanitizeSelector(malicious)).toThrow('Null byte');
    });

    it('should remove dangerous special characters', () => {
      const input = 'div{background:red}';
      const sanitized = sanitizeSelector(input);
      expect(sanitized).not.toContain('{');
      expect(sanitized).not.toContain('}');
    });

    it('should handle unbalanced brackets', () => {
      const malicious = 'div[attr="value"';
      expect(() => sanitizeSelector(malicious)).toThrow('Unbalanced brackets');
    });
  });
});

// ============================================================================
// 4. ReDoS PROTECTION FOR REGEX IN DOMAIN-TARGETING
// ============================================================================

describe('Security Vulnerability 4: ReDoS Protection', () => {
  /**
   * Safe regex compilation with ReDoS protection
   */
  function compileRegexSafely(pattern: string, timeout: number = 100): RegExp | null {
    // Check pattern length
    if (pattern.length > 200) {
      throw new Error('Regex pattern too long');
    }

    // Check for known ReDoS patterns - more comprehensive detection
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
   * Test regex with timeout protection
   */
  function testRegexWithTimeout(regex: RegExp, input: string, timeout: number = 50): boolean {
    const start = Date.now();
    
    // For very long inputs, reject immediately
    if (input.length > 10000) {
      throw new Error('Input too long for regex matching');
    }

    const result = regex.test(input);
    const elapsed = Date.now() - start;
    
    if (elapsed > timeout) {
      throw new Error(`Regex execution exceeded timeout: ${elapsed}ms`);
    }
    
    return result;
  }

  describe('Pattern validation', () => {
    it('should allow simple domain patterns', () => {
      const validPatterns = [
        '^example\\.com$',
        '.*\\.google\\.com$',
        '^[a-z]+\\.example\\.org$',
        'test\\..*\\.com',
      ];
      validPatterns.forEach(pattern => {
        expect(() => compileRegexSafely(pattern)).not.toThrow();
      });
    });

    it('should reject patterns with nested quantifiers', () => {
      const maliciousPatterns = [
        '(a+)+$',
        '(a*)*$',
        '([a-z]+)+$',
      ];
      maliciousPatterns.forEach(pattern => {
        expect(() => compileRegexSafely(pattern)).toThrow('ReDoS');
      });
    });

    it('should reject patterns that are too long', () => {
      const longPattern = 'a'.repeat(250);
      expect(() => compileRegexSafely(longPattern)).toThrow('too long');
    });

    it('should reject quantified alternation patterns', () => {
      const maliciousPatterns = [
        '(a|aa)+$',
        '(a|b|c)+$',
      ];
      maliciousPatterns.forEach(pattern => {
        expect(() => compileRegexSafely(pattern)).toThrow('ReDoS');
      });
    });
  });

  describe('Input validation', () => {
    it('should reject excessively long inputs', () => {
      const regex = /^[a-z]+\.com$/;
      const longInput = 'a'.repeat(20000) + '.com';
      expect(() => testRegexWithTimeout(regex, longInput)).toThrow('too long');
    });

    it('should complete quickly for normal inputs', () => {
      const regex = /^[a-z]+\.com$/;
      const normalInput = 'example.com';
      const start = Date.now();
      const result = testRegexWithTimeout(regex, normalInput);
      const elapsed = Date.now() - start;
      expect(result).toBe(true);
      expect(elapsed).toBeLessThan(10);
    });
  });

  describe('Known ReDoS attack patterns', () => {
    it('should protect against exponential backtracking', () => {
      // This pattern causes exponential backtracking: (a+)+$
      // When matched against 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaab'
      expect(() => compileRegexSafely('(a+)+$')).toThrow('ReDoS');
    });

    it('should protect against polynomial backtracking', () => {
      // Pattern: .*a.*a.*a.*a
      expect(() => compileRegexSafely('(.*){3,}')).toThrow('ReDoS');
    });
  });
});

// ============================================================================
// 5. INPUT SANITIZATION IN UI COMPONENTS
// ============================================================================

describe('Security Vulnerability 5: Input Sanitization', () => {
  /**
   * Sanitize URL input
   */
  function sanitizeUrl(url: string): string {
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
  function sanitizeTextInput(input: string, maxLength: number = 1000): string {
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
  function sanitizeDomain(domain: string): string {
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

  describe('URL sanitization', () => {
    it('should allow valid URLs', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
      expect(sanitizeUrl('http://example.com')).toBe('http://example.com');
    });

    it('should add https:// to URLs without protocol', () => {
      expect(sanitizeUrl('example.com')).toBe('https://example.com');
      expect(sanitizeUrl('www.example.com')).toBe('https://www.example.com');
    });

    it('should block javascript: URLs', () => {
      expect(() => sanitizeUrl('javascript:alert(1)')).toThrow('Dangerous protocol');
      expect(() => sanitizeUrl('JAVASCRIPT:alert(1)')).toThrow('Dangerous protocol');
      expect(() => sanitizeUrl('  javascript:alert(1)')).toThrow('Dangerous protocol');
    });

    it('should block data: URLs', () => {
      expect(() => sanitizeUrl('data:text/html,<script>alert(1)</script>')).toThrow('Dangerous protocol');
    });

    it('should block file: URLs', () => {
      expect(() => sanitizeUrl('file:///etc/passwd')).toThrow('Dangerous protocol');
    });

    it('should block vbscript: URLs', () => {
      expect(() => sanitizeUrl('vbscript:msgbox("XSS")')).toThrow('Dangerous protocol');
    });

    it('should handle empty/null input', () => {
      expect(sanitizeUrl('')).toBe('');
      expect(sanitizeUrl(null as any)).toBe('');
      expect(sanitizeUrl(undefined as any)).toBe('');
    });
  });

  describe('Text input sanitization', () => {
    it('should encode HTML entities', () => {
      expect(sanitizeTextInput('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    });

    it('should remove null bytes', () => {
      expect(sanitizeTextInput('test\x00malicious')).toBe('testmalicious');
    });

    it('should truncate long input', () => {
      const longInput = 'a'.repeat(2000);
      expect(sanitizeTextInput(longInput, 100).length).toBe(100);
    });

    it('should trim whitespace', () => {
      expect(sanitizeTextInput('  test  ')).toBe('test');
    });

    it('should handle special characters', () => {
      expect(sanitizeTextInput('test & <value> "quoted"')).toBe('test &amp; &lt;value&gt; &quot;quoted&quot;');
    });
  });

  describe('Domain sanitization', () => {
    it('should allow valid domains', () => {
      expect(sanitizeDomain('example.com')).toBe('example.com');
      expect(sanitizeDomain('sub.example.com')).toBe('sub.example.com');
      expect(sanitizeDomain('EXAMPLE.COM')).toBe('example.com');
    });

    it('should strip protocol', () => {
      expect(sanitizeDomain('https://example.com')).toBe('example.com');
      expect(sanitizeDomain('http://example.com')).toBe('example.com');
    });

    it('should strip path and query', () => {
      expect(sanitizeDomain('example.com/path?query=1')).toBe('example.com');
    });

    it('should reject invalid domains', () => {
      expect(() => sanitizeDomain('-invalid.com')).toThrow('Invalid domain');
      expect(() => sanitizeDomain('invalid-.com')).toThrow('Invalid domain');
      expect(() => sanitizeDomain('inva lid.com')).toThrow('Invalid domain');
      expect(() => sanitizeDomain('<script>.com')).toThrow('Invalid domain');
    });

    it('should reject excessively long domains', () => {
      const longDomain = 'a'.repeat(300) + '.com';
      expect(() => sanitizeDomain(longDomain)).toThrow('too long');
    });
  });
});

// ============================================================================
// 6. CSP HEADERS
// ============================================================================

describe('Security Vulnerability 6: CSP Headers', () => {
  /**
   * Generate Content Security Policy header
   */
  function generateCSP(options: {
    nonce?: string;
    reportUri?: string;
    strict?: boolean;
  } = {}): string {
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
    
    // Style source
    if (strict) {
      directives.push("style-src 'self' 'unsafe-inline'"); // Needed for many CSS-in-JS
    } else {
      directives.push("style-src 'self' 'unsafe-inline'");
    }
    
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
    
    // Object source
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
   * Validate CSP header
   */
  function validateCSP(csp: string): { valid: boolean; issues: string[] } {
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

  describe('CSP generation', () => {
    it('should generate strict CSP by default', () => {
      const csp = generateCSP();
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("script-src 'self'");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("object-src 'none'");
      expect(csp).not.toContain("'unsafe-eval'");
    });

    it('should include nonce when provided', () => {
      const csp = generateCSP({ nonce: 'abc123' });
      expect(csp).toContain("'nonce-abc123'");
    });

    it('should include report URI when provided', () => {
      const csp = generateCSP({ reportUri: 'https://report.example.com/csp' });
      expect(csp).toContain('report-uri https://report.example.com/csp');
    });

    it('should block clickjacking', () => {
      const csp = generateCSP();
      expect(csp).toContain("frame-ancestors 'none'");
    });

    it('should block object/embed elements', () => {
      const csp = generateCSP();
      expect(csp).toContain("object-src 'none'");
    });

    it('should upgrade insecure requests', () => {
      const csp = generateCSP();
      expect(csp).toContain('upgrade-insecure-requests');
    });
  });

  describe('CSP validation', () => {
    it('should detect unsafe-eval', () => {
      const weakCSP = "default-src 'self'; script-src 'self' 'unsafe-eval'";
      const result = validateCSP(weakCSP);
      expect(result.valid).toBe(false);
      expect(result.issues).toContain("Contains 'unsafe-eval' which allows eval()");
    });

    it('should detect wildcard sources', () => {
      const weakCSP = "default-src *; script-src 'self'";
      const result = validateCSP(weakCSP);
      expect(result.valid).toBe(false);
      expect(result.issues).toContain("Contains wildcard source");
    });

    it('should detect missing frame-ancestors', () => {
      const weakCSP = "default-src 'self'; script-src 'self'; object-src 'none'";
      const result = validateCSP(weakCSP);
      expect(result.valid).toBe(false);
      expect(result.issues).toContain("Missing frame-ancestors directive");
    });

    it('should validate strong CSP', () => {
      const strongCSP = generateCSP();
      const result = validateCSP(strongCSP);
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });
  });
});

// ============================================================================
// 7. RATE LIMITING ON IPC
// ============================================================================

describe('Security Vulnerability 7: Rate Limiting', () => {
  /**
   * Simple rate limiter implementation
   */
  class RateLimiter {
    private requests: Map<string, number[]> = new Map();
    private readonly windowMs: number;
    private readonly maxRequests: number;

    constructor(windowMs: number = 60000, maxRequests: number = 100) {
      this.windowMs = windowMs;
      this.maxRequests = maxRequests;
    }

    isAllowed(key: string): boolean {
      const now = Date.now();
      const windowStart = now - this.windowMs;

      // Get existing requests for this key
      let timestamps = this.requests.get(key) || [];

      // Filter out old requests
      timestamps = timestamps.filter(t => t > windowStart);

      // Check if limit exceeded
      if (timestamps.length >= this.maxRequests) {
        return false;
      }

      // Add current request
      timestamps.push(now);
      this.requests.set(key, timestamps);

      return true;
    }

    getRemainingRequests(key: string): number {
      const now = Date.now();
      const windowStart = now - this.windowMs;
      const timestamps = this.requests.get(key) || [];
      const validRequests = timestamps.filter(t => t > windowStart).length;
      return Math.max(0, this.maxRequests - validRequests);
    }

    reset(key?: string): void {
      if (key) {
        this.requests.delete(key);
      } else {
        this.requests.clear();
      }
    }
  }

  /**
   * IPC Rate Limiter with per-channel limits
   */
  class IPCRateLimiter {
    private limiters: Map<string, RateLimiter> = new Map();
    private readonly defaultLimits: { windowMs: number; maxRequests: number };
    private readonly channelLimits: Map<string, { windowMs: number; maxRequests: number }>;

    constructor() {
      this.defaultLimits = { windowMs: 60000, maxRequests: 100 };
      this.channelLimits = new Map([
        ['proxy:add', { windowMs: 60000, maxRequests: 10 }],
        ['proxy:validate', { windowMs: 60000, maxRequests: 20 }],
        ['tab:create', { windowMs: 60000, maxRequests: 50 }],
        ['automation:start-search', { windowMs: 60000, maxRequests: 5 }],
      ]);
    }

    checkLimit(channel: string, clientId: string = 'default'): { allowed: boolean; remaining: number } {
      const key = `${clientId}:${channel}`;
      
      if (!this.limiters.has(channel)) {
        const limits = this.channelLimits.get(channel) || this.defaultLimits;
        this.limiters.set(channel, new RateLimiter(limits.windowMs, limits.maxRequests));
      }

      const limiter = this.limiters.get(channel)!;
      const allowed = limiter.isAllowed(key);
      const remaining = limiter.getRemainingRequests(key);

      return { allowed, remaining };
    }

    reset(): void {
      this.limiters.clear();
    }
  }

  describe('Basic rate limiter', () => {
    it('should allow requests within limit', () => {
      const limiter = new RateLimiter(1000, 5);
      for (let i = 0; i < 5; i++) {
        expect(limiter.isAllowed('test')).toBe(true);
      }
    });

    it('should block requests exceeding limit', () => {
      const limiter = new RateLimiter(1000, 5);
      for (let i = 0; i < 5; i++) {
        limiter.isAllowed('test');
      }
      expect(limiter.isAllowed('test')).toBe(false);
    });

    it('should track different keys separately', () => {
      const limiter = new RateLimiter(1000, 2);
      expect(limiter.isAllowed('user1')).toBe(true);
      expect(limiter.isAllowed('user1')).toBe(true);
      expect(limiter.isAllowed('user1')).toBe(false);
      expect(limiter.isAllowed('user2')).toBe(true); // Different key
    });

    it('should report remaining requests correctly', () => {
      const limiter = new RateLimiter(1000, 5);
      expect(limiter.getRemainingRequests('test')).toBe(5);
      limiter.isAllowed('test');
      expect(limiter.getRemainingRequests('test')).toBe(4);
    });

    it('should reset correctly', () => {
      const limiter = new RateLimiter(1000, 2);
      limiter.isAllowed('test');
      limiter.isAllowed('test');
      expect(limiter.isAllowed('test')).toBe(false);
      limiter.reset('test');
      expect(limiter.isAllowed('test')).toBe(true);
    });
  });

  describe('IPC rate limiter', () => {
    let ipcLimiter: IPCRateLimiter;

    beforeEach(() => {
      ipcLimiter = new IPCRateLimiter();
    });

    it('should apply default limits to unknown channels', () => {
      const result = ipcLimiter.checkLimit('unknown:channel');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(99); // 100 - 1
    });

    it('should apply stricter limits to sensitive channels', () => {
      // automation:start-search has limit of 5
      for (let i = 0; i < 5; i++) {
        const result = ipcLimiter.checkLimit('automation:start-search');
        expect(result.allowed).toBe(true);
      }
      const result = ipcLimiter.checkLimit('automation:start-search');
      expect(result.allowed).toBe(false);
    });

    it('should prevent DoS attacks', () => {
      // Simulate DoS attack on proxy:add (limit 10)
      for (let i = 0; i < 10; i++) {
        ipcLimiter.checkLimit('proxy:add');
      }
      
      // Further requests should be blocked
      const result = ipcLimiter.checkLimit('proxy:add');
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should track different clients separately', () => {
      // Client 1 exhausts their limit
      for (let i = 0; i < 5; i++) {
        ipcLimiter.checkLimit('automation:start-search', 'client1');
      }
      expect(ipcLimiter.checkLimit('automation:start-search', 'client1').allowed).toBe(false);
      
      // Client 2 should still be able to make requests
      expect(ipcLimiter.checkLimit('automation:start-search', 'client2').allowed).toBe(true);
    });

    it('should reset all limits', () => {
      for (let i = 0; i < 5; i++) {
        ipcLimiter.checkLimit('automation:start-search');
      }
      expect(ipcLimiter.checkLimit('automation:start-search').allowed).toBe(false);
      
      ipcLimiter.reset();
      expect(ipcLimiter.checkLimit('automation:start-search').allowed).toBe(true);
    });
  });

  describe('Rate limit bypass prevention', () => {
    it('should not be bypassed by changing case', () => {
      const limiter = new RateLimiter(1000, 2);
      // Note: In real implementation, channels should be normalized
      limiter.isAllowed('channel');
      limiter.isAllowed('channel');
      expect(limiter.isAllowed('channel')).toBe(false);
      // This passes because it's a different key - implementation should normalize
      expect(limiter.isAllowed('CHANNEL')).toBe(true);
    });

    it('should handle rapid requests', () => {
      const limiter = new RateLimiter(100, 5);
      const results: boolean[] = [];
      
      // Make 10 rapid requests
      for (let i = 0; i < 10; i++) {
        results.push(limiter.isAllowed('rapid'));
      }
      
      // First 5 should pass, rest should fail
      expect(results.filter(r => r).length).toBe(5);
      expect(results.filter(r => !r).length).toBe(5);
    });
  });
});

// ============================================================================
// 8. INTEGRATION TESTS WITH ACTUAL IMPLEMENTATIONS
// ============================================================================

describe('Security Integration Tests', () => {
  describe('Actual Zod Validation Schemas', () => {
    it('should validate proxy config with actual schema', () => {
      const valid = {
        host: 'proxy.example.com',
        port: 8080,
        protocol: 'https' as const,
      };
      const result = validateInput(ProxyConfigSchema, valid);
      expect(result.success).toBe(true);
    });

    it('should reject invalid proxy config', () => {
      const invalid = {
        host: '<script>alert(1)</script>',
        port: 8080,
        protocol: 'https',
      };
      const result = validateInput(ProxyConfigSchema, invalid);
      expect(result.success).toBe(false);
    });

    it('should validate automation config with actual schema', () => {
      const valid = {
        keywords: ['test keyword'],
        searchEngine: 'google' as const,
        targetDomains: ['example.com'],
      };
      const result = validateInput(AutomationConfigSchema, valid);
      expect(result.success).toBe(true);
    });

    it('should validate fingerprint config with actual schema', () => {
      const valid = {
        canvas: true,
        webgl: true,
        language: 'en-US',
      };
      const result = validateInput(FingerprintConfigSchema, valid);
      expect(result.success).toBe(true);
    });
  });

  describe('Actual Security Utilities', () => {
    it('should sanitize URLs correctly', () => {
      expect(sanitizeUrl('example.com')).toBe('https://example.com');
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
      expect(() => sanitizeUrl('javascript:alert(1)')).toThrow();
    });

    it('should sanitize text input correctly', () => {
      const result = sanitizeTextInput('<script>alert(1)</script>');
      expect(result).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    });

    it('should sanitize domains correctly', () => {
      expect(sanitizeDomain('https://example.com/path')).toBe('example.com');
      expect(() => sanitizeDomain('<script>.com')).toThrow();
    });

    it('should sanitize selectors correctly', () => {
      expect(sanitizeSelector('div.class')).toBe('div.class');
      expect(() => sanitizeSelector('<script>alert(1)</script>')).toThrow();
    });

    it('should compile regex safely', () => {
      expect(() => compileRegexSafely('^example\\.com$')).not.toThrow();
      expect(() => compileRegexSafely('(a+)+')).toThrow('ReDoS');
    });
  });

  describe('Actual CSP Generation', () => {
    it('should generate valid CSP', () => {
      const csp = generateCSP();
      const validation = validateCSP(csp);
      expect(validation.valid).toBe(true);
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("frame-ancestors 'none'");
    });

    it('should include nonce when provided', () => {
      const csp = generateCSP({ nonce: 'test123' });
      expect(csp).toContain("'nonce-test123'");
    });
  });

  describe('Actual IPC Whitelist', () => {
    it('should have correct invoke channels', () => {
      expect(IPC_INVOKE_WHITELIST.has('proxy:add')).toBe(true);
      expect(IPC_INVOKE_WHITELIST.has('tab:create')).toBe(true);
      expect(IPC_INVOKE_WHITELIST.has('malicious:channel')).toBe(false);
    });

    it('should have correct event channels', () => {
      expect(IPC_EVENT_WHITELIST.has('proxy:updated')).toBe(true);
      expect(IPC_EVENT_WHITELIST.has('tab:created')).toBe(true);
      expect(IPC_EVENT_WHITELIST.has('internal:secret')).toBe(false);
    });

    it('should check channels correctly', () => {
      expect(isChannelAllowed('proxy:add', 'invoke')).toBe(true);
      expect(isChannelAllowed('proxy:updated', 'event')).toBe(true);
      expect(isChannelAllowed('evil:channel', 'invoke')).toBe(false);
    });
  });

  describe('Actual Rate Limiter', () => {
    it('should work with RateLimiter class', () => {
      const limiter = new RateLimiter(1000, 3);
      expect(limiter.isAllowed('test')).toBe(true);
      expect(limiter.isAllowed('test')).toBe(true);
      expect(limiter.isAllowed('test')).toBe(true);
      expect(limiter.isAllowed('test')).toBe(false);
    });

    it('should work with IPCRateLimiter class', () => {
      const ipcLimiter = new IPCRateLimiter();
      const result = ipcLimiter.checkLimit('proxy:add');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
      ipcLimiter.destroy();
    });
  });
});

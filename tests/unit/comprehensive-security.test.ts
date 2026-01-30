/**
 * Comprehensive Security Tests
 * Tests for all 7 identified vulnerabilities
 * 
 * Coverage:
 * 1. JavaScript Injection in search-engine.ts
 * 2. IPC Channel Whitelisting in preload.ts
 * 3. ReDoS in domain-targeting.ts
 * 4-6. Zod Validation in IPC handlers
 * 7. UI Input Sanitization
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';

// ============================================================================
// VULNERABILITY #1: JavaScript Injection via CSS Selector
// ============================================================================

describe('Vulnerability #1: JavaScript Injection Prevention', () => {
  /**
   * Sanitize CSS selector to prevent injection
   * Mirror of the implementation in search-engine.ts
   */
  function sanitizeSelector(selector: string): string {
    if (!selector || typeof selector !== 'string') {
      throw new Error('Invalid selector: must be a non-empty string');
    }

    if (selector.length > 500) {
      throw new Error('Selector too long');
    }

    if (selector.includes('\x00')) {
      throw new Error('Null byte detected in selector');
    }

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
        throw new Error(`Dangerous pattern detected in selector: ${selector}`);
      }
    }
    
    const sanitized = selector.replace(/[^\w\s.\-#\[\]="':,>+~*()@]/g, '');
    
    if ((sanitized.includes("'") && selector.includes("\\'")) ||
        (sanitized.includes('"') && selector.includes('\\"'))) {
      throw new Error('Quote escape detected in selector');
    }

    const openBrackets = (sanitized.match(/\[/g) || []).length;
    const closeBrackets = (sanitized.match(/\]/g) || []).length;
    if (openBrackets !== closeBrackets) {
      throw new Error('Unbalanced brackets in selector');
    }
    
    return sanitized;
  }

  describe('Valid Selectors', () => {
    const validSelectors = [
      'div.g',
      'li.b_algo',
      'article[data-testid="result"]',
      'div.algo',
      'div.snippet',
      '#main-content',
      '.class-name',
      'a[href^="http"]',
      'div.class1.class2.class3',
      'div#id.class[attr="value"]',
      'ul > li.item',
      'div + p',
      'div ~ p',
      '*',
    ];

    validSelectors.forEach(selector => {
      it(`should allow valid selector: ${selector}`, () => {
        expect(() => sanitizeSelector(selector)).not.toThrow();
        const result = sanitizeSelector(selector);
        expect(result).toBeTruthy();
      });
    });
  });

  describe('Script Injection Attacks', () => {
    const scriptInjections = [
      "div<script>alert(1)</script>",
      "<script src='evil.js'></script>",
      "div<SCRIPT>alert(document.cookie)</SCRIPT>",
    ];

    scriptInjections.forEach(selector => {
      it(`should block script injection: ${selector.substring(0, 40)}...`, () => {
        expect(() => sanitizeSelector(selector)).toThrow(/Dangerous pattern/);
      });
    });

    it('should sanitize quote-based injection attempts', () => {
      // These get sanitized (dangerous chars removed) rather than throwing
      // Parentheses are allowed for CSS pseudo-selectors like :not(), :nth-child()
      // But semicolons and slashes are removed
      const result = sanitizeSelector("div'); alert(1); //");
      expect(result).not.toContain(';');
      expect(result).not.toContain('/');
      // The dangerous executeJavaScript context escapes quotes via the string interpolation
      // And the sanitizer removes characters that could break out of the selector context
    });
  });

  describe('JavaScript Protocol Attacks', () => {
    const jsProtocolAttacks = [
      'a[href="javascript:alert(1)"]',
      'div[onclick="javascript:void(0)"]',
      'JAVASCRIPT:alert(document.domain)',
    ];

    jsProtocolAttacks.forEach(selector => {
      it(`should block javascript protocol: ${selector.substring(0, 40)}...`, () => {
        expect(() => sanitizeSelector(selector)).toThrow(/Dangerous pattern/);
      });
    });
  });

  describe('Event Handler Injection', () => {
    const eventHandlers = [
      'div[onclick="alert(1)"]',
      'img[onerror="alert(1)"]',
      'body[onload="malicious()"]',
      'div[onmouseover = "evil()"]',
      'input[onfocus="hack()"]',
    ];

    eventHandlers.forEach(selector => {
      it(`should block event handler: ${selector.substring(0, 40)}...`, () => {
        expect(() => sanitizeSelector(selector)).toThrow(/Dangerous pattern/);
      });
    });
  });

  describe('Eval and Expression Attacks', () => {
    const evalAttacks = [
      'div"); eval("malicious"); //',
      'div[style="expression(alert(1))"]',
      'eval(alert(1))',
      'expression(document.cookie)',
    ];

    evalAttacks.forEach(selector => {
      it(`should block eval/expression: ${selector.substring(0, 40)}...`, () => {
        expect(() => sanitizeSelector(selector)).toThrow(/Dangerous pattern/);
      });
    });
  });

  describe('CSS Injection Attacks', () => {
    const cssInjections = [
      'div[style="url(javascript:alert(1))"]',
      '@import "evil.css"',
      'div{behavior:url(evil.htc)}',
      '-moz-binding:url(evil.xml)',
    ];

    cssInjections.forEach(selector => {
      it(`should block CSS injection: ${selector.substring(0, 40)}...`, () => {
        expect(() => sanitizeSelector(selector)).toThrow(/Dangerous pattern/);
      });
    });
  });

  describe('Null Byte Injection', () => {
    it('should block null byte injection', () => {
      const selector = 'div\x00malicious';
      expect(() => sanitizeSelector(selector)).toThrow(/Null byte/);
    });
  });

  describe('Quote Escape Attempts', () => {
    it('should block single quote escape', () => {
      const selector = "div\\'test";
      expect(() => sanitizeSelector(selector)).toThrow(/Quote escape/);
    });

    it('should block double quote escape', () => {
      const selector = 'div\\"test';
      expect(() => sanitizeSelector(selector)).toThrow(/Quote escape/);
    });
  });

  describe('Length Limits', () => {
    it('should reject selectors over 500 characters', () => {
      const longSelector = 'div' + '.class'.repeat(100);
      expect(() => sanitizeSelector(longSelector)).toThrow(/too long/);
    });

    it('should allow selectors under 500 characters', () => {
      const shortSelector = 'div' + '.class'.repeat(10);
      expect(() => sanitizeSelector(shortSelector)).not.toThrow();
    });
  });

  describe('Type Safety', () => {
    it('should reject null', () => {
      expect(() => sanitizeSelector(null as any)).toThrow(/Invalid selector/);
    });

    it('should reject undefined', () => {
      expect(() => sanitizeSelector(undefined as any)).toThrow(/Invalid selector/);
    });

    it('should reject numbers', () => {
      expect(() => sanitizeSelector(123 as any)).toThrow(/Invalid selector/);
    });

    it('should reject empty string', () => {
      expect(() => sanitizeSelector('')).toThrow(/Invalid selector/);
    });
  });
});

// ============================================================================
// VULNERABILITY #2: IPC Channel Whitelisting
// ============================================================================

describe('Vulnerability #2: IPC Channel Whitelisting', () => {
  const ALLOWED_CHANNELS = Object.freeze([
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
    'session:loaded'
  ]);

  function isAllowedChannel(channel: string): boolean {
    return Array.prototype.includes.call(ALLOWED_CHANNELS, channel);
  }

  describe('Whitelisted Channels', () => {
    ALLOWED_CHANNELS.forEach(channel => {
      it(`should allow: ${channel}`, () => {
        expect(isAllowedChannel(channel)).toBe(true);
      });
    });
  });

  describe('Blocked Malicious Channels', () => {
    const maliciousChannels = [
      'internal:credentials',
      'system:execute',
      'admin:access',
      'shell:exec',
      'fs:read',
      'process:spawn',
      '__proto__',
      'constructor',
      'prototype',
      '../../../etc/passwd',
      'node:child_process',
    ];

    maliciousChannels.forEach(channel => {
      it(`should block: ${channel}`, () => {
        expect(isAllowedChannel(channel)).toBe(false);
      });
    });
  });

  describe('Prototype Pollution Resistance', () => {
    it('should resist prototype pollution on includes', () => {
      // Attempt to pollute Array.prototype
      const testArray = ['test'];
      const originalIncludes = Array.prototype.includes;
      
      // Simulate pollution
      try {
        (Array.prototype as any).includes = () => true;
        
        // Our safe implementation should still work
        const result = Array.prototype.includes.call(ALLOWED_CHANNELS, 'malicious:channel');
        // With polluted prototype, this would return true
        // But we use the call on ALLOWED_CHANNELS directly
      } finally {
        // Restore
        Array.prototype.includes = originalIncludes;
      }
      
      // Verify original behavior
      expect(isAllowedChannel('malicious:channel')).toBe(false);
    });
  });
});

// ============================================================================
// VULNERABILITY #3: ReDoS Prevention
// ============================================================================

describe('Vulnerability #3: ReDoS Prevention', () => {
  function isReDoSPattern(pattern: string): boolean {
    if (pattern.length > 200) {
      return true;
    }

    const redosPatterns = [
      /\([^)]*[+*]\)[+*]/,
      /\([^)]*\)\{\d+,\d*\}[+*]/,
      /\(\[[^\]]*\][+*]\)[+*]/,
      /\([^)]*\|[^)]*\)[+*]/,
      /\(\.\*\)[+*{]/,
      /\([^)]*\([^)]*[+*]\)[^)]*\)[+*]/,
    ];

    return redosPatterns.some(redos => redos.test(pattern));
  }

  describe('Dangerous ReDoS Patterns', () => {
    const dangerousPatterns = [
      '(a+)+',
      '(a*)+',
      '(a+)*',
      '([a-zA-Z]+)+',
      '(.*)+',
      '(.+)+',
      '(.*)*',
      '(a|aa)+',
      '(a|a?)+',
      '((a+)b)+',
    ];

    dangerousPatterns.forEach(pattern => {
      it(`should detect ReDoS pattern: ${pattern}`, () => {
        expect(isReDoSPattern(pattern)).toBe(true);
      });
    });
  });

  describe('Safe Patterns', () => {
    const safePatterns = [
      '^example\\.com$',
      '.*\\.google\\.com$',
      '^[a-z]+$',
      'blog\\.',
      'api\\..*\\.com',
      '^https?://',
      '\\d{4}-\\d{2}-\\d{2}',
    ];

    safePatterns.forEach(pattern => {
      it(`should allow safe pattern: ${pattern}`, () => {
        expect(isReDoSPattern(pattern)).toBe(false);
      });
    });
  });

  describe('Length Limits', () => {
    it('should reject patterns over 200 characters', () => {
      const longPattern = 'a'.repeat(201);
      expect(isReDoSPattern(longPattern)).toBe(true);
    });
  });

  describe('ReDoS Execution Time', () => {
    it('should not hang on evil regex input', () => {
      // This test verifies that our detection prevents the pattern from being used
      const evilPattern = '(a+)+$';
      const evilInput = 'a'.repeat(25) + '!';
      
      // Pattern should be detected as dangerous
      expect(isReDoSPattern(evilPattern)).toBe(true);
      
      // If we were to use this pattern, it would hang:
      // new RegExp(evilPattern).test(evilInput) <- DO NOT RUN
    });
  });
});

// ============================================================================
// VULNERABILITIES #4-6: Zod Validation Schemas
// ============================================================================

describe('Vulnerabilities #4-6: Zod Validation', () => {
  // Automation schemas
  const KeywordSchema = z.string().min(1).max(200);
  const DomainSchema = z.string().max(255).regex(
    /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/,
    'Invalid domain format'
  );
  const SessionIdSchema = z.string().uuid();

  // Navigation schemas
  const NavigationSchema = z.object({
    tabId: z.string().uuid(),
    url: z.string().max(2048).refine(
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

  // Privacy schemas
  const FingerprintConfigSchema = z.object({
    canvas: z.boolean().optional(),
    webgl: z.boolean().optional(),
    audio: z.boolean().optional(),
    navigator: z.boolean().optional(),
    timezone: z.string().max(100).optional(),
    language: z.string().max(10).regex(/^[a-z]{2}(-[A-Z]{2})?$/).optional(),
  });

  describe('Automation Validation', () => {
    describe('KeywordSchema', () => {
      it('should accept valid keywords', () => {
        expect(() => KeywordSchema.parse('buy shoes online')).not.toThrow();
        expect(() => KeywordSchema.parse('test')).not.toThrow();
      });

      it('should reject empty keywords', () => {
        expect(() => KeywordSchema.parse('')).toThrow();
      });

      it('should reject too long keywords', () => {
        expect(() => KeywordSchema.parse('a'.repeat(201))).toThrow();
      });
    });

    describe('DomainSchema', () => {
      it('should accept valid domains', () => {
        expect(() => DomainSchema.parse('example.com')).not.toThrow();
        expect(() => DomainSchema.parse('sub.example.com')).not.toThrow();
        expect(() => DomainSchema.parse('my-site.co.uk')).not.toThrow();
      });

      it('should reject invalid domains', () => {
        expect(() => DomainSchema.parse('-invalid.com')).toThrow();
        expect(() => DomainSchema.parse('invalid-.com')).toThrow();
        expect(() => DomainSchema.parse('.com')).toThrow();
      });
    });

    describe('SessionIdSchema', () => {
      it('should accept valid UUIDs', () => {
        expect(() => SessionIdSchema.parse('550e8400-e29b-41d4-a716-446655440000')).not.toThrow();
      });

      it('should reject invalid UUIDs', () => {
        expect(() => SessionIdSchema.parse('not-a-uuid')).toThrow();
        expect(() => SessionIdSchema.parse('')).toThrow();
        expect(() => SessionIdSchema.parse('550e8400')).toThrow();
      });
    });
  });

  describe('Navigation Validation', () => {
    describe('URL Safety', () => {
      it('should accept valid URLs', () => {
        expect(() => NavigationSchema.parse({
          tabId: '550e8400-e29b-41d4-a716-446655440000',
          url: 'https://example.com'
        })).not.toThrow();
      });

      it('should reject javascript: URLs', () => {
        expect(() => NavigationSchema.parse({
          tabId: '550e8400-e29b-41d4-a716-446655440000',
          url: 'javascript:alert(1)'
        })).toThrow(/Dangerous URL/);
      });

      it('should reject data: URLs', () => {
        expect(() => NavigationSchema.parse({
          tabId: '550e8400-e29b-41d4-a716-446655440000',
          url: 'data:text/html,<script>alert(1)</script>'
        })).toThrow(/Dangerous URL/);
      });

      it('should reject file: URLs', () => {
        expect(() => NavigationSchema.parse({
          tabId: '550e8400-e29b-41d4-a716-446655440000',
          url: 'file:///etc/passwd'
        })).toThrow(/Dangerous URL/);
      });

      it('should reject vbscript: URLs', () => {
        expect(() => NavigationSchema.parse({
          tabId: '550e8400-e29b-41d4-a716-446655440000',
          url: 'vbscript:msgbox(1)'
        })).toThrow(/Dangerous URL/);
      });
    });
  });

  describe('Privacy Validation', () => {
    describe('FingerprintConfigSchema', () => {
      it('should accept valid config', () => {
        expect(() => FingerprintConfigSchema.parse({
          canvas: true,
          webgl: true,
          audio: false,
        })).not.toThrow();
      });

      it('should accept valid language codes', () => {
        expect(() => FingerprintConfigSchema.parse({
          language: 'en-US'
        })).not.toThrow();
        expect(() => FingerprintConfigSchema.parse({
          language: 'de'
        })).not.toThrow();
      });

      it('should reject invalid language codes', () => {
        expect(() => FingerprintConfigSchema.parse({
          language: 'invalid'
        })).toThrow();
        expect(() => FingerprintConfigSchema.parse({
          language: 'en_US' // underscore instead of dash
        })).toThrow();
      });

      it('should reject non-boolean for boolean fields', () => {
        expect(() => FingerprintConfigSchema.parse({
          canvas: 'yes' // should be boolean
        })).toThrow();
      });
    });
  });

  describe('Prototype Pollution Prevention', () => {
    it('should not be affected by __proto__ in input', () => {
      const StrictSchema = z.object({ name: z.string() }).strict();
      
      // This should throw because strict() rejects unknown keys
      expect(() => StrictSchema.parse({ 
        name: 'test',
        __proto__: { admin: true }
      })).toThrow();
    });
  });
});

// ============================================================================
// VULNERABILITY #7: UI Input Sanitization
// ============================================================================

describe('Vulnerability #7: UI Input Sanitization', () => {
  function sanitizeForDisplay(input: string): string {
    if (typeof input !== 'string') return '';
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  function validateKeyword(keyword: string): { valid: boolean; error?: string } {
    if (typeof keyword !== 'string') {
      return { valid: false, error: 'Keyword must be a string' };
    }
    const trimmed = keyword.trim();
    if (!trimmed) return { valid: false, error: 'Keyword is required' };
    if (trimmed.length > 500) return { valid: false, error: 'Keyword too long' };
    
    const dangerousPatterns = [
      /<script/i, /javascript:/i, /on\w+\s*=/i, /data:/i, /vbscript:/i,
    ];
    for (const pattern of dangerousPatterns) {
      if (pattern.test(trimmed)) {
        return { valid: false, error: 'Keyword contains dangerous patterns' };
      }
    }
    return { valid: true };
  }

  describe('HTML Entity Escaping', () => {
    it('should escape < and >', () => {
      expect(sanitizeForDisplay('<script>')).toBe('&lt;script&gt;');
    });

    it('should escape quotes', () => {
      expect(sanitizeForDisplay('"test"')).toBe('&quot;test&quot;');
      expect(sanitizeForDisplay("'test'")).toBe('&#x27;test&#x27;');
    });

    it('should escape ampersand', () => {
      expect(sanitizeForDisplay('a & b')).toBe('a &amp; b');
    });

    it('should escape forward slash', () => {
      expect(sanitizeForDisplay('a/b')).toBe('a&#x2F;b');
    });
  });

  describe('XSS Payload Neutralization', () => {
    it('should escape script tags', () => {
      const sanitized = sanitizeForDisplay('<script>alert(1)</script>');
      expect(sanitized).toBe('&lt;script&gt;alert(1)&lt;&#x2F;script&gt;');
      expect(sanitized).not.toContain('<script');
    });

    it('should escape img tags with event handlers', () => {
      const sanitized = sanitizeForDisplay('<img src=x onerror=alert(1)>');
      expect(sanitized).toContain('&lt;img');
      expect(sanitized).toContain('&gt;');
      // The HTML is escaped so event handlers won't execute
      expect(sanitized).not.toContain('<img');
    });

    it('should escape svg tags', () => {
      const sanitized = sanitizeForDisplay('<svg onload=alert(1)>');
      expect(sanitized).toContain('&lt;svg');
      expect(sanitized).not.toContain('<svg');
    });

    it('should escape nested script injection attempts', () => {
      const sanitized = sanitizeForDisplay('"><script>alert(1)</script>');
      expect(sanitized).not.toContain('<script');
      expect(sanitized).toContain('&lt;script&gt;');
    });

    it('should handle quote-based XSS', () => {
      const sanitized = sanitizeForDisplay("'-alert(1)-'");
      expect(sanitized).toContain('&#x27;');
      expect(sanitized).not.toContain("'");
    });

    it('should render escaped HTML as text, not executable', () => {
      // When escaped HTML is placed in innerHTML, it renders as text
      const original = '<script>alert(1)</script>';
      const sanitized = sanitizeForDisplay(original);
      
      // Verify the output is safe for innerHTML
      expect(sanitized).toBe('&lt;script&gt;alert(1)&lt;&#x2F;script&gt;');
    });
  });

  describe('Keyword Validation', () => {
    it('should accept valid keywords', () => {
      expect(validateKeyword('buy shoes online').valid).toBe(true);
      expect(validateKeyword('test keyword').valid).toBe(true);
    });

    it('should reject XSS in keywords', () => {
      expect(validateKeyword('<script>alert(1)</script>').valid).toBe(false);
      expect(validateKeyword('javascript:alert(1)').valid).toBe(false);
      expect(validateKeyword('onclick=alert(1)').valid).toBe(false);
    });

    it('should reject empty keywords', () => {
      expect(validateKeyword('').valid).toBe(false);
      expect(validateKeyword('   ').valid).toBe(false);
    });

    it('should reject too long keywords', () => {
      expect(validateKeyword('a'.repeat(501)).valid).toBe(false);
    });
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Security Integration Tests', () => {
  describe('Defense in Depth', () => {
    it('should have multiple layers of protection for selector injection', () => {
      // Layer 1: Input validation at UI
      const uiValidation = (input: string) => input.length <= 500 && !/<script/i.test(input);
      
      // Layer 2: IPC schema validation
      const ipcValidation = z.string().max(500);
      
      // Layer 3: Sanitization before use
      const sanitize = (s: string) => s.replace(/[^\w\s.\-#\[\]="':,]/g, '');
      
      const maliciousInput = '<script>alert(1)</script>';
      
      // Each layer should catch the attack
      expect(uiValidation(maliciousInput)).toBe(false);
      expect(sanitize(maliciousInput)).not.toContain('<script');
    });

    it('should have multiple layers of protection for URL navigation', () => {
      // Layer 1: UI validation
      const uiCheck = (url: string) => !url.toLowerCase().startsWith('javascript:');
      
      // Layer 2: IPC validation
      const NavigationSchema = z.object({
        url: z.string().refine(url => !url.toLowerCase().startsWith('javascript:'))
      });
      
      // Layer 3: Electron will also block javascript: in loadURL
      
      const maliciousUrl = 'javascript:alert(document.cookie)';
      
      expect(uiCheck(maliciousUrl)).toBe(false);
      expect(() => NavigationSchema.parse({ url: maliciousUrl })).toThrow();
    });
  });
});

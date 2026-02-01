/**
 * Security Validation Tests
 * Tests for input validation, sanitization, and security controls
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  stripDangerousChars,
  hasXSSPatterns,
  isReDoSVulnerable,
  sanitizeTextInput,
  isPrivateOrBlockedHost,
  validateUrl,
  validateDomain,
  validateKeyword,
  validateNumber,
  sanitizeCSSSelector,
  compileRegexSafely,
  generateSafeJS,
  MAX_LENGTHS,
  MAX_SIZES,
} from '../../../electron/utils/validation';

describe('Security Validation', () => {
  // ==========================================================================
  // XSS Pattern Detection
  // ==========================================================================
  
  describe('hasXSSPatterns', () => {
    it('should detect script tags', () => {
      expect(hasXSSPatterns('<script>alert(1)</script>')).toBe(true);
      expect(hasXSSPatterns('<SCRIPT>alert(1)</SCRIPT>')).toBe(true);
      expect(hasXSSPatterns('<script src="evil.js">')).toBe(true);
    });

    it('should detect javascript: protocol', () => {
      expect(hasXSSPatterns('javascript:alert(1)')).toBe(true);
      expect(hasXSSPatterns('JAVASCRIPT:void(0)')).toBe(true);
    });

    it('should detect event handlers', () => {
      expect(hasXSSPatterns('onclick=alert(1)')).toBe(true);
      expect(hasXSSPatterns('onmouseover = alert(1)')).toBe(true);
      expect(hasXSSPatterns('ONERROR=evil()')).toBe(true);
    });

    it('should detect data: URI with HTML', () => {
      expect(hasXSSPatterns('data:text/html,<script>alert(1)</script>')).toBe(true);
    });

    it('should detect expression()', () => {
      expect(hasXSSPatterns('expression(alert(1))')).toBe(true);
      expect(hasXSSPatterns('EXPRESSION (alert(1))')).toBe(true);
    });

    it('should not flag safe content', () => {
      expect(hasXSSPatterns('normal search term')).toBe(false);
      expect(hasXSSPatterns('buy script writing software')).toBe(false);
      expect(hasXSSPatterns('best javascript tutorial')).toBe(false);
    });
  });

  // ==========================================================================
  // ReDoS Protection
  // ==========================================================================

  describe('isReDoSVulnerable', () => {
    it('should detect nested quantifiers', () => {
      expect(isReDoSVulnerable('(a+)+')).toBe(true);
      expect(isReDoSVulnerable('(a*)+')).toBe(true);
      expect(isReDoSVulnerable('([a-z]+)+')).toBe(true);
    });

    it('should detect catastrophic backtracking patterns', () => {
      expect(isReDoSVulnerable('(.*)*')).toBe(true);
      expect(isReDoSVulnerable('(.+)+')).toBe(true);
      expect(isReDoSVulnerable('(a|aa)+')).toBe(true);
    });

    it('should reject patterns that are too long', () => {
      const longPattern = 'a'.repeat(250);
      expect(isReDoSVulnerable(longPattern)).toBe(true);
    });

    it('should allow safe patterns', () => {
      expect(isReDoSVulnerable('[a-z]+')).toBe(false);
      expect(isReDoSVulnerable('\\d{1,3}')).toBe(false);
      expect(isReDoSVulnerable('example\\.com')).toBe(false);
    });
  });

  // ==========================================================================
  // Input Sanitization
  // ==========================================================================

  describe('stripDangerousChars', () => {
    it('should remove null bytes', () => {
      expect(stripDangerousChars('hello\x00world')).toBe('helloworld');
    });

    it('should remove control characters', () => {
      expect(stripDangerousChars('hello\x01\x02\x03world')).toBe('helloworld');
    });

    it('should preserve newlines and tabs', () => {
      expect(stripDangerousChars('hello\nworld')).toBe('hello\nworld');
      expect(stripDangerousChars('hello\tworld')).toBe('hello\tworld');
    });

    it('should trim whitespace', () => {
      expect(stripDangerousChars('  hello  ')).toBe('hello');
    });
  });

  describe('sanitizeTextInput', () => {
    it('should truncate long input', () => {
      const longInput = 'a'.repeat(2000);
      const result = sanitizeTextInput(longInput, 100);
      expect(result.length).toBe(100);
    });

    it('should handle non-string input', () => {
      expect(sanitizeTextInput(null as unknown as string)).toBe('');
      expect(sanitizeTextInput(undefined as unknown as string)).toBe('');
      expect(sanitizeTextInput(123 as unknown as string)).toBe('');
    });
  });

  // ==========================================================================
  // SSRF Protection
  // ==========================================================================

  describe('isPrivateOrBlockedHost', () => {
    it('should block localhost variants', () => {
      expect(isPrivateOrBlockedHost('localhost')).toBe(true);
      expect(isPrivateOrBlockedHost('127.0.0.1')).toBe(true);
      expect(isPrivateOrBlockedHost('0.0.0.0')).toBe(true);
    });

    it('should block private IP ranges', () => {
      // 10.x.x.x
      expect(isPrivateOrBlockedHost('10.0.0.1')).toBe(true);
      expect(isPrivateOrBlockedHost('10.255.255.255')).toBe(true);
      
      // 172.16-31.x.x
      expect(isPrivateOrBlockedHost('172.16.0.1')).toBe(true);
      expect(isPrivateOrBlockedHost('172.31.255.255')).toBe(true);
      
      // 192.168.x.x
      expect(isPrivateOrBlockedHost('192.168.0.1')).toBe(true);
      expect(isPrivateOrBlockedHost('192.168.255.255')).toBe(true);
    });

    it('should block AWS metadata endpoint', () => {
      expect(isPrivateOrBlockedHost('169.254.169.254')).toBe(true);
    });

    it('should block cloud metadata endpoints', () => {
      expect(isPrivateOrBlockedHost('metadata.google.internal')).toBe(true);
    });

    it('should allow public IPs', () => {
      expect(isPrivateOrBlockedHost('8.8.8.8')).toBe(false);
      expect(isPrivateOrBlockedHost('1.1.1.1')).toBe(false);
    });

    it('should allow public domains', () => {
      expect(isPrivateOrBlockedHost('example.com')).toBe(false);
      expect(isPrivateOrBlockedHost('google.com')).toBe(false);
    });
  });

  // ==========================================================================
  // URL Validation
  // ==========================================================================

  describe('validateUrl', () => {
    it('should accept valid URLs', () => {
      const result = validateUrl('https://example.com');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('https://example.com/');
    });

    it('should add https:// if missing', () => {
      const result = validateUrl('example.com');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toContain('https://');
    });

    it('should reject javascript: protocol', () => {
      const result = validateUrl('javascript:alert(1)');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Blocked protocol');
    });

    it('should reject data: protocol', () => {
      const result = validateUrl('data:text/html,<script>');
      expect(result.valid).toBe(false);
    });

    it('should reject private IPs', () => {
      const result = validateUrl('http://192.168.1.1');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Blocked hostname');
    });

    it('should reject localhost', () => {
      const result = validateUrl('http://localhost:3000');
      expect(result.valid).toBe(false);
    });

    it('should reject URLs with credentials', () => {
      const result = validateUrl('http://user:pass@example.com');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Credentials');
    });

    it('should reject URLs that are too long', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(3000);
      const result = validateUrl(longUrl);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too long');
    });
  });

  // ==========================================================================
  // Domain Validation
  // ==========================================================================

  describe('validateDomain', () => {
    it('should accept valid domains', () => {
      expect(validateDomain('example.com').valid).toBe(true);
      expect(validateDomain('sub.example.com').valid).toBe(true);
      expect(validateDomain('my-site.co.uk').valid).toBe(true);
    });

    it('should lowercase domains', () => {
      const result = validateDomain('EXAMPLE.COM');
      expect(result.sanitized).toBe('example.com');
    });

    it('should reject invalid domain formats', () => {
      expect(validateDomain('-invalid.com').valid).toBe(false);
      expect(validateDomain('invalid-.com').valid).toBe(false);
      expect(validateDomain('inva lid.com').valid).toBe(false);
    });

    it('should reject XSS in domain', () => {
      expect(validateDomain('<script>alert(1)</script>.com').valid).toBe(false);
    });

    it('should reject domains that are too long', () => {
      const longDomain = 'a'.repeat(300) + '.com';
      expect(validateDomain(longDomain).valid).toBe(false);
    });
  });

  // ==========================================================================
  // Keyword Validation
  // ==========================================================================

  describe('validateKeyword', () => {
    it('should accept valid keywords', () => {
      expect(validateKeyword('best coffee shops').valid).toBe(true);
      expect(validateKeyword('how to learn javascript').valid).toBe(true);
    });

    it('should reject XSS attempts', () => {
      expect(validateKeyword('<script>alert(1)</script>').valid).toBe(false);
      expect(validateKeyword('test onclick=evil()').valid).toBe(false);
    });

    it('should reject keywords that are too long', () => {
      const longKeyword = 'a'.repeat(300);
      expect(validateKeyword(longKeyword).valid).toBe(false);
    });

    it('should strip null bytes during sanitization', () => {
      // Null bytes are stripped by sanitization, so input becomes valid
      const result = validateKeyword('test\x00keyword');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('testkeyword'); // Null byte removed
    });
  });

  // ==========================================================================
  // Numeric Validation
  // ==========================================================================

  describe('validateNumber', () => {
    it('should clamp values to range', () => {
      expect(validateNumber(150, 0, 100, 50)).toBe(100);
      expect(validateNumber(-10, 0, 100, 50)).toBe(0);
    });

    it('should return default for non-numbers', () => {
      expect(validateNumber('abc' as unknown as number, 0, 100, 50)).toBe(50);
      expect(validateNumber(NaN, 0, 100, 50)).toBe(50);
      expect(validateNumber(undefined as unknown as number, 0, 100, 50)).toBe(50);
    });

    it('should floor decimal values', () => {
      expect(validateNumber(50.9, 0, 100, 50)).toBe(50);
    });
  });

  // ==========================================================================
  // CSS Selector Validation
  // ==========================================================================

  describe('sanitizeCSSSelector', () => {
    it('should accept valid selectors', () => {
      expect(sanitizeCSSSelector('div.class')).toBe('div.class');
      expect(sanitizeCSSSelector('#id')).toBe('#id');
      expect(sanitizeCSSSelector('a[href]')).toBe('a[href]');
    });

    it('should reject script injection', () => {
      expect(() => sanitizeCSSSelector('<script>alert(1)</script>')).toThrow();
    });

    it('should reject javascript: protocol', () => {
      expect(() => sanitizeCSSSelector('javascript:alert(1)')).toThrow();
    });

    it('should reject expression()', () => {
      expect(() => sanitizeCSSSelector('expression(alert(1))')).toThrow();
    });

    it('should reject selectors that are too long', () => {
      const longSelector = 'div'.repeat(200);
      expect(() => sanitizeCSSSelector(longSelector)).toThrow();
    });

    it('should reject unbalanced brackets', () => {
      expect(() => sanitizeCSSSelector('a[href')).toThrow();
    });

    it('should reject null bytes', () => {
      expect(() => sanitizeCSSSelector('div\x00.class')).toThrow();
    });
  });

  // ==========================================================================
  // Regex Compilation
  // ==========================================================================

  describe('compileRegexSafely', () => {
    it('should compile safe patterns', () => {
      const regex = compileRegexSafely('[a-z]+');
      expect(regex).toBeInstanceOf(RegExp);
      expect(regex.test('hello')).toBe(true);
    });

    it('should reject ReDoS patterns', () => {
      expect(() => compileRegexSafely('(a+)+')).toThrow('ReDoS');
      expect(() => compileRegexSafely('(.*)*')).toThrow('ReDoS');
    });

    it('should reject invalid patterns', () => {
      expect(() => compileRegexSafely('[invalid')).toThrow();
    });

    it('should reject patterns that are too long', () => {
      const longPattern = 'a'.repeat(250);
      expect(() => compileRegexSafely(longPattern)).toThrow();
    });
  });

  // ==========================================================================
  // Safe JavaScript Generation
  // ==========================================================================

  describe('generateSafeJS', () => {
    it('should generate safe scroll script', () => {
      const script = generateSafeJS('scroll', { amount: 100, smooth: true });
      expect(script).toContain('scrollBy');
      expect(script).toContain('100');
      expect(script).toContain('smooth');
    });

    it('should bound scroll amount', () => {
      const script = generateSafeJS('scroll', { amount: 999999 });
      expect(script).toContain('10000'); // Should be capped to max
    });

    it('should generate safe click script', () => {
      const script = generateSafeJS('click', { position: 5 });
      expect(script).toContain('links[5]');
      expect(script).not.toContain('${'); // No template literals with user input
    });

    it('should reject invalid operations', () => {
      expect(() => generateSafeJS('invalid' as any, {})).toThrow();
    });

    it('should generate safe extract results script', () => {
      const script = generateSafeJS('extractResults', { engine: 'google' });
      expect(script).toContain('querySelectorAll');
      expect(script).toContain('div.g'); // Google selector
    });

    it('should reject invalid engine', () => {
      expect(() => generateSafeJS('extractResults', { engine: 'malicious' })).toThrow();
    });
  });

  // ==========================================================================
  // Constants
  // ==========================================================================

  describe('Security Constants', () => {
    it('should have reasonable max lengths', () => {
      expect(MAX_LENGTHS.KEYWORD).toBeLessThanOrEqual(500);
      expect(MAX_LENGTHS.URL).toBeLessThanOrEqual(4096);
      expect(MAX_LENGTHS.SELECTOR).toBeLessThanOrEqual(1000);
    });

    it('should have reasonable max sizes', () => {
      expect(MAX_SIZES.KEYWORDS_QUEUE).toBeLessThanOrEqual(100000);
      expect(MAX_SIZES.CONCURRENT_TABS).toBeLessThanOrEqual(100);
    });
  });
});

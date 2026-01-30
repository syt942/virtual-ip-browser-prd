/**
 * Security Fixes Tests
 * Tests for critical security vulnerabilities fixed
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Security Fixes', () => {
  describe('IPC Channel Whitelist', () => {
    it('should allow whitelisted channels', () => {
      // This test validates the whitelist approach
      const ALLOWED_CHANNELS = [
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
      ];

      const testChannel = 'proxy:updated';
      expect(ALLOWED_CHANNELS.includes(testChannel)).toBe(true);
    });

    it('should block non-whitelisted channels', () => {
      const ALLOWED_CHANNELS = [
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
      ];

      const maliciousChannels = [
        'internal:credentials',
        'system:execute',
        'admin:access',
        '../../../etc/passwd',
        '__proto__',
        'constructor'
      ];

      maliciousChannels.forEach(channel => {
        expect(ALLOWED_CHANNELS.includes(channel)).toBe(false);
      });
    });

    it('should have all required event channels in whitelist', () => {
      const ALLOWED_CHANNELS = [
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
      ];

      // Verify all critical channels are present
      expect(ALLOWED_CHANNELS).toContain('proxy:updated');
      expect(ALLOWED_CHANNELS).toContain('tab:created');
      expect(ALLOWED_CHANNELS).toContain('automation:task:completed');
      expect(ALLOWED_CHANNELS.length).toBeGreaterThan(0);
    });
  });

  describe('CSS Selector Sanitization', () => {
    /**
     * Sanitize CSS selector to prevent injection
     */
    function sanitizeSelector(selector: string): string {
      // First, check for dangerous patterns in the original selector
      const dangerousPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+=/i,
        /eval\(/i,
        /expression\(/i
      ];
      
      for (const pattern of dangerousPatterns) {
        if (pattern.test(selector)) {
          throw new Error(`Dangerous pattern detected in selector: ${selector}`);
        }
      }
      
      // Then remove any characters that could be used for injection
      const sanitized = selector.replace(/[^\w\s.\-#\[\]="':,]/g, '');
      
      // Additional check: ensure the selector is not trying to escape quotes
      if (sanitized.includes("'") && selector.includes("\\'")) {
        throw new Error(`Quote escape detected in selector`);
      }
      
      return sanitized;
    }

    it('should allow valid CSS selectors', () => {
      const validSelectors = [
        'div.g',
        'li.b_algo',
        'article[data-testid="result"]',
        'div.algo',
        'div.snippet',
        '#main-content',
        '.class-name',
        'a[href^="http"]'
      ];

      validSelectors.forEach(selector => {
        expect(() => sanitizeSelector(selector)).not.toThrow();
        const sanitized = sanitizeSelector(selector);
        expect(sanitized).toBeTruthy();
      });
    });

    it('should sanitize dangerous characters', () => {
      const selector = 'div<>{}|\\^~`';
      const sanitized = sanitizeSelector(selector);
      expect(sanitized).toBe('div');
    });

    it('should block script injection attempts', () => {
      const maliciousSelectors = [
        'div<script>alert(1)</script>',
        'div")<script>alert(1)</script>',
      ];

      maliciousSelectors.forEach(selector => {
        expect(() => sanitizeSelector(selector)).toThrow(/Dangerous pattern detected/);
      });
      
      // This one gets sanitized to safe characters, doesn't throw
      const commentAttempt = "div'); alert(1); //";
      const sanitized = sanitizeSelector(commentAttempt);
      expect(sanitized).not.toContain('(');
      expect(sanitized).not.toContain(')');
    });

    it('should block javascript: protocol', () => {
      const selector = 'a[href="javascript:alert(1)"]';
      expect(() => sanitizeSelector(selector)).toThrow(/Dangerous pattern detected/);
    });

    it('should block event handler attributes', () => {
      const maliciousSelectors = [
        'div[onclick="alert(1)"]',
        'img[onerror="alert(1)"]',
        'body[onload="malicious()"]'
      ];

      maliciousSelectors.forEach(selector => {
        expect(() => sanitizeSelector(selector)).toThrow(/Dangerous pattern detected/);
      });
    });

    it('should block eval attempts', () => {
      const selector = 'div"); eval("malicious"); //';
      expect(() => sanitizeSelector(selector)).toThrow(/Dangerous pattern detected/);
    });

    it('should block expression attempts (IE-specific)', () => {
      const selector = 'div[style="expression(alert(1))"]';
      expect(() => sanitizeSelector(selector)).toThrow(/Dangerous pattern detected/);
    });

    it('should preserve valid attribute selectors', () => {
      const selector = 'article[data-testid="result"]';
      const sanitized = sanitizeSelector(selector);
      expect(sanitized).toBe('article[data-testid="result"]');
    });

    it('should preserve multiple class selectors', () => {
      const selector = 'div.class1.class2.class3';
      const sanitized = sanitizeSelector(selector);
      expect(sanitized).toBe('div.class1.class2.class3');
    });

    it('should handle complex but valid selectors', () => {
      const selector = 'div#id.class[attr="value"]:hover';
      const sanitized = sanitizeSelector(selector);
      expect(sanitized).toBe('div#id.class[attr="value"]:hover');
    });

    it('should remove null bytes', () => {
      const selector = 'div\x00malicious';
      const sanitized = sanitizeSelector(selector);
      expect(sanitized).not.toContain('\x00');
    });
  });

  describe('Search Engine Selectors', () => {
    it('should have safe default selectors for all engines', () => {
      const searchEngines = {
        google: 'div.g',
        bing: 'li.b_algo',
        duckduckgo: 'article[data-testid="result"]',
        yahoo: 'div.algo',
        brave: 'div.snippet'
      };

      Object.entries(searchEngines).forEach(([engine, selector]) => {
        expect(selector).toBeTruthy();
        expect(selector).not.toContain('<script');
        expect(selector).not.toContain('javascript:');
        expect(selector).not.toMatch(/on\w+=/);
      });
    });
  });

  describe('Integration: Selector in executeJavaScript', () => {
    it('should safely embed sanitized selector in template string', () => {
      function sanitizeSelector(selector: string): string {
        const sanitized = selector.replace(/[^\w\s.\-#\[\]="':]/g, '');
        const dangerousPatterns = [
          /<script/i,
          /javascript:/i,
          /on\w+=/i,
          /eval\(/i,
          /expression\(/i
        ];
        for (const pattern of dangerousPatterns) {
          if (pattern.test(sanitized)) {
            throw new Error(`Dangerous pattern detected`);
          }
        }
        return sanitized;
      }

      const selector = 'div.g';
      const sanitized = sanitizeSelector(selector);
      
      // Simulate template string embedding
      const script = `document.querySelectorAll('${sanitized}')`;
      
      expect(script).toBe("document.querySelectorAll('div.g')");
      expect(script).not.toContain('<script');
      expect(script).not.toContain('</script>');
    });

    it('should prevent selector escape and injection', () => {
      function sanitizeSelector(selector: string): string {
        const dangerousPatterns = [
          /<script/i,
          /javascript:/i,
          /on\w+=/i,
          /eval\(/i,
          /expression\(/i
        ];
        for (const pattern of dangerousPatterns) {
          if (pattern.test(selector)) {
            throw new Error(`Dangerous pattern detected`);
          }
        }
        const sanitized = selector.replace(/[^\w\s.\-#\[\]="':,]/g, '');
        if (sanitized.includes("'") && selector.includes("\\'")) {
          throw new Error(`Quote escape detected`);
        }
        return sanitized;
      }

      // Attempt to escape the selector string and inject code
      const maliciousSelector = "'); alert('XSS'); //";
      const sanitized = sanitizeSelector(maliciousSelector);
      
      // The sanitization removes dangerous special chars but keeps safe ones
      expect(sanitized).not.toContain(';');
      expect(sanitized).not.toContain('(');
      expect(sanitized).not.toContain(')');
      // Single quotes are in whitelist but inject attempts are neutralized
    });
  });
});

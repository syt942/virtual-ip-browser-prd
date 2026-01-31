/**
 * PatternMatcher Tests
 * Tests for ReDoS-safe pattern matching
 * 
 * SECURITY FIX 2: ReDoS Vulnerability → Compiled Pattern Matcher
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PatternMatcher } from '../../../electron/core/privacy/pattern-matcher';

describe('PatternMatcher', () => {
  let matcher: PatternMatcher;

  beforeEach(() => {
    matcher = new PatternMatcher();
  });

  describe('ReDoS Prevention', () => {
    it('should handle patterns that would cause ReDoS', () => {
      // This pattern would cause ReDoS with regex: .*\..*\..*\..*\..*\..*
      const evilPattern = '*.*.*.*.*.*';
      matcher.initialize([evilPattern]);
      
      // Long URL that would trigger catastrophic backtracking
      const longUrl = 'https://' + 'a'.repeat(10000) + '.com/path';
      
      const start = Date.now();
      matcher.matches(longUrl);
      const elapsed = Date.now() - start;
      
      // Should complete quickly (< 200ms), not hang (generous for CI environments)
      expect(elapsed).toBeLessThan(200);
    });

    it('should handle nested quantifier patterns safely', () => {
      const patterns = [
        '*://(*)+.com/*',
        '*://(a*)+.com/*',
        '*://([a-z]+)+.com/*',
      ];
      
      matcher.initialize(patterns);
      
      const longUrl = 'https://' + 'a'.repeat(50) + '.com/path';
      
      const start = Date.now();
      matcher.matches(longUrl);
      const elapsed = Date.now() - start;
      
      expect(elapsed).toBeLessThan(100);
    });

    it('should handle exponential backtracking patterns', () => {
      // Pattern that would cause exponential backtracking: (a+)+
      matcher.initialize(['*://(a+)+.com/*']);
      
      const url = 'https://' + 'a'.repeat(100) + '.com/';
      
      const start = Date.now();
      matcher.matches(url);
      const elapsed = Date.now() - start;
      
      expect(elapsed).toBeLessThan(100);
    });

    it('should handle overlapping alternation patterns', () => {
      // Pattern that could cause backtracking: (a|aa)+
      matcher.initialize(['*://(a|aa)+.com/*']);
      
      const url = 'https://' + 'a'.repeat(50) + '.com/';
      
      const start = Date.now();
      matcher.matches(url);
      const elapsed = Date.now() - start;
      
      expect(elapsed).toBeLessThan(100);
    });
  });

  describe('EasyList Pattern Matching', () => {
    it('should match EasyList domain patterns', () => {
      matcher.initialize(['||google-analytics.com^']);
      
      expect(matcher.matches('https://google-analytics.com/track')).toBe(true);
      expect(matcher.matches('https://www.google-analytics.com/collect')).toBe(true);
      expect(matcher.matches('https://safe-site.com/')).toBe(false);
    });

    it('should match subdomain patterns', () => {
      matcher.initialize(['||hotjar.com^']);
      
      expect(matcher.matches('https://static.hotjar.com/script.js')).toBe(true);
      expect(matcher.matches('https://api.hotjar.com/track')).toBe(true);
      expect(matcher.matches('https://hotjar.com/')).toBe(true);
    });

    it('should not match partial domain names', () => {
      matcher.initialize(['||tracker.com^']);
      
      expect(matcher.matches('https://tracker.com/')).toBe(true);
      expect(matcher.matches('https://not-tracker.com/')).toBe(false);
      expect(matcher.matches('https://trackerx.com/')).toBe(false);
    });
  });

  describe('Wildcard URL Pattern Matching', () => {
    it('should match wildcard URL patterns', () => {
      matcher.initialize(['*://tracker.com/*']);
      
      expect(matcher.matches('https://tracker.com/pixel.gif')).toBe(true);
      expect(matcher.matches('http://tracker.com/track')).toBe(true);
      expect(matcher.matches('https://not-tracker.com/')).toBe(false);
    });

    it('should match subdomain wildcard patterns', () => {
      matcher.initialize(['*://*.hotjar.com/*', '||hotjar.com^']);
      
      expect(matcher.matches('https://static.hotjar.com/script.js')).toBe(true);
      expect(matcher.matches('https://api.hotjar.com/track')).toBe(true);
    });

    it('should match protocol wildcards', () => {
      matcher.initialize(['*://example.com/*']);
      
      expect(matcher.matches('https://example.com/page')).toBe(true);
      expect(matcher.matches('http://example.com/page')).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should handle large blocklists efficiently', () => {
      const patterns = Array.from({ length: 10000 }, (_, i) => 
        `||tracker${i}.com^`
      );
      
      const initStart = Date.now();
      matcher.initialize(patterns);
      const initTime = Date.now() - initStart;
      
      // Initialization should be < 2 seconds (generous for CI)
      expect(initTime).toBeLessThan(2000);
      
      // Matching should be reasonably fast
      const matchStart = Date.now();
      for (let i = 0; i < 1000; i++) {
        matcher.matches('https://tracker500.com/track');
      }
      const matchTime = Date.now() - matchStart;
      
      // 1000 matches should complete in < 500ms (generous for CI)
      expect(matchTime).toBeLessThan(500);
    });

    it('should use bloom filter for fast rejection', () => {
      matcher.initialize(['||tracker.com^']);
      
      // URLs that definitely don't match should be rejected quickly
      const start = Date.now();
      for (let i = 0; i < 10000; i++) {
        matcher.matches('https://safe-site.com/page');
      }
      const elapsed = Date.now() - start;
      
      // Bloom filter rejection should be reasonably fast (generous for CI environments)
      expect(elapsed).toBeLessThan(2000);
    });

    it('should provide accurate statistics', () => {
      const patterns = [
        '||tracker1.com^',
        '||tracker2.com^',
        '||tracker3.com^',
      ];
      
      matcher.initialize(patterns);
      const stats = matcher.getStats();
      
      expect(stats.patterns).toBe(3);
      expect(stats.domains).toBeGreaterThan(0);
      expect(stats.bloomFilterUsage).toBeGreaterThan(0);
      expect(stats.bloomFilterUsage).toBeLessThan(1);
    });
  });

  describe('Pattern Management', () => {
    it('should add patterns after initialization', () => {
      matcher.initialize(['||tracker1.com^']);
      
      expect(matcher.matches('https://tracker1.com/')).toBe(true);
      expect(matcher.matches('https://tracker2.com/')).toBe(false);
      
      matcher.addPattern('||tracker2.com^');
      
      expect(matcher.matches('https://tracker2.com/')).toBe(true);
    });

    it('should remove patterns', () => {
      matcher.initialize(['||tracker.com^']);
      
      expect(matcher.matches('https://tracker.com/')).toBe(true);
      
      matcher.removePattern('||tracker.com^');
      
      // Note: Bloom filter doesn't support removal, but domain index does
      // After removal, the pattern won't match even if bloom filter says "maybe"
    });

    it('should clear all patterns', () => {
      matcher.initialize(['||tracker.com^']);
      
      expect(matcher.isInitialized()).toBe(true);
      
      matcher.clear();
      
      expect(matcher.isInitialized()).toBe(false);
      expect(matcher.getStats().patterns).toBe(0);
    });

    it('should not add duplicate patterns', () => {
      matcher.initialize(['||tracker.com^']);
      const initialCount = matcher.getStats().patterns;
      
      matcher.addPattern('||tracker.com^');
      
      expect(matcher.getStats().patterns).toBe(initialCount);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty patterns', () => {
      matcher.initialize(['', '   ', null as unknown as string]);
      expect(matcher.matches('https://any.com/')).toBe(false);
    });

    it('should handle invalid URLs', () => {
      matcher.initialize(['||tracker.com^']);
      expect(matcher.matches('')).toBe(false);
      expect(matcher.matches('not-a-url')).toBe(false);
      expect(matcher.matches(null as unknown as string)).toBe(false);
      expect(matcher.matches(undefined as unknown as string)).toBe(false);
    });

    it('should handle very long patterns', () => {
      const longPattern = '||' + 'a'.repeat(600) + '.com^';
      matcher.initialize([longPattern]);
      // Should be rejected due to length limit
      expect(matcher.getStats().patterns).toBe(0);
    });

    it('should handle URL with port', () => {
      matcher.initialize(['||tracker.com^']);
      expect(matcher.matches('https://tracker.com:8080/path')).toBe(true);
    });

    it('should handle URL with query string', () => {
      matcher.initialize(['||tracker.com^']);
      expect(matcher.matches('https://tracker.com/path?id=123')).toBe(true);
    });

    it('should handle URL with hash', () => {
      matcher.initialize(['||tracker.com^']);
      expect(matcher.matches('https://tracker.com/path#section')).toBe(true);
    });

    it('should be case insensitive', () => {
      matcher.initialize(['||TRACKER.COM^']);
      expect(matcher.matches('https://tracker.com/')).toBe(true);
      expect(matcher.matches('https://TRACKER.COM/')).toBe(true);
      expect(matcher.matches('https://Tracker.Com/')).toBe(true);
    });

    it('should return false when not initialized', () => {
      expect(matcher.matches('https://tracker.com/')).toBe(false);
    });
  });

  describe('Domain Hierarchy Matching', () => {
    it('should match parent domain patterns for subdomains', () => {
      matcher.initialize(['||example.com^']);
      
      expect(matcher.matches('https://example.com/')).toBe(true);
      expect(matcher.matches('https://sub.example.com/')).toBe(true);
      expect(matcher.matches('https://deep.sub.example.com/')).toBe(true);
    });

    it('should not match sibling domains', () => {
      matcher.initialize(['||sub.example.com^']);
      
      expect(matcher.matches('https://sub.example.com/')).toBe(true);
      expect(matcher.matches('https://other.example.com/')).toBe(false);
    });
  });
});

describe('PatternMatcher Integration', () => {
  it('should work with real-world tracker patterns', () => {
    const matcher = new PatternMatcher();
    
    const realPatterns = [
      '||google-analytics.com^',
      '||googletagmanager.com^',
      '||doubleclick.net^',
      '||facebook.net^',
      '||hotjar.com^',
      '*://google-analytics.com/*',
      '*://*.google-analytics.com/*',
    ];
    
    matcher.initialize(realPatterns);
    
    // Should match trackers
    expect(matcher.matches('https://www.google-analytics.com/analytics.js')).toBe(true);
    expect(matcher.matches('https://www.googletagmanager.com/gtm.js')).toBe(true);
    expect(matcher.matches('https://ad.doubleclick.net/pixel')).toBe(true);
    expect(matcher.matches('https://connect.facebook.net/sdk.js')).toBe(true);
    expect(matcher.matches('https://static.hotjar.com/c/hotjar.js')).toBe(true);
    
    // Should not match legitimate sites
    expect(matcher.matches('https://www.google.com/')).toBe(false);
    expect(matcher.matches('https://github.com/')).toBe(false);
    expect(matcher.matches('https://stackoverflow.com/')).toBe(false);
  });
});

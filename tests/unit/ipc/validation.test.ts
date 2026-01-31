/**
 * IPC Validation Schema Tests
 * Tests for input validation schemas used in IPC handlers
 * 
 * Coverage targets:
 * - ProxyConfigSchema validation
 * - SafeUrlSchema (SSRF protection)
 * - AutomationConfigSchema
 * - DomainPatternSchema (ReDoS prevention)
 * - validateInput helper
 */

import { describe, it, expect } from 'vitest';
import {
  ProxyConfigSchema,
  ProxyIdSchema,
  SafeUrlSchema,
  AutomationConfigSchema,
  DomainSchema,
  DomainPatternSchema,
  KeywordSchema,
  FingerprintConfigSchema,
  RotationConfigSchema,
  validateInput,
  createValidatedHandler,
} from '../../../electron/ipc/validation';

describe('IPC Validation Schemas', () => {
  // ============================================================
  // PROXY CONFIG SCHEMA TESTS
  // ============================================================
  describe('ProxyConfigSchema', () => {
    it('validates correct proxy config', () => {
      const validConfig = {
        host: 'proxy.example.com',
        port: 8080,
        protocol: 'https',
        name: 'Test Proxy',
      };

      const result = ProxyConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
    });

    it('rejects host with XSS patterns', () => {
      const xssConfigs = [
        { host: '<script>alert(1)</script>', port: 8080, protocol: 'http' },
        { host: 'test.com<script>', port: 8080, protocol: 'http' },
        { host: 'javascript:alert(1)', port: 8080, protocol: 'http' },
      ];

      xssConfigs.forEach(config => {
        const result = ProxyConfigSchema.safeParse(config);
        expect(result.success).toBe(false);
      });
    });

    it('rejects invalid port range', () => {
      const invalidPorts = [0, -1, 65536, 70000];

      invalidPorts.forEach(port => {
        const result = ProxyConfigSchema.safeParse({
          host: 'proxy.example.com',
          port,
          protocol: 'http',
        });
        expect(result.success).toBe(false);
      });
    });

    it('sanitizes null bytes from strings', () => {
      const config = {
        host: 'proxy\0.example.com',
        port: 8080,
        protocol: 'http',
      };

      const result = ProxyConfigSchema.safeParse(config);
      // After sanitization, the host should fail validation (contains null byte which is stripped, then checked)
      // The transform sanitizes it, then refine checks the pattern
      if (result.success) {
        expect(result.data.host).not.toContain('\0');
      }
    });

    it('validates protocol enum', () => {
      const validProtocols = ['http', 'https', 'socks4', 'socks5'];
      
      validProtocols.forEach(protocol => {
        const result = ProxyConfigSchema.safeParse({
          host: 'proxy.example.com',
          port: 8080,
          protocol,
        });
        expect(result.success).toBe(true);
      });

      const invalidResult = ProxyConfigSchema.safeParse({
        host: 'proxy.example.com',
        port: 8080,
        protocol: 'invalid',
      });
      expect(invalidResult.success).toBe(false);
    });

    it('accepts optional username and password', () => {
      const result = ProxyConfigSchema.safeParse({
        host: 'proxy.example.com',
        port: 8080,
        protocol: 'http',
        username: 'user',
        password: 'pass',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.username).toBe('user');
        expect(result.data.password).toBe('pass');
      }
    });

    it('rejects empty host', () => {
      const result = ProxyConfigSchema.safeParse({
        host: '',
        port: 8080,
        protocol: 'http',
      });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================
  // SAFE URL SCHEMA TESTS (SSRF Prevention)
  // ============================================================
  describe('SafeUrlSchema', () => {
    it('accepts valid http/https URLs', () => {
      const validUrls = [
        'https://example.com',
        'http://example.com/path',
        'https://sub.example.com:8080/path?query=1',
      ];

      validUrls.forEach(url => {
        const result = SafeUrlSchema.safeParse(url);
        expect(result.success).toBe(true);
      });
    });

    it('rejects javascript: protocol', () => {
      const result = SafeUrlSchema.safeParse('javascript:alert(1)');
      expect(result.success).toBe(false);
    });

    it('rejects private IP addresses', () => {
      const privateIPs = [
        'http://10.0.0.1',
        'http://172.16.0.1',
        'http://192.168.1.1',
        'http://127.0.0.1',
      ];

      privateIPs.forEach(url => {
        const result = SafeUrlSchema.safeParse(url);
        expect(result.success).toBe(false);
      });
    });

    it('rejects localhost', () => {
      const localhostUrls = [
        'http://localhost',
        'http://localhost:8080',
        'http://127.0.0.1:3000',
      ];

      localhostUrls.forEach(url => {
        const result = SafeUrlSchema.safeParse(url);
        expect(result.success).toBe(false);
      });
    });

    it('rejects AWS metadata endpoint', () => {
      const metadataUrls = [
        'http://169.254.169.254',
        'http://169.254.169.254/latest/meta-data',
      ];

      metadataUrls.forEach(url => {
        const result = SafeUrlSchema.safeParse(url);
        expect(result.success).toBe(false);
      });
    });

    it('accepts relative URLs', () => {
      const relativeUrls = ['/page', './resource', '/path/to/page'];

      relativeUrls.forEach(url => {
        const result = SafeUrlSchema.safeParse(url);
        expect(result.success).toBe(true);
      });
    });

    it('rejects URLs with credentials', () => {
      const result = SafeUrlSchema.safeParse('http://user:pass@example.com');
      expect(result.success).toBe(false);
    });

    it('rejects data: URLs', () => {
      const result = SafeUrlSchema.safeParse('data:text/html,<script>alert(1)</script>');
      expect(result.success).toBe(false);
    });
  });

  // ============================================================
  // AUTOMATION CONFIG SCHEMA TESTS
  // ============================================================
  describe('AutomationConfigSchema', () => {
    it('validates keywords array max length', () => {
      // 100 keywords should pass
      const validConfig = {
        keywords: Array(100).fill('keyword'),
        engine: 'google',
      };
      const validResult = AutomationConfigSchema.safeParse(validConfig);
      expect(validResult.success).toBe(true);

      // 101 keywords should fail
      const invalidConfig = {
        keywords: Array(101).fill('keyword'),
        engine: 'google',
      };
      const invalidResult = AutomationConfigSchema.safeParse(invalidConfig);
      expect(invalidResult.success).toBe(false);
    });

    it('validates search engine enum', () => {
      const validEngines = ['google', 'bing', 'duckduckgo', 'yahoo', 'brave'];

      validEngines.forEach(engine => {
        const result = AutomationConfigSchema.safeParse({ engine });
        expect(result.success).toBe(true);
      });

      const invalidResult = AutomationConfigSchema.safeParse({ engine: 'invalid' });
      expect(invalidResult.success).toBe(false);
    });

    it('validates delay range', () => {
      // Min delay is 1000ms
      const tooShort = AutomationConfigSchema.safeParse({
        delayBetweenSearches: 500,
      });
      expect(tooShort.success).toBe(false);

      // Max delay is 60000ms
      const tooLong = AutomationConfigSchema.safeParse({
        delayBetweenSearches: 70000,
      });
      expect(tooLong.success).toBe(false);

      // Valid delay
      const valid = AutomationConfigSchema.safeParse({
        delayBetweenSearches: 5000,
      });
      expect(valid.success).toBe(true);
    });

    it('applies default values', () => {
      const result = AutomationConfigSchema.safeParse({});
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.keywords).toEqual([]);
        expect(result.data.engine).toBe('google');
        expect(result.data.targetDomains).toEqual([]);
        expect(result.data.maxRetries).toBe(3);
        expect(result.data.delayBetweenSearches).toBe(3000);
      }
    });

    it('validates maxRetries range', () => {
      const valid = AutomationConfigSchema.safeParse({ maxRetries: 5 });
      expect(valid.success).toBe(true);

      const tooHigh = AutomationConfigSchema.safeParse({ maxRetries: 15 });
      expect(tooHigh.success).toBe(false);

      const negative = AutomationConfigSchema.safeParse({ maxRetries: -1 });
      expect(negative.success).toBe(false);
    });
  });

  // ============================================================
  // DOMAIN PATTERN SCHEMA TESTS
  // ============================================================
  describe('DomainPatternSchema', () => {
    it('rejects ReDoS patterns', () => {
      const redosPatterns = [
        '(.*)+',
        '(.+)+',
        '(a+)+',
        '([a-z]+)+',
      ];

      redosPatterns.forEach(pattern => {
        const result = DomainPatternSchema.safeParse(pattern);
        expect(result.success).toBe(false);
      });
    });

    it('validates regex syntax', () => {
      // Invalid regex
      const invalidResult = DomainPatternSchema.safeParse('[invalid');
      expect(invalidResult.success).toBe(false);

      // Valid regex
      const validResult = DomainPatternSchema.safeParse('^example\\.com$');
      expect(validResult.success).toBe(true);
    });

    it('accepts valid patterns', () => {
      const validPatterns = [
        '.*\\.example\\.com',
        '^test\\.com$',
        'domain\\.com',
        '',
        undefined,
      ];

      validPatterns.forEach(pattern => {
        const result = DomainPatternSchema.safeParse(pattern);
        expect(result.success).toBe(true);
      });
    });

    it('rejects patterns that are too long', () => {
      const longPattern = 'a'.repeat(201);
      const result = DomainPatternSchema.safeParse(longPattern);
      expect(result.success).toBe(false);
    });
  });

  // ============================================================
  // KEYWORD SCHEMA TESTS
  // ============================================================
  describe('KeywordSchema', () => {
    it('accepts valid keywords', () => {
      const validKeywords = ['test', 'search term', 'keyword-with-dashes'];

      validKeywords.forEach(keyword => {
        const result = KeywordSchema.safeParse(keyword);
        expect(result.success).toBe(true);
      });
    });

    it('rejects XSS patterns in keywords', () => {
      const xssKeywords = [
        '<script>alert(1)</script>',
        'test<script>',
        'javascript:void(0)',
        'onload=alert(1)',
      ];

      xssKeywords.forEach(keyword => {
        const result = KeywordSchema.safeParse(keyword);
        expect(result.success).toBe(false);
      });
    });

    it('rejects empty keywords', () => {
      const result = KeywordSchema.safeParse('');
      expect(result.success).toBe(false);
    });

    it('rejects keywords that are too long', () => {
      const longKeyword = 'a'.repeat(201);
      const result = KeywordSchema.safeParse(longKeyword);
      expect(result.success).toBe(false);
    });
  });

  // ============================================================
  // DOMAIN SCHEMA TESTS
  // ============================================================
  describe('DomainSchema', () => {
    it('accepts valid domains', () => {
      const validDomains = [
        'example.com',
        'sub.example.com',
        'test-domain.co.uk',
      ];

      validDomains.forEach(domain => {
        const result = DomainSchema.safeParse(domain);
        expect(result.success).toBe(true);
      });
    });

    it('converts domains to lowercase', () => {
      const result = DomainSchema.safeParse('EXAMPLE.COM');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('example.com');
      }
    });

    it('rejects invalid domain formats', () => {
      const invalidDomains = [
        'http://example.com',
        '-invalid.com',
        'invalid-.com',
        '',
      ];

      invalidDomains.forEach(domain => {
        const result = DomainSchema.safeParse(domain);
        expect(result.success).toBe(false);
      });
    });
  });

  // ============================================================
  // ROTATION CONFIG SCHEMA TESTS
  // ============================================================
  describe('RotationConfigSchema', () => {
    it('validates strategy enum', () => {
      const validStrategies = ['round-robin', 'random', 'least-used', 'fastest', 'failure-aware'];

      validStrategies.forEach(strategy => {
        const result = RotationConfigSchema.safeParse({ strategy });
        expect(result.success).toBe(true);
      });

      const invalidResult = RotationConfigSchema.safeParse({ strategy: 'invalid' });
      expect(invalidResult.success).toBe(false);
    });

    it('validates interval range', () => {
      // Max is 3600000 (1 hour)
      const tooLong = RotationConfigSchema.safeParse({
        strategy: 'round-robin',
        interval: 4000000,
      });
      expect(tooLong.success).toBe(false);

      const valid = RotationConfigSchema.safeParse({
        strategy: 'round-robin',
        interval: 60000,
      });
      expect(valid.success).toBe(true);
    });
  });

  // ============================================================
  // VALIDATE INPUT HELPER TESTS
  // ============================================================
  describe('validateInput', () => {
    it('returns data on success', () => {
      const result = validateInput(ProxyIdSchema, '00000000-0000-4000-a000-000000000001');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('00000000-0000-4000-a000-000000000001');
      }
    });

    it('returns formatted error on failure', () => {
      const result = validateInput(ProxyIdSchema, 'invalid-uuid');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(typeof result.error).toBe('string');
      }
    });

    it('handles complex validation errors', () => {
      const result = validateInput(ProxyConfigSchema, {
        host: '',
        port: -1,
        protocol: 'invalid',
      });

      expect(result.success).toBe(false);
    });
  });

  // ============================================================
  // CREATE VALIDATED HANDLER TESTS
  // ============================================================
  describe('createValidatedHandler', () => {
    it('calls handler with validated data', async () => {
      const handler = createValidatedHandler(
        ProxyIdSchema,
        async (id: string) => ({ proxyId: id })
      );

      const result = await handler('00000000-0000-4000-a000-000000000001');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ proxyId: '00000000-0000-4000-a000-000000000001' });
    });

    it('returns error for invalid input', async () => {
      const handler = createValidatedHandler(
        ProxyIdSchema,
        async (id: string) => ({ proxyId: id })
      );

      const result = await handler('invalid');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('handles handler errors gracefully', async () => {
      const handler = createValidatedHandler(
        ProxyIdSchema,
        async () => { throw new Error('Handler error'); }
      );

      const result = await handler('00000000-0000-4000-a000-000000000001');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Handler error');
    });
  });
});

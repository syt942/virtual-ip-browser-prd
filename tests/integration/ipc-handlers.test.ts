/**
 * IPC Handlers Integration Tests
 * Tests for IPC handler integration with validation and rate limiting
 * 
 * Coverage targets:
 * - Proxy handlers
 * - Navigation handlers
 * - Privacy handlers
 * - Automation handlers
 * - Rate limiting integration
 * - Validation integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ProxyConfigSchema,
  ProxyIdSchema,
  SafeUrlSchema,
  AutomationConfigSchema,
  FingerprintConfigSchema,
  RotationConfigSchema,
  KeywordSchema,
  DomainSchema,
  TabIdSchema,
  WebRTCToggleSchema,
  TrackerBlockingToggleSchema,
  validateInput,
  createValidatedHandler,
} from '../../electron/ipc/validation';
import { 
  RateLimiter, 
  IPCRateLimiter,
  resetIPCRateLimiter 
} from '../../electron/ipc/rate-limiter';

// Mock proxy manager
const mockProxyManager = {
  addProxy: vi.fn(),
  removeProxy: vi.fn(),
  validateProxy: vi.fn(),
  setRotationStrategy: vi.fn(),
  getProxies: vi.fn(),
};

// Mock tab manager
const mockTabManager = {
  createTab: vi.fn(),
  closeTab: vi.fn(),
  navigateTo: vi.fn(),
  goBack: vi.fn(),
  goForward: vi.fn(),
  reload: vi.fn(),
};

// Mock privacy manager
const mockPrivacyManager = {
  setFingerprint: vi.fn(),
  toggleWebRTC: vi.fn(),
  toggleTrackerBlocking: vi.fn(),
};

describe('IPC Handlers Integration', () => {
  let rateLimiter: IPCRateLimiter;

  beforeEach(() => {
    resetIPCRateLimiter();
    rateLimiter = new IPCRateLimiter();
    vi.clearAllMocks();
  });

  afterEach(() => {
    rateLimiter.destroy();
  });

  // ============================================================
  // PROXY HANDLER TESTS
  // ============================================================
  describe('Proxy IPC Handlers', () => {
    describe('proxy:add', () => {
      it('returns rate limit error when exceeded', async () => {
        // Arrange - exhaust rate limit (10 per minute)
        const channel = 'proxy:add';
        for (let i = 0; i < 10; i++) {
          rateLimiter.checkLimit(channel, 'client-1');
        }

        // Act
        const result = rateLimiter.checkLimit(channel, 'client-1');

        // Assert
        expect(result.allowed).toBe(false);
        expect(result.retryAfter).toBeGreaterThan(0);
      });

      it('returns validation error for invalid config', () => {
        // Arrange
        const invalidConfig = {
          host: '', // Empty host
          port: 70000, // Invalid port
          protocol: 'invalid',
        };

        // Act
        const result = validateInput(ProxyConfigSchema, invalidConfig);

        // Assert
        expect(result.success).toBe(false);
      });

      it('validates and processes valid proxy config', async () => {
        // Arrange
        const validConfig = {
          host: 'proxy.example.com',
          port: 8080,
          protocol: 'https',
          name: 'Test Proxy',
        };

        mockProxyManager.addProxy.mockResolvedValue({
          id: 'proxy-123',
          ...validConfig,
          status: 'checking',
        });

        const handler = createValidatedHandler(
          ProxyConfigSchema,
          async (config) => mockProxyManager.addProxy(config)
        );

        // Act
        const result = await handler(validConfig);

        // Assert
        expect(result.success).toBe(true);
        expect(mockProxyManager.addProxy).toHaveBeenCalledWith(
          expect.objectContaining({ host: 'proxy.example.com' })
        );
      });

      it('blocks XSS in proxy host', () => {
        // Arrange
        const xssConfig = {
          host: '<script>alert(1)</script>',
          port: 8080,
          protocol: 'http',
        };

        // Act
        const result = validateInput(ProxyConfigSchema, xssConfig);

        // Assert
        expect(result.success).toBe(false);
      });
    });

    describe('proxy:remove', () => {
      it('validates UUID format', () => {
        // Arrange
        const invalidId = 'not-a-uuid';

        // Act
        const result = validateInput(ProxyIdSchema, invalidId);

        // Assert
        expect(result.success).toBe(false);
      });

      it('accepts valid UUID', () => {
        // Arrange
        const validId = '00000000-0000-4000-a000-000000000001';

        // Act
        const result = validateInput(ProxyIdSchema, validId);

        // Assert
        expect(result.success).toBe(true);
      });
    });

    describe('proxy:validate', () => {
      it('handles validation with rate limiting', async () => {
        // Arrange
        const channel = 'proxy:validate';
        
        // Act - make requests within limit
        for (let i = 0; i < 20; i++) {
          const result = rateLimiter.checkLimit(channel, 'client-1');
          expect(result.allowed).toBe(true);
        }

        // 21st request should be blocked
        const blocked = rateLimiter.checkLimit(channel, 'client-1');
        expect(blocked.allowed).toBe(false);
      });
    });

    describe('proxy:set-rotation', () => {
      it('validates rotation strategy enum', () => {
        // Valid strategies
        const validStrategies = ['round-robin', 'random', 'least-used', 'fastest', 'failure-aware'];
        validStrategies.forEach(strategy => {
          const result = validateInput(RotationConfigSchema, { strategy });
          expect(result.success).toBe(true);
        });

        // Invalid strategy
        const invalidResult = validateInput(RotationConfigSchema, { strategy: 'invalid' });
        expect(invalidResult.success).toBe(false);
      });
    });
  });

  // ============================================================
  // NAVIGATION HANDLER TESTS
  // ============================================================
  describe('Navigation IPC Handlers', () => {
    describe('tab:navigate', () => {
      it('sanitizes URL before navigation', () => {
        // Arrange
        const urlWithSpaces = '  https://example.com  ';

        // Act
        const result = validateInput(SafeUrlSchema, urlWithSpaces);

        // Assert
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe('https://example.com');
        }
      });

      it('blocks dangerous URLs', () => {
        // Arrange
        const dangerousUrls = [
          'javascript:alert(1)',
          'http://localhost',
          'http://127.0.0.1',
          'http://169.254.169.254',
          'http://10.0.0.1',
        ];

        // Act & Assert
        dangerousUrls.forEach(url => {
          const result = validateInput(SafeUrlSchema, url);
          expect(result.success).toBe(false);
        });
      });

      it('validates tab ID format', () => {
        // Invalid
        expect(validateInput(TabIdSchema, 'invalid').success).toBe(false);
        
        // Valid
        expect(validateInput(TabIdSchema, '00000000-0000-4000-a000-000000000001').success).toBe(true);
      });

      it('allows relative URLs', () => {
        // Arrange
        const relativeUrls = ['/page', './resource', '/path/to/page'];

        // Act & Assert
        relativeUrls.forEach(url => {
          const result = validateInput(SafeUrlSchema, url);
          expect(result.success).toBe(true);
        });
      });
    });

    describe('tab navigation controls', () => {
      it('tab:create respects rate limits', () => {
        // Arrange - tab:create has 50 per minute limit
        const channel = 'tab:create';
        
        // Act
        for (let i = 0; i < 50; i++) {
          expect(rateLimiter.checkLimit(channel, 'client').allowed).toBe(true);
        }
        
        // Assert - 51st should be blocked
        expect(rateLimiter.checkLimit(channel, 'client').allowed).toBe(false);
      });

      it('tab:navigate has higher rate limit', () => {
        // tab:navigate has 100 per minute limit
        const channel = 'tab:navigate';
        
        for (let i = 0; i < 100; i++) {
          expect(rateLimiter.checkLimit(channel, 'client').allowed).toBe(true);
        }
        
        expect(rateLimiter.checkLimit(channel, 'client').allowed).toBe(false);
      });
    });
  });

  // ============================================================
  // PRIVACY HANDLER TESTS
  // ============================================================
  describe('Privacy IPC Handlers', () => {
    describe('privacy:set-fingerprint', () => {
      it('validates fingerprint config schema', () => {
        // Valid config
        const validConfig = {
          canvas: true,
          webgl: true,
          audio: false,
          navigator: true,
          webrtc: false,
          trackerBlocking: true,
        };

        const result = validateInput(FingerprintConfigSchema, validConfig);
        expect(result.success).toBe(true);
      });

      it('applies default values for missing fields', () => {
        // Act
        const result = validateInput(FingerprintConfigSchema, {});

        // Assert
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.canvas).toBe(true);
          expect(result.data.webgl).toBe(true);
        }
      });

      it('validates screen dimensions range', () => {
        // Valid dimensions
        const validScreen = {
          screen: { width: 1920, height: 1080 },
        };
        expect(validateInput(FingerprintConfigSchema, validScreen).success).toBe(true);

        // Invalid dimensions
        const invalidScreen = {
          screen: { width: 100, height: 100 }, // Too small
        };
        expect(validateInput(FingerprintConfigSchema, invalidScreen).success).toBe(false);
      });

      it('validates platform enum', () => {
        // Valid platforms
        ['Win32', 'MacIntel', 'Linux x86_64'].forEach(platform => {
          const result = validateInput(FingerprintConfigSchema, { platform });
          expect(result.success).toBe(true);
        });

        // Invalid platform
        const result = validateInput(FingerprintConfigSchema, { platform: 'InvalidOS' });
        expect(result.success).toBe(false);
      });
    });

    describe('privacy:toggle-webrtc', () => {
      it('validates boolean input', () => {
        // Valid
        expect(validateInput(WebRTCToggleSchema, true).success).toBe(true);
        expect(validateInput(WebRTCToggleSchema, false).success).toBe(true);

        // Invalid
        expect(validateInput(WebRTCToggleSchema, 'true').success).toBe(false);
        expect(validateInput(WebRTCToggleSchema, 1).success).toBe(false);
      });
    });

    describe('privacy:toggle-tracker-blocking', () => {
      it('validates boolean input', () => {
        // Valid
        expect(validateInput(TrackerBlockingToggleSchema, true).success).toBe(true);
        expect(validateInput(TrackerBlockingToggleSchema, false).success).toBe(true);
      });
    });
  });

  // ============================================================
  // AUTOMATION HANDLER TESTS
  // ============================================================
  describe('Automation IPC Handlers', () => {
    describe('automation:start-search', () => {
      it('has strict rate limit', () => {
        // automation:start-search has 5 per minute limit
        const channel = 'automation:start-search';
        
        for (let i = 0; i < 5; i++) {
          expect(rateLimiter.checkLimit(channel, 'client').allowed).toBe(true);
        }
        
        expect(rateLimiter.checkLimit(channel, 'client').allowed).toBe(false);
      });

      it('validates automation config', () => {
        const validConfig = {
          keywords: ['test keyword'],
          engine: 'google',
          targetDomains: ['example.com'],
          delayBetweenSearches: 5000,
        };

        const result = validateInput(AutomationConfigSchema, validConfig);
        expect(result.success).toBe(true);
      });

      it('rejects too many keywords', () => {
        const config = {
          keywords: Array(101).fill('keyword'), // Max is 100
        };

        const result = validateInput(AutomationConfigSchema, config);
        expect(result.success).toBe(false);
      });

      it('rejects invalid delay', () => {
        // Too short
        expect(validateInput(AutomationConfigSchema, { delayBetweenSearches: 500 }).success).toBe(false);
        
        // Too long
        expect(validateInput(AutomationConfigSchema, { delayBetweenSearches: 70000 }).success).toBe(false);
      });
    });

    describe('automation:add-keyword', () => {
      it('sanitizes keyword input', () => {
        // Valid
        expect(validateInput(KeywordSchema, 'test keyword').success).toBe(true);
        
        // XSS blocked
        expect(validateInput(KeywordSchema, '<script>alert(1)</script>').success).toBe(false);
      });

      it('has moderate rate limit', () => {
        // automation:add-keyword has 50 per minute limit
        const channel = 'automation:add-keyword';
        
        for (let i = 0; i < 50; i++) {
          expect(rateLimiter.checkLimit(channel, 'client').allowed).toBe(true);
        }
        
        expect(rateLimiter.checkLimit(channel, 'client').allowed).toBe(false);
      });
    });

    describe('automation:add-domain', () => {
      it('validates domain format', () => {
        // Valid
        expect(validateInput(DomainSchema, 'example.com').success).toBe(true);
        expect(validateInput(DomainSchema, 'sub.example.com').success).toBe(true);
        
        // Invalid
        expect(validateInput(DomainSchema, 'http://example.com').success).toBe(false);
        expect(validateInput(DomainSchema, '-invalid.com').success).toBe(false);
      });

      it('converts domain to lowercase', () => {
        const result = validateInput(DomainSchema, 'EXAMPLE.COM');
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe('example.com');
        }
      });
    });
  });

  // ============================================================
  // CROSS-CUTTING CONCERNS
  // ============================================================
  describe('Cross-cutting Concerns', () => {
    it('rate limiter tracks per-client', () => {
      const channel = 'proxy:add';
      
      // Exhaust limit for client-1
      for (let i = 0; i < 10; i++) {
        rateLimiter.checkLimit(channel, 'client-1');
      }
      
      // client-1 should be blocked
      expect(rateLimiter.checkLimit(channel, 'client-1').allowed).toBe(false);
      
      // client-2 should still be allowed
      expect(rateLimiter.checkLimit(channel, 'client-2').allowed).toBe(true);
    });

    it('validated handler integrates with error handling', async () => {
      const handler = createValidatedHandler(
        ProxyConfigSchema,
        async () => { throw new Error('Test error'); }
      );

      const result = await handler({
        host: 'proxy.example.com',
        port: 8080,
        protocol: 'https',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Test error');
    });

    it('null byte injection is prevented', () => {
      const config = {
        host: 'proxy\x00.example.com',
        port: 8080,
        protocol: 'http',
      };

      const result = validateInput(ProxyConfigSchema, config);
      // After sanitization, null bytes are stripped
      if (result.success) {
        expect(result.data.host).not.toContain('\x00');
      }
    });
  });
});

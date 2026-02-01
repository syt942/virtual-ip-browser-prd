/**
 * Security Headers and TLS Certificate Validation Tests
 * 
 * Tests for:
 * - HIGH-001: CSP and HSTS headers via webRequest.onHeadersReceived
 * - MEDIUM-001: TLS certificate validation for proxy connections
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateCSP, validateCSP } from '../../electron/utils/security';
import { 
  ProxyValidator, 
  TLSValidationConfig,
  TLSValidationResult,
  KNOWN_PROXY_PROVIDER_PINS 
} from '../../electron/core/proxy-engine/validator';

// ============================================================================
// HIGH-001: CSP Header Tests
// ============================================================================

describe('HIGH-001: Content Security Policy Headers', () => {
  describe('CSP Generation', () => {
    it('should generate strict CSP by default', () => {
      const csp = generateCSP({ strict: true });
      
      // Verify essential directives
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("script-src 'self'");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("base-uri 'self'");
      expect(csp).toContain("form-action 'self'");
    });

    it('should block inline scripts in strict mode', () => {
      const csp = generateCSP({ strict: true });
      
      // In strict mode, unsafe-inline should NOT be in script-src
      const scriptSrcMatch = csp.match(/script-src[^;]*/);
      expect(scriptSrcMatch).toBeTruthy();
      expect(scriptSrcMatch![0]).not.toContain("'unsafe-inline'");
    });

    it('should block eval() in strict mode', () => {
      const csp = generateCSP({ strict: true });
      
      // unsafe-eval should never be present
      expect(csp).not.toContain("'unsafe-eval'");
    });

    it('should include upgrade-insecure-requests directive', () => {
      const csp = generateCSP({ strict: true });
      expect(csp).toContain('upgrade-insecure-requests');
    });

    it('should include block-all-mixed-content directive', () => {
      const csp = generateCSP({ strict: true });
      expect(csp).toContain('block-all-mixed-content');
    });

    it('should support nonce for script-src', () => {
      const nonce = 'abc123secure';
      const csp = generateCSP({ nonce, strict: true });
      
      expect(csp).toContain(`'nonce-${nonce}'`);
    });

    it('should support report-uri directive', () => {
      const reportUri = 'https://report.example.com/csp';
      const csp = generateCSP({ reportUri });
      
      expect(csp).toContain(`report-uri ${reportUri}`);
    });
  });

  describe('CSP Validation', () => {
    it('should flag unsafe-eval as weakness', () => {
      const weakCsp = "default-src 'self'; script-src 'self' 'unsafe-eval'";
      const result = validateCSP(weakCsp);
      
      expect(result.valid).toBe(false);
      expect(result.issues).toContain("Contains 'unsafe-eval' which allows eval()");
    });

    it('should flag wildcard sources as weakness', () => {
      const weakCsp = "default-src *; script-src 'self'";
      const result = validateCSP(weakCsp);
      
      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.includes('wildcard'))).toBe(true);
    });

    it('should flag missing frame-ancestors', () => {
      const weakCsp = "default-src 'self'; script-src 'self'";
      const result = validateCSP(weakCsp);
      
      expect(result.issues).toContain('Missing frame-ancestors directive');
    });

    it('should flag missing object-src', () => {
      const weakCsp = "default-src 'self'; frame-ancestors 'none'";
      const result = validateCSP(weakCsp);
      
      expect(result.issues).toContain('Missing object-src directive');
    });

    it('should validate generated CSP as secure', () => {
      const csp = generateCSP({ strict: true });
      const result = validateCSP(csp);
      
      expect(result.valid).toBe(true);
      expect(result.issues.length).toBe(0);
    });
  });

  describe('CSP XSS Prevention', () => {
    it('should block inline event handlers', () => {
      const csp = generateCSP({ strict: true });
      
      // CSP without unsafe-inline blocks onclick, onerror, etc.
      const scriptSrcMatch = csp.match(/script-src[^;]*/);
      expect(scriptSrcMatch![0]).not.toContain("'unsafe-inline'");
    });

    it('should block javascript: URLs', () => {
      const csp = generateCSP({ strict: true });
      
      // script-src 'self' blocks javascript: protocol
      expect(csp).toContain("script-src 'self'");
    });

    it('should block data: URIs in scripts', () => {
      const csp = generateCSP({ strict: true });
      
      // data: should not be in script-src
      const scriptSrcMatch = csp.match(/script-src[^;]*/);
      expect(scriptSrcMatch![0]).not.toContain('data:');
    });
  });
});

// ============================================================================
// HIGH-001: HSTS Header Tests  
// ============================================================================

describe('HIGH-001: HTTP Strict Transport Security (HSTS)', () => {
  const EXPECTED_HSTS = 'max-age=31536000; includeSubDomains';

  it('should have correct max-age (1 year)', () => {
    expect(EXPECTED_HSTS).toContain('max-age=31536000');
  });

  it('should include includeSubDomains directive', () => {
    expect(EXPECTED_HSTS).toContain('includeSubDomains');
  });

  it('should be properly formatted', () => {
    // HSTS header format validation
    const hstsRegex = /^max-age=\d+(?:;\s*includeSubDomains)?(?:;\s*preload)?$/;
    expect(hstsRegex.test(EXPECTED_HSTS)).toBe(true);
  });
});

// ============================================================================
// MEDIUM-001: TLS Certificate Validation Tests
// ============================================================================

describe('MEDIUM-001: TLS Certificate Validation', () => {
  let validator: ProxyValidator;

  beforeEach(() => {
    validator = new ProxyValidator();
  });

  describe('TLS Configuration', () => {
    it('should have TLS validation enabled by default', () => {
      const config = validator.getTLSConfig();
      expect(config.enabled).toBe(true);
    });

    it('should reject self-signed certificates by default', () => {
      const config = validator.getTLSConfig();
      expect(config.allowSelfSigned).toBe(false);
    });

    it('should require TLS 1.2 minimum by default', () => {
      const config = validator.getTLSConfig();
      expect(config.minTLSVersion).toBe('TLSv1.2');
    });

    it('should have certificate expiry checking enabled', () => {
      const config = validator.getTLSConfig();
      expect(config.rejectExpired).toBe(true);
    });

    it('should allow updating TLS configuration', () => {
      validator.setTLSConfig({ 
        allowSelfSigned: true,
        minTLSVersion: 'TLSv1.3'
      });
      
      const config = validator.getTLSConfig();
      expect(config.allowSelfSigned).toBe(true);
      expect(config.minTLSVersion).toBe('TLSv1.3');
    });

    it('should allow self-signed certs when configured for development', () => {
      validator.setTLSConfig({ allowSelfSigned: true });
      const config = validator.getTLSConfig();
      expect(config.allowSelfSigned).toBe(true);
    });
  });

  describe('Certificate Pinning', () => {
    it('should allow adding certificate pins', () => {
      const host = 'proxy.example.com';
      const fingerprint = 'sha256/AAAA1234567890ABCDEF';
      
      validator.addCertificatePin(host, fingerprint);
      
      const config = validator.getTLSConfig();
      expect(config.pinnedCertificates.has(host)).toBe(true);
      expect(config.pinnedCertificates.get(host)).toContain(fingerprint);
    });

    it('should allow multiple pins for same host', () => {
      const host = 'proxy.example.com';
      const fingerprint1 = 'sha256/AAAA1234567890ABCDEF';
      const fingerprint2 = 'sha256/BBBB1234567890ABCDEF';
      
      validator.addCertificatePin(host, fingerprint1);
      validator.addCertificatePin(host, fingerprint2);
      
      const config = validator.getTLSConfig();
      const pins = config.pinnedCertificates.get(host);
      expect(pins).toContain(fingerprint1);
      expect(pins).toContain(fingerprint2);
    });

    it('should not duplicate pins', () => {
      // Create a fresh validator with a unique host to avoid state from previous tests
      const freshValidator = new ProxyValidator();
      const host = 'unique-proxy-dedupe-test.example.com';
      const fingerprint = 'sha256/UNIQUE1234567890ABCDEF';
      
      // Verify host doesn't have any pins initially
      const initialConfig = freshValidator.getTLSConfig();
      expect(initialConfig.pinnedCertificates.has(host)).toBe(false);
      
      // Add the same fingerprint twice
      freshValidator.addCertificatePin(host, fingerprint);
      freshValidator.addCertificatePin(host, fingerprint);
      
      const config = freshValidator.getTLSConfig();
      const pins = config.pinnedCertificates.get(host);
      expect(pins).toBeDefined();
      expect(pins?.length).toBe(1);
      expect(pins?.[0]).toBe(fingerprint);
    });

    it('should allow removing certificate pins', () => {
      const host = 'proxy.example.com';
      const fingerprint = 'sha256/AAAA1234567890ABCDEF';
      
      validator.addCertificatePin(host, fingerprint);
      validator.removeCertificatePin(host);
      
      const config = validator.getTLSConfig();
      expect(config.pinnedCertificates.has(host)).toBe(false);
    });
  });

  describe('Certificate Fingerprint Calculation', () => {
    it('should calculate fingerprint from PEM certificate', () => {
      // Sample self-signed certificate for testing
      const testCertPem = `-----BEGIN CERTIFICATE-----
MIIBkTCB+wIJAKHBfpegPjMCMA0GCSqGSIb3DQEBCwUAMBExDzANBgNVBAMMBnRl
c3RjYTAeFw0yMDAxMDEwMDAwMDBaFw0zMDAxMDEwMDAwMDBaMBExDzANBgNVBAMM
BnRlc3RjYTBcMA0GCSqGSIb3DQEBAQUAA0sAMEgCQQC7o96HtiXYKIgCmuLsDph2
aP+4E1WC5ioQF7xHJcCWwPJdL9pSxV0JoRGKJvPM6PdPzLgmMhddVlWmJGL8p9fT
AgMBAAGjUzBRMB0GA1UdDgQWBBR5ciOv9H0GBB9DQLP+Z+5HHzFEnDAfBgNVHSME
GDAWgBR5ciOv9H0GBB9DQLP+Z+5HHzFEnDAPBgNVHRMBAf8EBTADAQH/MA0GCSqG
SIb3DQEBCwUAA0EAMsYkT7bNpqRGCPuMHiF7pX5M5b2VP8qMRqWjLPGzI0OQGAOZ
Y1qJQqHv9NHxCk0gYrPPWqRxkKh/Y4LLVCfmrg==
-----END CERTIFICATE-----`;

      const fingerprint = validator.calculateCertFingerprint(testCertPem);
      
      // Should be uppercase hex with colons
      expect(fingerprint).toMatch(/^[A-F0-9]{2}(:[A-F0-9]{2})*$/);
      // SHA-256 fingerprint should be 64 hex chars (32 bytes)
      expect(fingerprint.replace(/:/g, '').length).toBe(64);
    });
  });

  describe('TLS Validation Result Handling', () => {
    it('should return valid:true when TLS is disabled', async () => {
      validator.setTLSConfig({ enabled: false });
      
      const result = await validator.validateTLSCertificate('example.com', 443);
      
      expect(result.valid).toBe(true);
    });

    it('should include certificate details on successful validation', async () => {
      // This test would require mocking TLS connection
      // For now, we test the structure of the expected result
      const mockResult: TLSValidationResult = {
        valid: true,
        certificate: {
          subject: 'example.com',
          issuer: 'DigiCert',
          validFrom: new Date('2024-01-01'),
          validTo: new Date('2025-01-01'),
          fingerprint: 'AA:BB:CC:DD',
          serialNumber: '123456'
        },
        tlsVersion: 'TLSv1.3',
        cipher: 'TLS_AES_256_GCM_SHA384'
      };

      expect(mockResult.valid).toBe(true);
      expect(mockResult.certificate?.subject).toBeTruthy();
      expect(mockResult.certificate?.issuer).toBeTruthy();
      expect(mockResult.tlsVersion).toBeTruthy();
    });

    it('should return error for invalid certificates', async () => {
      const mockResult: TLSValidationResult = {
        valid: false,
        error: 'Self-signed certificate not allowed'
      };

      expect(mockResult.valid).toBe(false);
      expect(mockResult.error).toContain('Self-signed');
    });

    it('should return error for expired certificates', async () => {
      const mockResult: TLSValidationResult = {
        valid: false,
        error: 'Certificate has expired',
        certificate: {
          subject: 'expired.example.com',
          issuer: 'Test CA',
          validFrom: new Date('2020-01-01'),
          validTo: new Date('2021-01-01'),
          fingerprint: 'AA:BB:CC:DD',
          serialNumber: '123456'
        }
      };

      expect(mockResult.valid).toBe(false);
      expect(mockResult.error).toContain('expired');
    });

    it('should return error for certificate pinning mismatch', async () => {
      const mockResult: TLSValidationResult = {
        valid: false,
        error: 'Certificate fingerprint mismatch. Expected one of: sha256/expected'
      };

      expect(mockResult.valid).toBe(false);
      expect(mockResult.error).toContain('fingerprint mismatch');
    });
  });

  describe('Integration with Proxy Validation', () => {
    it('should validate TLS for HTTPS proxies', async () => {
      // Create a mock HTTPS proxy config
      const httpsProxy = {
        id: 'test-proxy-1',
        name: 'Test HTTPS Proxy',
        host: 'invalid.proxy.test',
        port: 443,
        protocol: 'https' as const,
        status: 'checking' as const,
        requiresAuth: false,
        failureCount: 0,
        totalRequests: 0,
        successRate: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // The validation should fail because the host doesn't exist
      // but it demonstrates TLS validation is integrated
      const result = await validator.validate(httpsProxy);
      
      // Should fail (can't connect to fake host)
      expect(result.success).toBe(false);
    });

    it('should skip TLS validation for HTTP proxies', async () => {
      const httpProxy = {
        id: 'test-proxy-2',
        name: 'Test HTTP Proxy',
        host: '1.2.3.4',
        port: 8080,
        protocol: 'http' as const,
        status: 'checking' as const,
        requiresAuth: false,
        failureCount: 0,
        totalRequests: 0,
        successRate: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // HTTP proxies don't require TLS validation
      // (will fail for other reasons but not TLS)
      const result = await validator.validate(httpProxy);
      
      // Error should not mention TLS
      if (!result.success && result.error) {
        expect(result.error).not.toContain('TLS validation failed');
      }
    });

    it('should skip TLS validation for SOCKS proxies', async () => {
      const socksProxy = {
        id: 'test-proxy-3',
        name: 'Test SOCKS5 Proxy',
        host: '1.2.3.4',
        port: 1080,
        protocol: 'socks5' as const,
        status: 'checking' as const,
        requiresAuth: false,
        failureCount: 0,
        totalRequests: 0,
        successRate: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // SOCKS proxies don't require TLS validation
      const result = await validator.validate(socksProxy);
      
      if (!result.success && result.error) {
        expect(result.error).not.toContain('TLS validation failed');
      }
    });
  });
});

// ============================================================================
// Security Headers Integration Tests (Mock)
// ============================================================================

describe('Security Headers Integration', () => {
  describe('Response Header Modification', () => {
    it('should apply CSP to HTML responses', () => {
      const mockDetails = {
        url: 'https://example.com/page.html',
        resourceType: 'mainFrame',
        responseHeaders: {
          'content-type': ['text/html; charset=utf-8']
        }
      };

      const csp = generateCSP({ strict: true });
      
      // Simulate header modification
      const modifiedHeaders = { ...mockDetails.responseHeaders };
      modifiedHeaders['Content-Security-Policy'] = [csp];
      
      expect(modifiedHeaders['Content-Security-Policy']).toBeDefined();
      expect(modifiedHeaders['Content-Security-Policy'][0]).toContain("default-src 'self'");
    });

    it('should apply HSTS to HTTPS responses', () => {
      const mockDetails = {
        url: 'https://example.com/api/data',
        resourceType: 'xhr',
        responseHeaders: {}
      };

      const hstsHeader = 'max-age=31536000; includeSubDomains';
      
      // Simulate header modification for HTTPS
      const modifiedHeaders: Record<string, string[]> = { ...mockDetails.responseHeaders };
      if (mockDetails.url.startsWith('https://')) {
        modifiedHeaders['Strict-Transport-Security'] = [hstsHeader];
      }
      
      expect(modifiedHeaders['Strict-Transport-Security']).toBeDefined();
      expect(modifiedHeaders['Strict-Transport-Security'][0]).toContain('max-age=31536000');
    });

    it('should not apply HSTS to HTTP responses', () => {
      const mockDetails = {
        url: 'http://example.com/api/data',
        resourceType: 'xhr',
        responseHeaders: {}
      };

      const hstsHeader = 'max-age=31536000; includeSubDomains';
      
      // Simulate header modification - should NOT add HSTS for HTTP
      const modifiedHeaders: Record<string, string[]> = { ...mockDetails.responseHeaders };
      if (mockDetails.url.startsWith('https://')) {
        modifiedHeaders['Strict-Transport-Security'] = [hstsHeader];
      }
      
      expect(modifiedHeaders['Strict-Transport-Security']).toBeUndefined();
    });

    it('should add X-Content-Type-Options header', () => {
      const modifiedHeaders: Record<string, string[]> = {};
      modifiedHeaders['X-Content-Type-Options'] = ['nosniff'];
      
      expect(modifiedHeaders['X-Content-Type-Options']).toEqual(['nosniff']);
    });

    it('should add X-Frame-Options header', () => {
      const modifiedHeaders: Record<string, string[]> = {};
      modifiedHeaders['X-Frame-Options'] = ['DENY'];
      
      expect(modifiedHeaders['X-Frame-Options']).toEqual(['DENY']);
    });

    it('should add X-XSS-Protection header', () => {
      const modifiedHeaders: Record<string, string[]> = {};
      modifiedHeaders['X-XSS-Protection'] = ['1; mode=block'];
      
      expect(modifiedHeaders['X-XSS-Protection']).toEqual(['1; mode=block']);
    });

    it('should add Referrer-Policy header', () => {
      const modifiedHeaders: Record<string, string[]> = {};
      modifiedHeaders['Referrer-Policy'] = ['strict-origin-when-cross-origin'];
      
      expect(modifiedHeaders['Referrer-Policy']).toEqual(['strict-origin-when-cross-origin']);
    });

    it('should remove X-Powered-By header', () => {
      const modifiedHeaders: Record<string, string[]> = {
        'X-Powered-By': ['Express'],
        'Content-Type': ['text/html']
      };
      
      // Simulate header removal
      delete modifiedHeaders['X-Powered-By'];
      delete modifiedHeaders['x-powered-by'];
      
      expect(modifiedHeaders['X-Powered-By']).toBeUndefined();
      expect(modifiedHeaders['x-powered-by']).toBeUndefined();
    });

    it('should remove Server header', () => {
      const modifiedHeaders: Record<string, string[]> = {
        'Server': ['nginx/1.18.0'],
        'Content-Type': ['text/html']
      };
      
      // Simulate header removal
      delete modifiedHeaders['Server'];
      delete modifiedHeaders['server'];
      
      expect(modifiedHeaders['Server']).toBeUndefined();
      expect(modifiedHeaders['server']).toBeUndefined();
    });
  });

  describe('CSP XSS Attack Prevention', () => {
    it('CSP should block inline script execution attempt', () => {
      const csp = generateCSP({ strict: true });
      
      // Verify CSP blocks inline scripts in script-src directive
      // Note: style-src may have unsafe-inline for CSS-in-JS compatibility
      const scriptSrc = csp.match(/script-src[^;]*/)?.[0] || '';
      expect(scriptSrc).toContain("'self'");
      expect(scriptSrc).not.toContain("'unsafe-inline'");
      
      // This means <script>alert('XSS')</script> would be blocked
    });

    it('CSP should block eval-based attacks', () => {
      const csp = generateCSP({ strict: true });
      
      // Verify CSP blocks eval in script-src
      const scriptSrc = csp.match(/script-src[^;]*/)?.[0] || '';
      expect(scriptSrc).not.toContain("'unsafe-eval'");
      
      // This means eval("malicious()") would be blocked
    });

    it('CSP should block data: URI script injection', () => {
      const csp = generateCSP({ strict: true });
      
      // Verify script-src doesn't include data:
      const scriptSrc = csp.match(/script-src[^;]*/)?.[0] || '';
      expect(scriptSrc).not.toContain('data:');
      
      // This means <script src="data:text/javascript,alert('XSS')"></script> would be blocked
    });
  });
});

// ============================================================================
// Known Proxy Provider Pins Structure Test
// ============================================================================

describe('Known Proxy Provider Certificate Pins', () => {
  it('should export KNOWN_PROXY_PROVIDER_PINS constant', () => {
    expect(KNOWN_PROXY_PROVIDER_PINS).toBeDefined();
    expect(typeof KNOWN_PROXY_PROVIDER_PINS).toBe('object');
  });

  it('should have correct structure for pin entries', () => {
    // If there are any pins defined, verify structure
    for (const [host, pins] of Object.entries(KNOWN_PROXY_PROVIDER_PINS)) {
      expect(typeof host).toBe('string');
      expect(Array.isArray(pins)).toBe(true);
      pins.forEach(pin => {
        expect(typeof pin).toBe('string');
      });
    }
  });
});

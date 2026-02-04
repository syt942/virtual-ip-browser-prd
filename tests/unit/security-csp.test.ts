/**
 * CSP Security Headers Unit Tests
 * Tests for electron/utils/security.ts CSP generation and validation
 * 
 * Coverage:
 * - CSP header generation with various options
 * - CSP validation for common weaknesses
 * - Nonce generation for CSP
 * - Security header application in main process
 */

import { describe, it, expect } from 'vitest';
import { generateCSP, validateCSP, generateNonce } from '../../electron/utils/security';

describe('CSP Security Headers', () => {
  describe('generateCSP()', () => {
    it('should generate strict CSP by default', () => {
      const csp = generateCSP();
      
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("script-src 'self'");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("upgrade-insecure-requests");
      expect(csp).toContain("block-all-mixed-content");
    });

    it('should generate CSP with nonce when provided', () => {
      const nonce = 'abc123def456';
      const csp = generateCSP({ nonce });
      
      expect(csp).toContain(`script-src 'self' 'nonce-${nonce}'`);
    });

    it('should generate non-strict CSP when strict=false', () => {
      const csp = generateCSP({ strict: false });
      
      expect(csp).toContain("script-src 'self' 'unsafe-inline'");
    });

    it('should include report-uri when provided', () => {
      const reportUri = '/csp-report';
      const csp = generateCSP({ reportUri });
      
      expect(csp).toContain(`report-uri ${reportUri}`);
    });

    it('should allow data: URIs for images', () => {
      const csp = generateCSP();
      
      expect(csp).toContain("img-src 'self' data: https:");
    });

    it('should allow unsafe-inline for styles (for CSS-in-JS)', () => {
      const csp = generateCSP();
      
      expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    });

    it('should set base-uri to self', () => {
      const csp = generateCSP();
      
      expect(csp).toContain("base-uri 'self'");
    });

    it('should set form-action to self', () => {
      const csp = generateCSP();
      
      expect(csp).toContain("form-action 'self'");
    });
  });

  describe('validateCSP()', () => {
    it('should validate secure CSP as valid', () => {
      const csp = generateCSP({ strict: true });
      const result = validateCSP(csp);
      
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect unsafe-eval', () => {
      const csp = "script-src 'self' 'unsafe-eval'";
      const result = validateCSP(csp);
      
      expect(result.valid).toBe(false);
      expect(result.issues).toContain("Contains 'unsafe-eval' which allows eval()");
    });

    it('should detect wildcard sources', () => {
      const csp = "script-src *";
      const result = validateCSP(csp);
      
      expect(result.valid).toBe(false);
      expect(result.issues).toContain("Contains wildcard source");
    });

    it('should detect data: URIs in script-src', () => {
      const csp = "script-src 'self' data:";
      const result = validateCSP(csp);
      
      expect(result.valid).toBe(false);
      expect(result.issues).toContain("script-src allows data: URIs");
    });

    it('should detect missing frame-ancestors', () => {
      const csp = "default-src 'self'";
      const result = validateCSP(csp);
      
      expect(result.valid).toBe(false);
      expect(result.issues).toContain("Missing frame-ancestors directive");
    });

    it('should detect missing object-src', () => {
      const csp = "default-src 'self'; frame-ancestors 'none'";
      const result = validateCSP(csp);
      
      expect(result.valid).toBe(false);
      expect(result.issues).toContain("Missing object-src directive");
    });

    it('should report multiple issues', () => {
      const csp = "script-src * 'unsafe-eval' data:";
      const result = validateCSP(csp);
      
      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(1);
    });
  });

  describe('generateNonce()', () => {
    it('should generate a nonce', () => {
      const nonce = generateNonce();
      
      expect(nonce).toBeDefined();
      expect(typeof nonce).toBe('string');
      expect(nonce.length).toBeGreaterThan(0);
    });

    it('should generate unique nonces', () => {
      const nonce1 = generateNonce();
      const nonce2 = generateNonce();
      
      expect(nonce1).not.toBe(nonce2);
    });

    it('should generate hex string nonce', () => {
      const nonce = generateNonce();
      
      expect(nonce).toMatch(/^[0-9a-f]+$/);
    });

    it('should generate 32-character nonce', () => {
      const nonce = generateNonce();
      
      // 16 bytes = 32 hex characters
      expect(nonce.length).toBe(32);
    });
  });

  describe('CSP Integration', () => {
    it('should generate production-ready CSP', () => {
      const csp = generateCSP({ strict: true });
      const validation = validateCSP(csp);
      
      expect(validation.valid).toBe(true);
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("script-src 'self'");
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).not.toContain("'unsafe-eval'");
    });

    it('should protect against XSS attacks', () => {
      const csp = generateCSP({ strict: true });
      
      // Strict CSP should prevent inline scripts
      expect(csp).not.toContain("'unsafe-inline'");
      expect(csp).toContain("script-src 'self'");
    });

    it('should protect against clickjacking', () => {
      const csp = generateCSP();
      
      expect(csp).toContain("frame-ancestors 'none'");
    });

    it('should prevent plugin execution', () => {
      const csp = generateCSP();
      
      expect(csp).toContain("object-src 'none'");
    });

    it('should enforce HTTPS', () => {
      const csp = generateCSP();
      
      expect(csp).toContain("upgrade-insecure-requests");
      expect(csp).toContain("block-all-mixed-content");
    });
  });
});

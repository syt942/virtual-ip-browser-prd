/**
 * Error Sanitization Tests
 * Tests for preventing sensitive information leakage through error messages
 */

import { describe, it, expect } from 'vitest';
import {
  redactSensitiveInfo,
  removeStackTrace,
  sanitizeErrorMessage,
  categorizeError,
  createSafeError,
  getUserFriendlyMessage,
} from '../../../electron/utils/error-sanitization';

describe('Error Sanitization', () => {
  // ==========================================================================
  // Sensitive Information Redaction
  // ==========================================================================

  describe('redactSensitiveInfo', () => {
    it('should redact file paths (Unix)', () => {
      const message = 'Error reading /home/user/secrets/config.json';
      const result = redactSensitiveInfo(message);
      expect(result).not.toContain('/home/user');
      expect(result).toContain('[REDACTED]');
    });

    it('should redact file paths (Windows)', () => {
      const message = 'Error reading C:\\Users\\Admin\\Documents\\secret.txt';
      const result = redactSensitiveInfo(message);
      expect(result).not.toContain('C:\\Users');
      expect(result).toContain('[REDACTED]');
    });

    it('should redact API keys', () => {
      const message = 'API call failed: api_key=sk-proj-abcdef123456789';
      const result = redactSensitiveInfo(message);
      expect(result).not.toContain('sk-proj-abcdef');
      expect(result).toContain('[REDACTED]');
    });

    it('should redact OpenAI keys', () => {
      const message = 'Error with key sk-abcdefghijklmnopqrstuvwxyz12345';
      const result = redactSensitiveInfo(message);
      expect(result).not.toContain('sk-abcdef');
    });

    it('should redact GitHub tokens', () => {
      const message = 'Auth failed: ghp_abcdefghijklmnopqrstuvwxyz1234567890';
      const result = redactSensitiveInfo(message);
      expect(result).not.toContain('ghp_');
    });

    it('should redact connection strings', () => {
      const message = 'Connection failed: mongodb://user:pass@host:27017/db';
      const result = redactSensitiveInfo(message);
      expect(result).not.toContain('mongodb://');
      expect(result).not.toContain('pass@');
    });

    it('should redact internal IP addresses', () => {
      const message = 'Cannot connect to 192.168.1.100:3000';
      const result = redactSensitiveInfo(message);
      expect(result).not.toContain('192.168.1.100');
    });

    it('should redact email addresses', () => {
      const message = 'User admin@company.internal not found';
      const result = redactSensitiveInfo(message);
      expect(result).not.toContain('admin@company');
    });

    it('should preserve safe content', () => {
      const message = 'Search failed for keyword: best coffee shops';
      const result = redactSensitiveInfo(message);
      expect(result).toContain('best coffee shops');
    });
  });

  // ==========================================================================
  // Stack Trace Removal
  // ==========================================================================

  describe('removeStackTrace', () => {
    it('should remove stack traces', () => {
      const message = `Error: Something failed
    at Function.execute (/app/src/module.js:123:45)
    at process.nextTick (internal/process/task_queues.js:123:9)`;
      
      const result = removeStackTrace(message);
      expect(result).not.toContain('at Function.execute');
      expect(result).not.toContain('/app/src/module.js');
    });

    it('should remove Error: prefix', () => {
      const message = 'Error: Connection refused';
      const result = removeStackTrace(message);
      expect(result).toBe('Connection refused');
    });

    it('should handle messages without stack traces', () => {
      const message = 'Simple error message';
      const result = removeStackTrace(message);
      expect(result).toBe('Simple error message');
    });
  });

  // ==========================================================================
  // Full Error Sanitization
  // ==========================================================================

  describe('sanitizeErrorMessage', () => {
    it('should sanitize Error objects', () => {
      const error = new Error('Failed to read /etc/passwd');
      const result = sanitizeErrorMessage(error);
      expect(result).not.toContain('/etc/passwd');
    });

    it('should handle string errors', () => {
      const error = 'Connection to 192.168.1.1 failed';
      const result = sanitizeErrorMessage(error);
      expect(result).not.toContain('192.168.1.1');
    });

    it('should handle object errors with message', () => {
      const error = { message: 'API key invalid: api_key=sk-secret123' };
      const result = sanitizeErrorMessage(error);
      // The api_key= pattern is detected and redacted
      expect(result).toContain('[REDACTED]');
    });

    it('should handle unknown error types', () => {
      const result = sanitizeErrorMessage(null);
      expect(result).toBe('An unexpected error occurred');
    });

    it('should truncate long messages', () => {
      const longMessage = 'Error: ' + 'a'.repeat(500);
      const result = sanitizeErrorMessage(longMessage);
      expect(result.length).toBeLessThanOrEqual(203); // 200 + '...'
    });
  });

  // ==========================================================================
  // Error Categorization
  // ==========================================================================

  describe('categorizeError', () => {
    it('should categorize validation errors', () => {
      expect(categorizeError(new Error('Invalid input'))).toBe('validation');
      expect(categorizeError('Field is required')).toBe('validation');
    });

    it('should categorize network errors', () => {
      expect(categorizeError(new Error('ECONNREFUSED'))).toBe('network');
      expect(categorizeError('Network request failed')).toBe('network');
      expect(categorizeError('fetch failed')).toBe('network');
    });

    it('should categorize timeout errors', () => {
      expect(categorizeError(new Error('ETIMEDOUT'))).toBe('timeout');
      expect(categorizeError('Request timed out')).toBe('timeout');
    });

    it('should categorize permission errors', () => {
      expect(categorizeError(new Error('Permission denied'))).toBe('permission');
      expect(categorizeError('Unauthorized access')).toBe('permission');
      expect(categorizeError('403 Forbidden')).toBe('permission');
    });

    it('should categorize not found errors', () => {
      expect(categorizeError(new Error('ENOENT'))).toBe('not_found');
      expect(categorizeError('Resource not found')).toBe('not_found');
      expect(categorizeError('404 error')).toBe('not_found');
    });

    it('should categorize rate limit errors', () => {
      expect(categorizeError(new Error('Rate limit exceeded'))).toBe('rate_limit');
      expect(categorizeError('429 Too Many Requests')).toBe('rate_limit');
    });

    it('should categorize internal errors', () => {
      expect(categorizeError(new Error('Internal server error'))).toBe('internal');
      expect(categorizeError('500 error')).toBe('internal');
    });

    it('should return unknown for unrecognized errors', () => {
      expect(categorizeError(new Error('Something weird happened'))).toBe('unknown');
    });
  });

  // ==========================================================================
  // Safe Error Creation
  // ==========================================================================

  describe('createSafeError', () => {
    it('should create safe error with category', () => {
      const error = new Error('Connection refused');
      const safeError = createSafeError(error);
      
      expect(safeError.category).toBe('network');
      expect(safeError.retryable).toBe(true);
    });

    it('should mark network errors as retryable', () => {
      const safeError = createSafeError(new Error('ECONNREFUSED'));
      expect(safeError.retryable).toBe(true);
    });

    it('should mark timeout errors as retryable', () => {
      const safeError = createSafeError(new Error('Request timeout'));
      expect(safeError.retryable).toBe(true);
    });

    it('should mark rate limit errors as retryable', () => {
      const safeError = createSafeError(new Error('Rate limit exceeded'));
      expect(safeError.retryable).toBe(true);
    });

    it('should mark validation errors as not retryable', () => {
      const safeError = createSafeError(new Error('Invalid input'));
      expect(safeError.retryable).toBe(false);
    });

    it('should use custom message if provided', () => {
      const safeError = createSafeError(new Error('secret details'), 'Operation failed');
      expect(safeError.message).toBe('Operation failed');
    });

    it('should include error code if available', () => {
      const error = new Error('Connection refused') as Error & { code: string };
      error.code = 'ECONNREFUSED';
      const safeError = createSafeError(error);
      expect(safeError.code).toBe('ECONNREFUSED');
    });
  });

  // ==========================================================================
  // User-Friendly Messages
  // ==========================================================================

  describe('getUserFriendlyMessage', () => {
    it('should return friendly message for validation errors', () => {
      const message = getUserFriendlyMessage(new Error('Invalid field'));
      expect(message).toContain('invalid');
      expect(message).not.toContain('Invalid field');
    });

    it('should return friendly message for network errors', () => {
      const message = getUserFriendlyMessage(new Error('ECONNREFUSED'));
      expect(message).toContain('network');
    });

    it('should return friendly message for timeout errors', () => {
      const message = getUserFriendlyMessage(new Error('timeout'));
      expect(message).toContain('timed out');
    });

    it('should not expose internal details', () => {
      const message = getUserFriendlyMessage(new Error('Database query failed at /app/db.js:123'));
      expect(message).not.toContain('/app/db.js');
      expect(message).not.toContain('Database query');
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle empty strings', () => {
      expect(sanitizeErrorMessage('')).toBe('An error occurred');
    });

    it('should handle very long error messages', () => {
      const longError = new Error('x'.repeat(10000));
      const result = sanitizeErrorMessage(longError);
      expect(result.length).toBeLessThan(300);
    });

    it('should handle nested error objects', () => {
      const error = {
        message: 'Outer error',
        cause: {
          message: 'Inner error with /secret/path'
        }
      };
      const result = sanitizeErrorMessage(error);
      expect(result).not.toContain('/secret/path');
    });

    it('should handle circular references gracefully', () => {
      const error: { message: string; self?: unknown } = { message: 'Error' };
      error.self = error;
      
      // Should not throw
      const result = sanitizeErrorMessage(error);
      expect(result).toBeDefined();
    });
  });
});

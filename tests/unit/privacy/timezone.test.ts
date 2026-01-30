/**
 * Timezone Fingerprint Protection Tests
 * PRD Section 6.2 - P1 Privacy Protection Requirements
 * 
 * Tests for timezone spoofing to match proxy location
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TimezoneFingerprintProtection } from '../../../electron/core/privacy/fingerprint/timezone';

describe('TimezoneFingerprintProtection', () => {
  let protection: TimezoneFingerprintProtection;

  beforeEach(() => {
    protection = new TimezoneFingerprintProtection();
  });

  describe('Constructor and Defaults', () => {
    it('should initialize with default timezone', () => {
      const config = protection.getTimezone();
      
      expect(config.timezone).toBe('America/New_York');
      expect(config.offset).toBe(-5);
    });

    it('should accept custom timezone', () => {
      const customProtection = new TimezoneFingerprintProtection('Europe/London', 0);
      const config = customProtection.getTimezone();
      
      expect(config.timezone).toBe('Europe/London');
      expect(config.offset).toBe(0);
    });
  });

  describe('Timezone Configuration', () => {
    it('should allow setting timezone', () => {
      protection.setTimezone('Asia/Tokyo', 9);
      const config = protection.getTimezone();
      
      expect(config.timezone).toBe('Asia/Tokyo');
      expect(config.offset).toBe(9);
    });

    it('should handle negative offsets', () => {
      protection.setTimezone('America/Los_Angeles', -8);
      const config = protection.getTimezone();
      
      expect(config.offset).toBe(-8);
    });

    it('should handle fractional offsets', () => {
      protection.setTimezone('Asia/Kolkata', 5.5);
      const config = protection.getTimezone();
      
      expect(config.offset).toBe(5.5);
    });
  });

  describe('Injection Script Generation', () => {
    it('should generate valid JavaScript', () => {
      const script = protection.generateInjectionScript();
      
      expect(() => {
        new Function(script);
      }).not.toThrow();
    });

    it('should include IIFE wrapper', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('(function()');
      expect(script).toContain('use strict');
      expect(script).toContain('})()');
    });

    it('should embed timezone in script', () => {
      protection.setTimezone('Europe/Berlin', 1);
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('Europe/Berlin');
      expect(script).toContain('const spoofOffset = 1');
    });
  });

  describe('Date.prototype.getTimezoneOffset Override', () => {
    it('should override getTimezoneOffset', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('Date.prototype.getTimezoneOffset');
      expect(script).toContain('originalGetTimezoneOffset');
    });

    it('should convert offset to minutes and negate', () => {
      const script = protection.generateInjectionScript();
      
      // JavaScript's getTimezoneOffset returns negative for positive UTC offsets
      expect(script).toContain('spoofOffset * -60');
    });
  });

  describe('Intl.DateTimeFormat Override', () => {
    it('should override resolvedOptions', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('Intl.DateTimeFormat.prototype.resolvedOptions');
      expect(script).toContain('originalResolvedOptions');
    });

    it('should set timeZone in resolved options', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('options.timeZone = spoofTimezone');
    });
  });

  describe('toLocaleString Methods Override', () => {
    it('should override toLocaleString', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('Date.prototype.toLocaleString');
      expect(script).toContain('originalToLocaleString');
    });

    it('should override toLocaleDateString', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('Date.prototype.toLocaleDateString');
      expect(script).toContain('originalToLocaleDateString');
    });

    it('should override toLocaleTimeString', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('Date.prototype.toLocaleTimeString');
      expect(script).toContain('originalToLocaleTimeString');
    });

    it('should inject timezone into options', () => {
      const script = protection.generateInjectionScript();
      
      // Should set timeZone in options before calling original
      expect(script).toContain('options.timeZone = spoofTimezone');
    });

    it('should handle undefined options', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('if (!options) options = {}');
    });
  });

  describe('Static Region to Timezone Mapping', () => {
    it('should return US timezone', () => {
      const tz = TimezoneFingerprintProtection.getTimezoneForRegion('US');
      
      expect(tz.timezone).toBe('America/New_York');
      expect(tz.offset).toBe(-5);
    });

    it('should return UK timezone', () => {
      const tz = TimezoneFingerprintProtection.getTimezoneForRegion('UK');
      
      expect(tz.timezone).toBe('Europe/London');
      expect(tz.offset).toBe(0);
    });

    it('should return DE timezone', () => {
      const tz = TimezoneFingerprintProtection.getTimezoneForRegion('DE');
      
      expect(tz.timezone).toBe('Europe/Berlin');
      expect(tz.offset).toBe(1);
    });

    it('should return FR timezone', () => {
      const tz = TimezoneFingerprintProtection.getTimezoneForRegion('FR');
      
      expect(tz.timezone).toBe('Europe/Paris');
      expect(tz.offset).toBe(1);
    });

    it('should return JP timezone', () => {
      const tz = TimezoneFingerprintProtection.getTimezoneForRegion('JP');
      
      expect(tz.timezone).toBe('Asia/Tokyo');
      expect(tz.offset).toBe(9);
    });

    it('should return CN timezone', () => {
      const tz = TimezoneFingerprintProtection.getTimezoneForRegion('CN');
      
      expect(tz.timezone).toBe('Asia/Shanghai');
      expect(tz.offset).toBe(8);
    });

    it('should return AU timezone', () => {
      const tz = TimezoneFingerprintProtection.getTimezoneForRegion('AU');
      
      expect(tz.timezone).toBe('Australia/Sydney');
      expect(tz.offset).toBe(10);
    });

    it('should return IN timezone', () => {
      const tz = TimezoneFingerprintProtection.getTimezoneForRegion('IN');
      
      expect(tz.timezone).toBe('Asia/Kolkata');
      expect(tz.offset).toBe(5.5);
    });

    it('should return BR timezone', () => {
      const tz = TimezoneFingerprintProtection.getTimezoneForRegion('BR');
      
      expect(tz.timezone).toBe('America/Sao_Paulo');
      expect(tz.offset).toBe(-3);
    });

    it('should return RU timezone', () => {
      const tz = TimezoneFingerprintProtection.getTimezoneForRegion('RU');
      
      expect(tz.timezone).toBe('Europe/Moscow');
      expect(tz.offset).toBe(3);
    });

    it('should default to US for unknown region', () => {
      const tz = TimezoneFingerprintProtection.getTimezoneForRegion('XX');
      
      expect(tz.timezone).toBe('America/New_York');
      expect(tz.offset).toBe(-5);
    });
  });

  describe('Logging', () => {
    it('should include debug logging', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('console.log');
      expect(script).toContain('[Timezone Protection]');
    });

    it('should log the spoofed timezone', () => {
      protection.setTimezone('Europe/Berlin', 1);
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('spoofTimezone');
    });
  });
});

describe('Timezone Consistency Tests', () => {
  describe('Cross-Method Consistency', () => {
    it('should use same timezone across all methods', () => {
      const protection = new TimezoneFingerprintProtection('Asia/Tokyo', 9);
      const script = protection.generateInjectionScript();

      // Count timezone references
      const timezoneMatches = script.match(/spoofTimezone/g);
      
      // Should appear in: resolvedOptions, toLocaleString, toLocaleDateString, toLocaleTimeString
      expect(timezoneMatches?.length).toBeGreaterThanOrEqual(4);
    });

    it('should use same offset for getTimezoneOffset', () => {
      const protection = new TimezoneFingerprintProtection('Asia/Tokyo', 9);
      const script = protection.generateInjectionScript();

      expect(script).toContain('spoofOffset * -60');
    });
  });
});

describe('Timezone Anti-Detection Tests', () => {
  describe('Method Call Passthrough', () => {
    it('should call original methods', () => {
      const script = new TimezoneFingerprintProtection().generateInjectionScript();

      expect(script).toContain('originalGetTimezoneOffset');
      expect(script).toContain('originalResolvedOptions.call(this)');
      expect(script).toContain('originalToLocaleString.call(this');
      expect(script).toContain('originalToLocaleDateString.call(this');
      expect(script).toContain('originalToLocaleTimeString.call(this');
    });
  });

  describe('Options Modification', () => {
    it('should modify options non-destructively', () => {
      const script = new TimezoneFingerprintProtection().generateInjectionScript();

      // Should create options if not provided
      expect(script).toContain('if (!options) options = {}');
    });
  });
});

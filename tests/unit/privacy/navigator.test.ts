/**
 * Navigator Fingerprint Protection Tests
 * PRD Section 6.2 - P1 Privacy Protection Requirements
 * 
 * Tests for navigator property spoofing with consistency and anti-detection
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NavigatorFingerprintProtection, NavigatorSpoofConfig } from '../../../electron/core/privacy/fingerprint/navigator';

describe('NavigatorFingerprintProtection', () => {
  let protection: NavigatorFingerprintProtection;

  beforeEach(() => {
    protection = new NavigatorFingerprintProtection();
  });

  describe('Constructor and Configuration', () => {
    it('should initialize with empty config', () => {
      const config = protection.getConfig();
      expect(config).toEqual({});
    });

    it('should accept initial configuration', () => {
      const initialConfig: NavigatorSpoofConfig = {
        userAgent: 'Test Agent',
        platform: 'TestOS'
      };
      const customProtection = new NavigatorFingerprintProtection(initialConfig);
      
      expect(customProtection.getConfig().userAgent).toBe('Test Agent');
      expect(customProtection.getConfig().platform).toBe('TestOS');
    });

    it('should return copy of config to prevent mutation', () => {
      protection.setConfig({ userAgent: 'Test' });
      const config1 = protection.getConfig();
      const config2 = protection.getConfig();
      
      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });
  });

  describe('Configuration Management', () => {
    it('should allow updating configuration', () => {
      protection.setConfig({ userAgent: 'Updated Agent' });
      expect(protection.getConfig().userAgent).toBe('Updated Agent');
    });

    it('should merge configurations', () => {
      protection.setConfig({ userAgent: 'Agent1', platform: 'Platform1' });
      protection.setConfig({ platform: 'Platform2' });
      
      const config = protection.getConfig();
      expect(config.userAgent).toBe('Agent1');
      expect(config.platform).toBe('Platform2');
    });

    it('should handle all navigator properties', () => {
      const fullConfig: NavigatorSpoofConfig = {
        userAgent: 'Mozilla/5.0 Test',
        platform: 'Win32',
        language: 'en-US',
        languages: ['en-US', 'en'],
        vendor: 'Google Inc.',
        hardwareConcurrency: 8,
        deviceMemory: 8,
        maxTouchPoints: 0,
        oscpu: 'Windows NT 10.0'
      };
      
      protection.setConfig(fullConfig);
      const config = protection.getConfig();
      
      expect(config).toEqual(fullConfig);
    });
  });

  describe('Injection Script Generation', () => {
    it('should generate valid JavaScript', () => {
      protection.setConfig({ userAgent: 'Test' });
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

    it('should embed configuration as JSON', () => {
      protection.setConfig({ userAgent: 'TestAgent' });
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('spoofConfig');
      expect(script).toContain('TestAgent');
    });
  });

  describe('UserAgent Spoofing', () => {
    beforeEach(() => {
      protection.setConfig({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'
      });
    });

    it('should override Navigator.prototype.userAgent', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain("Navigator.prototype, 'userAgent'");
      expect(script).toContain('spoofConfig.userAgent');
    });

    it('should derive appVersion from userAgent', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('appVersion');
      expect(script).toContain("userAgent.substring(spoofConfig.userAgent.indexOf('/') + 1)");
    });

    it('should set consistent appName', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain("'appName'");
      expect(script).toContain("'Netscape'");
    });

    it('should set consistent product and productSub', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain("'product'");
      expect(script).toContain("'Gecko'");
      expect(script).toContain("'productSub'");
      expect(script).toContain("'20030107'");
    });
  });

  describe('Platform Spoofing', () => {
    it('should override platform property', () => {
      protection.setConfig({ platform: 'Win32' });
      const script = protection.generateInjectionScript();
      
      expect(script).toContain("Navigator.prototype, 'platform'");
    });

    it('should set consistent oscpu for Windows', () => {
      protection.setConfig({ platform: 'Win32' });
      const script = protection.generateInjectionScript();
      
      expect(script).toContain("includes('Win')");
      expect(script).toContain('Windows NT 10.0');
    });

    it('should set consistent oscpu for Mac', () => {
      protection.setConfig({ platform: 'MacIntel' });
      const script = protection.generateInjectionScript();
      
      expect(script).toContain("includes('Mac')");
      expect(script).toContain('Intel Mac OS X');
    });

    it('should set consistent oscpu for Linux', () => {
      protection.setConfig({ platform: 'Linux x86_64' });
      const script = protection.generateInjectionScript();
      
      expect(script).toContain("includes('Linux')");
      expect(script).toContain('Linux x86_64');
    });
  });

  describe('Language Spoofing', () => {
    it('should override language property', () => {
      protection.setConfig({ language: 'de-DE' });
      const script = protection.generateInjectionScript();
      
      expect(script).toContain("'language'");
      expect(script).toContain('spoofConfig.language');
    });

    it('should override languages with frozen array', () => {
      protection.setConfig({ languages: ['de-DE', 'en-US'] });
      const script = protection.generateInjectionScript();
      
      expect(script).toContain("'languages'");
      expect(script).toContain('frozenLanguages');
      expect(script).toContain('Object.freeze');
    });
  });

  describe('Hardware Properties Spoofing', () => {
    it('should override hardwareConcurrency', () => {
      protection.setConfig({ hardwareConcurrency: 4 });
      const script = protection.generateInjectionScript();
      
      expect(script).toContain("'hardwareConcurrency'");
      expect(script).toContain('spoofConfig.hardwareConcurrency');
    });

    it('should override deviceMemory', () => {
      protection.setConfig({ deviceMemory: 8 });
      const script = protection.generateInjectionScript();
      
      expect(script).toContain("'deviceMemory'");
      expect(script).toContain('spoofConfig.deviceMemory');
    });

    it('should override maxTouchPoints', () => {
      protection.setConfig({ maxTouchPoints: 0 });
      const script = protection.generateInjectionScript();
      
      expect(script).toContain("'maxTouchPoints'");
      expect(script).toContain('spoofConfig.maxTouchPoints');
    });

    it('should handle maxTouchPoints value of 0', () => {
      protection.setConfig({ maxTouchPoints: 0 });
      const script = protection.generateInjectionScript();
      
      // Should check !== undefined, not truthiness
      expect(script).toContain('maxTouchPoints !== undefined');
    });
  });

  describe('Vendor Spoofing', () => {
    it('should override vendor property', () => {
      protection.setConfig({ vendor: 'Google Inc.' });
      const script = protection.generateInjectionScript();
      
      expect(script).toContain("'vendor'");
      expect(script).toContain('spoofConfig.vendor');
    });

    it('should set empty vendorSub for Chrome', () => {
      protection.setConfig({ vendor: 'Google Inc.' });
      const script = protection.generateInjectionScript();
      
      expect(script).toContain("'vendorSub'");
      expect(script).toContain("''");
    });
  });

  describe('Plugin and MimeType Arrays', () => {
    it('should create fake PluginArray', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('createPluginArray');
      expect(script).toContain('frozenPlugins');
    });

    it('should create fake MimeTypeArray', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('createMimeTypeArray');
      expect(script).toContain('frozenMimeTypes');
    });

    it('should implement item() method', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('arr.item = function(i)');
    });

    it('should implement namedItem() method', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('arr.namedItem = function(name)');
    });

    it('should implement refresh() for PluginArray', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('arr.refresh = function()');
    });

    it('should freeze arrays', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('Object.freeze(arr)');
    });

    it('should make length non-writable', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain("'length'");
      expect(script).toContain('writable: false');
    });
  });

  describe('Additional Privacy Properties', () => {
    it('should set webdriver to false', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain("'webdriver'");
      expect(script).toContain('false');
    });

    it('should set doNotTrack to 1', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain("'doNotTrack'");
      expect(script).toContain("'1'");
    });

    it('should set cookieEnabled to true', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain("'cookieEnabled'");
      expect(script).toContain('true');
    });

    it('should set onLine to true', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain("'onLine'");
    });

    it('should set pdfViewerEnabled to true', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain("'pdfViewerEnabled'");
    });
  });

  describe('Static Config Generation', () => {
    it('should generate Windows config', () => {
      const config = NavigatorFingerprintProtection.generateRealisticConfig('windows');
      
      expect(config.platform).toBe('Win32');
      expect(config.userAgent).toContain('Windows NT');
      expect(config.vendor).toBe('Google Inc.');
    });

    it('should generate Mac config', () => {
      const config = NavigatorFingerprintProtection.generateRealisticConfig('mac');
      
      expect(config.platform).toBe('MacIntel');
      expect(config.userAgent).toContain('Macintosh');
    });

    it('should generate Linux config', () => {
      const config = NavigatorFingerprintProtection.generateRealisticConfig('linux');
      
      expect(config.platform).toBe('Linux x86_64');
      expect(config.userAgent).toContain('Linux');
    });

    it('should default to Windows', () => {
      const config = NavigatorFingerprintProtection.generateRealisticConfig();
      
      expect(config.platform).toBe('Win32');
    });

    it('should include all necessary properties', () => {
      const config = NavigatorFingerprintProtection.generateRealisticConfig('windows');
      
      expect(config.userAgent).toBeDefined();
      expect(config.platform).toBeDefined();
      expect(config.vendor).toBeDefined();
      expect(config.hardwareConcurrency).toBeDefined();
      expect(config.deviceMemory).toBeDefined();
      expect(config.maxTouchPoints).toBeDefined();
      expect(config.language).toBeDefined();
      expect(config.languages).toBeDefined();
    });
  });

  describe('Logging', () => {
    it('should include debug logging', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('console.log');
      expect(script).toContain('[Navigator Protection]');
    });
  });
});

describe('Navigator Consistency Tests', () => {
  describe('Multiple Reads Consistency', () => {
    it('should return same value on multiple property reads', () => {
      const protection = new NavigatorFingerprintProtection({
        userAgent: 'Consistent Agent'
      });
      const script = protection.generateInjectionScript();
      
      // The getter always returns the same value
      expect(script).toContain("() => spoofConfig.userAgent");
    });

    it('should use frozen arrays for languages', () => {
      const protection = new NavigatorFingerprintProtection({
        languages: ['en-US', 'en']
      });
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('createFrozenArray');
      expect(script).toContain('Object.freeze([...arr])');
    });
  });

  describe('Cross-Property Consistency', () => {
    it('should ensure userAgent matches platform', () => {
      const windowsConfig = NavigatorFingerprintProtection.generateRealisticConfig('windows');
      
      expect(windowsConfig.userAgent).toContain('Windows');
      expect(windowsConfig.platform).toBe('Win32');
    });

    it('should ensure oscpu matches platform in script', () => {
      const protection = new NavigatorFingerprintProtection({ platform: 'Win32' });
      const script = protection.generateInjectionScript();
      
      // Script should set oscpu based on platform
      expect(script).toContain("if (spoofConfig.platform.includes('Win'))");
      expect(script).toContain('Windows NT');
    });
  });
});

describe('Navigator Anti-Detection Tests', () => {
  describe('Native Property Descriptor Mimicking', () => {
    it('should use defineNativeProperty helper', () => {
      const script = new NavigatorFingerprintProtection().generateInjectionScript();
      
      expect(script).toContain('defineNativeProperty');
    });

    it('should set configurable: false', () => {
      const script = new NavigatorFingerprintProtection().generateInjectionScript();
      
      expect(script).toContain('configurable: false');
    });

    it('should set enumerable: true', () => {
      const script = new NavigatorFingerprintProtection().generateInjectionScript();
      
      expect(script).toContain('enumerable: true');
    });

    it('should set setter to undefined', () => {
      const script = new NavigatorFingerprintProtection().generateInjectionScript();
      
      expect(script).toContain('set: undefined');
    });
  });

  describe('toString Masking', () => {
    it('should mask getter toString to appear native', () => {
      const script = new NavigatorFingerprintProtection().generateInjectionScript();
      
      expect(script).toContain('[native code]');
      expect(script).toContain("function get ' + prop + '()");
    });

    it('should make toString non-writable', () => {
      const script = new NavigatorFingerprintProtection().generateInjectionScript();
      
      expect(script).toMatch(/toString[\s\S]*?writable: false/);
    });

    it('should make toString non-configurable', () => {
      const script = new NavigatorFingerprintProtection().generateInjectionScript();
      
      expect(script).toMatch(/toString[\s\S]*?configurable: false/);
    });
  });

  describe('Prototype Chain Preservation', () => {
    it('should preserve instanceof checks', () => {
      const script = new NavigatorFingerprintProtection().generateInjectionScript();
      
      expect(script).toContain('Symbol.hasInstance');
      expect(script).toContain('instance === navigator');
    });

    it('should override on Navigator.prototype', () => {
      const script = new NavigatorFingerprintProtection().generateInjectionScript();
      
      expect(script).toContain('Navigator.prototype');
    });
  });

  describe('Property Descriptor Consistency', () => {
    it('should store original descriptor', () => {
      const script = new NavigatorFingerprintProtection().generateInjectionScript();
      
      expect(script).toContain('originalDescriptor');
      expect(script).toContain('Object.getOwnPropertyDescriptor(obj, prop)');
    });
  });
});

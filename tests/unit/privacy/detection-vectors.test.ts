/**
 * Detection Vector Tests
 * PRD Section 6.2 - P1 Privacy Protection Requirements
 * 
 * Tests for anti-detection measures: property descriptors, timing attacks, prototype pollution
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CanvasFingerprintProtection } from '../../../electron/core/privacy/fingerprint/canvas';
import { NavigatorFingerprintProtection } from '../../../electron/core/privacy/fingerprint/navigator';
import { WebGLFingerprintProtection } from '../../../electron/core/privacy/fingerprint/webgl';
import { AudioFingerprintProtection } from '../../../electron/core/privacy/fingerprint/audio';
import { WebRTCProtection } from '../../../electron/core/privacy/webrtc';
import { TimezoneFingerprintProtection } from '../../../electron/core/privacy/fingerprint/timezone';
import { PrivacyManager } from '../../../electron/core/privacy/manager';

describe('Property Descriptor Consistency', () => {
  describe('Navigator Property Descriptors', () => {
    let protection: NavigatorFingerprintProtection;
    let script: string;

    beforeEach(() => {
      protection = new NavigatorFingerprintProtection({
        userAgent: 'Test Agent',
        platform: 'Win32'
      });
      script = protection.generateInjectionScript();
    });

    it('should use configurable: false to match native properties', () => {
      expect(script).toContain('configurable: false');
    });

    it('should use enumerable: true to match native properties', () => {
      expect(script).toContain('enumerable: true');
    });

    it('should set setter to undefined for read-only properties', () => {
      expect(script).toContain('set: undefined');
    });

    it('should define properties on Navigator.prototype not navigator', () => {
      expect(script).toContain('Navigator.prototype');
      // Should not directly modify navigator instance
      expect(script).not.toMatch(/Object\.defineProperty\s*\(\s*navigator\s*,/);
    });

    it('should store original descriptor for reference', () => {
      expect(script).toContain('originalDescriptor');
      expect(script).toContain('Object.getOwnPropertyDescriptor(obj, prop)');
    });
  });

  describe('Canvas Property Descriptors', () => {
    let protection: CanvasFingerprintProtection;
    let script: string;

    beforeEach(() => {
      protection = new CanvasFingerprintProtection();
      script = protection.generateInjectionScript();
    });

    it('should override on prototype level', () => {
      expect(script).toContain('HTMLCanvasElement.prototype');
      expect(script).toContain('CanvasRenderingContext2D.prototype');
    });

    it('should use direct assignment for prototype methods', () => {
      // Direct assignment preserves expected behavior
      expect(script).toContain('HTMLCanvasElement.prototype.toDataURL = protectedToDataURL');
      expect(script).toContain('HTMLCanvasElement.prototype.toBlob = protectedToBlob');
    });
  });
});

describe('toString Detection Prevention', () => {
  describe('Navigator toString Masking', () => {
    it('should mask getter toString to return [native code]', () => {
      const protection = new NavigatorFingerprintProtection({ userAgent: 'Test' });
      const script = protection.generateInjectionScript();

      expect(script).toContain('[native code]');
      expect(script).toContain("function get ' + prop + '()");
    });

    it('should make toString non-writable', () => {
      const script = new NavigatorFingerprintProtection().generateInjectionScript();
      
      // In toString definition
      expect(script).toMatch(/'toString'[\s\S]*?writable:\s*false/);
    });

    it('should make toString non-configurable', () => {
      const script = new NavigatorFingerprintProtection().generateInjectionScript();
      
      expect(script).toMatch(/'toString'[\s\S]*?configurable:\s*false/);
    });

    it('should make toString non-enumerable', () => {
      const script = new NavigatorFingerprintProtection().generateInjectionScript();
      
      expect(script).toMatch(/'toString'[\s\S]*?enumerable:\s*false/);
    });
  });

  describe('Canvas Function toString Masking', () => {
    it('should include maskAsNative helper', () => {
      const script = new CanvasFingerprintProtection().generateInjectionScript();
      
      expect(script).toContain('function maskAsNative(fn, name)');
    });

    it('should mask function toString', () => {
      const script = new CanvasFingerprintProtection().generateInjectionScript();
      
      expect(script).toContain("'function ' + name + '() { [native code] }'");
    });

    it('should mask function name property', () => {
      const script = new CanvasFingerprintProtection().generateInjectionScript();
      
      expect(script).toContain("Object.defineProperty(fn, 'name'");
      expect(script).toContain('value: name');
    });

    it('should apply masking to all protected methods', () => {
      const script = new CanvasFingerprintProtection().generateInjectionScript();
      
      expect(script).toContain("maskAsNative(function(...args)");
      expect(script).toContain("'toDataURL'");
      expect(script).toContain("'toBlob'");
      expect(script).toContain("'getImageData'");
      expect(script).toContain("'readPixels'");
    });
  });
});

describe('Timing Attack Prevention', () => {
  describe('Canvas Timing Protection', () => {
    let protection: CanvasFingerprintProtection;
    let script: string;

    beforeEach(() => {
      protection = new CanvasFingerprintProtection();
      script = protection.generateInjectionScript();
    });

    it('should define minimum operation time', () => {
      expect(script).toContain('MIN_OPERATION_TIME');
      expect(script).toContain('2'); // 2ms minimum
    });

    it('should include enforceMinTime function', () => {
      expect(script).toContain('function enforceMinTime(startTime, callback)');
    });

    it('should record start time', () => {
      expect(script).toContain('const startTime = performance.now()');
    });

    it('should calculate elapsed time', () => {
      expect(script).toContain('const elapsed = performance.now() - startTime');
    });

    it('should use busy-wait instead of setTimeout', () => {
      // setTimeout can be detected via timing analysis
      expect(script).toContain('while (performance.now() < end)');
      // Should use busy-wait loop, not setTimeout for delays
      expect(script).not.toMatch(/setTimeout\s*\(/);
    });

    it('should explain busy-wait choice', () => {
      expect(script).toContain('Busy wait - prevents timing-based detection');
    });

    it('should apply timing to toDataURL', () => {
      expect(script).toMatch(/protectedToDataURL[\s\S]*?startTime[\s\S]*?enforceMinTime/);
    });

    it('should apply timing to toBlob', () => {
      expect(script).toMatch(/protectedToBlob[\s\S]*?startTime[\s\S]*?enforceMinTime/);
    });

    it('should apply timing to getImageData', () => {
      expect(script).toMatch(/protectedGetImageData[\s\S]*?startTime[\s\S]*?enforceMinTime/);
    });

    it('should apply timing to readPixels', () => {
      expect(script).toMatch(/protectedReadPixels[\s\S]*?startTime[\s\S]*?enforceMinTime/);
    });
  });
});

describe('Prototype Pollution Prevention', () => {
  describe('Navigator Prototype Integrity', () => {
    it('should preserve instanceof checks', () => {
      const script = new NavigatorFingerprintProtection().generateInjectionScript();
      
      expect(script).toContain('Symbol.hasInstance');
      expect(script).toContain('Navigator[Symbol.hasInstance]');
    });

    it('should check instance identity', () => {
      const script = new NavigatorFingerprintProtection().generateInjectionScript();
      
      expect(script).toContain('instance === navigator');
    });

    it('should call original hasInstance', () => {
      const script = new NavigatorFingerprintProtection().generateInjectionScript();
      
      expect(script).toContain('originalHasInstance');
      expect(script).toContain('originalHasInstance.call(this, instance)');
    });

    it('should make hasInstance non-configurable', () => {
      const script = new NavigatorFingerprintProtection().generateInjectionScript();
      
      // Symbol.hasInstance definition should be non-configurable
      expect(script).toMatch(/Symbol\.hasInstance[\s\S]*?configurable:\s*false/);
    });

    it('should make hasInstance non-writable', () => {
      const script = new NavigatorFingerprintProtection().generateInjectionScript();
      
      expect(script).toMatch(/Symbol\.hasInstance[\s\S]*?writable:\s*false/);
    });
  });

  describe('Frozen Arrays for Immutability', () => {
    it('should freeze languages array', () => {
      const protection = new NavigatorFingerprintProtection({
        languages: ['en-US', 'en']
      });
      const script = protection.generateInjectionScript();

      expect(script).toContain('createFrozenArray');
      expect(script).toContain('Object.freeze([...arr])');
    });

    it('should freeze plugin array', () => {
      const script = new NavigatorFingerprintProtection().generateInjectionScript();
      
      expect(script).toContain('frozenPlugins');
      expect(script).toContain('Object.freeze(arr)');
    });

    it('should freeze mimeTypes array', () => {
      const script = new NavigatorFingerprintProtection().generateInjectionScript();
      
      expect(script).toContain('frozenMimeTypes');
    });

    it('should make array length non-writable', () => {
      const script = new NavigatorFingerprintProtection().generateInjectionScript();
      
      expect(script).toContain("'length'");
      expect(script).toContain('writable: false');
      expect(script).toContain('configurable: false');
    });
  });
});

describe('Deterministic Output Consistency', () => {
  describe('Canvas Deterministic Noise', () => {
    it('should use seeded PRNG', () => {
      const script = new CanvasFingerprintProtection().generateInjectionScript();
      
      expect(script).toContain('createSeededRandom');
      expect(script).toContain('sessionSeed');
    });

    it('should use Mulberry32 algorithm', () => {
      const script = new CanvasFingerprintProtection().generateInjectionScript();
      
      expect(script).toContain('Mulberry32');
      expect(script).toContain('0x6D2B79F5');
    });

    it('should generate position-based seeds', () => {
      const script = new CanvasFingerprintProtection().generateInjectionScript();
      
      expect(script).toContain('getPixelSeed');
      expect(script).toContain('x * 31 + y * 17');
    });

    it('should include canvas ID in seed', () => {
      const script = new CanvasFingerprintProtection().generateInjectionScript();
      
      expect(script).toContain('canvasId');
      expect(script).toContain('getCanvasId');
    });

    it('should use WeakMap for canvas tracking', () => {
      const script = new CanvasFingerprintProtection().generateInjectionScript();
      
      expect(script).toContain('WeakMap');
      expect(script).toContain('canvasIdMap');
    });
  });

  describe('Audio Sample Rate Consistency', () => {
    it('should use limited sample rate options', () => {
      const script = new AudioFingerprintProtection().generateInjectionScript();
      
      expect(script).toContain('[44100, 48000]');
    });
  });
});

describe('Script Isolation', () => {
  describe('IIFE Wrapping', () => {
    const modules = [
      { name: 'Canvas', factory: () => new CanvasFingerprintProtection() },
      { name: 'Navigator', factory: () => new NavigatorFingerprintProtection() },
      { name: 'WebGL', factory: () => new WebGLFingerprintProtection() },
      { name: 'Audio', factory: () => new AudioFingerprintProtection() },
      { name: 'WebRTC', factory: () => new WebRTCProtection() },
      { name: 'Timezone', factory: () => new TimezoneFingerprintProtection() }
    ];

    modules.forEach(({ name, factory }) => {
      it(`${name} should use IIFE wrapper`, () => {
        const protection = factory();
        const script = protection.generateInjectionScript();
        
        expect(script).toContain('(function()');
        expect(script).toContain('})()');
      });

      it(`${name} should use strict mode`, () => {
        const protection = factory();
        const script = protection.generateInjectionScript();
        
        expect(script).toContain("'use strict'");
      });
    });
  });

  describe('Variable Scoping', () => {
    it('should not pollute global scope with canvas variables', () => {
      const script = new CanvasFingerprintProtection().generateInjectionScript();
      
      // Variables should be const/let inside IIFE
      expect(script).toContain('const noise');
      expect(script).toContain('const sessionSeed');
      expect(script).not.toMatch(/^var /m);
    });

    it('should store original methods safely', () => {
      const script = new CanvasFingerprintProtection().generateInjectionScript();
      
      expect(script).toContain('const originalToDataURL');
      expect(script).toContain('const originalToBlob');
      expect(script).toContain('const originalGetImageData');
    });
  });
});

describe('Comprehensive Anti-Detection Suite', () => {
  let manager: PrivacyManager;

  beforeEach(() => {
    manager = new PrivacyManager();
  });

  describe('Combined Script Validation', () => {
    it('should generate valid combined script', () => {
      const script = manager.generateProtectionScript({
        canvas: true,
        webgl: true,
        audio: true,
        navigator: true,
        timezone: true,
        webrtc: true,
        trackerBlocking: false
      });

      expect(() => {
        new Function(script);
      }).not.toThrow();
    });

    it('should not have script conflicts', () => {
      const script = manager.generateProtectionScript({
        canvas: true,
        webgl: true,
        audio: true,
        navigator: true,
        timezone: true,
        webrtc: true,
        trackerBlocking: false
      });

      // Count IIFE wrappers - should be one per module
      const iifeCount = (script.match(/\(function\(\)/g) || []).length;
      expect(iifeCount).toBe(6); // 6 modules enabled
    });
  });

  describe('Cross-Module Consistency', () => {
    it('should have consistent navigator across modules', () => {
      manager.getNavigatorProtection().setConfig({
        userAgent: 'Consistent UA',
        platform: 'Win32'
      });

      const navigatorScript = manager.getNavigatorProtection().generateInjectionScript();
      
      expect(navigatorScript).toContain('Consistent UA');
      expect(navigatorScript).toContain('Win32');
    });

    it('should have consistent WebGL config', () => {
      manager.getWebGLProtection().setConfig({
        vendor: 'Intel Inc.',
        renderer: 'Intel HD Graphics'
      });

      const webglScript = manager.getWebGLProtection().generateInjectionScript();
      
      expect(webglScript).toContain('Intel Inc.');
      expect(webglScript).toContain('Intel HD Graphics');
    });
  });
});

describe('Edge Case Detection Vectors', () => {
  describe('Empty Configuration Handling', () => {
    it('should handle empty navigator config', () => {
      const protection = new NavigatorFingerprintProtection({});
      const script = protection.generateInjectionScript();
      
      // Should still include base protections
      expect(script).toContain('webdriver');
      expect(script).toContain('doNotTrack');
    });
  });

  describe('Special Character Handling', () => {
    it('should escape special characters in userAgent', () => {
      const protection = new NavigatorFingerprintProtection({
        userAgent: "Test'Agent\"With\\Special"
      });
      
      // Should not throw when generating script
      expect(() => {
        const script = protection.generateInjectionScript();
        new Function(script);
      }).not.toThrow();
    });
  });

  describe('Null/Undefined Handling', () => {
    it('should handle undefined config values', () => {
      const protection = new NavigatorFingerprintProtection({
        userAgent: undefined,
        platform: undefined
      });
      
      expect(() => {
        protection.generateInjectionScript();
      }).not.toThrow();
    });
  });
});

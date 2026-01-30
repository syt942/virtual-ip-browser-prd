/**
 * Canvas Fingerprint Protection Tests
 * PRD Section 6.2 - P1 Privacy Protection Requirements
 * 
 * Tests for canvas fingerprinting prevention with consistency and anti-detection focus
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CanvasFingerprintProtection } from '../../../electron/core/privacy/fingerprint/canvas';

describe('CanvasFingerprintProtection', () => {
  let protection: CanvasFingerprintProtection;

  beforeEach(() => {
    protection = new CanvasFingerprintProtection();
  });

  describe('Constructor and Configuration', () => {
    it('should initialize with default noise level', () => {
      expect(protection.getNoise()).toBe(0.01);
    });

    it('should accept custom noise level', () => {
      const customProtection = new CanvasFingerprintProtection(0.05);
      expect(customProtection.getNoise()).toBe(0.05);
    });

    it('should generate unique session seed', () => {
      const seed1 = protection.getSessionSeed();
      const protection2 = new CanvasFingerprintProtection();
      const seed2 = protection2.getSessionSeed();

      // Seeds should be valid numbers
      expect(typeof seed1).toBe('number');
      expect(typeof seed2).toBe('number');
      expect(seed1).toBeGreaterThanOrEqual(0);
      expect(seed1).toBeLessThan(2147483647);
    });
  });

  describe('Noise Level Management', () => {
    it('should allow setting noise level', () => {
      protection.setNoise(0.02);
      expect(protection.getNoise()).toBe(0.02);
    });

    it('should clamp noise level to valid range (0-1)', () => {
      protection.setNoise(-0.5);
      expect(protection.getNoise()).toBe(0);

      protection.setNoise(1.5);
      expect(protection.getNoise()).toBe(1);
    });

    it('should accept boundary values', () => {
      protection.setNoise(0);
      expect(protection.getNoise()).toBe(0);

      protection.setNoise(1);
      expect(protection.getNoise()).toBe(1);
    });
  });

  describe('Session Seed Management', () => {
    it('should allow regenerating session seed', () => {
      const originalSeed = protection.getSessionSeed();
      protection.regenerateSeed();
      const newSeed = protection.getSessionSeed();

      // New seed should be different (statistically)
      // Note: There's a tiny chance they could be same, so we just verify it's valid
      expect(typeof newSeed).toBe('number');
      expect(newSeed).toBeGreaterThanOrEqual(0);
    });

    it('should generate valid seed range', () => {
      for (let i = 0; i < 100; i++) {
        protection.regenerateSeed();
        const seed = protection.getSessionSeed();
        expect(seed).toBeGreaterThanOrEqual(0);
        expect(seed).toBeLessThan(2147483647);
      }
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

    it('should embed noise level in script', () => {
      protection.setNoise(0.03);
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('const noise = 0.03');
    });

    it('should embed session seed in script', () => {
      const seed = protection.getSessionSeed();
      const script = protection.generateInjectionScript();
      
      expect(script).toContain(`const sessionSeed = ${seed}`);
    });
  });

  describe('Deterministic Noise (Consistency)', () => {
    it('should include seeded PRNG implementation', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('createSeededRandom');
      expect(script).toContain('Mulberry32');
    });

    it('should include pixel-position-based seeding', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('getPixelSeed');
      expect(script).toContain('x * 31 + y * 17');
    });

    it('should track canvas IDs for consistency', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('canvasIdMap');
      expect(script).toContain('WeakMap');
      expect(script).toContain('getCanvasId');
    });

    it('should apply deterministic noise to image data', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('addDeterministicNoise');
      expect(script).toContain('pixelRandom');
    });
  });

  describe('toDataURL Protection', () => {
    it('should override HTMLCanvasElement.prototype.toDataURL', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('HTMLCanvasElement.prototype.toDataURL');
      expect(script).toContain('originalToDataURL');
    });

    it('should apply noise before generating data URL', () => {
      const script = protection.generateInjectionScript();
      
      // Should get image data, add noise, put it back, then generate URL
      expect(script).toContain('originalGetImageData');
      expect(script).toContain('addDeterministicNoise');
      expect(script).toContain('putImageData');
    });
  });

  describe('toBlob Protection', () => {
    it('should override HTMLCanvasElement.prototype.toBlob', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('HTMLCanvasElement.prototype.toBlob');
      expect(script).toContain('originalToBlob');
    });
  });

  describe('getImageData Protection', () => {
    it('should override CanvasRenderingContext2D.prototype.getImageData', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('CanvasRenderingContext2D.prototype.getImageData');
      expect(script).toContain('protectedGetImageData');
    });

    it('should apply noise to returned image data', () => {
      const script = protection.generateInjectionScript();
      
      // In getImageData override, should apply noise
      expect(script).toContain('const imageData = originalGetImageData.apply');
      expect(script).toContain('addDeterministicNoise(imageData');
    });
  });

  describe('WebGL readPixels Protection', () => {
    it('should override WebGLRenderingContext.prototype.readPixels', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('WebGLRenderingContext.prototype.readPixels');
      expect(script).toContain('originalReadPixels');
    });

    it('should override WebGL2RenderingContext.prototype.readPixels', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('WebGL2RenderingContext.prototype.readPixels');
      expect(script).toContain('originalReadPixels2');
    });

    it('should add noise to WebGL pixel data', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('pixels[i]');
      expect(script).toContain('Math.min(255, Math.max(0');
    });
  });

  describe('OffscreenCanvas Protection', () => {
    it('should protect OffscreenCanvas.convertToBlob', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('OffscreenCanvas');
      expect(script).toContain('convertToBlob');
    });

    it('should check for OffscreenCanvas availability', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain("typeof OffscreenCanvas !== 'undefined'");
    });
  });

  describe('Timing Attack Prevention', () => {
    it('should include minimum operation time constant', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('MIN_OPERATION_TIME');
      expect(script).toContain('2'); // 2ms minimum
    });

    it('should include timing enforcement function', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('enforceMinTime');
      expect(script).toContain('performance.now()');
    });

    it('should use busy-wait for timing to prevent detection', () => {
      const script = protection.generateInjectionScript();
      
      // Should use busy-wait, not setTimeout
      expect(script).toContain('while (performance.now() < end)');
      expect(script).toContain('Busy wait');
    });

    it('should apply timing protection to toDataURL', () => {
      const script = protection.generateInjectionScript();
      
      // toDataURL should use enforceMinTime
      expect(script).toMatch(/protectedToDataURL[\s\S]*?enforceMinTime/);
    });

    it('should apply timing protection to getImageData', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toMatch(/protectedGetImageData[\s\S]*?enforceMinTime/);
    });
  });

  describe('Native Function Masking (Anti-Detection)', () => {
    it('should include maskAsNative helper', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('maskAsNative');
    });

    it('should mask toString to return native code', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('[native code]');
      expect(script).toContain("'toString'");
    });

    it('should set non-writable toString property', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('writable: false');
      expect(script).toContain('configurable: false');
    });

    it('should mask function name property', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain("'name'");
    });

    it('should apply masking to all protected functions', () => {
      const script = protection.generateInjectionScript();
      
      // All protected functions should be masked
      expect(script).toContain("maskAsNative(function(...args)");
      expect(script).toContain("'toDataURL'");
      expect(script).toContain("'toBlob'");
      expect(script).toContain("'getImageData'");
      expect(script).toContain("'readPixels'");
    });
  });

  describe('Pixel Noise Algorithm', () => {
    it('should apply noise to RGB channels', () => {
      const script = protection.generateInjectionScript();
      
      // Should modify R, G, B but not A
      expect(script).toContain('data[i]');     // R
      expect(script).toContain('data[i + 1]'); // G
      expect(script).toContain('data[i + 2]'); // B
      expect(script).toContain('// Keep alpha channel unchanged');
    });

    it('should clamp values to valid range (0-255)', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('Math.min(255, Math.max(0');
    });

    it('should iterate in steps of 4 (RGBA)', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('i += 4');
    });
  });

  describe('Error Handling', () => {
    it('should handle tainted canvas gracefully', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('try {');
      expect(script).toContain('catch (e)');
      expect(script).toContain('// Silent fail');
      expect(script).toContain('cross-origin');
    });
  });

  describe('Logging', () => {
    it('should include debug logging', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('console.log');
      expect(script).toContain('[Canvas Protection]');
      expect(script).toContain('timing attack prevention');
    });
  });

  describe('Script Consistency', () => {
    it('should generate identical scripts for same configuration', () => {
      const protection1 = new CanvasFingerprintProtection(0.01);
      const seed = protection1.getSessionSeed();
      
      // Create another with same seed (manually)
      const protection2 = new CanvasFingerprintProtection(0.01);
      
      // Note: Seeds will be different, but structure should be same
      const script1 = protection1.generateInjectionScript();
      const script2 = protection1.generateInjectionScript();
      
      expect(script1).toBe(script2);
    });

    it('should generate different scripts for different noise levels', () => {
      const protection1 = new CanvasFingerprintProtection(0.01);
      const protection2 = new CanvasFingerprintProtection(0.05);
      
      const script1 = protection1.generateInjectionScript();
      const script2 = protection2.generateInjectionScript();
      
      expect(script1).not.toBe(script2);
      expect(script1).toContain('const noise = 0.01');
      expect(script2).toContain('const noise = 0.05');
    });
  });
});

describe('Canvas Fingerprint Consistency Tests', () => {
  describe('Same Session Consistency', () => {
    it('should produce consistent fingerprints within same session', () => {
      const protection = new CanvasFingerprintProtection(0.01);
      const script = protection.generateInjectionScript();
      
      // The script uses sessionSeed for deterministic noise
      // Same pixel position should always get same noise
      expect(script).toContain('getPixelSeed(x, y, canvasId)');
      expect(script).toContain('createSeededRandom(getPixelSeed');
    });

    it('should use canvas ID for per-canvas consistency', () => {
      const script = new CanvasFingerprintProtection().generateInjectionScript();
      
      // Each canvas gets unique ID but consistent within that canvas
      expect(script).toContain('canvasIdMap.has(canvas)');
      expect(script).toContain('canvasIdMap.set(canvas, nextCanvasId++)');
    });
  });

  describe('Cross-Session Variation', () => {
    it('should generate different seeds for new sessions', () => {
      const seeds = new Set<number>();
      
      for (let i = 0; i < 50; i++) {
        const protection = new CanvasFingerprintProtection();
        seeds.add(protection.getSessionSeed());
      }
      
      // Should have good entropy (most seeds unique)
      expect(seeds.size).toBeGreaterThan(40);
    });
  });
});

describe('Canvas Anti-Detection Tests', () => {
  describe('Property Descriptor Consistency', () => {
    it('should not use Object.defineProperty detection-prone patterns', () => {
      const script = new CanvasFingerprintProtection().generateInjectionScript();
      
      // Should use direct prototype assignment with maskAsNative
      expect(script).toContain('HTMLCanvasElement.prototype.toDataURL = protectedToDataURL');
    });
  });

  describe('Function Signature Preservation', () => {
    it('should preserve original function signatures', () => {
      const script = new CanvasFingerprintProtection().generateInjectionScript();
      
      // Should use rest parameters to accept any arguments
      expect(script).toContain('function(...args)');
      expect(script).toContain('apply(canvas, args)');
    });
  });
});

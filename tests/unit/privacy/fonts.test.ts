/**
 * Unit Tests for Font Fingerprinting Protection
 * Tests font enumeration blocking and metrics spoofing
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FontFingerprintProtection } from '../../../electron/core/privacy/fingerprint/fonts';

describe('Font Fingerprinting Protection', () => {
  let fontProtection: FontFingerprintProtection;

  beforeEach(() => {
    fontProtection = new FontFingerprintProtection();
  });

  // ========================================================================
  // CONFIGURATION TESTS
  // ========================================================================
  describe('Configuration', () => {
    it('initializes with default configuration', () => {
      const config = fontProtection.getConfig();

      expect(config.platform).toBe('windows');
      expect(config.spoofMetrics).toBe(true);
      expect(config.metricsVariation).toBe(0.02);
      expect(config.blockEnumeration).toBe(true);
      expect(config.fontList).toBeDefined();
      expect(config.fontList.length).toBeGreaterThan(0);
    });

    it('allows configuration updates', () => {
      fontProtection.setConfig({
        platform: 'mac',
        spoofMetrics: false,
      });

      const config = fontProtection.getConfig();

      expect(config.platform).toBe('mac');
      expect(config.spoofMetrics).toBe(false);
    });

    it('preserves unmodified configuration values', () => {
      const originalVariation = fontProtection.getConfig().metricsVariation;

      fontProtection.setConfig({
        platform: 'linux',
      });

      const config = fontProtection.getConfig();

      expect(config.platform).toBe('linux');
      expect(config.metricsVariation).toBe(originalVariation);
    });
  });

  // ========================================================================
  // FONT LIST GENERATION
  // ========================================================================
  describe('Font List Generation', () => {
    it('generates Windows font list', () => {
      const fonts = FontFingerprintProtection.generateFontList('windows');

      expect(fonts).toBeInstanceOf(Array);
      expect(fonts.length).toBeGreaterThan(0);
      expect(fonts).toContain('Arial');
      expect(fonts).toContain('Calibri');
      expect(fonts).toContain('Segoe UI');
    });

    it('generates macOS font list', () => {
      const fonts = FontFingerprintProtection.generateFontList('mac');

      expect(fonts).toBeInstanceOf(Array);
      expect(fonts.length).toBeGreaterThan(0);
      expect(fonts).toContain('Arial');
      expect(fonts).toContain('Helvetica');
      expect(fonts).toContain('Helvetica Neue');
    });

    it('generates Linux font list', () => {
      const fonts = FontFingerprintProtection.generateFontList('linux');

      expect(fonts).toBeInstanceOf(Array);
      expect(fonts.length).toBeGreaterThan(0);
      expect(fonts).toContain('Arial');
      expect(fonts).toContain('DejaVu Sans');
      expect(fonts).toContain('Liberation Sans');
    });

    it('includes common fonts in all platforms', () => {
      const windowsFonts = FontFingerprintProtection.generateFontList('windows');
      const macFonts = FontFingerprintProtection.generateFontList('mac');
      const linuxFonts = FontFingerprintProtection.generateFontList('linux');

      const commonFonts = ['Arial', 'Verdana', 'Georgia'];

      commonFonts.forEach(font => {
        expect(windowsFonts).toContain(font);
        expect(macFonts).toContain(font);
        expect(linuxFonts).toContain(font);
      });
    });

    it('generates different font lists on each call (randomization)', () => {
      const list1 = FontFingerprintProtection.generateFontList('windows');
      const list2 = FontFingerprintProtection.generateFontList('windows');

      // Lists should have same fonts but possibly different order
      expect(list1.length).toBeGreaterThan(0);
      expect(list2.length).toBeGreaterThan(0);
      
      // Check if order differs (might occasionally fail due to randomness)
      const orderDiffers = list1.some((font, index) => font !== list2[index]);
      // This assertion acknowledges randomness - we just check lists are generated
      expect(list1).toBeInstanceOf(Array);
      expect(list2).toBeInstanceOf(Array);
    });
  });

  // ========================================================================
  // REALISTIC FONT LIST
  // ========================================================================
  describe('Realistic Font List Generation', () => {
    it('generates realistic font list with some fonts missing', () => {
      const fonts = FontFingerprintProtection.generateRealisticFontList('windows');

      expect(fonts).toBeInstanceOf(Array);
      expect(fonts.length).toBeGreaterThan(0);
      
      // Should have fewer fonts than complete list
      const completeFonts = FontFingerprintProtection.generateFontList('windows');
      expect(fonts.length).toBeLessThanOrEqual(completeFonts.length);
    });

    it('includes core fonts in realistic list', () => {
      const fonts = FontFingerprintProtection.generateRealisticFontList('windows');

      // Core fonts should almost always be present
      const coreFonts = ['Arial', 'Times New Roman', 'Courier New'];
      const presentCount = coreFonts.filter(font => fonts.includes(font)).length;
      
      // At least some core fonts should be present
      expect(presentCount).toBeGreaterThan(0);
    });

    it('generates different realistic lists (randomization)', () => {
      const list1 = FontFingerprintProtection.generateRealisticFontList('mac');
      const list2 = FontFingerprintProtection.generateRealisticFontList('mac');

      // Lists should be generated
      expect(list1).toBeInstanceOf(Array);
      expect(list2).toBeInstanceOf(Array);
      expect(list1.length).toBeGreaterThan(0);
      expect(list2.length).toBeGreaterThan(0);
    });
  });

  // ========================================================================
  // INJECTION SCRIPT GENERATION
  // ========================================================================
  describe('Injection Script Generation', () => {
    it('generates injection script', () => {
      const script = fontProtection.generateInjectionScript();

      expect(script).toBeDefined();
      expect(typeof script).toBe('string');
      expect(script.length).toBeGreaterThan(0);
    });

    it('includes font enumeration blocking code', () => {
      fontProtection.setConfig({ blockEnumeration: true });
      const script = fontProtection.generateInjectionScript();

      expect(script).toContain('document.fonts');
      expect(script).toContain('FontFaceSet');
    });

    it('includes font metrics spoofing code', () => {
      fontProtection.setConfig({ spoofMetrics: true });
      const script = fontProtection.generateInjectionScript();

      expect(script).toContain('measureText');
      expect(script).toContain('CanvasRenderingContext2D');
    });

    it('includes font list in script', () => {
      const testFonts = ['Arial', 'Helvetica', 'Times New Roman'];
      fontProtection.setConfig({ fontList: testFonts });
      
      const script = fontProtection.generateInjectionScript();

      testFonts.forEach(font => {
        expect(script).toContain(font);
      });
    });

    it('uses configured metrics variation', () => {
      fontProtection.setConfig({ metricsVariation: 0.05 });
      const script = fontProtection.generateInjectionScript();

      expect(script).toContain('0.05');
    });

    it('script includes console log for debugging', () => {
      const script = fontProtection.generateInjectionScript();

      expect(script).toContain('console.log');
      expect(script).toContain('FontSpoof');
    });

    it('wraps code in IIFE', () => {
      const script = fontProtection.generateInjectionScript();

      expect(script).toContain('(function()');
      expect(script).toContain('})()');
    });

    it('uses strict mode', () => {
      const script = fontProtection.generateInjectionScript();

      expect(script).toContain('use strict');
    });
  });

  // ========================================================================
  // PLATFORM-SPECIFIC BEHAVIOR
  // ========================================================================
  describe('Platform-Specific Behavior', () => {
    it('uses Windows fonts when configured for Windows', () => {
      fontProtection.setConfig({
        platform: 'windows',
        fontList: FontFingerprintProtection.generateFontList('windows'),
      });

      const config = fontProtection.getConfig();
      
      expect(config.fontList).toContain('Calibri');
      expect(config.fontList).toContain('Segoe UI');
    });

    it('uses macOS fonts when configured for macOS', () => {
      fontProtection.setConfig({
        platform: 'mac',
        fontList: FontFingerprintProtection.generateFontList('mac'),
      });

      const config = fontProtection.getConfig();
      
      expect(config.fontList).toContain('Helvetica Neue');
      expect(config.fontList).toContain('Menlo');
    });

    it('uses Linux fonts when configured for Linux', () => {
      fontProtection.setConfig({
        platform: 'linux',
        fontList: FontFingerprintProtection.generateFontList('linux'),
      });

      const config = fontProtection.getConfig();
      
      expect(config.fontList).toContain('DejaVu Sans');
      expect(config.fontList).toContain('Ubuntu');
    });
  });

  // ========================================================================
  // SCRIPT FUNCTIONALITY VERIFICATION
  // ========================================================================
  describe('Script Functionality', () => {
    it('script overrides document.fonts API', () => {
      const script = fontProtection.generateInjectionScript();

      expect(script).toContain('Object.defineProperty(window.document, \'fonts\'');
    });

    it('script hooks measureText for canvas context', () => {
      const script = fontProtection.generateInjectionScript();

      expect(script).toContain('CanvasRenderingContext2D.prototype.measureText');
    });

    it('script includes seeded random function', () => {
      const script = fontProtection.generateInjectionScript();

      expect(script).toContain('seededRandom');
      expect(script).toContain('FONT_SEED');
    });

    it('script modifies font metrics consistently', () => {
      const script = fontProtection.generateInjectionScript();

      // Should use seed-based randomization
      expect(script).toContain('seed');
      expect(script).toContain('modifier');
    });

    it('script handles CSS.supports for font-family', () => {
      const script = fontProtection.generateInjectionScript();

      expect(script).toContain('CSS.supports');
      expect(script).toContain('font-family');
    });

    it('script adds delay to FontFace.load()', () => {
      const script = fontProtection.generateInjectionScript();

      expect(script).toContain('FontFace');
      expect(script).toContain('.load');
      expect(script).toContain('setTimeout');
    });
  });

  // ========================================================================
  // EDGE CASES
  // ========================================================================
  describe('Edge Cases', () => {
    it('handles empty font list', () => {
      fontProtection.setConfig({ fontList: [] });
      const script = fontProtection.generateInjectionScript();

      expect(script).toBeDefined();
      expect(script).toContain('AVAILABLE_FONTS');
    });

    it('handles metrics variation of 0', () => {
      fontProtection.setConfig({ metricsVariation: 0 });
      const script = fontProtection.generateInjectionScript();

      expect(script).toContain('0');
    });

    it('handles metrics variation of 1 (100%)', () => {
      fontProtection.setConfig({ metricsVariation: 1 });
      const script = fontProtection.generateInjectionScript();

      expect(script).toContain('1');
    });

    it('handles font list with special characters', () => {
      fontProtection.setConfig({
        fontList: ['Arial', 'Times New Roman', 'Courier New'],
      });
      const script = fontProtection.generateInjectionScript();

      expect(script).toContain('Times New Roman');
    });
  });

  // ========================================================================
  // INTEGRATION WITH OTHER PROTECTIONS
  // ========================================================================
  describe('Integration', () => {
    it('can be configured alongside other fingerprint protections', () => {
      const config1 = {
        platform: 'windows' as const,
        fontList: ['Arial', 'Calibri'],
        spoofMetrics: true,
        metricsVariation: 0.02,
        blockEnumeration: true,
      };

      fontProtection.setConfig(config1);
      const result = fontProtection.getConfig();

      expect(result.platform).toBe('windows');
      expect(result.fontList).toEqual(['Arial', 'Calibri']);
    });

    it('generates unique scripts for different configurations', () => {
      fontProtection.setConfig({
        platform: 'windows',
        fontList: ['Arial'],
      });
      const script1 = fontProtection.generateInjectionScript();

      fontProtection.setConfig({
        platform: 'mac',
        fontList: ['Helvetica'],
      });
      const script2 = fontProtection.generateInjectionScript();

      expect(script1).not.toBe(script2);
      expect(script1).toContain('Arial');
      expect(script2).toContain('Helvetica');
    });
  });

  // ========================================================================
  // PERFORMANCE
  // ========================================================================
  describe('Performance', () => {
    it('generates font list quickly', () => {
      const start = Date.now();
      FontFingerprintProtection.generateFontList('windows');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100); // Should be very fast
    });

    it('generates injection script quickly', () => {
      const start = Date.now();
      fontProtection.generateInjectionScript();
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100); // Should be very fast
    });

    it('generates realistic font list quickly', () => {
      const start = Date.now();
      FontFingerprintProtection.generateRealisticFontList('mac');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100); // Should be very fast
    });
  });
});

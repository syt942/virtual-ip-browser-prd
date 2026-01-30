/**
 * WebGL Fingerprint Protection Tests
 * PRD Section 6.2 - P1 Privacy Protection Requirements
 * 
 * Tests for WebGL renderer/vendor string spoofing
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WebGLFingerprintProtection, WebGLSpoofConfig } from '../../../electron/core/privacy/fingerprint/webgl';
import {
  WEBGL_UNMASKED_VENDOR,
  WEBGL_UNMASKED_RENDERER,
  WEBGL_VERSION,
  WEBGL_SHADING_LANGUAGE_VERSION
} from '../../../electron/core/privacy/fingerprint/constants';

describe('WebGLFingerprintProtection', () => {
  let protection: WebGLFingerprintProtection;

  beforeEach(() => {
    protection = new WebGLFingerprintProtection();
  });

  describe('Constructor and Defaults', () => {
    it('should initialize with default configuration', () => {
      const config = protection.getConfig();
      
      expect(config.vendor).toBe('Intel Inc.');
      expect(config.renderer).toBe('Intel Iris OpenGL Engine');
      expect(config.version).toBe('WebGL 1.0');
      expect(config.shadingLanguageVersion).toBe('WebGL GLSL ES 1.0');
    });

    it('should accept custom configuration', () => {
      const customConfig: WebGLSpoofConfig = {
        vendor: 'NVIDIA Corporation',
        renderer: 'GeForce GTX 1080'
      };
      const customProtection = new WebGLFingerprintProtection(customConfig);
      const config = customProtection.getConfig();
      
      expect(config.vendor).toBe('NVIDIA Corporation');
      expect(config.renderer).toBe('GeForce GTX 1080');
      // Defaults should still apply
      expect(config.version).toBe('WebGL 1.0');
    });

    it('should return copy of config', () => {
      const config1 = protection.getConfig();
      const config2 = protection.getConfig();
      
      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });
  });

  describe('Configuration Management', () => {
    it('should allow updating configuration', () => {
      protection.setConfig({ vendor: 'AMD' });
      expect(protection.getConfig().vendor).toBe('AMD');
    });

    it('should merge configurations', () => {
      protection.setConfig({ vendor: 'AMD' });
      protection.setConfig({ renderer: 'Radeon RX 580' });
      
      const config = protection.getConfig();
      expect(config.vendor).toBe('AMD');
      expect(config.renderer).toBe('Radeon RX 580');
    });

    it('should preserve defaults when partially updating', () => {
      protection.setConfig({ vendor: 'AMD' });
      const config = protection.getConfig();
      
      expect(config.version).toBe('WebGL 1.0');
      expect(config.shadingLanguageVersion).toBe('WebGL GLSL ES 1.0');
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

    it('should embed configuration values', () => {
      protection.setConfig({
        vendor: 'TestVendor',
        renderer: 'TestRenderer'
      });
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('TestVendor');
      expect(script).toContain('TestRenderer');
    });
  });

  describe('WebGL Parameter Spoofing', () => {
    it('should override WebGLRenderingContext.prototype.getParameter', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('WebGLRenderingContext.prototype.getParameter');
      expect(script).toContain('getParameterProto');
    });

    it('should spoof UNMASKED_VENDOR_WEBGL (37445)', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('37445');
      expect(script).toContain('spoofConfig.vendor');
    });

    it('should spoof UNMASKED_RENDERER_WEBGL (37446)', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('37446');
      expect(script).toContain('spoofConfig.renderer');
    });

    it('should spoof VERSION (7938)', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('7938');
      expect(script).toContain('spoofConfig.version');
    });

    it('should spoof SHADING_LANGUAGE_VERSION (35724)', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('35724');
      expect(script).toContain('spoofConfig.shadingLanguageVersion');
    });

    it('should pass through other parameters to original', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('return getParameterProto.call(this, parameter)');
    });
  });

  describe('WebGL2 Support', () => {
    it('should check for WebGL2RenderingContext availability', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain("typeof WebGL2RenderingContext !== 'undefined'");
    });

    it('should override WebGL2RenderingContext.prototype.getParameter', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('WebGL2RenderingContext.prototype.getParameter');
      expect(script).toContain('getParameter2Proto');
    });

    it('should spoof same parameters for WebGL2', () => {
      const script = protection.generateInjectionScript();
      
      // The constants are defined once at the top and used via named references in WebGL2 section
      // Check that the constant values are defined at the top
      expect(script).toContain(`UNMASKED_VENDOR = ${WEBGL_UNMASKED_VENDOR}`);
      expect(script).toContain(`UNMASKED_RENDERER = ${WEBGL_UNMASKED_RENDERER}`);
      expect(script).toContain(`VERSION = ${WEBGL_VERSION}`);
      expect(script).toContain(`SHADING_LANG_VERSION = ${WEBGL_SHADING_LANGUAGE_VERSION}`);
      
      // Check that WebGL2 section uses the named constants
      const webgl2Section = script.substring(script.indexOf('WebGL2RenderingContext'));
      expect(webgl2Section).toContain('UNMASKED_VENDOR');
      expect(webgl2Section).toContain('UNMASKED_RENDERER');
      expect(webgl2Section).toContain('VERSION');
      expect(webgl2Section).toContain('SHADING_LANG_VERSION');
    });
  });

  describe('Debug Extension Blocking', () => {
    it('should override getExtension method', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('originalGetExtension');
      expect(script).toContain('WebGLRenderingContext.prototype.getExtension');
    });

    it('should block WEBGL_debug_renderer_info extension', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('WEBGL_debug_renderer_info');
      expect(script).toContain('return null');
    });

    it('should pass through other extensions', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('return originalGetExtension.call(this, name)');
    });
  });

  describe('Static Random Config Generation', () => {
    it('should generate random configuration', () => {
      const config = WebGLFingerprintProtection.generateRandomConfig();
      
      expect(config.vendor).toBeDefined();
      expect(config.renderer).toBeDefined();
      expect(config.version).toBeDefined();
      expect(config.shadingLanguageVersion).toBeDefined();
    });

    it('should select from predefined vendors', () => {
      const validVendors = [
        'Intel Inc.',
        'NVIDIA Corporation',
        'AMD',
        'Google Inc.'
      ];
      
      for (let i = 0; i < 50; i++) {
        const config = WebGLFingerprintProtection.generateRandomConfig();
        expect(validVendors).toContain(config.vendor);
      }
    });

    it('should select from predefined renderers', () => {
      const validRenderers = [
        'Intel Iris OpenGL Engine',
        'NVIDIA GeForce GTX 1060',
        'AMD Radeon RX 580',
        'ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0)'
      ];
      
      for (let i = 0; i < 50; i++) {
        const config = WebGLFingerprintProtection.generateRandomConfig();
        expect(validRenderers).toContain(config.renderer);
      }
    });

    it('should generate variation across calls', () => {
      const configs = new Set<string>();
      
      for (let i = 0; i < 100; i++) {
        const config = WebGLFingerprintProtection.generateRandomConfig();
        configs.add(`${config.vendor}-${config.renderer}`);
      }
      
      // Should have multiple unique combinations
      expect(configs.size).toBeGreaterThan(1);
    });
  });

  describe('Logging', () => {
    it('should include debug logging', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('console.log');
      expect(script).toContain('[WebGL Protection]');
    });
  });
});

describe('WebGL Consistency Tests', () => {
  describe('Vendor/Renderer Consistency', () => {
    it('should return same vendor on multiple getParameter calls', () => {
      const protection = new WebGLFingerprintProtection({ vendor: 'Intel Inc.' });
      const script = protection.generateInjectionScript();
      
      // The script always returns the same spoofConfig.vendor
      expect(script).toContain("return spoofConfig.vendor");
    });

    it('should return same renderer on multiple getParameter calls', () => {
      const protection = new WebGLFingerprintProtection({ renderer: 'Test Renderer' });
      const script = protection.generateInjectionScript();
      
      expect(script).toContain("return spoofConfig.renderer");
    });
  });

  describe('WebGL1 and WebGL2 Consistency', () => {
    it('should use same config for both WebGL versions', () => {
      const protection = new WebGLFingerprintProtection({
        vendor: 'ConsistentVendor',
        renderer: 'ConsistentRenderer'
      });
      const script = protection.generateInjectionScript();
      
      // Both WebGL1 and WebGL2 sections should reference spoofConfig
      const webgl1Match = script.match(/WebGLRenderingContext\.prototype\.getParameter[\s\S]*?return spoofConfig\.vendor/);
      const webgl2Match = script.match(/WebGL2RenderingContext\.prototype\.getParameter[\s\S]*?return spoofConfig\.vendor/);
      
      expect(webgl1Match).toBeTruthy();
      expect(webgl2Match).toBeTruthy();
    });
  });
});

describe('WebGL Anti-Detection Tests', () => {
  describe('Extension Hiding', () => {
    it('should hide debug renderer info extension', () => {
      const script = new WebGLFingerprintProtection().generateInjectionScript();
      
      // Extension request should return null, not throw
      expect(script).toContain("if (name === 'WEBGL_debug_renderer_info')");
      expect(script).toContain('return null');
    });
  });

  describe('Parameter Passthrough', () => {
    it('should not modify unrelated parameters', () => {
      const script = new WebGLFingerprintProtection().generateInjectionScript();
      
      // Should call original for non-fingerprint parameters
      expect(script).toContain('return getParameterProto.call(this, parameter)');
      expect(script).toContain('return getParameter2Proto.call(this, parameter)');
    });
  });
});

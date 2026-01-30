/**
 * WebGL Fingerprint Protection
 * Spoofs WebGL parameters to prevent fingerprinting
 */

import {
  WEBGL_UNMASKED_VENDOR,
  WEBGL_UNMASKED_RENDERER,
  WEBGL_VERSION,
  WEBGL_SHADING_LANGUAGE_VERSION,
  DEFAULT_WEBGL_VENDOR,
  DEFAULT_WEBGL_RENDERER,
  DEFAULT_WEBGL_VERSION,
  DEFAULT_GLSL_VERSION
} from './constants';

export interface WebGLSpoofConfig {
  vendor?: string;
  renderer?: string;
  version?: string;
  shadingLanguageVersion?: string;
}

export class WebGLFingerprintProtection {
  private config: WebGLSpoofConfig;

  constructor(config: WebGLSpoofConfig = {}) {
    this.config = {
      vendor: config.vendor || DEFAULT_WEBGL_VENDOR,
      renderer: config.renderer || DEFAULT_WEBGL_RENDERER,
      version: config.version || DEFAULT_WEBGL_VERSION,
      shadingLanguageVersion: config.shadingLanguageVersion || DEFAULT_GLSL_VERSION
    };
  }

  /**
   * Generate injection script for WebGL protection
   */
  generateInjectionScript(): string {
    const { vendor, renderer, version, shadingLanguageVersion } = this.config;
    
    return `
      (function() {
        'use strict';
        
        const spoofConfig = {
          vendor: '${vendor}',
          renderer: '${renderer}',
          version: '${version}',
          shadingLanguageVersion: '${shadingLanguageVersion}'
        };
        
        // WebGL parameter constants (from WEBGL_debug_renderer_info extension)
        const UNMASKED_VENDOR = ${WEBGL_UNMASKED_VENDOR};
        const UNMASKED_RENDERER = ${WEBGL_UNMASKED_RENDERER};
        const VERSION = ${WEBGL_VERSION};
        const SHADING_LANG_VERSION = ${WEBGL_SHADING_LANGUAGE_VERSION};
        
        // Override WebGL context parameters
        const getParameterProto = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(parameter) {
          if (parameter === UNMASKED_VENDOR) {
            return spoofConfig.vendor;
          }
          if (parameter === UNMASKED_RENDERER) {
            return spoofConfig.renderer;
          }
          if (parameter === VERSION) {
            return spoofConfig.version;
          }
          if (parameter === SHADING_LANG_VERSION) {
            return spoofConfig.shadingLanguageVersion;
          }
          
          return getParameterProto.call(this, parameter);
        };
        
        // Also handle WebGL2
        if (typeof WebGL2RenderingContext !== 'undefined') {
          const getParameter2Proto = WebGL2RenderingContext.prototype.getParameter;
          WebGL2RenderingContext.prototype.getParameter = function(parameter) {
            if (parameter === UNMASKED_VENDOR) return spoofConfig.vendor;
            if (parameter === UNMASKED_RENDERER) return spoofConfig.renderer;
            if (parameter === VERSION) return spoofConfig.version;
            if (parameter === SHADING_LANG_VERSION) return spoofConfig.shadingLanguageVersion;
            
            return getParameter2Proto.call(this, parameter);
          };
        }
        
        // Override getExtension to hide WEBGL_debug_renderer_info
        const originalGetExtension = WebGLRenderingContext.prototype.getExtension;
        WebGLRenderingContext.prototype.getExtension = function(name) {
          if (name === 'WEBGL_debug_renderer_info') {
            return null;
          }
          return originalGetExtension.call(this, name);
        };
        
        console.log('[WebGL Protection] WebGL fingerprinting protection enabled');
      })();
    `;
  }

  /**
   * Update spoof configuration
   */
  setConfig(config: WebGLSpoofConfig): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): WebGLSpoofConfig {
    return { ...this.config };
  }

  /**
   * Generate random WebGL configuration
   */
  static generateRandomConfig(): WebGLSpoofConfig {
    const vendors = [
      'Intel Inc.',
      'NVIDIA Corporation',
      'AMD',
      'Google Inc.'
    ];
    
    const renderers = [
      'Intel Iris OpenGL Engine',
      'NVIDIA GeForce GTX 1060',
      'AMD Radeon RX 580',
      'ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0)'
    ];
    
    return {
      vendor: vendors[Math.floor(Math.random() * vendors.length)],
      renderer: renderers[Math.floor(Math.random() * renderers.length)],
      version: 'WebGL 1.0',
      shadingLanguageVersion: 'WebGL GLSL ES 1.0'
    };
  }
}

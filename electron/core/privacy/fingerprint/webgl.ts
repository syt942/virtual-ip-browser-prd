/**
 * WebGL Fingerprint Protection
 * Spoofs WebGL parameters to prevent fingerprinting
 */

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
      vendor: config.vendor || 'Intel Inc.',
      renderer: config.renderer || 'Intel Iris OpenGL Engine',
      version: config.version || 'WebGL 1.0',
      shadingLanguageVersion: config.shadingLanguageVersion || 'WebGL GLSL ES 1.0'
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
        
        // Override WebGL context parameters
        const getParameterProto = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(parameter) {
          // UNMASKED_VENDOR_WEBGL
          if (parameter === 37445) {
            return spoofConfig.vendor;
          }
          // UNMASKED_RENDERER_WEBGL
          if (parameter === 37446) {
            return spoofConfig.renderer;
          }
          // VERSION
          if (parameter === 7938) {
            return spoofConfig.version;
          }
          // SHADING_LANGUAGE_VERSION
          if (parameter === 35724) {
            return spoofConfig.shadingLanguageVersion;
          }
          
          return getParameterProto.call(this, parameter);
        };
        
        // Also handle WebGL2
        if (typeof WebGL2RenderingContext !== 'undefined') {
          const getParameter2Proto = WebGL2RenderingContext.prototype.getParameter;
          WebGL2RenderingContext.prototype.getParameter = function(parameter) {
            if (parameter === 37445) return spoofConfig.vendor;
            if (parameter === 37446) return spoofConfig.renderer;
            if (parameter === 7938) return spoofConfig.version;
            if (parameter === 35724) return spoofConfig.shadingLanguageVersion;
            
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

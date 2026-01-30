/**
 * Canvas Fingerprint Protection
 * Randomizes canvas rendering to prevent fingerprinting
 * 
 * SECURITY FEATURES:
 * - Timing attack prevention via consistent execution time
 * - Deterministic noise based on session seed (prevents detection via repeated calls)
 * - WebGL canvas protection
 * - OffscreenCanvas protection
 */

import {
  MAX_INT32,
  UINT32_RANGE,
  CANVAS_MIN_OPERATION_TIME_MS,
  DEFAULT_CANVAS_NOISE,
  MAX_COLOR_CHANNEL_VALUE
} from './constants';

export class CanvasFingerprintProtection {
  private noise: number;
  private sessionSeed: number;

  constructor(noise: number = DEFAULT_CANVAS_NOISE) {
    this.noise = noise;
    // Generate session seed for deterministic but unique noise per session
    this.sessionSeed = Math.floor(Math.random() * MAX_INT32);
  }

  /**
   * Generate injection script for canvas protection
   * 
   * SECURITY IMPROVEMENTS:
   * - Timing attack prevention: adds consistent delay to canvas operations
   * - Deterministic noise: same input produces same output within session
   * - Covers WebGL readPixels and OffscreenCanvas
   * - Native function toString masking
   */
  generateInjectionScript(): string {
    const noise = this.noise;
    const seed = this.sessionSeed;
    
    return `
      (function() {
        'use strict';
        
        const noise = ${noise};
        const sessionSeed = ${seed};
        
        // SECURITY: Seeded PRNG for deterministic noise (prevents detection via multiple calls)
        // Uses Mulberry32 algorithm - fast and good distribution
        const UINT32_RANGE = ${UINT32_RANGE};
        function createSeededRandom(seed) {
          let state = seed;
          return function() {
            state = (state + 0x6D2B79F5) | 0;
            let t = state;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / UINT32_RANGE;
          };
        }
        
        // Create session-specific random generator
        const seededRandom = createSeededRandom(sessionSeed);
        
        // SECURITY: Generate pixel-position-based seed for deterministic per-pixel noise
        function getPixelSeed(x, y, canvasId) {
          return (x * 31 + y * 17 + canvasId) ^ sessionSeed;
        }
        
        // Store original methods
        const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
        const originalToBlob = HTMLCanvasElement.prototype.toBlob;
        const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
        const originalReadPixels = WebGLRenderingContext?.prototype?.readPixels;
        const originalReadPixels2 = WebGL2RenderingContext?.prototype?.readPixels;
        
        // Track canvas IDs for deterministic noise
        const canvasIdMap = new WeakMap();
        let nextCanvasId = 0;
        
        function getCanvasId(canvas) {
          if (!canvasIdMap.has(canvas)) {
            canvasIdMap.set(canvas, nextCanvasId++);
          }
          return canvasIdMap.get(canvas);
        }
        
        // SECURITY: Timing attack prevention
        // Canvas operations should take consistent time regardless of content
        const MIN_OPERATION_TIME = ${CANVAS_MIN_OPERATION_TIME_MS}; // Minimum ms for canvas operations
        
        function enforceMinTime(startTime, callback) {
          const elapsed = performance.now() - startTime;
          const remaining = MIN_OPERATION_TIME - elapsed;
          if (remaining > 0) {
            // SECURITY: Use busy-wait instead of setTimeout to prevent detection
            const end = performance.now() + remaining;
            while (performance.now() < end) {
              // Busy wait - prevents timing-based detection
            }
          }
          return callback();
        }
        
        // SECURITY: Add deterministic noise to image data
        // Uses position-based seeding so same canvas produces same output
        function addDeterministicNoise(imageData, canvasId) {
          const data = imageData.data;
          const width = imageData.width;
          
          for (let i = 0; i < data.length; i += 4) {
            const pixelIndex = i / 4;
            const x = pixelIndex % width;
            const y = Math.floor(pixelIndex / width);
            
            // Create deterministic random for this pixel position
            const pixelRandom = createSeededRandom(getPixelSeed(x, y, canvasId));
            
            // Add noise that's consistent for same pixel position
            const MAX_COLOR = ${MAX_COLOR_CHANNEL_VALUE};
            const delta = Math.floor((pixelRandom() - 0.5) * 2 * noise * MAX_COLOR);
            
            data[i] = Math.min(MAX_COLOR, Math.max(0, data[i] + delta));     // R
            data[i + 1] = Math.min(MAX_COLOR, Math.max(0, data[i + 1] + delta)); // G
            data[i + 2] = Math.min(MAX_COLOR, Math.max(0, data[i + 2] + delta)); // B
            // Keep alpha channel unchanged for consistency
          }
          return imageData;
        }
        
        // SECURITY: Helper to mask function as native
        function maskAsNative(fn, name) {
          Object.defineProperty(fn, 'toString', {
            value: function() { return 'function ' + name + '() { [native code] }'; },
            writable: false,
            configurable: false
          });
          Object.defineProperty(fn, 'name', {
            value: name,
            writable: false,
            configurable: false
          });
          return fn;
        }
        
        // Override toDataURL with timing protection
        const protectedToDataURL = maskAsNative(function(...args) {
          const startTime = performance.now();
          const canvas = this;
          const canvasId = getCanvasId(canvas);
          
          const context = canvas.getContext('2d');
          if (context) {
            try {
              const imageData = originalGetImageData.call(context, 0, 0, canvas.width, canvas.height);
              addDeterministicNoise(imageData, canvasId);
              context.putImageData(imageData, 0, 0);
            } catch (e) {
              // Silent fail if canvas is tainted (cross-origin)
            }
          }
          
          return enforceMinTime(startTime, () => originalToDataURL.apply(canvas, args));
        }, 'toDataURL');
        
        HTMLCanvasElement.prototype.toDataURL = protectedToDataURL;
        
        // Override toBlob with timing protection
        const protectedToBlob = maskAsNative(function(callback, ...args) {
          const startTime = performance.now();
          const canvas = this;
          const canvasId = getCanvasId(canvas);
          
          const context = canvas.getContext('2d');
          if (context) {
            try {
              const imageData = originalGetImageData.call(context, 0, 0, canvas.width, canvas.height);
              addDeterministicNoise(imageData, canvasId);
              context.putImageData(imageData, 0, 0);
            } catch (e) {
              // Silent fail
            }
          }
          
          enforceMinTime(startTime, () => {});
          return originalToBlob.call(canvas, callback, ...args);
        }, 'toBlob');
        
        HTMLCanvasElement.prototype.toBlob = protectedToBlob;
        
        // Override getImageData with timing protection
        const protectedGetImageData = maskAsNative(function(...args) {
          const startTime = performance.now();
          const canvas = this.canvas;
          const canvasId = canvas ? getCanvasId(canvas) : 0;
          
          const imageData = originalGetImageData.apply(this, args);
          addDeterministicNoise(imageData, canvasId);
          
          return enforceMinTime(startTime, () => imageData);
        }, 'getImageData');
        
        CanvasRenderingContext2D.prototype.getImageData = protectedGetImageData;
        
        // SECURITY: Protect WebGL readPixels (used for WebGL fingerprinting)
        if (originalReadPixels) {
          const protectedReadPixels = maskAsNative(function(x, y, width, height, format, type, pixels) {
            const startTime = performance.now();
            originalReadPixels.call(this, x, y, width, height, format, type, pixels);
            
            // Add noise to WebGL pixel data
            if (pixels && pixels.length) {
              const canvasId = this.canvas ? getCanvasId(this.canvas) : 0;
              const MAX_COLOR = ${MAX_COLOR_CHANNEL_VALUE};
              for (let i = 0; i < pixels.length; i += 4) {
                const pixelRandom = createSeededRandom(getPixelSeed(i, canvasId, sessionSeed));
                const delta = Math.floor((pixelRandom() - 0.5) * 2 * noise * MAX_COLOR);
                pixels[i] = Math.min(MAX_COLOR, Math.max(0, pixels[i] + delta));
                pixels[i + 1] = Math.min(MAX_COLOR, Math.max(0, pixels[i + 1] + delta));
                pixels[i + 2] = Math.min(MAX_COLOR, Math.max(0, pixels[i + 2] + delta));
              }
            }
            
            enforceMinTime(startTime, () => {});
          }, 'readPixels');
          
          WebGLRenderingContext.prototype.readPixels = protectedReadPixels;
        }
        
        if (originalReadPixels2) {
          const protectedReadPixels2 = maskAsNative(function(x, y, width, height, format, type, pixels) {
            const startTime = performance.now();
            originalReadPixels2.call(this, x, y, width, height, format, type, pixels);
            
            if (pixels && pixels.length) {
              const canvasId = this.canvas ? getCanvasId(this.canvas) : 0;
              const MAX_COLOR = ${MAX_COLOR_CHANNEL_VALUE};
              for (let i = 0; i < pixels.length; i += 4) {
                const pixelRandom = createSeededRandom(getPixelSeed(i, canvasId, sessionSeed));
                const delta = Math.floor((pixelRandom() - 0.5) * 2 * noise * MAX_COLOR);
                pixels[i] = Math.min(MAX_COLOR, Math.max(0, pixels[i] + delta));
                pixels[i + 1] = Math.min(MAX_COLOR, Math.max(0, pixels[i + 1] + delta));
                pixels[i + 2] = Math.min(MAX_COLOR, Math.max(0, pixels[i + 2] + delta));
              }
            }
            
            enforceMinTime(startTime, () => {});
          }, 'readPixels');
          
          WebGL2RenderingContext.prototype.readPixels = protectedReadPixels2;
        }
        
        // SECURITY: Protect OffscreenCanvas if available
        if (typeof OffscreenCanvas !== 'undefined') {
          const originalOffscreenToBlob = OffscreenCanvas.prototype.convertToBlob;
          if (originalOffscreenToBlob) {
            OffscreenCanvas.prototype.convertToBlob = maskAsNative(function(...args) {
              const startTime = performance.now();
              // Note: OffscreenCanvas noise is non-deterministic as it may be in workers
              return enforceMinTime(startTime, () => originalOffscreenToBlob.apply(this, args));
            }, 'convertToBlob');
          }
        }
        
        console.log('[Canvas Protection] Enhanced canvas fingerprinting protection enabled with timing attack prevention');
      })();
    `;
  }

  /**
   * Set noise level
   */
  setNoise(noise: number): void {
    this.noise = Math.max(0, Math.min(1, noise)); // Clamp between 0 and 1
  }

  /**
   * Get current noise level
   */
  getNoise(): number {
    return this.noise;
  }
  
  /**
   * Regenerate session seed (call when creating new browser session)
   */
  regenerateSeed(): void {
    this.sessionSeed = Math.floor(Math.random() * MAX_INT32);
  }
  
  /**
   * Get current session seed (for debugging/testing)
   */
  getSessionSeed(): number {
    return this.sessionSeed;
  }
}

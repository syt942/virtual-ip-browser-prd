/**
 * Font Fingerprinting Protection
 * Prevents font enumeration and spoofs font metrics
 * 
 * Font fingerprinting techniques:
 * 1. Font enumeration via document.fonts API
 * 2. Font detection via canvas text rendering
 * 3. Font metrics detection (width/height measurement)
 * 4. System font detection via CSS @font-face
 */

// ============================================================================
// FONT LISTS
// ============================================================================

/**
 * Common fonts across all platforms
 */
const COMMON_FONTS = [
  'Arial',
  'Courier New',
  'Georgia',
  'Times New Roman',
  'Verdana',
  'Comic Sans MS',
  'Impact',
  'Trebuchet MS',
  'Arial Black',
  'Palatino',
];

/**
 * Windows-specific fonts
 */
const WINDOWS_FONTS = [
  ...COMMON_FONTS,
  'Calibri',
  'Cambria',
  'Consolas',
  'Candara',
  'Corbel',
  'Constantia',
  'Microsoft Sans Serif',
  'Segoe UI',
  'Tahoma',
  'Lucida Console',
  'Franklin Gothic Medium',
];

/**
 * macOS-specific fonts
 */
const MACOS_FONTS = [
  ...COMMON_FONTS,
  'Apple Chancery',
  'Apple SD Gothic Neo',
  'Helvetica',
  'Helvetica Neue',
  'Monaco',
  'Menlo',
  'Lucida Grande',
  'Gill Sans',
  'Baskerville',
  'Optima',
  'Futura',
];

/**
 * Linux-specific fonts
 */
const LINUX_FONTS = [
  ...COMMON_FONTS,
  'DejaVu Sans',
  'DejaVu Serif',
  'DejaVu Sans Mono',
  'Liberation Sans',
  'Liberation Serif',
  'Liberation Mono',
  'Ubuntu',
  'Ubuntu Mono',
  'Cantarell',
  'Droid Sans',
];

/**
 * Extended font list (used occasionally for variation)
 */
const EXTENDED_FONTS = [
  'Andale Mono',
  'Courier',
  'Garamond',
  'Geneva',
  'Lucida',
  'Lucida Sans',
  'Monaco',
  'Rockwell',
  'Symbol',
  'Webdings',
  'Wingdings',
];

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface FontSpoofConfig {
  platform: 'windows' | 'mac' | 'linux';
  fontList: string[];
  spoofMetrics: boolean;
  metricsVariation: number; // 0-1, amount of random variation
  blockEnumeration: boolean;
}

// ============================================================================
// FONT FINGERPRINT PROTECTION
// ============================================================================

export class FontFingerprintProtection {
  private config: FontSpoofConfig;

  constructor() {
    // Default configuration
    this.config = {
      platform: 'windows',
      fontList: WINDOWS_FONTS,
      spoofMetrics: true,
      metricsVariation: 0.02, // 2% variation
      blockEnumeration: true,
    };
  }

  /**
   * Set configuration
   */
  setConfig(config: Partial<FontSpoofConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): FontSpoofConfig {
    return { ...this.config };
  }

  /**
   * Generate font list based on platform
   */
  static generateFontList(platform: 'windows' | 'mac' | 'linux'): string[] {
    const baseFonts = platform === 'windows' ? WINDOWS_FONTS
      : platform === 'mac' ? MACOS_FONTS
      : LINUX_FONTS;

    // Randomly include some extended fonts (30% chance for each)
    const extended = EXTENDED_FONTS.filter(() => Math.random() > 0.7);

    // Combine and shuffle
    const allFonts = [...baseFonts, ...extended];
    return shuffleArray(allFonts);
  }

  /**
   * Generate injection script for font spoofing
   */
  generateInjectionScript(): string {
    const fontList = JSON.stringify(this.config.fontList);
    const metricsVariation = this.config.metricsVariation;
    const spoofMetrics = this.config.spoofMetrics;
    const blockEnumeration = this.config.blockEnumeration;

    return `
(function() {
  'use strict';
  
  // Seed for consistent random values within this session
  const FONT_SEED = ${Math.random()};
  
  // Seeded random number generator
  function seededRandom(seed) {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  }
  
  // Font list to report
  const AVAILABLE_FONTS = ${fontList};
  
  // ========================================================================
  // 1. SPOOF document.fonts API
  // ========================================================================
  
  if (${blockEnumeration} && window.document && window.document.fonts) {
    const originalFonts = window.document.fonts;
    
    // Create a fake FontFaceSet
    const fakeFontFaceSet = {
      size: AVAILABLE_FONTS.length,
      
      // Return fake fonts when iterating
      [Symbol.iterator]: function*() {
        for (const fontFamily of AVAILABLE_FONTS) {
          yield {
            family: fontFamily,
            style: 'normal',
            weight: '400',
            stretch: 'normal',
            unicodeRange: 'U+0-10FFFF',
            variant: 'normal',
            featureSettings: 'normal',
            display: 'auto',
            status: 'loaded',
          };
        }
      },
      
      forEach: function(callback, thisArg) {
        AVAILABLE_FONTS.forEach((fontFamily, index) => {
          callback.call(thisArg, {
            family: fontFamily,
            style: 'normal',
            weight: '400',
          }, index, this);
        });
      },
      
      has: function(font) {
        if (!font || !font.family) return false;
        return AVAILABLE_FONTS.includes(font.family);
      },
      
      check: function(font, text) {
        // Always return true for fonts in our list
        const fontFamily = font.match(/['"]([^'"]+)['"]/)?.[1] || 
                          font.match(/\\b([A-Za-z0-9 ]+)/)?.[1];
        return fontFamily ? AVAILABLE_FONTS.includes(fontFamily) : false;
      },
      
      load: function(font, text) {
        return Promise.resolve([{
          family: font,
          status: 'loaded'
        }]);
      },
      
      ready: Promise.resolve(fakeFontFaceSet),
      status: 'loaded',
      
      add: function() { return this; },
      clear: function() {},
      delete: function() { return false; },
      
      addEventListener: function() {},
      removeEventListener: function() {},
      dispatchEvent: function() { return true; },
    };
    
    // Override document.fonts
    Object.defineProperty(window.document, 'fonts', {
      get: function() { return fakeFontFaceSet; },
      enumerable: true,
      configurable: false,
    });
  }
  
  // ========================================================================
  // 2. SPOOF FONT METRICS (Canvas-based detection)
  // ========================================================================
  
  if (${spoofMetrics}) {
    const CanvasRenderingContext2D = window.CanvasRenderingContext2D;
    const OffscreenCanvasRenderingContext2D = window.OffscreenCanvasRenderingContext2D;
    
    // Hook measureText to add variation
    function createMeasureTextHook(ctx) {
      const originalMeasureText = ctx.measureText;
      
      return function measureText(text) {
        const result = originalMeasureText.call(this, text);
        
        // Create a new TextMetrics-like object with modified values
        const seed = FONT_SEED + text.length;
        const variation = ${metricsVariation};
        const modifier = 1 + (seededRandom(seed) - 0.5) * variation;
        
        // Modify width slightly
        const modifiedWidth = result.width * modifier;
        
        // Create proxy to modify properties
        return new Proxy(result, {
          get(target, prop) {
            if (prop === 'width') {
              return modifiedWidth;
            }
            
            // Modify other metrics proportionally
            if (prop === 'actualBoundingBoxLeft') {
              return target[prop] * modifier;
            }
            if (prop === 'actualBoundingBoxRight') {
              return target[prop] * modifier;
            }
            if (prop === 'actualBoundingBoxAscent') {
              return target[prop] * modifier;
            }
            if (prop === 'actualBoundingBoxDescent') {
              return target[prop] * modifier;
            }
            
            return target[prop];
          }
        });
      };
    }
    
    // Hook for regular canvas
    if (CanvasRenderingContext2D && CanvasRenderingContext2D.prototype) {
      const originalMeasureText = CanvasRenderingContext2D.prototype.measureText;
      CanvasRenderingContext2D.prototype.measureText = createMeasureTextHook({
        measureText: originalMeasureText
      });
    }
    
    // Hook for offscreen canvas
    if (OffscreenCanvasRenderingContext2D && OffscreenCanvasRenderingContext2D.prototype) {
      const originalMeasureText = OffscreenCanvasRenderingContext2D.prototype.measureText;
      OffscreenCanvasRenderingContext2D.prototype.measureText = createMeasureTextHook({
        measureText: originalMeasureText
      });
    }
  }
  
  // ========================================================================
  // 3. BLOCK CSS FONT DETECTION
  // ========================================================================
  
  // Some sites try to detect fonts by loading @font-face with local()
  // and checking if it loads. We can't easily prevent this, but we can
  // make the timing inconsistent to reduce fingerprinting accuracy.
  
  if (window.FontFace) {
    const OriginalFontFace = window.FontFace;
    
    window.FontFace = function(family, source, descriptors) {
      const fontFace = new OriginalFontFace(family, source, descriptors);
      
      // Add random delay to load
      const originalLoad = fontFace.load;
      fontFace.load = function() {
        return new Promise((resolve, reject) => {
          const delay = Math.random() * 10; // 0-10ms delay
          setTimeout(() => {
            originalLoad.call(fontFace).then(resolve, reject);
          }, delay);
        });
      };
      
      return fontFace;
    };
    
    // Copy static properties
    Object.setPrototypeOf(window.FontFace, OriginalFontFace);
    Object.setPrototypeOf(window.FontFace.prototype, OriginalFontFace.prototype);
  }
  
  // ========================================================================
  // 4. SPOOF SYSTEM FONT LIST
  // ========================================================================
  
  // Create a getter for font-related CSS properties
  if (window.CSS && window.CSS.supports) {
    const originalSupports = window.CSS.supports;
    
    window.CSS.supports = function(property, value) {
      // Intercept font-family checks
      if (property === 'font-family' && value) {
        // Check if the font is in our allowed list
        const fontName = value.replace(/['"]/g, '').trim();
        const isAllowed = AVAILABLE_FONTS.some(font => 
          font.toLowerCase() === fontName.toLowerCase()
        );
        
        // If not in our list, return false
        if (!isAllowed && !value.includes(',')) {
          return false;
        }
      }
      
      return originalSupports.call(this, property, value);
    };
  }
  
  console.log('[FontSpoof] Font fingerprinting protection active - ${this.config.fontList.length} fonts available');
})();
`;
  }

  /**
   * Generate realistic font list based on platform
   */
  static generateRealisticFontList(platform: 'windows' | 'mac' | 'linux'): string[] {
    const baseFonts = this.generateFontList(platform);
    
    // Simulate some fonts being missing (realistic scenario)
    const presentProbability = 0.9; // 90% of fonts are present
    return baseFonts.filter(() => Math.random() < presentProbability);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Fisher-Yates shuffle algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

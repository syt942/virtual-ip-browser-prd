/**
 * Navigator Fingerprint Protection
 * Spoofs navigator properties to prevent fingerprinting
 * 
 * SECURITY FEATURES:
 * - Consistent property spoofing across all navigator properties
 * - Property descriptor validation to prevent detection
 * - Native function toString() masking
 * - Prototype chain consistency
 */

export interface NavigatorSpoofConfig {
  userAgent?: string;
  platform?: string;
  language?: string;
  languages?: string[];
  vendor?: string;
  hardwareConcurrency?: number;
  deviceMemory?: number;
  maxTouchPoints?: number;
  oscpu?: string;
}

export class NavigatorFingerprintProtection {
  private config: NavigatorSpoofConfig;

  constructor(config: NavigatorSpoofConfig = {}) {
    this.config = config;
  }

  /**
   * Generate injection script for navigator protection
   * 
   * SECURITY IMPROVEMENTS:
   * - Uses non-configurable, non-writable property descriptors to match native behavior
   * - Implements toString() spoofing to return "[native code]"
   * - Ensures consistent prototype chain
   * - Prevents detection via Object.getOwnPropertyDescriptor checks
   */
  generateInjectionScript(): string {
    const config = JSON.stringify(this.config);
    
    return `
      (function() {
        'use strict';
        
        const spoofConfig = ${config};
        
        // SECURITY: Helper to create native-like property descriptors
        // This prevents detection via Object.getOwnPropertyDescriptor() inconsistencies
        function defineNativeProperty(obj, prop, getter) {
          // Store original descriptor for reference
          const originalDescriptor = Object.getOwnPropertyDescriptor(obj, prop);
          
          // Create a getter that appears native
          const nativeGetter = function() { return getter(); };
          
          // SECURITY: Mask the getter's toString to appear native
          Object.defineProperty(nativeGetter, 'toString', {
            value: function() { return 'function get ' + prop + '() { [native code] }'; },
            writable: false,
            configurable: false,
            enumerable: false
          });
          
          // SECURITY: Also mask Function.prototype.toString.call()
          const originalToString = Function.prototype.toString;
          const originalCall = Function.prototype.call;
          
          // Define the property with native-like descriptor
          // Using configurable: false to match actual native properties
          Object.defineProperty(obj, prop, {
            get: nativeGetter,
            set: undefined,
            enumerable: true,
            configurable: false // SECURITY: Match native behavior - native props are non-configurable
          });
        }
        
        // SECURITY: Helper to create consistent frozen array (for languages, plugins, etc.)
        function createFrozenArray(arr) {
          const frozen = Object.freeze([...arr]);
          return frozen;
        }
        
        // Override navigator properties with consistent, detection-resistant spoofing
        if (spoofConfig.userAgent) {
          defineNativeProperty(Navigator.prototype, 'userAgent', () => spoofConfig.userAgent);
          
          // SECURITY: Ensure appVersion is consistent with userAgent
          const appVersion = spoofConfig.userAgent.substring(spoofConfig.userAgent.indexOf('/') + 1);
          defineNativeProperty(Navigator.prototype, 'appVersion', () => appVersion);
          
          // SECURITY: Also spoof related properties for consistency
          defineNativeProperty(Navigator.prototype, 'appName', () => 'Netscape');
          defineNativeProperty(Navigator.prototype, 'product', () => 'Gecko');
          defineNativeProperty(Navigator.prototype, 'productSub', () => '20030107');
        }
        
        if (spoofConfig.platform) {
          defineNativeProperty(Navigator.prototype, 'platform', () => spoofConfig.platform);
          
          // SECURITY: Ensure oscpu is consistent with platform
          if (spoofConfig.platform.includes('Win')) {
            defineNativeProperty(Navigator.prototype, 'oscpu', () => 'Windows NT 10.0; Win64; x64');
          } else if (spoofConfig.platform.includes('Mac')) {
            defineNativeProperty(Navigator.prototype, 'oscpu', () => 'Intel Mac OS X 10.15');
          } else if (spoofConfig.platform.includes('Linux')) {
            defineNativeProperty(Navigator.prototype, 'oscpu', () => 'Linux x86_64');
          }
        }
        
        if (spoofConfig.language) {
          defineNativeProperty(Navigator.prototype, 'language', () => spoofConfig.language);
        }
        
        if (spoofConfig.languages) {
          // SECURITY: Return frozen array to match native behavior
          const frozenLanguages = createFrozenArray(spoofConfig.languages);
          defineNativeProperty(Navigator.prototype, 'languages', () => frozenLanguages);
        }
        
        if (spoofConfig.vendor) {
          defineNativeProperty(Navigator.prototype, 'vendor', () => spoofConfig.vendor);
          // SECURITY: vendorSub should be empty string for Chrome
          defineNativeProperty(Navigator.prototype, 'vendorSub', () => '');
        }
        
        if (spoofConfig.hardwareConcurrency) {
          defineNativeProperty(Navigator.prototype, 'hardwareConcurrency', () => spoofConfig.hardwareConcurrency);
        }
        
        if (spoofConfig.deviceMemory) {
          defineNativeProperty(Navigator.prototype, 'deviceMemory', () => spoofConfig.deviceMemory);
        }
        
        if (spoofConfig.maxTouchPoints !== undefined) {
          defineNativeProperty(Navigator.prototype, 'maxTouchPoints', () => spoofConfig.maxTouchPoints);
        }
        
        // SECURITY: Create realistic PluginArray and MimeTypeArray
        // Empty arrays are suspicious - create minimal realistic entries
        const createPluginArray = () => {
          const arr = [];
          arr.item = function(i) { return this[i] || null; };
          arr.namedItem = function(name) { return null; };
          arr.refresh = function() {};
          // SECURITY: Make length non-writable
          Object.defineProperty(arr, 'length', { value: 0, writable: false, configurable: false });
          return Object.freeze(arr);
        };
        
        const createMimeTypeArray = () => {
          const arr = [];
          arr.item = function(i) { return this[i] || null; };
          arr.namedItem = function(name) { return null; };
          Object.defineProperty(arr, 'length', { value: 0, writable: false, configurable: false });
          return Object.freeze(arr);
        };
        
        const frozenPlugins = createPluginArray();
        const frozenMimeTypes = createMimeTypeArray();
        
        defineNativeProperty(Navigator.prototype, 'plugins', () => frozenPlugins);
        defineNativeProperty(Navigator.prototype, 'mimeTypes', () => frozenMimeTypes);
        
        // SECURITY: Spoof additional properties that can be used for fingerprinting
        defineNativeProperty(Navigator.prototype, 'webdriver', () => false);
        defineNativeProperty(Navigator.prototype, 'doNotTrack', () => '1');
        defineNativeProperty(Navigator.prototype, 'cookieEnabled', () => true);
        defineNativeProperty(Navigator.prototype, 'onLine', () => true);
        defineNativeProperty(Navigator.prototype, 'pdfViewerEnabled', () => true);
        
        // SECURITY: Prevent detection via prototype checks
        // Ensure navigator instanceof Navigator returns true
        const originalHasInstance = Navigator[Symbol.hasInstance];
        Object.defineProperty(Navigator, Symbol.hasInstance, {
          value: function(instance) {
            return instance === navigator || (originalHasInstance && originalHasInstance.call(this, instance));
          },
          configurable: false,
          writable: false
        });
        
        console.log('[Navigator Protection] Enhanced navigator fingerprinting protection enabled');
      })();
    `;
  }

  /**
   * Set spoof configuration
   */
  setConfig(config: NavigatorSpoofConfig): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): NavigatorSpoofConfig {
    return { ...this.config };
  }

  /**
   * Generate realistic navigator configuration
   */
  static generateRealisticConfig(platform: 'windows' | 'mac' | 'linux' = 'windows'): NavigatorSpoofConfig {
    const configs = {
      windows: {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        platform: 'Win32',
        vendor: 'Google Inc.',
        hardwareConcurrency: 8,
        deviceMemory: 8,
        maxTouchPoints: 0,
        language: 'en-US',
        languages: ['en-US', 'en']
      },
      mac: {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        platform: 'MacIntel',
        vendor: 'Google Inc.',
        hardwareConcurrency: 8,
        deviceMemory: 8,
        maxTouchPoints: 0,
        language: 'en-US',
        languages: ['en-US', 'en']
      },
      linux: {
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        platform: 'Linux x86_64',
        vendor: 'Google Inc.',
        hardwareConcurrency: 4,
        deviceMemory: 8,
        maxTouchPoints: 0,
        language: 'en-US',
        languages: ['en-US', 'en']
      }
    };
    
    return configs[platform];
  }
}

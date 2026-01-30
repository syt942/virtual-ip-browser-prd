/**
 * Timezone Fingerprint Protection
 * Spoofs timezone to match proxy location
 */

export class TimezoneFingerprintProtection {
  private timezone: string;
  private timezoneOffset: number;

  constructor(timezone: string = 'America/New_York', timezoneOffset: number = -5) {
    this.timezone = timezone;
    this.timezoneOffset = timezoneOffset;
  }

  /**
   * Generate injection script for timezone protection
   */
  generateInjectionScript(): string {
    const { timezone, timezoneOffset } = this;
    
    return `
      (function() {
        'use strict';
        
        const spoofTimezone = '${timezone}';
        const spoofOffset = ${timezoneOffset};
        
        // Override Date methods
        const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
        Date.prototype.getTimezoneOffset = function() {
          return spoofOffset * -60; // Convert hours to minutes, negate for JS convention
        };
        
        // Override Intl.DateTimeFormat
        const originalResolvedOptions = Intl.DateTimeFormat.prototype.resolvedOptions;
        Intl.DateTimeFormat.prototype.resolvedOptions = function() {
          const options = originalResolvedOptions.call(this);
          options.timeZone = spoofTimezone;
          return options;
        };
        
        // Override toLocaleString methods to use spoofed timezone
        const originalToLocaleString = Date.prototype.toLocaleString;
        Date.prototype.toLocaleString = function(locales, options) {
          if (!options) options = {};
          options.timeZone = spoofTimezone;
          return originalToLocaleString.call(this, locales, options);
        };
        
        const originalToLocaleDateString = Date.prototype.toLocaleDateString;
        Date.prototype.toLocaleDateString = function(locales, options) {
          if (!options) options = {};
          options.timeZone = spoofTimezone;
          return originalToLocaleDateString.call(this, locales, options);
        };
        
        const originalToLocaleTimeString = Date.prototype.toLocaleTimeString;
        Date.prototype.toLocaleTimeString = function(locales, options) {
          if (!options) options = {};
          options.timeZone = spoofTimezone;
          return originalToLocaleTimeString.call(this, locales, options);
        };
        
        console.log('[Timezone Protection] Timezone spoofing enabled:', spoofTimezone);
      })();
    `;
  }

  /**
   * Set timezone
   */
  setTimezone(timezone: string, offset: number): void {
    this.timezone = timezone;
    this.timezoneOffset = offset;
  }

  /**
   * Get current timezone configuration
   */
  getTimezone(): { timezone: string; offset: number } {
    return {
      timezone: this.timezone,
      offset: this.timezoneOffset
    };
  }

  /**
   * Get timezone from region
   */
  static getTimezoneForRegion(region: string): { timezone: string; offset: number } {
    const timezones: Record<string, { timezone: string; offset: number }> = {
      'US': { timezone: 'America/New_York', offset: -5 },
      'UK': { timezone: 'Europe/London', offset: 0 },
      'DE': { timezone: 'Europe/Berlin', offset: 1 },
      'FR': { timezone: 'Europe/Paris', offset: 1 },
      'JP': { timezone: 'Asia/Tokyo', offset: 9 },
      'CN': { timezone: 'Asia/Shanghai', offset: 8 },
      'AU': { timezone: 'Australia/Sydney', offset: 10 },
      'IN': { timezone: 'Asia/Kolkata', offset: 5.5 },
      'BR': { timezone: 'America/Sao_Paulo', offset: -3 },
      'RU': { timezone: 'Europe/Moscow', offset: 3 }
    };
    
    return timezones[region] || timezones['US'];
  }
}

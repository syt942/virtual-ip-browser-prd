/**
 * Geographic Rotation Strategy
 * Selects proxies based on geographic location preferences
 */

import type { ProxyConfig, RotationContext } from '../types';
import { BaseStrategy } from './base-strategy';

export class GeographicStrategy extends BaseStrategy {
  private geoLastUsedByCountry: Map<string, number> = new Map();

  selectProxy(proxies: ProxyConfig[], context?: RotationContext): ProxyConfig | null {
    if (proxies.length === 0) {return null;}

    const preferences = this.config.geographicPreferences || [];
    const excludeCountries = this.config.excludeCountries || [];
    const preferredRegions = this.config.preferredRegions || [];
    const targetCountry = context?.targetCountry || preferences[0];

    // Filter proxies by geographic criteria
    let candidates = proxies.filter(proxy => {
      if (!proxy.geolocation) {return false;}
      
      // Check exclusions
      if (excludeCountries.includes(proxy.geolocation.country)) {
        return false;
      }
      
      // Check country match
      if (targetCountry && proxy.geolocation.country !== targetCountry) {
        return false;
      }
      
      // Check region match if specified
      if (preferredRegions.length > 0) {
        return preferredRegions.includes(proxy.geolocation.region || '');
      }
      
      return true;
    });

    // If no candidates, try fallback without region filter
    if (candidates.length === 0 && preferredRegions.length > 0) {
      candidates = proxies.filter(proxy => {
        if (!proxy.geolocation) {return false;}
        if (excludeCountries.includes(proxy.geolocation.country)) {return false;}
        if (targetCountry && proxy.geolocation.country !== targetCountry) {return false;}
        return true;
      });
    }

    // If still no candidates, fallback to any non-excluded proxy
    if (candidates.length === 0) {
      candidates = proxies.filter(proxy => {
        if (!proxy.geolocation) {return true;} // Include proxies without geo data in fallback
        return !excludeCountries.includes(proxy.geolocation.country);
      });
    }

    // Final fallback to all proxies
    if (candidates.length === 0) {
      candidates = proxies;
    }

    // Round-robin within geographic region
    const key = targetCountry || 'default';
    const lastIndex = this.geoLastUsedByCountry.get(key) || 0;
    const nextIndex = lastIndex % candidates.length;
    this.geoLastUsedByCountry.set(key, lastIndex + 1);
    
    const proxy = candidates[nextIndex];
    this.incrementUsage(proxy.id);
    return proxy;
  }

  reset(): void {
    this.geoLastUsedByCountry.clear();
    this.usageCount.clear();
  }
}

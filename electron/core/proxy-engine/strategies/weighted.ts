/**
 * Weighted Rotation Strategy
 * Selects proxies based on configured weights
 */

import type { ProxyConfig, RotationContext } from '../types';
import { BaseStrategy } from './base-strategy';

export class WeightedStrategy extends BaseStrategy {
  selectProxy(proxies: ProxyConfig[], _context?: RotationContext): ProxyConfig | null {
    if (proxies.length === 0) {return null;}
    
    const weights = this.config.weights || {};
    const totalWeight = proxies.reduce((sum, p) => sum + (weights[p.id] || 1), 0);
    let random = Math.random() * totalWeight;

    for (const proxy of proxies) {
      random -= weights[proxy.id] || 1;
      if (random <= 0) {
        this.incrementUsage(proxy.id);
        return proxy;
      }
    }

    // Fallback
    const proxy = proxies[0];
    this.incrementUsage(proxy.id);
    return proxy;
  }
}

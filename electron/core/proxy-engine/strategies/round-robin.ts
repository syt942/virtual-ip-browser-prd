/**
 * Round-Robin Rotation Strategy
 * Selects proxies in sequential order
 */

import type { ProxyConfig, RotationContext } from '../types';
import { BaseStrategy } from './base-strategy';

export class RoundRobinStrategy extends BaseStrategy {
  private lastUsedIndex = 0;

  selectProxy(proxies: ProxyConfig[], _context?: RotationContext): ProxyConfig | null {
    if (proxies.length === 0) {return null;}
    
    const proxy = proxies[this.lastUsedIndex % proxies.length];
    this.lastUsedIndex++;
    this.incrementUsage(proxy.id);
    return proxy;
  }

  reset(): void {
    this.lastUsedIndex = 0;
    this.usageCount.clear();
  }
}

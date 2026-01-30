/**
 * Random Rotation Strategy
 * Selects proxies randomly
 */

import type { ProxyConfig, RotationContext } from '../types';
import { BaseStrategy } from './base-strategy';

export class RandomStrategy extends BaseStrategy {
  selectProxy(proxies: ProxyConfig[], _context?: RotationContext): ProxyConfig | null {
    if (proxies.length === 0) return null;
    
    const index = Math.floor(Math.random() * proxies.length);
    const proxy = proxies[index];
    this.incrementUsage(proxy.id);
    return proxy;
  }
}

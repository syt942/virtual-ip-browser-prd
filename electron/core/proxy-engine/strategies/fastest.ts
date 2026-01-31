/**
 * Fastest Rotation Strategy
 * Selects the proxy with lowest latency
 */

import type { ProxyConfig, RotationContext } from '../types';
import { BaseStrategy } from './base-strategy';

export class FastestStrategy extends BaseStrategy {
  selectProxy(proxies: ProxyConfig[], _context?: RotationContext): ProxyConfig | null {
    if (proxies.length === 0) {return null;}
    
    const sorted = [...proxies].sort((a, b) => {
      const latencyA = a.latency || Infinity;
      const latencyB = b.latency || Infinity;
      return latencyA - latencyB;
    });
    
    const proxy = sorted[0];
    this.incrementUsage(proxy.id);
    return proxy;
  }
}

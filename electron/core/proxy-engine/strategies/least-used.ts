/**
 * Least-Used Rotation Strategy
 * Selects the proxy with lowest usage count
 */

import type { ProxyConfig, RotationContext } from '../types';
import { BaseStrategy } from './base-strategy';

export class LeastUsedStrategy extends BaseStrategy {
  selectProxy(proxies: ProxyConfig[], _context?: RotationContext): ProxyConfig | null {
    if (proxies.length === 0) return null;
    
    const sorted = [...proxies].sort((a, b) => {
      const usageA = this.usageCount.get(a.id) || 0;
      const usageB = this.usageCount.get(b.id) || 0;
      return usageA - usageB;
    });
    
    const proxy = sorted[0];
    this.incrementUsage(proxy.id);
    return proxy;
  }
}

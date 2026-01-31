/**
 * Failure-Aware Rotation Strategy
 * Selects proxies based on success rate and failure count
 */

import type { ProxyConfig, RotationContext } from '../types';
import { BaseStrategy } from './base-strategy';

export class FailureAwareStrategy extends BaseStrategy {
  selectProxy(proxies: ProxyConfig[], _context?: RotationContext): ProxyConfig | null {
    if (proxies.length === 0) {return null;}
    
    const sorted = [...proxies].sort((a, b) => {
      // Prefer proxies with lower failure count and higher success rate
      const scoreA = a.successRate - (a.failureCount * 10);
      const scoreB = b.successRate - (b.failureCount * 10);
      return scoreB - scoreA;
    });
    
    const proxy = sorted[0];
    this.incrementUsage(proxy.id);
    return proxy;
  }
}

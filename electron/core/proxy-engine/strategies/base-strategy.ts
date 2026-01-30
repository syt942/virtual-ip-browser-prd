/**
 * Base Strategy Types and Interface
 * Common types and utilities for all rotation strategies
 */

import type { ProxyConfig, RotationConfig, RotationContext } from '../types';

export interface IRotationStrategy {
  selectProxy(proxies: ProxyConfig[], context?: RotationContext): ProxyConfig | null;
  incrementUsage(proxyId: string): void;
  getUsageStats(): Map<string, number>;
}

export abstract class BaseStrategy implements IRotationStrategy {
  protected config: RotationConfig;
  protected usageCount: Map<string, number> = new Map();

  constructor(config: RotationConfig) {
    this.config = config;
  }

  abstract selectProxy(proxies: ProxyConfig[], context?: RotationContext): ProxyConfig | null;

  setConfig(config: RotationConfig): void {
    this.config = config;
    this.usageCount.clear();
  }

  incrementUsage(proxyId: string): void {
    const current = this.usageCount.get(proxyId) || 0;
    this.usageCount.set(proxyId, current + 1);
  }

  getUsageStats(): Map<string, number> {
    return new Map(this.usageCount);
  }

  protected roundRobinSelect(proxies: ProxyConfig[], lastIndex: number): { proxy: ProxyConfig; nextIndex: number } {
    const proxy = proxies[lastIndex % proxies.length];
    return { proxy, nextIndex: lastIndex + 1 };
  }
}

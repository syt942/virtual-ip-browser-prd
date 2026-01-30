/**
 * Sticky-Session Rotation Strategy
 * Maps domains to specific proxies for session persistence
 */

import type { ProxyConfig, RotationContext, DomainProxyMapping } from '../types';
import { BaseStrategy } from './base-strategy';

export class StickySessionStrategy extends BaseStrategy {
  private stickyMappings: Map<string, DomainProxyMapping> = new Map();
  private stickyRoundRobinIndex = 0;

  selectProxy(proxies: ProxyConfig[], context?: RotationContext): ProxyConfig | null {
    if (proxies.length === 0) return null;

    if (!context?.domain) {
      // No domain context, fallback to round-robin
      return this.fallbackRoundRobin(proxies);
    }

    const domain = this.normalizeDomain(context.domain);
    const ttl = this.config.stickySessionTTL || 3600000; // Default 1 hour

    // Check for existing mapping
    let mapping = this.findStickyMapping(domain);

    if (mapping) {
      // Check if mapping is expired
      const now = Date.now();
      if (mapping.ttl && (now - mapping.lastUsed.getTime() > mapping.ttl)) {
        // Expired, remove mapping
        this.stickyMappings.delete(mapping.domain);
        mapping = null;
      } else {
        // Check if proxy is still available
        const proxy = proxies.find(p => p.id === mapping!.proxyId);
        if (proxy) {
          // Update usage
          mapping.lastUsed = new Date();
          mapping.requestCount++;
          this.incrementUsage(proxy.id);
          return proxy;
        } else if (this.config.stickyFallbackOnFailure) {
          // Proxy not available, remove mapping and create new one
          this.stickyMappings.delete(mapping.domain);
          mapping = null;
        } else {
          return null;
        }
      }
    }

    // Create new mapping
    const proxy = this.selectProxyForStickyMapping(domain, proxies);
    if (!proxy) return null;

    const newMapping: DomainProxyMapping = {
      domain,
      proxyId: proxy.id,
      createdAt: new Date(),
      lastUsed: new Date(),
      requestCount: 1,
      ttl,
      isWildcard: false
    };

    this.stickyMappings.set(domain, newMapping);
    this.incrementUsage(proxy.id);
    return proxy;
  }

  private fallbackRoundRobin(proxies: ProxyConfig[]): ProxyConfig {
    const proxy = proxies[this.stickyRoundRobinIndex % proxies.length];
    this.stickyRoundRobinIndex++;
    this.incrementUsage(proxy.id);
    return proxy;
  }

  private findStickyMapping(domain: string): DomainProxyMapping | null {
    // Direct match
    const direct = this.stickyMappings.get(domain);
    if (direct) return direct;

    // Wildcard matching
    const entries = Array.from(this.stickyMappings.entries());
    for (const [pattern, mapping] of entries) {
      if (mapping.isWildcard && this.matchesWildcard(domain, pattern)) {
        return mapping;
      }
    }

    return null;
  }

  private selectProxyForStickyMapping(domain: string, proxies: ProxyConfig[]): ProxyConfig | null {
    const algorithm = this.config.stickyHashAlgorithm || 'consistent';

    switch (algorithm) {
      case 'consistent':
        return this.consistentHashSelect(domain, proxies);
      case 'random':
        return proxies[Math.floor(Math.random() * proxies.length)];
      case 'round-robin':
        const proxy = proxies[this.stickyRoundRobinIndex % proxies.length];
        this.stickyRoundRobinIndex++;
        return proxy;
      default:
        return proxies[0];
    }
  }

  private consistentHashSelect(domain: string, proxies: ProxyConfig[]): ProxyConfig {
    const hash = this.hashString(domain);
    const index = hash % proxies.length;
    return proxies[index];
  }

  private hashString(str: string): number {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
    }
    return Math.abs(hash);
  }

  private normalizeDomain(url: string): string {
    try {
      // Handle full URLs
      if (url.includes('://')) {
        const parsed = new URL(url);
        return parsed.hostname.toLowerCase();
      }
      // Handle domain with path
      if (url.includes('/')) {
        return url.split('/')[0].toLowerCase();
      }
      return url.toLowerCase();
    } catch {
      return url.toLowerCase();
    }
  }

  private matchesWildcard(domain: string, pattern: string): boolean {
    if (pattern.startsWith('*.')) {
      const baseDomain = pattern.slice(2);
      return domain === baseDomain || domain.endsWith('.' + baseDomain);
    }
    return domain === pattern;
  }

  // Public methods for managing sticky mappings
  setStickyMapping(domain: string, proxyId: string, options?: Partial<DomainProxyMapping>): void {
    const normalizedDomain = domain.includes('*') ? domain : this.normalizeDomain(domain);
    const mapping: DomainProxyMapping = {
      domain: normalizedDomain,
      proxyId,
      createdAt: new Date(),
      lastUsed: new Date(),
      requestCount: 0,
      ttl: options?.ttl || this.config.stickySessionTTL || 3600000,
      isWildcard: domain.includes('*')
    };
    this.stickyMappings.set(normalizedDomain, mapping);
  }

  getStickyMappings(): DomainProxyMapping[] {
    return Array.from(this.stickyMappings.values());
  }

  clearStickyMapping(domain: string): void {
    const normalized = this.normalizeDomain(domain);
    this.stickyMappings.delete(normalized);
  }

  reset(): void {
    this.stickyMappings.clear();
    this.stickyRoundRobinIndex = 0;
    this.usageCount.clear();
  }
}

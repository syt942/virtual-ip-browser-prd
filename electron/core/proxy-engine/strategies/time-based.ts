/**
 * Time-Based Rotation Strategy
 * Rotates proxies at configured intervals with jitter support
 */

import type { ProxyConfig, RotationContext, RotationEvent } from '../types';
import { BaseStrategy } from './base-strategy';

export class TimeBasedStrategy extends BaseStrategy {
  private currentProxyId: string | null = null;
  private lastRotation: Date | null = null;
  private rotationHistory: RotationEvent[] = [];
  private forceRotate = false;
  private lastUsedIndex = 0;

  selectProxy(proxies: ProxyConfig[], _context?: RotationContext): ProxyConfig | null {
    if (proxies.length === 0) return null;

    const now = Date.now();
    const interval = this.config.interval || 60000; // Default 1 minute
    
    // Check schedule windows
    if (this.config.scheduleWindows?.length && !this.isWithinScheduleWindow()) {
      // Outside schedule window, return current proxy without rotation
      if (this.currentProxyId) {
        const current = proxies.find(p => p.id === this.currentProxyId);
        if (current) {
          this.incrementUsage(current.id);
          return current;
        }
      }
      // No current proxy, select one but don't start rotation
      const proxy = this.roundRobinSelectInternal(proxies);
      this.currentProxyId = proxy.id;
      this.lastRotation = new Date(now);
      this.incrementUsage(proxy.id);
      return proxy;
    }

    // Check if we need to rotate
    const shouldRotate = this.forceRotate || 
      !this.lastRotation ||
      (now - this.lastRotation.getTime() >= interval);

    if (shouldRotate) {
      this.forceRotate = false;
      const previousId = this.currentProxyId;
      
      // Select next proxy (different from current if possible)
      let candidates = proxies;
      if (previousId && proxies.length > 1) {
        candidates = proxies.filter(p => p.id !== previousId);
      }
      
      const proxy = this.roundRobinSelectInternal(candidates.length > 0 ? candidates : proxies);
      this.currentProxyId = proxy.id;
      this.lastRotation = new Date(now);

      // Record rotation event
      const event: RotationEvent = {
        timestamp: new Date(now),
        previousProxyId: previousId || 'none',
        newProxyId: proxy.id,
        reason: previousId ? 'scheduled' : 'startup'
      };
      this.rotationHistory.push(event);
      
      // Limit history
      if (this.rotationHistory.length > 1000) {
        this.rotationHistory = this.rotationHistory.slice(-500);
      }

      this.incrementUsage(proxy.id);
      return proxy;
    }

    // Return current proxy
    if (this.currentProxyId) {
      const current = proxies.find(p => p.id === this.currentProxyId);
      if (current) {
        this.incrementUsage(current.id);
        return current;
      }
    }

    // Fallback: select new proxy
    const proxy = this.roundRobinSelectInternal(proxies);
    this.currentProxyId = proxy.id;
    this.lastRotation = new Date(now);
    this.incrementUsage(proxy.id);
    return proxy;
  }

  private roundRobinSelectInternal(proxies: ProxyConfig[]): ProxyConfig {
    const proxy = proxies[this.lastUsedIndex % proxies.length];
    this.lastUsedIndex++;
    return proxy;
  }

  private isWithinScheduleWindow(): boolean {
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();

    for (const window of this.config.scheduleWindows || []) {
      if (!window.daysOfWeek.includes(currentDay)) continue;
      
      if (window.startHour <= window.endHour) {
        // Normal window (e.g., 9-17)
        if (currentHour >= window.startHour && currentHour < window.endHour) {
          return true;
        }
      } else {
        // Overnight window (e.g., 22-6)
        if (currentHour >= window.startHour || currentHour < window.endHour) {
          return true;
        }
      }
    }
    
    return false;
  }

  // Public methods
  getNextRotationInterval(): number {
    const baseInterval = this.config.interval || 60000;
    const jitterPercent = this.config.jitterPercent || 0;
    const minInterval = this.config.minInterval || 0;
    const maxInterval = this.config.maxInterval || Infinity;

    const jitterRange = (baseInterval * jitterPercent) / 100;
    const jitter = (Math.random() - 0.5) * 2 * jitterRange;
    
    let interval = baseInterval + jitter;
    interval = Math.max(minInterval, interval);
    interval = Math.min(maxInterval, interval);
    
    return Math.round(interval);
  }

  getLastRotationTime(): Date | null {
    return this.lastRotation;
  }

  getTimeUntilNextRotation(): number | null {
    if (!this.lastRotation) return null;
    const interval = this.config.interval || 60000;
    const elapsed = Date.now() - this.lastRotation.getTime();
    return Math.max(0, interval - elapsed);
  }

  forceRotation(): void {
    this.forceRotate = true;
  }

  reportProxyFailure(proxyId: string): void {
    if (this.config.rotateOnFailure && this.currentProxyId === proxyId) {
      this.forceRotate = true;
    }
  }

  getRotationHistory(): RotationEvent[] {
    return [...this.rotationHistory];
  }

  reset(): void {
    this.currentProxyId = null;
    this.lastRotation = null;
    this.rotationHistory = [];
    this.forceRotate = false;
    this.lastUsedIndex = 0;
    this.usageCount.clear();
  }
}

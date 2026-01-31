/**
 * Proxy Rotation Strategy Manager
 * Orchestrates proxy selection using various rotation strategies
 * 
 * Strategies are implemented in separate modules under ./strategies/
 */

import type { 
  ProxyConfig, 
  RotationConfig, 
  RotationContext,
  DomainProxyMapping,
  RotationEvent,
  ProxyRule,
  RuleEvaluationResult
} from './types';
// RotationStrategy type is used internally by strategy classes

import {
  RoundRobinStrategy,
  RandomStrategy,
  LeastUsedStrategy,
  FastestStrategy,
  FailureAwareStrategy,
  WeightedStrategy,
  GeographicStrategy,
  StickySessionStrategy,
  TimeBasedStrategy,
  CustomRulesStrategy
} from './strategies';

export class ProxyRotationStrategy {
  private config: RotationConfig = { strategy: 'round-robin' };
  
  // Strategy instances
  private roundRobin: RoundRobinStrategy;
  private random: RandomStrategy;
  private leastUsed: LeastUsedStrategy;
  private fastest: FastestStrategy;
  private failureAware: FailureAwareStrategy;
  private weighted: WeightedStrategy;
  private geographic: GeographicStrategy;
  private stickySession: StickySessionStrategy;
  private timeBased: TimeBasedStrategy;
  private customRules: CustomRulesStrategy;

  constructor() {
    // Initialize all strategies
    this.roundRobin = new RoundRobinStrategy(this.config);
    this.random = new RandomStrategy(this.config);
    this.leastUsed = new LeastUsedStrategy(this.config);
    this.fastest = new FastestStrategy(this.config);
    this.failureAware = new FailureAwareStrategy(this.config);
    this.weighted = new WeightedStrategy(this.config);
    this.geographic = new GeographicStrategy(this.config);
    this.stickySession = new StickySessionStrategy(this.config);
    this.timeBased = new TimeBasedStrategy(this.config);
    this.customRules = new CustomRulesStrategy(this.config);
  }

  setConfig(config: RotationConfig): void {
    this.config = config;
    
    // Update all strategy configs
    this.roundRobin.setConfig(config);
    this.random.setConfig(config);
    this.leastUsed.setConfig(config);
    this.fastest.setConfig(config);
    this.failureAware.setConfig(config);
    this.weighted.setConfig(config);
    this.geographic.setConfig(config);
    this.stickySession.setConfig(config);
    this.timeBased.setConfig(config);
    
    // Custom rules strategy needs rules from config
    if (config.rules) {
      this.customRules.setRules(config.rules);
    }
    this.customRules.setConfig(config);
  }

  selectProxy(proxies: ProxyConfig[], context?: RotationContext): ProxyConfig | null {
    if (proxies.length === 0) {return null;}

    switch (this.config.strategy) {
      case 'round-robin':
        return this.roundRobin.selectProxy(proxies, context);
      case 'random':
        return this.random.selectProxy(proxies, context);
      case 'least-used':
        return this.leastUsed.selectProxy(proxies, context);
      case 'fastest':
        return this.fastest.selectProxy(proxies, context);
      case 'failure-aware':
        return this.failureAware.selectProxy(proxies, context);
      case 'weighted':
        return this.weighted.selectProxy(proxies, context);
      case 'geographic':
        return this.geographic.selectProxy(proxies, context);
      case 'sticky-session':
        return this.stickySession.selectProxy(proxies, context);
      case 'time-based':
        return this.timeBased.selectProxy(proxies, context);
      case 'custom':
        return this.customRules.selectProxy(proxies, context);
      default:
        return this.roundRobin.selectProxy(proxies, context);
    }
  }

  // ============================================================
  // STICKY-SESSION DELEGATION
  // ============================================================

  setStickyMapping(domain: string, proxyId: string, options?: Partial<DomainProxyMapping>): void {
    this.stickySession.setStickyMapping(domain, proxyId, options);
  }

  getStickyMappings(): DomainProxyMapping[] {
    return this.stickySession.getStickyMappings();
  }

  clearStickyMapping(domain: string): void {
    this.stickySession.clearStickyMapping(domain);
  }

  // ============================================================
  // TIME-BASED DELEGATION
  // ============================================================

  getNextRotationInterval(): number {
    return this.timeBased.getNextRotationInterval();
  }

  getLastRotationTime(): Date | null {
    return this.timeBased.getLastRotationTime();
  }

  getTimeUntilNextRotation(): number | null {
    return this.timeBased.getTimeUntilNextRotation();
  }

  forceRotation(): void {
    this.timeBased.forceRotation();
  }

  reportProxyFailure(proxyId: string): void {
    this.timeBased.reportProxyFailure(proxyId);
  }

  getRotationHistory(): RotationEvent[] {
    return this.timeBased.getRotationHistory();
  }

  // ============================================================
  // CUSTOM RULES DELEGATION
  // ============================================================

  addRule(rule: ProxyRule): void {
    this.customRules.addRule(rule);
  }

  removeRule(ruleId: string): void {
    this.customRules.removeRule(ruleId);
  }

  getRules(): ProxyRule[] {
    return this.customRules.getRules();
  }

  evaluateRules(context: Partial<RotationContext>, proxies: ProxyConfig[]): RuleEvaluationResult {
    return this.customRules.evaluateRules(context, proxies);
  }

  // ============================================================
  // USAGE STATISTICS
  // ============================================================

  getUsageStats(): Map<string, number> {
    // Aggregate usage stats from all strategies
    const stats = new Map<string, number>();
    
    const strategies = [
      this.roundRobin, this.random, this.leastUsed, this.fastest,
      this.failureAware, this.weighted, this.geographic,
      this.stickySession, this.timeBased, this.customRules
    ];

    for (const strategy of strategies) {
      const strategyStats = strategy.getUsageStats();
      for (const [proxyId, count] of strategyStats) {
        stats.set(proxyId, (stats.get(proxyId) || 0) + count);
      }
    }

    return stats;
  }
}

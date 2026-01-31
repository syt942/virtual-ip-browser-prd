/**
 * Custom Rules Rotation Strategy
 * Selects proxies based on configurable rules and conditions
 */

import type { 
  ProxyConfig, 
  RotationContext, 
  RotationConfig,
  ProxyRule,
  RuleCondition,
  RuleActionConfig,
  RuleEvaluationResult
} from '../types';
import { BaseStrategy } from './base-strategy';

export class CustomRulesStrategy extends BaseStrategy {
  private rules: ProxyRule[] = [];
  private lastUsedIndex = 0;

  constructor(config: RotationConfig) {
    super(config);
    if (config.rules) {
      this.rules = [...config.rules].sort((a, b) => b.priority - a.priority);
    }
  }

  selectProxy(proxies: ProxyConfig[], context?: RotationContext): ProxyConfig | null {
    if (proxies.length === 0) {return null;}

    const result = this.evaluateRules(context || {}, proxies);
    
    if (result.matched && result.selectedProxy) {
      this.incrementUsage(result.selectedProxy.id);
      return result.selectedProxy;
    }

    // Fallback to round-robin
    return this.fallbackRoundRobin(proxies);
  }

  private fallbackRoundRobin(proxies: ProxyConfig[]): ProxyConfig {
    const proxy = proxies[this.lastUsedIndex % proxies.length];
    this.lastUsedIndex++;
    this.incrementUsage(proxy.id);
    return proxy;
  }

  evaluateRules(context: Partial<RotationContext>, proxies: ProxyConfig[]): RuleEvaluationResult {
    const enabledRules = this.rules.filter(r => r.enabled);
    
    for (const rule of enabledRules) {
      const matched = this.evaluateRuleConditions(rule, context);
      
      if (matched) {
        const selectedProxy = this.executeRuleActions(rule.actions, proxies, context);
        
        return {
          matched: true,
          rule,
          actions: rule.actions,
          selectedProxy: selectedProxy ?? undefined
        };
      }
    }

    return {
      matched: false,
      actions: []
    };
  }

  private evaluateRuleConditions(rule: ProxyRule, context: Partial<RotationContext>): boolean {
    const logic = rule.conditionLogic || 'AND';
    
    if (logic === 'AND') {
      return rule.conditions.every(c => this.evaluateCondition(c, context));
    } else {
      return rule.conditions.some(c => this.evaluateCondition(c, context));
    }
  }

  private evaluateCondition(condition: RuleCondition, context: Partial<RotationContext>): boolean {
    const fieldValue = this.getFieldValue(condition.field, context);
    const compareValue = condition.value;
    const caseSensitive = condition.caseSensitive ?? false;

    // Normalize strings for comparison
    const normalizeStr = (s: string) => caseSensitive ? s : s.toLowerCase();
    const fieldStr = typeof fieldValue === 'string' ? normalizeStr(fieldValue) : String(fieldValue);
    const compareStr = typeof compareValue === 'string' ? normalizeStr(compareValue) : '';

    switch (condition.operator) {
      case 'equals':
        return fieldStr === compareStr;
      
      case 'not_equals':
        return fieldStr !== compareStr;
      
      case 'contains':
        return fieldStr.includes(compareStr);
      
      case 'not_contains':
        return !fieldStr.includes(compareStr);
      
      case 'starts_with':
        return fieldStr.startsWith(compareStr);
      
      case 'ends_with':
        return fieldStr.endsWith(compareStr);
      
      case 'matches_regex':
        try {
          const regex = new RegExp(String(compareValue), caseSensitive ? '' : 'i');
          return regex.test(String(fieldValue));
        } catch (error) {
          // Invalid regex pattern in rule configuration
          console.warn('[CustomRules] Invalid regex pattern in rule:', String(compareValue),
            error instanceof Error ? error.message : 'Invalid regex');
          return false;
        }
      
      case 'greater_than':
        return Number(fieldValue) > Number(compareValue);
      
      case 'less_than':
        return Number(fieldValue) < Number(compareValue);
      
      case 'in_list':
        if (Array.isArray(compareValue)) {
          return compareValue.some(v => normalizeStr(String(v)) === fieldStr);
        }
        return false;
      
      case 'not_in_list':
        if (Array.isArray(compareValue)) {
          return !compareValue.some(v => normalizeStr(String(v)) === fieldStr);
        }
        return true;
      
      default:
        return false;
    }
  }

  private getFieldValue(field: string, context: Partial<RotationContext>): string | number {
    switch (field) {
      case 'domain':
        return context.domain || '';
      case 'url':
        return context.url || '';
      case 'path':
        if (context.url) {
          try {
            const url = new URL(context.url);
            return url.pathname;
          } catch (error) {
            // Invalid URL in context - return empty path
            console.debug('[CustomRules] Failed to parse URL for path extraction:', 
              context.url.substring(0, 50),
              error instanceof Error ? error.message : 'Invalid URL');
            return '';
          }
        }
        return '';
      case 'time_hour':
        return new Date().getHours();
      case 'time_day':
        return new Date().getDay();
      default:
        return '';
    }
  }

  private executeRuleActions(
    actions: RuleActionConfig[], 
    proxies: ProxyConfig[],
    _context: Partial<RotationContext>
  ): ProxyConfig | null {
    let candidates = [...proxies];
    let selectedProxy: ProxyConfig | null = null;

    for (const action of actions) {
      switch (action.action) {
        case 'use_proxy':
          const targetProxy = proxies.find(p => p.id === action.params.proxyId);
          if (targetProxy) {
            selectedProxy = targetProxy;
          }
          break;

        case 'use_country':
          const countryProxies = candidates.filter(
            p => p.geolocation?.country === action.params.country
          );
          if (countryProxies.length > 0) {
            candidates = countryProxies;
            selectedProxy = countryProxies[0];
          }
          break;

        case 'exclude_proxy':
          candidates = candidates.filter(p => p.id !== action.params.proxyId);
          break;

        case 'exclude_country':
          candidates = candidates.filter(
            p => p.geolocation?.country !== action.params.country
          );
          break;

        case 'rotate_immediately':
          // This would trigger rotation in the main strategy manager
          break;
      }
    }

    // If no specific proxy selected, choose from remaining candidates
    if (!selectedProxy && candidates.length > 0) {
      selectedProxy = candidates[0];
    }

    return selectedProxy;
  }

  // Public methods for rule management
  addRule(rule: ProxyRule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  removeRule(ruleId: string): void {
    this.rules = this.rules.filter(r => r.id !== ruleId);
  }

  getRules(): ProxyRule[] {
    return [...this.rules];
  }

  setRules(rules: ProxyRule[]): void {
    this.rules = [...rules].sort((a, b) => b.priority - a.priority);
  }

  reset(): void {
    this.lastUsedIndex = 0;
    this.usageCount.clear();
  }
}

/**
 * Domain Targeting System
 * Handles domain filtering, targeting from search results, and bounce rate control
 */

import type { SearchResult } from './types';

export interface DomainFilter {
  allowlist: string[];
  blocklist: string[];
  regexPatterns: string[];
}

export interface DomainTargetingConfig {
  bounceRateTarget: number;
  minReadingTime: number;
  maxReadingTime: number;
  journeyPagesMin: number;
  journeyPagesMax: number;
}

interface VisitRecord {
  bounced: boolean;
  timestamp: number;
}

const DEFAULT_CONFIG: DomainTargetingConfig = {
  bounceRateTarget: 40,
  minReadingTime: 30,
  maxReadingTime: 120,
  journeyPagesMin: 2,
  journeyPagesMax: 3,
};

export class DomainTargeting {
  private config: DomainTargetingConfig;
  private filters: DomainFilter;
  private compiledRegex: RegExp[];
  private visitHistory: VisitRecord[];
  private windowSize: number;

  constructor(config: Partial<DomainTargetingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.filters = {
      allowlist: [],
      blocklist: [],
      regexPatterns: [],
    };
    this.compiledRegex = [];
    this.visitHistory = [];
    this.windowSize = 100;
  }

  /**
   * Get current configuration
   */
  getConfig(): DomainTargetingConfig {
    return { ...this.config };
  }

  /**
   * Set domain filters
   */
  setFilters(filters: Partial<DomainFilter>): void {
    if (filters.allowlist !== undefined) {
      this.filters.allowlist = [...filters.allowlist];
    }
    if (filters.blocklist !== undefined) {
      this.filters.blocklist = [...filters.blocklist];
    }
    if (filters.regexPatterns !== undefined) {
      this.filters.regexPatterns = [...filters.regexPatterns];
      this.compileRegexPatterns();
    }
  }

  /**
   * Get current filters
   */
  getFilters(): DomainFilter {
    return {
      allowlist: [...this.filters.allowlist],
      blocklist: [...this.filters.blocklist],
      regexPatterns: [...this.filters.regexPatterns],
    };
  }

  /**
   * Check for ReDoS-vulnerable patterns
   */
  private isReDoSPattern(pattern: string): boolean {
    // Check pattern length
    if (pattern.length > 200) {
      return true;
    }

    // Check for known ReDoS patterns
    const redosPatterns = [
      // Nested quantifiers: (a+)+, (a*)+, (a+)*, etc.
      /\([^)]*[+*]\)[+*]/,
      // Quantified groups with braces: (a){2,}+
      /\([^)]*\)\{\d+,\d*\}[+*]/,
      // Repeated quantified groups: ([a-z]+)+
      /\(\[[^\]]*\][+*]\)[+*]/,
      // Quantified alternation: (a|b)+
      /\([^)]*\|[^)]*\)[+*]/,
      // Multiple wildcards that can overlap: (.*)+, (.*){2,}
      /\(\.\*\)[+*{]/,
      // Nested groups with quantifiers
      /\([^)]*\([^)]*[+*]\)[^)]*\)[+*]/,
    ];

    return redosPatterns.some(redos => redos.test(pattern));
  }

  /**
   * Compile regex patterns for efficient matching
   * Includes ReDoS protection
   */
  private compileRegexPatterns(): void {
    this.compiledRegex = [];
    for (const pattern of this.filters.regexPatterns) {
      try {
        // Check for ReDoS vulnerability
        if (this.isReDoSPattern(pattern)) {
          console.warn(`[DomainTargeting] Rejected potentially dangerous ReDoS pattern: ${pattern}`);
          continue;
        }
        this.compiledRegex.push(new RegExp(pattern));
      } catch (error) {
        console.error(`[DomainTargeting] Invalid regex pattern: ${pattern}`, error);
      }
    }
  }

  /**
   * Check if a domain is allowed based on filters
   */
  isDomainAllowed(domain: string): boolean {
    // Blocklist takes priority
    if (this.isInBlocklist(domain)) {
      return false;
    }

    // If allowlist is empty and no regex patterns, allow all
    if (this.filters.allowlist.length === 0 && this.compiledRegex.length === 0) {
      return true;
    }

    // Check allowlist
    if (this.isInAllowlist(domain)) {
      return true;
    }

    // Check regex patterns
    if (this.matchesRegexPattern(domain)) {
      return true;
    }

    // If allowlist or regex patterns are defined but domain doesn't match, reject
    return this.filters.allowlist.length === 0 && this.compiledRegex.length === 0;
  }

  /**
   * Check if domain is in blocklist
   */
  private isInBlocklist(domain: string): boolean {
    return this.filters.blocklist.some(blocked => 
      domain === blocked || 
      domain.endsWith('.' + blocked) ||
      blocked.endsWith('.' + domain)
    );
  }

  /**
   * Check if domain is in allowlist
   */
  private isInAllowlist(domain: string): boolean {
    return this.filters.allowlist.some(allowed =>
      domain === allowed ||
      domain.endsWith('.' + allowed) ||
      allowed.endsWith('.' + domain)
    );
  }

  /**
   * Check if domain matches any regex pattern
   * Includes input length protection against DoS
   */
  private matchesRegexPattern(domain: string): boolean {
    // Protect against excessively long inputs
    if (!domain || domain.length > 255) {
      return false;
    }
    return this.compiledRegex.some(regex => regex.test(domain));
  }

  /**
   * Select target domain from search results
   */
  selectTargetFromResults(results: SearchResult[]): SearchResult | null {
    for (const result of results) {
      if (this.isDomainAllowed(result.domain)) {
        // Additional check: if allowlist is non-empty, ensure domain matches
        if (this.filters.allowlist.length > 0) {
          const matchesAllowlist = this.filters.allowlist.some(allowed =>
            result.domain === allowed ||
            result.domain.endsWith('.' + allowed) ||
            allowed.endsWith('.' + result.domain)
          );
          if (matchesAllowlist) {
            return result;
          }
        } else if (this.compiledRegex.length > 0) {
          // Check regex patterns
          if (this.matchesRegexPattern(result.domain)) {
            return result;
          }
        } else {
          // No filters, return first allowed result
          return result;
        }
      }
    }
    return null;
  }

  /**
   * Determine if the current visit should bounce
   */
  shouldBounce(): boolean {
    const currentRate = this.getBounceRate();
    
    // If at or above target, don't bounce
    if (currentRate >= this.config.bounceRateTarget - 5) {
      return false;
    }

    // Calculate probability based on distance from target
    const probability = Math.max(0, (this.config.bounceRateTarget - currentRate) / 100);
    return Math.random() < probability;
  }

  /**
   * Record a visit
   */
  recordVisit(bounced: boolean): void {
    this.visitHistory.push({
      bounced,
      timestamp: Date.now(),
    });

    // Maintain window size
    if (this.visitHistory.length > this.windowSize) {
      this.visitHistory.shift();
    }
  }

  /**
   * Get current bounce rate
   */
  getBounceRate(): number {
    if (this.visitHistory.length === 0) {
      return 0;
    }

    const bounces = this.visitHistory.filter(v => v.bounced).length;
    return (bounces / this.visitHistory.length) * 100;
  }

  /**
   * Plan number of pages for journey
   */
  planJourney(): number {
    const { journeyPagesMin, journeyPagesMax } = this.config;
    return Math.floor(Math.random() * (journeyPagesMax - journeyPagesMin + 1)) + journeyPagesMin;
  }

  /**
   * Reset visit history
   */
  resetHistory(): void {
    this.visitHistory = [];
  }

  /**
   * Get visit statistics
   */
  getStatistics(): {
    totalVisits: number;
    bounces: number;
    bounceRate: number;
  } {
    const bounces = this.visitHistory.filter(v => v.bounced).length;
    return {
      totalVisits: this.visitHistory.length,
      bounces,
      bounceRate: this.getBounceRate(),
    };
  }
}

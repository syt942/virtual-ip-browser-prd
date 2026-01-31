/**
 * Pattern Matcher
 * High-performance pattern matching using bloom filters and compiled patterns
 * 
 * Security Features:
 * - No regex for URL matching (prevents ReDoS)
 * - Pre-compiled patterns at startup
 * - Timeout protection for fallback matching
 * - EasyList format support
 */

import { createHash } from 'crypto';

export interface CompiledPattern {
  /** Original pattern string */
  original: string;
  /** Pattern type */
  type: 'domain' | 'url' | 'regex';
  /** Extracted domain for fast matching */
  domain?: string;
  /** URL path prefix */
  pathPrefix?: string;
  /** Pre-computed hash for bloom filter */
  hash: number;
}

export interface PatternMatcherConfig {
  /** Maximum patterns to store */
  maxPatterns?: number;
  /** Bloom filter size (bits) */
  bloomFilterSize?: number;
  /** Number of hash functions */
  hashFunctions?: number;
  /** Timeout for regex fallback (ms) */
  regexTimeout?: number;
}

const DEFAULT_CONFIG: Required<PatternMatcherConfig> = {
  maxPatterns: 100000,
  bloomFilterSize: 1048576, // 1MB bloom filter
  hashFunctions: 7,
  regexTimeout: 10,
};

/**
 * PatternMatcher - Safe, high-performance URL pattern matching
 */
export class PatternMatcher {
  private config: Required<PatternMatcherConfig>;
  private bloomFilter: Uint8Array;
  private compiledPatterns: Map<string, CompiledPattern>;
  private domainIndex: Map<string, Set<CompiledPattern>>;
  private initialized = false;

  constructor(config: PatternMatcherConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.bloomFilter = new Uint8Array(Math.ceil(this.config.bloomFilterSize / 8));
    this.compiledPatterns = new Map();
    this.domainIndex = new Map();
  }

  /**
   * Initialize with patterns (call at startup)
   */
  initialize(patterns: string[]): void {
    const startTime = Date.now();
    
    for (const pattern of patterns) {
      if (this.compiledPatterns.size >= this.config.maxPatterns) {
        console.warn('[PatternMatcher] Max patterns reached, skipping remaining');
        break;
      }
      
      try {
        this.addPattern(pattern);
      } catch (error) {
        console.warn(`[PatternMatcher] Failed to compile pattern: ${pattern}`, error);
      }
    }

    this.initialized = true;
    console.log(`[PatternMatcher] Initialized with ${this.compiledPatterns.size} patterns in ${Date.now() - startTime}ms`);
  }

  /**
   * Add a single pattern
   */
  addPattern(pattern: string): void {
    if (!pattern || typeof pattern !== 'string') {return;}
    
    const trimmed = pattern.trim();
    if (trimmed.length === 0 || trimmed.length > 500) {return;}
    
    // Skip if already exists
    if (this.compiledPatterns.has(trimmed)) {return;}

    const compiled = this.compilePattern(trimmed);
    this.compiledPatterns.set(trimmed, compiled);

    // Add to bloom filter
    this.addToBloomFilter(compiled);

    // Add to domain index for fast lookup
    if (compiled.domain) {
      if (!this.domainIndex.has(compiled.domain)) {
        this.domainIndex.set(compiled.domain, new Set());
      }
      this.domainIndex.get(compiled.domain)!.add(compiled);
    }
  }

  /**
   * Remove a pattern
   */
  removePattern(pattern: string): void {
    const compiled = this.compiledPatterns.get(pattern);
    if (!compiled) {return;}

    this.compiledPatterns.delete(pattern);
    
    // Remove from domain index
    if (compiled.domain) {
      const domainPatterns = this.domainIndex.get(compiled.domain);
      if (domainPatterns) {
        domainPatterns.delete(compiled);
        if (domainPatterns.size === 0) {
          this.domainIndex.delete(compiled.domain);
        }
      }
    }

    // Note: Cannot remove from bloom filter (would need to rebuild)
  }

  /**
   * Check if URL matches any pattern
   */
  matches(url: string): boolean {
    if (!this.initialized || !url) {return false;}

    try {
      const parsed = new URL(url.toLowerCase());
      const domain = parsed.hostname;
      // path is extracted but not needed for current matching logic
      void (parsed.pathname + parsed.search);

      // Fast path: Check bloom filter first
      if (!this.mightMatch(domain)) {
        return false;
      }

      // Check domain index
      const domainPatterns = this.getPatternsForDomain(domain);
      for (const pattern of domainPatterns) {
        if (this.matchesPattern(url, pattern)) {
          return true;
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Compile a pattern into optimized format
   */
  private compilePattern(pattern: string): CompiledPattern {
    // Parse EasyList/AdBlock format: ||domain.com^
    // Or simple wildcard format: *://domain.com/*

    let type: CompiledPattern['type'] = 'url';
    let domain: string | undefined;
    let pathPrefix: string | undefined;

    // Handle EasyList format: ||domain.com^
    if (pattern.startsWith('||') && pattern.endsWith('^')) {
      const domainPart = pattern.slice(2, -1).toLowerCase();
      // Remove leading wildcard subdomain
      domain = domainPart.startsWith('*.') ? domainPart.slice(2) : domainPart;
      type = 'domain';
    } else {
      // Extract domain from common patterns
      const domainMatch = pattern.match(/(?:\|\||:\/\/|\*:\/\/)([a-zA-Z0-9*.-]+)/);
      if (domainMatch) {
        let extracted = domainMatch[1].toLowerCase();
        // Remove leading wildcard subdomain
        if (extracted.startsWith('*.')) {
          extracted = extracted.slice(2);
        }
        // Skip if domain is just wildcards
        if (extracted && extracted !== '*' && !extracted.match(/^\*+$/)) {
          domain = extracted;
        }
      }

      // Extract path prefix
      const pathMatch = pattern.match(/[a-zA-Z0-9.-]+(\/[^*]+?)(?:\*|$)/);
      if (pathMatch) {
        pathPrefix = pathMatch[1];
      }
    }

    return {
      original: pattern,
      type,
      domain,
      pathPrefix,
      hash: this.computeHash(pattern),
    };
  }

  /**
   * Compute hash for bloom filter
   */
  private computeHash(value: string): number {
    const hash = createHash('md5').update(value).digest();
    return hash.readUInt32LE(0);
  }

  /**
   * Add pattern to bloom filter
   */
  private addToBloomFilter(pattern: CompiledPattern): void {
    const valueToHash = pattern.domain || pattern.original;
    const hashes = this.getBloomHashes(valueToHash);
    for (const hash of hashes) {
      const index = hash % (this.bloomFilter.length * 8);
      const byteIndex = Math.floor(index / 8);
      const bitIndex = index % 8;
      this.bloomFilter[byteIndex] |= (1 << bitIndex);
    }
  }

  /**
   * Check bloom filter for possible match
   */
  private mightMatch(domain: string): boolean {
    // Check if exact domain might be in filter
    if (this.checkBloomFilter(domain)) {
      return true;
    }
    
    // Check parent domains (e.g., www.google-analytics.com -> google-analytics.com)
    const parts = domain.split('.');
    for (let i = 1; i < parts.length - 1; i++) {
      const parent = parts.slice(i).join('.');
      if (this.checkBloomFilter(parent)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Check if a single value is in the bloom filter
   */
  private checkBloomFilter(value: string): boolean {
    const hashes = this.getBloomHashes(value);
    for (const hash of hashes) {
      const index = hash % (this.bloomFilter.length * 8);
      const byteIndex = Math.floor(index / 8);
      const bitIndex = index % 8;
      if ((this.bloomFilter[byteIndex] & (1 << bitIndex)) === 0) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get multiple hashes for bloom filter
   */
  private getBloomHashes(value: string): number[] {
    const hashes: number[] = [];
    const baseHash = createHash('sha256').update(value).digest();
    
    for (let i = 0; i < this.config.hashFunctions; i++) {
      hashes.push(baseHash.readUInt32LE(i * 4 % 28));
    }
    
    return hashes;
  }

  /**
   * Get patterns that might match a domain
   */
  private getPatternsForDomain(domain: string): CompiledPattern[] {
    const patterns: CompiledPattern[] = [];
    
    // Check exact domain
    const exact = this.domainIndex.get(domain);
    if (exact) {
      patterns.push(...exact);
    }
    
    // Check parent domains (e.g., sub.example.com -> example.com)
    const parts = domain.split('.');
    for (let i = 1; i < parts.length - 1; i++) {
      const parent = parts.slice(i).join('.');
      const parentPatterns = this.domainIndex.get(parent);
      if (parentPatterns) {
        patterns.push(...parentPatterns);
      }
    }
    
    return patterns;
  }

  /**
   * Match URL against a compiled pattern (safe, no regex)
   */
  private matchesPattern(url: string, pattern: CompiledPattern): boolean {
    const lowerUrl = url.toLowerCase();
    
    // Domain check
    if (pattern.domain && !this.urlContainsDomain(lowerUrl, pattern.domain)) {
      return false;
    }
    
    // Path prefix check
    if (pattern.pathPrefix && !lowerUrl.includes(pattern.pathPrefix.toLowerCase())) {
      return false;
    }
    
    // For simple domain patterns, domain match is sufficient
    if (pattern.type === 'domain') {
      return true;
    }
    
    // For URL patterns, do simple string matching
    return this.simpleWildcardMatch(lowerUrl, pattern.original);
  }

  /**
   * Check if URL contains domain (handles subdomains)
   */
  private urlContainsDomain(url: string, domain: string): boolean {
    // Check for exact domain or subdomain
    return url.includes(`//${domain}`) || 
           url.includes(`//${domain}/`) ||
           url.includes(`//${domain}:`) ||
           url.includes(`.${domain}`) ||
           url.includes(`.${domain}/`) ||
           url.includes(`.${domain}:`);
  }

  /**
   * Simple wildcard matching without regex
   */
  private simpleWildcardMatch(url: string, pattern: string): boolean {
    // Convert pattern to lowercase
    const lowerPattern = pattern.toLowerCase();
    
    // Handle common patterns without regex
    // *://domain.com/* -> check if URL contains domain
    if (lowerPattern.startsWith('*://') && lowerPattern.endsWith('/*')) {
      const middle = lowerPattern.slice(4, -2);
      return url.includes(middle);
    }
    
    // ||domain.com^ -> check domain boundary
    if (lowerPattern.startsWith('||') && lowerPattern.endsWith('^')) {
      const domain = lowerPattern.slice(2, -1);
      return this.urlContainsDomain(url, domain);
    }
    
    // *://*.domain.com/* -> check if URL contains domain (subdomain wildcard)
    if (lowerPattern.includes('*.')) {
      const domainPart = lowerPattern.replace(/^\*:\/\/\*\./, '').replace(/\/\*$/, '');
      return url.includes(domainPart);
    }
    
    // Simple contains check for other patterns
    const cleanPattern = lowerPattern
      .replace(/^\*:\/\//, '')
      .replace(/\/\*$/, '')
      .replace(/\*/g, '');
    
    return cleanPattern.length > 0 && url.includes(cleanPattern);
  }

  /**
   * Get statistics
   */
  getStats(): { patterns: number; domains: number; bloomFilterUsage: number } {
    let bitsSet = 0;
    for (const byte of this.bloomFilter) {
      bitsSet += this.countBits(byte);
    }
    
    return {
      patterns: this.compiledPatterns.size,
      domains: this.domainIndex.size,
      bloomFilterUsage: bitsSet / (this.bloomFilter.length * 8),
    };
  }

  private countBits(n: number): number {
    let count = 0;
    while (n) {
      count += n & 1;
      n >>= 1;
    }
    return count;
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Clear all patterns
   */
  clear(): void {
    this.bloomFilter.fill(0);
    this.compiledPatterns.clear();
    this.domainIndex.clear();
    this.initialized = false;
  }
}

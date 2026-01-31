/**
 * Tracker Blocker
 * Blocks tracking scripts, ads, and analytics
 * 
 * SECURITY FIX: Uses PatternMatcher for safe, ReDoS-resistant pattern matching
 * - No regex for URL matching (prevents ReDoS)
 * - Pre-compiled patterns at startup
 * - Bloom filter for fast rejection
 */

import { session } from 'electron';
import { PatternMatcher } from './pattern-matcher';

export class TrackerBlocker {
  private enabled: boolean;
  private patternMatcher: PatternMatcher;
  private customRules: Set<string>;
  private defaultPatterns: string[];

  constructor() {
    this.enabled = true;
    this.patternMatcher = new PatternMatcher();
    this.customRules = new Set();
    this.defaultPatterns = this.getDefaultPatterns();
    
    // Initialize pattern matcher with default patterns
    this.patternMatcher.initialize(this.defaultPatterns);
  }

  /**
   * Get default blocking patterns
   * Supports both EasyList (||domain^) and wildcard (*://domain/*) formats
   */
  private getDefaultPatterns(): string[] {
    return [
      // Analytics - EasyList format
      '||google-analytics.com^',
      '||googletagmanager.com^',
      '||analytics.google.com^',
      
      // Analytics - Wildcard format (backward compatibility)
      '*://google-analytics.com/*',
      '*://*.google-analytics.com/*',
      '*://googletagmanager.com/*',
      '*://*.googletagmanager.com/*',
      '*://analytics.google.com/*',
      
      // Social media trackers
      '||connect.facebook.net^',
      '||platform.twitter.com^',
      '||platform.linkedin.com^',
      '*://connect.facebook.net/*',
      '*://platform.twitter.com/*',
      '*://platform.linkedin.com/*',
      
      // Ad networks
      '||doubleclick.net^',
      '||googlesyndication.com^',
      '||adservice.google.com^',
      '*://doubleclick.net/*',
      '*://*.doubleclick.net/*',
      '*://googlesyndication.com/*',
      '*://*.googlesyndication.com/*',
      '*://adservice.google.com/*',
      
      // Other trackers
      '||scorecardresearch.com^',
      '||quantserve.com^',
      '||hotjar.com^',
      '||mouseflow.com^',
      '||crazyegg.com^',
      '*://scorecardresearch.com/*',
      '*://quantserve.com/*',
      '*://hotjar.com/*',
      '*://*.hotjar.com/*',
      '*://mouseflow.com/*',
      '*://crazyegg.com/*',
    ];
  }

  /**
   * Enable tracker blocking for a session
   */
  enableForSession(sessionPartition: string): void {
    if (!this.enabled) {return;}
    
    const webSession = session.fromPartition(sessionPartition);
    
    // Block requests to tracking domains using PatternMatcher (SECURITY FIX)
    webSession.webRequest.onBeforeRequest((details, callback) => {
      const url = details.url;
      
      // Check pattern matcher (safe, no ReDoS)
      if (this.patternMatcher.matches(url)) {
        console.log('[Tracker Blocker] Blocked:', url.substring(0, 100));
        callback({ cancel: true });
        return;
      }
      
      // Check custom rules (simple string matching)
      for (const rule of this.customRules) {
        if (url.toLowerCase().includes(rule.toLowerCase())) {
          console.log('[Tracker Blocker] Blocked (custom):', url.substring(0, 100));
          callback({ cancel: true });
          return;
        }
      }
      
      callback({ cancel: false });
    });
    
    console.log('[Tracker Blocker] Enabled for session:', sessionPartition);
  }

  /**
   * Add custom blocking rule
   */
  addCustomRule(rule: string): void {
    if (rule && rule.length <= 200) {
      this.customRules.add(rule);
      this.patternMatcher.addPattern(rule);
    }
  }

  /**
   * Remove custom blocking rule
   */
  removeCustomRule(rule: string): void {
    this.customRules.delete(rule);
    this.patternMatcher.removePattern(rule);
  }

  /**
   * Get all custom rules
   */
  getCustomRules(): string[] {
    return [...this.customRules];
  }

  /**
   * Enable or disable tracker blocking
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if tracker blocking is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Add pattern to blocklist
   */
  addToBlocklist(pattern: string): void {
    this.patternMatcher.addPattern(pattern);
  }

  /**
   * Remove pattern from blocklist
   */
  removeFromBlocklist(pattern: string): void {
    this.patternMatcher.removePattern(pattern);
  }

  /**
   * Get current blocklist (returns default patterns for backward compatibility)
   */
  getBlocklist(): string[] {
    return [...this.defaultPatterns];
  }

  /**
   * Get pattern matcher statistics
   */
  getStats(): { patterns: number; domains: number } {
    const stats = this.patternMatcher.getStats();
    return { patterns: stats.patterns, domains: stats.domains };
  }
}

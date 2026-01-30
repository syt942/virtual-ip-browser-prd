/**
 * Tracker Blocker
 * Blocks tracking scripts, ads, and analytics
 */

import { session } from 'electron';

export class TrackerBlocker {
  private enabled: boolean;
  private blocklists: Set<string>;
  private customRules: string[];

  constructor() {
    this.enabled = true;
    this.blocklists = new Set();
    this.customRules = [];
    this.loadDefaultBlocklists();
  }

  /**
   * Load default blocklists
   */
  private loadDefaultBlocklists(): void {
    // Common tracking domains
    const defaultTrackers = [
      // Analytics
      '*://google-analytics.com/*',
      '*://*.google-analytics.com/*',
      '*://googletagmanager.com/*',
      '*://*.googletagmanager.com/*',
      '*://analytics.google.com/*',
      
      // Social media trackers
      '*://connect.facebook.net/*',
      '*://platform.twitter.com/*',
      '*://platform.linkedin.com/*',
      
      // Ad networks
      '*://doubleclick.net/*',
      '*://*.doubleclick.net/*',
      '*://googlesyndication.com/*',
      '*://*.googlesyndication.com/*',
      '*://adservice.google.com/*',
      
      // Other trackers
      '*://scorecardresearch.com/*',
      '*://quantserve.com/*',
      '*://hotjar.com/*',
      '*://*.hotjar.com/*',
      '*://mouseflow.com/*',
      '*://crazyegg.com/*'
    ];
    
    defaultTrackers.forEach(url => this.blocklists.add(url));
  }

  /**
   * Enable tracker blocking for a session
   */
  enableForSession(sessionPartition: string): void {
    if (!this.enabled) return;
    
    const webSession = session.fromPartition(sessionPartition);
    
    // Block requests to tracking domains
    webSession.webRequest.onBeforeRequest((details, callback) => {
      const url = details.url.toLowerCase();
      
      // Check if URL matches any blocklist pattern
      for (const pattern of this.blocklists) {
        if (this.matchesPattern(url, pattern)) {
          console.log('[Tracker Blocker] Blocked:', url);
          callback({ cancel: true });
          return;
        }
      }
      
      // Check custom rules
      for (const rule of this.customRules) {
        if (url.includes(rule.toLowerCase())) {
          console.log('[Tracker Blocker] Blocked (custom):', url);
          callback({ cancel: true });
          return;
        }
      }
      
      callback({ cancel: false });
    });
    
    console.log('[Tracker Blocker] Enabled for session:', sessionPartition);
  }

  /**
   * Check if URL matches a pattern
   */
  private matchesPattern(url: string, pattern: string): boolean {
    // Convert wildcard pattern to regex
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    
    const regex = new RegExp('^' + regexPattern + '$', 'i');
    return regex.test(url);
  }

  /**
   * Add custom blocking rule
   */
  addCustomRule(rule: string): void {
    this.customRules.push(rule);
  }

  /**
   * Remove custom blocking rule
   */
  removeCustomRule(rule: string): void {
    this.customRules = this.customRules.filter(r => r !== rule);
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
   * Add domain to blocklist
   */
  addToBlocklist(domain: string): void {
    this.blocklists.add(domain);
  }

  /**
   * Remove domain from blocklist
   */
  removeFromBlocklist(domain: string): void {
    this.blocklists.delete(domain);
  }

  /**
   * Get current blocklist
   */
  getBlocklist(): string[] {
    return Array.from(this.blocklists);
  }
}

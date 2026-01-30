/**
 * CAPTCHA Detection System
 * Detects and handles various types of CAPTCHAs during automation
 * 
 * Supports detection of:
 * - reCAPTCHA v2/v3
 * - hCaptcha
 * - Cloudflare Turnstile
 * - Image-based captchas
 * - Slider captchas
 * 
 * @module electron/core/automation/captcha-detector
 */

import { EventEmitter } from 'events';
import type {
  CaptchaDetectionResult,
  CaptchaDetectorConfig,
  CaptchaDetectionStrategy,
  CaptchaPattern,
  CaptchaEvent,
  CaptchaAction,
  CaptchaStats,
  CaptchaScanOptions,
  CaptchaMetadata,
  DetectionMethod
} from '../../types/captcha';

/**
 * Built-in detection strategies for common captcha types
 */
const BUILTIN_STRATEGIES: CaptchaDetectionStrategy[] = [
  {
    id: 'recaptcha-v2',
    name: 'Google reCAPTCHA v2',
    type: 'recaptcha-v2',
    enabled: true,
    priority: 100,
    patterns: [
      { type: 'selector', value: 'iframe[src*="recaptcha"]', isRegex: false, confidence: 0.95 },
      { type: 'selector', value: '.g-recaptcha', isRegex: false, confidence: 0.9 },
      { type: 'selector', value: '[data-sitekey]', isRegex: false, confidence: 0.85 },
      { type: 'script', value: 'recaptcha/api.js', isRegex: false, confidence: 0.9 },
      { type: 'selector', value: '#recaptcha', isRegex: false, confidence: 0.8 }
    ]
  },
  {
    id: 'recaptcha-v3',
    name: 'Google reCAPTCHA v3',
    type: 'recaptcha-v3',
    enabled: true,
    priority: 99,
    patterns: [
      { type: 'script', value: 'recaptcha/api.js?render=', isRegex: false, confidence: 0.95 },
      { type: 'selector', value: '.grecaptcha-badge', isRegex: false, confidence: 0.9 },
      { type: 'selector', value: '[data-recaptcha-v3]', isRegex: false, confidence: 0.85 }
    ]
  },
  {
    id: 'hcaptcha',
    name: 'hCaptcha',
    type: 'hcaptcha',
    enabled: true,
    priority: 98,
    patterns: [
      { type: 'selector', value: 'iframe[src*="hcaptcha"]', isRegex: false, confidence: 0.95 },
      { type: 'selector', value: '.h-captcha', isRegex: false, confidence: 0.9 },
      { type: 'selector', value: '[data-hcaptcha-sitekey]', isRegex: false, confidence: 0.85 },
      { type: 'script', value: 'hcaptcha.com/1/api.js', isRegex: false, confidence: 0.9 }
    ]
  },
  {
    id: 'cloudflare-turnstile',
    name: 'Cloudflare Turnstile',
    type: 'cloudflare-turnstile',
    enabled: true,
    priority: 97,
    patterns: [
      { type: 'selector', value: 'iframe[src*="challenges.cloudflare.com"]', isRegex: false, confidence: 0.95 },
      { type: 'selector', value: '.cf-turnstile', isRegex: false, confidence: 0.9 },
      { type: 'selector', value: '[data-turnstile-sitekey]', isRegex: false, confidence: 0.85 },
      { type: 'script', value: 'challenges.cloudflare.com/turnstile', isRegex: false, confidence: 0.9 }
    ]
  },
  {
    id: 'cloudflare-challenge',
    name: 'Cloudflare Challenge Page',
    type: 'cloudflare-turnstile',
    enabled: true,
    priority: 96,
    patterns: [
      { type: 'text', value: 'Checking your browser', isRegex: false, confidence: 0.7 },
      { type: 'text', value: 'DDoS protection by Cloudflare', isRegex: false, confidence: 0.8 },
      { type: 'selector', value: '#challenge-running', isRegex: false, confidence: 0.9 },
      { type: 'selector', value: '#challenge-form', isRegex: false, confidence: 0.85 }
    ]
  },
  {
    id: 'image-captcha',
    name: 'Generic Image CAPTCHA',
    type: 'image-captcha',
    enabled: true,
    priority: 50,
    patterns: [
      { type: 'selector', value: 'img[src*="captcha"]', isRegex: false, confidence: 0.7 },
      { type: 'selector', value: 'img[alt*="captcha" i]', isRegex: false, confidence: 0.7 },
      { type: 'selector', value: 'input[name*="captcha" i]', isRegex: false, confidence: 0.6 },
      { type: 'selector', value: '.captcha-image', isRegex: false, confidence: 0.75 }
    ]
  },
  {
    id: 'slider-captcha',
    name: 'Slider CAPTCHA',
    type: 'slider-captcha',
    enabled: true,
    priority: 60,
    patterns: [
      { type: 'selector', value: '.slider-captcha', isRegex: false, confidence: 0.8 },
      { type: 'selector', value: '[class*="slide-verify"]', isRegex: false, confidence: 0.75 },
      { type: 'selector', value: '.geetest_slider', isRegex: false, confidence: 0.9 },
      { type: 'selector', value: '#geetest-wrap', isRegex: false, confidence: 0.85 }
    ]
  }
];

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: CaptchaDetectorConfig = {
  enabled: true,
  checkInterval: 2000,
  defaultAction: 'pause',
  maxAttempts: 3,
  timeout: 30000,
  logging: true,
  strategies: [],
  alertConfig: {
    desktopNotification: true,
    soundAlert: false,
    inAppAlert: true,
    minSeverity: 'medium'
  }
};

/**
 * CAPTCHA Detector Class
 * 
 * Provides comprehensive captcha detection capabilities for automation tasks.
 * Integrates with tab automation to pause when captchas are detected.
 * 
 * @example
 * ```typescript
 * const detector = new CaptchaDetector();
 * 
 * // Listen for captcha events
 * detector.on('captcha:detected', (event) => {
 *   console.log(`Captcha detected: ${event.result.type}`);
 * });
 * 
 * // Scan a page for captchas
 * const result = await detector.scan(webContents, 'https://example.com');
 * if (result.detected) {
 *   console.log(`Found ${result.type} captcha`);
 * }
 * ```
 */
export class CaptchaDetector extends EventEmitter {
  private config: CaptchaDetectorConfig;
  private strategies: CaptchaDetectionStrategy[];
  private stats: CaptchaStats;
  private activeScans: Map<string, NodeJS.Timeout> = new Map();
  private pausedTabs: Set<string> = new Set();

  /**
   * Create a new CaptchaDetector instance
   * 
   * @param config - Optional configuration overrides
   */
  constructor(config: Partial<CaptchaDetectorConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.strategies = this.initializeStrategies();
    this.stats = this.initializeStats();
  }

  /**
   * Initialize detection strategies
   */
  private initializeStrategies(): CaptchaDetectionStrategy[] {
    const customStrategies = this.config.strategies || [];
    const allStrategies = [...BUILTIN_STRATEGIES, ...customStrategies];
    
    // Sort by priority (higher first)
    return allStrategies
      .filter(s => s.enabled)
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Initialize statistics
   */
  private initializeStats(): CaptchaStats {
    return {
      totalDetections: 0,
      byType: {
        'recaptcha-v2': 0,
        'recaptcha-v3': 0,
        'hcaptcha': 0,
        'cloudflare-turnstile': 0,
        'image-captcha': 0,
        'text-captcha': 0,
        'slider-captcha': 0,
        'unknown': 0
      },
      byDomain: {},
      bypassSuccessRate: 0,
      avgDetectionTime: 0,
      lastDetection: undefined
    };
  }

  /**
   * Scan page for captchas
   * 
   * @param webContents - Electron WebContents to scan
   * @param url - Current page URL
   * @param options - Scan options
   * @returns Detection result
   */
  async scan(
    webContents: Electron.WebContents,
    url: string,
    options: Partial<CaptchaScanOptions> = {}
  ): Promise<CaptchaDetectionResult> {
    const startTime = Date.now();
    const scanOptions: CaptchaScanOptions = {
      strategies: options.strategies,
      includeFrames: options.includeFrames ?? true,
      maxFrameDepth: options.maxFrameDepth ?? 2,
      timeout: options.timeout ?? this.config.timeout
    };

    try {
      // Get strategies to use
      const strategiesToUse = scanOptions.strategies
        ? this.strategies.filter(s => scanOptions.strategies!.includes(s.id))
        : this.strategies;

      // Run detection
      for (const strategy of strategiesToUse) {
        const result = await this.runStrategy(webContents, url, strategy);
        if (result.detected) {
          this.updateStats(result, Date.now() - startTime);
          this.log('info', `Captcha detected: ${result.type}`, { url, strategy: strategy.id });
          return result;
        }
      }

      return this.createNegativeResult(url);
    } catch (error) {
      this.log('error', 'Scan failed', { url, error: String(error) });
      return this.createNegativeResult(url);
    }
  }

  /**
   * Run a single detection strategy
   */
  private async runStrategy(
    webContents: Electron.WebContents,
    url: string,
    strategy: CaptchaDetectionStrategy
  ): Promise<CaptchaDetectionResult> {
    for (const pattern of strategy.patterns) {
      try {
        const match = await this.checkPattern(webContents, pattern);
        if (match.found) {
          return {
            detected: true,
            type: strategy.type,
            confidence: pattern.confidence,
            method: this.patternTypeToMethod(pattern.type),
            selector: match.selector,
            url,
            timestamp: new Date(),
            metadata: match.metadata
          };
        }
      } catch {
        // Pattern check failed, continue to next
        continue;
      }
    }

    return this.createNegativeResult(url);
  }

  /**
   * Check a single pattern against page content
   */
  private async checkPattern(
    webContents: Electron.WebContents,
    pattern: CaptchaPattern
  ): Promise<{ found: boolean; selector?: string; metadata?: CaptchaMetadata }> {
    const script = this.generateCheckScript(pattern);
    
    try {
      const result = await webContents.executeJavaScript(script);
      return result;
    } catch {
      return { found: false };
    }
  }

  /**
   * Generate JavaScript to check for a pattern
   */
  private generateCheckScript(pattern: CaptchaPattern): string {
    switch (pattern.type) {
      case 'selector':
        return `
          (function() {
            const el = document.querySelector('${this.escapeSelector(pattern.value)}');
            if (!el) return { found: false };
            
            const rect = el.getBoundingClientRect();
            const metadata = {
              dimensions: { width: rect.width, height: rect.height },
              siteKey: el.dataset?.sitekey || el.dataset?.hcaptchaSitekey,
              isInvisible: rect.width === 0 || rect.height === 0
            };
            
            return { found: true, selector: '${this.escapeSelector(pattern.value)}', metadata };
          })()
        `;

      case 'script':
        return `
          (function() {
            const scripts = Array.from(document.querySelectorAll('script[src]'));
            const found = scripts.some(s => s.src.includes('${this.escapeString(pattern.value)}'));
            return { found };
          })()
        `;

      case 'text':
        return `
          (function() {
            const bodyText = document.body?.innerText || '';
            const found = bodyText.includes('${this.escapeString(pattern.value)}');
            return { found };
          })()
        `;

      case 'url':
        return `
          (function() {
            const found = window.location.href.includes('${this.escapeString(pattern.value)}');
            return { found };
          })()
        `;

      case 'attribute':
        return `
          (function() {
            const el = document.querySelector('[${pattern.attribute}*="${this.escapeString(pattern.value)}"]');
            return { found: !!el, selector: el ? '[${pattern.attribute}]' : undefined };
          })()
        `;

      default:
        return '({ found: false })';
    }
  }

  /**
   * Start continuous monitoring on a tab
   * 
   * @param tabId - Tab identifier
   * @param webContents - Electron WebContents
   * @param _url - Initial URL (unused, kept for API compatibility)
   */
  startMonitoring(tabId: string, webContents: Electron.WebContents, _url: string): void {
    if (this.activeScans.has(tabId)) {
      this.stopMonitoring(tabId);
    }

    const interval = setInterval(async () => {
      if (!this.config.enabled) return;

      try {
        const currentUrl = webContents.getURL();
        const result = await this.scan(webContents, currentUrl);

        if (result.detected) {
          this.handleDetection(tabId, result);
        }
      } catch {
        // Tab may have been closed
        this.stopMonitoring(tabId);
      }
    }, this.config.checkInterval);

    this.activeScans.set(tabId, interval);
    this.log('info', `Started monitoring tab ${tabId}`);
  }

  /**
   * Stop monitoring a tab
   * 
   * @param tabId - Tab identifier
   */
  stopMonitoring(tabId: string): void {
    const interval = this.activeScans.get(tabId);
    if (interval) {
      clearInterval(interval);
      this.activeScans.delete(tabId);
      this.pausedTabs.delete(tabId);
      this.log('info', `Stopped monitoring tab ${tabId}`);
    }
  }

  /**
   * Handle a captcha detection
   */
  private handleDetection(tabId: string, result: CaptchaDetectionResult): void {
    const action = this.determineAction(result);

    const event: CaptchaEvent = {
      type: 'captcha:detected',
      result,
      tabId,
      action
    };

    this.emit('captcha:detected', event);

    if (action === 'pause') {
      this.pausedTabs.add(tabId);
      this.emit('automation:pause', { tabId, reason: 'captcha', result });
    }

    if (this.config.alertConfig.inAppAlert) {
      this.emit('alert', {
        type: 'captcha',
        message: `${result.type} captcha detected`,
        severity: this.getSeverity(result),
        tabId
      });
    }
  }

  /**
   * Determine action based on detection result
   */
  private determineAction(result: CaptchaDetectionResult): CaptchaAction {
    // High confidence detections should pause
    if (result.confidence >= 0.9) {
      return 'pause';
    }

    // Medium confidence - alert but continue
    if (result.confidence >= 0.7) {
      return 'alert';
    }

    // Low confidence - just log
    return 'skip';
  }

  /**
   * Get severity level for a detection
   */
  private getSeverity(result: CaptchaDetectionResult): 'low' | 'medium' | 'high' | 'critical' {
    if (result.confidence >= 0.95) return 'critical';
    if (result.confidence >= 0.8) return 'high';
    if (result.confidence >= 0.6) return 'medium';
    return 'low';
  }

  /**
   * Resume automation after captcha resolved
   * 
   * @param tabId - Tab identifier
   */
  resumeAutomation(tabId: string): void {
    if (this.pausedTabs.has(tabId)) {
      this.pausedTabs.delete(tabId);
      this.emit('automation:resume', { tabId });
      this.emit('captcha:resolved', { tabId });
      this.log('info', `Resumed automation for tab ${tabId}`);
    }
  }

  /**
   * Check if tab is paused due to captcha
   * 
   * @param tabId - Tab identifier
   * @returns Whether tab is paused
   */
  isTabPaused(tabId: string): boolean {
    return this.pausedTabs.has(tabId);
  }

  /**
   * Add a custom detection strategy
   * 
   * @param strategy - Strategy to add
   */
  addStrategy(strategy: CaptchaDetectionStrategy): void {
    this.strategies.push(strategy);
    this.strategies.sort((a, b) => b.priority - a.priority);
    this.log('info', `Added strategy: ${strategy.name}`);
  }

  /**
   * Remove a detection strategy
   * 
   * @param strategyId - Strategy ID to remove
   * @returns Whether strategy was removed
   */
  removeStrategy(strategyId: string): boolean {
    const index = this.strategies.findIndex(s => s.id === strategyId);
    if (index !== -1) {
      this.strategies.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get all strategies
   */
  getStrategies(): CaptchaDetectionStrategy[] {
    return [...this.strategies];
  }

  /**
   * Update configuration
   * 
   * @param config - Configuration updates
   */
  updateConfig(config: Partial<CaptchaDetectorConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (config.strategies) {
      this.strategies = this.initializeStrategies();
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): CaptchaDetectorConfig {
    return { ...this.config };
  }

  /**
   * Get detection statistics
   */
  getStats(): CaptchaStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = this.initializeStats();
  }

  /**
   * Update statistics after detection
   */
  private updateStats(result: CaptchaDetectionResult, detectionTime: number): void {
    this.stats.totalDetections++;
    this.stats.byType[result.type]++;
    
    const domain = this.extractDomain(result.url);
    this.stats.byDomain[domain] = (this.stats.byDomain[domain] || 0) + 1;
    
    // Update average detection time
    const totalTime = this.stats.avgDetectionTime * (this.stats.totalDetections - 1) + detectionTime;
    this.stats.avgDetectionTime = totalTime / this.stats.totalDetections;
    
    this.stats.lastDetection = new Date();
  }

  /**
   * Create a negative detection result
   */
  private createNegativeResult(url: string): CaptchaDetectionResult {
    return {
      detected: false,
      type: 'unknown',
      confidence: 0,
      method: 'dom-structure',
      url,
      timestamp: new Date()
    };
  }

  /**
   * Convert pattern type to detection method
   */
  private patternTypeToMethod(type: CaptchaPattern['type']): DetectionMethod {
    const mapping: Record<CaptchaPattern['type'], DetectionMethod> = {
      selector: 'class-name',
      url: 'url-pattern',
      script: 'script-src',
      text: 'text-content',
      attribute: 'element-id'
    };
    return mapping[type] || 'dom-structure';
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return 'unknown';
    }
  }

  /**
   * Escape string for use in JavaScript
   */
  private escapeString(str: string): string {
    return str.replace(/[\\'"]/g, '\\$&');
  }

  /**
   * Escape CSS selector
   */
  private escapeSelector(selector: string): string {
    return selector.replace(/'/g, "\\'");
  }

  /**
   * Log a message
   */
  private log(level: 'info' | 'error' | 'warning', message: string, data?: Record<string, unknown>): void {
    if (!this.config.logging) return;

    const logMessage = `[CaptchaDetector] ${message}`;
    
    switch (level) {
      case 'error':
        console.error(logMessage, data);
        break;
      case 'warning':
        console.warn(logMessage, data);
        break;
      default:
        console.log(logMessage, data);
    }

    this.emit('log', { level, message, data, timestamp: new Date() });
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    // Stop all active scans
    for (const tabId of this.activeScans.keys()) {
      this.stopMonitoring(tabId);
    }

    this.removeAllListeners();
    this.pausedTabs.clear();
  }
}

// Re-export types for convenience
export type {
  CaptchaType,
  CaptchaDetectionResult,
  CaptchaDetectorConfig,
  CaptchaDetectionStrategy,
  CaptchaPattern,
  CaptchaEvent,
  CaptchaAction,
  CaptchaStats,
  CaptchaScanOptions
} from '../../types/captcha';

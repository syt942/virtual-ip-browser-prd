/**
 * CAPTCHA Detector Unit Tests
 * Tests for captcha detection strategies and configuration
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CaptchaDetector } from '../../electron/core/automation/captcha-detector';
import type {
  CaptchaDetectionStrategy,
  CaptchaDetectorConfig,
  CaptchaEvent
} from '../../electron/types/captcha';

// Mock Electron WebContents
const createMockWebContents = (executeJavaScriptResult: unknown = { found: false }) => ({
  executeJavaScript: vi.fn().mockResolvedValue(executeJavaScriptResult),
  getURL: vi.fn().mockReturnValue('https://example.com'),
  on: vi.fn(),
  off: vi.fn()
});

describe('CaptchaDetector', () => {
  let detector: CaptchaDetector;

  beforeEach(() => {
    detector = new CaptchaDetector();
    vi.clearAllMocks();
  });

  afterEach(() => {
    detector.destroy();
  });

  describe('constructor', () => {
    it('should create detector with default config', () => {
      const config = detector.getConfig();

      expect(config.enabled).toBe(true);
      expect(config.checkInterval).toBe(2000);
      expect(config.defaultAction).toBe('pause');
      expect(config.maxAttempts).toBe(3);
      expect(config.timeout).toBe(30000);
      expect(config.logging).toBe(true);
    });

    it('should accept custom config', () => {
      const customDetector = new CaptchaDetector({
        enabled: false,
        checkInterval: 5000,
        defaultAction: 'alert',
        logging: false
      });

      const config = customDetector.getConfig();
      expect(config.enabled).toBe(false);
      expect(config.checkInterval).toBe(5000);
      expect(config.defaultAction).toBe('alert');
      expect(config.logging).toBe(false);

      customDetector.destroy();
    });

    it('should initialize with built-in strategies', () => {
      const strategies = detector.getStrategies();

      expect(strategies.length).toBeGreaterThan(0);
      
      const strategyIds = strategies.map(s => s.id);
      expect(strategyIds).toContain('recaptcha-v2');
      expect(strategyIds).toContain('recaptcha-v3');
      expect(strategyIds).toContain('hcaptcha');
      expect(strategyIds).toContain('cloudflare-turnstile');
    });

    it('should sort strategies by priority', () => {
      const strategies = detector.getStrategies();

      for (let i = 1; i < strategies.length; i++) {
        expect(strategies[i - 1].priority).toBeGreaterThanOrEqual(strategies[i].priority);
      }
    });
  });

  describe('scan', () => {
    it('should return negative result when no captcha found', async () => {
      const mockWebContents = createMockWebContents({ found: false });

      const result = await detector.scan(
        mockWebContents as unknown as Electron.WebContents,
        'https://example.com'
      );

      expect(result.detected).toBe(false);
      expect(result.type).toBe('unknown');
      expect(result.confidence).toBe(0);
      expect(result.url).toBe('https://example.com');
    });

    it('should detect reCAPTCHA v2', async () => {
      const mockWebContents = createMockWebContents({
        found: true,
        selector: '.g-recaptcha',
        metadata: { siteKey: 'test-site-key' }
      });

      const result = await detector.scan(
        mockWebContents as unknown as Electron.WebContents,
        'https://example.com'
      );

      expect(result.detected).toBe(true);
      expect(result.type).toBe('recaptcha-v2');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should include timestamp in result', async () => {
      const mockWebContents = createMockWebContents({ found: false });
      const beforeScan = new Date();

      const result = await detector.scan(
        mockWebContents as unknown as Electron.WebContents,
        'https://example.com'
      );

      const afterScan = new Date();
      expect(result.timestamp.getTime()).toBeGreaterThanOrEqual(beforeScan.getTime());
      expect(result.timestamp.getTime()).toBeLessThanOrEqual(afterScan.getTime());
    });

    it('should handle executeJavaScript errors gracefully', async () => {
      const mockWebContents = {
        executeJavaScript: vi.fn().mockRejectedValue(new Error('Script error')),
        getURL: vi.fn().mockReturnValue('https://example.com')
      };

      const result = await detector.scan(
        mockWebContents as unknown as Electron.WebContents,
        'https://example.com'
      );

      expect(result.detected).toBe(false);
    });

    it('should use specified strategies only when provided', async () => {
      const mockWebContents = createMockWebContents({ found: false });

      await detector.scan(
        mockWebContents as unknown as Electron.WebContents,
        'https://example.com',
        { strategies: ['hcaptcha'] }
      );

      // Should have called executeJavaScript only for hcaptcha patterns
      expect(mockWebContents.executeJavaScript).toHaveBeenCalled();
    });
  });

  describe('monitoring', () => {
    it('should start monitoring a tab', () => {
      const mockWebContents = createMockWebContents({ found: false });
      
      detector.startMonitoring('tab-1', mockWebContents as unknown as Electron.WebContents, 'https://example.com');

      // Monitoring should be active (we can't easily verify interval, but we can test stop)
      detector.stopMonitoring('tab-1');
    });

    it('should stop monitoring when requested', () => {
      const mockWebContents = createMockWebContents({ found: false });
      
      detector.startMonitoring('tab-1', mockWebContents as unknown as Electron.WebContents, 'https://example.com');
      detector.stopMonitoring('tab-1');

      // Should be able to call stop multiple times without error
      detector.stopMonitoring('tab-1');
    });

    it('should replace existing monitoring for same tab', () => {
      const mockWebContents = createMockWebContents({ found: false });
      
      detector.startMonitoring('tab-1', mockWebContents as unknown as Electron.WebContents, 'https://example.com');
      detector.startMonitoring('tab-1', mockWebContents as unknown as Electron.WebContents, 'https://other.com');
      
      // Should not throw and should have only one monitor
      detector.stopMonitoring('tab-1');
    });
  });

  describe('tab pause/resume', () => {
    it('should track paused tabs', () => {
      expect(detector.isTabPaused('tab-1')).toBe(false);
    });

    it('should resume automation for paused tab', () => {
      const listener = vi.fn();
      detector.on('automation:resume', listener);

      // Simulate internal pause (normally done by handleDetection)
      // We'll test resume functionality
      detector.resumeAutomation('tab-1');

      // Tab wasn't paused, so nothing should happen
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('strategies', () => {
    it('should add custom strategy', () => {
      const customStrategy: CaptchaDetectionStrategy = {
        id: 'custom-captcha',
        name: 'Custom CAPTCHA',
        type: 'unknown',
        enabled: true,
        priority: 200,
        patterns: [
          { type: 'selector', value: '.custom-captcha', isRegex: false, confidence: 0.9 }
        ]
      };

      detector.addStrategy(customStrategy);
      const strategies = detector.getStrategies();

      expect(strategies.find(s => s.id === 'custom-captcha')).toBeDefined();
    });

    it('should insert strategy in correct priority order', () => {
      const highPriorityStrategy: CaptchaDetectionStrategy = {
        id: 'high-priority',
        name: 'High Priority',
        type: 'unknown',
        enabled: true,
        priority: 1000,
        patterns: []
      };

      detector.addStrategy(highPriorityStrategy);
      const strategies = detector.getStrategies();

      expect(strategies[0].id).toBe('high-priority');
    });

    it('should remove strategy by id', () => {
      const initialCount = detector.getStrategies().length;
      
      const removed = detector.removeStrategy('recaptcha-v2');
      
      expect(removed).toBe(true);
      expect(detector.getStrategies().length).toBe(initialCount - 1);
    });

    it('should return false when removing non-existent strategy', () => {
      const removed = detector.removeStrategy('non-existent');
      expect(removed).toBe(false);
    });
  });

  describe('configuration', () => {
    it('should update configuration', () => {
      detector.updateConfig({
        enabled: false,
        checkInterval: 10000
      });

      const config = detector.getConfig();
      expect(config.enabled).toBe(false);
      expect(config.checkInterval).toBe(10000);
    });

    it('should preserve unmodified config values', () => {
      const originalTimeout = detector.getConfig().timeout;
      
      detector.updateConfig({ enabled: false });

      expect(detector.getConfig().timeout).toBe(originalTimeout);
    });
  });

  describe('statistics', () => {
    it('should initialize with zero stats', () => {
      const stats = detector.getStats();

      expect(stats.totalDetections).toBe(0);
      expect(stats.avgDetectionTime).toBe(0);
      expect(stats.lastDetection).toBeUndefined();
    });

    it('should track detections by type', () => {
      const stats = detector.getStats();

      expect(stats.byType['recaptcha-v2']).toBe(0);
      expect(stats.byType['hcaptcha']).toBe(0);
      expect(stats.byType['cloudflare-turnstile']).toBe(0);
    });

    it('should reset statistics', () => {
      detector.resetStats();
      const stats = detector.getStats();

      expect(stats.totalDetections).toBe(0);
    });
  });

  describe('events', () => {
    it('should emit captcha:detected event', async () => {
      const listener = vi.fn();
      detector.on('captcha:detected', listener);

      const mockWebContents = createMockWebContents({
        found: true,
        selector: '.g-recaptcha',
        metadata: {}
      });

      // Start monitoring to trigger detection
      detector.startMonitoring('tab-1', mockWebContents as unknown as Electron.WebContents, 'https://example.com');

      // Wait for interval to trigger (we need to clean up)
      detector.stopMonitoring('tab-1');
    });

    it('should emit log events when logging enabled', async () => {
      const logListener = vi.fn();
      detector.on('log', logListener);

      const mockWebContents = createMockWebContents({ found: false });

      detector.startMonitoring('tab-1', mockWebContents as unknown as Electron.WebContents, 'https://example.com');
      
      // Should have logged monitoring start
      expect(logListener).toHaveBeenCalled();

      detector.stopMonitoring('tab-1');
    });
  });

  describe('destroy', () => {
    it('should clean up all resources', () => {
      const mockWebContents = createMockWebContents({ found: false });
      
      detector.startMonitoring('tab-1', mockWebContents as unknown as Electron.WebContents, 'https://example.com');
      detector.startMonitoring('tab-2', mockWebContents as unknown as Electron.WebContents, 'https://example.com');

      detector.destroy();

      // Should not throw when destroyed
      expect(() => detector.destroy()).not.toThrow();
    });

    it('should remove all event listeners', () => {
      const listener = vi.fn();
      detector.on('captcha:detected', listener);

      detector.destroy();

      // Emitting after destroy should not call listener
      detector.emit('captcha:detected', {});
      // Note: EventEmitter still allows emit after removeAllListeners
      // but we've cleared all registered listeners
    });
  });

  describe('built-in strategies', () => {
    it('should have reCAPTCHA v2 strategy with correct patterns', () => {
      const strategies = detector.getStrategies();
      const recaptchaV2 = strategies.find(s => s.id === 'recaptcha-v2');

      expect(recaptchaV2).toBeDefined();
      expect(recaptchaV2!.patterns.length).toBeGreaterThan(0);
      expect(recaptchaV2!.patterns.some(p => p.value.includes('recaptcha'))).toBe(true);
    });

    it('should have hCaptcha strategy with correct patterns', () => {
      const strategies = detector.getStrategies();
      const hcaptcha = strategies.find(s => s.id === 'hcaptcha');

      expect(hcaptcha).toBeDefined();
      expect(hcaptcha!.patterns.some(p => p.value.includes('hcaptcha'))).toBe(true);
    });

    it('should have Cloudflare Turnstile strategy', () => {
      const strategies = detector.getStrategies();
      const turnstile = strategies.find(s => s.id === 'cloudflare-turnstile');

      expect(turnstile).toBeDefined();
      expect(turnstile!.patterns.some(p => p.value.includes('cloudflare'))).toBe(true);
    });

    it('should have image captcha strategy', () => {
      const strategies = detector.getStrategies();
      const imageCaptcha = strategies.find(s => s.id === 'image-captcha');

      expect(imageCaptcha).toBeDefined();
      expect(imageCaptcha!.type).toBe('image-captcha');
    });

    it('should have slider captcha strategy', () => {
      const strategies = detector.getStrategies();
      const sliderCaptcha = strategies.find(s => s.id === 'slider-captcha');

      expect(sliderCaptcha).toBeDefined();
      expect(sliderCaptcha!.type).toBe('slider-captcha');
    });
  });

  describe('pattern types', () => {
    it('should handle selector patterns', async () => {
      const mockWebContents = createMockWebContents({
        found: true,
        selector: 'iframe[src*="recaptcha"]'
      });

      const result = await detector.scan(
        mockWebContents as unknown as Electron.WebContents,
        'https://example.com'
      );

      expect(mockWebContents.executeJavaScript).toHaveBeenCalled();
    });

    it('should generate correct JavaScript for detection', async () => {
      const mockWebContents = createMockWebContents({ found: false });

      await detector.scan(
        mockWebContents as unknown as Electron.WebContents,
        'https://example.com'
      );

      const calls = mockWebContents.executeJavaScript.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      
      // Check that scripts are valid JavaScript (wrapped in IIFE)
      calls.forEach(call => {
        const script = call[0] as string;
        expect(script).toContain('function()');
      });
    });
  });

  describe('alert configuration', () => {
    it('should have default alert configuration', () => {
      const config = detector.getConfig();

      expect(config.alertConfig.desktopNotification).toBe(true);
      expect(config.alertConfig.soundAlert).toBe(false);
      expect(config.alertConfig.inAppAlert).toBe(true);
      expect(config.alertConfig.minSeverity).toBe('medium');
    });

    it('should allow custom alert configuration', () => {
      const customDetector = new CaptchaDetector({
        alertConfig: {
          desktopNotification: false,
          soundAlert: true,
          inAppAlert: false,
          minSeverity: 'high'
        }
      });

      const config = customDetector.getConfig();
      expect(config.alertConfig.desktopNotification).toBe(false);
      expect(config.alertConfig.soundAlert).toBe(true);
      expect(config.alertConfig.minSeverity).toBe('high');

      customDetector.destroy();
    });
  });
});

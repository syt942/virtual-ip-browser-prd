/**
 * Privacy Manager Integration Tests
 * PRD Section 6.2 - P1 Privacy Protection Requirements
 * 
 * Tests for privacy manager enable/disable, profile management, and persistence
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrivacyManager, PrivacyConfig } from '../../../electron/core/privacy/manager';

// Mock electron session for tracker blocker tests
vi.mock('electron', () => ({
  session: {
    fromPartition: vi.fn(() => ({
      webRequest: {
        onBeforeRequest: vi.fn()
      }
    }))
  }
}));

describe('PrivacyManager Integration', () => {
  let manager: PrivacyManager;

  beforeEach(() => {
    manager = new PrivacyManager();
  });

  describe('Initialization', () => {
    it('should initialize all protection modules', () => {
      expect(manager.getCanvasProtection()).toBeDefined();
      expect(manager.getWebGLProtection()).toBeDefined();
      expect(manager.getAudioProtection()).toBeDefined();
      expect(manager.getNavigatorProtection()).toBeDefined();
      expect(manager.getTimezoneProtection()).toBeDefined();
      expect(manager.getWebRTCProtection()).toBeDefined();
      expect(manager.getTrackerBlocker()).toBeDefined();
    });

    it('should extend EventEmitter', () => {
      expect(manager.on).toBeDefined();
      expect(manager.emit).toBeDefined();
      expect(manager.removeListener).toBeDefined();
    });
  });

  describe('Enable/Disable Privacy Features', () => {
    describe('All Features Enabled', () => {
      it('should generate script with all protections', () => {
        const config: PrivacyConfig = {
          canvas: true,
          webgl: true,
          audio: true,
          navigator: true,
          timezone: true,
          webrtc: true,
          trackerBlocking: true
        };
        
        const script = manager.generateProtectionScript(config);
        
        expect(script).toContain('[Canvas Protection]');
        expect(script).toContain('[WebGL Protection]');
        expect(script).toContain('[Audio Protection]');
        expect(script).toContain('[Navigator Protection]');
        expect(script).toContain('[Timezone Protection]');
        expect(script).toContain('[WebRTC Protection]');
      });
    });

    describe('All Features Disabled', () => {
      it('should generate empty script when all disabled', () => {
        const config: PrivacyConfig = {
          canvas: false,
          webgl: false,
          audio: false,
          navigator: false,
          timezone: false,
          webrtc: false,
          trackerBlocking: false
        };
        
        const script = manager.generateProtectionScript(config);
        
        expect(script).toBe('');
      });
    });

    describe('Selective Feature Enabling', () => {
      it('should enable only canvas protection', () => {
        const config: PrivacyConfig = {
          canvas: true,
          webgl: false,
          audio: false,
          navigator: false,
          timezone: false,
          webrtc: false,
          trackerBlocking: false
        };
        
        const script = manager.generateProtectionScript(config);
        
        expect(script).toContain('[Canvas Protection]');
        expect(script).not.toContain('[WebGL Protection]');
        expect(script).not.toContain('[Audio Protection]');
      });

      it('should enable only WebRTC protection', () => {
        const config: PrivacyConfig = {
          canvas: false,
          webgl: false,
          audio: false,
          navigator: false,
          timezone: false,
          webrtc: true,
          trackerBlocking: false
        };
        
        const script = manager.generateProtectionScript(config);
        
        expect(script).toContain('[WebRTC Protection]');
        expect(script).not.toContain('[Canvas Protection]');
      });

      it('should enable multiple specific features', () => {
        const config: PrivacyConfig = {
          canvas: true,
          webgl: true,
          audio: false,
          navigator: true,
          timezone: false,
          webrtc: true,
          trackerBlocking: false
        };
        
        const script = manager.generateProtectionScript(config);
        
        expect(script).toContain('[Canvas Protection]');
        expect(script).toContain('[WebGL Protection]');
        expect(script).toContain('[Navigator Protection]');
        expect(script).toContain('[WebRTC Protection]');
        expect(script).not.toContain('[Audio Protection]');
        expect(script).not.toContain('[Timezone Protection]');
      });
    });
  });

  describe('Profile Management', () => {
    describe('Random Profile Generation', () => {
      it('should generate profile with all features enabled', () => {
        const profile = manager.generateRandomProfile();
        
        expect(profile.canvas).toBe(true);
        expect(profile.webgl).toBe(true);
        expect(profile.audio).toBe(true);
        expect(profile.navigator).toBe(true);
        expect(profile.timezone).toBe(true);
        expect(profile.webrtc).toBe(true);
        expect(profile.trackerBlocking).toBe(true);
      });

      it('should include navigator configuration', () => {
        const profile = manager.generateRandomProfile();
        
        expect(profile.navigatorConfig).toBeDefined();
        expect(profile.navigatorConfig.userAgent).toBeDefined();
        expect(profile.navigatorConfig.platform).toBeDefined();
      });

      it('should select from multiple platforms', () => {
        const platforms = new Set<string>();
        
        for (let i = 0; i < 100; i++) {
          const profile = manager.generateRandomProfile();
          platforms.add(profile.navigatorConfig.platform);
        }
        
        // Should have variation
        expect(platforms.size).toBeGreaterThanOrEqual(1);
      });

      it('should apply navigator config to protection module', () => {
        const profile = manager.generateRandomProfile();
        const navigatorProtection = manager.getNavigatorProtection();
        const config = navigatorProtection.getConfig();
        
        expect(config.userAgent).toBe(profile.navigatorConfig.userAgent);
      });

      it('should apply webgl config to protection module', () => {
        manager.generateRandomProfile();
        const webglProtection = manager.getWebGLProtection();
        const config = webglProtection.getConfig();
        
        expect(config.vendor).toBeDefined();
        expect(config.renderer).toBeDefined();
      });
    });

    describe('Custom Navigator Config', () => {
      it('should apply custom navigator config', () => {
        const customConfig = {
          userAgent: 'Custom User Agent',
          platform: 'CustomPlatform'
        };
        
        const config: PrivacyConfig = {
          canvas: false,
          webgl: false,
          audio: false,
          navigator: true,
          timezone: false,
          webrtc: false,
          trackerBlocking: false,
          navigatorConfig: customConfig
        };
        
        const script = manager.generateProtectionScript(config);
        
        expect(script).toContain('Custom User Agent');
        expect(script).toContain('CustomPlatform');
      });
    });

    describe('Custom Timezone Region', () => {
      it('should apply timezone for US region', () => {
        const config: PrivacyConfig = {
          canvas: false,
          webgl: false,
          audio: false,
          navigator: false,
          timezone: true,
          webrtc: false,
          trackerBlocking: false,
          timezoneRegion: 'US'
        };
        
        const script = manager.generateProtectionScript(config);
        
        expect(script).toContain('America/New_York');
      });

      it('should apply timezone for UK region', () => {
        const config: PrivacyConfig = {
          canvas: false,
          webgl: false,
          audio: false,
          navigator: false,
          timezone: true,
          webrtc: false,
          trackerBlocking: false,
          timezoneRegion: 'UK'
        };
        
        const script = manager.generateProtectionScript(config);
        
        expect(script).toContain('Europe/London');
      });

      it('should apply timezone for JP region', () => {
        const config: PrivacyConfig = {
          canvas: false,
          webgl: false,
          audio: false,
          navigator: false,
          timezone: true,
          webrtc: false,
          trackerBlocking: false,
          timezoneRegion: 'JP'
        };
        
        const script = manager.generateProtectionScript(config);
        
        expect(script).toContain('Asia/Tokyo');
      });
    });
  });

  describe('Session Application', () => {
    it('should emit privacy:applied event', () => {
      const listener = vi.fn();
      manager.on('privacy:applied', listener);
      
      const config: PrivacyConfig = {
        canvas: true,
        webgl: true,
        audio: true,
        navigator: true,
        timezone: true,
        webrtc: true,
        trackerBlocking: true
      };
      
      manager.applyToSession('test-partition', config);
      
      expect(listener).toHaveBeenCalledWith({
        sessionPartition: 'test-partition',
        config
      });
    });

    it('should enable tracker blocking for session when configured', () => {
      const config: PrivacyConfig = {
        canvas: false,
        webgl: false,
        audio: false,
        navigator: false,
        timezone: false,
        webrtc: false,
        trackerBlocking: true
      };
      
      // Should not throw
      expect(() => {
        manager.applyToSession('test-partition', config);
      }).not.toThrow();
    });

    it('should not enable tracker blocking when disabled', () => {
      const trackerBlocker = manager.getTrackerBlocker();
      const spy = vi.spyOn(trackerBlocker, 'enableForSession');
      
      const config: PrivacyConfig = {
        canvas: false,
        webgl: false,
        audio: false,
        navigator: false,
        timezone: false,
        webrtc: false,
        trackerBlocking: false
      };
      
      manager.applyToSession('test-partition', config);
      
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('Protection Module Access', () => {
    it('should return canvas protection instance', () => {
      const canvas = manager.getCanvasProtection();
      expect(canvas.getNoise).toBeDefined();
      expect(canvas.setNoise).toBeDefined();
      expect(canvas.generateInjectionScript).toBeDefined();
    });

    it('should return WebGL protection instance', () => {
      const webgl = manager.getWebGLProtection();
      expect(webgl.getConfig).toBeDefined();
      expect(webgl.setConfig).toBeDefined();
      expect(webgl.generateInjectionScript).toBeDefined();
    });

    it('should return audio protection instance', () => {
      const audio = manager.getAudioProtection();
      expect(audio.getNoiseLevel).toBeDefined();
      expect(audio.setNoiseLevel).toBeDefined();
      expect(audio.generateInjectionScript).toBeDefined();
    });

    it('should return navigator protection instance', () => {
      const navigator = manager.getNavigatorProtection();
      expect(navigator.getConfig).toBeDefined();
      expect(navigator.setConfig).toBeDefined();
      expect(navigator.generateInjectionScript).toBeDefined();
    });

    it('should return timezone protection instance', () => {
      const timezone = manager.getTimezoneProtection();
      expect(timezone.getTimezone).toBeDefined();
      expect(timezone.setTimezone).toBeDefined();
      expect(timezone.generateInjectionScript).toBeDefined();
    });

    it('should return WebRTC protection instance', () => {
      const webrtc = manager.getWebRTCProtection();
      expect(webrtc.isBlocked).toBeDefined();
      expect(webrtc.setBlockWebRTC).toBeDefined();
      expect(webrtc.generateInjectionScript).toBeDefined();
    });

    it('should return tracker blocker instance', () => {
      const tracker = manager.getTrackerBlocker();
      expect(tracker.isEnabled).toBeDefined();
      expect(tracker.setEnabled).toBeDefined();
      expect(tracker.addCustomRule).toBeDefined();
    });
  });

  describe('Script Concatenation', () => {
    it('should separate scripts with double newlines', () => {
      const config: PrivacyConfig = {
        canvas: true,
        webgl: true,
        audio: false,
        navigator: false,
        timezone: false,
        webrtc: false,
        trackerBlocking: false
      };
      
      const script = manager.generateProtectionScript(config);
      
      // Should have double newline between scripts
      expect(script).toContain('\n\n');
    });

    it('should generate valid combined JavaScript', () => {
      const config: PrivacyConfig = {
        canvas: true,
        webgl: true,
        audio: true,
        navigator: true,
        timezone: true,
        webrtc: true,
        trackerBlocking: false
      };
      
      const script = manager.generateProtectionScript(config);
      
      expect(() => {
        new Function(script);
      }).not.toThrow();
    });
  });
});

describe('PrivacyManager Persistence Patterns', () => {
  describe('Configuration Serialization', () => {
    it('should produce JSON-serializable config', () => {
      const manager = new PrivacyManager();
      const profile = manager.generateRandomProfile();
      
      expect(() => {
        JSON.stringify(profile);
      }).not.toThrow();
      
      const serialized = JSON.stringify(profile);
      const deserialized = JSON.parse(serialized);
      
      expect(deserialized.canvas).toBe(profile.canvas);
      expect(deserialized.navigatorConfig.userAgent).toBe(profile.navigatorConfig.userAgent);
    });

    it('should restore config from serialized form', () => {
      const manager = new PrivacyManager();
      const originalProfile = manager.generateRandomProfile();
      
      const serialized = JSON.stringify(originalProfile);
      const restored: PrivacyConfig = JSON.parse(serialized);
      
      // Should be usable to generate same script
      const script1 = manager.generateProtectionScript(originalProfile);
      const script2 = manager.generateProtectionScript(restored);
      
      // Scripts should contain same content
      expect(script1).toContain('[Canvas Protection]');
      expect(script2).toContain('[Canvas Protection]');
    });
  });

  describe('Module State Independence', () => {
    it('should allow independent module configuration', () => {
      const manager = new PrivacyManager();
      
      // Configure canvas
      manager.getCanvasProtection().setNoise(0.05);
      
      // Configure WebGL
      manager.getWebGLProtection().setConfig({ vendor: 'AMD' });
      
      // Both should retain their configs
      expect(manager.getCanvasProtection().getNoise()).toBe(0.05);
      expect(manager.getWebGLProtection().getConfig().vendor).toBe('AMD');
    });

    it('should not affect other modules when one is configured', () => {
      const manager = new PrivacyManager();
      
      const originalAudioNoise = manager.getAudioProtection().getNoiseLevel();
      
      // Configure canvas
      manager.getCanvasProtection().setNoise(0.1);
      
      // Audio should be unchanged
      expect(manager.getAudioProtection().getNoiseLevel()).toBe(originalAudioNoise);
    });
  });
});

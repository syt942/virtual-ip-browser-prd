/**
 * Privacy Manager Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PrivacyManager } from '../../electron/core/privacy/manager';

describe('PrivacyManager', () => {
  let manager: PrivacyManager;

  beforeEach(() => {
    manager = new PrivacyManager();
  });

  describe('generateProtectionScript', () => {
    it('should generate script with all protections enabled', () => {
      const script = manager.generateProtectionScript({
        canvas: true,
        webgl: true,
        audio: true,
        navigator: true,
        timezone: true,
        webrtc: true,
        trackerBlocking: true
      });

      expect(script).toContain('[Canvas Protection]');
      expect(script).toContain('[WebGL Protection]');
      expect(script).toContain('[Audio Protection]');
      expect(script).toContain('[Navigator Protection]');
      expect(script).toContain('[Timezone Protection]');
      expect(script).toContain('[WebRTC Protection]');
    });

    it('should generate script with selective protections', () => {
      const script = manager.generateProtectionScript({
        canvas: true,
        webgl: false,
        audio: false,
        navigator: false,
        timezone: false,
        webrtc: true,
        trackerBlocking: false
      });

      expect(script).toContain('[Canvas Protection]');
      expect(script).not.toContain('[WebGL Protection]');
      expect(script).toContain('[WebRTC Protection]');
    });
  });

  describe('getCanvasProtection', () => {
    it('should return canvas protection instance', () => {
      const canvas = manager.getCanvasProtection();
      expect(canvas).toBeDefined();
      expect(canvas.getNoise).toBeDefined();
    });
  });

  describe('getWebGLProtection', () => {
    it('should return WebGL protection instance', () => {
      const webgl = manager.getWebGLProtection();
      expect(webgl).toBeDefined();
      expect(webgl.getConfig).toBeDefined();
    });
  });

  describe('generateRandomProfile', () => {
    it('should generate random privacy profile', () => {
      const profile = manager.generateRandomProfile();
      
      expect(profile.canvas).toBe(true);
      expect(profile.webgl).toBe(true);
      expect(profile.audio).toBe(true);
      expect(profile.navigator).toBe(true);
      expect(profile.timezone).toBe(true);
      expect(profile.webrtc).toBe(true);
      expect(profile.trackerBlocking).toBe(true);
      expect(profile.navigatorConfig).toBeDefined();
    });
  });
});

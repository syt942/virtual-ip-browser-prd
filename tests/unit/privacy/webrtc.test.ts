/**
 * WebRTC Leak Prevention Tests
 * PRD Section 6.2 - P1 Privacy Protection Requirements
 * 
 * Tests for WebRTC API blocking and IP leak prevention
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WebRTCProtection } from '../../../electron/core/privacy/webrtc';

describe('WebRTCProtection', () => {
  let protection: WebRTCProtection;

  beforeEach(() => {
    protection = new WebRTCProtection();
  });

  describe('Constructor and Configuration', () => {
    it('should default to blocking WebRTC', () => {
      expect(protection.isBlocked()).toBe(true);
    });

    it('should accept custom blocking configuration', () => {
      const customProtection = new WebRTCProtection(false);
      expect(customProtection.isBlocked()).toBe(false);
    });

    it('should allow toggling WebRTC blocking', () => {
      protection.setBlockWebRTC(false);
      expect(protection.isBlocked()).toBe(false);
      
      protection.setBlockWebRTC(true);
      expect(protection.isBlocked()).toBe(true);
    });
  });

  describe('Injection Script Generation', () => {
    it('should generate valid JavaScript injection script', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toBeDefined();
      expect(typeof script).toBe('string');
      expect(script.length).toBeGreaterThan(0);
    });

    it('should include IIFE wrapper for isolation', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('(function()');
      expect(script).toContain('use strict');
      expect(script).toContain('})()');
    });

    it('should return early when blocking is disabled', () => {
      const customProtection = new WebRTCProtection(false);
      const script = customProtection.generateInjectionScript();
      
      expect(script).toContain('if (!blockWebRTC) return');
    });
  });

  describe('RTCPeerConnection Blocking', () => {
    it('should include RTCPeerConnection override', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('window.RTCPeerConnection');
      expect(script).toContain('throw new Error');
    });

    it('should include webkitRTCPeerConnection override', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('window.webkitRTCPeerConnection');
    });

    it('should include mozRTCPeerConnection override', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('window.mozRTCPeerConnection');
    });

    it('should block RTCDataChannel', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('RTCDataChannel');
      expect(script).toContain('undefined');
    });
  });

  describe('getUserMedia Blocking', () => {
    it('should block navigator.mediaDevices.getUserMedia', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('navigator.mediaDevices');
      expect(script).toContain('getUserMedia');
      expect(script).toContain('Promise.reject');
    });

    it('should block legacy navigator.getUserMedia', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('navigator.getUserMedia');
    });

    it('should provide meaningful error message for blocked getUserMedia', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('WebRTC is disabled for privacy protection');
    });
  });

  describe('enumerateDevices Blocking', () => {
    it('should override enumerateDevices to return empty array', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('enumerateDevices');
      expect(script).toContain('Promise.resolve([])');
    });
  });

  describe('IP Leak Prevention via STUN/TURN', () => {
    it('should prevent STUN requests by blocking RTCPeerConnection', () => {
      const script = protection.generateInjectionScript();
      
      // RTCPeerConnection is the entry point for STUN/TURN
      // Blocking it prevents any ICE candidate gathering
      expect(script).toContain('RTCPeerConnection');
      expect(script).toContain('throw new Error');
    });

    it('should not allow ICE candidate gathering', () => {
      // When RTCPeerConnection throws, no ICE candidates can be gathered
      const script = protection.generateInjectionScript();
      
      // The constructor throws, so createOffer/createAnswer/addIceCandidate
      // can never be called
      expect(script).toContain('window.RTCPeerConnection = function()');
      expect(script).toContain('throw new Error');
    });
  });

  describe('Logging and Debugging', () => {
    it('should include console log for debugging', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('console.log');
      expect(script).toContain('[WebRTC Protection]');
    });
  });

  describe('Script Execution Simulation', () => {
    let mockWindow: any;
    let mockNavigator: any;

    beforeEach(() => {
      // Setup mock browser environment
      mockNavigator = {
        mediaDevices: {
          getUserMedia: vi.fn().mockResolvedValue({}),
          enumerateDevices: vi.fn().mockResolvedValue([{ deviceId: 'test' }])
        },
        getUserMedia: vi.fn()
      };

      mockWindow = {
        RTCPeerConnection: vi.fn(),
        webkitRTCPeerConnection: vi.fn(),
        mozRTCPeerConnection: vi.fn(),
        RTCDataChannel: vi.fn()
      };
    });

    it('should generate script that can be evaluated', () => {
      const script = protection.generateInjectionScript();
      
      // Script should be valid JavaScript (no syntax errors)
      expect(() => {
        // Check syntax by attempting to parse as function body
        new Function(script);
      }).not.toThrow();
    });

    it('should include proper conditional checks', () => {
      const script = protection.generateInjectionScript();
      
      // Should check for existence before overriding
      expect(script).toContain('if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia)');
      expect(script).toContain('if (window.RTCPeerConnection)');
    });
  });

  describe('Multiple Instance Isolation', () => {
    it('should allow independent configuration per instance', () => {
      const protection1 = new WebRTCProtection(true);
      const protection2 = new WebRTCProtection(false);

      expect(protection1.isBlocked()).toBe(true);
      expect(protection2.isBlocked()).toBe(false);
    });

    it('should generate different scripts based on configuration', () => {
      const protectionEnabled = new WebRTCProtection(true);
      const protectionDisabled = new WebRTCProtection(false);

      const scriptEnabled = protectionEnabled.generateInjectionScript();
      const scriptDisabled = protectionDisabled.generateInjectionScript();

      expect(scriptEnabled).toContain('const blockWebRTC = true');
      expect(scriptDisabled).toContain('const blockWebRTC = false');
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid enable/disable toggling', () => {
      for (let i = 0; i < 100; i++) {
        protection.setBlockWebRTC(i % 2 === 0);
      }
      
      // Should end up disabled (99 is odd, so i % 2 === 1, setBlockWebRTC(false))
      expect(protection.isBlocked()).toBe(false);
    });

    it('should generate consistent script for same configuration', () => {
      const script1 = protection.generateInjectionScript();
      const script2 = protection.generateInjectionScript();

      expect(script1).toBe(script2);
    });
  });
});

describe('WebRTC Leak Prevention Integration', () => {
  describe('Complete API Surface Coverage', () => {
    it('should block all WebRTC-related APIs', () => {
      const protection = new WebRTCProtection(true);
      const script = protection.generateInjectionScript();

      const blockedAPIs = [
        'RTCPeerConnection',
        'webkitRTCPeerConnection',
        'mozRTCPeerConnection',
        'RTCDataChannel',
        'getUserMedia',
        'enumerateDevices'
      ];

      blockedAPIs.forEach(api => {
        expect(script).toContain(api);
      });
    });
  });

  describe('Error Message Consistency', () => {
    it('should use consistent error message across all blocked APIs', () => {
      const protection = new WebRTCProtection(true);
      const script = protection.generateInjectionScript();

      const errorMessage = 'WebRTC is disabled for privacy protection';
      const occurrences = (script.match(new RegExp(errorMessage, 'g')) || []).length;

      // Should appear in: getUserMedia (modern), getUserMedia (legacy), 
      // RTCPeerConnection, webkitRTCPeerConnection, mozRTCPeerConnection
      expect(occurrences).toBeGreaterThanOrEqual(5);
    });
  });
});

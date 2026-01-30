/**
 * Audio Context Fingerprint Protection Tests
 * PRD Section 6.2 - P1 Privacy Protection Requirements
 * 
 * Tests for AudioContext fingerprinting prevention
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AudioFingerprintProtection } from '../../../electron/core/privacy/fingerprint/audio';

describe('AudioFingerprintProtection', () => {
  let protection: AudioFingerprintProtection;

  beforeEach(() => {
    protection = new AudioFingerprintProtection();
  });

  describe('Constructor and Configuration', () => {
    it('should initialize with default noise level', () => {
      expect(protection.getNoiseLevel()).toBe(0.001);
    });

    it('should accept custom noise level', () => {
      const customProtection = new AudioFingerprintProtection(0.01);
      expect(customProtection.getNoiseLevel()).toBe(0.01);
    });
  });

  describe('Noise Level Management', () => {
    it('should allow setting noise level', () => {
      protection.setNoiseLevel(0.005);
      expect(protection.getNoiseLevel()).toBe(0.005);
    });

    it('should clamp noise level to minimum 0', () => {
      protection.setNoiseLevel(-0.5);
      expect(protection.getNoiseLevel()).toBe(0);
    });

    it('should clamp noise level to maximum 1', () => {
      protection.setNoiseLevel(2.0);
      expect(protection.getNoiseLevel()).toBe(1);
    });

    it('should accept boundary values', () => {
      protection.setNoiseLevel(0);
      expect(protection.getNoiseLevel()).toBe(0);
      
      protection.setNoiseLevel(1);
      expect(protection.getNoiseLevel()).toBe(1);
    });
  });

  describe('Injection Script Generation', () => {
    it('should generate valid JavaScript', () => {
      const script = protection.generateInjectionScript();
      
      expect(() => {
        new Function(script);
      }).not.toThrow();
    });

    it('should include IIFE wrapper', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('(function()');
      expect(script).toContain('use strict');
      expect(script).toContain('})()');
    });

    it('should embed noise level in script', () => {
      protection.setNoiseLevel(0.002);
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('const noiseLevel = 0.002');
    });
  });

  describe('AudioContext Detection', () => {
    it('should check for AudioContext availability', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('window.AudioContext');
      expect(script).toContain('window.webkitAudioContext');
    });

    it('should return early if AudioContext not available', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('if (!AudioContext) return');
    });
  });

  describe('AnalyserNode Methods', () => {
    describe('getFloatFrequencyData', () => {
      it('should override getFloatFrequencyData', () => {
        const script = protection.generateInjectionScript();
        
        expect(script).toContain('AnalyserNode.prototype.getFloatFrequencyData');
        expect(script).toContain('originalGetFloatFrequencyData');
      });

      it('should add noise to Float32Array', () => {
        const script = protection.generateInjectionScript();
        
        expect(script).toContain('addNoiseToFloat32Array(array)');
      });
    });

    describe('getByteFrequencyData', () => {
      it('should override getByteFrequencyData', () => {
        const script = protection.generateInjectionScript();
        
        expect(script).toContain('AnalyserNode.prototype.getByteFrequencyData');
        expect(script).toContain('originalGetByteFrequencyData');
      });

      it('should add noise to Uint8Array', () => {
        const script = protection.generateInjectionScript();
        
        expect(script).toContain('addNoiseToUint8Array(array)');
      });
    });

    describe('getFloatTimeDomainData', () => {
      it('should override getFloatTimeDomainData', () => {
        const script = protection.generateInjectionScript();
        
        expect(script).toContain('AnalyserNode.prototype.getFloatTimeDomainData');
        expect(script).toContain('originalGetFloatTimeDomainData');
      });
    });

    describe('getByteTimeDomainData', () => {
      it('should override getByteTimeDomainData', () => {
        const script = protection.generateInjectionScript();
        
        expect(script).toContain('AnalyserNode.prototype.getByteTimeDomainData');
        expect(script).toContain('originalGetByteTimeDomainData');
      });
    });
  });

  describe('Noise Functions', () => {
    it('should include Float32Array noise function', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('function addNoiseToFloat32Array(array)');
      expect(script).toContain('(Math.random() - 0.5) * noiseLevel');
    });

    it('should include Uint8Array noise function', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('function addNoiseToUint8Array(array)');
    });

    it('should clamp Uint8Array values to 0-255', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('Math.max(0, Math.min(255');
    });

    it('should iterate over entire array', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('for (let i = 0; i < array.length; i++)');
    });
  });

  describe('Sample Rate Spoofing', () => {
    it('should override sampleRate property', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('AudioContext.prototype');
      expect(script).toContain("'sampleRate'");
    });

    it('should return common sample rates', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('44100');
      expect(script).toContain('48000');
    });

    it('should randomly select sample rate', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('Math.floor(Math.random()');
      expect(script).toContain('rates[');
    });
  });

  describe('Logging', () => {
    it('should include debug logging', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('console.log');
      expect(script).toContain('[Audio Protection]');
    });
  });
});

describe('Audio Fingerprint Noise Algorithm', () => {
  describe('Float32Array Noise', () => {
    it('should use centered noise distribution', () => {
      const script = new AudioFingerprintProtection().generateInjectionScript();
      
      // (Math.random() - 0.5) centers noise around 0
      expect(script).toContain('Math.random() - 0.5');
    });

    it('should scale noise by noiseLevel', () => {
      const script = new AudioFingerprintProtection().generateInjectionScript();
      
      expect(script).toContain('* noiseLevel');
    });
  });

  describe('Uint8Array Noise', () => {
    it('should scale by 255 for byte values', () => {
      const script = new AudioFingerprintProtection().generateInjectionScript();
      
      expect(script).toContain('* noiseLevel * 255');
    });

    it('should floor noise value', () => {
      const script = new AudioFingerprintProtection().generateInjectionScript();
      
      expect(script).toContain('Math.floor(');
    });
  });
});

describe('Audio Anti-Detection Tests', () => {
  describe('Method Call Passthrough', () => {
    it('should call original methods before adding noise', () => {
      const script = new AudioFingerprintProtection().generateInjectionScript();
      
      expect(script).toContain('originalGetFloatFrequencyData.call(this, array)');
      expect(script).toContain('originalGetByteFrequencyData.call(this, array)');
      expect(script).toContain('originalGetFloatTimeDomainData.call(this, array)');
      expect(script).toContain('originalGetByteTimeDomainData.call(this, array)');
    });
  });

  describe('Sample Rate Variation', () => {
    it('should not always return same sample rate', () => {
      const script = new AudioFingerprintProtection().generateInjectionScript();
      
      // Uses random selection
      expect(script).toContain('rates[Math.floor(Math.random() * rates.length)]');
    });
  });
});

describe('Audio Configuration Consistency', () => {
  describe('Script Regeneration', () => {
    it('should generate consistent script for same noise level', () => {
      const protection = new AudioFingerprintProtection(0.001);
      const script1 = protection.generateInjectionScript();
      const script2 = protection.generateInjectionScript();
      
      expect(script1).toBe(script2);
    });

    it('should generate different scripts for different noise levels', () => {
      const protection1 = new AudioFingerprintProtection(0.001);
      const protection2 = new AudioFingerprintProtection(0.01);
      
      const script1 = protection1.generateInjectionScript();
      const script2 = protection2.generateInjectionScript();
      
      expect(script1).not.toBe(script2);
    });
  });
});

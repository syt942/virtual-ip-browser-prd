/**
 * Audio Fingerprint Protection
 * Adds noise to AudioContext to prevent fingerprinting
 */

export class AudioFingerprintProtection {
  private noiseLevel: number;

  constructor(noiseLevel: number = 0.001) {
    this.noiseLevel = noiseLevel;
  }

  /**
   * Generate injection script for audio protection
   */
  generateInjectionScript(): string {
    const noiseLevel = this.noiseLevel;
    
    return `
      (function() {
        'use strict';
        
        const noiseLevel = ${noiseLevel};
        
        // Store original methods
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        
        const originalCreateAnalyser = AudioContext.prototype.createAnalyser;
        const originalGetFloatFrequencyData = AnalyserNode.prototype.getFloatFrequencyData;
        const originalGetByteFrequencyData = AnalyserNode.prototype.getByteFrequencyData;
        const originalGetFloatTimeDomainData = AnalyserNode.prototype.getFloatTimeDomainData;
        const originalGetByteTimeDomainData = AnalyserNode.prototype.getByteTimeDomainData;
        
        // Add noise to data
        function addNoiseToFloat32Array(array) {
          for (let i = 0; i < array.length; i++) {
            const noise = (Math.random() - 0.5) * noiseLevel;
            array[i] = array[i] + noise;
          }
        }
        
        function addNoiseToUint8Array(array) {
          for (let i = 0; i < array.length; i++) {
            const noise = Math.floor((Math.random() - 0.5) * noiseLevel * 255);
            array[i] = Math.max(0, Math.min(255, array[i] + noise));
          }
        }
        
        // Override getFloatFrequencyData
        AnalyserNode.prototype.getFloatFrequencyData = function(array) {
          originalGetFloatFrequencyData.call(this, array);
          addNoiseToFloat32Array(array);
        };
        
        // Override getByteFrequencyData
        AnalyserNode.prototype.getByteFrequencyData = function(array) {
          originalGetByteFrequencyData.call(this, array);
          addNoiseToUint8Array(array);
        };
        
        // Override getFloatTimeDomainData
        AnalyserNode.prototype.getFloatTimeDomainData = function(array) {
          originalGetFloatTimeDomainData.call(this, array);
          addNoiseToFloat32Array(array);
        };
        
        // Override getByteTimeDomainData
        AnalyserNode.prototype.getByteTimeDomainData = function(array) {
          originalGetByteTimeDomainData.call(this, array);
          addNoiseToUint8Array(array);
        };
        
        // Also spoof AudioContext properties
        Object.defineProperty(AudioContext.prototype, 'sampleRate', {
          get: function() {
            // Return common sample rate with slight variation
            const rates = [44100, 48000];
            return rates[Math.floor(Math.random() * rates.length)];
          }
        });
        
        console.log('[Audio Protection] Audio fingerprinting protection enabled');
      })();
    `;
  }

  /**
   * Set noise level
   */
  setNoiseLevel(level: number): void {
    this.noiseLevel = Math.max(0, Math.min(1, level));
  }

  /**
   * Get current noise level
   */
  getNoiseLevel(): number {
    return this.noiseLevel;
  }
}

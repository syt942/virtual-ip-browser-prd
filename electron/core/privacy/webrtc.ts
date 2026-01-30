/**
 * WebRTC Leak Prevention
 * Blocks WebRTC to prevent IP address leaks
 */

export class WebRTCProtection {
  private blockWebRTC: boolean;

  constructor(blockWebRTC: boolean = true) {
    this.blockWebRTC = blockWebRTC;
  }

  /**
   * Generate injection script for WebRTC protection
   */
  generateInjectionScript(): string {
    const blockWebRTC = this.blockWebRTC;
    
    return `
      (function() {
        'use strict';
        
        const blockWebRTC = ${blockWebRTC};
        
        if (!blockWebRTC) return;
        
        // Disable getUserMedia
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          navigator.mediaDevices.getUserMedia = function() {
            return Promise.reject(new Error('WebRTC is disabled for privacy protection'));
          };
        }
        
        // Disable legacy getUserMedia
        if (navigator.getUserMedia) {
          navigator.getUserMedia = function(constraints, success, error) {
            if (error) {
              error(new Error('WebRTC is disabled for privacy protection'));
            }
          };
        }
        
        // Disable RTCPeerConnection
        if (window.RTCPeerConnection) {
          window.RTCPeerConnection = function() {
            throw new Error('WebRTC is disabled for privacy protection');
          };
        }
        
        if (window.webkitRTCPeerConnection) {
          window.webkitRTCPeerConnection = function() {
            throw new Error('WebRTC is disabled for privacy protection');
          };
        }
        
        if (window.mozRTCPeerConnection) {
          window.mozRTCPeerConnection = function() {
            throw new Error('WebRTC is disabled for privacy protection');
          };
        }
        
        // Disable RTCDataChannel
        if (window.RTCDataChannel) {
          window.RTCDataChannel = undefined;
        }
        
        // Disable enumerateDevices
        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
          navigator.mediaDevices.enumerateDevices = function() {
            return Promise.resolve([]);
          };
        }
        
        console.log('[WebRTC Protection] WebRTC has been disabled for privacy');
      })();
    `;
  }

  /**
   * Enable or disable WebRTC blocking
   */
  setBlockWebRTC(block: boolean): void {
    this.blockWebRTC = block;
  }

  /**
   * Get current WebRTC blocking status
   */
  isBlocked(): boolean {
    return this.blockWebRTC;
  }
}

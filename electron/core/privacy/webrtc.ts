/**
 * WebRTC Leak Prevention - COMPREHENSIVE VERSION
 * Blocks all WebRTC IP leak vectors
 * 
 * SECURITY FIX: Complete API blocking including:
 * - RTCPeerConnection (all variants)
 * - RTCSessionDescription
 * - RTCIceCandidate
 * - RTCDataChannel
 * - RTCRtpReceiver/Sender/Transceiver
 * - getUserMedia (all variants)
 * - getDisplayMedia
 * - enumerateDevices
 * - ICE candidate filtering
 * - SDP sanitization
 */

export interface WebRTCProtectionConfig {
  /** Block all WebRTC (most secure) */
  blockAll?: boolean;
  /** Allow WebRTC but filter IPs */
  filterIPs?: boolean;
  /** Allowed ICE candidate types when filtering */
  allowedCandidateTypes?: ('host' | 'srflx' | 'prflx' | 'relay')[];
  /** Replace IPs with proxy IP */
  proxyIP?: string;
}

const DEFAULT_CONFIG: WebRTCProtectionConfig = {
  blockAll: true,
  filterIPs: false,
  allowedCandidateTypes: [],
};

export class WebRTCProtection {
  private config: WebRTCProtectionConfig;

  constructor(blockWebRTC: boolean = true) {
    this.config = {
      ...DEFAULT_CONFIG,
      blockAll: blockWebRTC,
    };
  }

  /**
   * Configure protection mode
   */
  configure(config: Partial<WebRTCProtectionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Generate comprehensive injection script for WebRTC protection
   */
  generateInjectionScript(): string {
    const config = JSON.stringify(this.config);
    
    return `
      (function() {
        'use strict';
        
        const config = ${config};
        
        if (!config.blockAll && !config.filterIPs) return;
        
        // Store original constructors
        const OriginalRTCPeerConnection = window.RTCPeerConnection;
        const OriginalRTCSessionDescription = window.RTCSessionDescription;
        const OriginalRTCIceCandidate = window.RTCIceCandidate;

        // ============================================================
        // COMPLETE BLOCK MODE
        // ============================================================
        
        if (config.blockAll) {
          // Block RTCPeerConnection (all variants)
          const blockPeerConnection = function() {
            throw new DOMException(
              'WebRTC is disabled for privacy protection',
              'NotSupportedError'
            );
          };
          
          window.RTCPeerConnection = blockPeerConnection;
          window.webkitRTCPeerConnection = blockPeerConnection;
          window.mozRTCPeerConnection = blockPeerConnection;
          
          // Block RTCSessionDescription
          window.RTCSessionDescription = function() {
            throw new DOMException(
              'WebRTC is disabled for privacy protection',
              'NotSupportedError'
            );
          };
          
          // Block RTCIceCandidate
          window.RTCIceCandidate = function() {
            throw new DOMException(
              'WebRTC is disabled for privacy protection',
              'NotSupportedError'
            );
          };
          
          // Block RTCDataChannel
          if (window.RTCDataChannel) {
            Object.defineProperty(window, 'RTCDataChannel', {
              get: () => undefined,
              configurable: false
            });
          }
          
          // Block RTCRtpReceiver
          if (window.RTCRtpReceiver) {
            Object.defineProperty(window, 'RTCRtpReceiver', {
              get: () => undefined,
              configurable: false
            });
          }
          
          // Block RTCRtpSender
          if (window.RTCRtpSender) {
            Object.defineProperty(window, 'RTCRtpSender', {
              get: () => undefined,
              configurable: false
            });
          }
          
          // Block RTCRtpTransceiver
          if (window.RTCRtpTransceiver) {
            Object.defineProperty(window, 'RTCRtpTransceiver', {
              get: () => undefined,
              configurable: false
            });
          }
          
          // Block getUserMedia (all variants)
          if (navigator.mediaDevices) {
            navigator.mediaDevices.getUserMedia = function() {
              return Promise.reject(new DOMException(
                'WebRTC is disabled for privacy protection',
                'NotAllowedError'
              ));
            };
            
            // Block getDisplayMedia
            if (navigator.mediaDevices.getDisplayMedia) {
              navigator.mediaDevices.getDisplayMedia = function() {
                return Promise.reject(new DOMException(
                  'Screen sharing is disabled for privacy protection',
                  'NotAllowedError'
                ));
              };
            }
          }
          
          // Block legacy getUserMedia
          if (navigator.getUserMedia) {
            navigator.getUserMedia = function(constraints, success, error) {
              if (error) {
                error(new DOMException(
                  'WebRTC is disabled for privacy protection',
                  'NotAllowedError'
                ));
              }
            };
          }
          
          // Block webkitGetUserMedia
          if (navigator.webkitGetUserMedia) {
            navigator.webkitGetUserMedia = navigator.getUserMedia;
          }
          
          // Block mozGetUserMedia
          if (navigator.mozGetUserMedia) {
            navigator.mozGetUserMedia = navigator.getUserMedia;
          }
          
          // Block enumerateDevices
          if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
            navigator.mediaDevices.enumerateDevices = function() {
              return Promise.resolve([]);
            };
          }
          
          // Block getSupportedConstraints
          if (navigator.mediaDevices && navigator.mediaDevices.getSupportedConstraints) {
            navigator.mediaDevices.getSupportedConstraints = function() {
              return {};
            };
          }
          
          console.log('[WebRTC Protection] WebRTC completely blocked');
          return;
        }
        
        // ============================================================
        // IP FILTERING MODE (Allow WebRTC but filter IPs)
        // ============================================================
        
        if (config.filterIPs && OriginalRTCPeerConnection) {
          
          // IP regex patterns
          const ipv4Regex = /([0-9]{1,3}(\\.[0-9]{1,3}){3})/g;
          const ipv6Regex = /([a-fA-F0-9]{1,4}(:[a-fA-F0-9]{1,4}){7})/g;
          
          // Check if IP is private/local
          function isPrivateIP(ip) {
            const parts = ip.split('.').map(Number);
            if (parts.length !== 4) return false;
            
            // 10.x.x.x
            if (parts[0] === 10) return true;
            // 172.16-31.x.x
            if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
            // 192.168.x.x
            if (parts[0] === 192 && parts[1] === 168) return true;
            // 127.x.x.x (loopback)
            if (parts[0] === 127) return true;
            // 169.254.x.x (link-local)
            if (parts[0] === 169 && parts[1] === 254) return true;
            
            return false;
          }
          
          // Sanitize SDP to remove/replace IP addresses
          function sanitizeSDP(sdp) {
            if (!sdp) return sdp;
            
            let sanitized = sdp;
            
            // Replace IPv4 addresses
            sanitized = sanitized.replace(ipv4Regex, (match) => {
              if (isPrivateIP(match)) {
                return config.proxyIP || '0.0.0.0';
              }
              return match;
            });
            
            // Remove IPv6 addresses entirely (often local)
            sanitized = sanitized.replace(ipv6Regex, '::');
            
            return sanitized;
          }
          
          // Filter ICE candidate
          function filterCandidate(candidate) {
            if (!candidate || !candidate.candidate) return null;
            
            const candidateStr = candidate.candidate;
            
            // Parse candidate type
            const typeMatch = candidateStr.match(/typ (host|srflx|prflx|relay)/);
            if (!typeMatch) return candidate;
            
            const type = typeMatch[1];
            
            // Check if type is allowed
            if (!config.allowedCandidateTypes.includes(type)) {
              console.log('[WebRTC Protection] Filtered candidate type:', type);
              return null;
            }
            
            // For allowed candidates, still filter IPs
            const filteredCandidate = candidateStr.replace(ipv4Regex, (match) => {
              if (isPrivateIP(match)) {
                return config.proxyIP || '0.0.0.0';
              }
              return match;
            });
            
            return new OriginalRTCIceCandidate({
              ...candidate,
              candidate: filteredCandidate
            });
          }
          
          // Wrap RTCPeerConnection
          window.RTCPeerConnection = function(configuration, constraints) {
            // Filter ICE servers to prevent STUN/TURN leaks
            if (configuration && configuration.iceServers) {
              // Remove STUN servers that could leak IP
              configuration.iceServers = configuration.iceServers.filter(server => {
                const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
                // Only keep TURN servers (they proxy traffic)
                return urls.some(url => url && url.startsWith('turn:'));
              });
            }
            
            const pc = new OriginalRTCPeerConnection(configuration, constraints);
            
            // Wrap onicecandidate
            let userOnIceCandidate = null;
            
            Object.defineProperty(pc, 'onicecandidate', {
              get: () => userOnIceCandidate,
              set: (handler) => {
                userOnIceCandidate = handler;
                pc.addEventListener('icecandidate', (event) => {
                  if (event.candidate) {
                    const filtered = filterCandidate(event.candidate);
                    if (filtered && handler) {
                      handler({ candidate: filtered });
                    }
                    // If filtered is null, don't call handler (block candidate)
                  } else if (handler) {
                    handler(event); // null candidate signals end of gathering
                  }
                });
              }
            });
            
            // Wrap createOffer
            const originalCreateOffer = pc.createOffer.bind(pc);
            pc.createOffer = async function(options) {
              const offer = await originalCreateOffer(options);
              offer.sdp = sanitizeSDP(offer.sdp);
              return offer;
            };
            
            // Wrap createAnswer
            const originalCreateAnswer = pc.createAnswer.bind(pc);
            pc.createAnswer = async function(options) {
              const answer = await originalCreateAnswer(options);
              answer.sdp = sanitizeSDP(answer.sdp);
              return answer;
            };
            
            // Wrap setLocalDescription
            const originalSetLocalDescription = pc.setLocalDescription.bind(pc);
            pc.setLocalDescription = async function(description) {
              if (description && description.sdp) {
                description.sdp = sanitizeSDP(description.sdp);
              }
              return originalSetLocalDescription(description);
            };
            
            // Wrap getStats to prevent IP leaks
            const originalGetStats = pc.getStats.bind(pc);
            pc.getStats = async function(selector) {
              const stats = await originalGetStats(selector);
              
              // Filter stats to remove IP information
              const filteredStats = new Map();
              stats.forEach((value, key) => {
                const filtered = { ...value };
                
                // Remove IP-related fields
                delete filtered.ip;
                delete filtered.address;
                delete filtered.candidateType;
                delete filtered.relatedAddress;
                delete filtered.relatedPort;
                
                filteredStats.set(key, filtered);
              });
              
              return filteredStats;
            };
            
            return pc;
          };
          
          // Copy static properties
          Object.setPrototypeOf(window.RTCPeerConnection, OriginalRTCPeerConnection);
          window.RTCPeerConnection.prototype = OriginalRTCPeerConnection.prototype;
          
          console.log('[WebRTC Protection] IP filtering enabled');
        }
      })();
    `;
  }

  /**
   * Enable or disable WebRTC blocking
   */
  setBlockWebRTC(block: boolean): void {
    this.config.blockAll = block;
  }

  /**
   * Get current WebRTC blocking status
   */
  isBlocked(): boolean {
    return this.config.blockAll ?? true;
  }

  /**
   * Get current configuration
   */
  getConfig(): WebRTCProtectionConfig {
    return { ...this.config };
  }
}

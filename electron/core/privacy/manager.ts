/**
 * Privacy Manager
 * Central manager for all privacy protection features
 */

import { EventEmitter } from 'events';
import { CanvasFingerprintProtection } from './fingerprint/canvas';
import { WebGLFingerprintProtection } from './fingerprint/webgl';
import { AudioFingerprintProtection } from './fingerprint/audio';
import { NavigatorFingerprintProtection, type NavigatorSpoofConfig } from './fingerprint/navigator';
import { TimezoneFingerprintProtection } from './fingerprint/timezone';
import { WebRTCProtection } from './webrtc';
import { TrackerBlocker } from './tracker-blocker';

export interface PrivacyConfig {
  canvas: boolean;
  webgl: boolean;
  audio: boolean;
  navigator: boolean;
  timezone: boolean;
  webrtc: boolean;
  trackerBlocking: boolean;
  navigatorConfig?: NavigatorSpoofConfig;
  timezoneRegion?: string;
}

export class PrivacyManager extends EventEmitter {
  private canvasProtection: CanvasFingerprintProtection;
  private webglProtection: WebGLFingerprintProtection;
  private audioProtection: AudioFingerprintProtection;
  private navigatorProtection: NavigatorFingerprintProtection;
  private timezoneProtection: TimezoneFingerprintProtection;
  private webrtcProtection: WebRTCProtection;
  private trackerBlocker: TrackerBlocker;

  constructor() {
    super();
    this.canvasProtection = new CanvasFingerprintProtection();
    this.webglProtection = new WebGLFingerprintProtection();
    this.audioProtection = new AudioFingerprintProtection();
    this.navigatorProtection = new NavigatorFingerprintProtection();
    this.timezoneProtection = new TimezoneFingerprintProtection();
    this.webrtcProtection = new WebRTCProtection();
    this.trackerBlocker = new TrackerBlocker();
  }

  /**
   * Generate complete protection script
   */
  generateProtectionScript(config: PrivacyConfig): string {
    const scripts: string[] = [];

    if (config.canvas) {
      scripts.push(this.canvasProtection.generateInjectionScript());
    }

    if (config.webgl) {
      scripts.push(this.webglProtection.generateInjectionScript());
    }

    if (config.audio) {
      scripts.push(this.audioProtection.generateInjectionScript());
    }

    if (config.navigator) {
      // Apply custom navigator config if provided
      if (config.navigatorConfig) {
        this.navigatorProtection.setConfig(config.navigatorConfig);
      }
      scripts.push(this.navigatorProtection.generateInjectionScript());
    }

    if (config.timezone) {
      // Set timezone based on region if provided
      if (config.timezoneRegion) {
        const tz = TimezoneFingerprintProtection.getTimezoneForRegion(config.timezoneRegion);
        this.timezoneProtection.setTimezone(tz.timezone, tz.offset);
      }
      scripts.push(this.timezoneProtection.generateInjectionScript());
    }

    if (config.webrtc) {
      scripts.push(this.webrtcProtection.generateInjectionScript());
    }

    return scripts.join('\n\n');
  }

  /**
   * Apply privacy protection to a session
   */
  applyToSession(sessionPartition: string, config: PrivacyConfig): void {
    // Enable tracker blocking
    if (config.trackerBlocking) {
      this.trackerBlocker.enableForSession(sessionPartition);
    }

    this.emit('privacy:applied', { sessionPartition, config });
  }

  /**
   * Get canvas protection instance
   */
  getCanvasProtection(): CanvasFingerprintProtection {
    return this.canvasProtection;
  }

  /**
   * Get WebGL protection instance
   */
  getWebGLProtection(): WebGLFingerprintProtection {
    return this.webglProtection;
  }

  /**
   * Get audio protection instance
   */
  getAudioProtection(): AudioFingerprintProtection {
    return this.audioProtection;
  }

  /**
   * Get navigator protection instance
   */
  getNavigatorProtection(): NavigatorFingerprintProtection {
    return this.navigatorProtection;
  }

  /**
   * Get timezone protection instance
   */
  getTimezoneProtection(): TimezoneFingerprintProtection {
    return this.timezoneProtection;
  }

  /**
   * Get WebRTC protection instance
   */
  getWebRTCProtection(): WebRTCProtection {
    return this.webrtcProtection;
  }

  /**
   * Get tracker blocker instance
   */
  getTrackerBlocker(): TrackerBlocker {
    return this.trackerBlocker;
  }

  /**
   * Generate random privacy profile
   */
  generateRandomProfile(): PrivacyConfig {
    const platforms: Array<'windows' | 'mac' | 'linux'> = ['windows', 'mac', 'linux'];
    const platform = platforms[Math.floor(Math.random() * platforms.length)];
    
    const navigatorConfig = NavigatorFingerprintProtection.generateRealisticConfig(platform);
    const webglConfig = WebGLFingerprintProtection.generateRandomConfig();
    
    this.navigatorProtection.setConfig(navigatorConfig);
    this.webglProtection.setConfig(webglConfig);

    return {
      canvas: true,
      webgl: true,
      audio: true,
      navigator: true,
      timezone: true,
      webrtc: true,
      trackerBlocking: true,
      navigatorConfig
    };
  }
}

/**
 * Privacy IPC Handlers
 * With Zod validation and rate limiting
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../channels';
import type { PrivacyManager } from '../../core/privacy/manager';
import { 
  FingerprintConfigSchema, 
  WebRTCToggleSchema,
  TrackerBlockingToggleSchema,
  validateInput 
} from '../validation';
import { getIPCRateLimiter } from '../rate-limiter';

export function setupPrivacyHandlers(privacyManager: PrivacyManager) {
  const rateLimiter = getIPCRateLimiter();

  // Set fingerprint configuration
  ipcMain.handle(IPC_CHANNELS.PRIVACY_SET_FINGERPRINT, async (_event, config) => {
    // Rate limiting
    const rateCheck = rateLimiter.checkLimit(IPC_CHANNELS.PRIVACY_SET_FINGERPRINT);
    if (!rateCheck.allowed) {
      return { success: false, error: 'Rate limit exceeded', retryAfter: rateCheck.retryAfter };
    }

    // Validation
    const validation = validateInput(FingerprintConfigSchema, config);
    if (!validation.success) {
      return { success: false, error: `Validation failed: ${validation.error}` };
    }

    try {
      // Convert schema data to PrivacyConfig format
      const privacyConfig = {
        canvas: validation.data.canvas,
        webgl: validation.data.webgl,
        audio: validation.data.audio,
        navigator: validation.data.navigator,
        timezone: true, // Enable timezone protection
        webrtc: validation.data.webrtc,
        trackerBlocking: validation.data.trackerBlocking,
        timezoneRegion: validation.data.timezone,
        navigatorConfig: {
          userAgent: validation.data.userAgent,
          platform: validation.data.platform,
          hardwareConcurrency: validation.data.hardwareConcurrency,
          deviceMemory: validation.data.deviceMemory,
          language: validation.data.language,
          screen: validation.data.screen
        }
      };
      const script = privacyManager.generateProtectionScript(privacyConfig);
      return { success: true, script };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to set fingerprint config';
      console.error('[IPC:privacy:setFingerprint] Error:', errorMessage);
      return { success: false, error: errorMessage };
    }
  });

  // Toggle WebRTC
  ipcMain.handle(IPC_CHANNELS.PRIVACY_TOGGLE_WEBRTC, async (_event, enabled: boolean) => {
    // Rate limiting
    const rateCheck = rateLimiter.checkLimit(IPC_CHANNELS.PRIVACY_TOGGLE_WEBRTC);
    if (!rateCheck.allowed) {
      return { success: false, error: 'Rate limit exceeded', retryAfter: rateCheck.retryAfter };
    }

    // Validation
    const validation = validateInput(WebRTCToggleSchema, enabled);
    if (!validation.success) {
      return { success: false, error: `Validation failed: ${validation.error}` };
    }

    try {
      const webrtc = privacyManager.getWebRTCProtection();
      webrtc.setBlockWebRTC(validation.data);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to toggle WebRTC';
      console.error('[IPC:privacy:toggleWebRTC] Error:', errorMessage, { enabled: validation.data });
      return { success: false, error: errorMessage };
    }
  });

  // Toggle tracker blocking
  ipcMain.handle(IPC_CHANNELS.PRIVACY_TOGGLE_TRACKER_BLOCKING, async (_event, enabled: boolean) => {
    // Rate limiting
    const rateCheck = rateLimiter.checkLimit(IPC_CHANNELS.PRIVACY_TOGGLE_TRACKER_BLOCKING);
    if (!rateCheck.allowed) {
      return { success: false, error: 'Rate limit exceeded', retryAfter: rateCheck.retryAfter };
    }

    // Validation
    const validation = validateInput(TrackerBlockingToggleSchema, enabled);
    if (!validation.success) {
      return { success: false, error: `Validation failed: ${validation.error}` };
    }

    try {
      const blocker = privacyManager.getTrackerBlocker();
      blocker.setEnabled(validation.data);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to toggle tracker blocking';
      console.error('[IPC:privacy:toggleTrackerBlocking] Error:', errorMessage, { enabled: validation.data });
      return { success: false, error: errorMessage };
    }
  });

  console.log('[Privacy Handlers] Registered with validation and rate limiting');
}

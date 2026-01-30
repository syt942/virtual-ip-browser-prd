/**
 * Electron Types Module
 * Central export point for all electron-related types
 * @module electron/types
 */

// CAPTCHA Detection Types
export type {
  CaptchaType,
  CaptchaSeverity,
  CaptchaStatus,
  DetectionMethod,
  CaptchaDetectionResult,
  CaptchaMetadata,
  CaptchaEvent,
  CaptchaAction,
  CaptchaDetectionStrategy,
  CaptchaPattern,
  CaptchaDetectorConfig,
  CaptchaAlertConfig,
  CaptchaStats,
  CaptchaDetectionCallback,
  CaptchaScanOptions
} from './captcha';

export { DEFAULT_CAPTCHA_CONFIG } from './captcha';

/**
 * CAPTCHA Detection Types
 * TypeScript type definitions for captcha detection system
 * @module electron/types/captcha
 */

/**
 * Supported captcha provider types
 */
export type CaptchaType = 
  | 'recaptcha-v2'
  | 'recaptcha-v3'
  | 'hcaptcha'
  | 'cloudflare-turnstile'
  | 'image-captcha'
  | 'text-captcha'
  | 'slider-captcha'
  | 'unknown';

/**
 * Severity level of captcha detection
 */
export type CaptchaSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Status of captcha detection
 */
export type CaptchaStatus = 
  | 'detected'
  | 'solving'
  | 'solved'
  | 'failed'
  | 'timeout'
  | 'bypassed';

/**
 * Detection method used to identify the captcha
 */
export type DetectionMethod = 
  | 'iframe-src'
  | 'class-name'
  | 'element-id'
  | 'script-src'
  | 'dom-structure'
  | 'url-pattern'
  | 'text-content';

/**
 * Result of a captcha detection scan
 */
export interface CaptchaDetectionResult {
  /** Whether a captcha was detected */
  detected: boolean;
  /** Type of captcha detected */
  type: CaptchaType;
  /** Confidence score (0-1) */
  confidence: number;
  /** Detection method used */
  method: DetectionMethod;
  /** CSS selector of the detected element */
  selector?: string;
  /** URL where captcha was detected */
  url: string;
  /** Timestamp of detection */
  timestamp: Date;
  /** Additional metadata about the detection */
  metadata?: CaptchaMetadata;
}

/**
 * Additional metadata about detected captcha
 */
export interface CaptchaMetadata {
  /** Site key for reCAPTCHA/hCaptcha */
  siteKey?: string;
  /** Whether captcha is visible or invisible */
  isInvisible?: boolean;
  /** Element dimensions */
  dimensions?: {
    width: number;
    height: number;
  };
  /** Parent container info */
  parentSelector?: string;
  /** Challenge type for image captchas */
  challengeType?: string;
}

/**
 * Captcha detection event emitted when captcha is found
 */
export interface CaptchaEvent {
  /** Event type */
  type: 'captcha:detected' | 'captcha:resolved' | 'captcha:failed' | 'captcha:timeout';
  /** Detection result */
  result: CaptchaDetectionResult;
  /** Tab ID where captcha was detected */
  tabId: string;
  /** Session ID */
  sessionId?: string;
  /** Action taken */
  action: CaptchaAction;
}

/**
 * Action to take when captcha is detected
 */
export type CaptchaAction = 
  | 'pause'
  | 'alert'
  | 'skip'
  | 'retry'
  | 'manual'
  | 'abort';

/**
 * Configuration for captcha detection strategies
 */
export interface CaptchaDetectionStrategy {
  /** Unique identifier for the strategy */
  id: string;
  /** Human-readable name */
  name: string;
  /** Captcha type this strategy detects */
  type: CaptchaType;
  /** Whether strategy is enabled */
  enabled: boolean;
  /** Priority (higher = checked first) */
  priority: number;
  /** Detection patterns */
  patterns: CaptchaPattern[];
}

/**
 * Pattern definition for detecting specific captcha types
 */
export interface CaptchaPattern {
  /** Pattern type */
  type: 'selector' | 'url' | 'script' | 'text' | 'attribute';
  /** Pattern value (CSS selector, regex, etc.) */
  value: string;
  /** Whether pattern is a regex */
  isRegex: boolean;
  /** Confidence score if pattern matches (0-1) */
  confidence: number;
  /** Optional attribute name for attribute type */
  attribute?: string;
}

/**
 * Configuration for the captcha detector
 */
export interface CaptchaDetectorConfig {
  /** Whether detection is enabled */
  enabled: boolean;
  /** Detection interval in milliseconds */
  checkInterval: number;
  /** Default action when captcha detected */
  defaultAction: CaptchaAction;
  /** Maximum detection attempts before giving up */
  maxAttempts: number;
  /** Timeout for detection in milliseconds */
  timeout: number;
  /** Whether to log detections */
  logging: boolean;
  /** Custom strategies */
  strategies: CaptchaDetectionStrategy[];
  /** Alert configuration */
  alertConfig: CaptchaAlertConfig;
}

/**
 * Alert configuration for captcha detection
 */
export interface CaptchaAlertConfig {
  /** Enable desktop notifications */
  desktopNotification: boolean;
  /** Enable sound alert */
  soundAlert: boolean;
  /** Enable in-app alert */
  inAppAlert: boolean;
  /** Minimum severity to trigger alert */
  minSeverity: CaptchaSeverity;
}

/**
 * Statistics for captcha detection
 */
export interface CaptchaStats {
  /** Total detections */
  totalDetections: number;
  /** Detections by type */
  byType: Record<CaptchaType, number>;
  /** Detections by domain */
  byDomain: Record<string, number>;
  /** Success rate for bypassing */
  bypassSuccessRate: number;
  /** Average detection time in ms */
  avgDetectionTime: number;
  /** Last detection timestamp */
  lastDetection?: Date;
}

/**
 * Captcha detection callback function type
 */
export type CaptchaDetectionCallback = (event: CaptchaEvent) => void | Promise<void>;

/**
 * Options for running a captcha scan
 */
export interface CaptchaScanOptions {
  /** Specific strategies to use */
  strategies?: string[];
  /** Whether to scan frames */
  includeFrames: boolean;
  /** Maximum depth for frame scanning */
  maxFrameDepth: number;
  /** Timeout for scan */
  timeout: number;
}

/**
 * Default captcha detector configuration
 */
export const DEFAULT_CAPTCHA_CONFIG: CaptchaDetectorConfig = {
  enabled: true,
  checkInterval: 2000,
  defaultAction: 'pause',
  maxAttempts: 3,
  timeout: 30000,
  logging: true,
  strategies: [],
  alertConfig: {
    desktopNotification: true,
    soundAlert: false,
    inAppAlert: true,
    minSeverity: 'medium'
  }
};

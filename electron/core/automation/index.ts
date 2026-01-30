/**
 * Automation Module Exports
 */

// Core automation
export { AutomationManager } from './manager';
export { TaskExecutor } from './executor';
export { TaskScheduler } from './scheduler';
export { SearchEngineAutomation } from './search-engine';
export type { TranslationConfig, TranslatedSearchResult } from './search-engine';

// Cron Parser
export { CronParser, cronParser, CRON_PRESETS, CronParseError } from './cron-parser';
export type { ParsedCronExpression, ParsedCron, CronField, CronValidationResult } from './cron-parser';

// CAPTCHA Detection
export { CaptchaDetector } from './captcha-detector';
export type {
  CaptchaType,
  CaptchaDetectionResult,
  CaptchaDetectorConfig,
  CaptchaDetectionStrategy,
  CaptchaPattern,
  CaptchaEvent,
  CaptchaAction,
  CaptchaStats,
  CaptchaScanOptions
} from './captcha-detector';

// Translation Module (EP-008)
export {
  Translator,
  LanguageDetector,
  TranslationCache
} from '../translation';

export type {
  TranslationResult,
  KeywordTranslationResult,
  SearchResultTranslation,
  TranslatableSearchResult,
  TranslateOptions,
  TranslatorConfig,
  DetectionResult,
  LanguageInfo,
  CacheEntry,
  CacheConfig,
  CacheStats
} from '../translation';

// Domain targeting system
export { DomainTargeting } from './domain-targeting';
export type { DomainFilter, DomainTargetingConfig } from './domain-targeting';

// Page interaction
export { PageInteraction } from './page-interaction';
export type { 
  Point, 
  MousePoint, 
  ScrollEvent, 
  Link, 
  PageInteractionConfig 
} from './page-interaction';

// Behavior simulation
export { BehaviorSimulator } from './behavior-simulator';
export type { 
  Action, 
  ActionType, 
  BehaviorConfig 
} from './behavior-simulator';

// Types
export type {
  SearchEngine,
  TaskStatus,
  ScheduleType,
  SearchTask,
  SearchResult,
  TargetDomain,
  SearchConfig,
  TaskSchedule,
  Creator,
  AutomationSession,
  SessionStatistics
} from './types';

// Creator Support Module (EP-007)
export {
  PlatformDetector,
  AdViewer,
  SupportTracker,
  CreatorSupportScheduler,
  PLATFORM_CONFIGS
} from '../creator-support';

export type {
  Platform,
  PlatformConfig,
  AdViewerConfig,
  AdDetectionResult,
  EngagementAction,
  AdMetrics,
  TrackedCreator,
  CreatorInput,
  SupportAnalytics,
  CreatorAnalytics,
  SupportScheduleType,
  SupportSchedule,
  SupportScheduleInput
} from '../creator-support';

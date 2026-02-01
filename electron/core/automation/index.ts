/**
 * Automation Module Exports
 */

// Core automation
export { AutomationManager } from './manager';
export { TaskExecutor } from './executor';
export { TaskScheduler } from './scheduler';
export { SearchEngineAutomation } from './search-engine';
export type { TranslationConfig, TranslatedSearchResult } from './search-engine';

// Keyword Queue (EP-004: Search Automation)
export { KeywordQueue } from './keyword-queue';
export type {
  QueuedKeyword,
  KeywordQueueConfig,
  KeywordQueueStats,
  BulkAddResult
} from './keyword-queue';

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

// Position tracking (EP-004: Search Automation)
export { PositionTracker, createPositionTracker } from './position-tracker';
export type {
  PositionRecord,
  PositionChange,
  PositionTrend,
  PositionTrackerConfig,
  PositionRecordInput,
  TrackedPair
} from './position-tracker';

// Self-Healing Engine (EP-006: Autonomous Execution)
export { SelfHealingEngine } from './self-healing-engine';
export type {
  ErrorContext,
  RecoveryAction,
  RecoveryResult,
  SelfHealingConfig,
  RecoveryStats,
  HealingEventType,
  HealingEventHandler
} from './self-healing-engine';

// Search Rate Limiter (P2 Security)
export { 
  SearchRateLimiter, 
  getSearchRateLimiter, 
  resetSearchRateLimiter 
} from './search-rate-limiter';
export type { 
  EngineRateLimitConfig, 
  RateLimitResult 
} from './search-rate-limiter';

// Resource Monitor (P2 Security)
export { ResourceMonitor } from './resource-monitor';
export type {
  ResourceMetrics,
  ResourceThresholds,
  ThrottleAction,
  ResourceEventType
} from './resource-monitor';

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

// Named constants for magic numbers
export * from './constants';

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

// Creator Support Statistics (EP-007)
export {
  CreatorSupportStats,
  creatorSupportStats
} from './creator-support-stats';

export type {
  SupportActivity,
  RecordActivityInput,
  CreatorStats,
  GlobalStats,
  PlatformStats,
  StatsFilter,
  StatsSummary,
  TimeReport,
  TimePeriod,
  ExportFormat,
  ExportedStats,
  Platform as StatsPlatform,
  ActivityType
} from './creator-support-stats';

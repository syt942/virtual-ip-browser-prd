/**
 * Creator Support Module Exports (EP-007)
 * Central export point for all creator support functionality
 */

// Platform Detection
export { PlatformDetector, PLATFORM_CONFIGS } from './platform-detection';
export type { Platform, PlatformConfig } from './platform-detection';

// Ad Viewer
export { AdViewer } from './ad-viewer';
export type { 
  AdViewerConfig, 
  AdDetectionResult, 
  EngagementAction, 
  AdMetrics 
} from './ad-viewer';

// Support Tracker
export { SupportTracker, CreatorSupportScheduler } from './support-tracker';
export type {
  TrackedCreator,
  CreatorInput,
  SupportAnalytics,
  CreatorAnalytics,
  SupportScheduleType,
  SupportSchedule,
  SupportScheduleInput
} from './support-tracker';

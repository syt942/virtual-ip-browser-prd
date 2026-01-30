/**
 * Support Tracker Module (EP-007)
 * Re-exports from split modules for backwards compatibility
 */

// Re-export from creator-tracker
export {
  CreatorTracker as SupportTracker,
  type TrackedCreator,
  type CreatorInput,
  type SupportAnalytics,
  type CreatorAnalytics
} from './creator-tracker';

// Re-export from creator-scheduler
export {
  CreatorSupportScheduler,
  type SupportSchedule,
  type SupportScheduleInput,
  type SupportScheduleType
} from './creator-scheduler';

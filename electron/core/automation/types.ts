/**
 * Automation Engine Types
 */

export type SearchEngine = 'google' | 'bing' | 'duckduckgo' | 'yahoo' | 'brave';
export type TaskStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
export type ScheduleType = 'one-time' | 'recurring' | 'continuous' | 'cron' | 'custom';

export interface SearchTask {
  id: string;
  sessionId: string;
  keyword: string;
  engine: SearchEngine;
  status: TaskStatus;
  proxyId?: string;
  tabId?: string;
  position?: number;
  results?: SearchResult[];
  error?: string;
  retryCount: number;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  createdAt: Date;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  position: number;
  domain: string;
}

export interface TargetDomain {
  id: string;
  domain: string;
  pattern?: string;
  enabled: boolean;
  priority: number;
  lastVisited?: Date;
  visitCount: number;
  avgPosition?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SearchConfig {
  keywords: string[];
  engine: SearchEngine;
  targetDomains: string[];
  maxRetries: number;
  delayBetweenSearches: number;
  useRandomProxy: boolean;
  clickThrough: boolean;
  simulateHumanBehavior: boolean;
}

export interface TaskSchedule {
  id: string;
  name?: string;
  type: ScheduleType;
  taskConfig: SearchConfig;
  /** Start time for the schedule */
  startTime?: Date;
  /** End time - schedule will not run after this time */
  endTime?: Date;
  /** Interval in minutes for recurring schedules */
  intervalMinutes?: number;
  /** Days of week to run (0=Sunday, 6=Saturday) */
  daysOfWeek?: number[];
  /** Cron expression for cron-type schedules (minute hour day month weekday) */
  cronExpression?: string;
  /** Whether the schedule is enabled */
  enabled: boolean;
  /** Last execution time */
  lastRun?: Date;
  /** Next scheduled execution time */
  nextRun?: Date;
  /** Number of times executed */
  runCount: number;
  /** Maximum number of runs (optional) */
  maxRuns?: number;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

export interface Creator {
  id: string;
  name: string;
  url: string;
  platform: 'youtube' | 'twitch' | 'blog' | 'website';
  thumbnailUrl?: string;
  supportMethods: string[];
  enabled: boolean;
  priority: number;
  lastSupported?: Date;
  totalSupports: number;
  totalAdsViewed: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AutomationSession {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'stopped';
  config: SearchConfig;
  tasks: SearchTask[];
  startedAt: Date;
  pausedAt?: Date;
  completedAt?: Date;
  statistics: SessionStatistics;
}

export interface SessionStatistics {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  avgDuration: number;
  totalDomainVisits: number;
  successRate: number;
}

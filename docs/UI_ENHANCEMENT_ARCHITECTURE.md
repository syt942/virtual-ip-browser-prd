# UI Enhancement Architecture Strategy

## Executive Summary

This document outlines the comprehensive architecture for enhancing the Virtual IP Browser UI with analytics dashboards, activity logging, statistics visualization, and real-time status indicators. The design leverages existing infrastructure (Zustand stores, IPC channels, SQLite repositories) while integrating Magic UI components for visual polish.

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Requirements Overview](#requirements-overview)
3. [Analytics Data Collection Architecture](#analytics-data-collection-architecture)
4. [Real-Time Update Mechanism](#real-time-update-mechanism)
5. [Component Architecture](#component-architecture)
6. [Dashboard Layout Design](#dashboard-layout-design)
7. [Performance Optimization Strategy](#performance-optimization-strategy)
8. [Implementation Plan](#implementation-plan)

---

## Current State Analysis

### Existing Infrastructure

#### Backend (Electron Main Process)
| Component | Location | Purpose |
|-----------|----------|---------|
| `ProxyUsageStatsRepository` | `electron/database/repositories/proxy-usage-stats.repository.ts` | Time-bucketed proxy analytics with aggregation |
| `RotationEventsRepository` | `electron/database/repositories/rotation-events.repository.ts` | Rotation event audit logging |
| `IPC_CHANNELS` | `electron/ipc/channels.ts` | Type-safe IPC communication |
| `preload.ts` | `electron/main/preload.ts` | Secure context bridge API |

#### Frontend (React Renderer)
| Component | Location | Status |
|-----------|----------|--------|
| `StatsPanel` | `src/components/panels/StatsPanel.tsx` | **Placeholder** - needs implementation |
| `ActivityLogPanel` | `src/components/panels/ActivityLogPanel.tsx` | **Placeholder** - needs implementation |
| `SettingsPanel` | `src/components/panels/SettingsPanel.tsx` | **Placeholder** - needs implementation |
| `proxyStore` | `src/stores/proxyStore.ts` | Proxy state management |
| `automationStore` | `src/stores/automationStore.ts` | Automation session management |
| `privacyStore` | `src/stores/privacyStore.ts` | Privacy settings with persistence |

#### Magic UI Components (Available)
| Component | Location | Use Case |
|-----------|----------|----------|
| `NumberTicker` | `src/components/ui/number-ticker.tsx` | Animated statistics counters |
| `BorderBeam` | `src/components/ui/border-beam.tsx` | Active element highlighting |
| `ShimmerButton` | `src/components/ui/shimmer-button.tsx` | CTAs and actions |
| `PulsatingButton` | `src/components/ui/pulsating-button.tsx` | Attention-grabbing actions |

#### Dependencies (Already Installed)
- `recharts` v2.15.2 - Charting library
- `framer-motion` v12.29.2 - Animations
- `zustand` v5.0.10 - State management
- `date-fns` v3.6.0 - Date utilities
- Radix UI primitives - UI components

### Gap Analysis

| Requirement | Current State | Gap |
|-------------|---------------|-----|
| Analytics Dashboard | Repository exists, no UI | Need StatsPanel implementation |
| Activity Log | Repository exists, no UI | Need ActivityLogPanel implementation |
| Settings Panel | Placeholder only | Need full settings UI |
| Real-time Updates | IPC events defined, not wired | Need event subscriptions |
| Charts | Recharts installed, unused | Need chart components |

---

## Requirements Overview

### Functional Requirements

1. **Analytics Dashboard**
   - Proxy usage metrics (requests, success rate, latency)
   - Automation statistics (tasks completed, failed, duration)
   - Time-series visualizations (hourly/daily trends)
   - Top performing proxies ranking

2. **Activity Log Panel**
   - Chronological event stream
   - Filterable by: type, severity, time range, proxy
   - Searchable log entries
   - Export capability

3. **Enhanced Settings Panel**
   - Proxy rotation configuration
   - Privacy/fingerprint profiles
   - Automation preferences
   - UI/theme settings
   - Data retention policies

4. **Statistics Visualization**
   - Success rate charts (line/area)
   - Proxy performance comparison (bar)
   - Error distribution (pie/donut)
   - Latency histograms

5. **Real-time Status Indicators**
   - Connection status with animated indicators
   - Active proxy health
   - Automation progress
   - System resource usage

### Non-Functional Requirements

- **Performance**: Dashboard renders in <100ms, charts update in <50ms
- **Responsiveness**: Support panel widths 280px-400px
- **Accessibility**: WCAG 2.1 AA compliance, reduced-motion support
- **Memory**: <50MB for analytics data in renderer

---

## Analytics Data Collection Architecture

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           ELECTRON MAIN PROCESS                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐    ┌──────────────────┐    ┌─────────────────────┐   │
│  │ Proxy       │───▶│ ProxyUsageStats  │───▶│ SQLite Database     │   │
│  │ Manager     │    │ Repository       │    │ (proxy_usage_stats) │   │
│  └─────────────┘    └──────────────────┘    └─────────────────────┘   │
│         │                    │                        │               │
│         │           ┌────────┴────────┐               │               │
│         │           │                 │               │               │
│  ┌──────▼──────┐   ┌▼─────────────┐  ┌▼────────────┐ │               │
│  │ Rotation    │   │ Aggregation  │  │ Time Series │ │               │
│  │ Events Repo │   │ Queries      │  │ Queries     │ │               │
│  └─────────────┘   └──────────────┘  └─────────────┘ │               │
│         │                 │                 │        │               │
└─────────┼─────────────────┼─────────────────┼────────┼───────────────┘
          │                 │                 │        │
          │    ┌────────────┴─────────────────┴────────┘
          │    │         IPC CHANNELS
          │    │
┌─────────┼────┼──────────────────────────────────────────────────────────┐
│         │    │              RENDERER PROCESS                            │
├─────────┼────┼──────────────────────────────────────────────────────────┤
│         │    │                                                          │
│    ┌────▼────▼────┐    ┌──────────────┐    ┌─────────────────────┐    │
│    │ Analytics    │───▶│ Dashboard    │───▶│ Recharts +          │    │
│    │ Store        │    │ Components   │    │ Magic UI            │    │
│    │ (Zustand)    │    │              │    │                     │    │
│    └──────────────┘    └──────────────┘    └─────────────────────┘    │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### New IPC Channels Required

```typescript
// Add to electron/ipc/channels.ts
export const IPC_CHANNELS = {
  // ... existing channels ...
  
  // Analytics Channels
  ANALYTICS_GET_PROXY_STATS: 'analytics:get-proxy-stats',
  ANALYTICS_GET_AGGREGATED: 'analytics:get-aggregated',
  ANALYTICS_GET_TIME_SERIES: 'analytics:get-time-series',
  ANALYTICS_GET_TOP_PROXIES: 'analytics:get-top-proxies',
  ANALYTICS_GET_ERROR_DISTRIBUTION: 'analytics:get-error-distribution',
  
  // Activity Log Channels
  ACTIVITY_GET_LOGS: 'activity:get-logs',
  ACTIVITY_GET_ROTATION_EVENTS: 'activity:get-rotation-events',
  ACTIVITY_EXPORT: 'activity:export',
  
  // Settings Channels
  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',
  SETTINGS_RESET: 'settings:reset',
  
  // Real-time Event Channels (Main → Renderer)
  EVENT_STATS_UPDATE: 'event:stats-update',
  EVENT_ACTIVITY_LOG: 'event:activity-log',
  EVENT_PROXY_HEALTH: 'event:proxy-health',
} as const;
```

### Analytics Store Design

```typescript
// New file: src/stores/analyticsStore.ts

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// Types
export interface ProxyStats {
  proxyId: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  successRate: number;
  avgLatencyMs: number;
  totalBytesSent: number;
  totalBytesReceived: number;
}

export interface AggregatedStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  successRate: number;
  avgLatencyMs: number;
  totalRotations: number;
  activeProxies: number;
  totalBandwidth: number;
}

export interface TimeSeriesPoint {
  timestamp: Date;
  requests: number;
  successRate: number;
  avgLatency: number;
}

export interface ErrorDistribution {
  timeout: number;
  connectionRefused: number;
  authFailed: number;
  networkError: number;
  other: number;
}

export interface AutomationStats {
  totalSessions: number;
  activeSessions: number;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  successRate: number;
  avgTaskDuration: number;
}

interface AnalyticsState {
  // Proxy Analytics
  proxyStats: Map<string, ProxyStats>;
  aggregatedStats: AggregatedStats | null;
  timeSeries: TimeSeriesPoint[];
  topProxies: ProxyStats[];
  errorDistribution: ErrorDistribution | null;
  
  // Automation Analytics
  automationStats: AutomationStats | null;
  
  // UI State
  timeRange: '1h' | '6h' | '24h' | '7d' | '30d';
  isLoading: boolean;
  lastUpdated: Date | null;
  
  // Actions
  setTimeRange: (range: '1h' | '6h' | '24h' | '7d' | '30d') => void;
  fetchAggregatedStats: () => Promise<void>;
  fetchTimeSeries: () => Promise<void>;
  fetchTopProxies: (limit?: number) => Promise<void>;
  fetchErrorDistribution: () => Promise<void>;
  fetchAutomationStats: () => Promise<void>;
  refreshAll: () => Promise<void>;
  
  // Real-time handlers
  handleStatsUpdate: (update: Partial<AggregatedStats>) => void;
}

export const useAnalyticsStore = create<AnalyticsState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    proxyStats: new Map(),
    aggregatedStats: null,
    timeSeries: [],
    topProxies: [],
    errorDistribution: null,
    automationStats: null,
    timeRange: '24h',
    isLoading: false,
    lastUpdated: null,

    setTimeRange: (range) => {
      set({ timeRange: range });
      get().refreshAll();
    },

    fetchAggregatedStats: async () => {
      try {
        set({ isLoading: true });
        const hours = timeRangeToHours(get().timeRange);
        const result = await window.api.analytics.getAggregated(hours);
        if (result.success) {
          set({ 
            aggregatedStats: result.data,
            lastUpdated: new Date()
          });
        }
      } finally {
        set({ isLoading: false });
      }
    },

    fetchTimeSeries: async () => {
      const hours = timeRangeToHours(get().timeRange);
      const result = await window.api.analytics.getTimeSeries(hours);
      if (result.success) {
        set({ timeSeries: result.data });
      }
    },

    fetchTopProxies: async (limit = 10) => {
      const hours = timeRangeToHours(get().timeRange);
      const result = await window.api.analytics.getTopProxies(limit, hours);
      if (result.success) {
        set({ topProxies: result.data });
      }
    },

    fetchErrorDistribution: async () => {
      const hours = timeRangeToHours(get().timeRange);
      const result = await window.api.analytics.getErrorDistribution(hours);
      if (result.success) {
        set({ errorDistribution: result.data });
      }
    },

    fetchAutomationStats: async () => {
      const result = await window.api.analytics.getAutomationStats();
      if (result.success) {
        set({ automationStats: result.data });
      }
    },

    refreshAll: async () => {
      const { fetchAggregatedStats, fetchTimeSeries, fetchTopProxies, 
              fetchErrorDistribution, fetchAutomationStats } = get();
      
      await Promise.all([
        fetchAggregatedStats(),
        fetchTimeSeries(),
        fetchTopProxies(),
        fetchErrorDistribution(),
        fetchAutomationStats(),
      ]);
    },

    handleStatsUpdate: (update) => {
      set((state) => ({
        aggregatedStats: state.aggregatedStats 
          ? { ...state.aggregatedStats, ...update }
          : null,
        lastUpdated: new Date()
      }));
    },
  }))
);

// Helper function
function timeRangeToHours(range: string): number {
  const map: Record<string, number> = {
    '1h': 1,
    '6h': 6,
    '24h': 24,
    '7d': 168,
    '30d': 720,
  };
  return map[range] || 24;
}
```

### Activity Log Store Design

```typescript
// New file: src/stores/activityLogStore.ts

import { create } from 'zustand';

export type LogLevel = 'info' | 'warning' | 'error' | 'success';
export type LogCategory = 'proxy' | 'automation' | 'privacy' | 'system' | 'rotation';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  category: LogCategory;
  message: string;
  details?: Record<string, unknown>;
  proxyId?: string;
  sessionId?: string;
}

export interface LogFilter {
  levels: LogLevel[];
  categories: LogCategory[];
  searchQuery: string;
  startDate: Date | null;
  endDate: Date | null;
  proxyId: string | null;
}

interface ActivityLogState {
  // Data
  logs: LogEntry[];
  filteredLogs: LogEntry[];
  
  // Filters
  filter: LogFilter;
  
  // Pagination
  page: number;
  pageSize: number;
  totalCount: number;
  
  // UI State
  isLoading: boolean;
  isLive: boolean; // Auto-scroll to new entries
  
  // Actions
  fetchLogs: (append?: boolean) => Promise<void>;
  setFilter: (filter: Partial<LogFilter>) => void;
  resetFilter: () => void;
  setPage: (page: number) => void;
  toggleLive: () => void;
  exportLogs: (format: 'json' | 'csv') => Promise<void>;
  clearLogs: () => void;
  
  // Real-time handler
  appendLog: (entry: LogEntry) => void;
}

const defaultFilter: LogFilter = {
  levels: ['info', 'warning', 'error', 'success'],
  categories: ['proxy', 'automation', 'privacy', 'system', 'rotation'],
  searchQuery: '',
  startDate: null,
  endDate: null,
  proxyId: null,
};

export const useActivityLogStore = create<ActivityLogState>((set, get) => ({
  logs: [],
  filteredLogs: [],
  filter: defaultFilter,
  page: 1,
  pageSize: 50,
  totalCount: 0,
  isLoading: false,
  isLive: true,

  fetchLogs: async (append = false) => {
    try {
      set({ isLoading: true });
      const { filter, page, pageSize } = get();
      
      const result = await window.api.activity.getLogs({
        ...filter,
        offset: (page - 1) * pageSize,
        limit: pageSize,
      });
      
      if (result.success) {
        set((state) => ({
          logs: append ? [...state.logs, ...result.data.logs] : result.data.logs,
          filteredLogs: append ? [...state.filteredLogs, ...result.data.logs] : result.data.logs,
          totalCount: result.data.total,
        }));
      }
    } finally {
      set({ isLoading: false });
    }
  },

  setFilter: (newFilter) => {
    set((state) => ({
      filter: { ...state.filter, ...newFilter },
      page: 1,
    }));
    get().fetchLogs();
  },

  resetFilter: () => {
    set({ filter: defaultFilter, page: 1 });
    get().fetchLogs();
  },

  setPage: (page) => {
    set({ page });
    get().fetchLogs();
  },

  toggleLive: () => {
    set((state) => ({ isLive: !state.isLive }));
  },

  exportLogs: async (format) => {
    const { filter } = get();
    await window.api.activity.export({ filter, format });
  },

  clearLogs: () => {
    set({ logs: [], filteredLogs: [], totalCount: 0, page: 1 });
  },

  appendLog: (entry) => {
    set((state) => {
      const newLogs = [entry, ...state.logs].slice(0, 1000); // Keep last 1000 in memory
      return {
        logs: newLogs,
        filteredLogs: applyFilter(newLogs, state.filter),
        totalCount: state.totalCount + 1,
      };
    });
  },
}));

function applyFilter(logs: LogEntry[], filter: LogFilter): LogEntry[] {
  return logs.filter((log) => {
    if (!filter.levels.includes(log.level)) return false;
    if (!filter.categories.includes(log.category)) return false;
    if (filter.searchQuery && !log.message.toLowerCase().includes(filter.searchQuery.toLowerCase())) return false;
    if (filter.startDate && log.timestamp < filter.startDate) return false;
    if (filter.endDate && log.timestamp > filter.endDate) return false;
    if (filter.proxyId && log.proxyId !== filter.proxyId) return false;
    return true;
  });
}
```

---

## Real-Time Update Mechanism

### Architecture Overview

The real-time update system uses a **push-pull hybrid** approach:
- **Push**: Main process sends events for critical updates (new logs, status changes)
- **Pull**: Periodic polling for aggregated statistics (configurable interval)

```
┌────────────────────────────────────────────────────────────────────┐
│                    REAL-TIME UPDATE FLOW                           │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│   MAIN PROCESS                         RENDERER PROCESS            │
│   ─────────────                        ────────────────            │
│                                                                    │
│   ┌─────────────┐                      ┌─────────────────┐        │
│   │ Event       │ ──── IPC Push ─────▶ │ Event           │        │
│   │ Emitter     │                      │ Subscribers     │        │
│   └─────────────┘                      └────────┬────────┘        │
│         │                                       │                  │
│         │                              ┌────────▼────────┐        │
│         │                              │ Zustand Store   │        │
│         │                              │ (optimistic     │        │
│         │                              │  updates)       │        │
│         │                              └────────┬────────┘        │
│         │                                       │                  │
│   ┌─────▼─────┐                        ┌────────▼────────┐        │
│   │ Stats     │ ◀── IPC Pull ───────── │ Polling Hook    │        │
│   │ Repository│   (every 5-30s)        │ (useInterval)   │        │
│   └───────────┘                        └─────────────────┘        │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### Real-Time Hook Implementation

```typescript
// New file: src/hooks/useRealTimeUpdates.ts

import { useEffect, useRef, useCallback } from 'react';
import { useAnalyticsStore } from '@/stores/analyticsStore';
import { useActivityLogStore } from '@/stores/activityLogStore';
import { useProxyStore } from '@/stores/proxyStore';

interface UseRealTimeUpdatesOptions {
  enabled?: boolean;
  pollInterval?: number; // ms, default 10000 (10s)
  statsInterval?: number; // ms, default 30000 (30s)
}

export function useRealTimeUpdates(options: UseRealTimeUpdatesOptions = {}) {
  const {
    enabled = true,
    pollInterval = 10000,
    statsInterval = 30000,
  } = options;

  const { handleStatsUpdate, refreshAll } = useAnalyticsStore();
  const { appendLog } = useActivityLogStore();
  const { loadProxies } = useProxyStore();
  
  const unsubscribesRef = useRef<(() => void)[]>([]);

  // Set up IPC event listeners
  useEffect(() => {
    if (!enabled) return;

    // Subscribe to real-time events
    const unsubStats = window.api.on('event:stats-update', (data: any) => {
      handleStatsUpdate(data);
    });

    const unsubLog = window.api.on('event:activity-log', (entry: any) => {
      appendLog({
        ...entry,
        timestamp: new Date(entry.timestamp),
      });
    });

    const unsubProxyHealth = window.api.on('event:proxy-health', () => {
      loadProxies();
    });

    unsubscribesRef.current = [unsubStats, unsubLog, unsubProxyHealth];

    return () => {
      unsubscribesRef.current.forEach(unsub => unsub());
    };
  }, [enabled, handleStatsUpdate, appendLog, loadProxies]);

  // Polling for stats refresh
  useEffect(() => {
    if (!enabled) return;

    const intervalId = setInterval(() => {
      refreshAll();
    }, statsInterval);

    return () => clearInterval(intervalId);
  }, [enabled, statsInterval, refreshAll]);

  // Return control functions
  return {
    forceRefresh: useCallback(() => refreshAll(), [refreshAll]),
  };
}
```

### Debounced Updates for Charts

```typescript
// New file: src/hooks/useDebouncedChartData.ts

import { useMemo } from 'react';
import { useDebouncedValue } from './useDebouncedValue';

interface ChartDataPoint {
  timestamp: Date;
  value: number;
  [key: string]: any;
}

export function useDebouncedChartData<T extends ChartDataPoint>(
  data: T[],
  debounceMs: number = 100
): T[] {
  const [debouncedData] = useDebouncedValue(data, debounceMs);
  
  // Downsample if too many points
  return useMemo(() => {
    if (debouncedData.length <= 100) return debouncedData;
    
    const step = Math.ceil(debouncedData.length / 100);
    return debouncedData.filter((_, index) => index % step === 0);
  }, [debouncedData]);
}
```

### Event Whitelist Updates (preload.ts)

```typescript
// Add to IPC_EVENT_WHITELIST in electron/main/preload.ts
const IPC_EVENT_WHITELIST = new Set([
  // ... existing events ...
  'event:stats-update',
  'event:activity-log', 
  'event:proxy-health',
  'event:automation-progress',
]);
```

---

## Component Architecture

### Component Hierarchy

```
src/components/
├── dashboard/
│   ├── AnalyticsDashboard.tsx       # Main dashboard container
│   ├── StatsSummaryCards.tsx        # KPI cards with NumberTicker
│   ├── TimeRangeSelector.tsx        # Time range dropdown
│   └── index.ts
│
├── charts/
│   ├── SuccessRateChart.tsx         # Line/Area chart
│   ├── ProxyPerformanceChart.tsx    # Bar chart comparison
│   ├── ErrorDistributionChart.tsx   # Pie/Donut chart
│   ├── LatencyHistogram.tsx         # Histogram
│   ├── RequestsTimelineChart.tsx    # Time series
│   ├── ChartContainer.tsx           # Wrapper with loading state
│   └── index.ts
│
├── activity/
│   ├── ActivityLogList.tsx          # Virtualized log list
│   ├── LogEntry.tsx                 # Single log entry
│   ├── LogFilters.tsx               # Filter controls
│   ├── LogExporter.tsx              # Export button/modal
│   └── index.ts
│
├── settings/
│   ├── SettingsContainer.tsx        # Tab-based settings
│   ├── ProxySettings.tsx            # Rotation config
│   ├── PrivacySettings.tsx          # Fingerprint profiles
│   ├── AutomationSettings.tsx       # Automation config
│   ├── AppearanceSettings.tsx       # Theme, animations
│   ├── DataSettings.tsx             # Retention, export
│   └── index.ts
│
├── status/
│   ├── ConnectionStatus.tsx         # Real-time connection indicator
│   ├── ProxyHealthBadge.tsx         # Individual proxy status
│   ├── SystemHealthIndicator.tsx    # Overall system status
│   └── index.ts
│
├── panels/                          # Existing - to be enhanced
│   ├── StatsPanel.tsx               # ← IMPLEMENT
│   ├── ActivityLogPanel.tsx         # ← IMPLEMENT
│   └── SettingsPanel.tsx            # ← IMPLEMENT
│
└── ui/
    ├── magic/                       # New Magic UI additions
    │   ├── animated-grid-pattern.tsx
    │   ├── sparkles-text.tsx
    │   ├── neon-gradient-card.tsx
    │   ├── globe.tsx
    │   └── index.ts
    └── ... existing ui components
```

### Key Component Specifications

#### 1. StatsSummaryCards Component

```tsx
// src/components/dashboard/StatsSummaryCards.tsx

import { NumberTicker } from '@/components/ui/number-ticker';
import { BorderBeam } from '@/components/ui/border-beam';
import { cn } from '@/utils/cn';
import { 
  Activity, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Wifi,
  ArrowUpRight,
  ArrowDownRight 
} from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number;
  previousValue?: number;
  format?: 'number' | 'percentage' | 'bytes' | 'duration';
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  highlight?: boolean;
}

function StatCard({ 
  title, 
  value, 
  previousValue, 
  format = 'number',
  icon,
  trend,
  highlight 
}: StatCardProps) {
  const formattedValue = formatValue(value, format);
  const change = previousValue ? ((value - previousValue) / previousValue) * 100 : 0;
  
  return (
    <div className={cn(
      "relative p-4 rounded-lg bg-card border border-border",
      "transition-all duration-200 hover:shadow-md",
      highlight && "ring-2 ring-primary"
    )}>
      {highlight && <BorderBeam size={80} duration={4} />}
      
      <div className="flex items-start justify-between">
        <div className="p-2 rounded-md bg-primary/10 text-primary">
          {icon}
        </div>
        {trend && trend !== 'neutral' && (
          <div className={cn(
            "flex items-center text-xs",
            trend === 'up' ? 'text-green-500' : 'text-red-500'
          )}>
            {trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            <span>{Math.abs(change).toFixed(1)}%</span>
          </div>
        )}
      </div>
      
      <div className="mt-3">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">
          {title}
        </p>
        <div className="mt-1 text-2xl font-bold">
          <NumberTicker 
            value={value} 
            decimalPlaces={format === 'percentage' ? 1 : 0}
            className="tabular-nums"
          />
          {format === 'percentage' && <span className="text-lg">%</span>}
        </div>
      </div>
    </div>
  );
}

export function StatsSummaryCards() {
  const { aggregatedStats, automationStats } = useAnalyticsStore();
  
  if (!aggregatedStats) return <StatsSkeleton />;
  
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard
        title="Total Requests"
        value={aggregatedStats.totalRequests}
        icon={<Activity size={18} />}
        highlight
      />
      <StatCard
        title="Success Rate"
        value={aggregatedStats.successRate}
        format="percentage"
        icon={<CheckCircle size={18} />}
        trend={aggregatedStats.successRate >= 95 ? 'up' : 'down'}
      />
      <StatCard
        title="Avg Latency"
        value={aggregatedStats.avgLatencyMs}
        format="duration"
        icon={<Clock size={18} />}
      />
      <StatCard
        title="Active Proxies"
        value={aggregatedStats.activeProxies}
        icon={<Wifi size={18} />}
      />
    </div>
  );
}

function formatValue(value: number, format: string): string {
  switch (format) {
    case 'percentage':
      return value.toFixed(1);
    case 'bytes':
      return formatBytes(value);
    case 'duration':
      return `${value.toFixed(0)}ms`;
    default:
      return value.toLocaleString();
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
```

#### 2. SuccessRateChart Component (Recharts + Magic UI)

```tsx
// src/components/charts/SuccessRateChart.tsx

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { format } from 'date-fns';
import { useAnalyticsStore } from '@/stores/analyticsStore';
import { ChartContainer } from './ChartContainer';
import { cn } from '@/utils/cn';

interface SuccessRateChartProps {
  className?: string;
  height?: number;
  showTarget?: boolean;
  targetRate?: number;
}

export function SuccessRateChart({ 
  className,
  height = 200,
  showTarget = true,
  targetRate = 95,
}: SuccessRateChartProps) {
  const { timeSeries, isLoading, timeRange } = useAnalyticsStore();
  
  const chartData = useMemo(() => {
    return timeSeries.map((point) => ({
      time: point.timestamp,
      successRate: point.successRate,
      requests: point.requests,
      formattedTime: format(
        new Date(point.timestamp),
        timeRange === '24h' ? 'HH:mm' : 'MMM dd'
      ),
    }));
  }, [timeSeries, timeRange]);

  const avgSuccessRate = useMemo(() => {
    if (chartData.length === 0) return 0;
    return chartData.reduce((sum, p) => sum + p.successRate, 0) / chartData.length;
  }, [chartData]);

  return (
    <ChartContainer
      title="Success Rate Over Time"
      subtitle={`Average: ${avgSuccessRate.toFixed(1)}%`}
      isLoading={isLoading}
      className={className}
    >
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="successGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="hsl(var(--border))" 
            opacity={0.5} 
          />
          
          <XAxis
            dataKey="formattedTime"
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
          />
          
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}%`}
          />
          
          {showTarget && (
            <ReferenceLine
              y={targetRate}
              stroke="hsl(var(--destructive))"
              strokeDasharray="5 5"
              label={{
                value: `Target ${targetRate}%`,
                position: 'right',
                fontSize: 10,
                fill: 'hsl(var(--muted-foreground))',
              }}
            />
          )}
          
          <Tooltip content={<CustomTooltip />} />
          
          <Area
            type="monotone"
            dataKey="successRate"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fill="url(#successGradient)"
            animationDuration={500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  
  return (
    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-semibold">
        Success Rate: <span className="text-primary">{payload[0].value.toFixed(1)}%</span>
      </p>
      {payload[0].payload.requests && (
        <p className="text-xs text-muted-foreground mt-1">
          {payload[0].payload.requests.toLocaleString()} requests
        </p>
      )}
    </div>
  );
}
```

#### 3. ChartContainer Component (Reusable Wrapper)

```tsx
// src/components/charts/ChartContainer.tsx

import { ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { Loader2 } from 'lucide-react';

interface ChartContainerProps {
  title: string;
  subtitle?: string;
  isLoading?: boolean;
  error?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}

export function ChartContainer({
  title,
  subtitle,
  isLoading,
  error,
  children,
  className,
  actions,
}: ChartContainerProps) {
  return (
    <div className={cn(
      "bg-card rounded-lg border border-border p-4",
      className
    )}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium">{title}</h3>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        {actions}
      </div>
      
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}
        
        {error ? (
          <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
            {error}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
```

#### 4. ActivityLogList Component (Virtualized)

```tsx
// src/components/activity/ActivityLogList.tsx

import { useRef, useEffect, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useActivityLogStore, LogEntry, LogLevel } from '@/stores/activityLogStore';
import { cn } from '@/utils/cn';
import { format } from 'date-fns';
import { 
  Info, 
  AlertTriangle, 
  XCircle, 
  CheckCircle,
  ChevronDown 
} from 'lucide-react';

const LOG_LEVEL_CONFIG: Record<LogLevel, { icon: typeof Info; color: string }> = {
  info: { icon: Info, color: 'text-blue-500' },
  warning: { icon: AlertTriangle, color: 'text-yellow-500' },
  error: { icon: XCircle, color: 'text-red-500' },
  success: { icon: CheckCircle, color: 'text-green-500' },
};

export function ActivityLogList() {
  const { filteredLogs, isLive, fetchLogs, page, totalCount, pageSize } = useActivityLogStore();
  const parentRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: filteredLogs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 10,
  });

  // Auto-scroll when live mode is enabled
  useEffect(() => {
    if (isLive && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredLogs.length, isLive]);

  // Infinite scroll - load more when near bottom
  const handleScroll = useCallback(() => {
    if (!parentRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = parentRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    
    if (isNearBottom && filteredLogs.length < totalCount) {
      fetchLogs(true); // Append more
    }
  }, [fetchLogs, filteredLogs.length, totalCount]);

  return (
    <div 
      ref={parentRef}
      onScroll={handleScroll}
      className="h-full overflow-auto"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const log = filteredLogs[virtualRow.index];
          return (
            <LogEntryRow
              key={log.id}
              log={log}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            />
          );
        })}
      </div>
      <div ref={bottomRef} />
    </div>
  );
}

interface LogEntryRowProps {
  log: LogEntry;
  style: React.CSSProperties;
}

function LogEntryRow({ log, style }: LogEntryRowProps) {
  const config = LOG_LEVEL_CONFIG[log.level];
  const Icon = config.icon;
  
  return (
    <div 
      style={style}
      className="flex items-start gap-3 p-3 border-b border-border hover:bg-accent/50 transition-colors"
    >
      <div className={cn("mt-0.5", config.color)}>
        <Icon size={16} />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {format(log.timestamp, 'HH:mm:ss')}
          </span>
          <span className={cn(
            "text-xs px-1.5 py-0.5 rounded-full",
            "bg-secondary text-secondary-foreground"
          )}>
            {log.category}
          </span>
        </div>
        <p className="text-sm mt-1 truncate">{log.message}</p>
      </div>
    </div>
  );
}
```

---

## Dashboard Layout Design

### Responsive Panel Layout

The dashboard must work within the existing side panel constraint (280-400px width) while also supporting a potential full-width dashboard view.

```
┌─────────────────────────────────────────────────────────────────┐
│                     SIDE PANEL MODE (320px)                      │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Time Range Selector    [24h ▼]  [↻ Refresh]            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌────────────┐  ┌────────────┐                                │
│  │ Requests   │  │ Success    │   ← 2-column grid              │
│  │   1,234    │  │   98.5%    │                                │
│  └────────────┘  └────────────┘                                │
│  ┌────────────┐  ┌────────────┐                                │
│  │ Latency    │  │ Proxies    │                                │
│  │   45ms     │  │   12       │                                │
│  └────────────┘  └────────────┘                                │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │           Success Rate Chart (sparkline)                │   │
│  │  ▁▂▃▄▅▆▇█▇▆▅▄▃▂▁▂▃▄▅▆▇█▇▆▅▄▃▂▁                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Top Proxies                                [View All]  │   │
│  │  ├─ proxy-us-1    98.9%  ████████████░░  32ms          │   │
│  │  ├─ proxy-eu-2    97.2%  ███████████░░░  45ms          │   │
│  │  └─ proxy-asia-1  95.1%  ██████████░░░░  78ms          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Recent Activity                            [View All]  │   │
│  │  ├─ ✓ Proxy connected (12:34:56)                       │   │
│  │  ├─ ⚠ High latency detected (12:33:12)                 │   │
│  │  └─ ✓ Task completed (12:32:01)                        │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### StatsPanel Implementation

```tsx
// src/components/panels/StatsPanel.tsx

import { useEffect } from 'react';
import { useAnalyticsStore } from '@/stores/analyticsStore';
import { useRealTimeUpdates } from '@/hooks/useRealTimeUpdates';
import { StatsSummaryCards } from '@/components/dashboard/StatsSummaryCards';
import { SuccessRateChart } from '@/components/charts/SuccessRateChart';
import { TopProxiesList } from '@/components/dashboard/TopProxiesList';
import { RecentActivityPreview } from '@/components/dashboard/RecentActivityPreview';
import { TimeRangeSelector } from '@/components/dashboard/TimeRangeSelector';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export function StatsPanel() {
  const { refreshAll, isLoading, timeRange, setTimeRange } = useAnalyticsStore();
  
  // Enable real-time updates
  useRealTimeUpdates({ enabled: true, statsInterval: 30000 });
  
  // Initial data fetch
  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-none p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Statistics</h2>
          <div className="flex items-center gap-2">
            <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refreshAll()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* KPI Cards */}
        <StatsSummaryCards />
        
        {/* Success Rate Chart */}
        <SuccessRateChart height={150} />
        
        {/* Top Proxies */}
        <TopProxiesList limit={5} />
        
        {/* Recent Activity Preview */}
        <RecentActivityPreview limit={5} />
      </div>
    </div>
  );
}
```

### ActivityLogPanel Implementation

```tsx
// src/components/panels/ActivityLogPanel.tsx

import { useEffect } from 'react';
import { useActivityLogStore } from '@/stores/activityLogStore';
import { ActivityLogList } from '@/components/activity/ActivityLogList';
import { LogFilters } from '@/components/activity/LogFilters';
import { Button } from '@/components/ui/button';
import { Download, Pause, Play, Trash2 } from 'lucide-react';

export function ActivityLogPanel() {
  const { 
    fetchLogs, 
    isLive, 
    toggleLive, 
    exportLogs, 
    clearLogs,
    totalCount 
  } = useActivityLogStore();
  
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-none p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Activity Log</h2>
          <span className="text-xs text-muted-foreground">
            {totalCount.toLocaleString()} entries
          </span>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant={isLive ? "default" : "outline"}
            size="sm"
            onClick={toggleLive}
          >
            {isLive ? <Pause className="h-3 w-3 mr-1" /> : <Play className="h-3 w-3 mr-1" />}
            {isLive ? 'Pause' : 'Live'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportLogs('csv')}
          >
            <Download className="h-3 w-3 mr-1" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clearLogs}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      {/* Filters */}
      <LogFilters />
      
      {/* Log List */}
      <div className="flex-1 overflow-hidden">
        <ActivityLogList />
      </div>
    </div>
  );
}
```

### SettingsPanel Implementation

```tsx
// src/components/panels/SettingsPanel.tsx

import { useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { ProxySettings } from '@/components/settings/ProxySettings';
import { PrivacySettings } from '@/components/settings/PrivacySettings';
import { AutomationSettings } from '@/components/settings/AutomationSettings';
import { AppearanceSettings } from '@/components/settings/AppearanceSettings';
import { DataSettings } from '@/components/settings/DataSettings';
import { cn } from '@/utils/cn';
import { 
  Globe, 
  Shield, 
  Zap, 
  Palette, 
  Database 
} from 'lucide-react';

const SETTINGS_TABS = [
  { id: 'proxy', label: 'Proxy', icon: Globe, component: ProxySettings },
  { id: 'privacy', label: 'Privacy', icon: Shield, component: PrivacySettings },
  { id: 'automation', label: 'Automation', icon: Zap, component: AutomationSettings },
  { id: 'appearance', label: 'Appearance', icon: Palette, component: AppearanceSettings },
  { id: 'data', label: 'Data', icon: Database, component: DataSettings },
];

export function SettingsPanel() {
  const [activeTab, setActiveTab] = useState('proxy');

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-none p-4 border-b border-border">
        <h2 className="text-lg font-semibold">Settings</h2>
      </div>
      
      <Tabs.Root 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col overflow-hidden"
      >
        {/* Tab List */}
        <Tabs.List className="flex-none flex border-b border-border px-2">
          {SETTINGS_TABS.map((tab) => (
            <Tabs.Trigger
              key={tab.id}
              value={tab.id}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-xs font-medium",
                "border-b-2 border-transparent transition-colors",
                "hover:text-foreground",
                "data-[state=active]:border-primary data-[state=active]:text-primary",
                "data-[state=inactive]:text-muted-foreground"
              )}
            >
              <tab.icon size={14} />
              {tab.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        
        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {SETTINGS_TABS.map((tab) => (
            <Tabs.Content
              key={tab.id}
              value={tab.id}
              className="p-4 outline-none"
            >
              <tab.component />
            </Tabs.Content>
          ))}
        </div>
      </Tabs.Root>
    </div>
  );
}
```

### Real-Time Status Indicators

```tsx
// src/components/status/ConnectionStatus.tsx

import { useMemo } from 'react';
import { useProxyStore } from '@/stores/proxyStore';
import { BorderBeam } from '@/components/ui/border-beam';
import { cn } from '@/utils/cn';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';

type ConnectionState = 'connected' | 'disconnected' | 'connecting' | 'error';

export function ConnectionStatus() {
  const { proxies } = useProxyStore();
  
  const connectionState = useMemo<ConnectionState>(() => {
    const activeProxy = proxies.find(p => p.status === 'active');
    const checkingProxy = proxies.find(p => p.status === 'checking');
    
    if (checkingProxy) return 'connecting';
    if (activeProxy) return 'connected';
    if (proxies.some(p => p.status === 'failed')) return 'error';
    return 'disconnected';
  }, [proxies]);

  const activeProxy = proxies.find(p => p.status === 'active');

  return (
    <div className={cn(
      "relative flex items-center gap-2 px-3 py-1.5 rounded-full",
      "border transition-all duration-300",
      connectionState === 'connected' && "border-green-500/50 bg-green-500/10",
      connectionState === 'connecting' && "border-yellow-500/50 bg-yellow-500/10",
      connectionState === 'error' && "border-red-500/50 bg-red-500/10",
      connectionState === 'disconnected' && "border-border bg-secondary"
    )}>
      {connectionState === 'connected' && (
        <BorderBeam 
          size={30} 
          duration={3} 
          colorFrom="#22c55e" 
          colorTo="#16a34a" 
        />
      )}
      
      <StatusIcon state={connectionState} />
      
      <div className="text-xs">
        {connectionState === 'connected' && (
          <span className="text-green-600 dark:text-green-400">
            {activeProxy?.name || 'Connected'}
          </span>
        )}
        {connectionState === 'connecting' && (
          <span className="text-yellow-600 dark:text-yellow-400">
            Connecting...
          </span>
        )}
        {connectionState === 'error' && (
          <span className="text-red-600 dark:text-red-400">
            Connection Error
          </span>
        )}
        {connectionState === 'disconnected' && (
          <span className="text-muted-foreground">
            Not Connected
          </span>
        )}
      </div>
      
      {activeProxy?.latency && connectionState === 'connected' && (
        <span className="text-[10px] text-muted-foreground">
          {activeProxy.latency}ms
        </span>
      )}
    </div>
  );
}

function StatusIcon({ state }: { state: ConnectionState }) {
  switch (state) {
    case 'connected':
      return <Wifi className="h-3.5 w-3.5 text-green-500" />;
    case 'connecting':
      return <Loader2 className="h-3.5 w-3.5 text-yellow-500 animate-spin" />;
    case 'error':
      return <WifiOff className="h-3.5 w-3.5 text-red-500" />;
    default:
      return <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />;
  }
}
```

---

## Performance Optimization Strategy

### 1. Data Layer Optimizations

#### Memoization Strategy

```typescript
// src/hooks/useMemoizedStats.ts

import { useMemo } from 'react';
import { useAnalyticsStore } from '@/stores/analyticsStore';

export function useMemoizedStats() {
  const { aggregatedStats, timeSeries, topProxies } = useAnalyticsStore();
  
  // Memoize computed values
  const summaryData = useMemo(() => {
    if (!aggregatedStats) return null;
    
    return {
      requestsPerMinute: aggregatedStats.totalRequests / 60,
      bandwidthMbps: (aggregatedStats.totalBytesSent + aggregatedStats.totalBytesReceived) / 1024 / 1024,
      healthScore: calculateHealthScore(aggregatedStats),
    };
  }, [aggregatedStats]);

  // Memoize chart data transformation
  const chartData = useMemo(() => {
    return timeSeries.map(point => ({
      ...point,
      timestamp: point.timestamp.getTime(), // Convert for faster comparison
    }));
  }, [timeSeries]);

  return { summaryData, chartData, topProxies };
}

function calculateHealthScore(stats: AggregatedStats): number {
  const successWeight = 0.5;
  const latencyWeight = 0.3;
  const uptimeWeight = 0.2;
  
  const successScore = Math.min(stats.successRate, 100);
  const latencyScore = Math.max(0, 100 - (stats.avgLatencyMs / 10));
  const uptimeScore = stats.activeProxies > 0 ? 100 : 0;
  
  return (
    successScore * successWeight +
    latencyScore * latencyWeight +
    uptimeScore * uptimeWeight
  );
}
```

#### Selective Store Subscriptions

```typescript
// Use Zustand's shallow comparison and selectors
import { useAnalyticsStore } from '@/stores/analyticsStore';
import { shallow } from 'zustand/shallow';

// Bad: Re-renders on any store change
const { aggregatedStats, timeSeries, topProxies } = useAnalyticsStore();

// Good: Only re-renders when specific values change
const aggregatedStats = useAnalyticsStore(state => state.aggregatedStats);
const timeSeries = useAnalyticsStore(state => state.timeSeries, shallow);
```

### 2. Rendering Optimizations

#### Chart Rendering

```typescript
// src/components/charts/OptimizedChart.tsx

import { memo, useMemo } from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

interface OptimizedChartProps {
  data: any[];
  dataKey: string;
}

// Memoize entire chart component
export const OptimizedChart = memo(function OptimizedChart({ 
  data, 
  dataKey 
}: OptimizedChartProps) {
  // Downsample data for performance
  const downsampledData = useMemo(() => {
    if (data.length <= 50) return data;
    
    const step = Math.ceil(data.length / 50);
    return data.filter((_, i) => i % step === 0);
  }, [data]);

  return (
    <ResponsiveContainer width="100%" height={150}>
      <AreaChart data={downsampledData}>
        <Area 
          type="monotone" 
          dataKey={dataKey}
          isAnimationActive={false} // Disable animation for performance
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render if data length changes significantly
  return prevProps.data.length === nextProps.data.length &&
         prevProps.dataKey === nextProps.dataKey;
});
```

#### Virtualization for Lists

```typescript
// Already using @tanstack/react-virtual in ActivityLogList
// Key configurations for optimal performance:

const virtualizer = useVirtualizer({
  count: items.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 60,      // Pre-calculated row height
  overscan: 5,                  // Render 5 extra items above/below viewport
  measureElement: undefined,    // Skip measurement for fixed-height items
});
```

### 3. Update Batching

```typescript
// src/utils/batchedUpdates.ts

import { unstable_batchedUpdates } from 'react-dom';

export function batchStoreUpdates(updates: (() => void)[]) {
  unstable_batchedUpdates(() => {
    updates.forEach(update => update());
  });
}

// Usage in real-time handler
function handleBulkStatsUpdate(data: StatsUpdate[]) {
  batchStoreUpdates([
    () => useAnalyticsStore.getState().handleStatsUpdate(data.aggregated),
    () => useActivityLogStore.getState().appendLog(data.logEntry),
    () => useProxyStore.getState().updateProxyStatus(data.proxyId, data.status),
  ]);
}
```

### 4. Lazy Loading

```typescript
// src/App.tsx - Lazy load heavy components

import { lazy, Suspense } from 'react';

const StatsPanel = lazy(() => import('@/components/panels/StatsPanel'));
const ActivityLogPanel = lazy(() => import('@/components/panels/ActivityLogPanel'));
const SettingsPanel = lazy(() => import('@/components/panels/SettingsPanel'));

function App() {
  return (
    <Suspense fallback={<PanelSkeleton />}>
      {activePanel === 'stats' && <StatsPanel />}
      {activePanel === 'activity' && <ActivityLogPanel />}
      {activePanel === 'settings' && <SettingsPanel />}
    </Suspense>
  );
}
```

### 5. Reduced Motion Support

```typescript
// src/hooks/useReducedMotion.ts

import { useEffect, useState } from 'react';

export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
}

// Usage in components
function AnimatedComponent() {
  const prefersReducedMotion = useReducedMotion();
  
  return (
    <NumberTicker 
      value={count} 
      // Disable animation if user prefers reduced motion
      className={prefersReducedMotion ? 'transition-none' : undefined}
    />
  );
}
```

---

## Implementation Plan

### Phase 1: Foundation (Week 1)

#### 1.1 New IPC Channels & Handlers

| Task | Files | Priority |
|------|-------|----------|
| Add analytics IPC channels | `electron/ipc/channels.ts` | High |
| Create analytics IPC handlers | `electron/ipc/handlers/analytics.ts` | High |
| Create activity IPC handlers | `electron/ipc/handlers/activity.ts` | High |
| Update preload whitelist | `electron/main/preload.ts` | High |
| Add settings IPC handlers | `electron/ipc/handlers/settings.ts` | Medium |

**Estimated Time**: 4-6 hours

#### 1.2 Frontend Stores

| Task | Files | Priority |
|------|-------|----------|
| Create analyticsStore | `src/stores/analyticsStore.ts` | High |
| Create activityLogStore | `src/stores/activityLogStore.ts` | High |
| Create settingsStore | `src/stores/settingsStore.ts` | Medium |

**Estimated Time**: 3-4 hours

### Phase 2: Core Components (Week 1-2)

#### 2.1 Dashboard Components

| Component | Description | Dependencies |
|-----------|-------------|--------------|
| `StatsSummaryCards` | KPI cards with NumberTicker | analyticsStore |
| `TimeRangeSelector` | Dropdown for time range | None |
| `TopProxiesList` | Ranked proxy list | analyticsStore |
| `RecentActivityPreview` | Activity summary | activityLogStore |

**Estimated Time**: 6-8 hours

#### 2.2 Chart Components

| Component | Chart Type | Library |
|-----------|------------|---------|
| `SuccessRateChart` | Area/Line | Recharts |
| `ProxyPerformanceChart` | Horizontal Bar | Recharts |
| `ErrorDistributionChart` | Donut | Recharts |
| `RequestsTimelineChart` | Line with brush | Recharts |
| `ChartContainer` | Wrapper | Custom |

**Estimated Time**: 8-10 hours

### Phase 3: Panel Implementations (Week 2)

#### 3.1 StatsPanel

| Task | Description |
|------|-------------|
| Replace placeholder | Full implementation |
| Integrate StatsSummaryCards | KPI display |
| Add SuccessRateChart | Sparkline variant |
| Add TopProxiesList | Condensed view |
| Add real-time updates | useRealTimeUpdates hook |

**Estimated Time**: 4-5 hours

#### 3.2 ActivityLogPanel

| Task | Description |
|------|-------------|
| Replace placeholder | Full implementation |
| Implement ActivityLogList | Virtualized list |
| Add LogFilters | Filter controls |
| Add export functionality | CSV/JSON export |
| Add live mode toggle | Auto-scroll |

**Estimated Time**: 5-6 hours

#### 3.3 SettingsPanel

| Task | Description |
|------|-------------|
| Replace placeholder | Tab-based layout |
| ProxySettings tab | Rotation config |
| PrivacySettings tab | Profile management |
| AutomationSettings tab | Task config |
| AppearanceSettings tab | Theme, animations |
| DataSettings tab | Retention, export |

**Estimated Time**: 8-10 hours

### Phase 4: Real-Time & Polish (Week 2-3)

#### 4.1 Real-Time Updates

| Task | Description |
|------|-------------|
| Implement useRealTimeUpdates | IPC event subscriptions |
| Add polling mechanism | Configurable intervals |
| Implement ConnectionStatus | Real-time indicator |
| Add notification system | Status change alerts |

**Estimated Time**: 4-5 hours

#### 4.2 Magic UI Integration

| Component | Usage |
|-----------|-------|
| NumberTicker | All stat counters |
| BorderBeam | Active states, connected status |
| SparklesText | Success messages (optional) |
| NeonGradientCard | Highlighted stats (optional) |
| AnimatedGridPattern | Background (optional) |

**Estimated Time**: 3-4 hours

#### 4.3 Performance Optimization

| Task | Description |
|------|-------------|
| Implement memoization | useMemo, memo() |
| Add chart downsampling | Max 100 data points |
| Configure virtualization | Optimal overscan |
| Add lazy loading | Code splitting |
| Test reduced motion | Accessibility |

**Estimated Time**: 3-4 hours

### Phase 5: Testing & Documentation (Week 3)

| Task | Description | Time |
|------|-------------|------|
| Unit tests | Store actions, utilities | 4h |
| Component tests | Panel rendering | 4h |
| Integration tests | IPC communication | 3h |
| E2E tests | Full user flows | 4h |
| Documentation | Update README, add guides | 2h |

---

## Dependencies to Add

```bash
# Required for virtualization (if not using native solution)
npm install @tanstack/react-virtual

# Optional: For advanced date picking in filters
npm install react-day-picker
```

---

## File Creation Summary

### New Files (26 total)

```
src/
├── stores/
│   ├── analyticsStore.ts           # NEW
│   ├── activityLogStore.ts         # NEW
│   └── settingsStore.ts            # NEW
│
├── hooks/
│   ├── useRealTimeUpdates.ts       # NEW
│   ├── useDebouncedChartData.ts    # NEW
│   ├── useMemoizedStats.ts         # NEW
│   └── useReducedMotion.ts         # NEW
│
├── components/
│   ├── dashboard/
│   │   ├── AnalyticsDashboard.tsx  # NEW
│   │   ├── StatsSummaryCards.tsx   # NEW
│   │   ├── TimeRangeSelector.tsx   # NEW
│   │   ├── TopProxiesList.tsx      # NEW
│   │   ├── RecentActivityPreview.tsx # NEW
│   │   └── index.ts                # NEW
│   │
│   ├── charts/
│   │   ├── SuccessRateChart.tsx    # NEW
│   │   ├── ProxyPerformanceChart.tsx # NEW
│   │   ├── ErrorDistributionChart.tsx # NEW
│   │   ├── ChartContainer.tsx      # NEW
│   │   └── index.ts                # NEW
│   │
│   ├── activity/
│   │   ├── ActivityLogList.tsx     # NEW
│   │   ├── LogFilters.tsx          # NEW
│   │   └── index.ts                # NEW
│   │
│   ├── settings/
│   │   ├── ProxySettings.tsx       # NEW
│   │   ├── PrivacySettings.tsx     # NEW
│   │   ├── AutomationSettings.tsx  # NEW
│   │   ├── AppearanceSettings.tsx  # NEW
│   │   ├── DataSettings.tsx        # NEW
│   │   └── index.ts                # NEW
│   │
│   └── status/
│       ├── ConnectionStatus.tsx    # NEW
│       └── index.ts                # NEW
│
electron/
└── ipc/
    └── handlers/
        ├── analytics.ts            # NEW
        └── activity.ts             # NEW
```

### Files to Modify (8 total)

| File | Changes |
|------|---------|
| `src/components/panels/StatsPanel.tsx` | Full implementation |
| `src/components/panels/ActivityLogPanel.tsx` | Full implementation |
| `src/components/panels/SettingsPanel.tsx` | Full implementation |
| `electron/ipc/channels.ts` | Add new channels |
| `electron/main/preload.ts` | Update whitelists |
| `electron/ipc/handlers/index.ts` | Register new handlers |
| `src/App.tsx` | Add ConnectionStatus, lazy loading |
| `package.json` | Add @tanstack/react-virtual |

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Dashboard render time | < 100ms | Performance API |
| Chart update latency | < 50ms | Performance API |
| Memory usage | < 50MB | DevTools Memory |
| Bundle size increase | < 30KB gzipped | Build output |
| Test coverage | > 80% | Vitest coverage |
| Accessibility | WCAG 2.1 AA | axe-core audit |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Performance degradation | Implement downsampling, virtualization |
| Memory leaks | Cleanup subscriptions, limit in-memory logs |
| Bundle bloat | Code splitting, lazy loading |
| Real-time overload | Debounce updates, batch operations |
| Accessibility issues | Test with reduced motion, screen readers |

---

## Architecture Decision Records

### ADR-001: Zustand for Analytics State

**Decision**: Use Zustand with selectors for analytics state management.

**Rationale**:
- Consistent with existing stores (proxyStore, automationStore)
- Built-in subscription selectors for performance
- Simple API, minimal boilerplate
- Good TypeScript support

**Alternatives Considered**:
- Redux Toolkit: Overkill for this use case
- React Query: Better for server state, but this is local analytics
- Jotai: Would require refactoring existing stores

### ADR-002: Recharts for Visualization

**Decision**: Use existing Recharts installation for all charts.

**Rationale**:
- Already installed and tree-shakeable
- Good React integration
- Supports all required chart types
- Responsive by default

**Alternatives Considered**:
- Victory: Similar capabilities, larger bundle
- Nivo: More features, steeper learning curve
- Custom SVG: Too much development time

### ADR-003: Push-Pull Hybrid for Real-Time

**Decision**: Use IPC events for critical updates, polling for aggregated stats.

**Rationale**:
- Events ensure immediate feedback for user actions
- Polling reduces IPC overhead for analytics
- Configurable intervals balance freshness vs performance

**Alternatives Considered**:
- Pure push: Too many events, potential bottleneck
- Pure pull: Laggy user feedback
- WebSocket: Overkill for Electron IPC

/**
 * Creator Stats Dashboard
 * Full dashboard for viewing creator support analytics
 */

import { useState, useEffect, useMemo } from 'react';
import { X, TrendingUp, Search, Calendar, Download, RefreshCw } from 'lucide-react';
import { CreatorStatsCard, StatsSummaryCard, type CreatorStats } from './CreatorStatsCard';
import { ShimmerButton } from '@components/ui/shimmer-button';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface CreatorStatsDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadCreatorStats: () => Promise<CreatorStats[]>;
  onLoadActivityChart: (hours: number) => Promise<ActivityChartData[]>;
}

export interface ActivityChartData {
  hour: string;
  count: number;
}

type TimeRange = '24h' | '7d' | '30d' | 'all';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Export stats to CSV
 */
function exportStatsToCSV(stats: CreatorStats[]): void {
  const headers = [
    'Creator Name',
    'Platform',
    'Total Actions',
    'Successful',
    'Failed',
    'Clicks',
    'Scrolls',
    'Visits',
    'Success Rate',
    'Last Action',
  ];

  const rows = stats.map(s => [
    s.creatorName,
    s.platform,
    s.totalActions.toString(),
    s.successfulActions.toString(),
    s.failedActions.toString(),
    s.totalClicks.toString(),
    s.totalScrolls.toString(),
    s.totalVisits.toString(),
    `${s.successRate.toFixed(2)}%`,
    s.lastActionTimestamp?.toISOString() || 'Never',
  ]);

  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `creator-stats-${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Calculate summary statistics
 */
function calculateSummary(stats: CreatorStats[], last24HourCount: number) {
  const totalCreators = stats.length;
  const totalActions = stats.reduce((sum, s) => sum + s.totalActions, 0);
  const totalVisits = stats.reduce((sum, s) => sum + s.totalVisits, 0);
  const avgSuccessRate = totalCreators > 0
    ? stats.reduce((sum, s) => sum + s.successRate, 0) / totalCreators
    : 0;

  return {
    totalCreators,
    totalActions,
    totalVisits,
    avgSuccessRate,
    last24Hours: last24HourCount,
  };
}

// ============================================================================
// CUSTOM CHART TOOLTIP
// ============================================================================

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: ActivityChartData;
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;
  const value = payload[0].value;

  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
      <p className="text-sm font-medium mb-1">{data.hour}</p>
      <p className="text-2xl font-bold text-primary">{value} actions</p>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CreatorStatsDashboard({
  isOpen,
  onClose,
  onLoadCreatorStats,
  onLoadActivityChart,
}: CreatorStatsDashboardProps) {
  const [creatorStats, setCreatorStats] = useState<CreatorStats[]>([]);
  const [activityData, setActivityData] = useState<ActivityChartData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [sortBy, setSortBy] = useState<'actions' | 'visits' | 'success'>('actions');

  // Load data when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    setIsLoading(true);

    Promise.all([
      onLoadCreatorStats(),
      onLoadActivityChart(24), // Default 24 hours
    ])
      .then(([stats, chart]) => {
        if (mounted) {
          setCreatorStats(stats);
          setActivityData(chart);
        }
      })
      .catch(error => {
        console.error('[CreatorStats] Failed to load data:', error);
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [isOpen, onLoadCreatorStats, onLoadActivityChart]);

  // Load activity chart when time range changes
  useEffect(() => {
    if (!isOpen) return;

    const hours = timeRange === '24h' ? 24
      : timeRange === '7d' ? 168
      : timeRange === '30d' ? 720
      : 720; // Max 30 days for chart

    onLoadActivityChart(hours)
      .then(chart => setActivityData(chart))
      .catch(error => console.error('[CreatorStats] Chart load error:', error));
  }, [timeRange, isOpen, onLoadActivityChart]);

  // Filter and sort creators
  const filteredCreators = useMemo(() => {
    let filtered = creatorStats;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.creatorName.toLowerCase().includes(query) ||
        c.platform.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === 'actions') return b.totalActions - a.totalActions;
      if (sortBy === 'visits') return b.totalVisits - a.totalVisits;
      if (sortBy === 'success') return b.successRate - a.successRate;
      return 0;
    });

    return filtered;
  }, [creatorStats, searchQuery, sortBy]);

  // Calculate summary
  const summary = useMemo(() => {
    const last24HourActions = activityData
      .filter(d => {
        const hourDate = new Date(d.hour);
        return Date.now() - hourDate.getTime() < 24 * 60 * 60 * 1000;
      })
      .reduce((sum, d) => sum + d.count, 0);

    return calculateSummary(creatorStats, last24HourActions);
  }, [creatorStats, activityData]);

  // Refresh data
  const handleRefresh = () => {
    setIsLoading(true);
    Promise.all([
      onLoadCreatorStats(),
      onLoadActivityChart(24),
    ])
      .then(([stats, chart]) => {
        setCreatorStats(stats);
        setActivityData(chart);
      })
      .finally(() => setIsLoading(false));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="absolute inset-4 bg-card border border-border rounded-lg shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/20">
          <div className="flex items-center gap-3">
            <TrendingUp size={24} className="text-primary" />
            <div>
              <h2 className="text-xl font-bold">Creator Support Analytics</h2>
              <p className="text-sm text-muted-foreground">
                Track your creator support activities and impact
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="p-2 hover:bg-secondary rounded transition-colors disabled:opacity-50"
              title="Refresh data"
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <ShimmerButton
              onClick={() => exportStatsToCSV(creatorStats)}
              disabled={creatorStats.length === 0}
              className="h-9 px-4"
            >
              <Download size={14} className="mr-2" />
              Export CSV
            </ShimmerButton>
            <button
              onClick={onClose}
              className="p-2 hover:bg-secondary rounded transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Summary Card */}
          <StatsSummaryCard {...summary} />

          {/* Activity Chart */}
          <div className="border border-border rounded-lg p-4 bg-secondary/5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Activity Timeline</h3>
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-muted-foreground" />
                <div className="flex gap-1">
                  {(['24h', '7d', '30d', 'all'] as const).map(range => (
                    <button
                      key={range}
                      onClick={() => setTimeRange(range)}
                      className={`px-3 py-1 rounded text-sm transition-colors ${
                        timeRange === range
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary hover:bg-secondary/80'
                      }`}
                    >
                      {range === '24h' ? '24 Hours' :
                       range === '7d' ? '7 Days' :
                       range === '30d' ? '30 Days' : 'All Time'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {activityData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No activity data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={activityData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="hour"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name="Actions"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))', r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Filters & Search */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search creators..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="actions">Total Actions</option>
                <option value="visits">Total Visits</option>
                <option value="success">Success Rate</option>
              </select>
            </div>
          </div>

          {/* Creator Cards Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">Loading creator statistics...</p>
              </div>
            </div>
          ) : filteredCreators.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <TrendingUp size={48} className="mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-1">No Creators Found</h3>
                <p className="text-sm text-muted-foreground">
                  {searchQuery
                    ? 'Try adjusting your search query'
                    : 'Start supporting creators to see statistics here'}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCreators.map(stats => (
                <CreatorStatsCard
                  key={stats.creatorId}
                  stats={stats}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

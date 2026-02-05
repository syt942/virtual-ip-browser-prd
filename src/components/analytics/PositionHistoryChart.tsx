/**
 * Position History Chart Component
 * Visualizes SERP position changes over time using Recharts
 */

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface PositionDataPoint {
  timestamp: Date;
  position: number | null;
  keyword: string;
  domain: string;
  engine: string;
  url?: string;
  title?: string;
}

export interface PositionHistoryChartProps {
  data: PositionDataPoint[];
  keyword: string;
  domain: string;
  timeRange?: '7d' | '30d' | '90d' | 'all';
  showTrendLine?: boolean;
  showAverage?: boolean;
}

export interface ChartDataPoint {
  date: string;
  dateObj: Date;
  position: number | null;
  formattedDate: string;
  tooltip?: string;
}

export interface PositionStats {
  current: number | null;
  previous: number | null;
  change: number | null;
  changePercent: number | null;
  trend: 'up' | 'down' | 'stable';
  best: number | null;
  worst: number | null;
  average: number | null;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate position statistics from data points
 */
function calculateStats(data: PositionDataPoint[]): PositionStats {
  const positions = data
    .filter(d => d.position !== null)
    .map(d => d.position as number);

  if (positions.length === 0) {
    return {
      current: null,
      previous: null,
      change: null,
      changePercent: null,
      trend: 'stable',
      best: null,
      worst: null,
      average: null,
    };
  }

  const current = positions[positions.length - 1] ?? null;
  const previous = positions.length > 1 ? positions[positions.length - 2] : null;
  const change = current !== null && previous !== null ? previous - current : null;
  const changePercent = previous !== null && change !== null
    ? (change / previous) * 100
    : null;

  const trend = change === null ? 'stable'
    : change > 0 ? 'up'
    : change < 0 ? 'down'
    : 'stable';

  const best = Math.min(...positions);
  const worst = Math.max(...positions);
  const average = positions.reduce((sum, p) => sum + p, 0) / positions.length;

  return {
    current,
    previous,
    change,
    changePercent,
    trend,
    best,
    worst,
    average: Math.round(average * 10) / 10,
  };
}

/**
 * Format date for chart labels
 */
function formatChartDate(date: Date, range: string): string {
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (range === '7d') {
    // Show day of week for 7 day view
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  } else if (range === '30d') {
    // Show month/day for 30 day view
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } else {
    // Show full date for longer ranges
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
}

/**
 * Filter data by time range
 */
function filterByTimeRange(data: PositionDataPoint[], range: '7d' | '30d' | '90d' | 'all'): PositionDataPoint[] {
  if (range === 'all') return data;

  const now = new Date();
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  return data.filter(d => d.timestamp >= cutoff);
}

/**
 * Prepare chart data from raw position data
 */
function prepareChartData(
  data: PositionDataPoint[],
  timeRange: string
): ChartDataPoint[] {
  return data.map(point => ({
    date: point.timestamp.toISOString(),
    dateObj: point.timestamp,
    position: point.position,
    formattedDate: formatChartDate(point.timestamp, timeRange),
    tooltip: point.title,
  }));
}

// ============================================================================
// STATS CARD COMPONENTS
// ============================================================================

interface StatCardProps {
  label: string;
  value: number | null;
  trend?: 'up' | 'down' | 'stable';
  change?: number | null;
  highlight?: boolean;
}

function StatCard({ label, value, trend, change, highlight }: StatCardProps) {
  const getTrendIcon = () => {
    if (!trend || trend === 'stable') return <Minus size={16} className="text-muted-foreground" />;
    if (trend === 'up') return <TrendingUp size={16} className="text-green-500" />;
    return <TrendingDown size={16} className="text-red-500" />;
  };

  const getTrendColor = () => {
    if (!trend || trend === 'stable') return 'text-muted-foreground';
    // Remember: Lower position = better in SERP
    return trend === 'up' ? 'text-green-500' : 'text-red-500';
  };

  return (
    <div className={`p-4 rounded-lg border ${highlight ? 'border-primary bg-primary/5' : 'border-border bg-secondary/30'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        {trend && getTrendIcon()}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold">
          {value !== null ? `#${value}` : '-'}
        </span>
        {change !== null && change !== 0 && (
          <span className={`text-sm font-medium ${getTrendColor()}`}>
            {change > 0 ? '+' : ''}{change}
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// CUSTOM TOOLTIP
// ============================================================================

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: ChartDataPoint;
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;
  const position = payload[0].value;

  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
      <p className="text-sm font-medium mb-1">{data.formattedDate}</p>
      <p className="text-2xl font-bold text-primary">#{position}</p>
      {data.tooltip && (
        <p className="text-xs text-muted-foreground mt-1 max-w-xs truncate">
          {data.tooltip}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PositionHistoryChart({
  data,
  keyword,
  domain,
  timeRange = '30d',
  showTrendLine = false,
  showAverage = true,
}: PositionHistoryChartProps) {
  // Filter and prepare data
  const filteredData = useMemo(
    () => filterByTimeRange(data, timeRange),
    [data, timeRange]
  );

  const chartData = useMemo(
    () => prepareChartData(filteredData, timeRange),
    [filteredData, timeRange]
  );

  const stats = useMemo(
    () => calculateStats(filteredData),
    [filteredData]
  );

  // No data state
  if (chartData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12">
        <div className="text-center">
          <div className="text-muted-foreground mb-2">
            <svg
              className="w-16 h-16 mx-auto mb-4 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-1">No Position Data</h3>
          <p className="text-sm text-muted-foreground">
            No ranking data available for "{keyword}" on {domain}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Position tracking will appear here after searches are executed
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Statistics Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Current Position"
          value={stats.current}
          trend={stats.trend}
          change={stats.change}
          highlight
        />
        <StatCard
          label="Best Position"
          value={stats.best}
        />
        <StatCard
          label="Average Position"
          value={stats.average !== null ? Math.round(stats.average) : null}
        />
        <StatCard
          label="Worst Position"
          value={stats.worst}
        />
      </div>

      {/* Chart Info */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{keyword}</h3>
          <p className="text-sm text-muted-foreground">{domain}</p>
        </div>
        <div className="text-sm text-muted-foreground">
          {chartData.length} data point{chartData.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Chart */}
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="positionGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="formattedDate"
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 12 }}
              reversed
              domain={[1, 100]}
              label={{ value: 'Position', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />

            {/* Average line */}
            {showAverage && stats.average !== null && (
              <ReferenceLine
                y={stats.average}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="5 5"
                label={{
                  value: `Avg: #${Math.round(stats.average)}`,
                  fill: 'hsl(var(--muted-foreground))',
                  fontSize: 12,
                }}
              />
            )}

            {/* Area under line */}
            <Area
              type="monotone"
              dataKey="position"
              stroke="none"
              fill="url(#positionGradient)"
            />

            {/* Main position line */}
            <Line
              type="monotone"
              dataKey="position"
              name="Position"
              stroke="hsl(var(--primary))"
              strokeWidth={3}
              dot={{ fill: 'hsl(var(--primary))', r: 4 }}
              activeDot={{ r: 6 }}
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Legend */}
      <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <span>Position</span>
        </div>
        {showAverage && stats.average !== null && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-muted-foreground" />
            <span>Average</span>
          </div>
        )}
        <div className="text-xs">
          <TrendingUp className="inline w-3 h-3 text-green-500 mr-1" />
          = Improved (Lower Position)
        </div>
        <div className="text-xs">
          <TrendingDown className="inline w-3 h-3 text-red-500 mr-1" />
          = Declined (Higher Position)
        </div>
      </div>
    </div>
  );
}

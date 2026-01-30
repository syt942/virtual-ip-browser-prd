/**
 * Analytics Dashboard Component
 * Displays proxy performance, automation stats, and trends with charts
 */

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, TrendingUp, Activity, Zap, Globe } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { NumberTicker } from '@components/ui/number-ticker';
import { ShimmerButton } from '@components/ui/shimmer-button';
import { cn } from '@utils/cn';

interface DashboardStats {
  totalProxies: number;
  activeProxies: number;
  failedProxies: number;
  totalRequests: number;
  successRate: number;
  avgLatency: number;
  totalRotations: number;
  bytesTransferred: number;
}

interface TrendDataPoint {
  hour: string;
  requests: number;
  successRate: number;
  avgLatency: number;
  rotations: number;
}

interface ProxyPerformance {
  proxyId: string;
  proxyName: string;
  successRate: number;
  avgLatency: number;
  totalRequests: number;
}

interface AnalyticsDashboardProps {
  refreshInterval?: number;
}

type TimeRange = '24h' | '7d' | '30d';

export function AnalyticsDashboard({ refreshInterval = 30000 }: AnalyticsDashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [proxyPerformance, setProxyPerformance] = useState<ProxyPerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [statsResult, trendResult, perfResult] = await Promise.all([
        window.api.analytics.getDashboardStats() as Promise<{ success: boolean; data?: DashboardStats }>,
        window.api.analytics.getTrendData({ range: timeRange }) as Promise<{ success: boolean; data?: TrendDataPoint[] }>,
        window.api.analytics.getProxyPerformance({ hours: timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720 }) as Promise<{ success: boolean; data?: ProxyPerformance[] }>
      ]);

      if (statsResult.success && statsResult.data) {
        setStats(statsResult.data);
      }
      if (trendResult.success && trendResult.data) {
        setTrendData(trendResult.data);
      }
      if (perfResult.success && perfResult.data) {
        setProxyPerformance(perfResult.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load dashboard data'));
    } finally {
      setIsLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!refreshInterval) return;
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval, fetchData]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (error) {
    return (
      <div className="p-4 flex flex-col items-center justify-center h-full" data-testid="dashboard-error">
        <p className="text-red-500 mb-4">Failed to load dashboard: {error.message}</p>
        <ShimmerButton onClick={fetchData}>Retry</ShimmerButton>
      </div>
    );
  }

  if (isLoading && !stats) {
    return (
      <div className="p-4 flex items-center justify-center h-full" data-testid="dashboard-loading">
        <RefreshCw className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-card to-card/80 overflow-auto">
      {/* Header */}
      <div className="p-4 border-b border-border/50 flex items-center justify-between">
        <h2 className="text-lg font-semibold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Analytics Dashboard
        </h2>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-secondary/50 p-1" data-testid="time-range-selector">
            {(['24h', '7d', '30d'] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={cn(
                  'px-3 py-1 text-xs rounded-md transition-all',
                  timeRange === range
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {range === '24h' ? 'Hourly' : range === '7d' ? 'Daily' : 'Monthly'}
              </button>
            ))}
          </div>
          <button
            onClick={fetchData}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
            data-testid="refresh-dashboard"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="p-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          testId="stat-total-proxies"
          icon={<Globe size={20} />}
          label="Total Proxies"
          value={stats?.totalProxies || 0}
          color="text-blue-500"
        />
        <StatCard
          testId="stat-active-proxies"
          icon={<Activity size={20} />}
          label="Active Proxies"
          value={stats?.activeProxies || 0}
          color="text-green-500"
        />
        <StatCard
          testId="stat-success-rate"
          icon={<TrendingUp size={20} />}
          label="Success Rate"
          value={stats?.successRate || 0}
          suffix="%"
          decimals={1}
          color={getSuccessRateColor(stats?.successRate || 0)}
        />
        <StatCard
          testId="stat-avg-latency"
          icon={<Zap size={20} />}
          label="Avg Latency"
          value={stats?.avgLatency || 0}
          suffix="ms"
          color={getLatencyColor(stats?.avgLatency || 0)}
        />
      </div>

      {/* Additional Stats Row */}
      <div className="px-4 pb-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          testId="stat-total-requests"
          label="Total Requests"
          value={stats?.totalRequests || 0}
          color="text-purple-500"
        />
        <StatCard
          testId="stat-total-rotations"
          label="Rotations"
          value={stats?.totalRotations || 0}
          color="text-orange-500"
        />
        <StatCard
          testId="stat-failed-proxies"
          label="Failed Proxies"
          value={stats?.failedProxies || 0}
          color="text-red-500"
        />
        <div className="bg-secondary/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">Data Transfer</p>
          <p className="text-lg font-semibold">{formatBytes(stats?.bytesTransferred || 0)}</p>
        </div>
      </div>

      {/* Trend Chart */}
      <div className="px-4 pb-4">
        <div className="bg-secondary/30 rounded-lg p-4" data-testid="trend-chart">
          <h3 className="text-sm font-medium mb-4">Request Trends</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="hour" 
                tick={{ fontSize: 10 }} 
                stroke="#9CA3AF"
                tickFormatter={(value) => value.slice(11, 16)}
              />
              <YAxis tick={{ fontSize: 10 }} stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="requests"
                stroke="#8B5CF6"
                strokeWidth={2}
                dot={false}
                name="Requests"
              />
              <Line
                type="monotone"
                dataKey="successRate"
                stroke="#10B981"
                strokeWidth={2}
                dot={false}
                name="Success %"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Proxy Performance Chart */}
      <div className="px-4 pb-4">
        <div className="bg-secondary/30 rounded-lg p-4" data-testid="proxy-performance-chart">
          <h3 className="text-sm font-medium mb-4">Proxy Performance</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={proxyPerformance.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="proxyName" 
                tick={{ fontSize: 10 }} 
                stroke="#9CA3AF"
              />
              <YAxis tick={{ fontSize: 10 }} stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Bar dataKey="successRate" fill="#10B981" name="Success %" />
              <Bar dataKey="avgLatency" fill="#F59E0B" name="Latency (ms)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// Helper Components

interface StatCardProps {
  testId: string;
  icon?: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
  decimals?: number;
  color?: string;
}

function StatCard({ testId, icon, label, value, suffix = '', decimals = 0, color = 'text-foreground' }: StatCardProps) {
  return (
    <div className="bg-secondary/30 rounded-lg p-3" data-testid={testId}>
      <div className="flex items-center gap-2 mb-1">
        {icon && <span className={color}>{icon}</span>}
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <div className="flex items-baseline gap-1">
        <NumberTicker
          value={value}
          decimalPlaces={decimals}
          className={cn('text-2xl font-bold', color)}
        />
        {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}

function getSuccessRateColor(rate: number): string {
  if (rate >= 90) return 'text-green-500';
  if (rate >= 70) return 'text-yellow-500';
  return 'text-red-500';
}

function getLatencyColor(latency: number): string {
  if (latency <= 200) return 'text-green-500';
  if (latency <= 500) return 'text-yellow-500';
  return 'text-red-500';
}

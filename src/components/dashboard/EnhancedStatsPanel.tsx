/**
 * Enhanced Stats Panel Component
 * Displays key metrics with NumberTicker animations
 */

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Activity, Zap, TrendingUp, Globe, CheckCircle, XCircle, RotateCw } from 'lucide-react';
import { NumberTicker } from '@components/ui/number-ticker';
import { BorderBeam } from '@components/ui/border-beam';
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

interface AutomationStats {
  totalTasks: number;
  successfulTasks: number;
  failedTasks: number;
  pendingTasks: number;
  successRate: number;
}

export function EnhancedStatsPanel() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [automationStats, setAutomationStats] = useState<AutomationStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [_error, setError] = useState<Error | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [dashboardResult, automationResult] = await Promise.all([
        window.api.analytics.getDashboardStats() as Promise<{ success: boolean; data?: DashboardStats }>,
        window.api.analytics.getAutomationStats() as Promise<{ success: boolean; data?: AutomationStats }>
      ]);

      if (dashboardResult.success && dashboardResult.data) {
        setStats(dashboardResult.data);
      }
      if (automationResult.success && automationResult.data) {
        setAutomationStats(automationResult.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load stats'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const getSuccessRateColor = (rate: number): string => {
    if (rate >= 90) {return 'text-green-500';}
    if (rate >= 70) {return 'text-yellow-500';}
    return 'text-red-500';
  };

  const getLatencyColor = (latency: number): string => {
    if (latency <= 200) {return 'text-green-500';}
    if (latency <= 500) {return 'text-yellow-500';}
    return 'text-red-500';
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  if (isLoading && !stats) {
    return (
      <div className="p-4 flex items-center justify-center h-full" data-testid="stats-loading">
        <RefreshCw className="animate-spin text-primary" size={24} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-card to-card/80">
      {/* Header */}
      <div className="p-4 border-b border-border/50 flex items-center justify-between">
        <h2 className="text-lg font-semibold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Statistics
        </h2>
        <button
          onClick={fetchStats}
          className="p-2 hover:bg-secondary rounded-lg transition-colors"
          data-testid="refresh-stats"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Main Stats */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3">
          {/* Total Requests */}
          <div className="bg-secondary/30 rounded-lg p-3" data-testid="metric-total-requests">
            <div className="flex items-center gap-2 mb-2">
              <Activity size={16} className="text-purple-500" />
              <span className="text-xs text-muted-foreground">Total Requests</span>
            </div>
            <NumberTicker
              value={stats?.totalRequests || 0}
              className="text-2xl font-bold number-ticker"
              data-testid="ticker-total-requests"
            />
          </div>

          {/* Success Rate */}
          <div className="bg-secondary/30 rounded-lg p-3 relative overflow-hidden" data-testid="metric-success-rate">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className={getSuccessRateColor(stats?.successRate || 0)} />
              <span className="text-xs text-muted-foreground">Success Rate</span>
            </div>
            <div className="flex items-baseline gap-1">
              <NumberTicker
                value={stats?.successRate || 0}
                decimalPlaces={1}
                className={cn('text-2xl font-bold number-ticker', getSuccessRateColor(stats?.successRate || 0))}
                data-testid="ticker-success-rate"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            <span 
              className={cn('absolute bottom-1 right-2 text-xs', getSuccessRateColor(stats?.successRate || 0))}
              data-testid="success-rate-indicator"
            >
              {(stats?.successRate || 0) >= 90 ? '●' : (stats?.successRate || 0) >= 70 ? '●' : '●'}
            </span>
            {(stats?.successRate || 0) >= 90 && (
              <BorderBeam size={30} duration={4} colorFrom="#22c55e" colorTo="#16a34a" />
            )}
          </div>

          {/* Avg Latency */}
          <div 
            className={cn('bg-secondary/30 rounded-lg p-3', getLatencyColor(stats?.avgLatency || 0))}
            data-testid="metric-avg-latency"
          >
            <div className="flex items-center gap-2 mb-2">
              <Zap size={16} />
              <span className="text-xs text-muted-foreground">Avg Latency</span>
            </div>
            <div className="flex items-baseline gap-1">
              <NumberTicker
                value={stats?.avgLatency || 0}
                className="text-2xl font-bold number-ticker"
                data-testid="ticker-avg-latency"
              />
              <span className="text-sm text-muted-foreground">ms</span>
            </div>
          </div>

          {/* Active Proxies */}
          <div className="bg-secondary/30 rounded-lg p-3 relative overflow-hidden" data-testid="metric-active-proxies">
            <div className="flex items-center gap-2 mb-2">
              <Globe size={16} className="text-green-500" />
              <span className="text-xs text-muted-foreground">Active Proxies</span>
            </div>
            <div className="flex items-baseline gap-2">
              <NumberTicker
                value={stats?.activeProxies || 0}
                className="text-2xl font-bold text-green-500 number-ticker"
                data-testid="ticker-active-proxies"
              />
              <span className="text-xs text-muted-foreground">
                / {stats?.totalProxies || 0}
              </span>
            </div>
            {(stats?.activeProxies || 0) > 0 && (
              <BorderBeam size={30} duration={5} colorFrom="#22c55e" colorTo="#16a34a" />
            )}
          </div>
        </div>

        {/* Proxy Summary */}
        <div className="bg-secondary/30 rounded-lg p-3" data-testid="proxy-summary">
          <h3 className="text-sm font-medium mb-3">Proxy Summary</h3>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="flex items-center justify-center gap-1 text-green-500">
                <CheckCircle size={14} />
                <NumberTicker value={stats?.activeProxies || 0} className="font-bold" />
              </div>
              <span className="text-[10px] text-muted-foreground">Active</span>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 text-red-500">
                <XCircle size={14} />
                <NumberTicker value={stats?.failedProxies || 0} className="font-bold" />
              </div>
              <span className="text-[10px] text-muted-foreground">Failed</span>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 text-orange-500">
                <RotateCw size={14} />
                <NumberTicker value={stats?.totalRotations || 0} className="font-bold" />
              </div>
              <span className="text-[10px] text-muted-foreground">Rotations</span>
            </div>
          </div>
        </div>

        {/* Automation Stats */}
        {automationStats && (
          <div className="bg-secondary/30 rounded-lg p-3" data-testid="automation-stats">
            <h3 className="text-sm font-medium mb-3">Automation</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Tasks Completed</span>
                <span className="text-sm font-medium">
                  {formatNumber(automationStats.successfulTasks)} / {formatNumber(automationStats.totalTasks)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Success Rate</span>
                <span className={cn('text-sm font-medium', getSuccessRateColor(automationStats.successRate))}>
                  {automationStats.successRate.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Pending Tasks</span>
                <span className="text-sm font-medium text-yellow-500">
                  {formatNumber(automationStats.pendingTasks)}
                </span>
              </div>
              {/* Progress Bar */}
              <div className="mt-2">
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
                    style={{ width: `${automationStats.successRate}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Data Transfer */}
        <div className="bg-secondary/30 rounded-lg p-3">
          <h3 className="text-sm font-medium mb-2">Data Transfer</h3>
          <p className="text-lg font-bold">
            {formatBytes(stats?.bytesTransferred || 0)}
          </p>
          <span className="text-[10px] text-muted-foreground">Total transferred</span>
        </div>
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) {return '0 B';}
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

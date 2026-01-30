/**
 * useProxyPerformance Hook
 * Proxy performance data fetching with aggregation
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

export interface ProxyPerformanceData {
  proxyId: string;
  proxyName: string;
  successRate: number;
  avgLatency: number;
  totalRequests: number;
  failedRequests: number;
}

export interface AggregateStats {
  avgSuccessRate: number;
  avgLatency: number;
  totalRequests: number;
  totalFailedRequests: number;
}

interface UseProxyPerformanceOptions {
  hours?: number;
  refreshInterval?: number;
}

interface UseProxyPerformanceReturn {
  data: ProxyPerformanceData[] | null;
  isLoading: boolean;
  error: Error | null;
  aggregateStats: AggregateStats | null;
  refresh: () => Promise<void>;
}

export function useProxyPerformance(options: UseProxyPerformanceOptions = {}): UseProxyPerformanceReturn {
  const { hours = 24, refreshInterval } = options;
  const [data, setData] = useState<ProxyPerformanceData[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await window.api.analytics.getProxyPerformance({ hours }) as { success: boolean; data?: ProxyPerformanceData[] };

      if (result.success && result.data) {
        setData(result.data);
      } else if (!result.success) {
        throw new Error('Failed to fetch proxy performance data');
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [hours]);

  const refresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  // Calculate aggregate statistics
  const aggregateStats = useMemo((): AggregateStats | null => {
    if (!data || data.length === 0) return null;

    const totalSuccessRate = data.reduce((sum, p) => sum + p.successRate, 0);
    const totalLatency = data.reduce((sum, p) => sum + p.avgLatency, 0);
    const totalReqs = data.reduce((sum, p) => sum + p.totalRequests, 0);
    const totalFailed = data.reduce((sum, p) => sum + p.failedRequests, 0);

    return {
      avgSuccessRate: Math.round(totalSuccessRate / data.length),
      avgLatency: Math.round(totalLatency / data.length),
      totalRequests: totalReqs,
      totalFailedRequests: totalFailed
    };
  }, [data]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh interval
  useEffect(() => {
    if (!refreshInterval) return;

    const intervalId = setInterval(() => {
      fetchData();
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [refreshInterval, fetchData]);

  return {
    data,
    isLoading,
    error,
    aggregateStats,
    refresh
  };
}

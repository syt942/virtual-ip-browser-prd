/**
 * useDashboardData Hook
 * Real-time dashboard data fetching with auto-refresh
 */

import { useState, useEffect, useCallback } from 'react';

export interface DashboardStats {
  totalProxies: number;
  activeProxies: number;
  failedProxies: number;
  totalRequests: number;
  successRate: number;
  avgLatency: number;
  totalRotations: number;
  bytesTransferred: number;
}

interface UseDashboardDataOptions {
  refreshInterval?: number;
}

interface UseDashboardDataReturn {
  data: DashboardStats | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useDashboardData(options: UseDashboardDataOptions = {}): UseDashboardDataReturn {
  const { refreshInterval } = options;
  const [data, setData] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await window.api.analytics.getDashboardStats() as { success: boolean; data?: DashboardStats };
      
      if (result.success && result.data) {
        setData(result.data);
      } else if (!result.success) {
        throw new Error('Failed to fetch dashboard stats');
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

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
    refresh
  };
}

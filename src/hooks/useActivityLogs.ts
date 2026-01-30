/**
 * useActivityLogs Hook
 * Activity log fetching with filtering support
 */

import { useState, useEffect, useCallback } from 'react';

export interface ActivityLogEntry {
  id: string;
  timestamp: Date;
  level: 'debug' | 'info' | 'warning' | 'error' | 'success';
  category: string;
  message: string;
  metadata?: Record<string, any>;
  sessionId?: string;
  tabId?: string;
  proxyId?: string;
}

export interface ActivityLogFilters {
  level?: string;
  category?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
}

interface UseActivityLogsReturn {
  logs: ActivityLogEntry[];
  isLoading: boolean;
  error: Error | null;
  filters: ActivityLogFilters;
  setFilters: (filters: ActivityLogFilters) => void;
  clearFilters: () => void;
  refresh: () => Promise<void>;
  total: number;
  page: number;
  pageSize: number;
}

const defaultFilters: ActivityLogFilters = {
  page: 1,
  pageSize: 20
};

export function useActivityLogs(): UseActivityLogsReturn {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFiltersState] = useState<ActivityLogFilters>(defaultFilters);
  const [total, setTotal] = useState(0);

  const fetchLogs = useCallback(async (currentFilters: ActivityLogFilters) => {
    try {
      setIsLoading(true);
      setError(null);

      const queryParams: Record<string, any> = { ...currentFilters };
      
      // Only include non-empty filters
      if (currentFilters.level && currentFilters.level !== 'all') {
        queryParams.level = currentFilters.level;
      }
      if (currentFilters.category && currentFilters.category !== 'all') {
        queryParams.category = currentFilters.category;
      }
      if (currentFilters.status && currentFilters.status !== 'all') {
        queryParams.status = currentFilters.status;
      }

      const result = await window.api.analytics.getActivityLogs(queryParams) as { success: boolean; data: any[]; total?: number };

      if (result.success) {
        setLogs(result.data.map((log: any) => ({
          ...log,
          timestamp: new Date(log.timestamp)
        })));
        setTotal(result.total || result.data.length);
      } else {
        throw new Error('Failed to fetch activity logs');
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setFilters = useCallback((newFilters: ActivityLogFilters) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFiltersState(updatedFilters);
    fetchLogs(updatedFilters);
  }, [filters, fetchLogs]);

  const clearFilters = useCallback(() => {
    setFiltersState(defaultFilters);
    fetchLogs(defaultFilters);
  }, [fetchLogs]);

  const refresh = useCallback(async () => {
    await fetchLogs(filters);
  }, [filters, fetchLogs]);

  // Initial fetch
  useEffect(() => {
    fetchLogs(filters);
  }, []);

  return {
    logs,
    isLoading,
    error,
    filters,
    setFilters,
    clearFilters,
    refresh,
    total,
    page: filters.page || 1,
    pageSize: filters.pageSize || 20
  };
}

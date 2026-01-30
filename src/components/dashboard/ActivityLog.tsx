/**
 * Activity Log Component
 * Displays activity logs with filtering by type, date, and status
 */

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@utils/cn';

interface ActivityLogEntry {
  id: string;
  timestamp: Date;
  level: 'debug' | 'info' | 'warning' | 'error' | 'success';
  category: string;
  message: string;
  metadata?: Record<string, unknown>;
  sessionId?: string;
  tabId?: string;
  proxyId?: string;
}

/** Raw log entry from API before date parsing */
interface RawLogEntry {
  id: string;
  timestamp: string;
  level: ActivityLogEntry['level'];
  category: string;
  message: string;
  metadata?: Record<string, unknown>;
  sessionId?: string;
  tabId?: string;
  proxyId?: string;
}

interface ActivityLogFilters {
  level: string;
  category: string;
  status: string;
  startDate: string;
  endDate: string;
  page: number;
}

interface ActivityLogProps {
  enableRealTime?: boolean;
  pageSize?: number;
}

const defaultFilters: ActivityLogFilters = {
  level: 'all',
  category: 'all',
  status: 'all',
  startDate: '',
  endDate: '',
  page: 1
};

const LOG_LEVELS = ['all', 'debug', 'info', 'warning', 'error', 'success'];
const CATEGORIES = ['all', 'proxy', 'automation', 'privacy', 'system', 'navigation'];

export function ActivityLog({ enableRealTime: _enableRealTime = false, pageSize = 20 }: ActivityLogProps) {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ActivityLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFilters] = useState<ActivityLogFilters>(defaultFilters);
  const [total, setTotal] = useState(0);

  const fetchLogs = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const queryParams: Record<string, string | number> = {
        page: filters.page,
        pageSize
      };

      if (filters.level !== 'all') queryParams.level = filters.level;
      if (filters.category !== 'all') queryParams.category = filters.category;
      if (filters.status !== 'all') queryParams.status = filters.status;
      if (filters.startDate) queryParams.startDate = filters.startDate;
      if (filters.endDate) queryParams.endDate = filters.endDate;

      const result = await window.api.analytics.getActivityLogs(queryParams) as { success: boolean; data?: RawLogEntry[]; total?: number };

      if (result.success && result.data) {
        const parsedLogs = result.data.map((log: RawLogEntry) => ({
          ...log,
          timestamp: new Date(log.timestamp)
        }));
        setLogs(parsedLogs);
        setTotal(result.total || parsedLogs.length);
        applyClientFilters(parsedLogs);
      } else if (!result.success) {
        throw new Error('Failed to fetch activity logs');
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [filters, pageSize]);

  const applyClientFilters = useCallback((logsToFilter: ActivityLogEntry[]) => {
    let filtered = [...logsToFilter];

    if (filters.level !== 'all') {
      filtered = filtered.filter(log => log.level === filters.level);
    }
    if (filters.category !== 'all') {
      filtered = filtered.filter(log => log.category === filters.category);
    }

    setFilteredLogs(filtered);
  }, [filters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    applyClientFilters(logs);
  }, [filters.level, filters.category, logs, applyClientFilters]);

  const handleFilterChange = (key: keyof ActivityLogFilters, value: string | number) => {
    setFilters(prev => ({ ...prev, [key]: value, page: key === 'page' ? value as number : 1 }));
  };

  const clearFilters = () => {
    setFilters(defaultFilters);
  };

  const goToPage = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const totalPages = Math.ceil(total / pageSize);

  const getLevelBadgeClass = (level: string) => {
    switch (level) {
      case 'error':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'warning':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'success':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'info':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'debug':
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'proxy':
        return 'bg-purple-500/10 text-purple-500';
      case 'automation':
        return 'bg-cyan-500/10 text-cyan-500';
      case 'privacy':
        return 'bg-emerald-500/10 text-emerald-500';
      case 'system':
        return 'bg-orange-500/10 text-orange-500';
      case 'navigation':
        return 'bg-pink-500/10 text-pink-500';
      default:
        return 'bg-gray-500/10 text-gray-500';
    }
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-card to-card/80">
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Activity Log
          </h2>
          <button
            onClick={fetchLogs}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
            data-testid="refresh-logs"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Filters */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={filters.level}
              onChange={(e) => handleFilterChange('level', e.target.value)}
              className="bg-background/50 border border-border/50 rounded-lg px-2 py-1 text-xs"
              data-testid="filter-level"
            >
              {LOG_LEVELS.map(level => (
                <option key={level} value={level}>
                  {level === 'all' ? 'All Levels' : level.charAt(0).toUpperCase() + level.slice(1)}
                </option>
              ))}
            </select>

            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="bg-background/50 border border-border/50 rounded-lg px-2 py-1 text-xs"
              data-testid="filter-category"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>

            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="bg-background/50 border border-border/50 rounded-lg px-2 py-1 text-xs"
              data-testid="filter-status"
            >
              <option value="all">All Status</option>
              <option value="success">Success</option>
              <option value="failure">Failure</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="bg-background/50 border border-border/50 rounded-lg px-2 py-1 text-xs"
              data-testid="filter-date-start"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="bg-background/50 border border-border/50 rounded-lg px-2 py-1 text-xs"
              data-testid="filter-date-end"
            />
            <button
              onClick={clearFilters}
              className="p-1 hover:bg-secondary rounded transition-colors text-muted-foreground hover:text-foreground"
              data-testid="clear-filters"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Log List */}
      <div className="flex-1 overflow-y-auto p-2" data-testid="activity-log-list">
        {isLoading && logs.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <RefreshCw className="animate-spin text-primary" size={24} />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-red-500">
            {error.message}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            No activity logs found
          </div>
        ) : (
          <div className="space-y-1">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-2 rounded-lg bg-secondary/20 hover:bg-secondary/40 transition-colors"
                data-testid={`log-entry-${log.id}`}
                data-level={log.level}
                data-category={log.category}
              >
                <div className="flex items-start gap-2">
                  <span
                    className={cn(
                      'px-1.5 py-0.5 rounded text-[10px] font-medium border',
                      getLevelBadgeClass(log.level)
                    )}
                  >
                    {log.level.toUpperCase()}
                  </span>
                  <span
                    className={cn(
                      'px-1.5 py-0.5 rounded text-[10px] font-medium',
                      getCategoryBadgeClass(log.category)
                    )}
                  >
                    {log.category}
                  </span>
                  <span
                    className="text-[10px] text-muted-foreground ml-auto"
                    data-testid={`timestamp-${log.id}`}
                  >
                    {format(log.timestamp, 'HH:mm:ss')}
                  </span>
                </div>
                <p className="text-xs mt-1 text-foreground/90">{log.message}</p>
                {log.metadata && (
                  <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                    {JSON.stringify(log.metadata)}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          className="p-2 border-t border-border/50 flex items-center justify-between"
          data-testid="pagination"
        >
          <span className="text-xs text-muted-foreground">
            Page {filters.page} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => goToPage(filters.page - 1)}
              disabled={filters.page <= 1}
              className="p-1 hover:bg-secondary rounded disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="prev-page"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => goToPage(filters.page + 1)}
              disabled={filters.page >= totalPages}
              className="p-1 hover:bg-secondary rounded disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="next-page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

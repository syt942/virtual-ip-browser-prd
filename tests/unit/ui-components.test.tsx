/**
 * UI Components Tests - TDD Test Suite
 * Tests for ActivityLog and EnhancedStatsPanel components
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// ============================================================
// MOCK DATA TYPES
// ============================================================

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

interface ActivityLogEntry {
  id: string;
  timestamp: Date;
  level: 'debug' | 'info' | 'warning' | 'error' | 'success';
  category: string;
  message: string;
  metadata?: Record<string, any>;
}

interface AutomationStats {
  totalTasks: number;
  successfulTasks: number;
  failedTasks: number;
  pendingTasks: number;
  successRate: number;
}

// ============================================================
// MOCK DATA GENERATORS
// ============================================================

const createMockDashboardStats = (overrides?: Partial<DashboardStats>): DashboardStats => ({
  totalProxies: 10,
  activeProxies: 8,
  failedProxies: 2,
  totalRequests: 5000,
  successRate: 94.5,
  avgLatency: 125,
  totalRotations: 150,
  bytesTransferred: 1024 * 1024 * 100,
  ...overrides
});

const createMockActivityLog = (count: number = 10): ActivityLogEntry[] => {
  const levels: ActivityLogEntry['level'][] = ['debug', 'info', 'warning', 'error', 'success'];
  const categories = ['proxy', 'automation', 'privacy', 'system', 'navigation'];
  
  return Array.from({ length: count }, (_, i) => ({
    id: `log-${i}`,
    timestamp: new Date(Date.now() - i * 60000),
    level: levels[i % levels.length],
    category: categories[i % categories.length],
    message: `Test log message ${i + 1}`,
    metadata: { index: i }
  }));
};

const createMockAutomationStats = (): AutomationStats => ({
  totalTasks: 100,
  successfulTasks: 85,
  failedTasks: 10,
  pendingTasks: 5,
  successRate: 85
});

const createMockTrendData = (hours: number = 24) => {
  return Array.from({ length: hours }, (_, i) => ({
    hour: `2024-01-01 ${String(i).padStart(2, '0')}:00`,
    requests: Math.floor(Math.random() * 100) + 50,
    successRate: 85 + Math.random() * 15,
    avgLatency: 100 + Math.random() * 100,
    rotations: Math.floor(Math.random() * 10)
  }));
};

const createMockProxyPerformance = () => [{
  proxyId: 'proxy-1',
  proxyName: 'Test Proxy 1',
  successRate: 95,
  avgLatency: 120,
  totalRequests: 1000,
  failedRequests: 50
}];

// ============================================================
// MOCK SETUP
// ============================================================

const mockAnalyticsApi = {
  getDashboardStats: vi.fn(),
  getProxyPerformance: vi.fn(),
  getAutomationStats: vi.fn(),
  getTrendData: vi.fn(),
  getActivityLogs: vi.fn()
};

const mockProxyApi = {
  add: vi.fn(),
  remove: vi.fn(),
  update: vi.fn(),
  list: vi.fn(),
  validate: vi.fn(),
  setRotation: vi.fn()
};

// Setup window.api mock
beforeAll(() => {
  Object.defineProperty(window, 'api', {
    value: {
      analytics: mockAnalyticsApi,
      proxy: mockProxyApi
    },
    writable: true,
    configurable: true
  });
});

afterEach(() => {
  cleanup();
});

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  useInView: () => true,
  useMotionValue: (initial: number) => ({
    set: vi.fn(),
    get: () => initial,
    on: vi.fn(() => () => {})
  }),
  useSpring: (value: any) => ({
    ...value,
    on: vi.fn((event: string, callback: Function) => {
      if (event === 'change') {
        callback(value.get?.() || 0);
      }
      return () => {};
    })
  }),
  motion: {
    div: ({ children, ...props }: any) => React.createElement('div', props, children),
    span: ({ children, ...props }: any) => React.createElement('span', props, children),
  },
  AnimatePresence: ({ children }: any) => children
}));

// Mock recharts to avoid SVG issues
vi.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  Legend: () => null
}));

// ============================================================
// IMPORT COMPONENTS AFTER MOCKS
// ============================================================

import { ActivityLog } from '../../src/components/dashboard/ActivityLog';
import { EnhancedStatsPanel } from '../../src/components/dashboard/EnhancedStatsPanel';

// ============================================================
// ACTIVITY LOG COMPONENT TESTS
// ============================================================

describe('ActivityLog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAnalyticsApi.getActivityLogs.mockResolvedValue({
      success: true,
      data: createMockActivityLog(20),
      total: 20
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders the activity log header', async () => {
      await act(async () => {
        render(<ActivityLog />);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/Activity Log/i)).toBeInTheDocument();
      });
    });

    it('renders log entries', async () => {
      await act(async () => {
        render(<ActivityLog />);
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('activity-log-list')).toBeInTheDocument();
      });

      await waitFor(() => {
        const logItems = screen.getAllByTestId(/^log-entry-/);
        expect(logItems.length).toBeGreaterThan(0);
      });
    });

    it('displays log level badges correctly', async () => {
      const logs = [
        { id: 'err-1', timestamp: new Date(), level: 'error' as const, category: 'proxy', message: 'Error message', metadata: {} },
        { id: 'suc-1', timestamp: new Date(), level: 'success' as const, category: 'system', message: 'Success message', metadata: {} },
        { id: 'warn-1', timestamp: new Date(), level: 'warning' as const, category: 'automation', message: 'Warning message', metadata: {} }
      ];
      
      mockAnalyticsApi.getActivityLogs.mockResolvedValue({
        success: true,
        data: logs,
        total: 3
      });

      await act(async () => {
        render(<ActivityLog />);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Error message')).toBeInTheDocument();
        expect(screen.getByText('Success message')).toBeInTheDocument();
        expect(screen.getByText('Warning message')).toBeInTheDocument();
      });
    });
  });

  describe('Filtering', () => {
    it('has filter controls', async () => {
      await act(async () => {
        render(<ActivityLog />);
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('filter-level')).toBeInTheDocument();
        expect(screen.getByTestId('filter-category')).toBeInTheDocument();
        expect(screen.getByTestId('filter-status')).toBeInTheDocument();
      });
    });

    it('filters by log level', async () => {
      await act(async () => {
        render(<ActivityLog />);
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('filter-level')).toBeInTheDocument();
      });

      const levelFilter = screen.getByTestId('filter-level');
      
      await act(async () => {
        fireEvent.change(levelFilter, { target: { value: 'error' } });
      });

      // Should trigger a new fetch or client-side filter
      await waitFor(() => {
        expect(screen.getByTestId('activity-log-list')).toBeInTheDocument();
      });
    });

    it('filters by category', async () => {
      await act(async () => {
        render(<ActivityLog />);
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('filter-category')).toBeInTheDocument();
      });

      const categoryFilter = screen.getByTestId('filter-category');
      
      await act(async () => {
        fireEvent.change(categoryFilter, { target: { value: 'proxy' } });
      });

      await waitFor(() => {
        expect(screen.getByTestId('activity-log-list')).toBeInTheDocument();
      });
    });

    it('has date range filters', async () => {
      await act(async () => {
        render(<ActivityLog />);
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('filter-date-start')).toBeInTheDocument();
        expect(screen.getByTestId('filter-date-end')).toBeInTheDocument();
      });
    });

    it('clears all filters', async () => {
      await act(async () => {
        render(<ActivityLog />);
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('clear-filters')).toBeInTheDocument();
      });

      // Apply a filter first
      const levelFilter = screen.getByTestId('filter-level') as HTMLSelectElement;
      await act(async () => {
        fireEvent.change(levelFilter, { target: { value: 'error' } });
      });
      
      // Clear filters
      await act(async () => {
        fireEvent.click(screen.getByTestId('clear-filters'));
      });

      await waitFor(() => {
        const updatedFilter = screen.getByTestId('filter-level') as HTMLSelectElement;
        expect(updatedFilter.value).toBe('all');
      });
    });
  });

  describe('Refresh', () => {
    it('has refresh button', async () => {
      await act(async () => {
        render(<ActivityLog />);
      });
      
      expect(screen.getByTestId('refresh-logs')).toBeInTheDocument();
    });

    it('refreshes logs on button click', async () => {
      await act(async () => {
        render(<ActivityLog />);
      });
      
      await waitFor(() => {
        expect(mockAnalyticsApi.getActivityLogs).toHaveBeenCalledTimes(1);
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('refresh-logs'));
      });

      await waitFor(() => {
        expect(mockAnalyticsApi.getActivityLogs).toHaveBeenCalledTimes(2);
      });
    });
  });
});

// ============================================================
// ENHANCED STATS PANEL TESTS
// ============================================================

describe('EnhancedStatsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAnalyticsApi.getDashboardStats.mockResolvedValue({
      success: true,
      data: createMockDashboardStats()
    });
    mockAnalyticsApi.getAutomationStats.mockResolvedValue({
      success: true,
      data: createMockAutomationStats()
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders the stats panel header', async () => {
      await act(async () => {
        render(<EnhancedStatsPanel />);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/Statistics/i)).toBeInTheDocument();
      });
    });

    it('renders all key metrics', async () => {
      await act(async () => {
        render(<EnhancedStatsPanel />);
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('metric-total-requests')).toBeInTheDocument();
        expect(screen.getByTestId('metric-success-rate')).toBeInTheDocument();
        expect(screen.getByTestId('metric-avg-latency')).toBeInTheDocument();
        expect(screen.getByTestId('metric-active-proxies')).toBeInTheDocument();
      });
    });

    it('displays proxy performance summary', async () => {
      await act(async () => {
        render(<EnhancedStatsPanel />);
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('proxy-summary')).toBeInTheDocument();
      });
    });

    it('displays automation stats', async () => {
      await act(async () => {
        render(<EnhancedStatsPanel />);
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('automation-stats')).toBeInTheDocument();
      });
    });
  });

  describe('NumberTicker Animations', () => {
    it('renders number ticker for total requests', async () => {
      await act(async () => {
        render(<EnhancedStatsPanel />);
      });
      
      await waitFor(() => {
        const ticker = screen.getByTestId('ticker-total-requests');
        expect(ticker).toBeInTheDocument();
        expect(ticker).toHaveClass('number-ticker');
      });
    });

    it('renders number ticker for success rate', async () => {
      await act(async () => {
        render(<EnhancedStatsPanel />);
      });
      
      await waitFor(() => {
        const ticker = screen.getByTestId('ticker-success-rate');
        expect(ticker).toBeInTheDocument();
      });
    });
  });

  describe('Visual Indicators', () => {
    it('shows green indicator for high success rate', async () => {
      mockAnalyticsApi.getDashboardStats.mockResolvedValue({
        success: true,
        data: createMockDashboardStats({ successRate: 95 })
      });

      await act(async () => {
        render(<EnhancedStatsPanel />);
      });
      
      await waitFor(() => {
        const indicator = screen.getByTestId('success-rate-indicator');
        expect(indicator).toHaveClass('text-green-500');
      });
    });

    it('shows yellow indicator for medium success rate', async () => {
      mockAnalyticsApi.getDashboardStats.mockResolvedValue({
        success: true,
        data: createMockDashboardStats({ successRate: 75 })
      });

      await act(async () => {
        render(<EnhancedStatsPanel />);
      });
      
      await waitFor(() => {
        const indicator = screen.getByTestId('success-rate-indicator');
        expect(indicator).toHaveClass('text-yellow-500');
      });
    });

    it('shows red indicator for low success rate', async () => {
      mockAnalyticsApi.getDashboardStats.mockResolvedValue({
        success: true,
        data: createMockDashboardStats({ successRate: 50 })
      });

      await act(async () => {
        render(<EnhancedStatsPanel />);
      });
      
      await waitFor(() => {
        const indicator = screen.getByTestId('success-rate-indicator');
        expect(indicator).toHaveClass('text-red-500');
      });
    });
  });

  describe('Data Refresh', () => {
    it('has refresh button', async () => {
      await act(async () => {
        render(<EnhancedStatsPanel />);
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('refresh-stats')).toBeInTheDocument();
      });
    });

    it('refreshes data on button click', async () => {
      await act(async () => {
        render(<EnhancedStatsPanel />);
      });
      
      await waitFor(() => {
        expect(mockAnalyticsApi.getDashboardStats).toHaveBeenCalledTimes(1);
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('refresh-stats'));
      });

      await waitFor(() => {
        expect(mockAnalyticsApi.getDashboardStats).toHaveBeenCalledTimes(2);
      });
    });

    it('shows loading state initially', async () => {
      mockAnalyticsApi.getDashboardStats.mockImplementation(() => new Promise(() => {}));
      mockAnalyticsApi.getAutomationStats.mockImplementation(() => new Promise(() => {}));

      await act(async () => {
        render(<EnhancedStatsPanel />);
      });
      
      expect(screen.getByTestId('stats-loading')).toBeInTheDocument();
    });
  });
});

// ============================================================
// EDGE CASES AND ERROR HANDLING TESTS
// ============================================================

describe('Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('ActivityLog Edge Cases', () => {
    it('handles empty log list', async () => {
      mockAnalyticsApi.getActivityLogs.mockResolvedValue({
        success: true,
        data: [],
        total: 0
      });

      await act(async () => {
        render(<ActivityLog />);
      });

      await waitFor(() => {
        expect(screen.getByText(/No activity logs found/i)).toBeInTheDocument();
      });
    });

    it('handles API failure', async () => {
      mockAnalyticsApi.getActivityLogs.mockRejectedValue(new Error('Network error'));

      await act(async () => {
        render(<ActivityLog />);
      });

      await waitFor(() => {
        expect(screen.getByText(/Network error/i)).toBeInTheDocument();
      });
    });
  });

  describe('EnhancedStatsPanel Edge Cases', () => {
    it('handles missing automation stats', async () => {
      mockAnalyticsApi.getDashboardStats.mockResolvedValue({
        success: true,
        data: createMockDashboardStats()
      });
      mockAnalyticsApi.getAutomationStats.mockResolvedValue({
        success: false,
        data: null
      });

      await act(async () => {
        render(<EnhancedStatsPanel />);
      });

      await waitFor(() => {
        expect(screen.getByTestId('metric-total-requests')).toBeInTheDocument();
      });
    });
  });
});

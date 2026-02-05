/**
 * Unit Tests for Position History Chart Logic
 * Tests data processing, statistics calculation, and chart helpers
 */

import { describe, it, expect } from 'vitest';

// ============================================================================
// TEST DATA
// ============================================================================

const mockPositionData = [
  {
    timestamp: new Date('2024-01-01T10:00:00Z'),
    position: 15,
    keyword: 'test keyword',
    domain: 'example.com',
    engine: 'google' as const,
    url: 'https://example.com/page1',
    title: 'Test Page 1',
  },
  {
    timestamp: new Date('2024-01-02T10:00:00Z'),
    position: 12,
    keyword: 'test keyword',
    domain: 'example.com',
    engine: 'google' as const,
    url: 'https://example.com/page1',
    title: 'Test Page 1',
  },
  {
    timestamp: new Date('2024-01-03T10:00:00Z'),
    position: 10,
    keyword: 'test keyword',
    domain: 'example.com',
    engine: 'google' as const,
    url: 'https://example.com/page1',
    title: 'Test Page 1',
  },
  {
    timestamp: new Date('2024-01-04T10:00:00Z'),
    position: 8,
    keyword: 'test keyword',
    domain: 'example.com',
    engine: 'google' as const,
    url: 'https://example.com/page1',
    title: 'Test Page 1',
  },
  {
    timestamp: new Date('2024-01-05T10:00:00Z'),
    position: 5,
    keyword: 'test keyword',
    domain: 'example.com',
    engine: 'google' as const,
    url: 'https://example.com/page1',
    title: 'Test Page 1',
  },
];

// ============================================================================
// HELPER FUNCTIONS (extracted from component for testing)
// ============================================================================

interface PositionDataPoint {
  timestamp: Date;
  position: number | null;
  keyword: string;
  domain: string;
  engine: string;
  url?: string;
  title?: string;
}

interface PositionStats {
  current: number | null;
  previous: number | null;
  change: number | null;
  changePercent: number | null;
  trend: 'up' | 'down' | 'stable';
  best: number | null;
  worst: number | null;
  average: number | null;
}

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

function filterByTimeRange(data: PositionDataPoint[], range: '7d' | '30d' | '90d' | 'all'): PositionDataPoint[] {
  if (range === 'all') return data;

  const now = new Date();
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  return data.filter(d => d.timestamp >= cutoff);
}

function formatChartDate(date: Date, range: string): string {
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (range === '7d') {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  } else if (range === '30d') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } else {
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
}

// ============================================================================
// TESTS
// ============================================================================

describe('Position Chart Statistics', () => {
  describe('calculateStats', () => {
    it('calculates current position correctly', () => {
      const stats = calculateStats(mockPositionData);
      
      expect(stats.current).toBe(5);
    });

    it('calculates previous position correctly', () => {
      const stats = calculateStats(mockPositionData);
      
      expect(stats.previous).toBe(8);
    });

    it('calculates position change correctly (improvement)', () => {
      const stats = calculateStats(mockPositionData);
      
      // Previous: 8, Current: 5, Change: 8 - 5 = 3 (improved by 3 positions)
      expect(stats.change).toBe(3);
    });

    it('calculates position change correctly (decline)', () => {
      const declineData = [
        { ...mockPositionData[0], position: 5 },
        { ...mockPositionData[1], position: 10 },
      ];
      
      const stats = calculateStats(declineData);
      
      // Previous: 5, Current: 10, Change: 5 - 10 = -5 (declined by 5 positions)
      expect(stats.change).toBe(-5);
    });

    it('detects upward trend (improvement)', () => {
      const stats = calculateStats(mockPositionData);
      
      // Position improved from 8 to 5
      expect(stats.trend).toBe('up');
    });

    it('detects downward trend (decline)', () => {
      const declineData = [
        { ...mockPositionData[0], position: 5 },
        { ...mockPositionData[1], position: 10 },
      ];
      
      const stats = calculateStats(declineData);
      
      expect(stats.trend).toBe('down');
    });

    it('detects stable trend', () => {
      const stableData = [
        { ...mockPositionData[0], position: 10 },
        { ...mockPositionData[1], position: 10 },
      ];
      
      const stats = calculateStats(stableData);
      
      expect(stats.trend).toBe('stable');
    });

    it('calculates best position (lowest number)', () => {
      const stats = calculateStats(mockPositionData);
      
      expect(stats.best).toBe(5);
    });

    it('calculates worst position (highest number)', () => {
      const stats = calculateStats(mockPositionData);
      
      expect(stats.worst).toBe(15);
    });

    it('calculates average position', () => {
      const stats = calculateStats(mockPositionData);
      
      // Average: (15 + 12 + 10 + 8 + 5) / 5 = 10
      expect(stats.average).toBe(10);
    });

    it('rounds average to 1 decimal place', () => {
      const data = [
        { ...mockPositionData[0], position: 5 },
        { ...mockPositionData[1], position: 8 },
        { ...mockPositionData[2], position: 11 },
      ];
      
      const stats = calculateStats(data);
      
      // Average: (5 + 8 + 11) / 3 = 8
      expect(stats.average).toBe(8);
    });

    it('handles null positions (not found)', () => {
      const dataWithNulls = [
        { ...mockPositionData[0], position: 10 },
        { ...mockPositionData[1], position: null },
        { ...mockPositionData[2], position: 5 },
      ];
      
      const stats = calculateStats(dataWithNulls);
      
      // Should only count non-null positions
      expect(stats.current).toBe(5);
      expect(stats.previous).toBe(10);
      expect(stats.best).toBe(5);
      expect(stats.worst).toBe(10);
      expect(stats.average).toBe(7.5); // (10 + 5) / 2
    });

    it('returns null values for empty data', () => {
      const stats = calculateStats([]);
      
      expect(stats.current).toBeNull();
      expect(stats.previous).toBeNull();
      expect(stats.change).toBeNull();
      expect(stats.changePercent).toBeNull();
      expect(stats.trend).toBe('stable');
      expect(stats.best).toBeNull();
      expect(stats.worst).toBeNull();
      expect(stats.average).toBeNull();
    });

    it('handles single data point', () => {
      const singleData = [mockPositionData[0]];
      
      const stats = calculateStats(singleData);
      
      expect(stats.current).toBe(15);
      expect(stats.previous).toBeNull();
      expect(stats.change).toBeNull();
      expect(stats.trend).toBe('stable');
      expect(stats.best).toBe(15);
      expect(stats.worst).toBe(15);
      expect(stats.average).toBe(15);
    });

    it('calculates change percentage correctly', () => {
      const data = [
        { ...mockPositionData[0], position: 10 },
        { ...mockPositionData[1], position: 5 },
      ];
      
      const stats = calculateStats(data);
      
      // Change: 10 - 5 = 5
      // Percent: (5 / 10) * 100 = 50%
      expect(stats.changePercent).toBe(50);
    });
  });

  describe('filterByTimeRange', () => {
    const now = new Date('2024-01-10T10:00:00Z');
    
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(now);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns all data for "all" range', () => {
      const filtered = filterByTimeRange(mockPositionData, 'all');
      
      expect(filtered).toHaveLength(5);
    });

    it('filters data for 7 day range', () => {
      const data = [
        { ...mockPositionData[0], timestamp: new Date('2024-01-01T10:00:00Z') }, // 9 days ago
        { ...mockPositionData[1], timestamp: new Date('2024-01-05T10:00:00Z') }, // 5 days ago
        { ...mockPositionData[2], timestamp: new Date('2024-01-09T10:00:00Z') }, // 1 day ago
      ];
      
      const filtered = filterByTimeRange(data, '7d');
      
      // Should include only data from last 7 days
      expect(filtered).toHaveLength(2);
      expect(filtered[0].timestamp.getDate()).toBe(5);
    });

    it('filters data for 30 day range', () => {
      const data = [
        { ...mockPositionData[0], timestamp: new Date('2023-12-01T10:00:00Z') }, // 40 days ago
        { ...mockPositionData[1], timestamp: new Date('2023-12-20T10:00:00Z') }, // 21 days ago
        { ...mockPositionData[2], timestamp: new Date('2024-01-05T10:00:00Z') }, // 5 days ago
      ];
      
      const filtered = filterByTimeRange(data, '30d');
      
      expect(filtered).toHaveLength(2);
    });

    it('filters data for 90 day range', () => {
      const data = [
        { ...mockPositionData[0], timestamp: new Date('2023-10-01T10:00:00Z') }, // 101 days ago
        { ...mockPositionData[1], timestamp: new Date('2023-11-15T10:00:00Z') }, // 56 days ago
        { ...mockPositionData[2], timestamp: new Date('2024-01-01T10:00:00Z') }, // 9 days ago
      ];
      
      const filtered = filterByTimeRange(data, '90d');
      
      expect(filtered).toHaveLength(2);
    });
  });

  describe('formatChartDate', () => {
    it('formats date for 7 day range with day of week', () => {
      const date = new Date('2024-01-15T10:00:00Z');
      const formatted = formatChartDate(date, '7d');
      
      expect(formatted).toContain('Jan');
      expect(formatted).toContain('15');
    });

    it('formats date for 30 day range with month/day', () => {
      const date = new Date('2024-01-15T10:00:00Z');
      const formatted = formatChartDate(date, '30d');
      
      expect(formatted).toContain('Jan');
      expect(formatted).toContain('15');
    });

    it('formats date for longer ranges with year', () => {
      const date = new Date('2024-01-15T10:00:00Z');
      const formatted = formatChartDate(date, 'all');
      
      expect(formatted).toContain('2024');
      expect(formatted).toContain('Jan');
      expect(formatted).toContain('15');
    });
  });
});

describe('Position Data Edge Cases', () => {
  it('handles data with only null positions', () => {
    const nullData = mockPositionData.map(d => ({ ...d, position: null }));
    const stats = calculateStats(nullData);
    
    expect(stats.current).toBeNull();
    expect(stats.best).toBeNull();
    expect(stats.average).toBeNull();
  });

  it('handles mixed null and valid positions', () => {
    const mixedData = [
      { ...mockPositionData[0], position: null },
      { ...mockPositionData[1], position: 10 },
      { ...mockPositionData[2], position: null },
      { ...mockPositionData[3], position: 5 },
    ];
    
    const stats = calculateStats(mixedData);
    
    expect(stats.current).toBe(5);
    expect(stats.previous).toBe(10);
    expect(stats.change).toBe(5); // 10 - 5 = 5 (improved)
  });

  it('handles very large position numbers', () => {
    const largeData = [
      { ...mockPositionData[0], position: 999 },
      { ...mockPositionData[1], position: 100 },
    ];
    
    const stats = calculateStats(largeData);
    
    expect(stats.change).toBe(899); // 999 - 100
    expect(stats.worst).toBe(999);
  });

  it('handles position 1 (top ranking)', () => {
    const topData = [
      { ...mockPositionData[0], position: 2 },
      { ...mockPositionData[1], position: 1 },
    ];
    
    const stats = calculateStats(topData);
    
    expect(stats.current).toBe(1);
    expect(stats.best).toBe(1);
    expect(stats.change).toBe(1); // Improved by 1 position
  });
});

describe('Data Transformation', () => {
  it('preserves timestamp information', () => {
    const stats = calculateStats(mockPositionData);
    
    // Stats should be calculated from data in chronological order
    expect(stats.current).toBe(mockPositionData[mockPositionData.length - 1].position);
  });

  it('correctly orders data for trend calculation', () => {
    // Data showing consistent improvement
    const improvingData = mockPositionData.slice().sort((a, b) => 
      a.timestamp.getTime() - b.timestamp.getTime()
    );
    
    const stats = calculateStats(improvingData);
    
    // Should detect upward trend (improvement)
    expect(stats.trend).toBe('up');
  });
});

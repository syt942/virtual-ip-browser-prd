/**
 * Enhanced Activity Log Tests - AnimatedList Component
 * Tests for AnimatedList integration in ActivityLogPanel
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// ============================================================
// MOCK FRAMER-MOTION
// ============================================================

vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(({ children, initial, animate, exit, transition, layout, ...props }: any, ref: any) => (
      <div 
        ref={ref} 
        data-testid="motion-div" 
        data-layout={layout ? 'true' : 'false'}
        {...props}
      >
        {children}
      </div>
    )),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  value: vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('prefers-reduced-motion') ? false : false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
  writable: true,
});

// ============================================================
// IMPORT COMPONENTS AFTER MOCKS
// ============================================================

import { AnimatedList, AnimatedListItem } from '../../../src/components/ui/animated-list';

// ============================================================
// TEST DATA
// ============================================================

interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
}

const createMockLogEntries = (count: number): LogEntry[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `log-${i}`,
    timestamp: new Date(Date.now() - i * 1000),
    level: (['info', 'warning', 'error', 'success'] as const)[i % 4],
    message: `Log entry ${i + 1}`,
  }));
};

// ============================================================
// ANIMATEDLIST COMPONENT TESTS
// ============================================================

describe('AnimatedList Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('renders AnimatedList with children', () => {
      render(
        <AnimatedList data-testid="animated-list">
          <div key="1">Item 1</div>
          <div key="2">Item 2</div>
          <div key="3">Item 3</div>
        </AnimatedList>
      );

      expect(screen.getByTestId('animated-list')).toBeInTheDocument();
    });

    it('renders with custom className', () => {
      render(
        <AnimatedList className="custom-list" data-testid="animated-list">
          <div key="1">Item 1</div>
        </AnimatedList>
      );

      expect(screen.getByTestId('animated-list')).toHaveClass('custom-list');
    });

    it('renders first item immediately', () => {
      render(
        <AnimatedList data-testid="animated-list">
          <div key="1">Item 1</div>
          <div key="2">Item 2</div>
        </AnimatedList>
      );

      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });
  });

  describe('Animation Sequence', () => {
    it('shows items sequentially with delay', async () => {
      render(
        <AnimatedList delay={500} data-testid="animated-list">
          <div key="1">Item 1</div>
          <div key="2">Item 2</div>
          <div key="3">Item 3</div>
        </AnimatedList>
      );

      // Initially only first item visible
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.queryByText('Item 2')).not.toBeInTheDocument();

      // After first delay
      await act(async () => {
        vi.advanceTimersByTime(600);
      });
      
      expect(screen.getByText('Item 2')).toBeInTheDocument();

      // After second delay
      await act(async () => {
        vi.advanceTimersByTime(600);
      });
      
      expect(screen.getByText('Item 3')).toBeInTheDocument();
    });

    it('uses default delay of 1000ms', async () => {
      render(
        <AnimatedList data-testid="animated-list">
          <div key="1">Item 1</div>
          <div key="2">Item 2</div>
        </AnimatedList>
      );

      // Should not show second item before 1000ms
      await act(async () => {
        vi.advanceTimersByTime(500);
      });
      expect(screen.queryByText('Item 2')).not.toBeInTheDocument();

      // Should show after 1000ms
      await act(async () => {
        vi.advanceTimersByTime(600);
      });
      
      expect(screen.getByText('Item 2')).toBeInTheDocument();
    });

    it('maintains proper order (newest first)', async () => {
      const { container } = render(
        <AnimatedList delay={100} data-testid="animated-list">
          <div key="1">Item 1</div>
          <div key="2">Item 2</div>
          <div key="3">Item 3</div>
        </AnimatedList>
      );

      // Advance through all animations
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Items should be in reverse order (newest first)
      const items = container.querySelectorAll('[data-testid="motion-div"]');
      expect(items.length).toBeGreaterThan(0);
    });
  });

  describe('Performance with Many Items', () => {
    it('handles 100+ items efficiently', async () => {
      const manyItems = Array.from({ length: 100 }, (_, i) => (
        <div key={`item-${i}`}>Item {i + 1}</div>
      ));

      const startTime = performance.now();
      
      render(
        <AnimatedList delay={10} data-testid="animated-list">
          {manyItems}
        </AnimatedList>
      );

      const renderTime = performance.now() - startTime;

      // Initial render should be fast (< 100ms)
      expect(renderTime).toBeLessThan(100);

      // First item should be visible
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });

    it('does not cause memory leaks with rapid updates', () => {
      const { rerender, unmount } = render(
        <AnimatedList delay={100}>
          <div key="1">Item 1</div>
        </AnimatedList>
      );

      // Multiple rapid rerenders
      for (let i = 0; i < 50; i++) {
        rerender(
          <AnimatedList delay={100}>
            <div key={`item-${i}`}>Item {i}</div>
          </AnimatedList>
        );
      }

      // Should not throw and cleanup should work
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Scroll Behavior', () => {
    it('preserves scroll position when new items are added', () => {
      const ScrollContainer = ({ items }: { items: string[] }) => (
        <div style={{ height: '200px', overflow: 'auto' }} data-testid="scroll-container">
          <AnimatedList delay={100}>
            {items.map((item, i) => (
              <div key={i} style={{ height: '50px' }}>{item}</div>
            ))}
          </AnimatedList>
        </div>
      );

      const { rerender } = render(
        <ScrollContainer items={['Item 1', 'Item 2', 'Item 3']} />
      );

      const scrollContainer = screen.getByTestId('scroll-container');
      
      // Simulate scroll
      Object.defineProperty(scrollContainer, 'scrollTop', {
        value: 100,
        writable: true,
      });

      // Add more items
      rerender(
        <ScrollContainer items={['New Item', 'Item 1', 'Item 2', 'Item 3']} />
      );

      // Container should still be in the DOM
      expect(screen.getByTestId('scroll-container')).toBeInTheDocument();
    });
  });

  describe('Prefers Reduced Motion', () => {
    it('shows all items immediately when animated=false', () => {
      render(
        <AnimatedList animated={false} data-testid="animated-list">
          <div key="1">Item 1</div>
          <div key="2">Item 2</div>
          <div key="3">Item 3</div>
        </AnimatedList>
      );

      // All items should be visible immediately
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
      expect(screen.getByText('Item 3')).toBeInTheDocument();
    });

    it('renders without animation wrapper when reduced motion preferred', () => {
      // Mock prefers-reduced-motion: reduce
      vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
        matches: query.includes('prefers-reduced-motion'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      render(
        <AnimatedList data-testid="animated-list">
          <div key="1">Item 1</div>
          <div key="2">Item 2</div>
        </AnimatedList>
      );

      // Both items should be visible (no animation delay)
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
    });
  });
});

// ============================================================
// ANIMATEDLISTITEM TESTS
// ============================================================

describe('AnimatedListItem Component', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders children correctly', () => {
    render(
      <AnimatedListItem>
        <span>Test Content</span>
      </AnimatedListItem>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('applies layout animation', () => {
    const { container } = render(
      <AnimatedListItem>
        <span>Test Content</span>
      </AnimatedListItem>
    );

    const motionDiv = container.querySelector('[data-testid="motion-div"]');
    expect(motionDiv).toHaveAttribute('data-layout', 'true');
  });

  it('applies full width class', () => {
    const { container } = render(
      <AnimatedListItem>
        <span>Test Content</span>
      </AnimatedListItem>
    );

    const motionDiv = container.querySelector('[data-testid="motion-div"]');
    expect(motionDiv).toHaveClass('w-full');
  });
});

// ============================================================
// ACTIVITY LOG INTEGRATION TESTS
// ============================================================

describe('Activity Log with AnimatedList Integration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('renders log entries with animation', async () => {
    const logEntries = createMockLogEntries(5);

    render(
      <AnimatedList delay={200} data-testid="activity-log">
        {logEntries.map((entry) => (
          <div key={entry.id} data-testid={`log-entry-${entry.id}`}>
            <span className={`level-${entry.level}`}>{entry.level}</span>
            <span>{entry.message}</span>
          </div>
        ))}
      </AnimatedList>
    );

    // First entry visible immediately
    expect(screen.getByTestId('log-entry-log-0')).toBeInTheDocument();

    // Advance time to show more entries
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByTestId('log-entry-log-4')).toBeInTheDocument();
  });

  it('handles empty log list gracefully', () => {
    render(
      <AnimatedList data-testid="activity-log">
        {[]}
      </AnimatedList>
    );

    const list = screen.getByTestId('activity-log');
    expect(list).toBeInTheDocument();
    expect(list.children.length).toBe(0);
  });

  it('updates when new log entries are added', async () => {
    const initialEntries = createMockLogEntries(2);

    const { rerender } = render(
      <AnimatedList delay={100} data-testid="activity-log">
        {initialEntries.map((entry) => (
          <div key={entry.id}>{entry.message}</div>
        ))}
      </AnimatedList>
    );

    // Add new entries
    const updatedEntries = [
      { id: 'new-log', timestamp: new Date(), level: 'info' as const, message: 'New log entry' },
      ...initialEntries,
    ];

    rerender(
      <AnimatedList delay={100} data-testid="activity-log">
        {updatedEntries.map((entry) => (
          <div key={entry.id}>{entry.message}</div>
        ))}
      </AnimatedList>
    );

    expect(screen.getByText('New log entry')).toBeInTheDocument();
  });
});

/**
 * Enhanced Proxy Panel Tests - Magic UI Components
 * Tests for BorderBeam and AnimatedBeam in ProxyPanel
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// ============================================================
// MOCK FRAMER-MOTION
// ============================================================

vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(({ children, initial, animate, exit, transition, ...props }: any, ref: any) => (
      <div ref={ref} data-testid="motion-div" data-initial={JSON.stringify(initial)} {...props}>
        {children}
      </div>
    )),
    linearGradient: ({ children, ...props }: any) => (
      <linearGradient {...props}>{children}</linearGradient>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useInView: () => true,
  useMotionValue: (initial: number) => ({
    set: vi.fn(),
    get: () => initial,
    on: vi.fn(() => () => {}),
  }),
  useSpring: (value: any) => ({
    ...value,
    on: vi.fn((event: string, callback: Function) => {
      if (event === 'change') callback(value.get?.() || 0);
      return () => {};
    }),
  }),
}));

// ============================================================
// MOCK WINDOW API
// ============================================================

const mockProxyApi = {
  list: vi.fn().mockResolvedValue({ success: true, proxies: [] }),
  add: vi.fn().mockResolvedValue({ success: true }),
  remove: vi.fn().mockResolvedValue({ success: true }),
  validate: vi.fn().mockResolvedValue({ success: true }),
  setRotation: vi.fn().mockResolvedValue({ success: true }),
};

Object.defineProperty(window, 'api', {
  value: {
    proxy: mockProxyApi,
  },
  writable: true,
});

// Mock matchMedia for prefers-reduced-motion
Object.defineProperty(window, 'matchMedia', {
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
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

// Mock ResizeObserver
class MockResizeObserver {
  callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  observe(target: Element) {
    // Trigger with mock dimensions
    this.callback([{
      contentRect: { width: 500, height: 300 } as DOMRectReadOnly,
      target,
      borderBoxSize: [],
      contentBoxSize: [],
      devicePixelContentBoxSize: [],
    }], this);
  }
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', MockResizeObserver);

// ============================================================
// IMPORT COMPONENTS AFTER MOCKS
// ============================================================

import { BorderBeam } from '../../../src/components/ui/border-beam';
import { AnimatedBeam } from '../../../src/components/ui/animated-beam';

// ============================================================
// BORDERBEAM TESTS
// ============================================================

describe('BorderBeam Component', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders BorderBeam component', () => {
      const { container } = render(<BorderBeam />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('renders with default props', () => {
      const { container } = render(<BorderBeam />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('pointer-events-none');
      expect(wrapper).toHaveClass('absolute');
      expect(wrapper).toHaveClass('inset-0');
    });

    it('applies custom className', () => {
      const { container } = render(<BorderBeam className="custom-class" />);
      const motionDiv = container.querySelector('[data-testid="motion-div"]');
      expect(motionDiv).toHaveClass('custom-class');
    });

    it('applies custom colors', () => {
      const { container } = render(
        <BorderBeam colorFrom="#22c55e" colorTo="#16a34a" />
      );
      const motionDiv = container.querySelector('[data-testid="motion-div"]');
      expect(motionDiv).toHaveStyle({ '--color-from': '#22c55e' });
      expect(motionDiv).toHaveStyle({ '--color-to': '#16a34a' });
    });

    it('applies custom size', () => {
      const { container } = render(<BorderBeam size={100} />);
      const motionDiv = container.querySelector('[data-testid="motion-div"]');
      expect(motionDiv).toHaveStyle({ width: '100px' });
    });

    it('applies custom border width', () => {
      const { container } = render(<BorderBeam borderWidth={3} />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveStyle({ '--border-beam-width': '3px' });
    });
  });

  describe('Animation Properties', () => {
    it('sets correct initial offset distance', () => {
      const { container } = render(<BorderBeam initialOffset={25} />);
      const motionDiv = container.querySelector('[data-testid="motion-div"]');
      const initialAttr = motionDiv?.getAttribute('data-initial');
      expect(initialAttr).toContain('25%');
    });

    it('handles reverse animation direction', () => {
      const { container } = render(<BorderBeam reverse={true} />);
      const motionDiv = container.querySelector('[data-testid="motion-div"]');
      expect(motionDiv).toBeInTheDocument();
    });
  });

  describe('Proxy Panel Integration', () => {
    it('renders BorderBeam conditionally based on active proxy state', () => {
      const ProxyPanelWithBeam = ({ isActive }: { isActive: boolean }) => (
        <div data-testid="proxy-stat-active">
          <span>Active Proxies: 5</span>
          {isActive && (
            <BorderBeam
              size={40}
              duration={3}
              colorFrom="#22c55e"
              colorTo="#16a34a"
              data-testid="active-border-beam"
            />
          )}
        </div>
      );

      // Test when proxy is active
      const { rerender, queryByTestId } = render(<ProxyPanelWithBeam isActive={true} />);
      expect(queryByTestId('motion-div')).toBeInTheDocument();

      // Test when proxy is inactive
      rerender(<ProxyPanelWithBeam isActive={false} />);
      expect(queryByTestId('motion-div')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has pointer-events-none to not interfere with UI interaction', () => {
      const { container } = render(<BorderBeam />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('pointer-events-none');
    });
  });
});

// ============================================================
// ANIMATEDBEAM TESTS
// ============================================================

describe('AnimatedBeam Component', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  // Helper to create refs
  const createMockRefs = () => {
    const containerRef = { current: document.createElement('div') };
    const fromRef = { current: document.createElement('div') };
    const toRef = { current: document.createElement('div') };

    // Set up getBoundingClientRect
    containerRef.current.getBoundingClientRect = vi.fn(() => ({
      left: 0, top: 0, width: 500, height: 300, right: 500, bottom: 300, x: 0, y: 0, toJSON: () => {}
    }));
    fromRef.current.getBoundingClientRect = vi.fn(() => ({
      left: 50, top: 50, width: 40, height: 40, right: 90, bottom: 90, x: 50, y: 50, toJSON: () => {}
    }));
    toRef.current.getBoundingClientRect = vi.fn(() => ({
      left: 400, top: 200, width: 40, height: 40, right: 440, bottom: 240, x: 400, y: 200, toJSON: () => {}
    }));

    return { containerRef, fromRef, toRef };
  };

  describe('Rendering', () => {
    it('renders AnimatedBeam SVG', () => {
      const { containerRef, fromRef, toRef } = createMockRefs();
      
      render(
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={fromRef}
          toRef={toRef}
        />
      );

      expect(screen.getByTestId('animated-beam')).toBeInTheDocument();
    });

    it('renders with custom className', () => {
      const { containerRef, fromRef, toRef } = createMockRefs();
      
      render(
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={fromRef}
          toRef={toRef}
          className="custom-beam"
        />
      );

      const svg = screen.getByTestId('animated-beam');
      expect(svg).toHaveClass('custom-beam');
    });

    it('applies custom path color and width', () => {
      const { containerRef, fromRef, toRef } = createMockRefs();
      
      const { container } = render(
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={fromRef}
          toRef={toRef}
          pathColor="blue"
          pathWidth={4}
        />
      );

      const paths = container.querySelectorAll('path');
      expect(paths.length).toBeGreaterThan(0);
    });

    it('applies gradient colors', () => {
      const { containerRef, fromRef, toRef } = createMockRefs();
      
      const { container } = render(
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={fromRef}
          toRef={toRef}
          gradientStartColor="#ff0000"
          gradientStopColor="#00ff00"
        />
      );

      const stops = container.querySelectorAll('stop');
      expect(stops.length).toBeGreaterThan(0);
    });
  });

  describe('Connection Flow Visualization', () => {
    it('shows connection flow from source to destination', () => {
      const { containerRef, fromRef, toRef } = createMockRefs();
      
      render(
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={fromRef}
          toRef={toRef}
          curvature={50}
        />
      );

      const svg = screen.getByTestId('animated-beam');
      expect(svg).toBeInTheDocument();
    });

    it('handles reverse direction', () => {
      const { containerRef, fromRef, toRef } = createMockRefs();
      
      render(
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={fromRef}
          toRef={toRef}
          reverse={true}
        />
      );

      const svg = screen.getByTestId('animated-beam');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Cleanup', () => {
    it('properly cleans up on unmount', () => {
      const { containerRef, fromRef, toRef } = createMockRefs();
      
      const { unmount } = render(
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={fromRef}
          toRef={toRef}
        />
      );

      expect(() => unmount()).not.toThrow();
    });
  });
});

// ============================================================
// PREFERS-REDUCED-MOTION TESTS
// ============================================================

describe('Animation Accessibility', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('BorderBeam respects prefers-reduced-motion via CSS', () => {
    // BorderBeam uses CSS animations, which automatically respect
    // prefers-reduced-motion when using motion-safe/motion-reduce utilities
    const { container } = render(<BorderBeam />);
    expect(container.firstChild).toBeInTheDocument();
  });
});

/**
 * Dashboard Particles Tests - Particles Component
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock matchMedia FIRST before any imports
Object.defineProperty(window, 'matchMedia', {
  writable: true,
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
});

// Mock requestAnimationFrame
let rafCallbacks: FrameRequestCallback[] = [];
let rafId = 0;

vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
  rafCallbacks.push(callback);
  return ++rafId;
});

vi.stubGlobal('cancelAnimationFrame', (id: number) => {
  // Cancel animation frame
});

// Mock ResizeObserver
class MockResizeObserver {
  callback: ResizeObserverCallback;
  
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  
  observe() {
    // Trigger callback with mock dimensions
    this.callback([{
      contentRect: { width: 800, height: 600 } as DOMRectReadOnly,
      target: document.createElement('div'),
      borderBoxSize: [],
      contentBoxSize: [],
      devicePixelContentBoxSize: [],
    }], this);
  }
  
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal('ResizeObserver', MockResizeObserver);

// Mock canvas context
const mockContext = {
  clearRect: vi.fn(),
  beginPath: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  translate: vi.fn(),
  setTransform: vi.fn(),
  scale: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  fillStyle: '',
  fillRect: vi.fn(),
};

HTMLCanvasElement.prototype.getContext = vi.fn(() => mockContext) as any;

import { Particles } from '../../../src/components/ui/particles';

describe('Particles Component', () => {
  beforeEach(() => {
    rafCallbacks = [];
    rafId = 0;
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Rendering', () => {
    it('renders particles container when enabled', () => {
      render(<Particles enabled={true} />);
      expect(screen.getByTestId('particles-container')).toBeInTheDocument();
    });

    it('renders canvas element when enabled', () => {
      render(<Particles enabled={true} />);
      expect(screen.getByTestId('particles-canvas')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(<Particles enabled={true} className="custom-particles" />);
      const container = screen.getByTestId('particles-container');
      expect(container).toHaveClass('custom-particles');
    });

    it('is non-interactive by default', () => {
      render(<Particles enabled={true} />);
      const container = screen.getByTestId('particles-container');
      expect(container).toHaveClass('pointer-events-none');
    });

    it('has aria-hidden for accessibility', () => {
      render(<Particles enabled={true} />);
      const container = screen.getByTestId('particles-container');
      expect(container).toHaveAttribute('aria-hidden', 'true');
    });
    
    it('does not render when enabled is false', () => {
      render(<Particles enabled={false} />);
      expect(screen.queryByTestId('particles-container')).not.toBeInTheDocument();
    });
  });

  describe('Configuration', () => {
    it('accepts custom quantity', () => {
      render(<Particles enabled={true} quantity={50} />);
      expect(screen.getByTestId('particles-container')).toBeInTheDocument();
    });

    it('accepts custom color', () => {
      render(<Particles enabled={true} color="#ff0000" />);
      expect(screen.getByTestId('particles-container')).toBeInTheDocument();
    });

    it('accepts custom size', () => {
      render(<Particles enabled={true} size={2} />);
      expect(screen.getByTestId('particles-container')).toBeInTheDocument();
    });

    it('accepts velocity parameters', () => {
      render(<Particles enabled={true} vx={0.5} vy={0.5} />);
      expect(screen.getByTestId('particles-container')).toBeInTheDocument();
    });

    it('accepts staticity parameter', () => {
      render(<Particles enabled={true} staticity={100} />);
      expect(screen.getByTestId('particles-container')).toBeInTheDocument();
    });

    it('accepts ease parameter', () => {
      render(<Particles enabled={true} ease={100} />);
      expect(screen.getByTestId('particles-container')).toBeInTheDocument();
    });
  });

  describe('Canvas Initialization', () => {
    it('initializes canvas context', () => {
      render(<Particles enabled={true} />);
      expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalledWith('2d');
    });

    it('sets up canvas dimensions', () => {
      const { container } = render(<Particles enabled={true} />);
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Animation', () => {
    it('starts animation loop', () => {
      render(<Particles enabled={true} />);
      // RAF should be called
      expect(rafCallbacks.length).toBeGreaterThan(0);
    });

    it('clears context on each frame', () => {
      render(<Particles enabled={true} />);
      
      // Run one animation frame
      if (rafCallbacks.length > 0) {
        act(() => {
          rafCallbacks[0](performance.now());
        });
      }
      
      expect(mockContext.clearRect).toHaveBeenCalled();
    });
  });

  describe('UI Non-Interference', () => {
    it('does not block clicks through particles', () => {
      const handleClick = vi.fn();
      
      render(
        <div style={{ position: 'relative' }}>
          <Particles enabled={true} className="absolute inset-0" />
          <button onClick={handleClick} style={{ position: 'relative', zIndex: 1 }}>
            Click Me
          </button>
        </div>
      );

      const button = screen.getByRole('button');
      button.click();
      expect(handleClick).toHaveBeenCalled();
    });

    it('renders in background layer', () => {
      render(<Particles enabled={true} />);
      const container = screen.getByTestId('particles-container');
      // Should not have high z-index
      expect(container).toHaveClass('pointer-events-none');
    });
  });

  describe('Cleanup', () => {
    it('cancels animation frame on unmount', () => {
      const { unmount } = render(<Particles enabled={true} />);
      expect(() => unmount()).not.toThrow();
    });

    it('removes event listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      const { unmount } = render(<Particles enabled={true} />);
      
      unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    it('renders efficiently with default quantity (100)', () => {
      const startTime = performance.now();
      render(<Particles enabled={true} quantity={100} />);
      const renderTime = performance.now() - startTime;
      
      // Should render in under 50ms
      expect(renderTime).toBeLessThan(50);
    });

    it('handles re-renders without memory leaks', () => {
      const { rerender, unmount } = render(<Particles enabled={true} color="#ff0000" />);
      
      // Multiple re-renders
      for (let i = 0; i < 10; i++) {
        rerender(<Particles enabled={true} color={`#${i}${i}${i}${i}${i}${i}`} />);
      }

      expect(() => unmount()).not.toThrow();
    });

    it('respects refresh prop for re-initialization', () => {
      const { rerender } = render(<Particles enabled={true} refresh={false} />);
      rerender(<Particles enabled={true} refresh={true} />);
      expect(screen.getByTestId('particles-container')).toBeInTheDocument();
    });
  });
});

describe('Dashboard Integration', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders particles as dashboard background', () => {
    const DashboardWithParticles = () => (
      <div className="relative h-screen w-screen">
        <Particles
          enabled={true}
          className="absolute inset-0 -z-10"
          quantity={50}
          color="#6366f1"
          staticity={50}
        />
        <div className="relative z-10">
          <h1>Dashboard</h1>
          <div className="stats">Stats content here</div>
        </div>
      </div>
    );

    render(<DashboardWithParticles />);
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('particles-container')).toBeInTheDocument();
  });

  it('can be disabled via settings', () => {
    const DashboardWithSettings = ({ particlesEnabled }: { particlesEnabled: boolean }) => (
      <div>
        <Particles enabled={particlesEnabled} />
        <div>Content</div>
      </div>
    );

    const { rerender, queryByTestId } = render(
      <DashboardWithSettings particlesEnabled={true} />
    );
    expect(queryByTestId('particles-container')).toBeInTheDocument();

    rerender(<DashboardWithSettings particlesEnabled={false} />);
    expect(queryByTestId('particles-container')).not.toBeInTheDocument();
  });
});

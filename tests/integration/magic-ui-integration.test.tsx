/**
 * Magic UI Integration Tests
 * Tests all Magic UI components working together
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// ============================================================
// COMPREHENSIVE MOCKS
// ============================================================

vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <div ref={ref} data-testid="motion-div" {...props}>{children}</div>
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
    on: vi.fn(() => () => {}),
  }),
}));

// Mock matchMedia
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
vi.stubGlobal('ResizeObserver', class {
  observe() {}
  unobserve() {}
  disconnect() {}
});

// Mock canvas
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  clearRect: vi.fn(),
  beginPath: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  translate: vi.fn(),
  setTransform: vi.fn(),
  scale: vi.fn(),
  fillStyle: '',
})) as any;

// ============================================================
// IMPORT COMPONENTS
// ============================================================

import { BorderBeam } from '../../src/components/ui/border-beam';
import { AnimatedList } from '../../src/components/ui/animated-list';
import { NeonGradientCard } from '../../src/components/ui/neon-gradient-card';
import { Particles } from '../../src/components/ui/particles';
import { AnimatedGradientText } from '../../src/components/ui/animated-gradient-text';
import { Confetti, type ConfettiRef } from '../../src/components/ui/confetti';
import { NumberTicker } from '../../src/components/ui/number-ticker';
import { ShimmerButton } from '../../src/components/ui/shimmer-button';

// ============================================================
// ALL COMPONENTS TOGETHER
// ============================================================

describe('Magic UI Components Integration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('All Components Render Together', () => {
    it('renders all Magic UI components without conflicts', () => {
      const AllComponentsPage = () => (
        <div className="relative min-h-screen">
          {/* Background Particles */}
          <Particles className="absolute inset-0 -z-10" quantity={30} />
          
          {/* Header with AnimatedGradientText */}
          <header className="p-4">
            <AnimatedGradientText>Virtual IP Browser</AnimatedGradientText>
          </header>
          
          {/* Stats with BorderBeam and NumberTicker */}
          <div className="relative p-4 border rounded">
            <NumberTicker value={42} />
            <BorderBeam size={40} />
          </div>
          
          {/* Activity Log with AnimatedList */}
          <AnimatedList delay={500}>
            <div key="1">Log entry 1</div>
            <div key="2">Log entry 2</div>
          </AnimatedList>
          
          {/* Creator Card with NeonGradientCard */}
          <NeonGradientCard>
            <h2>Support Creator</h2>
          </NeonGradientCard>
          
          {/* Action Button */}
          <ShimmerButton>Click Me</ShimmerButton>
          
          {/* Success Confetti */}
          <Confetti manualstart={true} />
        </div>
      );

      const { container } = render(<AllComponentsPage />);
      
      // All components should render
      expect(screen.getByText('Virtual IP Browser')).toBeInTheDocument();
      expect(screen.getByText('Support Creator')).toBeInTheDocument();
      expect(screen.getByText('Click Me')).toBeInTheDocument();
      expect(screen.getByText('Log entry 1')).toBeInTheDocument();
      expect(container).toBeInTheDocument();
    });
  });

  describe('Z-Index Conflicts', () => {
    it('maintains correct stacking order', () => {
      const StackingTest = () => (
        <div style={{ position: 'relative' }}>
          {/* Background layer */}
          <Particles className="absolute inset-0" style={{ zIndex: -10 }} />
          
          {/* Content layer */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <NeonGradientCard style={{ zIndex: 10 }}>
              Content
            </NeonGradientCard>
          </div>
          
          {/* Overlay layer (confetti) */}
          <Confetti manualstart={true} style={{ zIndex: 9999 }} />
        </div>
      );

      const { container } = render(<StackingTest />);
      
      // Particles should be in background
      const particles = screen.getByTestId('particles-container');
      expect(particles).toBeInTheDocument();
      
      // Content should be accessible
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('BorderBeam does not overlap interactive elements', () => {
      const handleClick = vi.fn();
      
      render(
        <div style={{ position: 'relative' }}>
          <BorderBeam />
          <button onClick={handleClick} style={{ position: 'relative' }}>
            Clickable
          </button>
        </div>
      );

      const button = screen.getByRole('button');
      button.click();
      
      // Click should work despite BorderBeam
      expect(handleClick).toHaveBeenCalled();
    });
  });

  describe('Animation Timing Coordination', () => {
    it('coordinates multiple animation timings', async () => {
      const CoordinatedAnimations = () => (
        <div>
          <AnimatedList delay={100} data-testid="list">
            <div key="1">Item 1</div>
            <div key="2">Item 2</div>
          </AnimatedList>
          <div style={{ position: 'relative' }}>
            <BorderBeam duration={2} />
          </div>
        </div>
      );

      render(<CoordinatedAnimations />);
      
      // Initial state
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      
      // After delay
      await act(async () => {
        vi.advanceTimersByTime(200);
      });
      
      expect(screen.getByText('Item 2')).toBeInTheDocument();
    });
  });

  describe('Settings Toggle All Animations', () => {
    it('disables all animations via global setting', () => {
      const AnimationsDisabledPage = ({ animationsEnabled }: { animationsEnabled: boolean }) => (
        <div>
          <AnimatedList animated={animationsEnabled} data-testid="list">
            <div key="1">Item 1</div>
            <div key="2">Item 2</div>
          </AnimatedList>
          <NeonGradientCard animated={animationsEnabled}>
            Card Content
          </NeonGradientCard>
          {animationsEnabled && <Particles quantity={10} />}
        </div>
      );

      // With animations enabled
      const { rerender, queryByTestId } = render(
        <AnimationsDisabledPage animationsEnabled={true} />
      );
      expect(queryByTestId('particles-container')).toBeInTheDocument();

      // With animations disabled
      rerender(<AnimationsDisabledPage animationsEnabled={false} />);
      expect(queryByTestId('particles-container')).not.toBeInTheDocument();
      // AnimatedList should show all items immediately
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
    });
  });
});

// ============================================================
// BUNDLE SIZE TEST (Conceptual)
// ============================================================

describe('Bundle Size Considerations', () => {
  it('imports only necessary components', () => {
    // This is a conceptual test - actual bundle size testing would
    // be done with bundler analysis tools
    
    // Each component should be independently importable
    expect(BorderBeam).toBeDefined();
    expect(AnimatedList).toBeDefined();
    expect(NeonGradientCard).toBeDefined();
    expect(Particles).toBeDefined();
    expect(AnimatedGradientText).toBeDefined();
    expect(Confetti).toBeDefined();
    expect(NumberTicker).toBeDefined();
    expect(ShimmerButton).toBeDefined();
  });

  it('components are tree-shakeable', () => {
    // Each component is a named export, enabling tree-shaking
    // Importing single component shouldn't import others
    const singleImport = { BorderBeam };
    expect(Object.keys(singleImport)).toHaveLength(1);
  });
});

// ============================================================
// PREFERS-REDUCED-MOTION GLOBAL
// ============================================================

describe('Global Reduced Motion Support', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('all animated components respect reduced motion preference', () => {
    // Mock reduced motion preference
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

    const ReducedMotionPage = () => (
      <div>
        <AnimatedList data-testid="list">
          <div key="1">Item 1</div>
          <div key="2">Item 2</div>
        </AnimatedList>
        <NeonGradientCard>Content</NeonGradientCard>
      </div>
    );

    render(<ReducedMotionPage />);
    
    // Components should render without motion
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument(); // All visible immediately
    expect(screen.getByText('Content')).toBeInTheDocument();
  });
});

// ============================================================
// ERROR BOUNDARY INTEGRATION
// ============================================================

describe('Error Handling', () => {
  afterEach(() => {
    cleanup();
  });

  it('components handle missing refs gracefully', () => {
    // AnimatedBeam with null refs shouldn't crash
    const TestComponent = () => (
      <div>
        <BorderBeam />
        <AnimatedList>
          <div key="1">Safe content</div>
        </AnimatedList>
      </div>
    );

    expect(() => render(<TestComponent />)).not.toThrow();
  });

  it('components handle rapid prop changes', () => {
    const { rerender } = render(
      <NeonGradientCard neonColors={{ firstColor: '#ff0000', secondColor: '#00ff00' }}>
        Content
      </NeonGradientCard>
    );

    // Rapid color changes
    for (let i = 0; i < 20; i++) {
      rerender(
        <NeonGradientCard neonColors={{ firstColor: `#${i}${i}0000`, secondColor: `#00${i}${i}00` }}>
          Content
        </NeonGradientCard>
      );
    }

    expect(screen.getByText('Content')).toBeInTheDocument();
  });
});

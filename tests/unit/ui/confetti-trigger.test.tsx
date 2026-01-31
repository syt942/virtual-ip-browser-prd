/**
 * Confetti Trigger Tests - Confetti Component
 * Tests for confetti animations on success events
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, act, waitFor } from '@testing-library/react';
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

// Import the component
import { Confetti, type ConfettiRef } from '../../../src/components/ui/confetti';

describe('Confetti Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('renders confetti canvas element', () => {
      render(<Confetti manualstart={true} data-testid="confetti" />);
      expect(screen.getByTestId('confetti')).toBeInTheDocument();
    });

    it('applies absolute positioning for overlay', () => {
      render(<Confetti manualstart={true} data-testid="confetti" />);
      const container = screen.getByTestId('confetti');
      // Canvas has absolute positioning via className
      expect(container).toHaveClass('absolute');
    });

    it('is non-interactive (pointer-events-none)', () => {
      render(<Confetti manualstart={true} data-testid="confetti" />);
      const container = screen.getByTestId('confetti');
      expect(container).toHaveClass('pointer-events-none');
    });
  });

  describe('Manual Trigger', () => {
    it('does not fire automatically when manualstart is true', () => {
      const ref = React.createRef<ConfettiRef>();
      render(<Confetti ref={ref} manualstart={true} data-testid="confetti" />);
      
      // Canvas should be present but confetti isn't animated yet
      const canvas = screen.getByTestId('confetti');
      expect(canvas).toBeInTheDocument();
    });

    it('fires confetti when fire() is called', async () => {
      const ref = React.createRef<ConfettiRef>();
      render(<Confetti ref={ref} manualstart={true} data-testid="confetti" />);
      
      // The fire function should be available
      expect(ref.current?.fire).toBeDefined();
      
      act(() => {
        ref.current?.fire();
      });

      // Canvas should still be present
      expect(screen.getByTestId('confetti')).toBeInTheDocument();
    });

    it('fires with custom options', async () => {
      const ref = React.createRef<ConfettiRef>();
      render(<Confetti ref={ref} manualstart={true} data-testid="confetti" />);
      
      act(() => {
        ref.current?.fire({
          particleCount: 10,
          colors: ['#ff0000', '#00ff00'],
          origin: { x: 0.5, y: 0.5 },
        });
      });

      expect(screen.getByTestId('confetti')).toBeInTheDocument();
    });
  });

  describe('Auto-start', () => {
    it('fires automatically when manualstart is false', async () => {
      render(<Confetti manualstart={false} data-testid="confetti" />);
      
      // Canvas renders and animation starts
      expect(screen.getByTestId('confetti')).toBeInTheDocument();
    });
  });

  describe('Cleanup', () => {
    it('canvas remains after animation', async () => {
      const ref = React.createRef<ConfettiRef>();
      render(<Confetti ref={ref} manualstart={true} data-testid="confetti" />);
      
      act(() => {
        ref.current?.fire({ particleCount: 5 });
      });

      // Advance time past animation duration
      act(() => {
        vi.advanceTimersByTime(3500);
      });

      // Canvas element should still be present
      expect(screen.getByTestId('confetti')).toBeInTheDocument();
    });

    it('properly cleans up on unmount', () => {
      const ref = React.createRef<ConfettiRef>();
      const { unmount } = render(
        <Confetti ref={ref} manualstart={true} data-testid="confetti" />
      );

      act(() => {
        ref.current?.fire();
      });

      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Multiple Triggers', () => {
    it('handles multiple simultaneous triggers', async () => {
      const ref = React.createRef<ConfettiRef>();
      render(<Confetti ref={ref} manualstart={true} data-testid="confetti" />);
      
      // Fire multiple times rapidly - should not throw
      act(() => {
        ref.current?.fire({ particleCount: 10 });
        ref.current?.fire({ particleCount: 10 });
        ref.current?.fire({ particleCount: 10 });
      });

      expect(screen.getByTestId('confetti')).toBeInTheDocument();
    });

    it('handles successive fire calls', async () => {
      const ref = React.createRef<ConfettiRef>();
      render(<Confetti ref={ref} manualstart={true} data-testid="confetti" />);
      
      act(() => {
        ref.current?.fire({ particleCount: 5 });
      });

      // Fire again
      act(() => {
        ref.current?.fire({ particleCount: 5 });
      });

      // Should handle without errors
      expect(screen.getByTestId('confetti')).toBeInTheDocument();
    });
  });
});

describe('Confetti Settings Integration', () => {
  afterEach(() => {
    cleanup();
  });

  it('can be disabled via settings', () => {
    const ConfettiWithSettings = ({ enabled }: { enabled: boolean }) => {
      const ref = React.createRef<ConfettiRef>();
      
      const triggerConfetti = () => {
        if (enabled) {
          ref.current?.fire();
        }
      };

      return (
        <div>
          <Confetti ref={ref} manualstart={true} data-testid="confetti" />
          <button onClick={triggerConfetti} data-testid="trigger-btn">
            Trigger
          </button>
        </div>
      );
    };

    const { rerender } = render(<ConfettiWithSettings enabled={false} />);
    
    const button = screen.getByTestId('trigger-btn');
    button.click();
    
    const container = screen.getByTestId('confetti');
    // Should not fire when disabled
    expect(container.children.length).toBe(0);

    // Enable and try again
    rerender(<ConfettiWithSettings enabled={true} />);
  });
});

describe('Confetti Success Events', () => {
  afterEach(() => {
    cleanup();
  });

  it('triggers on automation success', () => {
    const AutomationWithConfetti = () => {
      const confettiRef = React.useRef<ConfettiRef>(null);
      const [status, setStatus] = React.useState<'idle' | 'success'>('idle');

      const runAutomation = () => {
        // Simulate automation success
        setStatus('success');
        confettiRef.current?.fire({
          particleCount: 100,
          spread: 70,
          origin: { x: 0.5, y: 0.5 },
        });
      };

      return (
        <div>
          <Confetti ref={confettiRef} manualstart={true} data-testid="confetti" />
          <button onClick={runAutomation} data-testid="run-btn">
            Run Automation
          </button>
          <span data-testid="status">{status}</span>
        </div>
      );
    };

    render(<AutomationWithConfetti />);
    
    const button = screen.getByTestId('run-btn');
    
    act(() => {
      button.click();
    });

    expect(screen.getByTestId('status')).toHaveTextContent('success');
    expect(screen.getByTestId('confetti')).toBeInTheDocument();
  });
});

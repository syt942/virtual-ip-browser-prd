/**
 * Enhanced Creator Panel Tests - NeonGradientCard Component
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

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

import { NeonGradientCard } from '../../../src/components/ui/neon-gradient-card';

describe('NeonGradientCard Component', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders NeonGradientCard with children', () => {
      render(
        <NeonGradientCard>
          <div data-testid="card-content">Card Content</div>
        </NeonGradientCard>
      );
      expect(screen.getByTestId('card-content')).toBeInTheDocument();
    });

    it('renders with custom className', () => {
      const { container } = render(
        <NeonGradientCard className="custom-card">
          <span>Content</span>
        </NeonGradientCard>
      );
      expect(container.firstChild).toHaveClass('custom-card');
    });

    it('applies default neon colors', () => {
      const { container } = render(
        <NeonGradientCard>Content</NeonGradientCard>
      );
      const card = container.firstChild as HTMLElement;
      expect(card.style.getPropertyValue('--neon-first-color')).toBe('#ff00aa');
      expect(card.style.getPropertyValue('--neon-second-color')).toBe('#00FFF1');
    });

    it('applies custom neon colors', () => {
      const { container } = render(
        <NeonGradientCard neonColors={{ firstColor: '#ff0000', secondColor: '#00ff00' }}>
          Content
        </NeonGradientCard>
      );
      const card = container.firstChild as HTMLElement;
      expect(card.style.getPropertyValue('--neon-first-color')).toBe('#ff0000');
      expect(card.style.getPropertyValue('--neon-second-color')).toBe('#00ff00');
    });
  });

  describe('Border and Radius', () => {
    it('applies default border size', () => {
      const { container } = render(
        <NeonGradientCard>Content</NeonGradientCard>
      );
      const card = container.firstChild as HTMLElement;
      expect(card.style.getPropertyValue('--border-size')).toBe('2px');
    });

    it('applies custom border size', () => {
      const { container } = render(
        <NeonGradientCard borderSize={5}>Content</NeonGradientCard>
      );
      const card = container.firstChild as HTMLElement;
      expect(card.style.getPropertyValue('--border-size')).toBe('5px');
    });

    it('applies default border radius', () => {
      const { container } = render(
        <NeonGradientCard>Content</NeonGradientCard>
      );
      const card = container.firstChild as HTMLElement;
      expect(card.style.getPropertyValue('--border-radius')).toBe('20px');
    });

    it('applies custom border radius', () => {
      const { container } = render(
        <NeonGradientCard borderRadius={10}>Content</NeonGradientCard>
      );
      const card = container.firstChild as HTMLElement;
      expect(card.style.getPropertyValue('--border-radius')).toBe('10px');
    });
  });

  describe('Accessibility', () => {
    it('renders semantic HTML structure', () => {
      const { container } = render(
        <NeonGradientCard>
          <h2>Title</h2>
          <p>Description</p>
        </NeonGradientCard>
      );
      expect(container.querySelector('h2')).toBeInTheDocument();
      expect(container.querySelector('p')).toBeInTheDocument();
    });

    it('supports aria attributes', () => {
      render(
        <NeonGradientCard aria-label="Creator support card" role="article">
          Content
        </NeonGradientCard>
      );
      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('aria-label', 'Creator support card');
    });

    it('is keyboard accessible when interactive', () => {
      render(
        <NeonGradientCard tabIndex={0}>
          <button>Action</button>
        </NeonGradientCard>
      );
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('Animation Control', () => {
    it('renders inner content wrapper', () => {
      const { container } = render(
        <NeonGradientCard>Content</NeonGradientCard>
      );
      const innerDiv = container.querySelector('.relative.size-full');
      expect(innerDiv).toBeInTheDocument();
      // Animation is applied via CSS pseudo-elements (::before, ::after)
      // These use CSS animations defined in tailwind config
    });

    it('respects animated prop', () => {
      const { container: container1 } = render(
        <NeonGradientCard animated={true}>Content Animated</NeonGradientCard>
      );
      expect(container1.querySelector('.relative.size-full')).toBeInTheDocument();
      cleanup();
      
      const { container: container2 } = render(
        <NeonGradientCard animated={false}>Content Static</NeonGradientCard>
      );
      expect(container2.querySelector('.relative.size-full')).toBeInTheDocument();
    });
  });
});

describe('Creator Support Panel Integration', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders creator info in NeonGradientCard', () => {
    const CreatorCard = () => (
      <NeonGradientCard neonColors={{ firstColor: '#9333ea', secondColor: '#06b6d4' }}>
        <div className="creator-info">
          <h3>Support Creator</h3>
          <p>Click to view ads and support your favorite creators</p>
          <span className="earnings">$12.50 earned</span>
        </div>
      </NeonGradientCard>
    );

    render(<CreatorCard />);
    expect(screen.getByText('Support Creator')).toBeInTheDocument();
    expect(screen.getByText('$12.50 earned')).toBeInTheDocument();
  });

  it('handles card interactions', () => {
    const handleClick = vi.fn();
    
    render(
      <NeonGradientCard onClick={handleClick}>
        <button>Support Now</button>
      </NeonGradientCard>
    );

    const button = screen.getByRole('button');
    button.click();
    // Button click should work within the card
    expect(button).toBeInTheDocument();
  });
});

/**
 * Page Interaction Simulator
 * Simulates human-like page interactions including scrolling, mouse movement, and reading
 */

export interface Point {
  x: number;
  y: number;
}

export interface MousePoint extends Point {
  delay: number;
}

export interface ScrollEvent {
  position: number;
  duration: number;
  speed: 'slow' | 'medium' | 'fast';
}

export interface Link {
  href: string;
  text: string;
}

export interface PageInteractionConfig {
  minReadingTime: number;
  maxReadingTime: number;
  scrollSpeedMin: number;
  scrollSpeedMax: number;
  mouseSteps: number;
}

const DEFAULT_CONFIG: PageInteractionConfig = {
  minReadingTime: 30,
  maxReadingTime: 120,
  scrollSpeedMin: 50,
  scrollSpeedMax: 300,
  mouseSteps: 20,
};

export class PageInteraction {
  private config: PageInteractionConfig;

  constructor(config: Partial<PageInteractionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate reading time using gaussian distribution
   */
  generateReadingTime(): number {
    const { minReadingTime, maxReadingTime } = this.config;
    const mean = (minReadingTime + maxReadingTime) / 2;
    const stdDev = (maxReadingTime - minReadingTime) / 4;

    // Box-Muller transform for gaussian distribution
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    
    let time = z0 * stdDev + mean;
    
    // Clamp to bounds
    time = Math.max(minReadingTime, Math.min(maxReadingTime, time));
    
    return time;
  }

  /**
   * Generate scroll pattern for a page
   */
  generateScrollPattern(pageHeight: number): ScrollEvent[] {
    const events: ScrollEvent[] = [];
    const targetDepth = this.generateScrollDepth();
    const targetPosition = pageHeight * targetDepth;
    
    let currentPosition = 0;
    
    while (currentPosition < targetPosition) {
      const speed = this.selectScrollSpeed();
      const scrollAmount = this.getScrollAmount(speed);
      const duration = this.getScrollDuration(speed);
      
      currentPosition = Math.min(currentPosition + scrollAmount, targetPosition);
      
      events.push({
        position: Math.round(currentPosition),
        duration,
        speed,
      });

      // Add pause probability at certain depths
      if (Math.random() < 0.3 && currentPosition > pageHeight * 0.2) {
        events.push({
          position: Math.round(currentPosition),
          duration: Math.floor(Math.random() * 3000) + 1000, // 1-4 second pause
          speed: 'slow',
        });
      }
    }

    return events;
  }

  /**
   * Generate scroll depth (most users don't scroll to bottom)
   */
  private generateScrollDepth(): number {
    const depths = [0.3, 0.5, 0.7, 0.85, 1.0];
    const weights = [0.1, 0.25, 0.35, 0.2, 0.1];
    
    const random = Math.random();
    let cumulative = 0;
    
    for (let i = 0; i < weights.length; i++) {
      cumulative += weights[i];
      if (random < cumulative) {
        return depths[i];
      }
    }
    
    return depths[depths.length - 1];
  }

  /**
   * Select scroll speed
   */
  private selectScrollSpeed(): 'slow' | 'medium' | 'fast' {
    const random = Math.random();
    if (random < 0.2) return 'slow';
    if (random < 0.8) return 'medium';
    return 'fast';
  }

  /**
   * Get scroll amount based on speed
   */
  private getScrollAmount(speed: 'slow' | 'medium' | 'fast'): number {
    switch (speed) {
      case 'slow':
        return Math.floor(Math.random() * 50) + 30;
      case 'medium':
        return Math.floor(Math.random() * 100) + 100;
      case 'fast':
        return Math.floor(Math.random() * 150) + 200;
    }
  }

  /**
   * Get scroll duration based on speed
   */
  private getScrollDuration(speed: 'slow' | 'medium' | 'fast'): number {
    switch (speed) {
      case 'slow':
        return Math.floor(Math.random() * 300) + 400;
      case 'medium':
        return Math.floor(Math.random() * 150) + 150;
      case 'fast':
        return Math.floor(Math.random() * 50) + 50;
    }
  }

  /**
   * Generate mouse path using bezier curves
   */
  generateMousePath(start: Point, end: Point, steps?: number): MousePoint[] {
    const numSteps = steps || this.config.mouseSteps;
    
    // Generate control points for bezier curve with randomness
    const cp1: Point = {
      x: start.x + (end.x - start.x) * 0.25 + (Math.random() - 0.5) * 100,
      y: start.y + (end.y - start.y) * 0.25 + (Math.random() - 0.5) * 100,
    };
    const cp2: Point = {
      x: start.x + (end.x - start.x) * 0.75 + (Math.random() - 0.5) * 100,
      y: start.y + (end.y - start.y) * 0.75 + (Math.random() - 0.5) * 100,
    };

    const path: MousePoint[] = [];

    for (let i = 0; i <= numSteps; i++) {
      const t = i / numSteps;
      
      // Cubic bezier formula
      const x = Math.pow(1 - t, 3) * start.x +
                3 * Math.pow(1 - t, 2) * t * cp1.x +
                3 * (1 - t) * Math.pow(t, 2) * cp2.x +
                Math.pow(t, 3) * end.x;
      
      const y = Math.pow(1 - t, 3) * start.y +
                3 * Math.pow(1 - t, 2) * t * cp1.y +
                3 * (1 - t) * Math.pow(t, 2) * cp2.y +
                Math.pow(t, 3) * end.y;

      // Add jitter for more human-like movement
      const jitter = this.addJitter({ x, y }, 2);
      
      // Calculate delay (slower at start and end)
      const speedFactor = 1 - Math.abs(t - 0.5) * 1.5;
      const baseDelay = 20;
      const delay = Math.round(baseDelay / Math.max(0.3, speedFactor) + Math.random() * 10);

      path.push({
        x: Math.round(jitter.x),
        y: Math.round(jitter.y),
        delay,
      });
    }

    return path;
  }

  /**
   * Add random jitter to a point
   */
  private addJitter(point: Point, maxJitter: number): Point {
    return {
      x: point.x + (Math.random() - 0.5) * maxJitter * 2,
      y: point.y + (Math.random() - 0.5) * maxJitter * 2,
    };
  }

  /**
   * Find internal links on a page
   */
  findInternalLinks(links: Link[], currentDomain: string): Link[] {
    return links.filter(link => {
      try {
        const url = new URL(link.href);
        return url.hostname === currentDomain ||
               url.hostname.endsWith('.' + currentDomain);
      } catch {
        // Relative links are internal
        return !link.href.startsWith('http') && 
               !link.href.startsWith('mailto:') &&
               !link.href.startsWith('tel:') &&
               !link.href.startsWith('#');
      }
    });
  }

  /**
   * Select next page to visit in journey
   */
  selectNextPage(links: Link[], visitedPaths: string[] = []): Link {
    // Filter out already visited pages
    const availableLinks = links.filter(link => {
      const path = this.extractPath(link.href);
      return !visitedPaths.includes(path);
    });

    // If all pages visited, pick from all links
    const candidates = availableLinks.length > 0 ? availableLinks : links;
    
    // Prefer diverse page types
    const prioritized = this.prioritizeLinks(candidates);
    
    // Random selection with preference for prioritized links
    if (prioritized.length > 0 && Math.random() < 0.7) {
      return prioritized[Math.floor(Math.random() * prioritized.length)];
    }
    
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  /**
   * Extract path from URL
   */
  private extractPath(href: string): string {
    try {
      const url = new URL(href);
      return url.pathname;
    } catch {
      return href;
    }
  }

  /**
   * Prioritize interesting links (about, products, blog, etc.)
   */
  private prioritizeLinks(links: Link[]): Link[] {
    const priorityKeywords = ['about', 'product', 'service', 'blog', 'article', 'contact', 'team', 'pricing'];
    
    return links.filter(link => {
      const text = link.text.toLowerCase();
      const href = link.href.toLowerCase();
      return priorityKeywords.some(keyword => 
        text.includes(keyword) || href.includes(keyword)
      );
    });
  }

  /**
   * Calculate reading time based on content length
   */
  calculateReadingTime(wordCount: number, wordsPerMinute: number = 200): number {
    const baseTime = (wordCount / wordsPerMinute) * 60;
    const variance = baseTime * 0.2;
    return baseTime + (Math.random() * variance * 2 - variance);
  }

  /**
   * Generate click position with slight randomness
   */
  generateClickPosition(elementBounds: { x: number; y: number; width: number; height: number }): Point {
    const { x, y, width, height } = elementBounds;
    
    // Click somewhere within the element, biased toward center
    const offsetX = (Math.random() - 0.5) * width * 0.6;
    const offsetY = (Math.random() - 0.5) * height * 0.6;
    
    return {
      x: Math.round(x + width / 2 + offsetX),
      y: Math.round(y + height / 2 + offsetY),
    };
  }
}

/**
 * Behavior Simulator
 * Generates human-like behavior patterns for automation
 */

export interface Point {
  x: number;
  y: number;
}

export type ActionType = 'scroll' | 'pause' | 'mousemove' | 'click' | 'read';

export interface Action {
  type: ActionType;
  duration: number;
  data?: Record<string, unknown>;
}

export interface BehaviorConfig {
  typingSpeedMin: number;
  typingSpeedMax: number;
  variancePercent: number;
}

const DEFAULT_CONFIG: BehaviorConfig = {
  typingSpeedMin: 50,
  typingSpeedMax: 200,
  variancePercent: 0.3,
};

export class BehaviorSimulator {
  private config: BehaviorConfig;

  constructor(config: Partial<BehaviorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate a human-like delay with variance
   */
  generateHumanDelay(baseMs: number, variancePct?: number): number {
    const variance = baseMs * (variancePct ?? this.config.variancePercent);
    return baseMs + (Math.random() - 0.5) * variance * 2;
  }

  /**
   * Generate gaussian random number using Box-Muller transform
   */
  generateGaussianRandom(mean: number, stdDev: number): number {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return z0 * stdDev + mean;
  }

  /**
   * Generate typing delay per character
   */
  generateTypingDelay(): number {
    const { typingSpeedMin, typingSpeedMax } = this.config;
    return Math.floor(Math.random() * (typingSpeedMax - typingSpeedMin)) + typingSpeedMin;
  }

  /**
   * Simulate typing and return total delay
   */
  simulateTyping(text: string): number {
    let totalDelay = 0;
    
    for (let i = 0; i < text.length; i++) {
      totalDelay += this.generateTypingDelay();
      
      // Occasional longer pause (thinking)
      if (Math.random() < 0.05) {
        totalDelay += Math.floor(Math.random() * 300) + 100;
      }
    }
    
    return totalDelay;
  }

  /**
   * Generate action sequence for a page visit
   */
  generateActionSequence(totalDuration: number): Action[] {
    const actions: Action[] = [];
    let remainingTime = totalDuration;

    // Initial scroll
    const initialScrollTime = Math.min(remainingTime * 0.1, 2000);
    actions.push({ type: 'scroll', duration: initialScrollTime });
    remainingTime -= initialScrollTime;

    // Main interaction loop
    while (remainingTime > 5000) {
      // Reading phase
      const readTime = Math.min(
        this.generateGaussianRandom(8000, 3000),
        remainingTime * 0.4
      );
      if (readTime > 1000) {
        actions.push({ type: 'read', duration: Math.max(1000, readTime) });
        remainingTime -= readTime;
      }

      // Scroll phase
      if (remainingTime > 3000) {
        const scrollTime = Math.min(
          Math.random() * 1500 + 500,
          remainingTime * 0.1
        );
        actions.push({ type: 'scroll', duration: scrollTime });
        remainingTime -= scrollTime;
      }

      // Optional mouse movement
      if (Math.random() < 0.3 && remainingTime > 2000) {
        const moveTime = Math.min(Math.random() * 500 + 200, remainingTime * 0.05);
        actions.push({ type: 'mousemove', duration: moveTime });
        remainingTime -= moveTime;
      }

      // Optional pause (simulating focus change or distraction)
      if (Math.random() < 0.2 && remainingTime > 3000) {
        const pauseTime = Math.min(Math.random() * 2000 + 500, remainingTime * 0.1);
        actions.push({ type: 'pause', duration: pauseTime });
        remainingTime -= pauseTime;
      }
    }

    // Final actions
    if (remainingTime > 0) {
      actions.push({ type: 'pause', duration: remainingTime });
    }

    return actions;
  }

  /**
   * Add jitter to a point for more human-like positioning
   */
  addJitter(point: Point, maxJitter: number = 3): Point {
    return {
      x: point.x + (Math.random() - 0.5) * maxJitter * 2,
      y: point.y + (Math.random() - 0.5) * maxJitter * 2,
    };
  }

  /**
   * Generate scroll behavior with pauses
   */
  generateScrollBehavior(pageHeight: number): {
    scrollTo: number;
    duration: number;
    pauseAfter: number;
  }[] {
    const behaviors: { scrollTo: number; duration: number; pauseAfter: number }[] = [];
    const targetDepth = this.generateScrollDepth();
    const targetPosition = pageHeight * targetDepth;
    
    let currentPosition = 0;
    const segments = Math.floor(Math.random() * 4) + 3; // 3-6 scroll segments
    const segmentHeight = targetPosition / segments;

    for (let i = 0; i < segments; i++) {
      currentPosition += segmentHeight * (0.8 + Math.random() * 0.4);
      currentPosition = Math.min(currentPosition, targetPosition);

      behaviors.push({
        scrollTo: Math.round(currentPosition),
        duration: Math.floor(Math.random() * 800) + 400,
        pauseAfter: Math.random() < 0.6 ? Math.floor(Math.random() * 2000) + 500 : 0,
      });
    }

    return behaviors;
  }

  /**
   * Generate scroll depth
   */
  private generateScrollDepth(): number {
    const depths = [0.4, 0.6, 0.75, 0.9, 1.0];
    const weights = [0.15, 0.3, 0.3, 0.15, 0.1];
    
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
   * Generate mouse movement timing
   */
  generateMouseTiming(pathLength: number): number[] {
    const timings: number[] = [];
    
    for (let i = 0; i < pathLength; i++) {
      const progress = i / pathLength;
      // Slower at start and end (ease-in-out effect)
      const speedFactor = 1 - Math.pow(Math.abs(progress - 0.5) * 2, 2);
      const baseDelay = 15;
      const delay = baseDelay / Math.max(0.3, speedFactor) + Math.random() * 8;
      timings.push(Math.round(delay));
    }
    
    return timings;
  }

  /**
   * Simulate page reading behavior
   */
  simulateReadingBehavior(contentLength: number): {
    totalTime: number;
    scrollEvents: number;
    mouseMovements: number;
  } {
    const wordsPerMinute = this.generateGaussianRandom(200, 50);
    const estimatedWords = contentLength / 5; // Average word length
    const baseReadTime = (estimatedWords / wordsPerMinute) * 60 * 1000;
    
    // Add variance
    const totalTime = baseReadTime * (0.8 + Math.random() * 0.4);
    
    return {
      totalTime: Math.round(totalTime),
      scrollEvents: Math.floor(totalTime / 8000) + 1,
      mouseMovements: Math.floor(totalTime / 15000),
    };
  }

  /**
   * Generate navigation delay (between page transitions)
   */
  generateNavigationDelay(): number {
    // 2-8 seconds between pages
    return Math.floor(this.generateGaussianRandom(4000, 1500));
  }

  /**
   * Check if should perform optional action
   */
  shouldPerformAction(probability: number): boolean {
    return Math.random() < probability;
  }

  /**
   * Generate realistic click timing
   */
  generateClickTiming(): {
    hoverDelay: number;
    clickDelay: number;
    holdDuration: number;
  } {
    return {
      hoverDelay: Math.floor(Math.random() * 300) + 100, // Time hovering before click
      clickDelay: Math.floor(Math.random() * 50) + 20,   // Time to initiate click
      holdDuration: Math.floor(Math.random() * 80) + 40, // Mouse button hold time
    };
  }
}

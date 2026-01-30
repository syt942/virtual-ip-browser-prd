/**
 * Behavior Simulator
 * Generates human-like behavior patterns for automation
 */

import {
  DEFAULT_TYPING_SPEED_MIN_MS,
  DEFAULT_TYPING_SPEED_MAX_MS,
  DEFAULT_VARIANCE_PERCENT,
  TYPING_PAUSE_PROBABILITY,
  TYPING_PAUSE_MIN_MS,
  TYPING_PAUSE_MAX_MS,
  MAX_INITIAL_SCROLL_TIME_MS,
  INITIAL_SCROLL_TIME_FRACTION,
  MIN_REMAINING_TIME_MS,
  READING_TIME_MEAN_MS,
  READING_TIME_STD_DEV_MS,
  READING_TIME_MAX_FRACTION,
  MIN_READING_TIME_MS,
  MIN_TIME_FOR_SCROLL_MS,
  SCROLL_DURATION_MIN_MS,
  SCROLL_DURATION_RANGE_MS,
  SCROLL_TIME_MAX_FRACTION,
  MOUSE_MOVE_PROBABILITY,
  MIN_TIME_FOR_MOUSE_MOVE_MS,
  MOUSE_MOVE_DURATION_MIN_MS,
  MOUSE_MOVE_DURATION_RANGE_MS,
  MOUSE_MOVE_TIME_MAX_FRACTION,
  PAUSE_PROBABILITY,
  MIN_TIME_FOR_PAUSE_MS,
  PAUSE_DURATION_MIN_MS,
  PAUSE_DURATION_RANGE_MS,
  PAUSE_TIME_MAX_FRACTION,
  MIN_SCROLL_SEGMENTS,
  SCROLL_SEGMENTS_RANGE,
  SEGMENT_HEIGHT_MIN_MULTIPLIER,
  SEGMENT_HEIGHT_VARIANCE,
  SCROLL_ANIMATION_MIN_MS,
  SCROLL_ANIMATION_RANGE_MS,
  SCROLL_PAUSE_PROBABILITY,
  SCROLL_PAUSE_MIN_MS,
  SCROLL_PAUSE_RANGE_MS,
  SCROLL_DEPTHS,
  SCROLL_DEPTH_WEIGHTS,
  MOUSE_BASE_DELAY_MS,
  MOUSE_MIN_SPEED_FACTOR,
  MOUSE_MAX_JITTER_PX,
  DEFAULT_JITTER_PX,
  READING_WPM_MEAN,
  READING_WPM_STD_DEV,
  AVERAGE_WORD_LENGTH,
  READING_TIME_MIN_VARIANCE,
  READING_TIME_VARIANCE_RANGE,
  READING_SCROLL_INTERVAL_MS,
  READING_MOUSE_INTERVAL_MS,
  NAVIGATION_DELAY_MEAN_MS,
  NAVIGATION_DELAY_STD_DEV_MS,
  HOVER_DELAY_MIN_MS,
  HOVER_DELAY_RANGE_MS,
  CLICK_DELAY_MIN_MS,
  CLICK_DELAY_RANGE_MS,
  CLICK_HOLD_MIN_MS,
  CLICK_HOLD_RANGE_MS
} from './constants';

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
  typingSpeedMin: DEFAULT_TYPING_SPEED_MIN_MS,
  typingSpeedMax: DEFAULT_TYPING_SPEED_MAX_MS,
  variancePercent: DEFAULT_VARIANCE_PERCENT,
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
      if (Math.random() < TYPING_PAUSE_PROBABILITY) {
        totalDelay += Math.floor(Math.random() * (TYPING_PAUSE_MAX_MS - TYPING_PAUSE_MIN_MS)) + TYPING_PAUSE_MIN_MS;
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
    const initialScrollTime = Math.min(remainingTime * INITIAL_SCROLL_TIME_FRACTION, MAX_INITIAL_SCROLL_TIME_MS);
    actions.push({ type: 'scroll', duration: initialScrollTime });
    remainingTime -= initialScrollTime;

    // Main interaction loop
    while (remainingTime > MIN_REMAINING_TIME_MS) {
      // Reading phase
      const readTime = Math.min(
        this.generateGaussianRandom(READING_TIME_MEAN_MS, READING_TIME_STD_DEV_MS),
        remainingTime * READING_TIME_MAX_FRACTION
      );
      if (readTime > MIN_READING_TIME_MS) {
        actions.push({ type: 'read', duration: Math.max(MIN_READING_TIME_MS, readTime) });
        remainingTime -= readTime;
      }

      // Scroll phase
      if (remainingTime > MIN_TIME_FOR_SCROLL_MS) {
        const scrollTime = Math.min(
          Math.random() * SCROLL_DURATION_RANGE_MS + SCROLL_DURATION_MIN_MS,
          remainingTime * SCROLL_TIME_MAX_FRACTION
        );
        actions.push({ type: 'scroll', duration: scrollTime });
        remainingTime -= scrollTime;
      }

      // Optional mouse movement
      if (Math.random() < MOUSE_MOVE_PROBABILITY && remainingTime > MIN_TIME_FOR_MOUSE_MOVE_MS) {
        const moveTime = Math.min(Math.random() * MOUSE_MOVE_DURATION_RANGE_MS + MOUSE_MOVE_DURATION_MIN_MS, remainingTime * MOUSE_MOVE_TIME_MAX_FRACTION);
        actions.push({ type: 'mousemove', duration: moveTime });
        remainingTime -= moveTime;
      }

      // Optional pause (simulating focus change or distraction)
      if (Math.random() < PAUSE_PROBABILITY && remainingTime > MIN_TIME_FOR_PAUSE_MS) {
        const pauseTime = Math.min(Math.random() * PAUSE_DURATION_RANGE_MS + PAUSE_DURATION_MIN_MS, remainingTime * PAUSE_TIME_MAX_FRACTION);
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
  addJitter(point: Point, maxJitter: number = DEFAULT_JITTER_PX): Point {
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
    const segments = Math.floor(Math.random() * SCROLL_SEGMENTS_RANGE) + MIN_SCROLL_SEGMENTS;
    const segmentHeight = targetPosition / segments;

    for (let i = 0; i < segments; i++) {
      currentPosition += segmentHeight * (SEGMENT_HEIGHT_MIN_MULTIPLIER + Math.random() * SEGMENT_HEIGHT_VARIANCE);
      currentPosition = Math.min(currentPosition, targetPosition);

      behaviors.push({
        scrollTo: Math.round(currentPosition),
        duration: Math.floor(Math.random() * SCROLL_ANIMATION_RANGE_MS) + SCROLL_ANIMATION_MIN_MS,
        pauseAfter: Math.random() < SCROLL_PAUSE_PROBABILITY ? Math.floor(Math.random() * SCROLL_PAUSE_RANGE_MS) + SCROLL_PAUSE_MIN_MS : 0,
      });
    }

    return behaviors;
  }

  /**
   * Generate scroll depth
   */
  private generateScrollDepth(): number {
    const random = Math.random();
    let cumulative = 0;
    
    for (let i = 0; i < SCROLL_DEPTH_WEIGHTS.length; i++) {
      cumulative += SCROLL_DEPTH_WEIGHTS[i];
      if (random < cumulative) {
        return SCROLL_DEPTHS[i];
      }
    }
    
    return SCROLL_DEPTHS[SCROLL_DEPTHS.length - 1];
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
      const delay = MOUSE_BASE_DELAY_MS / Math.max(MOUSE_MIN_SPEED_FACTOR, speedFactor) + Math.random() * MOUSE_MAX_JITTER_PX;
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
    const wordsPerMinute = this.generateGaussianRandom(READING_WPM_MEAN, READING_WPM_STD_DEV);
    const estimatedWords = contentLength / AVERAGE_WORD_LENGTH;
    const baseReadTime = (estimatedWords / wordsPerMinute) * 60 * 1000;
    
    // Add variance
    const totalTime = baseReadTime * (READING_TIME_MIN_VARIANCE + Math.random() * READING_TIME_VARIANCE_RANGE);
    
    return {
      totalTime: Math.round(totalTime),
      scrollEvents: Math.floor(totalTime / READING_SCROLL_INTERVAL_MS) + 1,
      mouseMovements: Math.floor(totalTime / READING_MOUSE_INTERVAL_MS),
    };
  }

  /**
   * Generate navigation delay (between page transitions)
   */
  generateNavigationDelay(): number {
    // 2-8 seconds between pages
    return Math.floor(this.generateGaussianRandom(NAVIGATION_DELAY_MEAN_MS, NAVIGATION_DELAY_STD_DEV_MS));
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
      hoverDelay: Math.floor(Math.random() * HOVER_DELAY_RANGE_MS) + HOVER_DELAY_MIN_MS, // Time hovering before click
      clickDelay: Math.floor(Math.random() * CLICK_DELAY_RANGE_MS) + CLICK_DELAY_MIN_MS,   // Time to initiate click
      holdDuration: Math.floor(Math.random() * CLICK_HOLD_RANGE_MS) + CLICK_HOLD_MIN_MS, // Mouse button hold time
    };
  }
}

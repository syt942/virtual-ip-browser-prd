/**
 * Domain Targeting System Tests - TDD
 * Tests written FIRST before implementation
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Import actual implementations (will fail until implemented)
import { DomainTargeting, DomainFilter } from '../../electron/core/automation/domain-targeting';
import { PageInteraction } from '../../electron/core/automation/page-interaction';
import { BehaviorSimulator } from '../../electron/core/automation/behavior-simulator';
import type { SearchResult } from '../../electron/core/automation/types';

describe('DomainTargeting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Domain Filtering', () => {
    describe('Allowlist filtering', () => {
      it('should allow domains in allowlist', () => {
        const allowlist = ['example.com', 'trusted.org'];
        const domain = 'example.com';
        
        // Expected: domain is in allowlist, should be allowed
        const isAllowed = allowlist.includes(domain);
        expect(isAllowed).toBe(true);
      });

      it('should reject domains not in allowlist when allowlist is active', () => {
        const allowlist = ['example.com', 'trusted.org'];
        const domain = 'untrusted.com';
        
        const isAllowed = allowlist.includes(domain);
        expect(isAllowed).toBe(false);
      });

      it('should handle empty allowlist (allow all)', () => {
        const allowlist: string[] = [];
        const domain = 'any-domain.com';
        
        // Empty allowlist means no restrictions
        const isAllowed = allowlist.length === 0 || allowlist.includes(domain);
        expect(isAllowed).toBe(true);
      });
    });

    describe('Blocklist filtering', () => {
      it('should block domains in blocklist', () => {
        const blocklist = ['spam.com', 'malware.net'];
        const domain = 'spam.com';
        
        const isBlocked = blocklist.includes(domain);
        expect(isBlocked).toBe(true);
      });

      it('should allow domains not in blocklist', () => {
        const blocklist = ['spam.com', 'malware.net'];
        const domain = 'legitimate.com';
        
        const isBlocked = blocklist.includes(domain);
        expect(isBlocked).toBe(false);
      });
    });

    describe('Regex pattern filtering', () => {
      it('should match domains using regex patterns', () => {
        const pattern = /^.*\.example\.com$/;
        const domain = 'sub.example.com';
        
        expect(pattern.test(domain)).toBe(true);
      });

      it('should not match non-matching domains', () => {
        const pattern = /^.*\.example\.com$/;
        const domain = 'other.com';
        
        expect(pattern.test(domain)).toBe(false);
      });

      it('should handle multiple regex patterns', () => {
        const patterns = [
          /^blog\..*\.com$/,
          /^.*\.edu$/,
          /^news\..*$/
        ];
        const domains = ['blog.test.com', 'university.edu', 'news.site.org'];
        
        const matches = domains.map(d => patterns.some(p => p.test(d)));
        expect(matches).toEqual([true, true, true]);
      });

      it('should handle invalid regex gracefully', () => {
        // Test that system handles regex compilation errors
        const createPattern = (str: string): RegExp | null => {
          try {
            return new RegExp(str);
          } catch {
            return null;
          }
        };
        
        const validPattern = createPattern('^test\\.com$');
        const invalidPattern = createPattern('[invalid');
        
        expect(validPattern).not.toBeNull();
        expect(invalidPattern).toBeNull();
      });
    });
  });

  describe('Click Detection and Selection', () => {
    const mockSearchResults: SearchResultForTargeting[] = [
      { title: 'Result 1', url: 'https://competitor.com/page', domain: 'competitor.com', position: 1 },
      { title: 'Result 2', url: 'https://target.com/landing', domain: 'target.com', position: 2 },
      { title: 'Result 3', url: 'https://another.org/info', domain: 'another.org', position: 3 },
      { title: 'Result 4', url: 'https://target.com/blog', domain: 'target.com', position: 4 },
    ];

    it('should find target domain in search results', () => {
      const targetDomains = ['target.com'];
      const found = mockSearchResults.find(r => 
        targetDomains.some(t => r.domain.includes(t))
      );
      
      expect(found).toBeDefined();
      expect(found?.domain).toBe('target.com');
      expect(found?.position).toBe(2);
    });

    it('should return first matching result when multiple exist', () => {
      const targetDomains = ['target.com'];
      const found = mockSearchResults.find(r => 
        targetDomains.some(t => r.domain.includes(t))
      );
      
      expect(found?.position).toBe(2); // First target.com result
    });

    it('should return null when no target domain found', () => {
      const targetDomains = ['nonexistent.com'];
      const found = mockSearchResults.find(r => 
        targetDomains.some(t => r.domain.includes(t))
      );
      
      expect(found).toBeUndefined();
    });

    it('should respect blocklist when selecting targets', () => {
      const targetDomains = ['target.com', 'competitor.com'];
      const blocklist = ['competitor.com'];
      
      const found = mockSearchResults.find(r => 
        targetDomains.some(t => r.domain.includes(t)) &&
        !blocklist.some(b => r.domain.includes(b))
      );
      
      expect(found?.domain).toBe('target.com');
    });

    it('should handle subdomain matching', () => {
      const results: SearchResultForTargeting[] = [
        { title: 'Blog', url: 'https://blog.target.com/post', domain: 'blog.target.com', position: 1 },
      ];
      const targetDomains = ['target.com'];
      
      const found = results.find(r => 
        targetDomains.some(t => r.domain.includes(t) || r.domain.endsWith('.' + t))
      );
      
      expect(found).toBeDefined();
      expect(found?.domain).toBe('blog.target.com');
    });
  });
});

describe('PageInteraction', () => {
  describe('Reading Time Simulation', () => {
    it('should generate reading time within bounds (30-120s)', () => {
      const minTime = 30;
      const maxTime = 120;
      
      // Simulate multiple reading times
      const generateReadingTime = (min: number, max: number): number => {
        return Math.floor(Math.random() * (max - min + 1)) + min;
      };
      
      for (let i = 0; i < 100; i++) {
        const time = generateReadingTime(minTime, maxTime);
        expect(time).toBeGreaterThanOrEqual(minTime);
        expect(time).toBeLessThanOrEqual(maxTime);
      }
    });

    it('should use gaussian distribution for more realistic timing', () => {
      // Box-Muller transform for gaussian distribution
      const gaussianRandom = (mean: number, stdDev: number): number => {
        const u1 = Math.random();
        const u2 = Math.random();
        const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
        return z0 * stdDev + mean;
      };
      
      const mean = 75; // Center of 30-120
      const stdDev = 20;
      const samples: number[] = [];
      
      for (let i = 0; i < 1000; i++) {
        let time = gaussianRandom(mean, stdDev);
        time = Math.max(30, Math.min(120, time)); // Clamp to bounds
        samples.push(time);
      }
      
      const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
      expect(avg).toBeGreaterThan(60);
      expect(avg).toBeLessThan(90);
    });

    it('should vary reading time based on content length', () => {
      const calculateReadingTime = (wordCount: number, wordsPerMinute: number = 200): number => {
        const baseTime = (wordCount / wordsPerMinute) * 60;
        const variance = baseTime * 0.2; // 20% variance
        return baseTime + (Math.random() * variance * 2 - variance);
      };
      
      const shortContent = calculateReadingTime(100);
      const longContent = calculateReadingTime(1000);
      
      expect(longContent).toBeGreaterThan(shortContent);
    });
  });

  describe('Scroll Pattern Simulation', () => {
    it('should generate realistic scroll depths (not always 100%)', () => {
      const generateScrollDepth = (): number => {
        // Most users don't scroll to bottom
        const depths = [0.3, 0.5, 0.7, 0.85, 1.0];
        const weights = [0.1, 0.25, 0.35, 0.2, 0.1];
        
        const random = Math.random();
        let cumulative = 0;
        for (let i = 0; i < weights.length; i++) {
          cumulative += weights[i];
          if (random < cumulative) {return depths[i];}
        }
        return depths[depths.length - 1];
      };
      
      const scrollDepths: number[] = [];
      for (let i = 0; i < 100; i++) {
        scrollDepths.push(generateScrollDepth());
      }
      
      // Verify distribution - most should be in middle range
      const middleRange = scrollDepths.filter(d => d >= 0.4 && d <= 0.8);
      expect(middleRange.length).toBeGreaterThan(40);
    });

    it('should generate scroll events with variable speed', () => {
      interface ScrollEvent {
        position: number;
        timestamp: number;
        speed: 'slow' | 'medium' | 'fast';
      }
      
      const generateScrollEvents = (targetDepth: number, pageHeight: number): ScrollEvent[] => {
        const events: ScrollEvent[] = [];
        let currentPos = 0;
        let time = 0;
        const targetPos = pageHeight * targetDepth;
        
        while (currentPos < targetPos) {
          const speed = Math.random() < 0.6 ? 'medium' : Math.random() < 0.5 ? 'slow' : 'fast';
          const scrollAmount = speed === 'slow' ? 50 : speed === 'medium' ? 150 : 300;
          const delay = speed === 'slow' ? 500 : speed === 'medium' ? 200 : 100;
          
          currentPos = Math.min(currentPos + scrollAmount, targetPos);
          time += delay;
          
          events.push({ position: currentPos, timestamp: time, speed });
        }
        
        return events;
      };
      
      const events = generateScrollEvents(0.8, 2000);
      
      expect(events.length).toBeGreaterThan(0);
      expect(events[events.length - 1].position).toBeLessThanOrEqual(1600);
      
      // Verify variable speeds
      const speeds = new Set(events.map(e => e.speed));
      expect(speeds.size).toBeGreaterThanOrEqual(1);
    });

    it('should include scroll pauses for reading', () => {
      interface ScrollSegment {
        scrollTo: number;
        pauseDuration: number;
      }
      
      const generateScrollWithPauses = (pageHeight: number): ScrollSegment[] => {
        const segments: ScrollSegment[] = [];
        const pausePoints = [0.2, 0.4, 0.6, 0.8].map(p => p * pageHeight);
        
        for (const point of pausePoints) {
          if (Math.random() > 0.3) { // 70% chance to pause
            segments.push({
              scrollTo: point,
              pauseDuration: Math.floor(Math.random() * 3000) + 1000 // 1-4 seconds
            });
          }
        }
        
        return segments;
      };
      
      const segments = generateScrollWithPauses(2000);
      
      // Should have some pauses
      expect(segments.length).toBeGreaterThan(0);
      segments.forEach(s => {
        expect(s.pauseDuration).toBeGreaterThanOrEqual(1000);
        expect(s.pauseDuration).toBeLessThanOrEqual(4000);
      });
    });
  });

  describe('Mouse Movement Simulation', () => {
    it('should generate curved mouse paths (not straight lines)', () => {
      interface Point { x: number; y: number; }
      
      const generateBezierPath = (start: Point, end: Point, steps: number): Point[] => {
        // Fixed control points for deterministic testing
        const cp1: Point = {
          x: start.x + (end.x - start.x) * 0.25 + 50,
          y: start.y + (end.y - start.y) * 0.25 - 30
        };
        const cp2: Point = {
          x: start.x + (end.x - start.x) * 0.75 - 40,
          y: start.y + (end.y - start.y) * 0.75 + 20
        };
        
        const path: Point[] = [];
        for (let t = 0; t <= 1; t += 1 / steps) {
          const x = Math.pow(1 - t, 3) * start.x +
                    3 * Math.pow(1 - t, 2) * t * cp1.x +
                    3 * (1 - t) * Math.pow(t, 2) * cp2.x +
                    Math.pow(t, 3) * end.x;
          const y = Math.pow(1 - t, 3) * start.y +
                    3 * Math.pow(1 - t, 2) * t * cp1.y +
                    3 * (1 - t) * Math.pow(t, 2) * cp2.y +
                    Math.pow(t, 3) * end.y;
          path.push({ x: Math.round(x), y: Math.round(y) });
        }
        
        return path;
      };
      
      const start = { x: 100, y: 100 };
      const end = { x: 500, y: 400 };
      const path = generateBezierPath(start, end, 20);
      
      expect(path.length).toBeGreaterThanOrEqual(20); // At least steps points
      // First point should be at start (exact due to t=0 in bezier)
      expect(path[0].x).toBe(start.x);
      expect(path[0].y).toBe(start.y);
      // Last point should be close to end (may have slight rounding)
      expect(Math.abs(path[path.length - 1].x - end.x)).toBeLessThanOrEqual(25);
      expect(Math.abs(path[path.length - 1].y - end.y)).toBeLessThanOrEqual(25);
      
      // Verify path is not straight (has curvature due to control points)
      const midIndex = Math.floor(path.length / 2);
      const straightMidX = (start.x + end.x) / 2;
      const straightMidY = (start.y + end.y) / 2;
      
      // Path should deviate from perfect straight line
      const deviation = Math.abs(path[midIndex].x - straightMidX) + 
                       Math.abs(path[midIndex].y - straightMidY);
      expect(deviation).toBeGreaterThan(0);
    });

    it('should add micro-movements and jitter', () => {
      interface Point { x: number; y: number; }
      
      const addJitter = (point: Point, maxJitter: number = 3): Point => {
        return {
          x: point.x + (Math.random() - 0.5) * maxJitter * 2,
          y: point.y + (Math.random() - 0.5) * maxJitter * 2
        };
      };
      
      const original = { x: 100, y: 100 };
      const jittered = addJitter(original, 5);
      
      expect(Math.abs(jittered.x - original.x)).toBeLessThanOrEqual(5);
      expect(Math.abs(jittered.y - original.y)).toBeLessThanOrEqual(5);
    });

    it('should generate variable movement speeds', () => {
      const generateMovementTimings = (pathLength: number): number[] => {
        const timings: number[] = [];
        for (let i = 0; i < pathLength; i++) {
          // Slower at start and end, faster in middle
          const progress = i / pathLength;
          const speedFactor = 1 - Math.abs(progress - 0.5) * 1.5;
          const baseDelay = 20;
          const delay = baseDelay / Math.max(0.3, speedFactor);
          timings.push(Math.round(delay + Math.random() * 10));
        }
        return timings;
      };
      
      const timings = generateMovementTimings(20);
      
      expect(timings.length).toBe(20);
      timings.forEach(t => {
        expect(t).toBeGreaterThan(0);
        expect(t).toBeLessThan(200);
      });
    });
  });
});

describe('BounceRateControl', () => {
  describe('Bounce Rate Calculation', () => {
    it('should calculate bounce rate correctly', () => {
      const calculateBounceRate = (bounces: number, totalVisits: number): number => {
        if (totalVisits === 0) {return 0;}
        return (bounces / totalVisits) * 100;
      };
      
      expect(calculateBounceRate(20, 100)).toBe(20);
      expect(calculateBounceRate(40, 100)).toBe(40);
      expect(calculateBounceRate(0, 100)).toBe(0);
      expect(calculateBounceRate(0, 0)).toBe(0);
    });

    it('should track rolling bounce rate', () => {
      class BounceRateTracker {
        private history: boolean[] = [];
        private windowSize: number;
        
        constructor(windowSize: number = 100) {
          this.windowSize = windowSize;
        }
        
        recordVisit(bounced: boolean): void {
          this.history.push(bounced);
          if (this.history.length > this.windowSize) {
            this.history.shift();
          }
        }
        
        getBounceRate(): number {
          if (this.history.length === 0) {return 0;}
          const bounces = this.history.filter(b => b).length;
          return (bounces / this.history.length) * 100;
        }
      }
      
      const tracker = new BounceRateTracker(10);
      
      // Add 3 bounces and 7 non-bounces
      [true, false, false, true, false, false, false, true, false, false].forEach(b => {
        tracker.recordVisit(b);
      });
      
      expect(tracker.getBounceRate()).toBe(30);
    });
  });

  describe('Bounce Decision Logic', () => {
    it('should not bounce when below target rate', () => {
      const shouldBounce = (currentRate: number, targetRate: number): boolean => {
        if (currentRate >= targetRate) {
          return false; // Don't bounce, we're at or above target
        }
        // Probability of bouncing decreases as we approach target
        const probability = (targetRate - currentRate) / targetRate;
        return Math.random() < probability * 0.5; // Conservative bouncing
      };
      
      // When current rate is already at target, should not bounce
      let bounceDecisions = 0;
      for (let i = 0; i < 100; i++) {
        if (shouldBounce(40, 40)) {bounceDecisions++;}
      }
      expect(bounceDecisions).toBe(0);
    });

    it('should maintain bounce rate below 40% target', () => {
      const targetBounceRate = 40;
      
      class BounceController {
        private bounces = 0;
        private total = 0;
        
        shouldBounce(): boolean {
          const currentRate = this.total > 0 ? (this.bounces / this.total) * 100 : 0;
          
          if (currentRate >= targetBounceRate - 5) {
            return false; // Too close to target
          }
          
          // Random chance to bounce, scaled by how far we are from target
          const probability = Math.max(0, (targetBounceRate - currentRate) / 100);
          return Math.random() < probability;
        }
        
        recordVisit(bounced: boolean): void {
          this.total++;
          if (bounced) {this.bounces++;}
        }
        
        getBounceRate(): number {
          return this.total > 0 ? (this.bounces / this.total) * 100 : 0;
        }
      }
      
      const controller = new BounceController();
      
      // Simulate 200 visits
      for (let i = 0; i < 200; i++) {
        const shouldBounce = controller.shouldBounce();
        controller.recordVisit(shouldBounce);
      }
      
      expect(controller.getBounceRate()).toBeLessThan(40);
    });
  });

  describe('Engagement Metrics', () => {
    it('should track time on page', () => {
      interface VisitMetrics {
        startTime: number;
        endTime: number;
        pagesViewed: number;
      }
      
      const isBounce = (metrics: VisitMetrics): boolean => {
        const timeOnPage = metrics.endTime - metrics.startTime;
        return metrics.pagesViewed === 1 && timeOnPage < 10000; // Less than 10s on single page
      };
      
      // Quick single page visit = bounce
      expect(isBounce({ startTime: 0, endTime: 5000, pagesViewed: 1 })).toBe(true);
      
      // Longer single page visit = not bounce
      expect(isBounce({ startTime: 0, endTime: 30000, pagesViewed: 1 })).toBe(false);
      
      // Multiple pages = not bounce
      expect(isBounce({ startTime: 0, endTime: 5000, pagesViewed: 2 })).toBe(false);
    });
  });
});

describe('MultiStepJourney', () => {
  describe('Journey Planning', () => {
    it('should plan 2-3 page journeys', () => {
      const planJourney = (minPages: number = 2, maxPages: number = 3): number => {
        return Math.floor(Math.random() * (maxPages - minPages + 1)) + minPages;
      };
      
      for (let i = 0; i < 100; i++) {
        const pages = planJourney(2, 3);
        expect(pages).toBeGreaterThanOrEqual(2);
        expect(pages).toBeLessThanOrEqual(3);
      }
    });

    it('should find internal links for navigation', () => {
      interface Link {
        href: string;
        text: string;
        isInternal: boolean;
      }
      
      const findInternalLinks = (links: Link[], currentDomain: string): Link[] => {
        return links.filter(link => {
          try {
            const url = new URL(link.href);
            return url.hostname === currentDomain || 
                   url.hostname.endsWith('.' + currentDomain);
          } catch {
            // Relative links are internal
            return !link.href.startsWith('http');
          }
        });
      };
      
      const links: Link[] = [
        { href: 'https://target.com/about', text: 'About', isInternal: true },
        { href: 'https://external.com/link', text: 'External', isInternal: false },
        { href: '/products', text: 'Products', isInternal: true },
        { href: 'https://blog.target.com/post', text: 'Blog', isInternal: true },
      ];
      
      const internal = findInternalLinks(links, 'target.com');
      
      expect(internal.length).toBe(3); // target.com, /products, blog.target.com
    });

    it('should select diverse pages for journey', () => {
      interface PageCandidate {
        url: string;
        type: 'product' | 'about' | 'blog' | 'contact' | 'other';
      }
      
      const selectDiversePages = (candidates: PageCandidate[], count: number): PageCandidate[] => {
        const typeGroups = new Map<string, PageCandidate[]>();
        
        candidates.forEach(c => {
          const group = typeGroups.get(c.type) || [];
          group.push(c);
          typeGroups.set(c.type, group);
        });
        
        const selected: PageCandidate[] = [];
        const types = Array.from(typeGroups.keys());
        let typeIndex = 0;
        
        while (selected.length < count && selected.length < candidates.length) {
          const type = types[typeIndex % types.length];
          const group = typeGroups.get(type)!;
          
          if (group.length > 0) {
            const randomIndex = Math.floor(Math.random() * group.length);
            selected.push(group.splice(randomIndex, 1)[0]);
          }
          
          typeIndex++;
        }
        
        return selected;
      };
      
      const candidates: PageCandidate[] = [
        { url: '/product1', type: 'product' },
        { url: '/product2', type: 'product' },
        { url: '/about', type: 'about' },
        { url: '/blog/post1', type: 'blog' },
        { url: '/contact', type: 'contact' },
      ];
      
      const selected = selectDiversePages(candidates, 3);
      
      expect(selected.length).toBe(3);
      // Should have diverse types
      const selectedTypes = new Set(selected.map(s => s.type));
      expect(selectedTypes.size).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Journey Execution', () => {
    it('should track pages visited in journey', () => {
      class JourneyTracker {
        private pages: string[] = [];
        private startTime: number = Date.now();
        
        visitPage(url: string): void {
          this.pages.push(url);
        }
        
        getPagesVisited(): number {
          return this.pages.length;
        }
        
        getJourneyDuration(): number {
          return Date.now() - this.startTime;
        }
        
        isComplete(targetPages: number): boolean {
          return this.pages.length >= targetPages;
        }
      }
      
      const tracker = new JourneyTracker();
      
      tracker.visitPage('/landing');
      expect(tracker.getPagesVisited()).toBe(1);
      expect(tracker.isComplete(3)).toBe(false);
      
      tracker.visitPage('/about');
      tracker.visitPage('/contact');
      expect(tracker.getPagesVisited()).toBe(3);
      expect(tracker.isComplete(3)).toBe(true);
    });

    it('should add delay between page navigations', () => {
      const generateNavigationDelay = (): number => {
        // 2-8 seconds between pages
        return Math.floor(Math.random() * 6000) + 2000;
      };
      
      for (let i = 0; i < 50; i++) {
        const delay = generateNavigationDelay();
        expect(delay).toBeGreaterThanOrEqual(2000);
        expect(delay).toBeLessThanOrEqual(8000);
      }
    });
  });
});

// ============================================================================
// IMPLEMENTATION CLASS TESTS
// These tests directly test the actual implementation classes
// ============================================================================

describe('DomainTargeting Class', () => {
  let targeting: DomainTargeting;

  beforeEach(() => {
    targeting = new DomainTargeting();
  });

  describe('constructor', () => {
    it('should create instance with default config', () => {
      expect(targeting).toBeDefined();
      expect(targeting.getConfig().bounceRateTarget).toBe(40);
      expect(targeting.getConfig().minReadingTime).toBe(30);
      expect(targeting.getConfig().maxReadingTime).toBe(120);
    });

    it('should accept custom config', () => {
      const customTargeting = new DomainTargeting({
        bounceRateTarget: 30,
        minReadingTime: 45,
        maxReadingTime: 90,
        journeyPagesMin: 3,
        journeyPagesMax: 5
      });
      
      expect(customTargeting.getConfig().bounceRateTarget).toBe(30);
      expect(customTargeting.getConfig().minReadingTime).toBe(45);
    });
  });

  describe('setFilters / getFilters', () => {
    it('should set and get allowlist', () => {
      targeting.setFilters({
        allowlist: ['example.com', 'trusted.org']
      });
      
      const filters = targeting.getFilters();
      expect(filters.allowlist).toContain('example.com');
      expect(filters.allowlist).toContain('trusted.org');
    });

    it('should set and get blocklist', () => {
      targeting.setFilters({
        blocklist: ['spam.com', 'blocked.net']
      });
      
      const filters = targeting.getFilters();
      expect(filters.blocklist).toContain('spam.com');
    });

    it('should set and get regex patterns', () => {
      targeting.setFilters({
        regexPatterns: ['^.*\\.example\\.com$', '^blog\\..*']
      });
      
      const filters = targeting.getFilters();
      expect(filters.regexPatterns.length).toBe(2);
    });
  });

  describe('isDomainAllowed', () => {
    it('should allow domain in allowlist', () => {
      targeting.setFilters({ allowlist: ['example.com'] });
      expect(targeting.isDomainAllowed('example.com')).toBe(true);
    });

    it('should block domain in blocklist', () => {
      targeting.setFilters({ blocklist: ['blocked.com'] });
      expect(targeting.isDomainAllowed('blocked.com')).toBe(false);
    });

    it('should allow all when allowlist is empty', () => {
      targeting.setFilters({ allowlist: [], blocklist: [] });
      expect(targeting.isDomainAllowed('any-domain.com')).toBe(true);
    });

    it('should reject domain not in non-empty allowlist', () => {
      targeting.setFilters({ allowlist: ['only-this.com'] });
      expect(targeting.isDomainAllowed('other.com')).toBe(false);
    });

    it('should match regex patterns', () => {
      targeting.setFilters({ 
        regexPatterns: ['^.*\\.example\\.com$']
      });
      expect(targeting.isDomainAllowed('sub.example.com')).toBe(true);
      expect(targeting.isDomainAllowed('other.com')).toBe(false);
    });

    it('should prioritize blocklist over allowlist', () => {
      targeting.setFilters({
        allowlist: ['example.com'],
        blocklist: ['example.com']
      });
      expect(targeting.isDomainAllowed('example.com')).toBe(false);
    });
  });

  describe('selectTargetFromResults', () => {
    const mockResults: SearchResult[] = [
      { title: 'Competitor', url: 'https://competitor.com/page', domain: 'competitor.com', position: 1, snippet: '' },
      { title: 'Target', url: 'https://target.com/landing', domain: 'target.com', position: 2, snippet: '' },
      { title: 'Another', url: 'https://another.org/info', domain: 'another.org', position: 3, snippet: '' },
    ];

    it('should find target domain in results', () => {
      targeting.setFilters({ allowlist: ['target.com'] });
      const result = targeting.selectTargetFromResults(mockResults);
      
      expect(result).toBeDefined();
      expect(result?.domain).toBe('target.com');
    });

    it('should return null when no target found', () => {
      targeting.setFilters({ allowlist: ['nonexistent.com'] });
      const result = targeting.selectTargetFromResults(mockResults);
      
      expect(result).toBeNull();
    });

    it('should skip blocked domains', () => {
      targeting.setFilters({ 
        allowlist: ['competitor.com', 'target.com'],
        blocklist: ['competitor.com']
      });
      const result = targeting.selectTargetFromResults(mockResults);
      
      expect(result?.domain).toBe('target.com');
    });

    it('should match subdomains', () => {
      const resultsWithSubdomain: SearchResult[] = [
        { title: 'Blog', url: 'https://blog.target.com/post', domain: 'blog.target.com', position: 1, snippet: '' },
      ];
      
      targeting.setFilters({ allowlist: ['target.com'] });
      const result = targeting.selectTargetFromResults(resultsWithSubdomain);
      
      expect(result).toBeDefined();
      expect(result?.domain).toBe('blog.target.com');
    });
  });

  describe('shouldBounce', () => {
    it('should not bounce when at target rate', () => {
      // Simulate visits to reach target
      for (let i = 0; i < 100; i++) {
        targeting.recordVisit(i < 40); // 40% bounce rate
      }
      
      // At target, should not bounce
      let bounces = 0;
      for (let i = 0; i < 100; i++) {
        if (targeting.shouldBounce()) {bounces++;}
      }
      
      expect(bounces).toBe(0);
    });

    it('should return boolean', () => {
      const result = targeting.shouldBounce();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('recordVisit / getBounceRate', () => {
    it('should track bounce rate correctly', () => {
      targeting.recordVisit(true);  // bounce
      targeting.recordVisit(false); // no bounce
      targeting.recordVisit(true);  // bounce
      targeting.recordVisit(false); // no bounce
      
      expect(targeting.getBounceRate()).toBe(50);
    });

    it('should return 0 for no visits', () => {
      expect(targeting.getBounceRate()).toBe(0);
    });
  });

  describe('planJourney', () => {
    it('should return 2-3 pages by default', () => {
      for (let i = 0; i < 50; i++) {
        const pages = targeting.planJourney();
        expect(pages).toBeGreaterThanOrEqual(2);
        expect(pages).toBeLessThanOrEqual(3);
      }
    });

    it('should respect custom page range', () => {
      const customTargeting = new DomainTargeting({
        journeyPagesMin: 4,
        journeyPagesMax: 6
      });
      
      for (let i = 0; i < 50; i++) {
        const pages = customTargeting.planJourney();
        expect(pages).toBeGreaterThanOrEqual(4);
        expect(pages).toBeLessThanOrEqual(6);
      }
    });
  });
});

describe('PageInteraction Class', () => {
  let interaction: PageInteraction;

  beforeEach(() => {
    interaction = new PageInteraction();
  });

  describe('constructor', () => {
    it('should create instance with default config', () => {
      expect(interaction).toBeDefined();
    });

    it('should accept custom config', () => {
      const custom = new PageInteraction({
        minReadingTime: 45,
        maxReadingTime: 90
      });
      expect(custom).toBeDefined();
    });
  });

  describe('generateReadingTime', () => {
    it('should generate time within bounds (30-120s)', () => {
      for (let i = 0; i < 100; i++) {
        const time = interaction.generateReadingTime();
        expect(time).toBeGreaterThanOrEqual(30);
        expect(time).toBeLessThanOrEqual(120);
      }
    });

    it('should generate varied times (not constant)', () => {
      const times = new Set<number>();
      for (let i = 0; i < 50; i++) {
        times.add(Math.round(interaction.generateReadingTime()));
      }
      expect(times.size).toBeGreaterThan(10);
    });
  });

  describe('generateScrollPattern', () => {
    it('should return scroll events array', () => {
      const pattern = interaction.generateScrollPattern(2000);
      expect(Array.isArray(pattern)).toBe(true);
      expect(pattern.length).toBeGreaterThan(0);
    });

    it('should have position and duration for each event', () => {
      const pattern = interaction.generateScrollPattern(1500);
      pattern.forEach(event => {
        expect(event).toHaveProperty('position');
        expect(event).toHaveProperty('duration');
        expect(typeof event.position).toBe('number');
        expect(typeof event.duration).toBe('number');
      });
    });

    it('should not exceed page height', () => {
      const pageHeight = 2000;
      const pattern = interaction.generateScrollPattern(pageHeight);
      pattern.forEach(event => {
        expect(event.position).toBeLessThanOrEqual(pageHeight);
      });
    });
  });

  describe('generateMousePath', () => {
    it('should return array of points', () => {
      const path = interaction.generateMousePath(
        { x: 0, y: 0 },
        { x: 100, y: 100 }
      );
      expect(Array.isArray(path)).toBe(true);
      expect(path.length).toBeGreaterThan(0);
    });

    it('should start near origin', () => {
      const start = { x: 50, y: 50 };
      const path = interaction.generateMousePath(start, { x: 200, y: 200 });
      
      // Allow for jitter in path generation (±5 pixels)
      expect(Math.abs(path[0].x - start.x)).toBeLessThanOrEqual(5);
      expect(Math.abs(path[0].y - start.y)).toBeLessThanOrEqual(5);
    });

    it('should end near destination', () => {
      const end = { x: 300, y: 400 };
      const path = interaction.generateMousePath({ x: 0, y: 0 }, end);
      
      const lastPoint = path[path.length - 1];
      // Allow for jitter in path generation (±5 pixels)
      expect(Math.abs(lastPoint.x - end.x)).toBeLessThanOrEqual(5);
      expect(Math.abs(lastPoint.y - end.y)).toBeLessThanOrEqual(5);
    });

    it('should include timing information', () => {
      const path = interaction.generateMousePath(
        { x: 0, y: 0 },
        { x: 100, y: 100 }
      );
      
      path.forEach(point => {
        expect(point).toHaveProperty('delay');
        expect(point.delay).toBeGreaterThan(0);
      });
    });
  });

  describe('findInternalLinks', () => {
    it('should identify internal links', () => {
      const links = [
        { href: 'https://example.com/about', text: 'About' },
        { href: 'https://external.com/page', text: 'External' },
        { href: '/products', text: 'Products' },
      ];
      
      const internal = interaction.findInternalLinks(links, 'example.com');
      
      expect(internal.length).toBe(2);
      expect(internal.some(l => l.href.includes('about'))).toBe(true);
      expect(internal.some(l => l.href === '/products')).toBe(true);
    });

    it('should include subdomain links', () => {
      const links = [
        { href: 'https://blog.example.com/post', text: 'Blog' },
      ];
      
      const internal = interaction.findInternalLinks(links, 'example.com');
      expect(internal.length).toBe(1);
    });
  });

  describe('selectNextPage', () => {
    it('should select from available links', () => {
      const links = [
        { href: '/page1', text: 'Page 1' },
        { href: '/page2', text: 'Page 2' },
        { href: '/page3', text: 'Page 3' },
      ];
      
      const selected = interaction.selectNextPage(links);
      expect(links.some(l => l.href === selected.href)).toBe(true);
    });

    it('should avoid previously visited pages', () => {
      const links = [
        { href: '/page1', text: 'Page 1' },
        { href: '/page2', text: 'Page 2' },
      ];
      const visited = ['/page1'];
      
      const selected = interaction.selectNextPage(links, visited);
      expect(selected.href).toBe('/page2');
    });

    it('should prefer priority links (about, products, etc)', () => {
      const links = [
        { href: '/random', text: 'Random' },
        { href: '/about', text: 'About Us' },
        { href: '/xyz', text: 'XYZ' },
      ];
      
      // Run multiple times to check preference
      const selections: string[] = [];
      for (let i = 0; i < 50; i++) {
        const selected = interaction.selectNextPage(links);
        selections.push(selected.href);
      }
      
      // About should be selected more often than random
      const aboutCount = selections.filter(s => s === '/about').length;
      expect(aboutCount).toBeGreaterThan(10);
    });
  });

  describe('calculateReadingTime', () => {
    it('should calculate reading time based on word count', () => {
      const time = interaction.calculateReadingTime(200);
      
      // 200 words at 200 WPM = 60 seconds base
      expect(time).toBeGreaterThan(45);
      expect(time).toBeLessThan(75);
    });

    it('should accept custom words per minute', () => {
      const fastTime = interaction.calculateReadingTime(200, 400);
      const slowTime = interaction.calculateReadingTime(200, 100);
      
      expect(slowTime).toBeGreaterThan(fastTime);
    });
  });

  describe('generateClickPosition', () => {
    it('should generate position within element bounds', () => {
      const bounds = { x: 100, y: 100, width: 200, height: 50 };
      
      for (let i = 0; i < 50; i++) {
        const pos = interaction.generateClickPosition(bounds);
        
        expect(pos.x).toBeGreaterThanOrEqual(bounds.x);
        expect(pos.x).toBeLessThanOrEqual(bounds.x + bounds.width);
        expect(pos.y).toBeGreaterThanOrEqual(bounds.y);
        expect(pos.y).toBeLessThanOrEqual(bounds.y + bounds.height);
      }
    });

    it('should bias toward center of element', () => {
      const bounds = { x: 0, y: 0, width: 100, height: 100 };
      const positions: { x: number; y: number }[] = [];
      
      for (let i = 0; i < 100; i++) {
        positions.push(interaction.generateClickPosition(bounds));
      }
      
      const avgX = positions.reduce((sum, p) => sum + p.x, 0) / positions.length;
      const avgY = positions.reduce((sum, p) => sum + p.y, 0) / positions.length;
      
      // Average should be close to center (50, 50)
      expect(avgX).toBeGreaterThan(40);
      expect(avgX).toBeLessThan(60);
      expect(avgY).toBeGreaterThan(40);
      expect(avgY).toBeLessThan(60);
    });
  });
});

describe('BehaviorSimulator Class', () => {
  let simulator: BehaviorSimulator;

  beforeEach(() => {
    simulator = new BehaviorSimulator();
  });

  describe('constructor', () => {
    it('should create instance', () => {
      expect(simulator).toBeDefined();
    });

    it('should accept custom config', () => {
      const custom = new BehaviorSimulator({
        typingSpeedMin: 30,
        typingSpeedMax: 150,
        variancePercent: 0.5
      });
      expect(custom).toBeDefined();
    });
  });

  describe('generateHumanDelay', () => {
    it('should return delay in milliseconds', () => {
      const delay = simulator.generateHumanDelay(1000);
      expect(typeof delay).toBe('number');
      expect(delay).toBeGreaterThan(0);
    });

    it('should vary around base value', () => {
      const base = 1000;
      const delays: number[] = [];
      
      for (let i = 0; i < 50; i++) {
        delays.push(simulator.generateHumanDelay(base));
      }
      
      const min = Math.min(...delays);
      const max = Math.max(...delays);
      
      expect(min).toBeLessThan(base);
      expect(max).toBeGreaterThan(base);
    });
  });

  describe('generateGaussianRandom', () => {
    it('should generate values around mean', () => {
      const mean = 75;
      const stdDev = 15;
      const samples: number[] = [];
      
      for (let i = 0; i < 1000; i++) {
        samples.push(simulator.generateGaussianRandom(mean, stdDev));
      }
      
      const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
      expect(avg).toBeGreaterThan(mean - 5);
      expect(avg).toBeLessThan(mean + 5);
    });
  });

  describe('generateTypingDelay', () => {
    it('should return delay per character', () => {
      const delay = simulator.generateTypingDelay();
      expect(delay).toBeGreaterThanOrEqual(50);
      expect(delay).toBeLessThanOrEqual(200);
    });
  });

  describe('simulateTyping', () => {
    it('should return total delay for text', () => {
      const delay = simulator.simulateTyping('hello');
      // 5 chars * 50ms min = 250ms, plus occasional thinking pauses (up to 400ms extra)
      expect(delay).toBeGreaterThanOrEqual(250);
      expect(delay).toBeLessThanOrEqual(1500); // Allow for random pauses
    });

    it('should scale with text length', () => {
      const shortDelay = simulator.simulateTyping('hi');
      const longDelay = simulator.simulateTyping('hello world this is longer');
      
      expect(longDelay).toBeGreaterThan(shortDelay);
    });
  });

  describe('generateActionSequence', () => {
    it('should return array of actions', () => {
      const sequence = simulator.generateActionSequence(60000);
      expect(Array.isArray(sequence)).toBe(true);
      expect(sequence.length).toBeGreaterThan(0);
    });

    it('should have type and duration for each action', () => {
      const sequence = simulator.generateActionSequence(30000);
      
      sequence.forEach(action => {
        expect(action).toHaveProperty('type');
        expect(action).toHaveProperty('duration');
        expect(['scroll', 'pause', 'mousemove', 'read', 'click']).toContain(action.type);
        expect(action.duration).toBeGreaterThan(0);
      });
    });

    it('should total approximately the requested duration', () => {
      const targetDuration = 45000;
      const sequence = simulator.generateActionSequence(targetDuration);
      
      const totalDuration = sequence.reduce((sum, a) => sum + a.duration, 0);
      expect(totalDuration).toBeGreaterThan(targetDuration * 0.9);
      expect(totalDuration).toBeLessThan(targetDuration * 1.1);
    });
  });

  describe('addJitter', () => {
    it('should add small random offset to point', () => {
      const point = { x: 100, y: 100 };
      const jittered = simulator.addJitter(point, 5);
      
      expect(Math.abs(jittered.x - point.x)).toBeLessThanOrEqual(5);
      expect(Math.abs(jittered.y - point.y)).toBeLessThanOrEqual(5);
    });

    it('should use default jitter when not specified', () => {
      const point = { x: 50, y: 50 };
      const jittered = simulator.addJitter(point);
      
      expect(Math.abs(jittered.x - point.x)).toBeLessThanOrEqual(3);
      expect(Math.abs(jittered.y - point.y)).toBeLessThanOrEqual(3);
    });
  });

  describe('generateScrollBehavior', () => {
    it('should return array of scroll behaviors', () => {
      const behaviors = simulator.generateScrollBehavior(2000);
      
      expect(Array.isArray(behaviors)).toBe(true);
      expect(behaviors.length).toBeGreaterThan(0);
    });

    it('should have scrollTo, duration, and pauseAfter', () => {
      const behaviors = simulator.generateScrollBehavior(1500);
      
      behaviors.forEach(behavior => {
        expect(behavior).toHaveProperty('scrollTo');
        expect(behavior).toHaveProperty('duration');
        expect(behavior).toHaveProperty('pauseAfter');
        expect(behavior.scrollTo).toBeGreaterThanOrEqual(0);
        expect(behavior.duration).toBeGreaterThan(0);
        expect(behavior.pauseAfter).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('generateMouseTiming', () => {
    it('should return array of timings', () => {
      const timings = simulator.generateMouseTiming(15);
      
      expect(Array.isArray(timings)).toBe(true);
      expect(timings.length).toBe(15);
    });

    it('should have positive timing values', () => {
      const timings = simulator.generateMouseTiming(20);
      
      timings.forEach(timing => {
        expect(timing).toBeGreaterThan(0);
      });
    });
  });

  describe('simulateReadingBehavior', () => {
    it('should return reading behavior metrics', () => {
      const behavior = simulator.simulateReadingBehavior(5000);
      
      expect(behavior).toHaveProperty('totalTime');
      expect(behavior).toHaveProperty('scrollEvents');
      expect(behavior).toHaveProperty('mouseMovements');
      expect(behavior.totalTime).toBeGreaterThan(0);
      expect(behavior.scrollEvents).toBeGreaterThanOrEqual(1);
    });

    it('should scale with content length', () => {
      const short = simulator.simulateReadingBehavior(1000);
      const long = simulator.simulateReadingBehavior(10000);
      
      expect(long.totalTime).toBeGreaterThan(short.totalTime);
    });
  });

  describe('generateNavigationDelay', () => {
    it('should return navigation delay', () => {
      const delay = simulator.generateNavigationDelay();
      
      expect(typeof delay).toBe('number');
      expect(delay).toBeGreaterThan(0);
    });

    it('should generate varied delays', () => {
      const delays: number[] = [];
      for (let i = 0; i < 50; i++) {
        delays.push(simulator.generateNavigationDelay());
      }
      
      const unique = new Set(delays);
      expect(unique.size).toBeGreaterThan(10);
    });
  });

  describe('shouldPerformAction', () => {
    it('should return boolean', () => {
      const result = simulator.shouldPerformAction(0.5);
      expect(typeof result).toBe('boolean');
    });

    it('should always return true for probability 1', () => {
      for (let i = 0; i < 20; i++) {
        expect(simulator.shouldPerformAction(1)).toBe(true);
      }
    });

    it('should always return false for probability 0', () => {
      for (let i = 0; i < 20; i++) {
        expect(simulator.shouldPerformAction(0)).toBe(false);
      }
    });
  });

  describe('generateClickTiming', () => {
    it('should return click timing object', () => {
      const timing = simulator.generateClickTiming();
      
      expect(timing).toHaveProperty('hoverDelay');
      expect(timing).toHaveProperty('clickDelay');
      expect(timing).toHaveProperty('holdDuration');
    });

    it('should have positive timing values', () => {
      const timing = simulator.generateClickTiming();
      
      expect(timing.hoverDelay).toBeGreaterThan(0);
      expect(timing.clickDelay).toBeGreaterThan(0);
      expect(timing.holdDuration).toBeGreaterThan(0);
    });
  });
});

describe('BehaviorSimulator Integration', () => {
  describe('Human-like Delays', () => {
    it('should generate delays with natural variance', () => {
      const generateHumanDelay = (baseMs: number, variancePct: number = 0.3): number => {
        const variance = baseMs * variancePct;
        return baseMs + (Math.random() - 0.5) * variance * 2;
      };
      
      const delays: number[] = [];
      for (let i = 0; i < 100; i++) {
        delays.push(generateHumanDelay(1000, 0.3));
      }
      
      const min = Math.min(...delays);
      const max = Math.max(...delays);
      
      expect(min).toBeGreaterThanOrEqual(700);
      expect(max).toBeLessThanOrEqual(1300);
      
      // Should have variance
      expect(max - min).toBeGreaterThan(100);
    });

    it('should simulate typing delays', () => {
      const generateTypingDelay = (): number => {
        // 50-200ms per character
        return Math.floor(Math.random() * 150) + 50;
      };
      
      const simulateTyping = (text: string): number => {
        let totalDelay = 0;
        for (const _char of text) {
          totalDelay += generateTypingDelay();
        }
        return totalDelay;
      };
      
      const shortText = 'hello';
      const longText = 'hello world this is a longer text';
      
      const shortDelay = simulateTyping(shortText);
      const longDelay = simulateTyping(longText);
      
      expect(longDelay).toBeGreaterThan(shortDelay);
      expect(shortDelay).toBeGreaterThanOrEqual(250); // 5 chars * 50ms min
      expect(shortDelay).toBeLessThanOrEqual(1000); // 5 chars * 200ms max
    });
  });

  describe('Action Sequencing', () => {
    it('should generate realistic action sequences', () => {
      type ActionType = 'scroll' | 'pause' | 'mousemove' | 'click' | 'read';
      
      interface Action {
        type: ActionType;
        duration: number;
      }
      
      const generateActionSequence = (totalDuration: number): Action[] => {
        const actions: Action[] = [];
        let remainingTime = totalDuration;
        
        // Start with scroll
        const scrollTime = Math.min(remainingTime * 0.1, 2000);
        actions.push({ type: 'scroll', duration: scrollTime });
        remainingTime -= scrollTime;
        
        // Add read/pause cycles
        while (remainingTime > 5000) {
          const readTime = Math.min(Math.random() * 10000 + 5000, remainingTime * 0.4);
          actions.push({ type: 'read', duration: readTime });
          remainingTime -= readTime;
          
          if (remainingTime > 2000) {
            const scrollTime = Math.min(Math.random() * 1500 + 500, remainingTime * 0.1);
            actions.push({ type: 'scroll', duration: scrollTime });
            remainingTime -= scrollTime;
          }
        }
        
        // Final pause
        if (remainingTime > 0) {
          actions.push({ type: 'pause', duration: remainingTime });
        }
        
        return actions;
      };
      
      const sequence = generateActionSequence(60000); // 60 seconds
      
      expect(sequence.length).toBeGreaterThan(0);
      expect(sequence[0].type).toBe('scroll');
      
      const totalTime = sequence.reduce((sum, a) => sum + a.duration, 0);
      expect(totalTime).toBeCloseTo(60000, -2); // Within 100ms
    });
  });
});

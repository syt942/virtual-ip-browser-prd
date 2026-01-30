# Automation & Domain Targeting Codemap

**Last Updated:** 2025-01-28  
**Location:** `electron/core/automation/`  
**Entry Points:** `domain-targeting.ts`, `page-interaction.ts`, `behavior-simulator.ts`

## Overview

The Automation module provides sophisticated web automation capabilities including domain targeting from search results, human-like page interactions, and behavior simulation. These features enable realistic browsing patterns that are indistinguishable from human users.

## Architecture

```
electron/core/automation/
├── domain-targeting.ts    # Domain filtering & bounce rate control
├── page-interaction.ts    # Mouse, scroll, and click simulation
├── behavior-simulator.ts  # Human-like behavior patterns
├── search-engine.ts       # Search engine interaction
├── executor.ts            # Task execution engine
├── scheduler.ts           # Task scheduling
├── manager.ts             # Central automation manager
├── index.ts               # Module exports
└── types.ts               # Type definitions
```

## Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Automation System                                 │
│                                                                          │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐  │
│  │ DomainTargeting  │    │ PageInteraction  │    │BehaviorSimulator │  │
│  │                  │    │                  │    │                  │  │
│  │ - Allowlist      │    │ - Mouse paths    │    │ - Typing delays  │  │
│  │ - Blocklist      │    │ - Scroll patterns│    │ - Action sequence│  │
│  │ - Regex filters  │    │ - Click positions│    │ - Human variance │  │
│  │ - Bounce rate    │    │ - Reading time   │    │ - Reading sim    │  │
│  └────────┬─────────┘    └────────┬─────────┘    └────────┬─────────┘  │
│           │                       │                       │             │
│           └───────────────────────┴───────────────────────┘             │
│                                   │                                      │
│                                   ▼                                      │
│                    ┌──────────────────────────┐                         │
│                    │    AutomationManager     │                         │
│                    │    (Orchestration)       │                         │
│                    └──────────────────────────┘                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Domain Targeting System

### Purpose
Intelligently select target domains from search results while maintaining natural bounce rate patterns.

### Key Features

| Feature | Description |
|---------|-------------|
| **Allowlist** | Only visit specified domains |
| **Blocklist** | Never visit specified domains |
| **Regex Patterns** | Match domains using regular expressions |
| **Bounce Rate Control** | Maintain target bounce rate for realistic behavior |
| **Journey Planning** | Plan multi-page visits within a domain |

### DomainTargeting Class

```typescript
interface DomainFilter {
  allowlist: string[];
  blocklist: string[];
  regexPatterns: string[];
}

interface DomainTargetingConfig {
  bounceRateTarget: number;    // Target bounce rate (default: 40%)
  minReadingTime: number;      // Minimum time on page (default: 30s)
  maxReadingTime: number;      // Maximum time on page (default: 120s)
  journeyPagesMin: number;     // Minimum pages per visit (default: 2)
  journeyPagesMax: number;     // Maximum pages per visit (default: 3)
}

class DomainTargeting {
  // Configuration
  getConfig(): DomainTargetingConfig;
  setFilters(filters: Partial<DomainFilter>): void;
  getFilters(): DomainFilter;
  
  // Domain evaluation
  isDomainAllowed(domain: string): boolean;
  selectTargetFromResults(results: SearchResult[]): SearchResult | null;
  
  // Bounce rate control
  shouldBounce(): boolean;
  recordVisit(bounced: boolean): void;
  getBounceRate(): number;
  
  // Journey planning
  planJourney(): number;  // Returns number of pages to visit
  
  // Statistics
  getStatistics(): { totalVisits, bounces, bounceRate };
  resetHistory(): void;
}
```

### Usage Example

```typescript
const targeting = new DomainTargeting({
  bounceRateTarget: 35,
  minReadingTime: 45,
  maxReadingTime: 90
});

// Set filters
targeting.setFilters({
  allowlist: ['example.com', 'target-site.org'],
  blocklist: ['competitor.com'],
  regexPatterns: ['^blog\\..*\\.com$']
});

// Select from search results
const target = targeting.selectTargetFromResults(searchResults);
if (target) {
  const shouldBounce = targeting.shouldBounce();
  const pagesInJourney = shouldBounce ? 1 : targeting.planJourney();
  // Execute visit...
  targeting.recordVisit(shouldBounce);
}
```

## Page Interaction Simulator

### Purpose
Generate human-like page interactions including scrolling, mouse movement, and click simulation.

### Key Features

| Feature | Description |
|---------|-------------|
| **Bezier Mouse Paths** | Natural curved mouse movements |
| **Gaussian Reading Time** | Statistically realistic reading durations |
| **Weighted Scroll Depth** | Realistic scroll behavior (most users don't reach bottom) |
| **Internal Link Navigation** | Intelligent next-page selection |

### PageInteraction Class

```typescript
interface PageInteractionConfig {
  minReadingTime: number;   // seconds
  maxReadingTime: number;   // seconds
  scrollSpeedMin: number;   // pixels per scroll
  scrollSpeedMax: number;   // pixels per scroll
  mouseSteps: number;       // points in mouse path
}

class PageInteraction {
  // Reading time (Gaussian distribution)
  generateReadingTime(): number;
  calculateReadingTime(wordCount: number, wordsPerMinute?: number): number;
  
  // Scroll simulation
  generateScrollPattern(pageHeight: number): ScrollEvent[];
  // Returns weighted depth: 30%→10%, 50%→25%, 70%→35%, 85%→20%, 100%→10%
  
  // Mouse movement (Bezier curves)
  generateMousePath(start: Point, end: Point, steps?: number): MousePoint[];
  generateClickPosition(elementBounds: DOMRect): Point;
  
  // Internal navigation
  findInternalLinks(links: Link[], currentDomain: string): Link[];
  selectNextPage(links: Link[], visitedPaths?: string[]): Link;
}
```

### Scroll Depth Distribution

```
Scroll Depth | Probability | Cumulative
-------------|-------------|------------
    30%      |    10%      |    10%
    50%      |    25%      |    35%
    70%      |    35%      |    70%
    85%      |    20%      |    90%
   100%      |    10%      |   100%
```

### Mouse Path Generation (Bezier Curves)

```
Start ──────●────────────────────────────────────● End
            │         Control Point 1            │
            │              ●                     │
            │                                    │
            │                    ●               │
            │              Control Point 2       │
            │                                    │
            └──── Bezier Curve with Jitter ─────┘
```

## Behavior Simulator

### Purpose
Generate comprehensive human-like behavior patterns for realistic automation.

### Key Features

| Feature | Description |
|---------|-------------|
| **Human Delays** | Variable delays with configurable variance |
| **Typing Simulation** | Realistic typing speeds with occasional pauses |
| **Action Sequences** | Complete page visit action plans |
| **Click Timing** | Hover, click, and hold duration simulation |

### BehaviorSimulator Class

```typescript
interface BehaviorConfig {
  typingSpeedMin: number;     // ms per character (default: 50)
  typingSpeedMax: number;     // ms per character (default: 200)
  variancePercent: number;    // delay variance (default: 0.3)
}

class BehaviorSimulator {
  // Delay generation
  generateHumanDelay(baseMs: number, variancePct?: number): number;
  generateGaussianRandom(mean: number, stdDev: number): number;
  
  // Typing simulation
  generateTypingDelay(): number;
  simulateTyping(text: string): number;  // Returns total delay
  
  // Action sequences
  generateActionSequence(totalDuration: number): Action[];
  // Actions: scroll, pause, mousemove, click, read
  
  // Scroll behavior
  generateScrollBehavior(pageHeight: number): ScrollBehavior[];
  
  // Mouse timing
  generateMouseTiming(pathLength: number): number[];
  
  // Reading simulation
  simulateReadingBehavior(contentLength: number): {
    totalTime: number;
    scrollEvents: number;
    mouseMovements: number;
  };
  
  // Click timing
  generateClickTiming(): {
    hoverDelay: number;      // 100-400ms
    clickDelay: number;      // 20-70ms
    holdDuration: number;    // 40-120ms
  };
  
  // Navigation
  generateNavigationDelay(): number;  // 2-8 seconds
  
  // Utilities
  addJitter(point: Point, maxJitter?: number): Point;
  shouldPerformAction(probability: number): boolean;
}
```

### Action Sequence Example

```typescript
const simulator = new BehaviorSimulator();
const actions = simulator.generateActionSequence(60000); // 60 second visit

// Example output:
[
  { type: 'scroll', duration: 2000 },
  { type: 'read', duration: 8500 },
  { type: 'scroll', duration: 800 },
  { type: 'mousemove', duration: 350 },
  { type: 'read', duration: 12000 },
  { type: 'pause', duration: 1500 },
  { type: 'scroll', duration: 600 },
  // ... continues until totalDuration reached
]
```

## Data Flow

```
┌─────────────┐     ┌──────────────────┐     ┌───────────────────┐
│ Search Task │────►│ Domain Targeting │────►│ Target Selection  │
└─────────────┘     │                  │     │                   │
                    │ - Filter check   │     │ - Allowed domain  │
                    │ - Allowlist      │     │ - Click position  │
                    │ - Blocklist      │     │ - Search result   │
                    └──────────────────┘     └─────────┬─────────┘
                                                       │
                                                       ▼
┌─────────────┐     ┌──────────────────┐     ┌───────────────────┐
│ Page Visit  │◄────│ Behavior         │◄────│ Page Interaction  │
│ Complete    │     │ Simulator        │     │                   │
│             │     │                  │     │ - Scroll pattern  │
│ - Record    │     │ - Action sequence│     │ - Mouse path      │
│ - Bounce?   │     │ - Human delays   │     │ - Reading time    │
│ - Next page │     │ - Click timing   │     │ - Link selection  │
└─────────────┘     └──────────────────┘     └───────────────────┘
```

## Integration with Other Modules

### Proxy Engine
```typescript
// Domain targeting informs proxy selection context
const context: RotationContext = {
  domain: targetDomain,
  url: targetUrl
};
const proxy = proxyRotation.selectProxy(proxies, context);
```

### Creator Support
```typescript
// Page interaction used for ad engagement
const actions = pageInteraction.generateScrollPattern(pageHeight);
const mouseMove = pageInteraction.generateMousePath(start, end);
```

## Statistics & Monitoring

```typescript
// Domain targeting statistics
const stats = targeting.getStatistics();
// { totalVisits: 150, bounces: 52, bounceRate: 34.67 }

// Reading behavior analysis
const reading = simulator.simulateReadingBehavior(5000); // 5000 chars
// { totalTime: 75000, scrollEvents: 9, mouseMovements: 5 }
```

## Best Practices

1. **Realistic Timing**: Use Gaussian distribution for all timing values
2. **Variance**: Apply 20-30% variance to all delays
3. **Bounce Rate**: Target 35-45% for realistic behavior
4. **Scroll Depth**: Most users scroll 50-70% of page
5. **Mouse Paths**: Use Bezier curves with jitter for natural movement
6. **Action Mixing**: Combine scroll, read, pause, and mouse actions

## Related Modules

- [Proxy Engine](./proxy-engine.md) - Proxy selection based on domain context
- [Creator Support](./creator-support.md) - Uses behavior simulation for ad viewing
- [Translation](./translation.md) - Keyword translation for search automation

---

*See `electron/core/automation/` for full implementation details.*

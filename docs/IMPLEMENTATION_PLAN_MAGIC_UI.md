# Implementation Plan: Magic UI Integration

## Overview

This plan details the integration of 8 Magic UI components into the Virtual IP Browser application to enhance visual appeal and user experience. The existing stack uses Tailwind CSS, Radix UI, and Lucide icons. Magic UI components will be added incrementally with minimal disruption to existing functionality.

## Requirements

- Integrate AnimatedBeam for proxy connection visualization
- Implement NeonGradientCard for proxy cards
- Add MagicCard for panel backgrounds
- Apply BorderBeam for active tabs
- Use NumberTicker for statistics displays
- Add Particles background effect to dashboard
- Implement AnimatedGridPattern for dashboard background
- Apply SparklesText for success messages

## Current Architecture Analysis

### Existing Components
| Component | Location | Purpose |
|-----------|----------|---------|
| `ProxyPanel` | `src/components/panels/ProxyPanel.tsx` | Basic proxy management |
| `EnhancedProxyPanel` | `src/components/browser/EnhancedProxyPanel.tsx` | Advanced proxy panel with store integration |
| `AutomationPanel` | `src/components/panels/AutomationPanel.tsx` | Basic automation controls |
| `EnhancedAutomationPanel` | `src/components/browser/EnhancedAutomationPanel.tsx` | Advanced automation with session management |
| `PrivacyPanel` | `src/components/panels/PrivacyPanel.tsx` | Fingerprint protection settings |
| `TabBar` | `src/components/browser/TabBar.tsx` | Browser tab management |
| `AddressBar` | `src/components/browser/AddressBar.tsx` | URL input and proxy status |
| `App` | `src/App.tsx` | Main application shell |

### Existing UI Components
| Component | Location | Description |
|-----------|----------|-------------|
| `ShimmerButton` | `src/components/ui/shimmer-button.tsx` | Animated button (Magic UI already present) |
| `ToastProvider` | `src/components/ui/toast.tsx` | Notification system |

### Tech Stack
- React 19.2.3
- Tailwind CSS 3.4.1 with `tailwindcss-animate`
- Radix UI primitives
- Lucide React icons
- Zustand for state management
- CSS custom properties for theming

---

## Component Mapping

### 1. AnimatedBeam → Proxy Connection Visualization
**Target Files:**
- `src/components/browser/EnhancedProxyPanel.tsx`
- New: `src/components/ui/animated-beam.tsx`

**Use Case:** Visualize the connection flow from browser to proxy server to target website. Shows active data transmission.

**Integration Points:**
- Proxy card when status is "active"
- Connection status indicator in AddressBar
- Optional: Full-screen connection diagram in a modal

---

### 2. NeonGradientCard → Proxy Cards
**Target Files:**
- `src/components/browser/EnhancedProxyPanel.tsx`
- `src/components/panels/ProxyPanel.tsx`
- New: `src/components/ui/neon-gradient-card.tsx`

**Use Case:** Replace plain bordered proxy cards with glowing neon effect. Color changes based on proxy status (green=active, red=failed, yellow=checking).

**Integration Points:**
- Each proxy item in the proxy list
- Currently active proxy gets enhanced glow

---

### 3. MagicCard → Panel Backgrounds
**Target Files:**
- `src/components/browser/EnhancedProxyPanel.tsx`
- `src/components/browser/EnhancedAutomationPanel.tsx`
- `src/components/panels/PrivacyPanel.tsx`
- New: `src/components/ui/magic-card.tsx`

**Use Case:** Add subtle spotlight/gradient effect that follows mouse cursor on panel containers.

**Integration Points:**
- Wrap each panel's root container
- Settings sections within panels
- Stats/statistics cards

---

### 4. BorderBeam → Active Tabs
**Target Files:**
- `src/components/browser/TabBar.tsx`
- `src/App.tsx` (ToolbarButton component)
- New: `src/components/ui/border-beam.tsx`

**Use Case:** Animated border effect on active browser tabs and active toolbar buttons.

**Integration Points:**
- Active tab in TabBar
- Active panel button in bottom toolbar
- Optional: Active form inputs

---

### 5. NumberTicker → Statistics
**Target Files:**
- `src/components/browser/EnhancedProxyPanel.tsx`
- `src/components/browser/EnhancedAutomationPanel.tsx`
- `src/components/panels/ProxyPanel.tsx`
- `src/components/panels/AutomationPanel.tsx`
- New: `src/components/ui/number-ticker.tsx`

**Use Case:** Animated counting effect for statistics (total proxies, active connections, completed tasks, success rate).

**Integration Points:**
- Stats footer in ProxyPanel (Total, Active, Failed counts)
- Session statistics in AutomationPanel
- Success rate percentages
- Latency displays

---

### 6. Particles → Background Effect
**Target Files:**
- `src/App.tsx`
- New: `src/components/ui/particles.tsx`

**Use Case:** Subtle floating particles in the main browser view area for visual polish.

**Integration Points:**
- Browser view placeholder area
- Login/onboarding screens (future)
- Empty states

---

### 7. AnimatedGridPattern → Dashboard
**Target Files:**
- `src/App.tsx`
- New: `src/components/ui/animated-grid-pattern.tsx`

**Use Case:** Subtle animated grid background for the main content area, giving a tech/cyber aesthetic.

**Integration Points:**
- Main browser view background
- Panel backgrounds (subtle, behind content)

---

### 8. SparklesText → Success Messages
**Target Files:**
- `src/components/ui/toast.tsx`
- `src/components/browser/EnhancedProxyPanel.tsx`
- `src/components/browser/EnhancedAutomationPanel.tsx`
- New: `src/components/ui/sparkles-text.tsx`

**Use Case:** Celebratory sparkle effect on success notifications and achievement messages.

**Integration Points:**
- Success toast titles
- "Proxy Connected" messages
- "Task Completed" indicators
- High success rate displays (>95%)

---

## Implementation Steps

### Phase 1: Foundation Setup (Priority: High)

#### Step 1.1: Install Dependencies
**File:** `package.json`
- **Action:** Add `framer-motion` dependency (required by most Magic UI components)
- **Why:** Magic UI components rely on framer-motion for animations
- **Dependencies:** None
- **Risk:** Low

```bash
npm install framer-motion
```

#### Step 1.2: Update Tailwind Configuration
**File:** `tailwind.config.js`
- **Action:** Add animation keyframes and utilities required by Magic UI
- **Why:** Components use custom animations not in default Tailwind
- **Dependencies:** None
- **Risk:** Low

**Changes needed:**
```javascript
// Add to theme.extend
animation: {
  'border-beam': 'border-beam calc(var(--duration)*1s) infinite linear',
  'shimmer-slide': 'shimmer-slide var(--speed) ease-in-out infinite alternate',
  'spin-around': 'spin-around calc(var(--speed) * 2) infinite linear',
  'grid': 'grid 15s linear infinite',
},
keyframes: {
  'border-beam': {
    '100%': { 'offset-distance': '100%' },
  },
  'shimmer-slide': {
    to: { transform: 'translate(calc(100cqw - 100%), 0)' },
  },
  'spin-around': {
    '0%': { transform: 'translateZ(0) rotate(0)' },
    '15%, 35%': { transform: 'translateZ(0) rotate(90deg)' },
    '65%, 85%': { transform: 'translateZ(0) rotate(270deg)' },
    '100%': { transform: 'translateZ(0) rotate(360deg)' },
  },
  grid: {
    '0%': { transform: 'translateY(-50%)' },
    '100%': { transform: 'translateY(0)' },
  },
},
```

#### Step 1.3: Create Base UI Component Structure
**File:** New directory structure
- **Action:** Create organized folder for Magic UI components
- **Why:** Keep Magic UI components separate and reusable
- **Dependencies:** None
- **Risk:** Low

```
src/components/ui/
├── magic/
│   ├── animated-beam.tsx
│   ├── border-beam.tsx
│   ├── magic-card.tsx
│   ├── neon-gradient-card.tsx
│   ├── number-ticker.tsx
│   ├── particles.tsx
│   ├── animated-grid-pattern.tsx
│   ├── sparkles-text.tsx
│   └── index.ts
```

---

### Phase 2: Core Animation Components (Priority: High)

#### Step 2.1: Implement NumberTicker Component
**File:** `src/components/ui/magic/number-ticker.tsx`
- **Action:** Create NumberTicker component with framer-motion
- **Why:** Most universally applicable, low-risk enhancement
- **Dependencies:** Step 1.1 (framer-motion)
- **Risk:** Low

**Component API:**
```tsx
interface NumberTickerProps {
  value: number;
  direction?: 'up' | 'down';
  delay?: number;
  decimalPlaces?: number;
  className?: string;
}
```

#### Step 2.2: Integrate NumberTicker in EnhancedProxyPanel
**File:** `src/components/browser/EnhancedProxyPanel.tsx`
- **Action:** Replace static numbers in stats footer with NumberTicker
- **Why:** Immediate visual improvement with minimal code change
- **Dependencies:** Step 2.1
- **Risk:** Low

**Changes (lines 174-190):**
```tsx
// Before
<div className="text-2xl font-bold">{proxies.length}</div>

// After
<NumberTicker value={proxies.length} className="text-2xl font-bold" />
```

#### Step 2.3: Integrate NumberTicker in EnhancedAutomationPanel
**File:** `src/components/browser/EnhancedAutomationPanel.tsx`
- **Action:** Replace session statistics with NumberTicker
- **Why:** Consistent animation across panels
- **Dependencies:** Step 2.1
- **Risk:** Low

**Target areas (lines 206-228):**
- `completedTasks` count
- `failedTasks` count
- `successRate` percentage
- `avgDuration` display

---

### Phase 3: Card Components (Priority: Medium)

#### Step 3.1: Implement MagicCard Component
**File:** `src/components/ui/magic/magic-card.tsx`
- **Action:** Create MagicCard with mouse-following spotlight effect
- **Why:** Enhances panel backgrounds with subtle interactivity
- **Dependencies:** Step 1.1
- **Risk:** Low

**Component API:**
```tsx
interface MagicCardProps {
  children: React.ReactNode;
  className?: string;
  gradientSize?: number;
  gradientColor?: string;
  gradientOpacity?: number;
}
```

#### Step 3.2: Implement NeonGradientCard Component
**File:** `src/components/ui/magic/neon-gradient-card.tsx`
- **Action:** Create NeonGradientCard with animated gradient border
- **Why:** Makes proxy cards visually distinctive
- **Dependencies:** Step 1.2 (Tailwind animations)
- **Risk:** Low

**Component API:**
```tsx
interface NeonGradientCardProps {
  children: React.ReactNode;
  className?: string;
  borderSize?: number;
  borderRadius?: number;
  neonColors?: { firstColor: string; secondColor: string };
}
```

#### Step 3.3: Apply NeonGradientCard to Proxy Items
**File:** `src/components/browser/EnhancedProxyPanel.tsx`
- **Action:** Wrap proxy cards with NeonGradientCard
- **Why:** Visual enhancement for proxy status indication
- **Dependencies:** Step 3.2
- **Risk:** Medium (layout changes possible)

**Changes (lines 104-166):**
- Wrap each proxy item with NeonGradientCard
- Set neonColors based on proxy.status
- Active: green glow, Failed: red glow, Checking: yellow glow

#### Step 3.4: Apply MagicCard to Panel Containers
**File:** Multiple panel files
- **Action:** Wrap panel root containers with MagicCard
- **Why:** Consistent interactive background across panels
- **Dependencies:** Step 3.1
- **Risk:** Low

**Target files:**
- `EnhancedProxyPanel.tsx` - wrap root div
- `EnhancedAutomationPanel.tsx` - wrap root div
- `PrivacyPanel.tsx` - wrap root div

---

### Phase 4: Border & Navigation Components (Priority: Medium)

#### Step 4.1: Implement BorderBeam Component
**File:** `src/components/ui/magic/border-beam.tsx`
- **Action:** Create BorderBeam with animated border effect
- **Why:** Highlights active UI elements
- **Dependencies:** Step 1.2 (Tailwind animations)
- **Risk:** Low

**Component API:**
```tsx
interface BorderBeamProps {
  className?: string;
  size?: number;
  duration?: number;
  borderWidth?: number;
  anchor?: number;
  colorFrom?: string;
  colorTo?: string;
  delay?: number;
}
```

#### Step 4.2: Apply BorderBeam to TabBar
**File:** `src/components/browser/TabBar.tsx`
- **Action:** Add BorderBeam to active tab
- **Why:** Clear visual indicator of current tab
- **Dependencies:** Step 4.1
- **Risk:** Low

**Changes (lines 10-15):**
```tsx
<div className="relative flex items-center...">
  <span className="text-sm truncate flex-1">New Tab</span>
  <button>...</button>
  <BorderBeam size={40} duration={3} borderWidth={1.5} />
</div>
```

#### Step 4.3: Apply BorderBeam to ToolbarButton
**File:** `src/App.tsx`
- **Action:** Add BorderBeam to active toolbar buttons
- **Why:** Consistent active state indication
- **Dependencies:** Step 4.1
- **Risk:** Low

**Changes to ToolbarButton component (lines 91-103):**
```tsx
function ToolbarButton({ label, active, onClick }) {
  return (
    <button className={`relative px-3 py-1.5...`}>
      {label}
      {active && <BorderBeam size={30} duration={2} />}
    </button>
  );
}
```

---

### Phase 5: Background Effects (Priority: Low)

#### Step 5.1: Implement Particles Component
**File:** `src/components/ui/magic/particles.tsx`
- **Action:** Create Particles background with configurable density
- **Why:** Adds ambient visual interest to empty areas
- **Dependencies:** Step 1.1 (framer-motion), canvas API
- **Risk:** Medium (performance consideration)

**Component API:**
```tsx
interface ParticlesProps {
  className?: string;
  quantity?: number;
  staticity?: number;
  ease?: number;
  refresh?: boolean;
  color?: string;
  vx?: number;
  vy?: number;
}
```

#### Step 5.2: Implement AnimatedGridPattern Component
**File:** `src/components/ui/magic/animated-grid-pattern.tsx`
- **Action:** Create animated grid background pattern
- **Why:** Tech/cyber aesthetic for browser view
- **Dependencies:** Step 1.2 (Tailwind animations)
- **Risk:** Low

**Component API:**
```tsx
interface AnimatedGridPatternProps {
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  strokeDasharray?: string | number;
  numSquares?: number;
  className?: string;
  maxOpacity?: number;
  duration?: number;
}
```

#### Step 5.3: Add Background Effects to App
**File:** `src/App.tsx`
- **Action:** Add Particles and AnimatedGridPattern to browser view area
- **Why:** Enhances empty state and overall aesthetic
- **Dependencies:** Steps 5.1, 5.2
- **Risk:** Medium (performance on low-end devices)

**Changes (lines 32-36):**
```tsx
<div className="flex-1 bg-secondary relative overflow-hidden">
  <AnimatedGridPattern 
    className="absolute inset-0 opacity-30"
    numSquares={30}
  />
  <Particles 
    className="absolute inset-0"
    quantity={50}
    staticity={50}
  />
  <div className="relative h-full flex items-center justify-center text-muted-foreground">
    Browser View Area
  </div>
</div>
```

---

### Phase 6: Text Effects & Polish (Priority: Low)

#### Step 6.1: Implement SparklesText Component
**File:** `src/components/ui/magic/sparkles-text.tsx`
- **Action:** Create SparklesText with animated sparkle particles
- **Why:** Celebrates success states and achievements
- **Dependencies:** Step 1.1 (framer-motion)
- **Risk:** Low

**Component API:**
```tsx
interface SparklesTextProps {
  text: string;
  className?: string;
  sparklesCount?: number;
  colors?: { first: string; second: string };
}
```

#### Step 6.2: Apply SparklesText to Toast Success Messages
**File:** `src/components/ui/toast.tsx`
- **Action:** Use SparklesText for success toast titles
- **Why:** Visual celebration of successful actions
- **Dependencies:** Step 6.1
- **Risk:** Low

**Changes (lines 85-89):**
```tsx
{toast.type === 'success' ? (
  <SparklesText text={toast.title} className="font-semibold text-sm" />
) : (
  <div className="font-semibold text-sm">{toast.title}</div>
)}
```

#### Step 6.3: Implement AnimatedBeam Component
**File:** `src/components/ui/magic/animated-beam.tsx`
- **Action:** Create AnimatedBeam for connection visualization
- **Why:** Visual representation of proxy data flow
- **Dependencies:** Step 1.1 (framer-motion)
- **Risk:** Medium (complex refs and positioning)

**Component API:**
```tsx
interface AnimatedBeamProps {
  className?: string;
  containerRef: React.RefObject<HTMLElement>;
  fromRef: React.RefObject<HTMLElement>;
  toRef: React.RefObject<HTMLElement>;
  curvature?: number;
  reverse?: boolean;
  pathColor?: string;
  pathWidth?: number;
  pathOpacity?: number;
  gradientStartColor?: string;
  gradientStopColor?: string;
  delay?: number;
  duration?: number;
  startXOffset?: number;
  startYOffset?: number;
  endXOffset?: number;
  endYOffset?: number;
}
```

#### Step 6.4: Create ProxyConnectionDiagram Component
**File:** `src/components/browser/ProxyConnectionDiagram.tsx`
- **Action:** Create a visual diagram showing connection flow using AnimatedBeam
- **Why:** Helps users understand proxy routing
- **Dependencies:** Step 6.3
- **Risk:** Medium (new component, layout complexity)

**Component shows:**
- Browser icon → Proxy server → Target website
- Animated beam showing data flow direction
- Status indicators at each node

---

## File Changes Summary

### New Files to Create
| File | Phase | Priority |
|------|-------|----------|
| `src/components/ui/magic/index.ts` | 1 | High |
| `src/components/ui/magic/number-ticker.tsx` | 2 | High |
| `src/components/ui/magic/magic-card.tsx` | 3 | Medium |
| `src/components/ui/magic/neon-gradient-card.tsx` | 3 | Medium |
| `src/components/ui/magic/border-beam.tsx` | 4 | Medium |
| `src/components/ui/magic/particles.tsx` | 5 | Low |
| `src/components/ui/magic/animated-grid-pattern.tsx` | 5 | Low |
| `src/components/ui/magic/sparkles-text.tsx` | 6 | Low |
| `src/components/ui/magic/animated-beam.tsx` | 6 | Low |
| `src/components/browser/ProxyConnectionDiagram.tsx` | 6 | Low |

### Files to Modify
| File | Changes | Phase |
|------|---------|-------|
| `package.json` | Add framer-motion | 1 |
| `tailwind.config.js` | Add animations/keyframes | 1 |
| `src/components/browser/EnhancedProxyPanel.tsx` | NumberTicker, NeonGradientCard, MagicCard | 2, 3 |
| `src/components/browser/EnhancedAutomationPanel.tsx` | NumberTicker, MagicCard | 2, 3 |
| `src/components/panels/PrivacyPanel.tsx` | MagicCard wrapper | 3 |
| `src/components/browser/TabBar.tsx` | BorderBeam on active tab | 4 |
| `src/App.tsx` | BorderBeam, Particles, AnimatedGridPattern | 4, 5 |
| `src/components/ui/toast.tsx` | SparklesText for success | 6 |

---

## Testing Strategy

### Unit Tests
- `src/components/ui/magic/*.test.tsx` - Component rendering tests
- Test props are applied correctly
- Test animation triggers
- Test accessibility (reduced motion preference)

### Integration Tests
- Panel components render with Magic UI wrappers
- Stats update correctly with NumberTicker
- Toast notifications display SparklesText

### E2E Tests
- Visual regression tests for Magic UI components
- Performance benchmarks with animations enabled
- Test animations respect `prefers-reduced-motion`

### Manual Testing Checklist
- [ ] NumberTicker animates smoothly on value changes
- [ ] NeonGradientCard colors match proxy status
- [ ] MagicCard spotlight follows mouse cursor
- [ ] BorderBeam animates on active elements
- [ ] Particles don't cause performance issues
- [ ] AnimatedGridPattern renders correctly
- [ ] SparklesText appears on success toasts
- [ ] AnimatedBeam shows connection flow
- [ ] All animations respect reduced-motion preference
- [ ] Dark/light mode compatibility

---

## Risks & Mitigations

### Risk 1: Performance Impact
**Description:** Animation components may impact performance, especially on lower-end devices.
**Mitigation:**
- Implement `prefers-reduced-motion` media query support
- Add optional `reduced` prop to disable heavy animations
- Lazy-load background effects (Particles, Grid)
- Use `will-change` CSS property sparingly
- Profile with React DevTools

### Risk 2: Bundle Size Increase
**Description:** framer-motion and new components will increase bundle size.
**Mitigation:**
- Use tree-shaking friendly imports
- Consider dynamic imports for low-priority components
- Monitor bundle size with each phase

### Risk 3: Dark/Light Mode Compatibility
**Description:** Gradient colors may not work well in both themes.
**Mitigation:**
- Use CSS custom properties for colors
- Test both themes during implementation
- Provide theme-aware default colors

### Risk 4: Z-Index Conflicts
**Description:** Overlay effects may conflict with existing UI layers.
**Mitigation:**
- Establish z-index scale in Tailwind config
- Document z-index values used
- Test panel interactions thoroughly

### Risk 5: Accessibility Concerns
**Description:** Animations may cause issues for users with vestibular disorders.
**Mitigation:**
- Respect `prefers-reduced-motion` system setting
- Provide app-level animation toggle in Settings
- Ensure all interactive elements remain keyboard accessible

---

## Success Criteria

- [ ] All 8 Magic UI components successfully integrated
- [ ] No performance regression (< 10% increase in render time)
- [ ] Bundle size increase < 50KB gzipped
- [ ] All existing tests pass
- [ ] New component tests achieve > 80% coverage
- [ ] Animations respect reduced-motion preference
- [ ] Dark and light modes render correctly
- [ ] No accessibility regressions
- [ ] User feedback indicates improved visual appeal

---

## Estimated Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Foundation | 2-3 hours | None |
| Phase 2: NumberTicker | 2-3 hours | Phase 1 |
| Phase 3: Cards | 4-5 hours | Phase 1 |
| Phase 4: BorderBeam | 2-3 hours | Phase 1 |
| Phase 5: Backgrounds | 3-4 hours | Phase 1 |
| Phase 6: Text & Polish | 4-5 hours | Phases 1-5 |

**Total Estimated Time:** 17-23 hours

---

## Appendix: Component Code Templates

### NumberTicker Template
```tsx
"use client";

import { useEffect, useRef } from "react";
import { useInView, useMotionValue, useSpring } from "framer-motion";
import { cn } from "@/utils/cn";

export function NumberTicker({
  value,
  direction = "up",
  delay = 0,
  decimalPlaces = 0,
  className,
}: {
  value: number;
  direction?: "up" | "down";
  delay?: number;
  decimalPlaces?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(direction === "down" ? value : 0);
  const springValue = useSpring(motionValue, {
    damping: 60,
    stiffness: 100,
  });
  const isInView = useInView(ref, { once: true, margin: "0px" });

  useEffect(() => {
    if (isInView) {
      setTimeout(() => {
        motionValue.set(direction === "down" ? 0 : value);
      }, delay * 1000);
    }
  }, [motionValue, isInView, delay, value, direction]);

  useEffect(() => {
    springValue.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = Intl.NumberFormat("en-US", {
          minimumFractionDigits: decimalPlaces,
          maximumFractionDigits: decimalPlaces,
        }).format(Number(latest.toFixed(decimalPlaces)));
      }
    });
  }, [springValue, decimalPlaces]);

  return (
    <span
      ref={ref}
      className={cn("tabular-nums", className)}
    >
      {value}
    </span>
  );
}
```

### BorderBeam Template
```tsx
import { cn } from "@/utils/cn";

interface BorderBeamProps {
  className?: string;
  size?: number;
  duration?: number;
  borderWidth?: number;
  anchor?: number;
  colorFrom?: string;
  colorTo?: string;
  delay?: number;
}

export function BorderBeam({
  className,
  size = 200,
  duration = 15,
  anchor = 90,
  borderWidth = 1.5,
  colorFrom = "#ffaa40",
  colorTo = "#9c40ff",
  delay = 0,
}: BorderBeamProps) {
  return (
    <div
      style={{
        "--size": size,
        "--duration": duration,
        "--anchor": anchor,
        "--border-width": borderWidth,
        "--color-from": colorFrom,
        "--color-to": colorTo,
        "--delay": `-${delay}s`,
      } as React.CSSProperties}
      className={cn(
        "pointer-events-none absolute inset-0 rounded-[inherit] [border:calc(var(--border-width)*1px)_solid_transparent]",
        "![mask-clip:padding-box,border-box] ![mask-composite:intersect] [mask:linear-gradient(transparent,transparent),linear-gradient(white,white)]",
        "after:absolute after:aspect-square after:w-[calc(var(--size)*1px)] after:animate-border-beam",
        "after:[animation-delay:var(--delay)] after:[background:linear-gradient(to_left,var(--color-from),var(--color-to),transparent)]",
        "after:[offset-anchor:calc(var(--anchor)*1%)_50%] after:[offset-path:rect(0_auto_auto_0_round_calc(var(--size)*1px))]",
        className
      )}
    />
  );
}
```

---

## Next Steps

1. Review this plan with the team
2. Prioritize phases based on immediate needs
3. Create feature branch for Magic UI integration
4. Begin Phase 1 implementation
5. Review and iterate after each phase completion

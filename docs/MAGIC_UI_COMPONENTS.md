# Magic UI Components Implementation

This document describes the Magic UI components integrated into the Virtual IP Browser application.

## Overview

Magic UI components provide enhanced visual feedback and engaging animations throughout the application. All animations respect user preferences and can be controlled via the Settings panel.

## Installed Components

### Priority 1 - Status & Feedback

#### 1. BorderBeam
- **Location**: `src/components/ui/border-beam.tsx`
- **Usage**: ProxyPanel active proxy stats
- **Trigger**: When proxy is connected (active proxies > 0)
- **Features**:
  - Animated border effect around active elements
  - Customizable colors and duration
  - Respects animation settings

#### 2. AnimatedList
- **Location**: `src/components/ui/animated-list.tsx`
- **Usage**: Available for activity logs and notification lists
- **Trigger**: New items added to list
- **Features**:
  - Spring-based entrance animations
  - Sequential item reveal with configurable delay
  - Respects prefers-reduced-motion

#### 3. Confetti
- **Location**: `src/components/ui/confetti.tsx`
- **Usage**: Global overlay in App.tsx
- **Trigger**: Automation complete, proxy rotation success
- **Features**:
  - Lightweight implementation (no external dependencies)
  - Manual trigger via `window.triggerConfetti()`
  - Configurable particle count, spread, and colors

### Priority 2 - Enhanced Visuals

#### 4. NeonGradientCard
- **Location**: `src/components/ui/neon-gradient-card.tsx`
- **Usage**: CreatorSupportPanel cards
- **Trigger**: Always visible on support options
- **Features**:
  - Dynamic neon gradient border
  - Animated glow effect
  - Customizable colors per card

#### 5. AnimatedBeam
- **Location**: `src/components/ui/animated-beam.tsx`
- **Usage**: Connection visualization (available for proxy flow diagrams)
- **Trigger**: When showing proxy/connection flow
- **Features**:
  - SVG-based animated beams between elements
  - Gradient animation along path
  - Configurable curvature and colors

#### 6. Particles
- **Location**: `src/components/ui/particles.tsx`
- **Usage**: Main dashboard background
- **Trigger**: Always visible (when enabled)
- **Features**:
  - Canvas-based particle effects
  - Mouse-interactive particles
  - Configurable quantity for performance tuning

### Priority 3 - Text Enhancements

#### 7. AnimatedGradientText
- **Location**: `src/components/ui/animated-gradient-text.tsx`
- **Usage**: Premium feature labels, headers
- **Trigger**: Always visible on designated text
- **Features**:
  - Animated gradient background on text
  - Configurable speed and colors

## Animation Settings

Users can control animations via the Settings panel (`src/components/panels/SettingsPanel.tsx`):

### Master Controls
- **Enable Animations**: Master switch for all visual effects
- **Respect System Preferences**: Automatically detects `prefers-reduced-motion`

### Individual Toggles
- Particle Effects
- Confetti
- Border Beam
- Animated Lists
- Neon Gradients
- Connection Beams
- Gradient Text

### Performance Settings
- **Particle Quantity**: 10-150 (default: 50)
- **Animation Speed**: 0.5x - 2x (default: 1x)

## Animation Store

The animation settings are managed by Zustand store at `src/stores/animationStore.ts`:

```typescript
import { useAnimationStore, useParticlesEnabled } from '@stores/animationStore'

// In components:
const particlesEnabled = useParticlesEnabled()
const { setSetting, toggleAnimations } = useAnimationStore()
```

### Available Hooks
- `useAnimationStore` - Full store access
- `useParticlesEnabled` - Particles state with reduced motion check
- `useConfettiEnabled` - Confetti state
- `useBorderBeamEnabled` - Border beam state
- `useAnimatedListEnabled` - Animated list state
- `useNeonGradientEnabled` - Neon gradient state
- `useAnimatedBeamEnabled` - Animated beam state
- `useGradientTextEnabled` - Gradient text state

## Accessibility

All Magic UI components implement accessibility best practices:

1. **Prefers Reduced Motion**: Components check `prefers-reduced-motion` media query
2. **ARIA Hidden**: Decorative animations are marked `aria-hidden="true"`
3. **User Control**: All animations can be disabled in Settings
4. **No Content Dependency**: Animations are purely decorative

## Performance Considerations

- **Bundle Size**: All components are lightweight (~25KB total)
- **Animation Overhead**: <100ms per animation cycle
- **Canvas Optimization**: Particles use requestAnimationFrame
- **Conditional Rendering**: Disabled animations render nothing

## Electron Compatibility

All components are designed for Electron renderer process:
- No SSR dependencies
- No server-side code
- Canvas operations work in Electron
- Window APIs properly handled

## File Structure

```
src/components/ui/
├── animated-beam.tsx
├── animated-gradient-text.tsx
├── animated-list.tsx
├── border-beam.tsx
├── confetti.tsx
├── neon-gradient-card.tsx
├── number-ticker.tsx
├── particles.tsx
├── pulsating-button.tsx
├── shimmer-button.tsx
├── toast.tsx
├── ErrorBoundary.tsx
└── index.ts

src/stores/
└── animationStore.ts

src/components/panels/
├── CreatorSupportPanel.tsx (uses NeonGradientCard)
└── SettingsPanel.tsx (animation controls)
```

## Usage Examples

### Confetti on Success
```typescript
// Trigger confetti from anywhere
if (typeof window !== 'undefined') {
  (window as any).triggerConfetti?.()
}
```

### Conditional BorderBeam
```typescript
import { BorderBeam } from '@components/ui/border-beam'
import { useBorderBeamEnabled } from '@stores/animationStore'

function MyComponent() {
  const borderBeamEnabled = useBorderBeamEnabled()
  
  return (
    <div className="relative">
      {isActive && borderBeamEnabled && (
        <BorderBeam colorFrom="#22c55e" colorTo="#16a34a" />
      )}
      {/* content */}
    </div>
  )
}
```

### NeonGradientCard
```typescript
import { NeonGradientCard } from '@components/ui/neon-gradient-card'

<NeonGradientCard
  neonColors={{ firstColor: '#ff00aa', secondColor: '#00FFF1' }}
  borderRadius={12}
>
  <h3>Card Content</h3>
</NeonGradientCard>
```

## Testing

Animation store tests are located at:
- `tests/unit/stores/animationStore.test.ts`

Run tests:
```bash
npm test -- --run tests/unit/stores/animationStore.test.ts
```

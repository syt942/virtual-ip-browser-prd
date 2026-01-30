# Frontend Codemap

**Last Updated:** 2025-01-28  
**Version:** 1.1.0  
**Location:** `src/`  
**Framework:** React 19 + TypeScript  
**Entry Points:** `src/App.tsx`, `src/main.tsx`

## Overview

The frontend is built with React 19, utilizing Zustand for state management, Tailwind CSS for styling, and Framer Motion for animations. It includes Magic UI components for enhanced visual effects.

## Architecture

```
src/
├── App.tsx                    # Main application component
├── main.tsx                   # React entry point
├── App.css                    # Global styles
├── components/
│   ├── browser/               # Browser chrome components
│   │   ├── TabBar.tsx
│   │   ├── AddressBar.tsx
│   │   ├── EnhancedAutomationPanel.tsx
│   │   └── EnhancedProxyPanel.tsx
│   ├── panels/                # Configuration panels
│   │   ├── AutomationPanel.tsx
│   │   ├── PrivacyPanel.tsx
│   │   ├── ProxyPanel.tsx
│   │   ├── StatsPanel.tsx         # Analytics dashboard (v1.1.0)
│   │   ├── ActivityLogPanel.tsx   # Activity logging (v1.1.0)
│   │   └── SettingsPanel.tsx
│   └── ui/                    # UI components (Magic UI)
│       ├── number-ticker.tsx  # Animated number display
│       ├── border-beam.tsx    # Animated border effect
│       ├── pulsating-button.tsx
│       ├── shimmer-button.tsx
│       └── toast.tsx
├── hooks/
│   └── useKeyboardShortcuts.ts
├── stores/                    # Zustand state stores
│   ├── tabStore.ts
│   ├── proxyStore.ts
│   ├── privacyStore.ts
│   └── automationStore.ts
└── utils/
    └── cn.ts                  # className utility
```

## Component Hierarchy

```
App
├── TabBar
│   └── Tab[] (dynamic)
├── AddressBar
│   ├── NavigationControls
│   └── URLInput
├── BrowserView (Electron)
└── Panels (collapsible)
    ├── ProxyPanel / EnhancedProxyPanel
    │   └── ProxyList, RotationConfig
    ├── PrivacyPanel
    │   └── FingerprintSettings, WebRTCConfig
    ├── AutomationPanel / EnhancedAutomationPanel
    │   └── TaskList, DomainConfig
    ├── StatsPanel (v1.1.0)
    │   └── Analytics, Charts
    ├── ActivityLogPanel (v1.1.0)
    │   └── EventLog, Filters
    └── SettingsPanel
        └── AppConfig, Theme
```

## Magic UI Components

### NumberTicker
Animated number counter with spring physics.

```tsx
interface NumberTickerProps {
  value: number;
  startValue?: number;
  direction?: "up" | "down";
  delay?: number;
  decimalPlaces?: number;
}

// Usage
<NumberTicker value={1234} delay={0.5} />
<NumberTicker value={99.9} decimalPlaces={1} direction="up" />
```

**Features:**
- Spring animation (damping: 60, stiffness: 100)
- In-view detection (animates when visible)
- Configurable decimal places
- Up/down counting direction

### BorderBeam
Animated gradient border effect.

```tsx
interface BorderBeamProps {
  size?: number;           // Beam size (default: 50)
  duration?: number;       // Animation duration (default: 6s)
  delay?: number;          // Start delay
  colorFrom?: string;      // Gradient start (default: #ffaa40)
  colorTo?: string;        // Gradient end (default: #9c40ff)
  reverse?: boolean;       // Reverse direction
  borderWidth?: number;    // Border thickness
}

// Usage
<div className="relative">
  <BorderBeam size={100} duration={8} colorFrom="#00ff00" colorTo="#0000ff" />
  <CardContent />
</div>
```

**Features:**
- CSS offset-path animation
- Customizable gradient colors
- Reversible animation direction
- Adjustable speed and size

### PulsatingButton
Button with pulsing animation effect.

```tsx
interface PulsatingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  pulseColor?: string;     // Pulse color (default: #808080)
  duration?: string;       // Animation duration (default: 1.5s)
}

// Usage
<PulsatingButton pulseColor="#3b82f6" duration="2s">
  Click Me
</PulsatingButton>
```

**Features:**
- Customizable pulse color
- Adjustable animation speed
- Forwards all button props
- forwardRef support

### ShimmerButton
Button with shimmer/shine effect.

```tsx
// Usage
<ShimmerButton className="px-4 py-2">
  Shimmer Effect
</ShimmerButton>
```

## State Management (Zustand)

### Tab Store
```typescript
interface TabState {
  tabs: Tab[];
  activeTabId: string | null;
  
  // Actions
  addTab: (tab: Tab) => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTab: (id: string, updates: Partial<Tab>) => void;
}
```

### Proxy Store
```typescript
interface ProxyState {
  proxies: ProxyConfig[];
  activeProxyId: string | null;
  rotationConfig: RotationConfig;
  
  // Actions
  addProxy: (proxy: ProxyConfig) => void;
  removeProxy: (id: string) => void;
  setActiveProxy: (id: string) => void;
  setRotationConfig: (config: RotationConfig) => void;
}
```

### Privacy Store
```typescript
interface PrivacyState {
  fingerprintConfig: FingerprintConfig;
  webrtcEnabled: boolean;
  trackerBlockingEnabled: boolean;
  
  // Actions
  setFingerprintConfig: (config: FingerprintConfig) => void;
  toggleWebRTC: () => void;
  toggleTrackerBlocking: () => void;
}
```

### Automation Store
```typescript
interface AutomationState {
  tasks: AutomationTask[];
  isRunning: boolean;
  currentTaskId: string | null;
  
  // Actions
  addTask: (task: AutomationTask) => void;
  removeTask: (id: string) => void;
  startAutomation: () => void;
  stopAutomation: () => void;
}
```

## IPC Bridge (Preload)

```typescript
// Exposed via window.api
interface ElectronAPI {
  proxy: {
    add: (config: ProxyInput) => Promise<ProxyConfig>;
    remove: (id: string) => Promise<boolean>;
    list: () => Promise<ProxyConfig[]>;
    validate: (id: string) => Promise<ValidationResult>;
    setRotation: (config: RotationConfig) => Promise<void>;
  };
  
  tab: {
    create: (config?: TabConfig) => Promise<Tab>;
    close: (id: string) => Promise<void>;
    navigate: (id: string, url: string) => Promise<void>;
  };
  
  privacy: {
    setFingerprint: (config: FingerprintConfig) => Promise<void>;
    getFingerprint: () => Promise<FingerprintConfig>;
  };
  
  automation: {
    start: (tasks: AutomationTask[]) => Promise<void>;
    stop: () => Promise<void>;
    getStatus: () => Promise<AutomationStatus>;
  };
}
```

## Styling

### Tailwind Configuration
```javascript
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{ts,tsx}', './index.html'],
  theme: {
    extend: {
      // Custom animations for Magic UI
      animation: {
        'pulse': 'pulse var(--duration) ease-out infinite',
      }
    }
  }
}
```

### Utility Function
```typescript
// src/utils/cn.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

## Keyboard Shortcuts

```typescript
// src/hooks/useKeyboardShortcuts.ts
const shortcuts = {
  'Ctrl+T': 'New tab',
  'Ctrl+W': 'Close tab',
  'Ctrl+Tab': 'Next tab',
  'Ctrl+Shift+Tab': 'Previous tab',
  'Ctrl+L': 'Focus address bar',
  'F5': 'Refresh',
  'Ctrl+Shift+P': 'Toggle proxy panel',
};
```

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| react | 19.2.3 | UI framework |
| react-dom | 19.2.3 | React DOM renderer |
| zustand | 5.0.10 | State management |
| framer-motion | 12.29.2 | Animations |
| motion/react | latest | React motion hooks |
| tailwindcss | 3.4.1 | Utility CSS |
| @radix-ui/* | various | Accessible UI primitives |
| lucide-react | 0.453.0 | Icons |
| recharts | 2.15.2 | Charts |

## Related Modules

- [Proxy Engine](./proxy-engine.md) - Backend proxy management
- [Automation](./automation.md) - Backend automation engine
- [Architecture](../ARCHITECTURE.md) - Overall system design

---

*See `src/components/` for full component implementations.*

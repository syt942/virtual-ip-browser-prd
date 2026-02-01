# Frontend Codemap

**Last Updated:** 2025-02-01  
**Version:** 1.3.0  
**Framework:** React 19.2.3 + TypeScript

## Overview

The frontend is a React application running in Electron's renderer process. It uses Zustand for state management, TailwindCSS for styling, and Magic UI components for enhanced visual effects.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend Architecture                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    App Component                         │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │   │
│  │  │   TabBar    │  │ AddressBar  │  │   Toolbar   │     │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│           ┌──────────────────┼──────────────────┐               │
│           ▼                  ▼                  ▼               │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │   Panels    │    │  Dashboard  │    │  Magic UI   │        │
│  │ - Privacy   │    │ - Activity  │    │ - Particles │        │
│  │ - Settings  │    │ - Stats     │    │ - Confetti  │        │
│  │ - Creator   │    │             │    │ - Shimmer   │        │
│  └─────────────┘    └─────────────┘    └─────────────┘        │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Zustand Stores                        │   │
│  │  proxyStore | privacyStore | automationStore | animation │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    IPC Bridge                            │   │
│  │  window.api.invoke() | window.api.on()                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## File Structure

```
src/
├── App.tsx                      # Root component
├── App.css                      # Global styles
├── main.tsx                     # Entry point
├── components/
│   ├── browser/                 # Browser UI components
│   │   ├── TabBar.tsx          # Tab management
│   │   ├── AddressBar.tsx      # URL bar
│   │   ├── EnhancedProxyPanel.tsx    # Proxy management
│   │   └── EnhancedAutomationPanel.tsx # Automation UI
│   ├── dashboard/               # Dashboard components
│   │   ├── ActivityLog.tsx     # Activity logging
│   │   └── EnhancedStatsPanel.tsx    # Statistics
│   ├── panels/                  # Side panels
│   │   ├── PrivacyPanel.tsx    # Privacy settings
│   │   ├── SettingsPanel.tsx   # App settings
│   │   ├── CreatorSupportPanel.tsx   # Creator support
│   │   └── ActivityLogPanel.tsx      # Activity logs
│   └── ui/                      # Magic UI components
│       ├── particles.tsx       # Background particles
│       ├── confetti.tsx        # Success confetti
│       ├── shimmer-button.tsx  # Shimmer effects
│       ├── pulsating-button.tsx # Pulse effects
│       ├── border-beam.tsx     # Border animations
│       ├── neon-gradient-card.tsx    # Neon cards
│       ├── animated-list.tsx   # List animations
│       └── number-ticker.tsx   # Animated numbers
├── stores/                      # Zustand stores
│   ├── proxyStore.ts           # Proxy state
│   ├── privacyStore.ts         # Privacy state
│   ├── automationStore.ts      # Automation state
│   └── animationStore.ts       # Animation preferences
├── utils/                       # Utilities
│   └── index.ts                # Helper functions
└── renderer/                    # Renderer utilities
```

## Key Components

### App.tsx

Main application component orchestrating all UI elements.

```typescript
function App() {
  const [activePanel, setActivePanel] = useState<PanelType>('proxy');
  
  return (
    <div className="app-container">
      <Particles />
      <TabBar />
      <AddressBar />
      <Toolbar onPanelChange={setActivePanel} />
      <MainContent>
        {activePanel === 'proxy' && <EnhancedProxyPanel />}
        {activePanel === 'automation' && <EnhancedAutomationPanel />}
        {activePanel === 'privacy' && <PrivacyPanel />}
        {activePanel === 'activity' && <ActivityLogPanel />}
        {activePanel === 'settings' && <SettingsPanel />}
      </MainContent>
    </div>
  );
}
```

### TabBar.tsx

Tab management with isolation indicators.

```typescript
interface Tab {
  id: string;
  title: string;
  url: string;
  isActive: boolean;
  proxyId?: string;
}

function TabBar() {
  const tabs = useTabStore(state => state.tabs);
  const createTab = useTabStore(state => state.createTab);
  
  return (
    <div className="tab-bar">
      {tabs.map(tab => (
        <TabItem 
          key={tab.id} 
          tab={tab}
          proxyIndicator={tab.proxyId ? 'active' : 'none'}
        />
      ))}
      <button onClick={createTab}>+</button>
    </div>
  );
}
```

### EnhancedProxyPanel.tsx

Proxy management with rotation strategies.

```typescript
function EnhancedProxyPanel() {
  const { proxies, addProxy, rotationStrategy, setRotationStrategy } = useProxyStore();
  
  return (
    <NeonGradientCard>
      <h2>Proxy Management</h2>
      <RotationSelector 
        value={rotationStrategy}
        onChange={setRotationStrategy}
        options={ROTATION_STRATEGIES}
      />
      <ProxyList proxies={proxies} />
      <AddProxyForm onAdd={addProxy} />
    </NeonGradientCard>
  );
}
```

## Zustand Stores

### proxyStore.ts

```typescript
interface ProxyState {
  proxies: Proxy[];
  rotationStrategy: RotationStrategy;
  isLoading: boolean;
  error: string | null;
}

interface ProxyActions {
  fetchProxies: () => Promise<void>;
  addProxy: (config: ProxyConfig) => Promise<void>;
  removeProxy: (id: string) => Promise<void>;
  validateProxy: (id: string) => Promise<void>;
  setRotationStrategy: (strategy: RotationStrategy) => Promise<void>;
}

export const useProxyStore = create<ProxyState & ProxyActions>((set, get) => ({
  proxies: [],
  rotationStrategy: 'round-robin',
  isLoading: false,
  error: null,
  
  fetchProxies: async () => {
    set({ isLoading: true });
    const result = await window.api.invoke('proxy:list');
    if (result.success) {
      set({ proxies: result.proxies, isLoading: false });
    }
  },
  // ... more actions
}));
```

### privacyStore.ts

```typescript
interface PrivacyState {
  fingerprint: FingerprintConfig;
  webrtcEnabled: boolean;
  trackerBlockingEnabled: boolean;
  stats: PrivacyStats;
}

interface PrivacyActions {
  setFingerprint: (config: FingerprintConfig) => Promise<void>;
  toggleWebRTC: (enabled: boolean) => Promise<void>;
  toggleTrackerBlocking: (enabled: boolean) => Promise<void>;
  fetchStats: () => Promise<void>;
}

export const usePrivacyStore = create<PrivacyState & PrivacyActions>(...);
```

### automationStore.ts

```typescript
interface AutomationState {
  keywords: string[];
  targetDomains: string[];
  tasks: Task[];
  isRunning: boolean;
  progress: AutomationProgress;
}

interface AutomationActions {
  addKeyword: (keyword: string) => void;
  addDomain: (domain: string) => void;
  startSearch: (config: SearchConfig) => Promise<void>;
  stopSearch: () => Promise<void>;
  scheduleTask: (schedule: ScheduleConfig) => Promise<void>;
}

export const useAutomationStore = create<AutomationState & AutomationActions>(...);
```

### animationStore.ts

```typescript
interface AnimationState {
  enabled: boolean;
  reducedMotion: boolean;
  particlesEnabled: boolean;
  confettiEnabled: boolean;
}

interface AnimationActions {
  setEnabled: (enabled: boolean) => void;
  setReducedMotion: (reduced: boolean) => void;
  toggleParticles: (enabled: boolean) => void;
  toggleConfetti: (enabled: boolean) => void;
}

export const useAnimationStore = create<AnimationState & AnimationActions>(...);
```

## Magic UI Components

### Particles (`ui/particles.tsx`)

Interactive background particle system.

```typescript
function Particles({ className, quantity = 50, ...props }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { enabled } = useAnimationStore();
  
  useEffect(() => {
    if (!enabled) return;
    // Particle animation loop
  }, [enabled]);
  
  return <canvas ref={canvasRef} className={cn("particles", className)} {...props} />;
}
```

### Confetti (`ui/confetti.tsx`)

Success celebration animations.

```typescript
function Confetti({ trigger, duration = 3000 }) {
  useEffect(() => {
    if (trigger) {
      confetti({ particleCount: 100, spread: 70 });
      setTimeout(() => confetti.reset(), duration);
    }
  }, [trigger]);
  
  return null;
}
```

### BorderBeam (`ui/border-beam.tsx`)

Animated border for active elements.

```typescript
function BorderBeam({ className, size = 200, duration = 15 }) {
  return (
    <div className={cn("border-beam", className)}>
      <div 
        className="beam"
        style={{
          width: size,
          animationDuration: `${duration}s`
        }}
      />
    </div>
  );
}
```

## Component Hierarchy

```
App
├── Particles (background)
├── TabBar
│   └── TabItem (per tab)
├── AddressBar
│   ├── NavigationControls
│   └── URLInput
├── Toolbar
│   ├── ProxyButton
│   ├── PrivacyButton
│   ├── AutomationButton
│   ├── ActivityButton
│   └── SettingsButton
└── MainContent
    ├── EnhancedProxyPanel
    │   ├── RotationSelector
    │   ├── ProxyList
    │   │   └── ProxyCard (with BorderBeam)
    │   └── AddProxyForm
    ├── EnhancedAutomationPanel
    │   ├── KeywordQueue
    │   ├── DomainList
    │   ├── EngineSelector
    │   ├── ProgressIndicator
    │   └── ScheduleForm
    ├── PrivacyPanel
    │   ├── FingerprintSettings
    │   ├── WebRTCToggle
    │   └── TrackerBlockingToggle
    ├── ActivityLogPanel
    │   ├── LogFilter
    │   └── AnimatedList (log entries)
    └── SettingsPanel
        ├── GeneralSettings
        ├── AnimationSettings
        └── AdvancedSettings
```

## Styling

### TailwindCSS Configuration

```javascript
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { /* ... */ },
        accent: { /* ... */ }
      },
      animation: {
        'border-beam': 'border-beam 15s linear infinite',
        'shimmer': 'shimmer 2s linear infinite',
      }
    }
  }
}
```

## Related Documentation

- [Architecture](../ARCHITECTURE.md) - System architecture
- [Stores Tests](../../tests/unit/stores/) - Store unit tests
- [Magic UI](../MAGIC_UI_COMPONENTS.md) - Component documentation

---

**Last Updated:** 2025-02-01 | **Version:** 1.3.0

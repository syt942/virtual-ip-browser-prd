/**
 * Main Application Component
 */

import { useState, useRef, useCallback } from 'react';
import { TabBar } from '@components/browser/TabBar';
import { AddressBar } from '@components/browser/AddressBar';
import { EnhancedProxyPanel } from '@components/browser/EnhancedProxyPanel';
import { PrivacyPanel } from '@components/panels/PrivacyPanel';
import { EnhancedAutomationPanel } from '@components/browser/EnhancedAutomationPanel';
import { ActivityLogPanel } from '@components/panels/ActivityLogPanel';
import { SettingsPanel } from '@components/panels/SettingsPanel';
import { StatsPanel } from '@components/panels/StatsPanel';
import { CreatorSupportPanel } from '@components/panels/CreatorSupportPanel';
import { Particles } from '@components/ui/particles';
import { Confetti, ConfettiRef } from '@components/ui/confetti';
import { useParticlesEnabled, useConfettiEnabled, useAnimationStore } from '@stores/animationStore';
import './App.css';

type PanelType = 'proxy' | 'privacy' | 'automation' | 'activity' | 'stats' | 'settings' | 'support' | null;

// Confetti context for global access
export const ConfettiContext = { current: null as ConfettiRef };

function App() {
  const [activePanel, setActivePanel] = useState<PanelType>('proxy');
  const confettiRef = useRef<ConfettiRef>(null);
  const particlesEnabled = useParticlesEnabled();
  const confettiEnabled = useConfettiEnabled();
  const { particleQuantity } = useAnimationStore();

  // Expose confetti trigger globally
  const triggerConfetti = useCallback(() => {
    if (confettiEnabled && confettiRef.current) {
      confettiRef.current.fire({
        particleCount: 100,
        spread: 70,
        origin: { x: 0.5, y: 0.6 },
      });
    }
  }, [confettiEnabled]);

  // Make confetti available globally via window (for IPC events)
  if (typeof window !== 'undefined') {
    (window as unknown as { triggerConfetti?: () => void }).triggerConfetti = triggerConfetti;
  }

  return (
    <div className="app-container h-screen flex flex-col bg-background text-foreground relative" data-testid="app-container">
      {/* Particles Background */}
      {particlesEnabled && (
        <Particles
          className="absolute inset-0 z-0 pointer-events-none"
          quantity={particleQuantity}
          staticity={50}
          ease={50}
          size={0.4}
          color="#6366f1"
        />
      )}

      {/* Confetti Overlay */}
      {confettiEnabled && (
        <Confetti
          ref={confettiRef}
          className="absolute inset-0 z-50 pointer-events-none"
          manualstart={true}
          enabled={confettiEnabled}
        />
      )}

      {/* Tab Bar */}
      <div className="relative z-10">
        <TabBar />
      </div>

      {/* Address Bar */}
      <div className="relative z-10">
        <AddressBar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative z-10" data-testid="main-content">
        {/* Browser View */}
        <div className="flex-1 bg-secondary/80 backdrop-blur-sm" data-testid="browser-view">
          <div className="h-full flex items-center justify-center text-muted-foreground">
            Browser View Area
          </div>
        </div>

        {/* Side Panels */}
        {activePanel && (
          <div className="w-80 border-l border-border bg-card/95 backdrop-blur-sm overflow-hidden" data-testid="side-panel">
            {activePanel === 'proxy' && <EnhancedProxyPanel />}
            {activePanel === 'privacy' && <PrivacyPanel />}
            {activePanel === 'automation' && <EnhancedAutomationPanel />}
            {activePanel === 'activity' && <ActivityLogPanel />}
            {activePanel === 'stats' && <StatsPanel />}
            {activePanel === 'settings' && <SettingsPanel />}
            {activePanel === 'support' && <CreatorSupportPanel />}
          </div>
        )}
      </div>

      {/* Bottom Toolbar */}
      <div className="h-10 border-t border-border bg-card/95 backdrop-blur-sm flex items-center justify-between px-4 relative z-10" data-testid="bottom-toolbar">
        <div className="flex items-center gap-2" data-testid="toolbar-left">
          <ToolbarButton
            label="Proxy"
            active={activePanel === 'proxy'}
            onClick={() => setActivePanel(activePanel === 'proxy' ? null : 'proxy')}
          />
          <ToolbarButton
            label="Privacy"
            active={activePanel === 'privacy'}
            onClick={() => setActivePanel(activePanel === 'privacy' ? null : 'privacy')}
          />
          <ToolbarButton
            label="Automation"
            active={activePanel === 'automation'}
            onClick={() => setActivePanel(activePanel === 'automation' ? null : 'automation')}
          />
          <ToolbarButton
            label="Activity"
            active={activePanel === 'activity'}
            onClick={() => setActivePanel(activePanel === 'activity' ? null : 'activity')}
          />
          <ToolbarButton
            label="Stats"
            active={activePanel === 'stats'}
            onClick={() => setActivePanel(activePanel === 'stats' ? null : 'stats')}
          />
        </div>
        <div className="flex items-center gap-2" data-testid="toolbar-right">
          <ToolbarButton
            label="Support"
            active={activePanel === 'support'}
            onClick={() => setActivePanel(activePanel === 'support' ? null : 'support')}
            highlight
          />
          <ToolbarButton
            label="Settings"
            active={activePanel === 'settings'}
            onClick={() => setActivePanel(activePanel === 'settings' ? null : 'settings')}
          />
        </div>
      </div>
    </div>
  );
}

// Toolbar Button Component
function ToolbarButton({ 
  label, 
  active, 
  onClick,
  highlight = false 
}: { 
  label: string
  active: boolean
  onClick: () => void
  highlight?: boolean
}) {
  return (
    <button
      onClick={onClick}
      data-testid={`panel-btn-${label.toLowerCase()}`}
      className={`px-3 py-1.5 text-xs rounded-md transition-all ${
        active
          ? 'bg-primary text-primary-foreground'
          : highlight
            ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-pink-400 hover:from-pink-500/30 hover:to-purple-500/30 border border-pink-500/30'
            : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
      }`}
    >
      {label}
    </button>
  );
}

export default App;

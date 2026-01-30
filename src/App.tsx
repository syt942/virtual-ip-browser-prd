/**
 * Main Application Component
 */

import { useState } from 'react';
import { TabBar } from '@components/browser/TabBar';
import { AddressBar } from '@components/browser/AddressBar';
import { EnhancedProxyPanel } from '@components/browser/EnhancedProxyPanel';
import { PrivacyPanel } from '@components/panels/PrivacyPanel';
import { EnhancedAutomationPanel } from '@components/browser/EnhancedAutomationPanel';
import { ActivityLogPanel } from '@components/panels/ActivityLogPanel';
import { SettingsPanel } from '@components/panels/SettingsPanel';
import { StatsPanel } from '@components/panels/StatsPanel';
// ToastProvider reserved for future toast notifications
import './App.css';

type PanelType = 'proxy' | 'privacy' | 'automation' | 'activity' | 'stats' | 'settings' | null;

function App() {
  const [activePanel, setActivePanel] = useState<PanelType>('proxy');

  return (
    <div className="app-container h-screen flex flex-col bg-background text-foreground" data-testid="app-container">
      {/* Tab Bar */}
      <TabBar />

      {/* Address Bar */}
      <AddressBar />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden" data-testid="main-content">
        {/* Browser View */}
        <div className="flex-1 bg-secondary" data-testid="browser-view">
          <div className="h-full flex items-center justify-center text-muted-foreground">
            Browser View Area
          </div>
        </div>

        {/* Side Panels */}
        {activePanel && (
          <div className="w-80 border-l border-border bg-card overflow-hidden" data-testid="side-panel">
            {activePanel === 'proxy' && <EnhancedProxyPanel />}
            {activePanel === 'privacy' && <PrivacyPanel />}
            {activePanel === 'automation' && <EnhancedAutomationPanel />}
            {activePanel === 'activity' && <ActivityLogPanel />}
            {activePanel === 'stats' && <StatsPanel />}
            {activePanel === 'settings' && <SettingsPanel />}
          </div>
        )}
      </div>

      {/* Bottom Toolbar */}
      <div className="h-10 border-t border-border bg-card flex items-center justify-between px-4" data-testid="bottom-toolbar">
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
        <ToolbarButton
          label="Settings"
          active={activePanel === 'settings'}
          onClick={() => setActivePanel(activePanel === 'settings' ? null : 'settings')}
        />
      </div>
    </div>
  );
}

// Toolbar Button Component
function ToolbarButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      data-testid={`panel-btn-${label.toLowerCase()}`}
      className={`px-3 py-1.5 text-xs rounded-md transition-all ${
        active
          ? 'bg-primary text-primary-foreground'
          : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
      }`}
    >
      {label}
    </button>
  );
}

export default App;

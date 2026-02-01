/**
 * Enhanced Automation Panel
 */

import { useState } from 'react';
import { Play, Pause, Plus, Trash2, TrendingUp } from 'lucide-react';
import { useAutomationStore } from '@stores/automationStore';
import { ShimmerButton } from '@components/ui/shimmer-button';
import { NumberTicker } from '@components/ui/number-ticker';
import { PulsatingButton } from '@components/ui/pulsating-button';

export function EnhancedAutomationPanel() {
  const {
    keywords,
    targetDomains,
    selectedEngine,
    addKeyword,
    removeKeyword,
    addTargetDomain,
    removeTargetDomain,
    setEngine,
    startSession,
    stopSession,
    getActiveSession
  } = useAutomationStore();

  const [keywordInput, setKeywordInput] = useState('');
  const [domainInput, setDomainInput] = useState('');

  const activeSession = getActiveSession();
  const isRunning = activeSession?.status === 'active';

  const handleAddKeyword = () => {
    const trimmed = keywordInput.trim();
    
    // Validation: max length, no dangerous patterns
    const MAX_KEYWORD_LENGTH = 500;
    const DANGEROUS_PATTERN = /<script|javascript:|on\w+=/i;
    
    if (!trimmed) {
      return;
    }
    
    if (trimmed.length > MAX_KEYWORD_LENGTH) {
      console.warn('[Automation] Keyword exceeds maximum length');
      return;
    }
    
    if (DANGEROUS_PATTERN.test(trimmed)) {
      console.warn('[Automation] Dangerous pattern detected in keyword');
      return;
    }
    
    addKeyword(trimmed);
    setKeywordInput('');
  };

  const handleAddDomain = () => {
    const trimmed = domainInput.trim();
    
    // Validation: max length, basic domain format
    const MAX_DOMAIN_LENGTH = 253;
    const DOMAIN_PATTERN = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    const DANGEROUS_PATTERN = /<script|javascript:|on\w+=/i;
    
    if (!trimmed) {
      return;
    }
    
    if (trimmed.length > MAX_DOMAIN_LENGTH) {
      console.warn('[Automation] Domain exceeds maximum length');
      return;
    }
    
    if (!DOMAIN_PATTERN.test(trimmed)) {
      console.warn('[Automation] Invalid domain format');
      return;
    }
    
    if (DANGEROUS_PATTERN.test(trimmed)) {
      console.warn('[Automation] Dangerous pattern detected in domain');
      return;
    }
    
    addTargetDomain(trimmed);
    setDomainInput('');
  };

  const handleStart = () => {
    if (keywords.length > 0) {
      startSession({
        engine: selectedEngine,
        keywords,
        targetDomains
      });
    }
  };

  const handleStop = () => {
    if (activeSession) {
      stopSession(activeSession.id);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-card to-card/80" data-testid="automation-panel">
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <h2 className="text-lg font-semibold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent" data-testid="automation-panel-title">
          Automation Engine
        </h2>
        
        <div className="flex gap-2" data-testid="automation-controls">
          {isRunning ? (
            <PulsatingButton
              className="flex-1 h-10 bg-red-600 hover:bg-red-700"
              onClick={handleStop}
              pulseColor="#dc2626"
              duration="1s"
              data-testid="automation-stop-btn"
            >
              <Pause size={14} className="mr-2" />
              Stop Automation
            </PulsatingButton>
          ) : (
            <ShimmerButton
              className="flex-1 h-10"
              onClick={handleStart}
              disabled={keywords.length === 0}
              background="rgba(34, 197, 94, 0.8)"
              data-testid="automation-start-btn"
            >
              <Play size={14} className="mr-2" />
              Start Automation
            </ShimmerButton>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" data-testid="automation-content">
        {/* Search Engine */}
        <div className="space-y-2" data-testid="search-engine-section">
          <label className="text-sm font-semibold text-foreground">Search Engine</label>
          <select
            value={selectedEngine}
            onChange={(e) => {
              const value = e.target.value as 'google' | 'bing' | 'duckduckgo' | 'yahoo' | 'brave';
              setEngine(value);
            }}
            className="w-full bg-background/50 border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            data-testid="search-engine-select"
          >
            <option value="google">Google</option>
            <option value="bing">Bing</option>
            <option value="duckduckgo">DuckDuckGo</option>
            <option value="yahoo">Yahoo</option>
            <option value="brave">Brave</option>
          </select>
        </div>

        {/* Keywords */}
        <div className="space-y-2" data-testid="keywords-section">
          <label className="text-sm font-semibold text-foreground flex items-center justify-between">
            <span>Keywords</span>
            <span className="text-xs text-muted-foreground" data-testid="keywords-count">{keywords.length} added</span>
          </label>
          
          <div className="flex gap-2">
            <input
              type="text"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
              placeholder="Enter keyword..."
              className="flex-1 bg-background/50 border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              data-testid="keyword-input"
            />
            <button
              onClick={handleAddKeyword}
              className="px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors"
              data-testid="add-keyword-btn"
            >
              <Plus size={16} />
            </button>
          </div>

          {keywords.length > 0 && (
            <div className="space-y-1 max-h-32 overflow-y-auto" data-testid="keywords-list">
              {keywords.map((keyword, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-background/50 border border-border/50 rounded px-3 py-1.5 text-sm group hover:border-primary/30 transition-all"
                  data-testid="keyword-item"
                >
                  <span className="flex-1 truncate">{keyword}</span>
                  <button
                    onClick={() => removeKeyword(keyword)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 text-destructive rounded transition-all"
                    data-testid="remove-keyword-btn"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Target Domains */}
        <div className="space-y-2" data-testid="domains-section">
          <label className="text-sm font-semibold text-foreground flex items-center justify-between">
            <span>Target Domains</span>
            <span className="text-xs text-muted-foreground" data-testid="domains-count">{targetDomains.length} added</span>
          </label>
          
          <div className="flex gap-2">
            <input
              type="text"
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}
              placeholder="example.com"
              className="flex-1 bg-background/50 border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              data-testid="domain-input"
            />
            <button
              onClick={handleAddDomain}
              className="px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors"
              data-testid="add-domain-btn"
            >
              <Plus size={16} />
            </button>
          </div>

          {targetDomains.length > 0 && (
            <div className="space-y-1 max-h-32 overflow-y-auto" data-testid="domains-list">
              {targetDomains.map((domain, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-background/50 border border-border/50 rounded px-3 py-1.5 text-sm group hover:border-primary/30 transition-all"
                  data-testid="domain-item"
                >
                  <span className="flex-1 truncate">{domain}</span>
                  <button
                    onClick={() => removeTargetDomain(domain)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 text-destructive rounded transition-all"
                    data-testid="remove-domain-btn"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Statistics */}
        {activeSession && (
          <div className="border border-border/50 rounded-lg p-4 bg-gradient-to-br from-primary/5 to-transparent space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <TrendingUp size={14} className="text-primary" />
              <span>Session Statistics</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Completed</div>
                <NumberTicker 
                  value={activeSession.statistics.completedTasks}
                  className="text-lg font-bold text-green-500"
                />
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Failed</div>
                <NumberTicker 
                  value={activeSession.statistics.failedTasks}
                  className="text-lg font-bold text-red-500"
                />
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Success Rate</div>
                <NumberTicker 
                  value={activeSession.statistics.successRate}
                  decimalPlaces={1}
                  className="text-lg font-bold"
                />
                <span className="text-lg font-bold">%</span>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Avg Duration</div>
                <NumberTicker 
                  value={activeSession.statistics.avgDuration / 1000}
                  decimalPlaces={1}
                  className="text-lg font-bold"
                />
                <span className="text-lg font-bold">s</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Address Bar Component
 */

import { ArrowLeft, ArrowRight, RotateCw, Lock } from 'lucide-react';

export function AddressBar() {
  return (
    <div className="h-12 bg-card border-b border-border flex items-center px-3 gap-2" data-testid="address-bar">
      {/* Navigation Buttons */}
      <div className="flex items-center gap-1" data-testid="nav-buttons">
        <button className="hover:bg-secondary rounded p-1.5" disabled data-testid="nav-back" aria-label="Back">
          <ArrowLeft size={18} className="text-muted-foreground" />
        </button>
        <button className="hover:bg-secondary rounded p-1.5" disabled data-testid="nav-forward" aria-label="Forward">
          <ArrowRight size={18} className="text-muted-foreground" />
        </button>
        <button className="hover:bg-secondary rounded p-1.5" data-testid="nav-reload" aria-label="Reload">
          <RotateCw size={18} />
        </button>
      </div>

      {/* URL Input */}
      <div className="flex-1 flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-1.5" data-testid="url-container">
        <Lock size={14} className="text-muted-foreground" data-testid="secure-icon" />
        <input
          type="text"
          placeholder="Search or enter URL..."
          className="flex-1 bg-transparent outline-none text-sm"
          data-testid="address-input"
        />
      </div>

      {/* Proxy Status */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-lg" data-testid="proxy-status">
        <div className="w-2 h-2 rounded-full bg-green-500" data-testid="proxy-status-indicator" />
        <span className="text-xs font-medium" data-testid="proxy-status-text">Proxy Active</span>
      </div>
    </div>
  );
}

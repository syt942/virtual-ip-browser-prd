/**
 * Tab Bar Component
 */

import { Plus, X } from 'lucide-react';

export function TabBar() {
  return (
    <div className="h-10 bg-card border-b border-border flex items-center px-2 gap-1" data-testid="tab-bar">
      {/* Mock Tab */}
      <div className="flex items-center gap-2 px-3 py-1 bg-background rounded-t border border-b-0 border-border min-w-[180px] max-w-[240px]" data-testid="tab-item">
        <span className="text-sm truncate flex-1" data-testid="tab-title">New Tab</span>
        <button className="hover:bg-secondary rounded p-0.5" data-testid="tab-close" aria-label="Close tab">
          <X size={14} />
        </button>
      </div>

      {/* New Tab Button */}
      <button className="hover:bg-secondary rounded p-1.5" data-testid="new-tab-btn" aria-label="New tab">
        <Plus size={16} />
      </button>
    </div>
  );
}

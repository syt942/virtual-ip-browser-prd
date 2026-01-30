/**
 * Automation Panel
 */

import { Play, Pause } from 'lucide-react';

export function AutomationPanel() {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold mb-3">Automation</h2>
        <div className="flex gap-2">
          <button className="flex-1 bg-primary text-primary-foreground rounded px-3 py-2 text-sm hover:opacity-90">
            <Play size={14} className="inline mr-1" />
            Start
          </button>
          <button className="flex-1 bg-secondary text-secondary-foreground rounded px-3 py-2 text-sm hover:bg-secondary/80">
            <Pause size={14} className="inline mr-1" />
            Pause
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Search Engine Selection */}
        <div>
          <label className="text-sm font-semibold mb-2 block">Search Engine</label>
          <select className="w-full bg-background border border-border rounded px-3 py-2 text-sm">
            <option>Google</option>
            <option>Bing</option>
            <option>DuckDuckGo</option>
            <option>Yahoo</option>
          </select>
        </div>

        {/* Keywords */}
        <div>
          <label className="text-sm font-semibold mb-2 block">Keywords</label>
          <textarea
            className="w-full bg-background border border-border rounded px-3 py-2 text-sm resize-none"
            rows={4}
            placeholder="Enter keywords (one per line)..."
          />
          <button className="mt-2 w-full bg-secondary text-secondary-foreground rounded px-3 py-2 text-sm hover:bg-secondary/80">
            Add Keywords
          </button>
        </div>

        {/* Target Domains */}
        <div>
          <label className="text-sm font-semibold mb-2 block">Target Domains</label>
          <textarea
            className="w-full bg-background border border-border rounded px-3 py-2 text-sm resize-none"
            rows={3}
            placeholder="Enter domains (one per line)..."
          />
          <button className="mt-2 w-full bg-secondary text-secondary-foreground rounded px-3 py-2 text-sm hover:bg-secondary/80">
            Add Domains
          </button>
        </div>

        {/* Stats */}
        <div className="border border-border rounded-lg p-3 bg-secondary/30">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div>
              <div className="text-lg font-semibold">0</div>
              <div className="text-xs text-muted-foreground">Tasks Queued</div>
            </div>
            <div>
              <div className="text-lg font-semibold">0</div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

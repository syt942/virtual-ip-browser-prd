/**
 * Proxy Management Panel
 */

import { Plus, CheckCircle, XCircle, Clock } from 'lucide-react';

export function ProxyPanel() {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Proxy Manager</h2>
          <button className="bg-primary text-primary-foreground rounded px-3 py-1.5 text-sm hover:opacity-90">
            <Plus size={14} className="inline mr-1" />
            Add Proxy
          </button>
        </div>
        
        {/* Rotation Strategy */}
        <select className="w-full bg-background border border-border rounded px-3 py-2 text-sm">
          <option>Round Robin</option>
          <option>Random</option>
          <option>Least Used</option>
          <option>Fastest</option>
          <option>Failure Aware</option>
        </select>
      </div>

      {/* Proxy List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {/* Mock Proxy Item */}
        <div className="border border-border rounded-lg p-3 hover:bg-secondary/50 transition-colors">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle size={14} className="text-green-500" />
                <span className="font-medium text-sm">US Proxy 1</span>
              </div>
              <p className="text-xs text-muted-foreground">proxy1.example.com:8080</p>
            </div>
            <span className="text-xs text-muted-foreground">45ms</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded">HTTPS</span>
            <span className="text-muted-foreground">Success: 98.5%</span>
          </div>
        </div>

        {/* Mock Failed Proxy */}
        <div className="border border-border rounded-lg p-3 hover:bg-secondary/50 transition-colors opacity-60">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <XCircle size={14} className="text-red-500" />
                <span className="font-medium text-sm">EU Proxy 1</span>
              </div>
              <p className="text-xs text-muted-foreground">proxy2.example.com:8080</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="bg-destructive/10 text-destructive px-2 py-0.5 rounded">Failed</span>
            <span className="text-muted-foreground">Last check: 2m ago</span>
          </div>
        </div>

        {/* Mock Checking Proxy */}
        <div className="border border-border rounded-lg p-3 hover:bg-secondary/50 transition-colors">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Clock size={14} className="text-yellow-500 animate-spin" />
                <span className="font-medium text-sm">Asia Proxy 1</span>
              </div>
              <p className="text-xs text-muted-foreground">proxy3.example.com:8080</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="bg-yellow-500/10 text-yellow-600 px-2 py-0.5 rounded">Checking</span>
          </div>
        </div>
      </div>

      {/* Stats Footer */}
      <div className="p-4 border-t border-border bg-secondary/30">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-lg font-semibold">3</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-green-500">1</div>
            <div className="text-xs text-muted-foreground">Active</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-red-500">1</div>
            <div className="text-xs text-muted-foreground">Failed</div>
          </div>
        </div>
      </div>
    </div>
  );
}

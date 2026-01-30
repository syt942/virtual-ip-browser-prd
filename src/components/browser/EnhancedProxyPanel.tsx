/**
 * Enhanced Proxy Panel with Magic UI
 */

import { useEffect } from 'react';
import { Plus, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { useProxyStore } from '@stores/proxyStore';
import { ShimmerButton } from '@components/ui/shimmer-button';
import { NumberTicker } from '@components/ui/number-ticker';
import { BorderBeam } from '@components/ui/border-beam';

export function EnhancedProxyPanel() {
  const { 
    proxies, 
    rotationStrategy, 
    isLoading,
    loadProxies, 
    removeProxy,
    validateProxy,
    setRotationStrategy,
    getActiveProxies
  } = useProxyStore();

  useEffect(() => {
    loadProxies();
  }, [loadProxies]);

  const activeProxies = getActiveProxies();
  const failedProxies = proxies.filter(p => p.status === 'failed');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle size={14} className="text-green-500" />;
      case 'failed':
        return <XCircle size={14} className="text-red-500" />;
      case 'checking':
        return <Clock size={14} className="text-yellow-500 animate-spin" />;
      default:
        return <Clock size={14} className="text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'failed':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'checking':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-card to-card/80" data-testid="proxy-panel">
      {/* Header */}
      <div className="p-4 border-b border-border/50 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent" data-testid="proxy-panel-title">
            Proxy Manager
          </h2>
          <ShimmerButton
            className="h-9 px-4"
            onClick={() => {/* Add proxy modal */}}
            data-testid="add-proxy-btn"
          >
            <Plus size={14} className="mr-2" />
            Add Proxy
          </ShimmerButton>
        </div>
        
        {/* Rotation Strategy */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Rotation Strategy</label>
          <select 
            value={rotationStrategy}
            onChange={(e) => setRotationStrategy(e.target.value as any)}
            className="w-full bg-background/50 backdrop-blur-sm border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            data-testid="rotation-strategy-select"
          >
            <option value="round-robin">Round Robin</option>
            <option value="random">Random</option>
            <option value="least-used">Least Used</option>
            <option value="fastest">Fastest</option>
            <option value="failure-aware">Failure Aware</option>
            <option value="weighted">Weighted</option>
          </select>
        </div>
      </div>

      {/* Proxy List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3" data-testid="proxy-list">
        {isLoading ? (
          <div className="flex items-center justify-center h-full" data-testid="proxy-loading">
            <RefreshCw className="animate-spin text-primary" size={24} />
          </div>
        ) : proxies.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground" data-testid="proxy-empty-state">
            <Plus size={48} className="mb-4 opacity-20" />
            <p className="text-sm">No proxies configured</p>
            <p className="text-xs mt-1">Click "Add Proxy" to get started</p>
          </div>
        ) : (
          proxies.map((proxy) => (
            <div
              key={proxy.id}
              className="group relative border border-border/50 rounded-lg p-3 hover:border-primary/30 transition-all duration-300 bg-gradient-to-br from-background/80 to-background/40 backdrop-blur-sm overflow-hidden"
              data-testid="proxy-item"
            >
              {/* Subtle gradient overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="relative">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(proxy.status)}
                      <span className="font-medium text-sm">{proxy.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                      <span>{proxy.host}:{proxy.port}</span>
                      {proxy.region && (
                        <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px]">
                          {proxy.region}
                        </span>
                      )}
                    </p>
                  </div>
                  {proxy.latency && (
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {proxy.latency}ms
                    </span>
                  )}
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`px-2 py-0.5 rounded border ${getStatusColor(proxy.status)}`}>
                      {proxy.protocol.toUpperCase()}
                    </span>
                    {proxy.status === 'active' && (
                      <span className="text-muted-foreground">
                        Success: {proxy.successRate.toFixed(1)}%
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => validateProxy(proxy.id)}
                      className="p-1 hover:bg-primary/10 rounded transition-colors"
                      title="Validate proxy"
                    >
                      <RefreshCw size={12} />
                    </button>
                    <button
                      onClick={() => removeProxy(proxy.id)}
                      className="p-1 hover:bg-destructive/10 text-destructive rounded transition-colors"
                      title="Remove proxy"
                    >
                      <XCircle size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Stats Footer */}
      <div className="p-4 border-t border-border/50 backdrop-blur-sm bg-secondary/30" data-testid="proxy-stats">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="space-y-1" data-testid="proxy-stat-total">
            <NumberTicker 
              value={proxies.length} 
              className="text-2xl font-bold bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-transparent"
            />
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</div>
          </div>
          <div className="space-y-1 relative" data-testid="proxy-stat-active">
            <NumberTicker 
              value={activeProxies.length} 
              className="text-2xl font-bold text-green-500"
            />
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Active</div>
            {activeProxies.length > 0 && (
              <BorderBeam 
                size={40} 
                duration={3} 
                colorFrom="#22c55e" 
                colorTo="#16a34a"
                className="rounded-lg"
              />
            )}
          </div>
          <div className="space-y-1" data-testid="proxy-stat-failed">
            <NumberTicker 
              value={failedProxies.length} 
              className="text-2xl font-bold text-red-500"
            />
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Failed</div>
          </div>
        </div>
      </div>
    </div>
  );
}

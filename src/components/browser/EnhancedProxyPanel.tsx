/**
 * Enhanced Proxy Panel with Magic UI
 */

import { useEffect, useState } from 'react';
import { Plus, CheckCircle, XCircle, Clock, RefreshCw, Upload, Download } from 'lucide-react';
import { useProxyStore } from '@stores/proxyStore';
import { ShimmerButton } from '@components/ui/shimmer-button';
import { NumberTicker } from '@components/ui/number-ticker';
import { BorderBeam } from '@components/ui/border-beam';
import { useBorderBeamEnabled } from '@stores/animationStore';
import { BulkProxyImportModal } from './BulkProxyImportModal';
import { exportProxies, type ParsedProxy } from '@utils/proxyParser';

export function EnhancedProxyPanel() {
  const { 
    proxies, 
    rotationStrategy, 
    isLoading,
    loadProxies, 
    removeProxy,
    validateProxy,
    setRotationStrategy,
    getActiveProxies,
    addProxy
  } = useProxyStore();
  
  const borderBeamEnabled = useBorderBeamEnabled();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  useEffect(() => {
    loadProxies();
  }, [loadProxies]);

  const activeProxies = getActiveProxies();
  const failedProxies = proxies.filter(p => p.status === 'failed');

  // Handle bulk import
  const handleBulkImport = async (parsedProxies: ParsedProxy[]) => {
    for (const proxy of parsedProxies) {
      try {
        await addProxy({
          host: proxy.host,
          port: proxy.port,
          protocol: proxy.protocol,
          username: proxy.username,
          password: proxy.password,
          name: proxy.name || `${proxy.host}:${proxy.port}`,
        });
      } catch (error) {
        console.error('[ProxyPanel] Failed to import proxy:', error);
      }
    }
  };

  // Handle bulk export
  const handleBulkExport = (format: 'simple' | 'url' | 'csv' = 'simple') => {
    const exportData = exportProxies(proxies, format);
    
    // Create download
    const blob = new Blob([exportData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `proxies-export-${Date.now()}.${format === 'csv' ? 'csv' : 'txt'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="h-9 px-3 flex items-center gap-2 bg-secondary hover:bg-secondary/80 rounded transition-colors text-sm"
              data-testid="bulk-import-btn"
            >
              <Upload size={14} />
              <span>Import</span>
            </button>
            <div className="relative group">
              <button
                onClick={() => handleBulkExport('simple')}
                disabled={proxies.length === 0}
                className="h-9 px-3 flex items-center gap-2 bg-secondary hover:bg-secondary/80 rounded transition-colors text-sm disabled:opacity-50"
                data-testid="bulk-export-btn"
              >
                <Download size={14} />
                <span>Export</span>
              </button>
              {/* Export format dropdown */}
              {proxies.length > 0 && (
                <div className="absolute right-0 mt-1 w-40 bg-card border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                  <button
                    onClick={() => handleBulkExport('simple')}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-secondary transition-colors rounded-t-lg"
                  >
                    Simple Format
                  </button>
                  <button
                    onClick={() => handleBulkExport('url')}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-secondary transition-colors"
                  >
                    URL Format
                  </button>
                  <button
                    onClick={() => handleBulkExport('csv')}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-secondary transition-colors rounded-b-lg"
                  >
                    CSV Format
                  </button>
                </div>
              )}
            </div>
            <ShimmerButton
              className="h-9 px-4"
              onClick={() => {/* Add proxy modal */}}
              data-testid="add-proxy-btn"
            >
              <Plus size={14} className="mr-2" />
              Add
            </ShimmerButton>
          </div>
        </div>
        
        {/* Rotation Strategy */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Rotation Strategy</label>
          <select 
            value={rotationStrategy}
            onChange={(e) => {
              const value = e.target.value as 'round-robin' | 'random' | 'least-used' | 'fastest' | 'failure-aware' | 'weighted';
              setRotationStrategy(value);
            }}
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
            {activeProxies.length > 0 && borderBeamEnabled && (
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

      {/* Bulk Import Modal */}
      <BulkProxyImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleBulkImport}
      />
    </div>
  );
}

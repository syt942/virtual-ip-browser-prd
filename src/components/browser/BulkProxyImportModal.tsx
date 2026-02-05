/**
 * Bulk Proxy Import Modal
 * Allows users to import multiple proxies from text/CSV
 */

import { useState, useCallback } from 'react';
import { Upload, X, CheckCircle, AlertCircle, FileText, Download } from 'lucide-react';
import { parseProxyList, removeDuplicates, type ParsedProxy, type BulkParseResult } from '@utils/proxyParser';
import { ShimmerButton } from '@components/ui/shimmer-button';
import type { ProxyProtocol } from '@stores/proxyStore';

interface BulkProxyImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (proxies: ParsedProxy[]) => Promise<void>;
}

export function BulkProxyImportModal({ isOpen, onClose, onImport }: BulkProxyImportModalProps) {
  const [inputText, setInputText] = useState('');
  const [parseResult, setParseResult] = useState<BulkParseResult | null>(null);
  const [selectedProxies, setSelectedProxies] = useState<Set<number>>(new Set());
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [defaultProtocol, setDefaultProtocol] = useState<ProxyProtocol>('http');
  const [removeDups, setRemoveDups] = useState(true);

  // Parse input when user types
  const handleParse = useCallback(() => {
    if (!inputText.trim()) {
      setParseResult(null);
      return;
    }

    const result = parseProxyList(inputText, defaultProtocol);
    
    // Apply duplicate removal if enabled
    if (removeDups && result.successful.length > 0) {
      const unique = removeDuplicates(result.successful);
      const duplicatesRemoved = result.successful.length - unique.length;
      
      setParseResult({
        ...result,
        successful: unique,
        total: unique.length + result.failed.length,
      });
      
      if (duplicatesRemoved > 0) {
        console.log(`[BulkImport] Removed ${duplicatesRemoved} duplicate(s)`);
      }
    } else {
      setParseResult(result);
    }
    
    // Select all successful proxies by default
    setSelectedProxies(new Set(result.successful.map((_, idx) => idx)));
  }, [inputText, defaultProtocol, removeDups]);

  // Handle file upload
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setInputText(content);
    };
    reader.readAsText(file);
  }, []);

  // Toggle proxy selection
  const toggleProxy = useCallback((index: number) => {
    setSelectedProxies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  }, []);

  // Toggle all proxies
  const toggleAll = useCallback(() => {
    if (!parseResult) return;
    
    if (selectedProxies.size === parseResult.successful.length) {
      setSelectedProxies(new Set());
    } else {
      setSelectedProxies(new Set(parseResult.successful.map((_, idx) => idx)));
    }
  }, [parseResult, selectedProxies.size]);

  // Handle import
  const handleImportClick = useCallback(async () => {
    if (!parseResult || selectedProxies.size === 0) return;

    setIsImporting(true);
    setImportProgress(0);

    try {
      const proxiesToImport = parseResult.successful.filter((_, idx) => selectedProxies.has(idx));
      
      // Import proxies with progress updates
      for (let i = 0; i < proxiesToImport.length; i++) {
        await onImport([proxiesToImport[i]]);
        setImportProgress(((i + 1) / proxiesToImport.length) * 100);
      }

      // Success - close modal
      onClose();
      
      // Reset state
      setInputText('');
      setParseResult(null);
      setSelectedProxies(new Set());
      setImportProgress(0);
    } catch (error) {
      console.error('[BulkImport] Import failed:', error);
    } finally {
      setIsImporting(false);
    }
  }, [parseResult, selectedProxies, onImport, onClose]);

  // Reset modal
  const handleClose = useCallback(() => {
    if (!isImporting) {
      setInputText('');
      setParseResult(null);
      setSelectedProxies(new Set());
      setImportProgress(0);
      onClose();
    }
  }, [isImporting, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={handleClose}>
      <div
        className="bg-card border border-border rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Upload size={20} className="text-primary" />
            <h2 className="text-lg font-semibold">Bulk Import Proxies</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isImporting}
            className="p-1 hover:bg-secondary rounded transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Instructions */}
          <div className="bg-secondary/30 rounded-lg p-3 text-sm space-y-2">
            <p className="font-medium">Supported Formats:</p>
            <ul className="space-y-1 text-muted-foreground ml-4 list-disc">
              <li><code className="text-xs bg-secondary px-1 rounded">host:port</code></li>
              <li><code className="text-xs bg-secondary px-1 rounded">host:port:username:password</code></li>
              <li><code className="text-xs bg-secondary px-1 rounded">protocol://host:port</code></li>
              <li><code className="text-xs bg-secondary px-1 rounded">protocol://username:password@host:port</code></li>
              <li><code className="text-xs bg-secondary px-1 rounded">host,port,protocol,username,password</code> (CSV)</li>
            </ul>
          </div>

          {/* Options */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Default Protocol:</label>
              <select
                value={defaultProtocol}
                onChange={(e) => setDefaultProtocol(e.target.value as ProxyProtocol)}
                className="bg-background border border-border rounded px-2 py-1 text-sm"
                disabled={isImporting}
              >
                <option value="http">HTTP</option>
                <option value="https">HTTPS</option>
                <option value="socks4">SOCKS4</option>
                <option value="socks5">SOCKS5</option>
              </select>
            </div>
            
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={removeDups}
                onChange={(e) => setRemoveDups(e.target.checked)}
                disabled={isImporting}
                className="rounded"
              />
              Remove duplicates
            </label>
          </div>

          {/* File Upload */}
          <div className="flex items-center gap-2">
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".txt,.csv"
                onChange={handleFileUpload}
                disabled={isImporting}
                className="hidden"
              />
              <div className="flex items-center gap-2 px-3 py-2 bg-secondary hover:bg-secondary/80 rounded transition-colors text-sm">
                <FileText size={16} />
                Upload File (.txt, .csv)
              </div>
            </label>
            <ShimmerButton
              onClick={handleParse}
              disabled={!inputText.trim() || isImporting}
              className="h-9 px-4"
            >
              Parse
            </ShimmerButton>
          </div>

          {/* Text Input */}
          <div>
            <label className="text-sm font-medium mb-2 block">Paste Proxy List:</label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isImporting}
              placeholder="192.168.1.100:8080
proxy.example.com:3128:user:pass
http://10.0.0.50:8080
socks5://username:password@proxy.local:1080"
              className="w-full h-48 bg-background border border-border rounded-lg p-3 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {inputText.split('\n').length} line(s)
            </p>
          </div>

          {/* Parse Results */}
          {parseResult && (
            <div className="space-y-3">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-green-500">{parseResult.successful.length}</div>
                  <div className="text-xs text-muted-foreground">Successful</div>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-red-500">{parseResult.failed.length}</div>
                  <div className="text-xs text-muted-foreground">Failed</div>
                </div>
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-primary">{parseResult.successRate.toFixed(0)}%</div>
                  <div className="text-xs text-muted-foreground">Success Rate</div>
                </div>
              </div>

              {/* Successful Proxies Table */}
              {parseResult.successful.length > 0 && (
                <div className="border border-border rounded-lg overflow-hidden">
                  <div className="bg-secondary p-2 flex items-center justify-between">
                    <span className="text-sm font-medium">Valid Proxies ({selectedProxies.size} selected)</span>
                    <button
                      onClick={toggleAll}
                      className="text-xs text-primary hover:underline"
                      disabled={isImporting}
                    >
                      {selectedProxies.size === parseResult.successful.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-secondary/50 sticky top-0">
                        <tr>
                          <th className="p-2 text-left w-8"></th>
                          <th className="p-2 text-left">Host</th>
                          <th className="p-2 text-left">Port</th>
                          <th className="p-2 text-left">Protocol</th>
                          <th className="p-2 text-left">Auth</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parseResult.successful.map((proxy, idx) => (
                          <tr
                            key={idx}
                            className="border-t border-border hover:bg-secondary/30 transition-colors"
                          >
                            <td className="p-2">
                              <input
                                type="checkbox"
                                checked={selectedProxies.has(idx)}
                                onChange={() => toggleProxy(idx)}
                                disabled={isImporting}
                                className="rounded"
                              />
                            </td>
                            <td className="p-2 font-mono text-xs">{proxy.host}</td>
                            <td className="p-2 font-mono text-xs">{proxy.port}</td>
                            <td className="p-2">
                              <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">
                                {proxy.protocol.toUpperCase()}
                              </span>
                            </td>
                            <td className="p-2">
                              {proxy.username ? (
                                <CheckCircle size={14} className="text-green-500" />
                              ) : (
                                <span className="text-muted-foreground text-xs">None</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Failed Proxies */}
              {parseResult.failed.length > 0 && (
                <details className="border border-red-500/20 rounded-lg overflow-hidden">
                  <summary className="bg-red-500/10 p-2 cursor-pointer text-sm font-medium flex items-center gap-2">
                    <AlertCircle size={16} className="text-red-500" />
                    Failed to Parse ({parseResult.failed.length} lines)
                  </summary>
                  <div className="p-3 max-h-48 overflow-y-auto space-y-2">
                    {parseResult.failed.map((result, idx) => (
                      <div key={idx} className="bg-background rounded p-2 text-xs">
                        <div className="flex items-start justify-between gap-2">
                          <code className="flex-1 text-red-500">{result.line}</code>
                          <span className="text-muted-foreground">Line {result.lineNumber}</span>
                        </div>
                        <p className="text-muted-foreground mt-1">{result.error}</p>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4 flex items-center justify-between bg-secondary/20">
          <div className="text-sm text-muted-foreground">
            {isImporting ? (
              <div className="flex items-center gap-2">
                <div className="w-48 h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${importProgress}%` }}
                  />
                </div>
                <span>{Math.round(importProgress)}%</span>
              </div>
            ) : (
              parseResult && selectedProxies.size > 0 && (
                <span>{selectedProxies.size} proxies ready to import</span>
              )
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClose}
              disabled={isImporting}
              className="px-4 py-2 rounded hover:bg-secondary transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <ShimmerButton
              onClick={handleImportClick}
              disabled={!parseResult || selectedProxies.size === 0 || isImporting}
              className="h-9 px-4"
            >
              {isImporting ? 'Importing...' : `Import ${selectedProxies.size} Proxies`}
            </ShimmerButton>
          </div>
        </div>
      </div>
    </div>
  );
}

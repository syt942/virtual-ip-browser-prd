/**
 * Position History Modal
 * Full-screen modal for viewing SERP position trends
 */

import { useState, useEffect, useMemo } from 'react';
import { X, Download, TrendingUp, Search, Calendar } from 'lucide-react';
import { PositionHistoryChart, type PositionDataPoint } from './PositionHistoryChart';
import { ShimmerButton } from '@components/ui/shimmer-button';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface KeywordSummary {
  keyword: string;
  domain: string;
  engine: string;
  currentPosition: number | null;
  change: number | null;
  trend: 'up' | 'down' | 'stable';
  lastChecked: Date;
  dataPoints: number;
}

export interface PositionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadHistory: (keyword: string, domain: string, engine: string) => Promise<PositionDataPoint[]>;
  keywords: KeywordSummary[];
}

type TimeRange = '7d' | '30d' | '90d' | 'all';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Export position data to CSV
 */
function exportToCSV(data: PositionDataPoint[], keyword: string): void {
  const headers = ['Date', 'Position', 'Keyword', 'Domain', 'Engine', 'URL', 'Title'];
  const rows = data.map(point => [
    point.timestamp.toISOString(),
    point.position?.toString() ?? 'Not Found',
    point.keyword,
    point.domain,
    point.engine,
    point.url ?? '',
    point.title ?? '',
  ]);

  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `position-history-${keyword}-${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================================
// KEYWORD LIST ITEM
// ============================================================================

interface KeywordListItemProps {
  summary: KeywordSummary;
  isSelected: boolean;
  onClick: () => void;
}

function KeywordListItem({ summary, isSelected, onClick }: KeywordListItemProps) {
  const getTrendColor = () => {
    if (summary.trend === 'stable') return 'text-muted-foreground';
    return summary.trend === 'up' ? 'text-green-500' : 'text-red-500';
  };

  const getTrendIcon = () => {
    if (summary.trend === 'stable') return '─';
    return summary.trend === 'up' ? '↑' : '↓';
  };

  return (
    <button
      onClick={onClick}
      className={`w-full p-3 rounded-lg text-left transition-colors ${
        isSelected
          ? 'bg-primary/10 border-2 border-primary'
          : 'bg-secondary/30 border-2 border-transparent hover:bg-secondary/50'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-medium text-sm line-clamp-2">{summary.keyword}</h4>
        <span className={`text-lg font-bold ${getTrendColor()}`}>
          {getTrendIcon()}
        </span>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="truncate">{summary.domain}</span>
        <span className="ml-2 font-medium">
          {summary.currentPosition !== null ? `#${summary.currentPosition}` : '-'}
        </span>
      </div>
      {summary.change !== null && summary.change !== 0 && (
        <div className={`text-xs mt-1 ${getTrendColor()}`}>
          {summary.change > 0 ? '+' : ''}{summary.change} positions
        </div>
      )}
    </button>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PositionHistoryModal({
  isOpen,
  onClose,
  onLoadHistory,
  keywords,
}: PositionHistoryModalProps) {
  const [selectedKeyword, setSelectedKeyword] = useState<KeywordSummary | null>(null);
  const [positionData, setPositionData] = useState<PositionDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter keywords by search query
  const filteredKeywords = useMemo(() => {
    if (!searchQuery) return keywords;
    const query = searchQuery.toLowerCase();
    return keywords.filter(k =>
      k.keyword.toLowerCase().includes(query) ||
      k.domain.toLowerCase().includes(query)
    );
  }, [keywords, searchQuery]);

  // Load position history when keyword is selected
  useEffect(() => {
    if (!selectedKeyword) return;

    let mounted = true;
    setIsLoading(true);

    onLoadHistory(selectedKeyword.keyword, selectedKeyword.domain, selectedKeyword.engine)
      .then(data => {
        if (mounted) {
          setPositionData(data);
        }
      })
      .catch(error => {
        console.error('[PositionHistory] Failed to load history:', error);
        if (mounted) {
          setPositionData([]);
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [selectedKeyword, onLoadHistory]);

  // Auto-select first keyword when modal opens
  useEffect(() => {
    if (isOpen && !selectedKeyword && keywords.length > 0) {
      setSelectedKeyword(keywords[0]);
    }
  }, [isOpen, selectedKeyword, keywords]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setSelectedKeyword(null);
      setPositionData([]);
      setSearchQuery('');
      setTimeRange('30d');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="absolute inset-4 bg-card border border-border rounded-lg shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/20">
          <div className="flex items-center gap-3">
            <TrendingUp size={24} className="text-primary" />
            <div>
              <h2 className="text-xl font-bold">Position History</h2>
              <p className="text-sm text-muted-foreground">
                SERP ranking trends over time
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedKeyword && positionData.length > 0 && (
              <ShimmerButton
                onClick={() => exportToCSV(positionData, selectedKeyword.keyword)}
                className="h-9 px-4"
              >
                <Download size={14} className="mr-2" />
                Export CSV
              </ShimmerButton>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-secondary rounded transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Keyword List */}
          <div className="w-80 border-r border-border bg-secondary/10 flex flex-col">
            {/* Search */}
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            {/* Keyword List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filteredKeywords.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-8">
                  {searchQuery ? 'No keywords found' : 'No keywords tracked yet'}
                </div>
              ) : (
                filteredKeywords.map((kw, idx) => (
                  <KeywordListItem
                    key={`${kw.keyword}-${kw.domain}-${kw.engine}`}
                    summary={kw}
                    isSelected={
                      selectedKeyword?.keyword === kw.keyword &&
                      selectedKeyword?.domain === kw.domain &&
                      selectedKeyword?.engine === kw.engine
                    }
                    onClick={() => setSelectedKeyword(kw)}
                  />
                ))
              )}
            </div>

            {/* Summary */}
            <div className="p-3 border-t border-border text-xs text-muted-foreground">
              {filteredKeywords.length} keyword{filteredKeywords.length !== 1 ? 's' : ''} tracked
            </div>
          </div>

          {/* Main Area - Chart */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Time Range Selector */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/5">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-muted-foreground" />
                <span className="text-sm font-medium">Time Range:</span>
              </div>
              <div className="flex gap-1">
                {(['7d', '30d', '90d', 'all'] as const).map(range => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-3 py-1 rounded text-sm transition-colors ${
                      timeRange === range
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary hover:bg-secondary/80'
                    }`}
                  >
                    {range === '7d' ? '7 Days' :
                     range === '30d' ? '30 Days' :
                     range === '90d' ? '90 Days' : 'All Time'}
                  </button>
                ))}
              </div>
            </div>

            {/* Chart Area */}
            <div className="flex-1 overflow-y-auto p-6">
              {!selectedKeyword ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Search size={48} className="mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="text-lg font-semibold mb-1">Select a Keyword</h3>
                    <p className="text-sm text-muted-foreground">
                      Choose a keyword from the list to view its position history
                    </p>
                  </div>
                </div>
              ) : isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground">Loading position history...</p>
                  </div>
                </div>
              ) : (
                <PositionHistoryChart
                  data={positionData}
                  keyword={selectedKeyword.keyword}
                  domain={selectedKeyword.domain}
                  timeRange={timeRange}
                  showTrendLine={false}
                  showAverage={true}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

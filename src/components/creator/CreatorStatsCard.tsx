/**
 * Creator Stats Card Component
 * Displays statistics for a single creator
 */

import { TrendingUp, Eye, MousePointer, Clock } from 'lucide-react';
import { NumberTicker } from '@components/ui/number-ticker';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface CreatorStats {
  creatorId: string;
  creatorName: string;
  platform: string;
  totalActions: number;
  successfulActions: number;
  failedActions: number;
  totalClicks: number;
  totalScrolls: number;
  totalVisits: number;
  lastActionTimestamp?: Date;
  successRate: number;
}

export interface CreatorStatsCardProps {
  stats: CreatorStats;
  onClick?: () => void;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format timestamp to relative time
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

/**
 * Get platform emoji
 */
function getPlatformEmoji(platform: string): string {
  const platformMap: Record<string, string> = {
    youtube: '📺',
    twitch: '🎮',
    blog: '📝',
    website: '🌐',
  };
  return platformMap[platform.toLowerCase()] || '🌐';
}

/**
 * Get success rate color
 */
function getSuccessRateColor(rate: number): string {
  if (rate >= 95) return 'text-green-500';
  if (rate >= 80) return 'text-yellow-500';
  return 'text-red-500';
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CreatorStatsCard({ stats, onClick }: CreatorStatsCardProps) {
  const hasActivity = stats.totalActions > 0;

  return (
    <div
      onClick={onClick}
      className={`
        p-4 rounded-lg border border-border bg-card transition-all
        ${onClick ? 'cursor-pointer hover:border-primary hover:shadow-lg' : ''}
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{getPlatformEmoji(stats.platform)}</span>
            <h3 className="font-semibold text-lg line-clamp-1">{stats.creatorName}</h3>
          </div>
          <p className="text-xs text-muted-foreground capitalize">{stats.platform}</p>
        </div>
        
        {/* Success Rate Badge */}
        <div className="flex flex-col items-end">
          <div className={`text-2xl font-bold ${getSuccessRateColor(stats.successRate)}`}>
            <NumberTicker value={Math.round(stats.successRate)} />%
          </div>
          <span className="text-xs text-muted-foreground">Success</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* Total Actions */}
        <div className="bg-secondary/30 rounded-lg p-2">
          <div className="flex items-center gap-1 mb-1">
            <TrendingUp size={12} className="text-primary" />
            <span className="text-xs text-muted-foreground">Actions</span>
          </div>
          <div className="text-xl font-bold">
            <NumberTicker value={stats.totalActions} />
          </div>
        </div>

        {/* Total Visits */}
        <div className="bg-secondary/30 rounded-lg p-2">
          <div className="flex items-center gap-1 mb-1">
            <Eye size={12} className="text-blue-500" />
            <span className="text-xs text-muted-foreground">Visits</span>
          </div>
          <div className="text-xl font-bold">
            <NumberTicker value={stats.totalVisits} />
          </div>
        </div>

        {/* Total Clicks */}
        <div className="bg-secondary/30 rounded-lg p-2">
          <div className="flex items-center gap-1 mb-1">
            <MousePointer size={12} className="text-green-500" />
            <span className="text-xs text-muted-foreground">Clicks</span>
          </div>
          <div className="text-xl font-bold">
            <NumberTicker value={stats.totalClicks} />
          </div>
        </div>

        {/* Total Scrolls */}
        <div className="bg-secondary/30 rounded-lg p-2">
          <div className="flex items-center gap-1 mb-1">
            <Clock size={12} className="text-purple-500" />
            <span className="text-xs text-muted-foreground">Scrolls</span>
          </div>
          <div className="text-xl font-bold">
            <NumberTicker value={stats.totalScrolls} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="text-xs text-muted-foreground">
          {hasActivity ? (
            <>
              <span className="text-green-500">{stats.successfulActions}</span>
              {' / '}
              <span className="text-red-500">{stats.failedActions}</span>
              {' '}
              <span>success / failed</span>
            </>
          ) : (
            <span>No activity yet</span>
          )}
        </div>
        {stats.lastActionTimestamp && (
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock size={10} />
            {formatRelativeTime(stats.lastActionTimestamp)}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// STATS SUMMARY CARD
// ============================================================================

export interface StatsSummaryProps {
  totalCreators: number;
  totalActions: number;
  totalVisits: number;
  avgSuccessRate: number;
  last24Hours: number;
}

export function StatsSummaryCard({ 
  totalCreators, 
  totalActions, 
  totalVisits, 
  avgSuccessRate,
  last24Hours 
}: StatsSummaryProps) {
  return (
    <div className="p-6 rounded-lg border border-border bg-gradient-to-br from-primary/10 to-primary/5">
      <h3 className="text-lg font-semibold mb-4">Overall Statistics</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Total Creators */}
        <div>
          <div className="text-sm text-muted-foreground mb-1">Creators</div>
          <div className="text-3xl font-bold text-primary">
            <NumberTicker value={totalCreators} />
          </div>
        </div>

        {/* Total Actions */}
        <div>
          <div className="text-sm text-muted-foreground mb-1">Total Actions</div>
          <div className="text-3xl font-bold">
            <NumberTicker value={totalActions} />
          </div>
        </div>

        {/* Total Visits */}
        <div>
          <div className="text-sm text-muted-foreground mb-1">Total Visits</div>
          <div className="text-3xl font-bold text-blue-500">
            <NumberTicker value={totalVisits} />
          </div>
        </div>

        {/* Average Success Rate */}
        <div>
          <div className="text-sm text-muted-foreground mb-1">Avg Success</div>
          <div className={`text-3xl font-bold ${getSuccessRateColor(avgSuccessRate)}`}>
            <NumberTicker value={Math.round(avgSuccessRate)} />%
          </div>
        </div>

        {/* Last 24 Hours */}
        <div>
          <div className="text-sm text-muted-foreground mb-1">Last 24h</div>
          <div className="text-3xl font-bold text-green-500">
            <NumberTicker value={last24Hours} />
          </div>
        </div>
      </div>
    </div>
  );
}

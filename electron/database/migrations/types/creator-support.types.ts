/**
 * Creator Support Types
 * Type definitions for creator support history database entities
 */

// ============================================================
// CREATOR SUPPORT HISTORY TYPES
// ============================================================

export type CreatorSupportActionType = 'click' | 'scroll' | 'visit';

export interface CreatorSupportHistoryEntity {
  id: number;
  creator_id: number;
  action_type: string;
  target_url?: string;
  timestamp: number; // Unix timestamp
  session_id?: string;
  proxy_id?: number;
  success: number; // SQLite boolean (0/1)
  error_message?: string;
  metadata?: string; // JSON string
}

export interface CreatorSupportHistoryDTO {
  id: number;
  creatorId: number;
  actionType: CreatorSupportActionType;
  targetUrl?: string;
  timestamp: Date;
  sessionId?: string;
  proxyId?: number;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface CreateCreatorSupportHistoryInput {
  creatorId: number;
  actionType: CreatorSupportActionType;
  targetUrl?: string;
  timestamp: Date | number; // Date or Unix timestamp
  sessionId?: string;
  proxyId?: number;
  success?: boolean;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface CreatorSupportStats {
  creatorId: number;
  totalActions: number;
  successfulActions: number;
  failedActions: number;
  totalClicks: number;
  totalScrolls: number;
  totalVisits: number;
  lastActionTimestamp?: Date;
}

export interface CreatorSupportStatsView {
  creator_id: number;
  creator_name: string;
  platform: string;
  total_actions: number;
  successful_actions: number;
  failed_actions: number;
  total_clicks: number;
  total_scrolls: number;
  total_visits: number;
  last_action_timestamp?: number;
}

/**
 * Creator Tracker Module (EP-007)
 * Tracks creator support, view counts, ad impressions, and analytics
 */

import { EventEmitter } from 'events';
import type { Platform } from './platform-detection';

export interface TrackedCreator {
  id: string;
  name: string;
  platform: Platform | string;
  url: string;
  viewCount: number;
  adImpressions: number;
  totalAdWatchTime: number;
  enabled: boolean;
  lastSupported?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatorInput {
  name: string;
  platform: Platform | string;
  url: string;
  enabled?: boolean;
}

export interface SupportAnalytics {
  totalCreators: number;
  totalViews: number;
  totalAdImpressions: number;
  totalAdWatchTime: number;
  estimatedRevenue: number;
  platformBreakdown: Record<string, number>;
  avgViewsPerCreator: number;
  avgAdImpressionsPerCreator: number;
}

export interface CreatorAnalytics {
  viewCount: number;
  adImpressions: number;
  totalAdWatchTime: number;
  avgAdWatchTime: number;
  estimatedRevenue: number;
  lastSupported?: Date;
}

// Estimated CPM rates by platform (in dollars per 1000 impressions)
const CPM_RATES: Record<string, number> = {
  youtube: 4.00,
  twitch: 3.50,
  medium: 2.00,
  unknown: 1.00
};

export class CreatorTracker extends EventEmitter {
  private creators: Map<string, TrackedCreator>;

  constructor() {
    super();
    this.creators = new Map();
  }

  /**
   * Add a new creator to track
   */
  addCreator(input: CreatorInput): TrackedCreator {
    const id = crypto.randomUUID();
    const now = new Date();

    const creator: TrackedCreator = {
      id,
      name: input.name,
      platform: input.platform,
      url: input.url,
      viewCount: 0,
      adImpressions: 0,
      totalAdWatchTime: 0,
      enabled: input.enabled ?? true,
      createdAt: now,
      updatedAt: now
    };

    this.creators.set(id, creator);
    this.emit('creator:added', creator);
    return creator;
  }

  /**
   * Get creator by ID
   */
  getCreator(id: string): TrackedCreator | undefined {
    return this.creators.get(id);
  }

  /**
   * Get all creators
   */
  getAllCreators(): TrackedCreator[] {
    return Array.from(this.creators.values());
  }

  /**
   * Get creators by platform
   */
  getCreatorsByPlatform(platform: Platform | string): TrackedCreator[] {
    return this.getAllCreators().filter(c => c.platform === platform);
  }

  /**
   * Get enabled creators only
   */
  getEnabledCreators(): TrackedCreator[] {
    return this.getAllCreators().filter(c => c.enabled);
  }

  /**
   * Record a view for a creator
   */
  recordView(creatorId: string): void {
    const creator = this.creators.get(creatorId);
    if (!creator) {
      throw new Error(`Creator not found: ${creatorId}`);
    }

    creator.viewCount++;
    creator.lastSupported = new Date();
    creator.updatedAt = new Date();
    this.creators.set(creatorId, creator);
    this.emit('view:recorded', { creatorId, viewCount: creator.viewCount });
  }

  /**
   * Record an ad impression for a creator
   */
  recordAdImpression(creatorId: string, watchTime: number): void {
    const creator = this.creators.get(creatorId);
    if (!creator) {
      throw new Error(`Creator not found: ${creatorId}`);
    }

    creator.adImpressions++;
    creator.totalAdWatchTime += watchTime;
    creator.lastSupported = new Date();
    creator.updatedAt = new Date();
    this.creators.set(creatorId, creator);
    this.emit('ad:recorded', { creatorId, watchTime, totalImpressions: creator.adImpressions });
  }

  /**
   * Update creator properties
   */
  updateCreator(id: string, updates: Partial<CreatorInput>): TrackedCreator | undefined {
    const creator = this.creators.get(id);
    if (!creator) {
      return undefined;
    }

    const updated: TrackedCreator = {
      ...creator,
      ...updates,
      updatedAt: new Date()
    };

    this.creators.set(id, updated);
    this.emit('creator:updated', updated);
    return updated;
  }

  /**
   * Remove a creator
   */
  removeCreator(id: string): boolean {
    const creator = this.creators.get(id);
    if (!creator) {
      return false;
    }

    this.creators.delete(id);
    this.emit('creator:removed', creator);
    return true;
  }

  /**
   * Enable a creator
   */
  enableCreator(id: string): boolean {
    const creator = this.creators.get(id);
    if (!creator) {
      return false;
    }

    creator.enabled = true;
    creator.updatedAt = new Date();
    this.creators.set(id, creator);
    this.emit('creator:enabled', creator);
    return true;
  }

  /**
   * Disable a creator
   */
  disableCreator(id: string): boolean {
    const creator = this.creators.get(id);
    if (!creator) {
      return false;
    }

    creator.enabled = false;
    creator.updatedAt = new Date();
    this.creators.set(id, creator);
    this.emit('creator:disabled', creator);
    return true;
  }

  /**
   * Get overall analytics
   */
  getAnalytics(): SupportAnalytics {
    const creators = this.getAllCreators();
    const totalCreators = creators.length;
    const totalViews = creators.reduce((sum, c) => sum + c.viewCount, 0);
    const totalAdImpressions = creators.reduce((sum, c) => sum + c.adImpressions, 0);
    const totalAdWatchTime = creators.reduce((sum, c) => sum + c.totalAdWatchTime, 0);

    // Calculate platform breakdown
    const platformBreakdown: Record<string, number> = {};
    for (const creator of creators) {
      const platform = creator.platform as string;
      platformBreakdown[platform] = (platformBreakdown[platform] || 0) + 1;
    }

    // Estimate revenue based on CPM rates
    let estimatedRevenue = 0;
    for (const creator of creators) {
      const cpm = CPM_RATES[creator.platform as string] || CPM_RATES.unknown;
      estimatedRevenue += (creator.adImpressions / 1000) * cpm;
    }

    return {
      totalCreators,
      totalViews,
      totalAdImpressions,
      totalAdWatchTime,
      estimatedRevenue,
      platformBreakdown,
      avgViewsPerCreator: totalCreators > 0 ? totalViews / totalCreators : 0,
      avgAdImpressionsPerCreator: totalCreators > 0 ? totalAdImpressions / totalCreators : 0
    };
  }

  /**
   * Get analytics for specific creator
   */
  getCreatorAnalytics(creatorId: string): CreatorAnalytics | undefined {
    const creator = this.creators.get(creatorId);
    if (!creator) {
      return undefined;
    }

    const cpm = CPM_RATES[creator.platform as string] || CPM_RATES.unknown;
    const estimatedRevenue = (creator.adImpressions / 1000) * cpm;

    return {
      viewCount: creator.viewCount,
      adImpressions: creator.adImpressions,
      totalAdWatchTime: creator.totalAdWatchTime,
      avgAdWatchTime: creator.adImpressions > 0 
        ? creator.totalAdWatchTime / creator.adImpressions 
        : 0,
      estimatedRevenue,
      lastSupported: creator.lastSupported
    };
  }

  /**
   * Reset all tracking data
   */
  reset(): void {
    this.creators.clear();
    this.emit('tracker:reset');
  }
}

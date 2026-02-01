/**
 * Database Repositories Index
 * Central export for all repository classes
 */

export { RotationConfigRepository } from './rotation-config.repository';
export { ProxyUsageStatsRepository, type AggregatedStats, type TimeSeriesDataPoint, type UsageRecord } from './proxy-usage-stats.repository';
export { EncryptedCredentialsRepository } from './encrypted-credentials.repository';
export { StickySessionRepository } from './sticky-session.repository';
export { RotationEventsRepository } from './rotation-events.repository';
export { RotationRulesRepository } from './rotation-rules.repository';
export { 
  ProxyRepository, 
  type ProxyWithRotationConfig,
  type ProxyWithDecryptedCredentials,
  type AddProxyInput,
  type UpdateProxyInput
} from './proxy.repository';
export { CreatorSupportHistoryRepository } from './creator-support-history.repository';
export { ExecutionLogsRepository } from './execution-logs.repository';
export { CircuitBreakerRepository } from './circuit-breaker.repository';
export { 
  PositionHistoryRepository,
  type PositionRecordDTO,
  type CreatePositionRecordInput,
  type PositionRecordFilter,
  type PositionAggregateStats
} from './position-history.repository';
export {
  KeywordQueueRepository,
  type SearchKeywordDTO,
  type CreateKeywordInput,
  type UpdateKeywordInput,
  type KeywordFilter
} from './keyword-queue.repository';

// Re-export types
export * from '../migrations/types';

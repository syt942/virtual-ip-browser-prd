/**
 * Database Migration Types Index
 * Re-exports all type definitions for backwards compatibility
 */

// Rotation Config Types
export type {
  CommonRotationConfig,
  GeographicStrategyConfig,
  StickySessionStrategyConfig,
  TimeBasedStrategyConfig,
  WeightedStrategyConfig,
  CustomStrategyConfig,
  StrategyConfig,
  RotationConfigEntity,
  RotationConfigDTO,
  CreateRotationConfigInput,
  UpdateRotationConfigInput
} from './rotation-config.types';

// Proxy Usage Types
export type {
  ErrorCounts,
  ProxyUsageStatsEntity,
  ProxyUsageStatsDTO,
  CreateProxyUsageStatsInput,
  UpdateProxyUsageStatsInput
} from './proxy-usage.types';

// Credentials Types
export type {
  CredentialType,
  AccessLevel,
  EncryptedCredentialsEntity,
  EncryptedCredentialsDTO,
  DecryptedCredentials,
  CreateEncryptedCredentialsInput
} from './credentials.types';

// Sticky Session Types
export type {
  StickySessionMappingEntity,
  StickySessionMappingDTO,
  CreateStickyMappingInput
} from './sticky-session.types';

// Rotation Rules Types
export type {
  ProxyRotationRuleEntity,
  ProxyRotationRuleDTO,
  CreateRotationRuleInput
} from './rotation-rules.types';

// Rotation Events Types
export type {
  RotationReason,
  RotationEventEntity,
  RotationEventDTO,
  RecordRotationEventInput
} from './rotation-events.types';

// Creator Support Types
export type {
  CreatorSupportActionType,
  CreatorSupportHistoryEntity,
  CreatorSupportHistoryDTO,
  CreateCreatorSupportHistoryInput,
  CreatorSupportStats,
  CreatorSupportStatsView
} from './creator-support.types';

// Execution Logs Types
export type {
  ExecutionType,
  ExecutionStatus,
  ResourceUsage,
  ExecutionErrorDetail,
  ExecutionLogEntity,
  ExecutionLogDTO,
  CreateExecutionLogInput,
  UpdateExecutionLogInput,
  ExecutionSummary,
  ExecutionSummaryView
} from './execution-logs.types';

// View Types
export type {
  ProxyCurrentStatsView,
  RotationConfigSummaryView,
  SchemaMigration,
  ProxyEntityExtended
} from './views.types';

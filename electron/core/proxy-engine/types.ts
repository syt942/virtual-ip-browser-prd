/**
 * Proxy Engine Types
 * Core type definitions for proxy management system
 * 
 * SECURITY NOTE: Credentials are stored encrypted using AES-256-GCM.
 * Plain text credentials should never be persisted to disk.
 */

import type { EncryptedCredential } from './credential-store';

export type ProxyProtocol = 'http' | 'https' | 'socks4' | 'socks5';
export type ProxyStatus = 'active' | 'failed' | 'checking' | 'disabled';
export type RotationStrategy = 
  | 'round-robin'
  | 'random'
  | 'least-used'
  | 'fastest'
  | 'sticky-session'
  | 'geographic'
  | 'failure-aware'
  | 'time-based'
  | 'weighted'
  | 'custom';

export interface GeoLocation {
  country: string;
  countryName: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  isp?: string;
  asn?: string;
}

/**
 * Proxy configuration with encrypted credentials
 * 
 * SECURITY:
 * - Credentials are stored encrypted (encryptedCredentials field)
 * - Plain text username/password fields are deprecated and should not be used
 * - Use CredentialStore.encrypt() to create encrypted credentials
 * - Use CredentialStore.decrypt() to retrieve credentials when needed
 */
export interface ProxyConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  protocol: ProxyProtocol;
  
  /**
   * @deprecated Use encryptedCredentials instead for secure storage
   * These fields are only used transiently during proxy creation
   */
  username?: string;
  /**
   * @deprecated Use encryptedCredentials instead for secure storage
   * These fields are only used transiently during proxy creation
   */
  password?: string;
  
  /**
   * Encrypted credentials for secure storage
   * Created using CredentialStore.encrypt(username, password)
   */
  encryptedCredentials?: EncryptedCredential;
  
  /** Whether this proxy requires authentication */
  requiresAuth: boolean;
  
  status: ProxyStatus;
  latency?: number;
  lastChecked?: Date;
  failureCount: number;
  totalRequests: number;
  successRate: number;
  region?: string;
  tags?: string[];
  geolocation?: GeoLocation;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Input for adding a new proxy (accepts plain text credentials)
 * Credentials will be encrypted before storage
 */
export interface ProxyInput {
  name: string;
  host: string;
  port: number;
  protocol: ProxyProtocol;
  username?: string;
  password?: string;
  region?: string;
  tags?: string[];
}

export interface RotationConfig {
  strategy: RotationStrategy;
  interval?: number; // milliseconds
  maxRequestsPerProxy?: number;
  failureThreshold?: number;
  cooldownPeriod?: number;
  geographicPreferences?: string[];
  weights?: Record<string, number>;
  // Geographic strategy options
  excludeCountries?: string[];
  preferredRegions?: string[];
  // Sticky-session strategy options
  stickySessionTTL?: number;
  stickyHashAlgorithm?: 'consistent' | 'random' | 'round-robin';
  stickyFallbackOnFailure?: boolean;
  // Time-based strategy options
  jitterPercent?: number;
  minInterval?: number;
  maxInterval?: number;
  rotateOnFailure?: boolean;
  scheduleWindows?: TimeWindow[];
  // Custom rules strategy options
  rules?: ProxyRule[];
}

export interface TimeWindow {
  startHour: number;
  endHour: number;
  daysOfWeek: number[];
}

export interface RotationContext {
  domain?: string;
  url?: string;
  targetCountry?: string;
  tabId?: string;
}

export interface DomainProxyMapping {
  domain: string;
  proxyId: string;
  createdAt: Date;
  lastUsed: Date;
  requestCount: number;
  ttl?: number;
  isWildcard: boolean;
}

export interface RotationEvent {
  timestamp: Date;
  previousProxyId: string;
  newProxyId: string;
  reason: 'scheduled' | 'failure' | 'manual' | 'startup';
}

export type RuleOperator = 
  | 'equals' | 'not_equals' 
  | 'contains' | 'not_contains'
  | 'starts_with' | 'ends_with'
  | 'matches_regex'
  | 'greater_than' | 'less_than'
  | 'in_list' | 'not_in_list';

export type RuleField = 
  | 'domain' | 'url' | 'path'
  | 'time_hour' | 'time_day'
  | 'proxy_country' | 'proxy_latency' | 'proxy_success_rate'
  | 'custom_tag';

export type RuleAction = 
  | 'use_proxy' | 'use_proxy_group' | 'use_country'
  | 'exclude_proxy' | 'exclude_country'
  | 'rotate_immediately' | 'skip_rotation';

export interface RuleCondition {
  field: RuleField;
  operator: RuleOperator;
  value: string | number | string[];
  caseSensitive?: boolean;
}

export interface RuleActionConfig {
  action: RuleAction;
  params: Record<string, any>;
}

export interface ProxyRule {
  id: string;
  name: string;
  priority: number;
  conditions: RuleCondition[];
  conditionLogic?: 'AND' | 'OR';
  actions: RuleActionConfig[];
  stopOnMatch?: boolean;
  enabled: boolean;
}

export interface RuleEvaluationResult {
  matched: boolean;
  rule?: ProxyRule;
  actions: RuleActionConfig[];
  selectedProxy?: ProxyConfig;
}

export interface ProxyValidationResult {
  success: boolean;
  latency?: number;
  error?: string;
  timestamp: Date;
}

export interface ConnectionPoolConfig {
  maxConnections: number;
  connectionTimeout: number;
  idleTimeout: number;
  retryAttempts: number;
}

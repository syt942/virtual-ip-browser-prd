/**
 * Proxy Usage Stats Types
 * Type definitions for proxy usage statistics database entities
 */

// ============================================================
// PROXY USAGE STATS TYPES
// ============================================================

export interface ErrorCounts {
  timeout?: number;
  connection_refused?: number;
  connection_reset?: number;
  dns_resolution?: number;
  ssl_error?: number;
  proxy_auth_failed?: number;
  rate_limited?: number;
  blocked?: number;
  other?: number;
}

export interface ProxyUsageStatsEntity {
  id: string;
  proxy_id: string;
  time_bucket: string;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  avg_latency_ms?: number;
  min_latency_ms?: number;
  max_latency_ms?: number;
  p95_latency_ms?: number;
  bytes_sent: number;
  bytes_received: number;
  rotation_count: number;
  rotation_reasons?: string; // JSON string
  error_counts?: string; // JSON string
  last_error?: string;
  last_error_at?: string;
  target_countries?: string; // JSON string
  unique_domains: number;
  unique_sessions: number;
  created_at: string;
  updated_at: string;
}

export interface ProxyUsageStatsDTO {
  id: string;
  proxyId: string;
  timeBucket: Date;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgLatencyMs?: number;
  minLatencyMs?: number;
  maxLatencyMs?: number;
  p95LatencyMs?: number;
  bytesSent: number;
  bytesReceived: number;
  rotationCount: number;
  rotationReasons: string[];
  errorCounts: ErrorCounts;
  lastError?: string;
  lastErrorAt?: Date;
  targetCountries: string[];
  uniqueDomains: number;
  uniqueSessions: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProxyUsageStatsInput {
  proxyId: string;
  timeBucket: Date;
  totalRequests?: number;
  successfulRequests?: number;
  failedRequests?: number;
  avgLatencyMs?: number;
  minLatencyMs?: number;
  maxLatencyMs?: number;
  bytesSent?: number;
  bytesReceived?: number;
}

export interface UpdateProxyUsageStatsInput {
  totalRequests?: number;
  successfulRequests?: number;
  failedRequests?: number;
  avgLatencyMs?: number;
  minLatencyMs?: number;
  maxLatencyMs?: number;
  p95LatencyMs?: number;
  bytesSent?: number;
  bytesReceived?: number;
  rotationCount?: number;
  rotationReasons?: string[];
  errorCounts?: ErrorCounts;
  lastError?: string;
  targetCountries?: string[];
  uniqueDomains?: number;
  uniqueSessions?: number;
}

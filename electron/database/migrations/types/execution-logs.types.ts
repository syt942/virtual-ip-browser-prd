/**
 * Execution Logs Types
 * Type definitions for execution log database entities
 */

// ============================================================
// EXECUTION LOGS TYPES
// ============================================================

export type ExecutionType = 'search' | 'creator_support' | 'scheduled';

export type ExecutionStatus = 'running' | 'completed' | 'failed' | 'cancelled';

export interface ResourceUsage {
  cpu: number;
  memory: number;
}

export interface ExecutionErrorDetail {
  timestamp: number;
  message: string;
  code?: string;
}

export interface ExecutionLogEntity {
  id: number;
  execution_type: string;
  start_time: number; // Unix timestamp
  end_time?: number; // Unix timestamp
  status: string;
  keywords_processed?: number;
  results_found?: number;
  creators_visited?: number;
  proxy_rotations: number;
  errors_count: number;
  error_details?: string; // JSON string
  resource_usage?: string; // JSON string
  metadata?: string; // JSON string
}

export interface ExecutionLogDTO {
  id: number;
  executionType: ExecutionType;
  startTime: Date;
  endTime?: Date;
  status: ExecutionStatus;
  keywordsProcessed?: number;
  resultsFound?: number;
  creatorsVisited?: number;
  proxyRotations: number;
  errorsCount: number;
  errorDetails?: ExecutionErrorDetail[];
  resourceUsage?: ResourceUsage;
  metadata?: Record<string, any>;
}

export interface CreateExecutionLogInput {
  executionType: ExecutionType;
  startTime: Date | number; // Date or Unix timestamp
  status?: ExecutionStatus;
  keywordsProcessed?: number;
  resultsFound?: number;
  creatorsVisited?: number;
  proxyRotations?: number;
  errorsCount?: number;
  errorDetails?: ExecutionErrorDetail[];
  resourceUsage?: ResourceUsage;
  metadata?: Record<string, any>;
}

export interface UpdateExecutionLogInput {
  endTime?: Date | number;
  status?: ExecutionStatus;
  keywordsProcessed?: number;
  resultsFound?: number;
  creatorsVisited?: number;
  proxyRotations?: number;
  errorsCount?: number;
  errorDetails?: ExecutionErrorDetail[];
  resourceUsage?: ResourceUsage;
  metadata?: Record<string, any>;
}

export interface ExecutionSummary {
  totalExecutions: number;
  completedCount: number;
  failedCount: number;
  cancelledCount: number;
  runningCount: number;
  avgDurationSeconds: number;
  totalKeywordsProcessed: number;
  totalResultsFound: number;
  totalCreatorsVisited: number;
  totalProxyRotations: number;
  totalErrors: number;
}

export interface ExecutionSummaryView {
  execution_type: string;
  total_executions: number;
  completed_count: number;
  failed_count: number;
  cancelled_count: number;
  running_count: number;
  avg_duration_seconds?: number;
  total_keywords_processed: number;
  total_results_found: number;
  total_creators_visited: number;
  total_proxy_rotations: number;
  total_errors: number;
}

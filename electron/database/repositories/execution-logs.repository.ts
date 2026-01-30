/**
 * Execution Logs Repository
 * Database operations for execution tracking and analytics
 */

import type Database from 'better-sqlite3';
import type {
  ExecutionLogEntity,
  ExecutionLogDTO,
  CreateExecutionLogInput,
  UpdateExecutionLogInput,
  ExecutionType,
  ExecutionStatus,
  ResourceUsage,
  ExecutionSummary
} from '../migrations/types';

export class ExecutionLogsRepository {
  constructor(private db: Database.Database) {}

  /**
   * Convert entity to DTO
   */
  private toDTO(entity: ExecutionLogEntity): ExecutionLogDTO {
    return {
      id: entity.id,
      executionType: entity.execution_type as ExecutionType,
      startTime: new Date(entity.start_time * 1000),
      endTime: entity.end_time ? new Date(entity.end_time * 1000) : undefined,
      status: entity.status as ExecutionStatus,
      keywordsProcessed: entity.keywords_processed,
      resultsFound: entity.results_found,
      creatorsVisited: entity.creators_visited,
      proxyRotations: entity.proxy_rotations,
      errorsCount: entity.errors_count,
      errorDetails: entity.error_details ? JSON.parse(entity.error_details) : undefined,
      resourceUsage: entity.resource_usage ? JSON.parse(entity.resource_usage) : undefined,
      metadata: entity.metadata ? JSON.parse(entity.metadata) : undefined
    };
  }

  /**
   * Create a new execution log entry
   */
  create(input: CreateExecutionLogInput): ExecutionLogDTO {
    const startTime = input.startTime instanceof Date 
      ? Math.floor(input.startTime.getTime() / 1000)
      : input.startTime;

    const result = this.db.prepare(`
      INSERT INTO execution_logs (
        execution_type, start_time, end_time, status,
        keywords_processed, results_found, creators_visited,
        proxy_rotations, errors_count, error_details,
        resource_usage, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      input.executionType,
      startTime,
      null, // end_time starts as null
      input.status || 'running',
      input.keywordsProcessed || null,
      input.resultsFound || null,
      input.creatorsVisited || null,
      input.proxyRotations || 0,
      input.errorsCount || 0,
      input.errorDetails ? JSON.stringify(input.errorDetails) : null,
      input.resourceUsage ? JSON.stringify(input.resourceUsage) : null,
      input.metadata ? JSON.stringify(input.metadata) : null
    );

    return this.findById(Number(result.lastInsertRowid))!;
  }

  /**
   * Find by ID
   */
  findById(id: number): ExecutionLogDTO | null {
    const entity = this.db.prepare(
      'SELECT * FROM execution_logs WHERE id = ?'
    ).get(id) as ExecutionLogEntity | undefined;
    
    return entity ? this.toDTO(entity) : null;
  }

  /**
   * Update an execution log
   */
  update(id: number, input: UpdateExecutionLogInput): ExecutionLogDTO | null {
    const updates: string[] = [];
    const params: any[] = [];

    if (input.endTime !== undefined) {
      updates.push('end_time = ?');
      params.push(input.endTime instanceof Date 
        ? Math.floor(input.endTime.getTime() / 1000) 
        : input.endTime);
    }

    if (input.status !== undefined) {
      updates.push('status = ?');
      params.push(input.status);
    }

    if (input.keywordsProcessed !== undefined) {
      updates.push('keywords_processed = ?');
      params.push(input.keywordsProcessed);
    }

    if (input.resultsFound !== undefined) {
      updates.push('results_found = ?');
      params.push(input.resultsFound);
    }

    if (input.creatorsVisited !== undefined) {
      updates.push('creators_visited = ?');
      params.push(input.creatorsVisited);
    }

    if (input.proxyRotations !== undefined) {
      updates.push('proxy_rotations = ?');
      params.push(input.proxyRotations);
    }

    if (input.errorsCount !== undefined) {
      updates.push('errors_count = ?');
      params.push(input.errorsCount);
    }

    if (input.errorDetails !== undefined) {
      updates.push('error_details = ?');
      params.push(JSON.stringify(input.errorDetails));
    }

    if (input.resourceUsage !== undefined) {
      updates.push('resource_usage = ?');
      params.push(JSON.stringify(input.resourceUsage));
    }

    if (input.metadata !== undefined) {
      updates.push('metadata = ?');
      params.push(JSON.stringify(input.metadata));
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    params.push(id);
    this.db.prepare(`
      UPDATE execution_logs SET ${updates.join(', ')} WHERE id = ?
    `).run(...params);

    return this.findById(id);
  }

  /**
   * Complete an execution
   */
  complete(id: number, updates?: Partial<UpdateExecutionLogInput>): ExecutionLogDTO | null {
    return this.update(id, {
      ...updates,
      status: 'completed',
      endTime: new Date()
    });
  }

  /**
   * Mark execution as failed
   */
  fail(id: number, errorDetails?: any[]): ExecutionLogDTO | null {
    const current = this.findById(id);
    return this.update(id, {
      status: 'failed',
      endTime: new Date(),
      errorsCount: (current?.errorsCount || 0) + 1,
      errorDetails
    });
  }

  /**
   * Cancel an execution
   */
  cancel(id: number): ExecutionLogDTO | null {
    return this.update(id, {
      status: 'cancelled',
      endTime: new Date()
    });
  }

  /**
   * Find by execution type
   */
  findByType(executionType: ExecutionType, limit: number = 100): ExecutionLogDTO[] {
    const entities = this.db.prepare(`
      SELECT * FROM execution_logs 
      WHERE execution_type = ?
      ORDER BY start_time DESC 
      LIMIT ?
    `).all(executionType, limit) as ExecutionLogEntity[];
    
    return entities.map(e => this.toDTO(e));
  }

  /**
   * Find by status
   */
  findByStatus(status: ExecutionStatus, limit: number = 100): ExecutionLogDTO[] {
    const entities = this.db.prepare(`
      SELECT * FROM execution_logs 
      WHERE status = ?
      ORDER BY start_time DESC 
      LIMIT ?
    `).all(status, limit) as ExecutionLogEntity[];
    
    return entities.map(e => this.toDTO(e));
  }

  /**
   * Find running executions
   */
  findRunning(): ExecutionLogDTO[] {
    return this.findByStatus('running', 1000);
  }

  /**
   * Find recent executions
   */
  findRecent(limit: number = 100): ExecutionLogDTO[] {
    const entities = this.db.prepare(`
      SELECT * FROM execution_logs 
      ORDER BY start_time DESC 
      LIMIT ?
    `).all(limit) as ExecutionLogEntity[];
    
    return entities.map(e => this.toDTO(e));
  }

  /**
   * Find by time range
   */
  findByTimeRange(startTime: Date, endTime: Date): ExecutionLogDTO[] {
    const startTimestamp = Math.floor(startTime.getTime() / 1000);
    const endTimestamp = Math.floor(endTime.getTime() / 1000);
    
    const entities = this.db.prepare(`
      SELECT * FROM execution_logs 
      WHERE start_time >= ? AND start_time <= ?
      ORDER BY start_time DESC
    `).all(startTimestamp, endTimestamp) as ExecutionLogEntity[];
    
    return entities.map(e => this.toDTO(e));
  }

  /**
   * Get execution summary by type
   */
  getSummaryByType(): Record<ExecutionType, ExecutionSummary> {
    const rows = this.db.prepare(`
      SELECT 
        execution_type,
        COUNT(*) as total_executions,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count,
        SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running_count,
        AVG(CASE WHEN end_time IS NOT NULL THEN end_time - start_time END) as avg_duration,
        SUM(COALESCE(keywords_processed, 0)) as total_keywords,
        SUM(COALESCE(results_found, 0)) as total_results,
        SUM(COALESCE(creators_visited, 0)) as total_creators,
        SUM(proxy_rotations) as total_rotations,
        SUM(errors_count) as total_errors
      FROM execution_logs
      GROUP BY execution_type
    `).all() as any[];

    const result: Record<ExecutionType, ExecutionSummary> = {
      search: this.createEmptySummary(),
      creator_support: this.createEmptySummary(),
      scheduled: this.createEmptySummary()
    };

    for (const row of rows) {
      result[row.execution_type as ExecutionType] = {
        totalExecutions: row.total_executions || 0,
        completedCount: row.completed_count || 0,
        failedCount: row.failed_count || 0,
        cancelledCount: row.cancelled_count || 0,
        runningCount: row.running_count || 0,
        avgDurationSeconds: row.avg_duration || 0,
        totalKeywordsProcessed: row.total_keywords || 0,
        totalResultsFound: row.total_results || 0,
        totalCreatorsVisited: row.total_creators || 0,
        totalProxyRotations: row.total_rotations || 0,
        totalErrors: row.total_errors || 0
      };
    }

    return result;
  }

  private createEmptySummary(): ExecutionSummary {
    return {
      totalExecutions: 0,
      completedCount: 0,
      failedCount: 0,
      cancelledCount: 0,
      runningCount: 0,
      avgDurationSeconds: 0,
      totalKeywordsProcessed: 0,
      totalResultsFound: 0,
      totalCreatorsVisited: 0,
      totalProxyRotations: 0,
      totalErrors: 0
    };
  }

  /**
   * Get hourly execution counts
   */
  getHourlyCounts(hours: number = 24): Array<{ hour: string; count: number }> {
    const startTimestamp = Math.floor((Date.now() - hours * 60 * 60 * 1000) / 1000);
    
    return this.db.prepare(`
      SELECT 
        strftime('%Y-%m-%d %H:00:00', start_time, 'unixepoch') as hour,
        COUNT(*) as count
      FROM execution_logs
      WHERE start_time >= ?
      GROUP BY hour
      ORDER BY hour ASC
    `).all(startTimestamp) as Array<{ hour: string; count: number }>;
  }

  /**
   * Get success rate for a time period
   */
  getSuccessRate(hours: number = 24): number {
    const startTimestamp = Math.floor((Date.now() - hours * 60 * 60 * 1000) / 1000);
    
    const result = this.db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful
      FROM execution_logs
      WHERE start_time >= ? AND status != 'running'
    `).get(startTimestamp) as { total: number; successful: number };

    if (result.total === 0) return 100;
    return (result.successful / result.total) * 100;
  }

  /**
   * Get average duration by type
   */
  getAverageDuration(executionType?: ExecutionType): number {
    let sql = `
      SELECT AVG(end_time - start_time) as avg_duration
      FROM execution_logs
      WHERE end_time IS NOT NULL
    `;
    const params: any[] = [];

    if (executionType) {
      sql += ' AND execution_type = ?';
      params.push(executionType);
    }

    const result = this.db.prepare(sql).get(...params) as { avg_duration: number | null };
    return result.avg_duration || 0;
  }

  /**
   * Increment proxy rotations counter
   */
  incrementProxyRotations(id: number, count: number = 1): void {
    this.db.prepare(`
      UPDATE execution_logs 
      SET proxy_rotations = proxy_rotations + ?
      WHERE id = ?
    `).run(count, id);
  }

  /**
   * Increment errors counter
   */
  incrementErrors(id: number, count: number = 1): void {
    this.db.prepare(`
      UPDATE execution_logs 
      SET errors_count = errors_count + ?
      WHERE id = ?
    `).run(count, id);
  }

  /**
   * Update resource usage
   */
  updateResourceUsage(id: number, resourceUsage: ResourceUsage): void {
    this.db.prepare(`
      UPDATE execution_logs 
      SET resource_usage = ?
      WHERE id = ?
    `).run(JSON.stringify(resourceUsage), id);
  }

  /**
   * Cleanup old records (retention policy)
   */
  cleanup(retentionDays: number = 30): number {
    const cutoffTimestamp = Math.floor((Date.now() - retentionDays * 24 * 60 * 60 * 1000) / 1000);
    const result = this.db.prepare(
      'DELETE FROM execution_logs WHERE start_time < ? AND status != ?'
    ).run(cutoffTimestamp, 'running');
    return result.changes;
  }

  /**
   * Delete by ID
   */
  delete(id: number): boolean {
    const result = this.db.prepare(
      'DELETE FROM execution_logs WHERE id = ?'
    ).run(id);
    return result.changes > 0;
  }
}

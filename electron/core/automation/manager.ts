/**
 * Automation Manager
 * Central manager for all automation features
 */

import { EventEmitter } from 'events';
import type { 
  SearchTask, 
  SearchConfig, 
  AutomationSession, 
  TargetDomain,
  Creator,
  TaskSchedule
} from './types';
// SessionStatistics is embedded in AutomationSession
import { TaskScheduler } from './scheduler';
import { TaskExecutor } from './executor';
import { DatabaseManager } from '../../database';

/**
 * Event handler function type for bound handlers.
 * Uses a generic function signature that accepts any event data type.
 * This provides flexibility for different event signatures while avoiding 'any'.
 * 
 * @remarks
 * We use `(...args: unknown[]) => void` instead of `any[]` to maintain type safety
 * while allowing handlers with different parameter signatures to be stored together.
 */
type BoundEventHandler = (...args: unknown[]) => void;

export class AutomationManager extends EventEmitter {
  private scheduler: TaskScheduler;
  private executor: TaskExecutor;
  private sessions: Map<string, AutomationSession> = new Map();
  private db: DatabaseManager;
  private boundHandlers: Map<string, BoundEventHandler> = new Map();

  constructor(db: DatabaseManager) {
    super();
    this.db = db;
    this.scheduler = new TaskScheduler();
    this.executor = new TaskExecutor();

    this.setupEventListeners();
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Scheduler events - handler receives TaskSchedule
    const scheduleHandler: BoundEventHandler = (schedule: unknown) => {
      this.emit('schedule:triggered', schedule as TaskSchedule);
    };
    this.boundHandlers.set('scheduler:task:execute', scheduleHandler);
    this.scheduler.on('task:execute', scheduleHandler);

    // Executor events - handlers receive SearchTask
    const taskStartedHandler: BoundEventHandler = (task: unknown) => {
      const searchTask = task as SearchTask;
      this.updateTaskInDatabase(searchTask);
      this.emit('task:started', searchTask);
    };
    this.boundHandlers.set('executor:task:started', taskStartedHandler);
    this.executor.on('task:started', taskStartedHandler);

    const taskCompletedHandler: BoundEventHandler = (task: unknown) => {
      const searchTask = task as SearchTask;
      this.updateTaskInDatabase(searchTask);
      this.updateSessionStatistics(searchTask.sessionId);
      this.emit('task:completed', searchTask);
    };
    this.boundHandlers.set('executor:task:completed', taskCompletedHandler);
    this.executor.on('task:completed', taskCompletedHandler);

    const taskFailedHandler: BoundEventHandler = (task: unknown) => {
      const searchTask = task as SearchTask;
      this.updateTaskInDatabase(searchTask);
      this.updateSessionStatistics(searchTask.sessionId);
      this.emit('task:failed', searchTask);
    };
    this.boundHandlers.set('executor:task:failed', taskFailedHandler);
    this.executor.on('task:failed', taskFailedHandler);
  }

  /**
   * Clean up event listeners and resources
   */
  destroy(): void {
    // Remove scheduler listeners
    const scheduleHandler = this.boundHandlers.get('scheduler:task:execute');
    if (scheduleHandler) {
      this.scheduler.off('task:execute', scheduleHandler);
    }

    // Remove executor listeners
    const taskStartedHandler = this.boundHandlers.get('executor:task:started');
    if (taskStartedHandler) {
      this.executor.off('task:started', taskStartedHandler);
    }

    const taskCompletedHandler = this.boundHandlers.get('executor:task:completed');
    if (taskCompletedHandler) {
      this.executor.off('task:completed', taskCompletedHandler);
    }

    const taskFailedHandler = this.boundHandlers.get('executor:task:failed');
    if (taskFailedHandler) {
      this.executor.off('task:failed', taskFailedHandler);
    }

    // Clear bound handlers
    this.boundHandlers.clear();

    // Remove all own listeners
    this.removeAllListeners();

    // Clear sessions
    this.sessions.clear();
  }

  /**
   * Start automation session
   */
  async startSession(config: SearchConfig): Promise<AutomationSession> {
    const sessionId = crypto.randomUUID();
    
    // Create tasks for all keywords
    const tasks: SearchTask[] = config.keywords.map(keyword => ({
      id: crypto.randomUUID(),
      sessionId,
      keyword,
      engine: config.engine,
      status: 'queued',
      retryCount: 0,
      createdAt: new Date()
    }));

    const session: AutomationSession = {
      id: sessionId,
      name: `Session ${new Date().toISOString()}`,
      status: 'active',
      config,
      tasks,
      startedAt: new Date(),
      statistics: {
        totalTasks: tasks.length,
        completedTasks: 0,
        failedTasks: 0,
        avgDuration: 0,
        totalDomainVisits: 0,
        successRate: 0
      }
    };

    this.sessions.set(sessionId, session);

    // Save tasks to database
    for (const task of tasks) {
      this.saveTaskToDatabase(task);
    }

    this.emit('session:started', session);
    return session;
  }

  /**
   * Stop automation session
   */
  stopSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {return false;}

    session.status = 'stopped';
    session.completedAt = new Date();

    this.sessions.set(sessionId, session);
    this.emit('session:stopped', session);
    return true;
  }

  /**
   * Pause automation session
   */
  pauseSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {return false;}

    session.status = 'paused';
    session.pausedAt = new Date();

    this.sessions.set(sessionId, session);
    this.emit('session:paused', session);
    return true;
  }

  /**
   * Resume automation session
   */
  resumeSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'paused') {return false;}

    session.status = 'active';
    session.pausedAt = undefined;

    this.sessions.set(sessionId, session);
    this.emit('session:resumed', session);
    return true;
  }

  /**
   * Get all sessions
   */
  getAllSessions(): AutomationSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): AutomationSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Add keyword to queue
   */
  async addKeyword(sessionId: string, keyword: string): Promise<SearchTask> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const task: SearchTask = {
      id: crypto.randomUUID(),
      sessionId,
      keyword,
      engine: session.config.engine,
      status: 'queued',
      retryCount: 0,
      createdAt: new Date()
    };

    session.tasks.push(task);
    session.statistics.totalTasks++;
    this.sessions.set(sessionId, session);

    await this.saveTaskToDatabase(task);
    this.emit('task:added', task);

    return task;
  }

  /**
   * Add target domain
   */
  async addTargetDomain(domain: string, pattern?: string): Promise<TargetDomain> {
    const targetDomain: TargetDomain = {
      id: crypto.randomUUID(),
      domain,
      pattern,
      enabled: true,
      priority: 0,
      visitCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.saveTargetDomainToDatabase(targetDomain);
    this.emit('domain:added', targetDomain);

    return targetDomain;
  }

  /**
   * Get all target domains
   */
  async getTargetDomains(): Promise<TargetDomain[]> {
    const sql = 'SELECT * FROM target_domains ORDER BY priority DESC';
    return this.db.query(sql);
  }

  /**
   * Add creator
   */
  async addCreator(creator: Omit<Creator, 'id' | 'createdAt' | 'updatedAt'>): Promise<Creator> {
    const newCreator: Creator = {
      ...creator,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.saveCreatorToDatabase(newCreator);
    this.emit('creator:added', newCreator);

    return newCreator;
  }

  /**
   * Get all creators
   */
  async getCreators(): Promise<Creator[]> {
    const sql = 'SELECT * FROM creators WHERE enabled = 1 ORDER BY priority DESC';
    return this.db.query(sql);
  }

  /**
   * Start scheduler
   */
  startScheduler(): void {
    this.scheduler.start();
    this.emit('scheduler:started');
  }

  /**
   * Stop scheduler
   */
  stopScheduler(): void {
    this.scheduler.stop();
    this.emit('scheduler:stopped');
  }

  /**
   * Get scheduler
   */
  getScheduler(): TaskScheduler {
    return this.scheduler;
  }

  /**
   * Get executor
   */
  getExecutor(): TaskExecutor {
    return this.executor;
  }

  /**
   * Update session statistics
   */
  private updateSessionStatistics(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {return;}

    const completed = session.tasks.filter(t => t.status === 'completed').length;
    const failed = session.tasks.filter(t => t.status === 'failed').length;
    const durations = session.tasks
      .filter(t => t.duration)
      .map(t => t.duration!);
    
    const avgDuration = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;

    session.statistics = {
      totalTasks: session.tasks.length,
      completedTasks: completed,
      failedTasks: failed,
      avgDuration,
      totalDomainVisits: session.tasks.filter(t => t.position).length,
      successRate: session.tasks.length > 0 
        ? (completed / session.tasks.length) * 100 
        : 0
    };

    this.sessions.set(sessionId, session);
    this.emit('session:updated', session);
  }

  /**
   * Save task to database
   */
  private async saveTaskToDatabase(task: SearchTask): Promise<void> {
    const sql = `
      INSERT INTO search_tasks (
        id, session_id, keyword, engine, status, proxy_id, tab_id,
        position, results, error, retry_count, start_time, end_time,
        duration, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    try {
      await this.db.execute(sql, [
        task.id,
        task.sessionId,
        task.keyword,
        task.engine,
        task.status,
        task.proxyId || null,
        task.tabId || null,
        task.position || null,
        task.results ? JSON.stringify(task.results) : null,
        task.error || null,
        task.retryCount,
        task.startTime || null,
        task.endTime || null,
        task.duration || null,
        task.createdAt
      ]);
    } catch (error) {
      this.emit('database:error', { 
        operation: 'saveTask', 
        task: task.id, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw new Error(`Failed to save task ${task.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update task in database
   */
  private async updateTaskInDatabase(task: SearchTask): Promise<void> {
    const sql = `
      UPDATE search_tasks SET
        status = ?, position = ?, results = ?, error = ?,
        retry_count = ?, start_time = ?, end_time = ?, duration = ?
      WHERE id = ?
    `;

    try {
      await this.db.execute(sql, [
        task.status,
        task.position || null,
        task.results ? JSON.stringify(task.results) : null,
        task.error || null,
        task.retryCount,
        task.startTime || null,
        task.endTime || null,
        task.duration || null,
        task.id
      ]);
    } catch (error) {
      this.emit('database:error', { 
        operation: 'updateTask', 
        task: task.id, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      // Don't throw here as update failures shouldn't stop the task execution
      console.error(`[AutomationManager] Failed to update task ${task.id}:`, error);
    }
  }

  /**
   * Save target domain to database
   */
  private async saveTargetDomainToDatabase(domain: TargetDomain): Promise<void> {
    const sql = `
      INSERT INTO target_domains (
        id, domain, pattern, enabled, priority, visit_count,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    this.db.execute(sql, [
      domain.id,
      domain.domain,
      domain.pattern || null,
      domain.enabled ? 1 : 0,
      domain.priority,
      domain.visitCount,
      domain.createdAt,
      domain.updatedAt
    ]);
  }

  /**
   * Save creator to database
   */
  private async saveCreatorToDatabase(creator: Creator): Promise<void> {
    const sql = `
      INSERT INTO creators (
        id, name, url, platform, thumbnail_url, support_methods,
        enabled, priority, total_supports, total_ads_viewed,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    this.db.execute(sql, [
      creator.id,
      creator.name,
      creator.url,
      creator.platform,
      creator.thumbnailUrl || null,
      JSON.stringify(creator.supportMethods),
      creator.enabled ? 1 : 0,
      creator.priority,
      creator.totalSupports,
      creator.totalAdsViewed,
      creator.createdAt,
      creator.updatedAt
    ]);
  }
}

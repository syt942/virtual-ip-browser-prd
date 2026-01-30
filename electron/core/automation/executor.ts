/**
 * Task Executor
 * Executes automation tasks with retry logic and error handling
 */

import { EventEmitter } from 'events';
import type { SearchTask, SearchConfig } from './types';
// SearchEngine type imported but used indirectly via SearchEngineAutomation
import { SearchEngineAutomation } from './search-engine';
import { DEFAULT_MAX_CONCURRENT_TASKS, MIN_CONCURRENT_TASKS } from './constants';

/**
 * Interface representing a view that can be used for automation
 * Compatible with Electron's BrowserView
 */
export interface AutomationViewLike {
  webContents: {
    loadURL: (url: string) => Promise<void>;
    executeJavaScript: (code: string) => Promise<unknown>;
    getURL: () => string;
    isLoading: () => boolean;
    once: (event: string, callback: () => void) => void;
  };
}

export class TaskExecutor extends EventEmitter {
  private searchEngine: SearchEngineAutomation;
  private activeTasks: Map<string, SearchTask> = new Map();
  private maxConcurrentTasks: number = DEFAULT_MAX_CONCURRENT_TASKS;

  constructor() {
    super();
    this.searchEngine = new SearchEngineAutomation();
  }

  /**
   * Execute a search task
   */
  async executeSearchTask(
    task: SearchTask,
    config: SearchConfig,
    view: AutomationViewLike
  ): Promise<void> {
    if (this.activeTasks.size >= this.maxConcurrentTasks) {
      throw new Error('Max concurrent tasks reached');
    }

    this.activeTasks.set(task.id, task);
    task.status = 'running';
    task.startTime = new Date();
    
    this.emit('task:started', task);

    try {
      // Perform search
      const results = await this.searchEngine.performSearch(
        view,
        task.keyword,
        task.engine
      );

      task.results = results;

      // Find target domain if specified
      if (config.targetDomains && config.targetDomains.length > 0) {
        const targetResult = this.searchEngine.findTargetDomain(
          results,
          config.targetDomains
        );

        if (targetResult) {
          task.position = targetResult.position;

          // Click through if enabled
          if (config.clickThrough) {
            await this.searchEngine.clickResult(view, targetResult.position);

            // Simulate human behavior if enabled
            if (config.simulateHumanBehavior) {
              await this.searchEngine.simulateHumanBehavior(view);
            }
          }
        }
      }

      // Mark as completed
      task.status = 'completed';
      task.endTime = new Date();
      task.duration = task.endTime.getTime() - task.startTime.getTime();

      this.emit('task:completed', task);
    } catch (error) {
      console.error('[Executor] Task failed:', error);

      task.error = error instanceof Error ? error.message : 'Unknown error';
      task.retryCount++;

      // Retry if under max retries
      if (task.retryCount < config.maxRetries) {
        task.status = 'queued';
        this.emit('task:retry', task);

        // Wait before retry
        await this.delay(config.delayBetweenSearches);

        // Retry
        return this.executeSearchTask(task, config, view);
      } else {
        task.status = 'failed';
        task.endTime = new Date();
        task.duration = task.endTime.getTime() - task.startTime!.getTime();
        this.emit('task:failed', task);
      }
    } finally {
      this.activeTasks.delete(task.id);
    }
  }

  /**
   * Execute multiple tasks in sequence
   */
  async executeBatch(
    tasks: SearchTask[],
    config: SearchConfig,
    view: AutomationViewLike
  ): Promise<void> {
    for (const task of tasks) {
      await this.executeSearchTask(task, config, view);

      // Delay between tasks
      if (config.delayBetweenSearches > 0) {
        await this.delay(config.delayBetweenSearches);
      }
    }
  }

  /**
   * Cancel a running task
   */
  cancelTask(taskId: string): boolean {
    const task = this.activeTasks.get(taskId);
    if (!task) return false;

    task.status = 'cancelled';
    task.endTime = new Date();
    if (task.startTime) {
      task.duration = task.endTime.getTime() - task.startTime.getTime();
    }

    this.activeTasks.delete(taskId);
    this.emit('task:cancelled', task);
    return true;
  }

  /**
   * Get active tasks
   */
  getActiveTasks(): SearchTask[] {
    return Array.from(this.activeTasks.values());
  }

  /**
   * Set max concurrent tasks
   */
  setMaxConcurrentTasks(max: number): void {
    this.maxConcurrentTasks = Math.max(MIN_CONCURRENT_TASKS, max);
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

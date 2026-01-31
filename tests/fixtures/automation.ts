/**
 * Automation Test Fixtures
 * Reusable test data for automation-related tests
 */

import type { SearchEngine, TaskStatus } from '../../src/stores/automationStore';

// ============================================================================
// VALID CONFIGURATIONS
// ============================================================================

export const validAutomationConfigs = [
  {
    keywords: ['test keyword 1', 'test keyword 2'],
    engine: 'google' as SearchEngine,
    targetDomains: ['example.com'],
    maxRetries: 3,
    delayBetweenSearches: 5000,
  },
  {
    keywords: ['single keyword'],
    engine: 'bing' as SearchEngine,
    targetDomains: ['example.com', 'test.com'],
    useRandomProxy: true,
    clickThrough: false,
  },
  {
    keywords: ['duckduckgo test'],
    engine: 'duckduckgo' as SearchEngine,
    targetDomains: ['privacy.example.com'],
    simulateHumanBehavior: true,
  },
];

// ============================================================================
// INVALID CONFIGURATIONS (for negative tests)
// ============================================================================

export const invalidAutomationConfigs = [
  { 
    config: { keywords: [], engine: 'google' }, 
    reason: 'Empty keywords array' 
  },
  { 
    config: { keywords: ['a'.repeat(300)], engine: 'google' }, 
    reason: 'Keyword too long (>200 chars)' 
  },
  { 
    config: { keywords: ['test'], engine: 'invalid' }, 
    reason: 'Invalid search engine' 
  },
  { 
    config: { keywords: ['test'], engine: 'google', delayBetweenSearches: 100 }, 
    reason: 'Delay too short (<1000ms)' 
  },
  { 
    config: { keywords: ['test'], engine: 'google', delayBetweenSearches: 100000 }, 
    reason: 'Delay too long (>60000ms)' 
  },
  { 
    config: { keywords: ['test'], engine: 'google', maxRetries: 100 }, 
    reason: 'Max retries too high (>10)' 
  },
];

// ============================================================================
// SECURITY TEST CASES
// ============================================================================

export const maliciousAutomationInputs = {
  keywords: [
    '<script>alert(1)</script>',
    'javascript:alert(1)',
    '"><img src=x onerror=alert(1)>',
    "'; DROP TABLE users; --",
    'test\0malicious',
    'test\x00null',
  ],
  domains: [
    'example.com"><script>alert(1)</script>',
    'localhost',
    '127.0.0.1',
    '169.254.169.254',
    '10.0.0.1',
    'example.com; rm -rf /',
  ],
  patterns: [
    '(.*)+',  // ReDoS
    '(.+)+',  // ReDoS
    '([a-z]+)+', // ReDoS
    '[',  // Invalid regex
    '\\',  // Invalid regex
  ],
};

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

let sessionIdCounter = 0;
let taskIdCounter = 0;

export interface MockSearchTask {
  id: string;
  sessionId: string;
  keyword: string;
  engine: SearchEngine;
  status: TaskStatus;
  position?: number;
  error?: string;
  duration?: number;
}

export interface MockAutomationSession {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'stopped';
  engine: SearchEngine;
  keywords: string[];
  targetDomains: string[];
  tasks: MockSearchTask[];
  statistics: {
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    avgDuration: number;
    successRate: number;
  };
}

/**
 * Create a mock search task
 */
export function createMockTask(overrides: Partial<MockSearchTask> = {}): MockSearchTask {
  const id = overrides.id || `task-${taskIdCounter++}`;
  
  return {
    id,
    sessionId: overrides.sessionId || `session-${sessionIdCounter}`,
    keyword: 'test keyword',
    engine: 'google',
    status: 'queued',
    ...overrides,
  };
}

/**
 * Create a mock automation session
 */
export function createMockSession(overrides: Partial<MockAutomationSession> = {}): MockAutomationSession {
  const id = overrides.id || `00000000-0000-4000-a000-${String(sessionIdCounter++).padStart(12, '0')}`;
  
  return {
    id,
    name: `Session ${sessionIdCounter}`,
    status: 'active',
    engine: 'google',
    keywords: ['test keyword'],
    targetDomains: ['example.com'],
    tasks: [],
    statistics: {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      avgDuration: 0,
      successRate: 0,
    },
    ...overrides,
  };
}

/**
 * Create a session with various task statuses
 */
export function createSessionWithTasks(): MockAutomationSession {
  const session = createMockSession();
  const statuses: TaskStatus[] = ['queued', 'running', 'completed', 'failed', 'cancelled'];
  
  session.tasks = statuses.map((status, i) => 
    createMockTask({
      sessionId: session.id,
      keyword: `keyword-${i}`,
      status,
      duration: status === 'completed' ? 1500 : undefined,
      error: status === 'failed' ? 'Test error' : undefined,
      position: status === 'completed' ? i + 1 : undefined,
    })
  );
  
  session.statistics = {
    totalTasks: 5,
    completedTasks: 1,
    failedTasks: 1,
    avgDuration: 1500,
    successRate: 20,
  };
  
  return session;
}

/**
 * Reset automation fixture counters
 */
export function resetAutomationFixtures(): void {
  sessionIdCounter = 0;
  taskIdCounter = 0;
}

/**
 * Test Data Factories
 * Reusable factory functions for creating test data
 */

import { vi } from 'vitest';

// ============================================================================
// PROXY FACTORIES
// ============================================================================

export interface ProxyTestData {
  id: string;
  name: string;
  host: string;
  port: number;
  protocol: 'http' | 'https' | 'socks4' | 'socks5';
  status: string;
  hasCredentials: boolean;
  username?: string;
  password?: string;
  region?: string;
  tags?: string[];
}

let proxyCounter = 0;

export function createTestProxy(overrides: Partial<ProxyTestData> = {}): ProxyTestData {
  const id = overrides.id || `00000000-0000-4000-a000-${String(++proxyCounter).padStart(12, '0')}`;
  return {
    id,
    name: `Test Proxy ${proxyCounter}`,
    host: `proxy${proxyCounter}.example.com`,
    port: 8080,
    protocol: 'https',
    status: 'checking',
    hasCredentials: false,
    ...overrides,
  };
}

export function createTestProxyInput(overrides: Partial<ProxyTestData> = {}) {
  return {
    name: overrides.name || 'Test Proxy',
    host: overrides.host || 'proxy.example.com',
    port: overrides.port || 8080,
    protocol: overrides.protocol || 'https',
    username: overrides.username,
    password: overrides.password,
    region: overrides.region,
    tags: overrides.tags,
  };
}

export function createTestProxyBatch(count: number): ProxyTestData[] {
  return Array(count).fill(null).map((_, i) =>
    createTestProxy({ name: `Batch Proxy ${i + 1}` })
  );
}

// ============================================================================
// TAB FACTORIES
// ============================================================================

export interface TabTestData {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  proxyId?: string;
  fingerprint?: FingerprintTestData;
  createdAt: Date;
  updatedAt: Date;
}

export interface FingerprintTestData {
  canvas: boolean;
  webgl: boolean;
  audio: boolean;
  navigator: boolean | NavigatorTestData;
  timezone?: string;
  language?: string;
  platform?: string;
}

export interface NavigatorTestData {
  userAgent?: string;
  platform?: string;
  language?: string;
  vendor?: string;
  hardwareConcurrency?: number;
  deviceMemory?: number;
}

let tabCounter = 0;

export function createTestTab(overrides: Partial<TabTestData> = {}): TabTestData {
  const id = overrides.id || `00000000-0000-4000-a000-${String(++tabCounter).padStart(12, '0')}`;
  const now = new Date();
  return {
    id,
    url: 'https://example.com',
    title: `Test Tab ${tabCounter}`,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createTestTabInput(overrides: Partial<Omit<TabTestData, 'id' | 'createdAt' | 'updatedAt'>> = {}) {
  return {
    url: overrides.url || 'https://example.com',
    title: overrides.title || 'Test Tab',
    proxyId: overrides.proxyId,
    fingerprint: overrides.fingerprint,
  };
}

export function createTestTabBatch(count: number): TabTestData[] {
  return Array(count).fill(null).map((_, i) =>
    createTestTab({ title: `Batch Tab ${i + 1}`, url: `https://example${i + 1}.com` })
  );
}

export function createTestFingerprint(overrides: Partial<FingerprintTestData> = {}): FingerprintTestData {
  return {
    canvas: true,
    webgl: true,
    audio: true,
    navigator: true,
    timezone: 'America/New_York',
    language: 'en-US',
    ...overrides,
  };
}

// ============================================================================
// SESSION FACTORIES
// ============================================================================

export interface SessionTestData {
  id: string;
  name: string;
  tabs: TabTestData[];
  windowBounds: { x: number; y: number; width: number; height: number };
  createdAt: Date;
  updatedAt: Date;
}

let sessionCounter = 0;

export function createTestSession(overrides: Partial<SessionTestData> = {}): SessionTestData {
  const id = overrides.id || `00000000-0000-4000-a000-${String(++sessionCounter).padStart(12, '0')}`;
  const now = new Date();
  return {
    id,
    name: `Test Session ${sessionCounter}`,
    tabs: overrides.tabs || [createTestTab()],
    windowBounds: { x: 0, y: 0, width: 1200, height: 800 },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// ============================================================================
// AUTOMATION FACTORIES
// ============================================================================

export interface AutomationConfigTestData {
  keywords: string[];
  engine: 'google' | 'bing' | 'duckduckgo' | 'yahoo' | 'brave';
  targetDomains: string[];
  maxRetries: number;
  delayBetweenSearches: number;
  useRandomProxy: boolean;
  clickThrough: boolean;
  simulateHumanBehavior: boolean;
}

export interface AutomationSessionTestData {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'stopped' | 'completed';
  config: AutomationConfigTestData;
  tasks: SearchTaskTestData[];
  startedAt: Date;
  completedAt?: Date;
}

export interface SearchTaskTestData {
  id: string;
  sessionId: string;
  keyword: string;
  engine: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  retryCount: number;
  createdAt: Date;
}

let automationSessionCounter = 0;
let searchTaskCounter = 0;

export function createTestAutomationConfig(
  overrides: Partial<AutomationConfigTestData> = {}
): AutomationConfigTestData {
  return {
    keywords: ['test keyword 1', 'test keyword 2'],
    engine: 'google',
    targetDomains: ['example.com'],
    maxRetries: 3,
    delayBetweenSearches: 3000,
    useRandomProxy: false,
    clickThrough: true,
    simulateHumanBehavior: true,
    ...overrides,
  };
}

export function createTestAutomationSession(
  overrides: Partial<AutomationSessionTestData> = {}
): AutomationSessionTestData {
  const id = overrides.id || `00000000-0000-4000-a000-${String(++automationSessionCounter).padStart(12, '0')}`;
  return {
    id,
    name: `Test Session ${automationSessionCounter}`,
    status: 'active',
    config: createTestAutomationConfig(),
    tasks: [],
    startedAt: new Date(),
    ...overrides,
  };
}

export function createTestSearchTask(
  overrides: Partial<SearchTaskTestData> = {}
): SearchTaskTestData {
  const id = overrides.id || `00000000-0000-4000-a000-${String(++searchTaskCounter).padStart(12, '0')}`;
  return {
    id,
    sessionId: overrides.sessionId || '00000000-0000-4000-a000-000000000001',
    keyword: 'test keyword',
    engine: 'google',
    status: 'queued',
    retryCount: 0,
    createdAt: new Date(),
    ...overrides,
  };
}

// ============================================================================
// MOCK MANAGER FACTORIES
// ============================================================================

export function createMockProxyManager() {
  return {
    addProxy: vi.fn().mockImplementation((input) => 
      Promise.resolve(createTestProxy({ ...input }))
    ),
    removeProxy: vi.fn().mockReturnValue(true),
    getAllProxies: vi.fn().mockReturnValue([]),
    getProxy: vi.fn().mockReturnValue(undefined),
    getNextProxy: vi.fn().mockReturnValue(null),
    validateProxy: vi.fn().mockResolvedValue({ success: true, latency: 100 }),
    setRotationStrategy: vi.fn(),
    updateStats: vi.fn(),
    getDecryptedCredentials: vi.fn().mockReturnValue(null),
    destroy: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  };
}

export function createMockTabManager() {
  return {
    createTab: vi.fn().mockImplementation((config) =>
      Promise.resolve(createTestTab({ ...config }))
    ),
    closeTab: vi.fn().mockReturnValue(true),
    getAllTabs: vi.fn().mockReturnValue([]),
    getTab: vi.fn().mockReturnValue(undefined),
    getActiveTabId: vi.fn().mockReturnValue(null),
    setActiveTab: vi.fn(),
    updateTab: vi.fn().mockImplementation((id, updates) =>
      createTestTab({ id, ...updates })
    ),
    navigate: vi.fn().mockResolvedValue(undefined),
    goBack: vi.fn(),
    goForward: vi.fn(),
    reload: vi.fn(),
    setWindow: vi.fn(),
    setPrivacyManager: vi.fn(),
    setProxyManager: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  };
}

export function createMockPrivacyManager() {
  return {
    generateProtectionScript: vi.fn().mockReturnValue('// protection script'),
    applyToSession: vi.fn(),
    generateRandomProfile: vi.fn().mockReturnValue(createTestFingerprint()),
    getCanvasProtection: vi.fn().mockReturnValue({
      generateInjectionScript: vi.fn().mockReturnValue('// canvas'),
    }),
    getWebGLProtection: vi.fn().mockReturnValue({
      generateInjectionScript: vi.fn().mockReturnValue('// webgl'),
    }),
    getAudioProtection: vi.fn().mockReturnValue({
      generateInjectionScript: vi.fn().mockReturnValue('// audio'),
    }),
    getNavigatorProtection: vi.fn().mockReturnValue({
      generateInjectionScript: vi.fn().mockReturnValue('// navigator'),
      setConfig: vi.fn(),
    }),
    getTimezoneProtection: vi.fn().mockReturnValue({
      generateInjectionScript: vi.fn().mockReturnValue('// timezone'),
      setTimezone: vi.fn(),
    }),
    getWebRTCProtection: vi.fn().mockReturnValue({
      generateInjectionScript: vi.fn().mockReturnValue('// webrtc'),
      setBlockWebRTC: vi.fn(),
    }),
    getTrackerBlocker: vi.fn().mockReturnValue({
      enableForSession: vi.fn(),
      setEnabled: vi.fn(),
    }),
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  };
}

export function createMockAutomationManager() {
  return {
    startSession: vi.fn().mockImplementation((config) =>
      Promise.resolve(createTestAutomationSession({ config }))
    ),
    stopSession: vi.fn().mockReturnValue(true),
    pauseSession: vi.fn().mockReturnValue(true),
    resumeSession: vi.fn().mockReturnValue(true),
    getAllSessions: vi.fn().mockReturnValue([]),
    getSession: vi.fn().mockReturnValue(undefined),
    addKeyword: vi.fn().mockImplementation((sessionId, keyword) =>
      Promise.resolve(createTestSearchTask({ sessionId, keyword }))
    ),
    addTargetDomain: vi.fn().mockImplementation((domain) =>
      Promise.resolve({ id: '00000000-0000-4000-a000-000000000001', domain, enabled: true })
    ),
    getTargetDomains: vi.fn().mockResolvedValue([]),
    startScheduler: vi.fn(),
    stopScheduler: vi.fn(),
    destroy: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  };
}

export function createMockDatabaseManager() {
  return {
    query: vi.fn().mockReturnValue([]),
    queryOne: vi.fn().mockReturnValue(null),
    execute: vi.fn().mockReturnValue({ changes: 1 }),
    close: vi.fn(),
  };
}

// ============================================================================
// ELECTRON MOCK FACTORIES
// ============================================================================

export function createMockWebContents() {
  return {
    loadURL: vi.fn().mockResolvedValue(undefined),
    on: vi.fn().mockReturnThis(),
    off: vi.fn(),
    destroy: vi.fn(),
    executeJavaScript: vi.fn().mockResolvedValue(undefined),
    canGoBack: vi.fn().mockReturnValue(true),
    canGoForward: vi.fn().mockReturnValue(true),
    goBack: vi.fn(),
    goForward: vi.fn(),
    reload: vi.fn(),
    session: {
      partition: 'persist:test',
      setProxy: vi.fn().mockResolvedValue(undefined),
    },
  };
}

export function createMockBrowserView(webContents = createMockWebContents()) {
  return {
    webContents,
    setBounds: vi.fn(),
    setAutoResize: vi.fn(),
  };
}

export function createMockBrowserWindow() {
  return {
    getBounds: vi.fn().mockReturnValue({ x: 0, y: 0, width: 1200, height: 800 }),
    addBrowserView: vi.fn(),
    removeBrowserView: vi.fn(),
    on: vi.fn(),
    webContents: createMockWebContents(),
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function createValidUUID(): string {
  return `00000000-0000-4000-a000-${String(Date.now()).slice(-12)}`;
}

export function createInvalidUUID(): string {
  return 'not-a-valid-uuid';
}

export function resetFactoryCounters(): void {
  proxyCounter = 0;
  tabCounter = 0;
  sessionCounter = 0;
  automationSessionCounter = 0;
  searchTaskCounter = 0;
}

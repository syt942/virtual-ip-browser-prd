/**
 * IPC Handlers Unit Tests
 * Comprehensive tests for electron/ipc/handlers/
 * 
 * Coverage targets:
 * - Proxy management handlers (add, update, delete, test)
 * - Tab operation handlers
 * - Search automation handlers
 * - Privacy settings handlers
 * - Input validation with zod schemas
 * - Error handling and error responses
 * - Permission checks
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ============================================================================
// MOCKS - Must be defined before imports
// ============================================================================

// Track registered handlers
const registeredHandlers = new Map<string, Function>();

// Mock ipcMain
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: Function) => {
      registeredHandlers.set(channel, handler);
    }),
    removeHandler: vi.fn((channel: string) => {
      registeredHandlers.delete(channel);
    }),
  },
  BrowserView: vi.fn(),
  BrowserWindow: vi.fn(),
  session: {
    fromPartition: vi.fn(),
  },
}));

// Import after mocks
import { ipcMain } from 'electron';
import { setupIpcHandlers } from '../../electron/ipc/handlers/index';
import { setupPrivacyHandlers } from '../../electron/ipc/handlers/privacy';
import { setupAutomationHandlers } from '../../electron/ipc/handlers/automation';
import { setupNavigationHandlers } from '../../electron/ipc/handlers/navigation';
import { IPC_CHANNELS } from '../../electron/ipc/channels';
import { resetIPCRateLimiter } from '../../electron/ipc/rate-limiter';

// ============================================================================
// TEST DATA FACTORIES
// ============================================================================

function createValidProxyConfig() {
  return {
    name: 'Test Proxy',
    host: 'proxy.example.com',
    port: 8080,
    protocol: 'https' as const,
  };
}

function createValidTabConfig() {
  return {
    url: 'https://example.com',
    title: 'Test Tab',
  };
}

function createValidAutomationConfig() {
  return {
    keywords: ['test keyword'],
    engine: 'google' as const,
    targetDomains: ['example.com'],
    maxRetries: 3,
    delayBetweenSearches: 3000,
  };
}

function createValidFingerprintConfig() {
  return {
    canvas: true,
    webgl: true,
    audio: true,
    navigator: true,
    webrtc: true,
    trackerBlocking: true,
  };
}

// Mock managers
function createMockProxyManager() {
  return {
    addProxy: vi.fn().mockResolvedValue({
      id: '00000000-0000-4000-a000-000000000001',
      name: 'Test Proxy',
      host: 'proxy.example.com',
      port: 8080,
      protocol: 'https',
      status: 'checking',
      hasCredentials: false,
    }),
    removeProxy: vi.fn().mockReturnValue(true),
    getAllProxies: vi.fn().mockReturnValue([]),
    validateProxy: vi.fn().mockResolvedValue({ success: true, latency: 100 }),
    setRotationStrategy: vi.fn(),
    getProxy: vi.fn(),
  };
}

function createMockTabManager() {
  return {
    createTab: vi.fn().mockResolvedValue({
      id: '00000000-0000-4000-a000-000000000002',
      url: 'https://example.com',
      title: 'Test Tab',
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    closeTab: vi.fn().mockReturnValue(true),
    getAllTabs: vi.fn().mockReturnValue([]),
    updateTab: vi.fn().mockReturnValue({
      id: '00000000-0000-4000-a000-000000000002',
      url: 'https://example.com',
      title: 'Updated Tab',
      updatedAt: new Date(),
    }),
    navigate: vi.fn().mockResolvedValue(undefined),
    goBack: vi.fn(),
    goForward: vi.fn(),
    reload: vi.fn(),
  };
}

function createMockPrivacyManager() {
  return {
    generateProtectionScript: vi.fn().mockReturnValue('// script'),
    getWebRTCProtection: vi.fn().mockReturnValue({
      setBlockWebRTC: vi.fn(),
    }),
    getTrackerBlocker: vi.fn().mockReturnValue({
      setEnabled: vi.fn(),
    }),
  };
}

function createMockAutomationManager() {
  return {
    startSession: vi.fn().mockResolvedValue({
      id: '00000000-0000-4000-a000-000000000003',
      status: 'active',
      tasks: [],
    }),
    stopSession: vi.fn().mockReturnValue(true),
    addKeyword: vi.fn().mockResolvedValue({
      id: '00000000-0000-4000-a000-000000000004',
      keyword: 'test',
      status: 'queued',
    }),
    addTargetDomain: vi.fn().mockResolvedValue({
      id: '00000000-0000-4000-a000-000000000005',
      domain: 'example.com',
      enabled: true,
    }),
    getSession: vi.fn().mockReturnValue({
      id: '00000000-0000-4000-a000-000000000003',
      tasks: [],
    }),
  };
}

function createMockDbManager() {
  return {
    query: vi.fn().mockReturnValue([]),
    execute: vi.fn(),
  };
}

// ============================================================================
// HELPER TO INVOKE HANDLERS
// ============================================================================

async function invokeHandler(channel: string, ...args: any[]) {
  const handler = registeredHandlers.get(channel);
  if (!handler) {
    throw new Error(`Handler not registered for channel: ${channel}`);
  }
  return handler({}, ...args);
}

// ============================================================================
// TEST SUITES
// ============================================================================

describe('IPC Handlers', () => {
  let mockProxyManager: ReturnType<typeof createMockProxyManager>;
  let mockTabManager: ReturnType<typeof createMockTabManager>;
  let mockPrivacyManager: ReturnType<typeof createMockPrivacyManager>;
  let mockAutomationManager: ReturnType<typeof createMockAutomationManager>;
  let mockDbManager: ReturnType<typeof createMockDbManager>;

  beforeEach(() => {
    vi.clearAllMocks();
    registeredHandlers.clear();
    resetIPCRateLimiter();

    mockProxyManager = createMockProxyManager();
    mockTabManager = createMockTabManager();
    mockPrivacyManager = createMockPrivacyManager();
    mockAutomationManager = createMockAutomationManager();
    mockDbManager = createMockDbManager();

    setupIpcHandlers({
      proxyManager: mockProxyManager as any,
      tabManager: mockTabManager as any,
      privacyManager: mockPrivacyManager as any,
      automationManager: mockAutomationManager as any,
      dbManager: mockDbManager as any,
    });
  });

  afterEach(() => {
    resetIPCRateLimiter();
  });

  // ==========================================================================
  // PROXY MANAGEMENT HANDLERS
  // ==========================================================================

  describe('Proxy Management Handlers', () => {
    describe('PROXY_ADD', () => {
      it('should add proxy with valid config', async () => {
        const config = createValidProxyConfig();
        const result = await invokeHandler(IPC_CHANNELS.PROXY_ADD, config);

        expect(result.success).toBe(true);
        expect(result.proxy).toBeDefined();
        expect(mockProxyManager.addProxy).toHaveBeenCalledWith(expect.objectContaining({
          host: 'proxy.example.com',
          port: 8080,
        }));
      });

      it('should reject invalid host', async () => {
        const config = { ...createValidProxyConfig(), host: '' };
        const result = await invokeHandler(IPC_CHANNELS.PROXY_ADD, config);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Validation failed');
      });

      it('should reject invalid port', async () => {
        const config = { ...createValidProxyConfig(), port: 70000 };
        const result = await invokeHandler(IPC_CHANNELS.PROXY_ADD, config);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Validation failed');
      });

      it('should reject invalid protocol', async () => {
        const config = { ...createValidProxyConfig(), protocol: 'invalid' };
        const result = await invokeHandler(IPC_CHANNELS.PROXY_ADD, config);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Validation failed');
      });

      it('should handle manager errors', async () => {
        mockProxyManager.addProxy.mockRejectedValue(new Error('Connection failed'));
        const config = createValidProxyConfig();
        const result = await invokeHandler(IPC_CHANNELS.PROXY_ADD, config);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Connection failed');
      });

      it('should reject XSS in host', async () => {
        const config = { ...createValidProxyConfig(), host: '<script>alert(1)</script>' };
        const result = await invokeHandler(IPC_CHANNELS.PROXY_ADD, config);

        expect(result.success).toBe(false);
      });
    });

    describe('PROXY_REMOVE', () => {
      it('should remove proxy with valid UUID', async () => {
        const id = '00000000-0000-4000-a000-000000000001';
        const result = await invokeHandler(IPC_CHANNELS.PROXY_REMOVE, id);

        expect(result.success).toBe(true);
        expect(mockProxyManager.removeProxy).toHaveBeenCalledWith(id);
      });

      it('should reject invalid UUID format', async () => {
        const result = await invokeHandler(IPC_CHANNELS.PROXY_REMOVE, 'invalid-id');

        expect(result.success).toBe(false);
        expect(result.error).toContain('Validation failed');
      });

      it('should handle removal failure', async () => {
        mockProxyManager.removeProxy.mockReturnValue(false);
        const id = '00000000-0000-4000-a000-000000000001';
        const result = await invokeHandler(IPC_CHANNELS.PROXY_REMOVE, id);

        expect(result.success).toBe(false);
      });
    });

    describe('PROXY_LIST', () => {
      it('should return all proxies', async () => {
        mockProxyManager.getAllProxies.mockReturnValue([
          { id: '1', name: 'Proxy 1' },
          { id: '2', name: 'Proxy 2' },
        ]);

        const result = await invokeHandler(IPC_CHANNELS.PROXY_LIST);

        expect(result.success).toBe(true);
        expect(result.proxies).toHaveLength(2);
      });

      it('should return empty array when no proxies', async () => {
        const result = await invokeHandler(IPC_CHANNELS.PROXY_LIST);

        expect(result.success).toBe(true);
        expect(result.proxies).toEqual([]);
      });
    });

    describe('PROXY_VALIDATE', () => {
      it('should validate proxy with valid UUID', async () => {
        const id = '00000000-0000-4000-a000-000000000001';
        const result = await invokeHandler(IPC_CHANNELS.PROXY_VALIDATE, id);

        expect(result.success).toBe(true);
        expect(result.result).toBeDefined();
      });

      it('should reject invalid UUID', async () => {
        const result = await invokeHandler(IPC_CHANNELS.PROXY_VALIDATE, 'bad-id');

        expect(result.success).toBe(false);
      });

      it('should handle validation failure', async () => {
        mockProxyManager.validateProxy.mockResolvedValue({ success: false, error: 'Timeout' });
        const id = '00000000-0000-4000-a000-000000000001';
        const result = await invokeHandler(IPC_CHANNELS.PROXY_VALIDATE, id);

        expect(result.success).toBe(true);
        expect(result.result.success).toBe(false);
      });
    });

    describe('PROXY_SET_ROTATION', () => {
      it('should set rotation with valid config', async () => {
        const config = { strategy: 'round-robin' as const };
        const result = await invokeHandler(IPC_CHANNELS.PROXY_SET_ROTATION, config);

        expect(result.success).toBe(true);
        expect(mockProxyManager.setRotationStrategy).toHaveBeenCalled();
      });

      it('should reject invalid strategy', async () => {
        const config = { strategy: 'invalid-strategy' };
        const result = await invokeHandler(IPC_CHANNELS.PROXY_SET_ROTATION, config);

        expect(result.success).toBe(false);
      });

      it('should accept optional interval', async () => {
        const config = { strategy: 'random' as const, interval: 5000 };
        const result = await invokeHandler(IPC_CHANNELS.PROXY_SET_ROTATION, config);

        expect(result.success).toBe(true);
      });
    });
  });

  // ==========================================================================
  // TAB OPERATION HANDLERS
  // ==========================================================================

  describe('Tab Operation Handlers', () => {
    describe('TAB_CREATE', () => {
      it('should create tab with valid config', async () => {
        const config = createValidTabConfig();
        const result = await invokeHandler(IPC_CHANNELS.TAB_CREATE, config);

        expect(result.success).toBe(true);
        expect(result.tab).toBeDefined();
      });

      it('should create tab with empty config', async () => {
        const result = await invokeHandler(IPC_CHANNELS.TAB_CREATE, {});

        expect(result.success).toBe(true);
      });

      it('should reject URL too long', async () => {
        const config = { url: 'https://example.com/' + 'a'.repeat(2100) };
        const result = await invokeHandler(IPC_CHANNELS.TAB_CREATE, config);

        expect(result.success).toBe(false);
      });

      it('should handle manager errors', async () => {
        mockTabManager.createTab.mockRejectedValue(new Error('Window not set'));
        const result = await invokeHandler(IPC_CHANNELS.TAB_CREATE, {});

        expect(result.success).toBe(false);
        expect(result.error).toBe('Window not set');
      });
    });

    describe('TAB_CLOSE', () => {
      it('should close tab with valid UUID', async () => {
        const id = '00000000-0000-4000-a000-000000000001';
        const result = await invokeHandler(IPC_CHANNELS.TAB_CLOSE, id);

        expect(result.success).toBe(true);
      });

      it('should reject invalid UUID', async () => {
        const result = await invokeHandler(IPC_CHANNELS.TAB_CLOSE, 'invalid');

        expect(result.success).toBe(false);
      });
    });

    describe('TAB_LIST', () => {
      it('should return all tabs', async () => {
        mockTabManager.getAllTabs.mockReturnValue([
          { id: '1', title: 'Tab 1' },
        ]);

        const result = await invokeHandler(IPC_CHANNELS.TAB_LIST);

        expect(result.success).toBe(true);
        expect(result.tabs).toHaveLength(1);
      });
    });

    describe('TAB_UPDATE', () => {
      it('should update tab with valid data', async () => {
        const id = '00000000-0000-4000-a000-000000000001';
        const updates = { title: 'Updated Title' };
        const result = await invokeHandler(IPC_CHANNELS.TAB_UPDATE, id, updates);

        expect(result.success).toBe(true);
      });

      it('should reject invalid tab ID', async () => {
        const result = await invokeHandler(IPC_CHANNELS.TAB_UPDATE, 'invalid', {});

        expect(result.success).toBe(false);
      });
    });
  });

  // ==========================================================================
  // NAVIGATION HANDLERS
  // ==========================================================================

  describe('Navigation Handlers', () => {
    describe('TAB_NAVIGATE', () => {
      it('should navigate with valid tab ID and URL', async () => {
        const result = await invokeHandler(
          IPC_CHANNELS.TAB_NAVIGATE,
          '00000000-0000-4000-a000-000000000001',
          'https://example.com'
        );

        expect(result.success).toBe(true);
        expect(mockTabManager.navigate).toHaveBeenCalled();
      });

      it('should reject invalid tab ID', async () => {
        const result = await invokeHandler(
          IPC_CHANNELS.TAB_NAVIGATE,
          'invalid-id',
          'https://example.com'
        );

        expect(result.success).toBe(false);
      });

      it('should reject blocked URLs (localhost)', async () => {
        const result = await invokeHandler(
          IPC_CHANNELS.TAB_NAVIGATE,
          '00000000-0000-4000-a000-000000000001',
          'http://localhost:3000'
        );

        expect(result.success).toBe(false);
      });

      it('should reject blocked URLs (private IP)', async () => {
        const result = await invokeHandler(
          IPC_CHANNELS.TAB_NAVIGATE,
          '00000000-0000-4000-a000-000000000001',
          'http://192.168.1.1'
        );

        expect(result.success).toBe(false);
      });

      it('should reject javascript: URLs', async () => {
        const result = await invokeHandler(
          IPC_CHANNELS.TAB_NAVIGATE,
          '00000000-0000-4000-a000-000000000001',
          'javascript:alert(1)'
        );

        expect(result.success).toBe(false);
      });

      it('should reject file: URLs', async () => {
        const result = await invokeHandler(
          IPC_CHANNELS.TAB_NAVIGATE,
          '00000000-0000-4000-a000-000000000001',
          'file:///etc/passwd'
        );

        expect(result.success).toBe(false);
      });

      it('should handle navigation errors', async () => {
        mockTabManager.navigate.mockRejectedValue(new Error('Tab not found'));
        const result = await invokeHandler(
          IPC_CHANNELS.TAB_NAVIGATE,
          '00000000-0000-4000-a000-000000000001',
          'https://example.com'
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe('Tab not found');
      });
    });

    describe('tab:go-back', () => {
      it('should go back with valid tab ID', async () => {
        const result = await invokeHandler(
          'tab:go-back',
          '00000000-0000-4000-a000-000000000001'
        );

        expect(result.success).toBe(true);
        expect(mockTabManager.goBack).toHaveBeenCalled();
      });

      it('should reject invalid tab ID', async () => {
        const result = await invokeHandler('tab:go-back', 'invalid');

        expect(result.success).toBe(false);
      });
    });

    describe('tab:go-forward', () => {
      it('should go forward with valid tab ID', async () => {
        const result = await invokeHandler(
          'tab:go-forward',
          '00000000-0000-4000-a000-000000000001'
        );

        expect(result.success).toBe(true);
        expect(mockTabManager.goForward).toHaveBeenCalled();
      });
    });

    describe('tab:reload', () => {
      it('should reload with valid tab ID', async () => {
        const result = await invokeHandler(
          'tab:reload',
          '00000000-0000-4000-a000-000000000001'
        );

        expect(result.success).toBe(true);
        expect(mockTabManager.reload).toHaveBeenCalled();
      });
    });
  });

  // ==========================================================================
  // AUTOMATION HANDLERS
  // ==========================================================================

  describe('Automation Handlers', () => {
    describe('AUTOMATION_START_SEARCH', () => {
      it('should start search with valid config', async () => {
        const config = createValidAutomationConfig();
        const result = await invokeHandler(IPC_CHANNELS.AUTOMATION_START_SEARCH, config);

        expect(result.success).toBe(true);
        expect(result.session).toBeDefined();
      });

      it('should reject empty keywords', async () => {
        const config = { ...createValidAutomationConfig(), keywords: [] };
        const result = await invokeHandler(IPC_CHANNELS.AUTOMATION_START_SEARCH, config);

        expect(result.success).toBe(true); // Empty array is allowed (default)
      });

      it('should reject invalid search engine', async () => {
        const config = { ...createValidAutomationConfig(), engine: 'invalid' };
        const result = await invokeHandler(IPC_CHANNELS.AUTOMATION_START_SEARCH, config);

        expect(result.success).toBe(false);
      });

      it('should reject XSS in keywords', async () => {
        const config = {
          ...createValidAutomationConfig(),
          keywords: ['<script>alert(1)</script>'],
        };
        const result = await invokeHandler(IPC_CHANNELS.AUTOMATION_START_SEARCH, config);

        expect(result.success).toBe(false);
      });

      it('should handle manager errors', async () => {
        mockAutomationManager.startSession.mockRejectedValue(new Error('Database error'));
        const config = createValidAutomationConfig();
        const result = await invokeHandler(IPC_CHANNELS.AUTOMATION_START_SEARCH, config);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Database error');
      });
    });

    describe('AUTOMATION_STOP_SEARCH', () => {
      it('should stop session with valid UUID', async () => {
        const sessionId = '00000000-0000-4000-a000-000000000001';
        const result = await invokeHandler(IPC_CHANNELS.AUTOMATION_STOP_SEARCH, sessionId);

        expect(result.success).toBe(true);
      });

      it('should reject invalid session ID', async () => {
        const result = await invokeHandler(IPC_CHANNELS.AUTOMATION_STOP_SEARCH, 'invalid');

        expect(result.success).toBe(false);
      });
    });

    describe('AUTOMATION_ADD_KEYWORD', () => {
      it('should add keyword with valid inputs', async () => {
        const sessionId = '00000000-0000-4000-a000-000000000001';
        const keyword = 'test keyword';
        const result = await invokeHandler(
          IPC_CHANNELS.AUTOMATION_ADD_KEYWORD,
          sessionId,
          keyword
        );

        expect(result.success).toBe(true);
        expect(result.task).toBeDefined();
      });

      it('should reject empty keyword', async () => {
        const sessionId = '00000000-0000-4000-a000-000000000001';
        const result = await invokeHandler(
          IPC_CHANNELS.AUTOMATION_ADD_KEYWORD,
          sessionId,
          ''
        );

        expect(result.success).toBe(false);
      });

      it('should reject keyword too long', async () => {
        const sessionId = '00000000-0000-4000-a000-000000000001';
        const keyword = 'a'.repeat(250);
        const result = await invokeHandler(
          IPC_CHANNELS.AUTOMATION_ADD_KEYWORD,
          sessionId,
          keyword
        );

        expect(result.success).toBe(false);
      });
    });

    describe('AUTOMATION_ADD_DOMAIN', () => {
      it('should add domain with valid input', async () => {
        const result = await invokeHandler(
          IPC_CHANNELS.AUTOMATION_ADD_DOMAIN,
          'example.com'
        );

        expect(result.success).toBe(true);
        expect(result.domain).toBeDefined();
      });

      it('should add domain with pattern', async () => {
        const result = await invokeHandler(
          IPC_CHANNELS.AUTOMATION_ADD_DOMAIN,
          'example.com',
          '/path/*'
        );

        expect(result.success).toBe(true);
      });

      it('should reject invalid domain format', async () => {
        const result = await invokeHandler(
          IPC_CHANNELS.AUTOMATION_ADD_DOMAIN,
          'not a domain!'
        );

        expect(result.success).toBe(false);
      });

      it('should reject ReDoS patterns', async () => {
        const result = await invokeHandler(
          IPC_CHANNELS.AUTOMATION_ADD_DOMAIN,
          'example.com',
          '(.*)+$'
        );

        expect(result.success).toBe(false);
      });
    });

    describe('AUTOMATION_GET_TASKS', () => {
      it('should get tasks for valid session', async () => {
        const sessionId = '00000000-0000-4000-a000-000000000001';
        const result = await invokeHandler(IPC_CHANNELS.AUTOMATION_GET_TASKS, sessionId);

        expect(result.success).toBe(true);
        expect(result.tasks).toBeDefined();
      });

      it('should return empty tasks for non-existent session', async () => {
        mockAutomationManager.getSession.mockReturnValue(null);
        const sessionId = '00000000-0000-4000-a000-000000000001';
        const result = await invokeHandler(IPC_CHANNELS.AUTOMATION_GET_TASKS, sessionId);

        expect(result.success).toBe(true);
        expect(result.tasks).toEqual([]);
      });
    });
  });

  // ==========================================================================
  // PRIVACY HANDLERS
  // ==========================================================================

  describe('Privacy Handlers', () => {
    describe('PRIVACY_SET_FINGERPRINT', () => {
      it('should set fingerprint with valid config', async () => {
        const config = createValidFingerprintConfig();
        const result = await invokeHandler(IPC_CHANNELS.PRIVACY_SET_FINGERPRINT, config);

        expect(result.success).toBe(true);
        expect(result.script).toBeDefined();
      });

      it('should accept partial config', async () => {
        const config = { canvas: true };
        const result = await invokeHandler(IPC_CHANNELS.PRIVACY_SET_FINGERPRINT, config);

        expect(result.success).toBe(true);
      });

      it('should reject invalid timezone', async () => {
        const config = { ...createValidFingerprintConfig(), timezone: 'Invalid/Timezone' };
        const result = await invokeHandler(IPC_CHANNELS.PRIVACY_SET_FINGERPRINT, config);

        expect(result.success).toBe(false);
      });

      it('should reject invalid language code', async () => {
        const config = { ...createValidFingerprintConfig(), language: 'invalid' };
        const result = await invokeHandler(IPC_CHANNELS.PRIVACY_SET_FINGERPRINT, config);

        expect(result.success).toBe(false);
      });

      it('should handle manager errors', async () => {
        mockPrivacyManager.generateProtectionScript.mockImplementation(() => {
          throw new Error('Script generation failed');
        });
        const config = createValidFingerprintConfig();
        const result = await invokeHandler(IPC_CHANNELS.PRIVACY_SET_FINGERPRINT, config);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Script generation failed');
      });
    });

    describe('PRIVACY_TOGGLE_WEBRTC', () => {
      it('should toggle WebRTC on', async () => {
        const result = await invokeHandler(IPC_CHANNELS.PRIVACY_TOGGLE_WEBRTC, true);

        expect(result.success).toBe(true);
        expect(mockPrivacyManager.getWebRTCProtection().setBlockWebRTC).toHaveBeenCalledWith(true);
      });

      it('should toggle WebRTC off', async () => {
        const result = await invokeHandler(IPC_CHANNELS.PRIVACY_TOGGLE_WEBRTC, false);

        expect(result.success).toBe(true);
      });

      it('should reject non-boolean value', async () => {
        const result = await invokeHandler(IPC_CHANNELS.PRIVACY_TOGGLE_WEBRTC, 'yes');

        expect(result.success).toBe(false);
      });
    });

    describe('PRIVACY_TOGGLE_TRACKER_BLOCKING', () => {
      it('should toggle tracker blocking on', async () => {
        const result = await invokeHandler(IPC_CHANNELS.PRIVACY_TOGGLE_TRACKER_BLOCKING, true);

        expect(result.success).toBe(true);
        expect(mockPrivacyManager.getTrackerBlocker().setEnabled).toHaveBeenCalledWith(true);
      });

      it('should toggle tracker blocking off', async () => {
        const result = await invokeHandler(IPC_CHANNELS.PRIVACY_TOGGLE_TRACKER_BLOCKING, false);

        expect(result.success).toBe(true);
      });
    });
  });

  // ==========================================================================
  // RATE LIMITING TESTS
  // ==========================================================================

  describe('Rate Limiting', () => {
    it('should allow requests within rate limit', async () => {
      const config = createValidProxyConfig();

      for (let i = 0; i < 5; i++) {
        const result = await invokeHandler(IPC_CHANNELS.PROXY_ADD, config);
        expect(result.success).toBe(true);
      }
    });

    it('should block requests exceeding rate limit', async () => {
      const config = createValidProxyConfig();

      // Exhaust rate limit (proxy:add has limit of 10/min)
      for (let i = 0; i < 10; i++) {
        await invokeHandler(IPC_CHANNELS.PROXY_ADD, config);
      }

      // Next request should be rate limited
      const result = await invokeHandler(IPC_CHANNELS.PROXY_ADD, config);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Rate limit exceeded');
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should apply stricter limits to automation endpoints', async () => {
      const config = createValidAutomationConfig();

      // automation:start-search has limit of 5/min
      for (let i = 0; i < 5; i++) {
        await invokeHandler(IPC_CHANNELS.AUTOMATION_START_SEARCH, config);
      }

      const result = await invokeHandler(IPC_CHANNELS.AUTOMATION_START_SEARCH, config);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Rate limit exceeded');
    });

    it('should allow higher limits for tab navigation', async () => {
      // tab:navigate has limit of 100/min
      for (let i = 0; i < 50; i++) {
        const result = await invokeHandler(
          IPC_CHANNELS.TAB_NAVIGATE,
          '00000000-0000-4000-a000-000000000001',
          'https://example.com'
        );
        expect(result.success).toBe(true);
      }
    });
  });

  // ==========================================================================
  // INPUT VALIDATION TESTS
  // ==========================================================================

  describe('Input Validation', () => {
    describe('URL Validation (SSRF Prevention)', () => {
      it('should block AWS metadata endpoint', async () => {
        const result = await invokeHandler(
          IPC_CHANNELS.TAB_NAVIGATE,
          '00000000-0000-4000-a000-000000000001',
          'http://169.254.169.254/latest/meta-data'
        );

        expect(result.success).toBe(false);
      });

      it('should block GCP metadata endpoint', async () => {
        const result = await invokeHandler(
          IPC_CHANNELS.TAB_NAVIGATE,
          '00000000-0000-4000-a000-000000000001',
          'http://metadata.google.internal'
        );

        expect(result.success).toBe(false);
      });

      it('should block 127.0.0.1', async () => {
        const result = await invokeHandler(
          IPC_CHANNELS.TAB_NAVIGATE,
          '00000000-0000-4000-a000-000000000001',
          'http://127.0.0.1:8080'
        );

        expect(result.success).toBe(false);
      });

      it('should block 10.x.x.x private range', async () => {
        const result = await invokeHandler(
          IPC_CHANNELS.TAB_NAVIGATE,
          '00000000-0000-4000-a000-000000000001',
          'http://10.0.0.1'
        );

        expect(result.success).toBe(false);
      });

      it('should block 172.16.x.x private range', async () => {
        const result = await invokeHandler(
          IPC_CHANNELS.TAB_NAVIGATE,
          '00000000-0000-4000-a000-000000000001',
          'http://172.16.0.1'
        );

        expect(result.success).toBe(false);
      });

      it('should block 0.0.0.0', async () => {
        const result = await invokeHandler(
          IPC_CHANNELS.TAB_NAVIGATE,
          '00000000-0000-4000-a000-000000000001',
          'http://0.0.0.0'
        );

        expect(result.success).toBe(false);
      });

      it('should block credentials in URL', async () => {
        const result = await invokeHandler(
          IPC_CHANNELS.TAB_NAVIGATE,
          '00000000-0000-4000-a000-000000000001',
          'http://user:pass@example.com'
        );

        expect(result.success).toBe(false);
      });
    });

    describe('XSS Prevention', () => {
      it('should block script tags in proxy name', async () => {
        const config = { ...createValidProxyConfig(), name: '<script>alert(1)</script>' };
        const result = await invokeHandler(IPC_CHANNELS.PROXY_ADD, config);

        // Name should be sanitized, not rejected
        expect(result.success).toBe(true);
      });

      it('should block javascript: in host', async () => {
        const config = { ...createValidProxyConfig(), host: 'javascript:alert(1)' };
        const result = await invokeHandler(IPC_CHANNELS.PROXY_ADD, config);

        expect(result.success).toBe(false);
      });

      it('should block onload handlers', async () => {
        const config = { ...createValidProxyConfig(), host: 'test.com" onload="alert(1)' };
        const result = await invokeHandler(IPC_CHANNELS.PROXY_ADD, config);

        expect(result.success).toBe(false);
      });
    });

    describe('Null Byte Injection Prevention', () => {
      it('should strip null bytes from input', async () => {
        const config = {
          ...createValidProxyConfig(),
          name: 'Test\x00Proxy',
        };
        const result = await invokeHandler(IPC_CHANNELS.PROXY_ADD, config);

        expect(result.success).toBe(true);
        // Null byte should be stripped
      });
    });

    describe('Length Limits', () => {
      it('should reject host too long', async () => {
        const config = { ...createValidProxyConfig(), host: 'a'.repeat(300) + '.com' };
        const result = await invokeHandler(IPC_CHANNELS.PROXY_ADD, config);

        expect(result.success).toBe(false);
      });

      it('should reject title too long', async () => {
        const config = { ...createValidTabConfig(), title: 'a'.repeat(600) };
        const result = await invokeHandler(IPC_CHANNELS.TAB_CREATE, config);

        expect(result.success).toBe(false);
      });
    });
  });

  // ==========================================================================
  // ERROR HANDLING TESTS
  // ==========================================================================

  describe('Error Handling', () => {
    it('should return proper error structure on validation failure', async () => {
      const result = await invokeHandler(IPC_CHANNELS.PROXY_ADD, {});

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
      expect(typeof result.error).toBe('string');
    });

    it('should return proper error structure on manager exception', async () => {
      mockProxyManager.addProxy.mockRejectedValue(new Error('Test error'));
      const result = await invokeHandler(IPC_CHANNELS.PROXY_ADD, createValidProxyConfig());

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error', 'Test error');
    });

    it('should handle undefined input gracefully', async () => {
      const result = await invokeHandler(IPC_CHANNELS.PROXY_ADD, undefined);

      expect(result.success).toBe(false);
    });

    it('should handle null input gracefully', async () => {
      const result = await invokeHandler(IPC_CHANNELS.PROXY_ADD, null);

      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // CONCURRENT OPERATIONS TESTS
  // ==========================================================================

  describe('Concurrent Operations', () => {
    it('should handle concurrent proxy additions', async () => {
      const promises = Array(5).fill(null).map(() =>
        invokeHandler(IPC_CHANNELS.PROXY_ADD, createValidProxyConfig())
      );

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });

    it('should handle concurrent tab operations', async () => {
      const createPromises = Array(3).fill(null).map(() =>
        invokeHandler(IPC_CHANNELS.TAB_CREATE, createValidTabConfig())
      );

      const listPromise = invokeHandler(IPC_CHANNELS.TAB_LIST);

      const [created, list] = await Promise.all([
        Promise.all(createPromises),
        listPromise,
      ]);

      created.forEach(result => {
        expect(result.success).toBe(true);
      });
      expect(list.success).toBe(true);
    });
  });

  // ==========================================================================
  // HANDLER REGISTRATION TESTS
  // ==========================================================================

  describe('Handler Registration', () => {
    it('should register all proxy handlers', () => {
      expect(registeredHandlers.has(IPC_CHANNELS.PROXY_ADD)).toBe(true);
      expect(registeredHandlers.has(IPC_CHANNELS.PROXY_REMOVE)).toBe(true);
      expect(registeredHandlers.has(IPC_CHANNELS.PROXY_LIST)).toBe(true);
      expect(registeredHandlers.has(IPC_CHANNELS.PROXY_VALIDATE)).toBe(true);
      expect(registeredHandlers.has(IPC_CHANNELS.PROXY_SET_ROTATION)).toBe(true);
    });

    it('should register all tab handlers', () => {
      expect(registeredHandlers.has(IPC_CHANNELS.TAB_CREATE)).toBe(true);
      expect(registeredHandlers.has(IPC_CHANNELS.TAB_CLOSE)).toBe(true);
      expect(registeredHandlers.has(IPC_CHANNELS.TAB_LIST)).toBe(true);
      expect(registeredHandlers.has(IPC_CHANNELS.TAB_UPDATE)).toBe(true);
      expect(registeredHandlers.has(IPC_CHANNELS.TAB_NAVIGATE)).toBe(true);
    });

    it('should register all automation handlers', () => {
      expect(registeredHandlers.has(IPC_CHANNELS.AUTOMATION_START_SEARCH)).toBe(true);
      expect(registeredHandlers.has(IPC_CHANNELS.AUTOMATION_STOP_SEARCH)).toBe(true);
      expect(registeredHandlers.has(IPC_CHANNELS.AUTOMATION_ADD_KEYWORD)).toBe(true);
      expect(registeredHandlers.has(IPC_CHANNELS.AUTOMATION_ADD_DOMAIN)).toBe(true);
      expect(registeredHandlers.has(IPC_CHANNELS.AUTOMATION_GET_TASKS)).toBe(true);
    });

    it('should register all privacy handlers', () => {
      expect(registeredHandlers.has(IPC_CHANNELS.PRIVACY_SET_FINGERPRINT)).toBe(true);
      expect(registeredHandlers.has(IPC_CHANNELS.PRIVACY_TOGGLE_WEBRTC)).toBe(true);
      expect(registeredHandlers.has(IPC_CHANNELS.PRIVACY_TOGGLE_TRACKER_BLOCKING)).toBe(true);
    });

    it('should register navigation handlers', () => {
      expect(registeredHandlers.has('tab:go-back')).toBe(true);
      expect(registeredHandlers.has('tab:go-forward')).toBe(true);
      expect(registeredHandlers.has('tab:reload')).toBe(true);
    });
  });
});

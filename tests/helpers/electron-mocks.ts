/**
 * Electron Mocks
 * Mock implementations of Electron APIs for testing
 */

import { vi } from 'vitest';

// ============================================================================
// BROWSER VIEW MOCK
// ============================================================================

export interface MockBrowserViewOptions {
  webPreferences?: {
    nodeIntegration?: boolean;
    contextIsolation?: boolean;
    preload?: string;
    partition?: string;
  };
}

export interface MockWebContents {
  id: number;
  loadURL: ReturnType<typeof vi.fn>;
  goBack: ReturnType<typeof vi.fn>;
  goForward: ReturnType<typeof vi.fn>;
  reload: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  getURL: ReturnType<typeof vi.fn>;
  getTitle: ReturnType<typeof vi.fn>;
  canGoBack: ReturnType<typeof vi.fn>;
  canGoForward: ReturnType<typeof vi.fn>;
  executeJavaScript: ReturnType<typeof vi.fn>;
  insertCSS: ReturnType<typeof vi.fn>;
  setUserAgent: ReturnType<typeof vi.fn>;
  session: MockSession;
  on: ReturnType<typeof vi.fn>;
  once: ReturnType<typeof vi.fn>;
  removeListener: ReturnType<typeof vi.fn>;
  removeAllListeners: ReturnType<typeof vi.fn>;
  isDestroyed: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
}

export interface MockBrowserView {
  webContents: MockWebContents;
  setBounds: ReturnType<typeof vi.fn>;
  getBounds: ReturnType<typeof vi.fn>;
  setAutoResize: ReturnType<typeof vi.fn>;
  setBackgroundColor: ReturnType<typeof vi.fn>;
}

let webContentsIdCounter = 1;

export function createMockWebContents(): MockWebContents {
  const id = webContentsIdCounter++;
  const eventHandlers: Map<string, Function[]> = new Map();
  
  const mockSession = createMockSession();
  
  return {
    id,
    loadURL: vi.fn().mockResolvedValue(undefined),
    goBack: vi.fn(),
    goForward: vi.fn(),
    reload: vi.fn(),
    stop: vi.fn(),
    getURL: vi.fn().mockReturnValue('https://example.com'),
    getTitle: vi.fn().mockReturnValue('Test Page'),
    canGoBack: vi.fn().mockReturnValue(false),
    canGoForward: vi.fn().mockReturnValue(false),
    executeJavaScript: vi.fn().mockResolvedValue(undefined),
    insertCSS: vi.fn().mockResolvedValue('css-key'),
    setUserAgent: vi.fn(),
    session: mockSession,
    on: vi.fn((event: string, handler: Function) => {
      if (!eventHandlers.has(event)) {
        eventHandlers.set(event, []);
      }
      eventHandlers.get(event)!.push(handler);
      return this;
    }),
    once: vi.fn((event: string, handler: Function) => {
      if (!eventHandlers.has(event)) {
        eventHandlers.set(event, []);
      }
      eventHandlers.get(event)!.push(handler);
      return this;
    }),
    removeListener: vi.fn((event: string, handler: Function) => {
      const handlers = eventHandlers.get(event);
      if (handlers) {
        const idx = handlers.indexOf(handler);
        if (idx > -1) {handlers.splice(idx, 1);}
      }
      return this;
    }),
    removeAllListeners: vi.fn((event?: string) => {
      if (event) {
        eventHandlers.delete(event);
      } else {
        eventHandlers.clear();
      }
      return this;
    }),
    isDestroyed: vi.fn().mockReturnValue(false),
    destroy: vi.fn(),
  };
}

export function createMockBrowserView(options?: MockBrowserViewOptions): MockBrowserView {
  return {
    webContents: createMockWebContents(),
    setBounds: vi.fn(),
    getBounds: vi.fn().mockReturnValue({ x: 0, y: 0, width: 800, height: 600 }),
    setAutoResize: vi.fn(),
    setBackgroundColor: vi.fn(),
  };
}

// ============================================================================
// SESSION MOCK
// ============================================================================

export interface MockSession {
  setProxy: ReturnType<typeof vi.fn>;
  clearStorageData: ReturnType<typeof vi.fn>;
  clearCache: ReturnType<typeof vi.fn>;
  clearAuthCache: ReturnType<typeof vi.fn>;
  getCacheSize: ReturnType<typeof vi.fn>;
  setUserAgent: ReturnType<typeof vi.fn>;
  getUserAgent: ReturnType<typeof vi.fn>;
  setPermissionRequestHandler: ReturnType<typeof vi.fn>;
  setPermissionCheckHandler: ReturnType<typeof vi.fn>;
  webRequest: MockWebRequest;
  cookies: MockCookies;
  protocol: MockProtocol;
}

export interface MockWebRequest {
  onBeforeRequest: ReturnType<typeof vi.fn>;
  onBeforeSendHeaders: ReturnType<typeof vi.fn>;
  onSendHeaders: ReturnType<typeof vi.fn>;
  onHeadersReceived: ReturnType<typeof vi.fn>;
  onResponseStarted: ReturnType<typeof vi.fn>;
  onCompleted: ReturnType<typeof vi.fn>;
  onErrorOccurred: ReturnType<typeof vi.fn>;
}

export interface MockCookies {
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
  flushStore: ReturnType<typeof vi.fn>;
}

export interface MockProtocol {
  registerFileProtocol: ReturnType<typeof vi.fn>;
  registerHttpProtocol: ReturnType<typeof vi.fn>;
  unregisterProtocol: ReturnType<typeof vi.fn>;
  isProtocolRegistered: ReturnType<typeof vi.fn>;
}

export function createMockWebRequest(): MockWebRequest {
  return {
    onBeforeRequest: vi.fn(),
    onBeforeSendHeaders: vi.fn(),
    onSendHeaders: vi.fn(),
    onHeadersReceived: vi.fn(),
    onResponseStarted: vi.fn(),
    onCompleted: vi.fn(),
    onErrorOccurred: vi.fn(),
  };
}

export function createMockCookies(): MockCookies {
  return {
    get: vi.fn().mockResolvedValue([]),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    flushStore: vi.fn().mockResolvedValue(undefined),
  };
}

export function createMockProtocol(): MockProtocol {
  return {
    registerFileProtocol: vi.fn().mockReturnValue(true),
    registerHttpProtocol: vi.fn().mockReturnValue(true),
    unregisterProtocol: vi.fn().mockReturnValue(true),
    isProtocolRegistered: vi.fn().mockReturnValue(false),
  };
}

export function createMockSession(): MockSession {
  return {
    setProxy: vi.fn().mockResolvedValue(undefined),
    clearStorageData: vi.fn().mockResolvedValue(undefined),
    clearCache: vi.fn().mockResolvedValue(undefined),
    clearAuthCache: vi.fn().mockResolvedValue(undefined),
    getCacheSize: vi.fn().mockResolvedValue(0),
    setUserAgent: vi.fn(),
    getUserAgent: vi.fn().mockReturnValue('Mozilla/5.0 (Test)'),
    setPermissionRequestHandler: vi.fn(),
    setPermissionCheckHandler: vi.fn(),
    webRequest: createMockWebRequest(),
    cookies: createMockCookies(),
    protocol: createMockProtocol(),
  };
}

// ============================================================================
// BROWSER WINDOW MOCK
// ============================================================================

export interface MockBrowserWindow {
  id: number;
  webContents: MockWebContents;
  loadURL: ReturnType<typeof vi.fn>;
  loadFile: ReturnType<typeof vi.fn>;
  show: ReturnType<typeof vi.fn>;
  hide: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  focus: ReturnType<typeof vi.fn>;
  blur: ReturnType<typeof vi.fn>;
  isFocused: ReturnType<typeof vi.fn>;
  isDestroyed: ReturnType<typeof vi.fn>;
  isVisible: ReturnType<typeof vi.fn>;
  setBounds: ReturnType<typeof vi.fn>;
  getBounds: ReturnType<typeof vi.fn>;
  setContentBounds: ReturnType<typeof vi.fn>;
  getContentBounds: ReturnType<typeof vi.fn>;
  setSize: ReturnType<typeof vi.fn>;
  getSize: ReturnType<typeof vi.fn>;
  setTitle: ReturnType<typeof vi.fn>;
  getTitle: ReturnType<typeof vi.fn>;
  addBrowserView: ReturnType<typeof vi.fn>;
  removeBrowserView: ReturnType<typeof vi.fn>;
  setBrowserView: ReturnType<typeof vi.fn>;
  getBrowserView: ReturnType<typeof vi.fn>;
  getBrowserViews: ReturnType<typeof vi.fn>;
  setTopBrowserView: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  once: ReturnType<typeof vi.fn>;
  removeListener: ReturnType<typeof vi.fn>;
  removeAllListeners: ReturnType<typeof vi.fn>;
}

let windowIdCounter = 1;

export function createMockBrowserWindow(): MockBrowserWindow {
  const id = windowIdCounter++;
  const browserViews: MockBrowserView[] = [];
  
  return {
    id,
    webContents: createMockWebContents(),
    loadURL: vi.fn().mockResolvedValue(undefined),
    loadFile: vi.fn().mockResolvedValue(undefined),
    show: vi.fn(),
    hide: vi.fn(),
    close: vi.fn(),
    focus: vi.fn(),
    blur: vi.fn(),
    isFocused: vi.fn().mockReturnValue(true),
    isDestroyed: vi.fn().mockReturnValue(false),
    isVisible: vi.fn().mockReturnValue(true),
    setBounds: vi.fn(),
    getBounds: vi.fn().mockReturnValue({ x: 0, y: 0, width: 1200, height: 800 }),
    setContentBounds: vi.fn(),
    getContentBounds: vi.fn().mockReturnValue({ x: 0, y: 0, width: 1200, height: 800 }),
    setSize: vi.fn(),
    getSize: vi.fn().mockReturnValue([1200, 800]),
    setTitle: vi.fn(),
    getTitle: vi.fn().mockReturnValue('Virtual IP Browser'),
    addBrowserView: vi.fn((view: MockBrowserView) => {
      browserViews.push(view);
    }),
    removeBrowserView: vi.fn((view: MockBrowserView) => {
      const idx = browserViews.indexOf(view);
      if (idx > -1) {browserViews.splice(idx, 1);}
    }),
    setBrowserView: vi.fn((view: MockBrowserView | null) => {
      browserViews.length = 0;
      if (view) {browserViews.push(view);}
    }),
    getBrowserView: vi.fn(() => browserViews[0] || null),
    getBrowserViews: vi.fn(() => [...browserViews]),
    setTopBrowserView: vi.fn(),
    on: vi.fn().mockReturnThis(),
    once: vi.fn().mockReturnThis(),
    removeListener: vi.fn().mockReturnThis(),
    removeAllListeners: vi.fn().mockReturnThis(),
  };
}

// ============================================================================
// IPC MOCK
// ============================================================================

export interface MockIpcMain {
  handle: ReturnType<typeof vi.fn>;
  handleOnce: ReturnType<typeof vi.fn>;
  removeHandler: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  once: ReturnType<typeof vi.fn>;
  removeListener: ReturnType<typeof vi.fn>;
  removeAllListeners: ReturnType<typeof vi.fn>;
}

export interface MockIpcRenderer {
  invoke: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
  sendSync: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  once: ReturnType<typeof vi.fn>;
  removeListener: ReturnType<typeof vi.fn>;
  removeAllListeners: ReturnType<typeof vi.fn>;
}

export function createMockIpcMain(): MockIpcMain {
  const handlers = new Map<string, Function>();
  
  return {
    handle: vi.fn((channel: string, handler: Function) => {
      handlers.set(channel, handler);
    }),
    handleOnce: vi.fn((channel: string, handler: Function) => {
      handlers.set(channel, handler);
    }),
    removeHandler: vi.fn((channel: string) => {
      handlers.delete(channel);
    }),
    on: vi.fn().mockReturnThis(),
    once: vi.fn().mockReturnThis(),
    removeListener: vi.fn().mockReturnThis(),
    removeAllListeners: vi.fn().mockReturnThis(),
  };
}

export function createMockIpcRenderer(): MockIpcRenderer {
  return {
    invoke: vi.fn().mockResolvedValue({ success: true }),
    send: vi.fn(),
    sendSync: vi.fn().mockReturnValue(null),
    on: vi.fn().mockReturnThis(),
    once: vi.fn().mockReturnThis(),
    removeListener: vi.fn().mockReturnThis(),
    removeAllListeners: vi.fn().mockReturnThis(),
  };
}

// ============================================================================
// APP MOCK
// ============================================================================

export interface MockApp {
  getPath: ReturnType<typeof vi.fn>;
  getAppPath: ReturnType<typeof vi.fn>;
  getName: ReturnType<typeof vi.fn>;
  getVersion: ReturnType<typeof vi.fn>;
  isReady: ReturnType<typeof vi.fn>;
  whenReady: ReturnType<typeof vi.fn>;
  quit: ReturnType<typeof vi.fn>;
  exit: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  once: ReturnType<typeof vi.fn>;
}

export function createMockApp(): MockApp {
  return {
    getPath: vi.fn((name: string) => {
      const paths: Record<string, string> = {
        userData: '/tmp/test-user-data',
        appData: '/tmp/test-app-data',
        temp: '/tmp',
        home: '/home/test',
        desktop: '/home/test/Desktop',
        documents: '/home/test/Documents',
        downloads: '/home/test/Downloads',
      };
      return paths[name] || `/tmp/test-${name}`;
    }),
    getAppPath: vi.fn().mockReturnValue('/app'),
    getName: vi.fn().mockReturnValue('Virtual IP Browser'),
    getVersion: vi.fn().mockReturnValue('1.2.1'),
    isReady: vi.fn().mockReturnValue(true),
    whenReady: vi.fn().mockResolvedValue(undefined),
    quit: vi.fn(),
    exit: vi.fn(),
    on: vi.fn().mockReturnThis(),
    once: vi.fn().mockReturnThis(),
  };
}

// ============================================================================
// RESET HELPERS
// ============================================================================

/**
 * Reset all Electron mock counters
 */
export function resetElectronMocks(): void {
  webContentsIdCounter = 1;
  windowIdCounter = 1;
}

/**
 * Setup global Electron mocks
 */
export function setupElectronMocks() {
  const mockApp = createMockApp();
  const mockIpcMain = createMockIpcMain();
  const mockIpcRenderer = createMockIpcRenderer();
  
  return {
    app: mockApp,
    ipcMain: mockIpcMain,
    ipcRenderer: mockIpcRenderer,
    BrowserWindow: vi.fn(() => createMockBrowserWindow()),
    BrowserView: vi.fn(() => createMockBrowserView()),
    session: {
      defaultSession: createMockSession(),
      fromPartition: vi.fn(() => createMockSession()),
    },
  };
}

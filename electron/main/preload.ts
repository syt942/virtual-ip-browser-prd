/**
 * Preload Script
 * Context bridge for secure IPC communication
 * Implements strict channel whitelisting for security
 */

import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../ipc/channels';

// ============================================================================
// SECURITY: IPC Channel Whitelists
// ============================================================================

/**
 * Whitelist of allowed IPC invoke channels
 * Only these channels can be invoked from the renderer process
 */
const IPC_INVOKE_WHITELIST = new Set([
  IPC_CHANNELS.PROXY_ADD,
  IPC_CHANNELS.PROXY_REMOVE,
  IPC_CHANNELS.PROXY_UPDATE,
  IPC_CHANNELS.PROXY_LIST,
  IPC_CHANNELS.PROXY_VALIDATE,
  IPC_CHANNELS.PROXY_SET_ROTATION,
  IPC_CHANNELS.TAB_CREATE,
  IPC_CHANNELS.TAB_CLOSE,
  IPC_CHANNELS.TAB_UPDATE,
  IPC_CHANNELS.TAB_LIST,
  IPC_CHANNELS.TAB_NAVIGATE,
  'tab:go-back',
  'tab:go-forward',
  'tab:reload',
  IPC_CHANNELS.PRIVACY_SET_FINGERPRINT,
  IPC_CHANNELS.PRIVACY_TOGGLE_WEBRTC,
  IPC_CHANNELS.PRIVACY_TOGGLE_TRACKER_BLOCKING,
  IPC_CHANNELS.AUTOMATION_START_SEARCH,
  IPC_CHANNELS.AUTOMATION_STOP_SEARCH,
  IPC_CHANNELS.AUTOMATION_ADD_KEYWORD,
  IPC_CHANNELS.AUTOMATION_ADD_DOMAIN,
  IPC_CHANNELS.AUTOMATION_GET_TASKS,
  IPC_CHANNELS.SESSION_SAVE,
  IPC_CHANNELS.SESSION_LOAD,
  IPC_CHANNELS.SESSION_LIST,
]);

/**
 * Whitelist of allowed event channels
 * Only these channels can have listeners attached from the renderer
 */
const IPC_EVENT_WHITELIST = new Set([
  'proxy:updated',
  'proxy:validated',
  'tab:created',
  'tab:closed',
  'tab:updated',
  'automation:task:completed',
  'automation:task:failed',
  'automation:session:updated',
  'privacy:updated',
  'session:saved',
  'session:loaded',
]);

/**
 * Secure invoke wrapper that validates channel against whitelist
 */
function secureInvoke(channel: string, ...args: unknown[]): Promise<unknown> {
  if (!IPC_INVOKE_WHITELIST.has(channel)) {
    console.error(`[Preload Security] BLOCKED invoke to unauthorized channel: ${channel}`);
    return Promise.reject(new Error(`Unauthorized IPC channel: ${channel}`));
  }
  return ipcRenderer.invoke(channel, ...args);
}

/**
 * Check if an event channel is allowed
 */
function isEventChannelAllowed(channel: string): boolean {
  return IPC_EVENT_WHITELIST.has(channel);
}

// ============================================================================
// Expose protected API to renderer
// ============================================================================

contextBridge.exposeInMainWorld('api', {
  // Proxy Management
  proxy: {
    add: (config: unknown) => secureInvoke(IPC_CHANNELS.PROXY_ADD, config),
    remove: (id: string) => secureInvoke(IPC_CHANNELS.PROXY_REMOVE, id),
    update: (id: string, updates: unknown) => secureInvoke(IPC_CHANNELS.PROXY_UPDATE, id, updates),
    list: () => secureInvoke(IPC_CHANNELS.PROXY_LIST),
    validate: (id: string) => secureInvoke(IPC_CHANNELS.PROXY_VALIDATE, id),
    setRotation: (config: unknown) => secureInvoke(IPC_CHANNELS.PROXY_SET_ROTATION, config)
  },

  // Tab Management
  tab: {
    create: (config: unknown) => secureInvoke(IPC_CHANNELS.TAB_CREATE, config),
    close: (id: string) => secureInvoke(IPC_CHANNELS.TAB_CLOSE, id),
    update: (id: string, updates: unknown) => secureInvoke(IPC_CHANNELS.TAB_UPDATE, id, updates),
    list: () => secureInvoke(IPC_CHANNELS.TAB_LIST),
    navigate: (id: string, url: string) => secureInvoke(IPC_CHANNELS.TAB_NAVIGATE, id, url),
    goBack: (id: string) => secureInvoke('tab:go-back', id),
    goForward: (id: string) => secureInvoke('tab:go-forward', id),
    reload: (id: string) => secureInvoke('tab:reload', id)
  },

  // Privacy & Fingerprint
  privacy: {
    setFingerprint: (config: unknown) => secureInvoke(IPC_CHANNELS.PRIVACY_SET_FINGERPRINT, config),
    toggleWebRTC: (enabled: boolean) => secureInvoke(IPC_CHANNELS.PRIVACY_TOGGLE_WEBRTC, enabled),
    toggleTrackerBlocking: (enabled: boolean) => 
      secureInvoke(IPC_CHANNELS.PRIVACY_TOGGLE_TRACKER_BLOCKING, enabled)
  },

  // Automation
  automation: {
    startSearch: (config: unknown) => secureInvoke(IPC_CHANNELS.AUTOMATION_START_SEARCH, config),
    stopSearch: (sessionId: string) => secureInvoke(IPC_CHANNELS.AUTOMATION_STOP_SEARCH, sessionId),
    addKeyword: (sessionId: string, keyword: string) => 
      secureInvoke(IPC_CHANNELS.AUTOMATION_ADD_KEYWORD, sessionId, keyword),
    addDomain: (domain: string, pattern?: string) => 
      secureInvoke(IPC_CHANNELS.AUTOMATION_ADD_DOMAIN, domain, pattern),
    getTasks: (sessionId: string) => secureInvoke(IPC_CHANNELS.AUTOMATION_GET_TASKS, sessionId)
  },

  // Session Management
  session: {
    save: (name: string) => secureInvoke(IPC_CHANNELS.SESSION_SAVE, name),
    load: (id: string) => secureInvoke(IPC_CHANNELS.SESSION_LOAD, id),
    list: () => secureInvoke(IPC_CHANNELS.SESSION_LIST)
  },

  // Analytics (stub implementation - returns mock data for dashboard)
  analytics: {
    getStats: () => Promise.resolve({ success: true, stats: {} }),
    getActivityLogs: (_params?: unknown) => Promise.resolve({ success: true, data: [], total: 0 }),
    getProxyPerformance: (_params?: unknown) => Promise.resolve({ success: true, data: [] }),
    getDashboardStats: () => Promise.resolve({ 
      success: true, 
      data: { 
        totalProxies: 0, activeProxies: 0, failedProxies: 0, 
        totalRequests: 0, successRate: 0, avgLatency: 0, 
        totalRotations: 0, bytesTransferred: 0 
      } 
    }),
    getAutomationStats: () => Promise.resolve({ 
      success: true, 
      data: { 
        totalTasks: 0, successfulTasks: 0, failedTasks: 0, 
        pendingTasks: 0, successRate: 0 
      } 
    }),
    getTrendData: (_params?: unknown) => Promise.resolve({ success: true, data: [] })
  },

  // Event listeners (with strict channel whitelist for security)
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    if (!isEventChannelAllowed(channel)) {
      console.error(`[Preload Security] BLOCKED attempt to listen to unauthorized channel: ${channel}`);
      return () => {}; // Return no-op unsubscribe function
    }

    const wrappedCallback = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => callback(...args);
    ipcRenderer.on(channel, wrappedCallback);
    
    // Return unsubscribe function
    return () => {
      ipcRenderer.removeListener(channel, wrappedCallback);
    };
  },

  off: (channel: string, callback: (...args: unknown[]) => void) => {
    if (!isEventChannelAllowed(channel)) {
      console.error(`[Preload Security] BLOCKED attempt to remove listener from unauthorized channel: ${channel}`);
      return;
    }

    // Type assertion needed because ipcRenderer.removeListener expects Electron's callback signature
    // but we expose a simplified callback type to the renderer
    ipcRenderer.removeListener(channel, callback as Parameters<typeof ipcRenderer.removeListener>[1]);
  },

  // Utility: Check if channel is allowed (for debugging)
  isChannelAllowed: (channel: string, type: 'invoke' | 'event'): boolean => {
    return type === 'invoke' 
      ? IPC_INVOKE_WHITELIST.has(channel) 
      : IPC_EVENT_WHITELIST.has(channel);
  }
});

// ============================================================================
// Type definitions for TypeScript
// ============================================================================

export interface SecureAPI {
  proxy: {
    add: (config: unknown) => Promise<unknown>;
    remove: (id: string) => Promise<unknown>;
    update: (id: string, updates: unknown) => Promise<unknown>;
    list: () => Promise<unknown>;
    validate: (id: string) => Promise<unknown>;
    setRotation: (config: unknown) => Promise<unknown>;
  };
  tab: {
    create: (config: unknown) => Promise<unknown>;
    close: (id: string) => Promise<unknown>;
    update: (id: string, updates: unknown) => Promise<unknown>;
    list: () => Promise<unknown>;
    navigate: (id: string, url: string) => Promise<unknown>;
    goBack: (id: string) => Promise<unknown>;
    goForward: (id: string) => Promise<unknown>;
    reload: (id: string) => Promise<unknown>;
  };
  privacy: {
    setFingerprint: (config: unknown) => Promise<unknown>;
    toggleWebRTC: (enabled: boolean) => Promise<unknown>;
    toggleTrackerBlocking: (enabled: boolean) => Promise<unknown>;
  };
  automation: {
    startSearch: (config: unknown) => Promise<unknown>;
    stopSearch: (sessionId: string) => Promise<unknown>;
    addKeyword: (sessionId: string, keyword: string) => Promise<unknown>;
    addDomain: (domain: string, pattern?: string) => Promise<unknown>;
    getTasks: (sessionId: string) => Promise<unknown>;
  };
  session: {
    save: (name: string) => Promise<unknown>;
    load: (id: string) => Promise<unknown>;
    list: () => Promise<unknown>;
  };
  analytics: {
    getStats: () => Promise<unknown>;
    getActivityLogs: (params?: unknown) => Promise<unknown>;
    getProxyPerformance: (params?: unknown) => Promise<unknown>;
    getDashboardStats: () => Promise<unknown>;
    getAutomationStats: () => Promise<unknown>;
    getTrendData: (params?: unknown) => Promise<unknown>;
  };
  on: (channel: string, callback: (...args: unknown[]) => void) => () => void;
  off: (channel: string, callback: (...args: unknown[]) => void) => void;
  isChannelAllowed: (channel: string, type: 'invoke' | 'event') => boolean;
}

declare global {
  interface Window {
    api: SecureAPI;
  }
}

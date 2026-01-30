/**
 * IPC Handlers Setup
 * Registers all IPC handlers with Zod validation and rate limiting
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../channels';
import type { ProxyManager } from '../../core/proxy-engine/manager';
import type { TabManager } from '../../core/tabs/manager';
import type { PrivacyManager } from '../../core/privacy/manager';
import type { AutomationManager } from '../../core/automation/manager';
import type { DatabaseManager } from '../../database';
import { setupPrivacyHandlers } from './privacy';
import { setupAutomationHandlers } from './automation';
import { setupNavigationHandlers } from './navigation';
import { 
  ProxyConfigSchema, 
  ProxyIdSchema, 
  RotationConfigSchema,
  TabConfigSchema,
  TabIdSchema,
  TabUpdateSchema,
  validateInput 
} from '../validation';
import { getIPCRateLimiter } from '../rate-limiter';

interface HandlerContext {
  proxyManager: ProxyManager;
  tabManager: TabManager;
  privacyManager: PrivacyManager;
  automationManager: AutomationManager;
  dbManager: DatabaseManager;
}

export function setupIpcHandlers(context: HandlerContext) {
  const { proxyManager, tabManager, privacyManager, automationManager } = context;
  const rateLimiter = getIPCRateLimiter();

  // Setup specialized handlers
  setupPrivacyHandlers(privacyManager);
  setupAutomationHandlers(automationManager);
  setupNavigationHandlers(tabManager);

  // Proxy Management Handlers
  ipcMain.handle(IPC_CHANNELS.PROXY_ADD, async (_event, config) => {
    // Rate limiting
    const rateCheck = rateLimiter.checkLimit(IPC_CHANNELS.PROXY_ADD);
    if (!rateCheck.allowed) {
      return { success: false, error: 'Rate limit exceeded', retryAfter: rateCheck.retryAfter };
    }

    // Validation
    const validation = validateInput(ProxyConfigSchema, config);
    if (!validation.success) {
      return { success: false, error: `Validation failed: ${validation.error}` };
    }

    try {
      const proxy = await proxyManager.addProxy(validation.data);
      return { success: true, proxy };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add proxy';
      console.error('[IPC:proxy:add] Error:', errorMessage, { host: validation.data.host });
      return { success: false, error: errorMessage };
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROXY_REMOVE, async (_event, id: string) => {
    // Rate limiting
    const rateCheck = rateLimiter.checkLimit(IPC_CHANNELS.PROXY_REMOVE);
    if (!rateCheck.allowed) {
      return { success: false, error: 'Rate limit exceeded', retryAfter: rateCheck.retryAfter };
    }

    // Validation
    const validation = validateInput(ProxyIdSchema, id);
    if (!validation.success) {
      return { success: false, error: `Validation failed: ${validation.error}` };
    }

    try {
      const result = proxyManager.removeProxy(validation.data);
      return { success: result };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove proxy';
      console.error('[IPC:proxy:remove] Error:', errorMessage, { proxyId: validation.data });
      return { success: false, error: errorMessage };
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROXY_LIST, async () => {
    // Rate limiting (lighter limit for read operations)
    const rateCheck = rateLimiter.checkLimit(IPC_CHANNELS.PROXY_LIST);
    if (!rateCheck.allowed) {
      return { success: false, error: 'Rate limit exceeded', retryAfter: rateCheck.retryAfter };
    }

    try {
      const proxies = proxyManager.getAllProxies();
      return { success: true, proxies };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to list proxies';
      console.error('[IPC:proxy:list] Error:', errorMessage);
      return { success: false, error: errorMessage };
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROXY_VALIDATE, async (_event, id: string) => {
    // Rate limiting
    const rateCheck = rateLimiter.checkLimit(IPC_CHANNELS.PROXY_VALIDATE);
    if (!rateCheck.allowed) {
      return { success: false, error: 'Rate limit exceeded', retryAfter: rateCheck.retryAfter };
    }

    // Validation
    const validation = validateInput(ProxyIdSchema, id);
    if (!validation.success) {
      return { success: false, error: `Validation failed: ${validation.error}` };
    }

    try {
      const result = await proxyManager.validateProxy(validation.data);
      return { success: true, result };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Proxy validation failed';
      console.error('[IPC:proxy:validate] Error:', errorMessage, { proxyId: validation.data });
      return { success: false, error: errorMessage };
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROXY_SET_ROTATION, async (_event, config) => {
    // Rate limiting
    const rateCheck = rateLimiter.checkLimit(IPC_CHANNELS.PROXY_SET_ROTATION);
    if (!rateCheck.allowed) {
      return { success: false, error: 'Rate limit exceeded', retryAfter: rateCheck.retryAfter };
    }

    // Validation
    const validation = validateInput(RotationConfigSchema, config);
    if (!validation.success) {
      return { success: false, error: `Validation failed: ${validation.error}` };
    }

    try {
      proxyManager.setRotationStrategy(validation.data);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to set rotation strategy';
      console.error('[IPC:proxy:setRotation] Error:', errorMessage, { strategy: validation.data.strategy });
      return { success: false, error: errorMessage };
    }
  });

  // Tab Management Handlers
  ipcMain.handle(IPC_CHANNELS.TAB_CREATE, async (_event, config) => {
    // Rate limiting
    const rateCheck = rateLimiter.checkLimit(IPC_CHANNELS.TAB_CREATE);
    if (!rateCheck.allowed) {
      return { success: false, error: 'Rate limit exceeded', retryAfter: rateCheck.retryAfter };
    }

    // Validation
    const validation = validateInput(TabConfigSchema, config);
    if (!validation.success) {
      return { success: false, error: `Validation failed: ${validation.error}` };
    }

    try {
      const tab = await tabManager.createTab(validation.data);
      return { success: true, tab };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create tab';
      console.error('[IPC:tab:create] Error:', errorMessage, { url: validation.data.url });
      return { success: false, error: errorMessage };
    }
  });

  ipcMain.handle(IPC_CHANNELS.TAB_CLOSE, async (_event, id: string) => {
    // Rate limiting
    const rateCheck = rateLimiter.checkLimit(IPC_CHANNELS.TAB_CLOSE);
    if (!rateCheck.allowed) {
      return { success: false, error: 'Rate limit exceeded', retryAfter: rateCheck.retryAfter };
    }

    // Validation
    const validation = validateInput(TabIdSchema, id);
    if (!validation.success) {
      return { success: false, error: `Validation failed: ${validation.error}` };
    }

    try {
      const result = tabManager.closeTab(validation.data);
      return { success: result };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to close tab';
      console.error('[IPC:tab:close] Error:', errorMessage, { tabId: validation.data });
      return { success: false, error: errorMessage };
    }
  });

  ipcMain.handle(IPC_CHANNELS.TAB_LIST, async () => {
    // Rate limiting
    const rateCheck = rateLimiter.checkLimit(IPC_CHANNELS.TAB_LIST);
    if (!rateCheck.allowed) {
      return { success: false, error: 'Rate limit exceeded', retryAfter: rateCheck.retryAfter };
    }

    try {
      const tabs = tabManager.getAllTabs();
      return { success: true, tabs };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to list tabs';
      console.error('[IPC:tab:list] Error:', errorMessage);
      return { success: false, error: errorMessage };
    }
  });

  ipcMain.handle(IPC_CHANNELS.TAB_UPDATE, async (_event, id: string, updates: unknown) => {
    // Rate limiting
    const rateCheck = rateLimiter.checkLimit(IPC_CHANNELS.TAB_UPDATE);
    if (!rateCheck.allowed) {
      return { success: false, error: 'Rate limit exceeded', retryAfter: rateCheck.retryAfter };
    }

    // Validation
    const idValidation = validateInput(TabIdSchema, id);
    if (!idValidation.success) {
      return { success: false, error: `Validation failed: ${idValidation.error}` };
    }

    const updatesValidation = validateInput(TabUpdateSchema, updates);
    if (!updatesValidation.success) {
      return { success: false, error: `Validation failed: ${updatesValidation.error}` };
    }

    try {
      const tab = tabManager.updateTab(idValidation.data, updatesValidation.data);
      return { success: true, tab };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update tab';
      console.error('[IPC:tab:update] Error:', errorMessage, { tabId: idValidation.data });
      return { success: false, error: errorMessage };
    }
  });

  console.log('[IPC Handlers] Registered with validation and rate limiting');
}

/**
 * Navigation IPC Handlers
 * With Zod validation and rate limiting
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../channels';
import type { TabManager } from '../../core/tabs/manager';
import { TabIdSchema, NavigationSchema, validateInput } from '../validation';
import { getIPCRateLimiter } from '../rate-limiter';
import { sanitizeUrl } from '../../utils/security';

export function setupNavigationHandlers(tabManager: TabManager) {
  const rateLimiter = getIPCRateLimiter();

  // Navigate to URL
  ipcMain.handle(IPC_CHANNELS.TAB_NAVIGATE, async (_event, id: string, url: string) => {
    // Rate limiting
    const rateCheck = rateLimiter.checkLimit(IPC_CHANNELS.TAB_NAVIGATE);
    if (!rateCheck.allowed) {
      return { success: false, error: 'Rate limit exceeded', retryAfter: rateCheck.retryAfter };
    }

    // Validation
    const validation = validateInput(NavigationSchema, { tabId: id, url });
    if (!validation.success) {
      return { success: false, error: `Validation failed: ${validation.error}` };
    }

    try {
      // Additional URL sanitization
      const safeUrl = sanitizeUrl(validation.data.url);
      await tabManager.navigate(validation.data.tabId, safeUrl);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Navigation failed';
      console.error('[IPC:tab:navigate] Error:', errorMessage, { 
        tabId: validation.data.tabId, 
        url: validation.data.url.substring(0, 100) 
      });
      return { success: false, error: errorMessage };
    }
  });

  // Go back
  ipcMain.handle('tab:go-back', async (_event, id: string) => {
    // Rate limiting
    const rateCheck = rateLimiter.checkLimit('tab:go-back');
    if (!rateCheck.allowed) {
      return { success: false, error: 'Rate limit exceeded', retryAfter: rateCheck.retryAfter };
    }

    // Validation
    const validation = validateInput(TabIdSchema, id);
    if (!validation.success) {
      return { success: false, error: `Validation failed: ${validation.error}` };
    }

    try {
      tabManager.goBack(validation.data);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Go back failed';
      console.error('[IPC:tab:go-back] Error:', errorMessage, { tabId: validation.data });
      return { success: false, error: errorMessage };
    }
  });

  // Go forward
  ipcMain.handle('tab:go-forward', async (_event, id: string) => {
    // Rate limiting
    const rateCheck = rateLimiter.checkLimit('tab:go-forward');
    if (!rateCheck.allowed) {
      return { success: false, error: 'Rate limit exceeded', retryAfter: rateCheck.retryAfter };
    }

    // Validation
    const validation = validateInput(TabIdSchema, id);
    if (!validation.success) {
      return { success: false, error: `Validation failed: ${validation.error}` };
    }

    try {
      tabManager.goForward(validation.data);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Go forward failed';
      console.error('[IPC:tab:go-forward] Error:', errorMessage, { tabId: validation.data });
      return { success: false, error: errorMessage };
    }
  });

  // Reload
  ipcMain.handle('tab:reload', async (_event, id: string) => {
    // Rate limiting
    const rateCheck = rateLimiter.checkLimit('tab:reload');
    if (!rateCheck.allowed) {
      return { success: false, error: 'Rate limit exceeded', retryAfter: rateCheck.retryAfter };
    }

    // Validation
    const validation = validateInput(TabIdSchema, id);
    if (!validation.success) {
      return { success: false, error: `Validation failed: ${validation.error}` };
    }

    try {
      tabManager.reload(validation.data);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Reload failed';
      console.error('[IPC:tab:reload] Error:', errorMessage, { tabId: validation.data });
      return { success: false, error: errorMessage };
    }
  });

  console.log('[Navigation Handlers] Registered with validation and rate limiting');
}

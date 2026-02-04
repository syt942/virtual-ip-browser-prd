/**
 * Tab IPC Handlers
 * With Zod validation and rate limiting
 * 
 * Handles:
 * - tab:assign-proxy (P0) - Assign proxy to specific tab
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../channels';
import type { TabManager } from '../../core/tabs/manager';
import type { ProxyManager } from '../../core/proxy-engine/manager';
import { 
  TabAssignProxySchema,
  validateInput 
} from '../validation';
import { getIPCRateLimiter } from '../rate-limiter';

export function setupTabHandlers(tabManager: TabManager, proxyManager: ProxyManager) {
  const rateLimiter = getIPCRateLimiter();

  /**
   * tab:assign-proxy - Assign a proxy to a specific tab
   * 
   * P0 Priority - Critical for per-tab proxy isolation
   * 
   * @param tabId - UUID of the tab
   * @param proxyId - UUID of the proxy (null for direct connection)
   * @returns Updated tab configuration or error
   */
  ipcMain.handle(IPC_CHANNELS.TAB_ASSIGN_PROXY, async (_event, tabId: string, proxyId: string | null) => {
    // Rate limiting
    const rateCheck = rateLimiter.checkLimit(IPC_CHANNELS.TAB_ASSIGN_PROXY);
    if (!rateCheck.allowed) {
      return { 
        success: false, 
        error: 'Rate limit exceeded', 
        retryAfter: rateCheck.retryAfter 
      };
    }

    // Validation
    const validation = validateInput(TabAssignProxySchema, { tabId, proxyId });
    if (!validation.success) {
      return { success: false, error: `Validation failed: ${validation.error}` };
    }

    try {
      const { tabId: validTabId, proxyId: validProxyId } = validation.data;

      // Verify tab exists
      const tab = tabManager.getTab(validTabId);
      if (!tab) {
        return { success: false, error: `Tab ${validTabId} not found` };
      }

      // Verify proxy exists (if not null)
      if (validProxyId !== null) {
        const proxy = proxyManager.getProxy(validProxyId);
        if (!proxy) {
          return { success: false, error: `Proxy ${validProxyId} not found` };
        }
        
        // Check if proxy is active
        if (proxy.status !== 'active') {
          return { 
            success: false, 
            error: `Proxy ${validProxyId} is not active (status: ${proxy.status})` 
          };
        }
      }

      // Dynamically assign proxy to the tab's session
      const assigned = await tabManager.assignProxyToTab(validTabId, validProxyId);
      
      if (!assigned) {
        return { success: false, error: 'Failed to assign proxy to tab' };
      }

      // Get updated tab configuration
      const updatedTab = tabManager.getTab(validTabId);

      return { 
        success: true, 
        tab: updatedTab,
        message: validProxyId ? `Proxy assigned to tab and applied to session` : 'Direct connection enabled'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to assign proxy to tab';
      console.error('[IPC:tab:assignProxy] Error:', errorMessage, { tabId, proxyId });
      return { success: false, error: errorMessage };
    }
  });

  console.log('[Tab Handlers] Registered tab:assign-proxy with validation and rate limiting');
}

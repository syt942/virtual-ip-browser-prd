/**
 * Main Process Entry Point
 * Electron main process initialization
 */

import { app, BrowserWindow, session } from 'electron';
import { join } from 'path';
import { DatabaseManager } from '../database';
import { ProxyManager } from '../core/proxy-engine/manager';
import { TabManager } from '../core/tabs/manager';
import { PrivacyManager } from '../core/privacy/manager';
import { AutomationManager } from '../core/automation/manager';
import { setupIpcHandlers } from '../ipc/handlers';
import { encryptionService } from '../database/services/encryption.service';
import { ConfigManager } from './config-manager';
import { generateCSP } from '../utils/security';

// Global instances
let mainWindow: BrowserWindow | null = null;
let configManager: ConfigManager;
let dbManager: DatabaseManager;
let proxyManager: ProxyManager;
let tabManager: TabManager;
let privacyManager: PrivacyManager;
let automationManager: AutomationManager;

/**
 * Create main application window
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true, // SECURITY FIX: Enable sandbox for process isolation
      webviewTag: false, // SECURITY: Disable webview tag to prevent privilege escalation
      allowRunningInsecureContent: false, // SECURITY: Block insecure content
      experimentalFeatures: false // SECURITY: Disable experimental features
    },
    title: 'Virtual IP Browser',
    show: false
  });

  // Set window in TabManager
  tabManager.setWindow(mainWindow);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    
    // Create initial tab
    tabManager.createTab({ url: 'https://www.google.com' }).catch(err => {
      console.error('Failed to create initial tab:', err);
    });
  });

  // Load renderer
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Initialize application
 */
async function initialize() {
  try {
    // Initialize ConfigManager for secure master key management
    configManager = new ConfigManager();
    configManager.initialize();
    const masterKey = configManager.getMasterKey();
    console.log('ConfigManager initialized - master key ready');
    
    // Initialize encryption service with master key
    encryptionService.initialize(masterKey);
    console.log('Encryption service initialized');

    // Initialize database
    dbManager = new DatabaseManager();
    await dbManager.initialize();

    // Initialize managers with master key
    proxyManager = new ProxyManager({ masterKey });
    privacyManager = new PrivacyManager();
    tabManager = new TabManager();
    tabManager.setPrivacyManager(privacyManager);
    tabManager.setProxyManager(proxyManager);
    automationManager = new AutomationManager(dbManager);

    // Setup IPC handlers
    setupIpcHandlers({
      proxyManager,
      tabManager,
      privacyManager,
      automationManager,
      dbManager
    });

    console.log('Application initialized successfully');
  } catch (error) {
    console.error('Failed to initialize application:', error);
    app.quit();
  }
}

/**
 * Setup security headers for all web requests
 * HIGH-001: Apply CSP and HSTS headers via webRequest.onHeadersReceived
 * 
 * SECURITY: This must run BEFORE window creation to ensure all requests
 * are protected from the start.
 */
function setupSecurityHeaders(): void {
  const defaultSession = session.defaultSession;
  
  // Generate strict CSP header
  const cspHeader = generateCSP({ strict: true });
  
  // HSTS header: 1 year max-age with includeSubDomains
  const hstsHeader = 'max-age=31536000; includeSubDomains';
  
  // Apply security headers to all responses
  defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };
    
    // Apply Content-Security-Policy header
    // Only apply to HTML documents to avoid breaking other resource types
    const contentType = responseHeaders['content-type']?.[0] || responseHeaders['Content-Type']?.[0] || '';
    const isHtmlDocument = contentType.includes('text/html') || 
                           details.resourceType === 'mainFrame' || 
                           details.resourceType === 'subFrame';
    
    if (isHtmlDocument) {
      // Remove any existing CSP headers to prevent conflicts
      delete responseHeaders['content-security-policy'];
      delete responseHeaders['Content-Security-Policy'];
      delete responseHeaders['x-content-security-policy'];
      delete responseHeaders['X-Content-Security-Policy'];
      
      // Apply our strict CSP
      responseHeaders['Content-Security-Policy'] = [cspHeader];
    }
    
    // Apply HSTS header for HTTPS responses
    if (details.url.startsWith('https://')) {
      delete responseHeaders['strict-transport-security'];
      delete responseHeaders['Strict-Transport-Security'];
      responseHeaders['Strict-Transport-Security'] = [hstsHeader];
    }
    
    // Additional security headers
    responseHeaders['X-Content-Type-Options'] = ['nosniff'];
    responseHeaders['X-Frame-Options'] = ['DENY'];
    responseHeaders['X-XSS-Protection'] = ['1; mode=block'];
    responseHeaders['Referrer-Policy'] = ['strict-origin-when-cross-origin'];
    
    // Remove potentially dangerous headers
    delete responseHeaders['x-powered-by'];
    delete responseHeaders['X-Powered-By'];
    delete responseHeaders['server'];
    delete responseHeaders['Server'];
    
    callback({ responseHeaders });
  });
  
  console.log('Security headers configured (CSP, HSTS, X-Frame-Options, etc.)');
}

// App lifecycle events
app.whenReady().then(async () => {
  // SECURITY: Setup security headers BEFORE window creation
  setupSecurityHeaders();
  
  await initialize();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // Clean up ConfigManager (clears master key from memory)
  if (configManager) {
    configManager.destroy();
  }
  
  // Clean up encryption service
  if (encryptionService) {
    encryptionService.destroy();
  }
  
  // Clean up ProxyManager (clears sensitive data)
  if (proxyManager) {
    proxyManager.destroy();
  }
  
  // Close database
  if (dbManager) {
    dbManager.close();
  }
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

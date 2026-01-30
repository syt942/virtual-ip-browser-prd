/**
 * Main Process Entry Point
 * Electron main process initialization
 */

import { app, BrowserWindow } from 'electron';
import { join } from 'path';
import { DatabaseManager } from '../database';
import { ProxyManager } from '../core/proxy-engine/manager';
import { TabManager } from '../core/tabs/manager';
import { PrivacyManager } from '../core/privacy/manager';
import { AutomationManager } from '../core/automation/manager';
import { setupIpcHandlers } from '../ipc/handlers';
import { encryptionService } from '../database/services/encryption.service';
import { ConfigManager } from './config-manager';

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

// App lifecycle events
app.whenReady().then(async () => {
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

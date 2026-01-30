/**
 * IPC Channel Definitions
 * Type-safe IPC channel names
 */

export const IPC_CHANNELS = {
  // Proxy Management
  PROXY_ADD: 'proxy:add',
  PROXY_REMOVE: 'proxy:remove',
  PROXY_UPDATE: 'proxy:update',
  PROXY_LIST: 'proxy:list',
  PROXY_VALIDATE: 'proxy:validate',
  PROXY_SET_ROTATION: 'proxy:set-rotation',
  
  // Tab Management
  TAB_CREATE: 'tab:create',
  TAB_CLOSE: 'tab:close',
  TAB_UPDATE: 'tab:update',
  TAB_LIST: 'tab:list',
  TAB_NAVIGATE: 'tab:navigate',
  
  // Privacy & Fingerprint
  PRIVACY_SET_FINGERPRINT: 'privacy:set-fingerprint',
  PRIVACY_TOGGLE_WEBRTC: 'privacy:toggle-webrtc',
  PRIVACY_TOGGLE_TRACKER_BLOCKING: 'privacy:toggle-tracker-blocking',
  
  // Automation
  AUTOMATION_START_SEARCH: 'automation:start-search',
  AUTOMATION_STOP_SEARCH: 'automation:stop-search',
  AUTOMATION_ADD_KEYWORD: 'automation:add-keyword',
  AUTOMATION_ADD_DOMAIN: 'automation:add-domain',
  AUTOMATION_GET_TASKS: 'automation:get-tasks',
  
  // Session Management
  SESSION_SAVE: 'session:save',
  SESSION_LOAD: 'session:load',
  SESSION_LIST: 'session:list',
  
  // Events (Main -> Renderer)
  EVENT_PROXY_STATUS_CHANGE: 'event:proxy-status-change',
  EVENT_TAB_UPDATE: 'event:tab-update',
  EVENT_AUTOMATION_PROGRESS: 'event:automation-progress',
  EVENT_LOG: 'event:log'
} as const;

export type IPCChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];

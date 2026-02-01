# API Reference Codemap

**Last Updated:** 2025-02-01  
**Version:** 1.3.0

## Overview

This codemap documents the IPC API layer that connects the renderer process to main process functionality. All APIs use validated channels with rate limiting and type-safe schemas.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      IPC API Architecture                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Renderer Process                                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  window.api.invoke(channel, data)                        │   │
│  └──────────────────────────┬──────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Preload Bridge                        │   │
│  │  contextBridge.exposeInMainWorld('api', { invoke })     │   │
│  └──────────────────────────┬──────────────────────────────┘   │
│                              │                                   │
│  ════════════════════════════╪══════════════════════════════   │
│                              │  IPC Channel                      │
│  ════════════════════════════╪══════════════════════════════   │
│                              │                                   │
│  Main Process                ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Rate Limiter → Zod Validation → Handler → Response     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## File Structure

```
electron/ipc/
├── channels.ts           # Channel name constants
├── validation.ts         # Zod validation schemas
├── rate-limiter.ts       # Rate limiting implementation
└── handlers/
    ├── index.ts          # Handler registration
    ├── automation.ts     # Automation handlers
    ├── privacy.ts        # Privacy handlers
    ├── navigation.ts     # Navigation handlers
    └── tabs.ts           # Tab handlers
```

## Channel Definitions

### `electron/ipc/channels.ts`

```typescript
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
  TAB_ASSIGN_PROXY: 'tab:assign-proxy',
  
  // Privacy & Fingerprint
  PRIVACY_SET_FINGERPRINT: 'privacy:set-fingerprint',
  PRIVACY_TOGGLE_WEBRTC: 'privacy:toggle-webrtc',
  PRIVACY_TOGGLE_TRACKER_BLOCKING: 'privacy:toggle-tracker-blocking',
  PRIVACY_GET_STATS: 'privacy:get-stats',
  
  // Automation
  AUTOMATION_START_SEARCH: 'automation:start-search',
  AUTOMATION_STOP_SEARCH: 'automation:stop-search',
  AUTOMATION_ADD_KEYWORD: 'automation:add-keyword',
  AUTOMATION_ADD_DOMAIN: 'automation:add-domain',
  AUTOMATION_GET_TASKS: 'automation:get-tasks',
  AUTOMATION_SCHEDULE: 'automation:schedule',
  AUTOMATION_PAUSE: 'automation:pause',
  AUTOMATION_RESUME: 'automation:resume',
  
  // Session Management
  SESSION_SAVE: 'session:save',
  SESSION_LOAD: 'session:load',
  SESSION_LIST: 'session:list',
  
  // Events (Main → Renderer)
  EVENT_PROXY_STATUS_CHANGE: 'event:proxy-status-change',
  EVENT_TAB_UPDATE: 'event:tab-update',
  EVENT_AUTOMATION_PROGRESS: 'event:automation-progress',
  EVENT_LOG: 'event:log'
} as const;
```

## API Summary

### Proxy Management

| Channel | Method | Rate Limit | Description |
|---------|--------|------------|-------------|
| `proxy:add` | invoke | 10/min | Add new proxy |
| `proxy:remove` | invoke | 20/min | Remove proxy |
| `proxy:update` | invoke | 20/min | Update proxy |
| `proxy:list` | invoke | 100/min | List all proxies |
| `proxy:validate` | invoke | 20/min | Validate proxy |
| `proxy:set-rotation` | invoke | 10/min | Set rotation strategy |

### Tab Management

| Channel | Method | Rate Limit | Description |
|---------|--------|------------|-------------|
| `tab:create` | invoke | 50/min | Create isolated tab |
| `tab:close` | invoke | 50/min | Close tab |
| `tab:update` | invoke | 50/min | Update tab |
| `tab:list` | invoke | 100/min | List all tabs |
| `tab:navigate` | invoke | 100/min | Navigate to URL |
| `tab:assign-proxy` | invoke | 50/min | Assign proxy to tab |

### Privacy

| Channel | Method | Rate Limit | Description |
|---------|--------|------------|-------------|
| `privacy:set-fingerprint` | invoke | 20/min | Configure spoofing |
| `privacy:toggle-webrtc` | invoke | 30/min | Toggle WebRTC protection |
| `privacy:toggle-tracker-blocking` | invoke | 30/min | Toggle tracker blocking |
| `privacy:get-stats` | invoke | 120/min | Get blocking stats |

### Automation

| Channel | Method | Rate Limit | Description |
|---------|--------|------------|-------------|
| `automation:start-search` | invoke | 5/min | Start search session |
| `automation:stop-search` | invoke | 10/min | Stop search session |
| `automation:add-keyword` | invoke | 50/min | Add keyword to queue |
| `automation:add-domain` | invoke | 30/min | Add target domain |
| `automation:get-tasks` | invoke | 60/min | Get task status |
| `automation:schedule` | invoke | 10/min | Schedule automation |
| `automation:pause` | invoke | 20/min | Pause automation |
| `automation:resume` | invoke | 20/min | Resume automation |

### Session

| Channel | Method | Rate Limit | Description |
|---------|--------|------------|-------------|
| `session:save` | invoke | 10/min | Save session |
| `session:load` | invoke | 10/min | Load session |
| `session:list` | invoke | 100/min | List sessions |

### Events (Push)

| Channel | Direction | Description |
|---------|-----------|-------------|
| `event:proxy-status-change` | Main → Renderer | Proxy status update |
| `event:tab-update` | Main → Renderer | Tab state change |
| `event:automation-progress` | Main → Renderer | Automation progress |
| `event:log` | Main → Renderer | Activity log entry |

## Validation Schemas

### Key Schemas (`electron/ipc/validation.ts`)

```typescript
// Proxy Configuration
export const ProxyConfigSchema = z.object({
  host: z.string().min(1).max(255),
  port: z.number().int().min(1).max(65535),
  protocol: z.enum(['http', 'https', 'socks4', 'socks5']),
  username: z.string().max(255).optional(),
  password: z.string().max(255).optional(),
  name: z.string().max(100).default(''),
});

// Safe URL (SSRF protected)
export const SafeUrlSchema = z.string()
  .max(2048)
  .refine((url) => {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol) &&
           !isPrivateOrBlockedIP(parsed.hostname);
  });

// Automation Configuration
export const AutomationConfigSchema = z.object({
  keywords: z.array(z.string().max(200)).max(100),
  engine: z.enum(['google', 'bing', 'duckduckgo', 'yahoo', 'brave']),
  targetDomains: z.array(z.string().max(255)).max(50),
  maxRetries: z.number().int().min(0).max(10).default(3),
  delayBetweenSearches: z.number().int().min(1000).max(60000),
});

// Fingerprint Configuration
export const FingerprintConfigSchema = z.object({
  canvas: z.boolean().default(true),
  webgl: z.boolean().default(true),
  audio: z.boolean().default(true),
  navigator: z.boolean().default(true),
  timezone: z.string().max(100).optional(),
});
```

## Handler Registration

### `electron/ipc/handlers/index.ts`

```typescript
export function setupIpcHandlers(context: HandlerContext) {
  const { proxyManager, tabManager, privacyManager, automationManager } = context;
  const rateLimiter = getIPCRateLimiter();

  // Setup specialized handlers
  setupPrivacyHandlers(privacyManager);
  setupAutomationHandlers(automationManager);
  setupNavigationHandlers(tabManager);
  setupTabHandlers(tabManager, proxyManager);

  // Proxy handlers with validation + rate limiting
  ipcMain.handle(IPC_CHANNELS.PROXY_ADD, async (_event, config) => {
    const rateCheck = rateLimiter.checkLimit(IPC_CHANNELS.PROXY_ADD);
    if (!rateCheck.allowed) {
      return { success: false, error: 'Rate limit exceeded', retryAfter: rateCheck.retryAfter };
    }

    const validation = validateInput(ProxyConfigSchema, config);
    if (!validation.success) {
      return { success: false, error: `Validation failed: ${validation.error}` };
    }

    try {
      const proxy = await proxyManager.addProxy(validation.data);
      return { success: true, proxy };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ... more handlers
}
```

## Response Format

All handlers return a standardized response:

```typescript
interface IPCResponse<T> {
  success: boolean;
  data?: T;           // Present when success: true
  error?: string;     // Present when success: false
  retryAfter?: number; // Present when rate limited (ms)
}
```

## Error Handling

```typescript
// Standard error handling pattern
try {
  const result = await operation(validatedData);
  return { success: true, data: result };
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  console.error(`[IPC:${channel}] Error:`, errorMessage);
  return { success: false, error: errorMessage };
}
```

## Security Features

| Feature | Implementation |
|---------|----------------|
| Rate Limiting | Sliding window per channel |
| Input Validation | Zod schemas with transforms |
| SSRF Protection | Private IP blocking |
| XSS Prevention | Pattern detection |
| Type Safety | Full TypeScript types |
| Channel Whitelist | Explicit allow list |

## Related Documentation

- [Full API Documentation](../API_DOCUMENTATION.md) - Complete API reference with examples
- [Security](./security.md) - Security implementation details
- [Architecture](../ARCHITECTURE.md) - System architecture

---

**Last Updated:** 2025-02-01 | **Version:** 1.3.0

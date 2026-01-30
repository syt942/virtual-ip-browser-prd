# API Reference - Virtual IP Browser

**Last Updated:** 2025-01-30  
**Version:** 1.1.0

## Table of Contents

1. [Overview](#overview)
2. [IPC Channels](#ipc-channels)
3. [Validation Schemas](#validation-schemas)
4. [Event System](#event-system)
5. [Error Handling](#error-handling)
6. [Rate Limits](#rate-limits)

---

## Overview

Virtual IP Browser uses Electron's IPC (Inter-Process Communication) system for communication between the renderer process (React UI) and the main process (Node.js backend). All channels are secured with:

- **Channel Whitelisting**: Only approved channels can be invoked
- **Zod Validation**: Type-safe input validation
- **Rate Limiting**: Per-channel request limits
- **SSRF Protection**: URL validation for navigation

### Architecture

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   React UI   │───►│   Preload    │───►│  Validation  │───►│   Handler    │
│   (Store)    │    │  (Whitelist) │    │    (Zod)     │    │   (Logic)    │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

### Usage from Renderer

```typescript
// Access via window.electronAPI (exposed by preload)
const result = await window.electronAPI.invoke('channel:name', payload);

// Listen to events
window.electronAPI.on('event:name', (data) => {
  console.log('Received:', data);
});
```

---

## IPC Channels

### Proxy Management

#### `proxy:add`

Add a new proxy configuration.

| Property | Value |
|----------|-------|
| Direction | Renderer → Main |
| Rate Limit | 50/minute |
| Auth Required | No |

**Request Schema:**
```typescript
{
  host: string;        // 1-255 chars, required
  port: number;        // 1-65535, required
  protocol: 'http' | 'https' | 'socks4' | 'socks5';
  username?: string;   // max 255 chars
  password?: string;   // max 255 chars
  country?: string;    // ISO 3166-1 alpha-2 (2 chars)
  region?: string;     // max 50 chars
  name?: string;       // max 100 chars
}
```

**Response:**
```typescript
{
  id: string;          // UUID
  host: string;
  port: number;
  protocol: string;
  status: 'active' | 'inactive' | 'validating';
  createdAt: string;   // ISO 8601
}
```

**Example:**
```typescript
const proxy = await window.electronAPI.invoke('proxy:add', {
  host: '192.168.1.100',
  port: 8080,
  protocol: 'http',
  country: 'US'
});
```

---

#### `proxy:remove`

Remove a proxy by ID.

| Property | Value |
|----------|-------|
| Direction | Renderer → Main |
| Rate Limit | 50/minute |

**Request:**
```typescript
{
  id: string;  // UUID of proxy to remove
}
```

**Response:**
```typescript
{
  success: boolean;
  removedId: string;
}
```

---

#### `proxy:update`

Update an existing proxy configuration.

| Property | Value |
|----------|-------|
| Direction | Renderer → Main |
| Rate Limit | 50/minute |

**Request:**
```typescript
{
  id: string;          // UUID, required
  host?: string;
  port?: number;
  protocol?: 'http' | 'https' | 'socks4' | 'socks5';
  username?: string;
  password?: string;
  country?: string;
  region?: string;
  enabled?: boolean;
}
```

**Response:**
```typescript
{
  id: string;
  // ... updated proxy fields
  updatedAt: string;
}
```

---

#### `proxy:list`

Get all configured proxies.

| Property | Value |
|----------|-------|
| Direction | Renderer → Main |
| Rate Limit | 100/minute |

**Request:** None

**Response:**
```typescript
{
  proxies: Array<{
    id: string;
    host: string;
    port: number;
    protocol: string;
    country?: string;
    region?: string;
    status: 'active' | 'inactive' | 'failed';
    latency?: number;      // ms
    successRate?: number;  // 0-100
    lastUsed?: string;     // ISO 8601
  }>;
  total: number;
}
```

---

#### `proxy:validate`

Test proxy connectivity and measure latency.

| Property | Value |
|----------|-------|
| Direction | Renderer → Main |
| Rate Limit | 20/minute |
| SSRF Check | Yes |

**Request:**
```typescript
{
  id?: string;         // Validate existing proxy by ID
  // OR provide proxy config directly:
  host?: string;
  port?: number;
  protocol?: string;
  timeout?: number;    // ms, default 5000, max 30000
}
```

**Response:**
```typescript
{
  valid: boolean;
  latency?: number;    // ms (if valid)
  ip?: string;         // External IP (if valid)
  error?: string;      // Error message (if invalid)
}
```

---

#### `proxy:set-rotation`

Configure proxy rotation strategy.

| Property | Value |
|----------|-------|
| Direction | Renderer → Main |
| Rate Limit | 30/minute |

**Request:**
```typescript
{
  strategy: 'round-robin' | 'random' | 'least-used' | 'fastest' | 
            'failure-aware' | 'weighted' | 'geographic' | 
            'sticky-session' | 'time-based' | 'custom';
  
  // Strategy-specific options:
  
  // Geographic options
  preferredCountries?: string[];    // ['US', 'CA', 'GB']
  excludeCountries?: string[];      // ['CN', 'RU']
  
  // Sticky-session options
  stickySessionTTL?: number;        // ms, default 3600000
  stickyHashAlgorithm?: 'domain' | 'subdomain' | 'full-url';
  
  // Time-based options
  interval?: number;                // ms
  jitterPercent?: number;           // 0-50
  scheduleWindows?: Array<{
    startHour: number;              // 0-23
    endHour: number;                // 0-23
    daysOfWeek: number[];           // 0-6 (Sun-Sat)
  }>;
  
  // Custom rules
  rules?: Array<{
    name: string;
    priority: number;
    conditions: Array<{
      field: 'domain' | 'time' | 'request-count' | 'region';
      operator: 'equals' | 'contains' | 'regex' | 'gt' | 'lt';
      value: string | number;
    }>;
    actions: Array<{
      action: 'use_proxy' | 'use_country' | 'use_region' | 'skip';
      params?: Record<string, unknown>;
    }>;
  }>;
}
```

**Response:**
```typescript
{
  success: boolean;
  strategy: string;
  config: object;
}
```

---

### Tab Management

#### `tab:create`

Create a new browser tab.

| Property | Value |
|----------|-------|
| Direction | Renderer → Main |
| Rate Limit | 50/minute |

**Request:**
```typescript
{
  url?: string;           // Initial URL (validated for SSRF)
  proxyId?: string;       // Proxy to use
  fingerprint?: object;   // Fingerprint config
  partition?: string;     // Session partition name
}
```

**Response:**
```typescript
{
  id: string;             // Tab UUID
  url: string;
  title: string;
  partition: string;
  proxyId?: string;
  createdAt: string;
}
```

---

#### `tab:close`

Close a browser tab.

| Property | Value |
|----------|-------|
| Direction | Renderer → Main |
| Rate Limit | 100/minute |

**Request:**
```typescript
{
  id: string;  // Tab UUID
}
```

**Response:**
```typescript
{
  success: boolean;
  closedId: string;
}
```

---

#### `tab:navigate`

Navigate a tab to a URL.

| Property | Value |
|----------|-------|
| Direction | Renderer → Main |
| Rate Limit | 100/minute |
| SSRF Check | Yes |

**Request:**
```typescript
{
  tabId: string;          // Tab UUID
  url: string;            // URL to navigate (max 2048 chars)
}
```

**Response:**
```typescript
{
  success: boolean;
  url: string;
  title?: string;
}
```

**SSRF Validation:**
- Blocks `localhost`, `127.0.0.1`, `::1`
- Blocks private IP ranges (10.x, 172.16-31.x, 192.168.x)
- Blocks cloud metadata (169.254.169.254)
- Only allows `http:` and `https:` protocols

---

#### `tab:update`

Update tab properties.

| Property | Value |
|----------|-------|
| Direction | Renderer → Main |
| Rate Limit | 100/minute |

**Request:**
```typescript
{
  id: string;
  proxyId?: string;
  fingerprint?: object;
}
```

---

#### `tab:list`

Get all open tabs.

| Property | Value |
|----------|-------|
| Direction | Renderer → Main |
| Rate Limit | 100/minute |

**Response:**
```typescript
{
  tabs: Array<{
    id: string;
    url: string;
    title: string;
    favicon?: string;
    proxyId?: string;
    isActive: boolean;
  }>;
}
```

---

### Privacy & Fingerprint

#### `privacy:set-fingerprint`

Configure fingerprint spoofing for a tab.

| Property | Value |
|----------|-------|
| Direction | Renderer → Main |
| Rate Limit | 30/minute |

**Request:**
```typescript
{
  tabId: string;
  fingerprint: {
    canvas?: {
      enabled: boolean;
      noise?: number;      // 0-10
    };
    webgl?: {
      enabled: boolean;
      vendor?: string;
      renderer?: string;
    };
    audio?: {
      enabled: boolean;
      noise?: number;
    };
    navigator?: {
      userAgent?: string;
      platform?: string;
      languages?: string[];
      hardwareConcurrency?: number;
    };
    timezone?: {
      offset?: number;     // minutes from UTC
      name?: string;       // IANA timezone
    };
  };
}
```

---

#### `privacy:toggle-webrtc`

Enable/disable WebRTC leak protection.

| Property | Value |
|----------|-------|
| Direction | Renderer → Main |
| Rate Limit | 30/minute |

**Request:**
```typescript
{
  tabId?: string;         // Specific tab or global
  enabled: boolean;
}
```

---

#### `privacy:toggle-tracker-blocking`

Enable/disable tracker blocking.

| Property | Value |
|----------|-------|
| Direction | Renderer → Main |
| Rate Limit | 30/minute |

**Request:**
```typescript
{
  tabId?: string;
  enabled: boolean;
  blocklists?: string[];  // 'easylist', 'easyprivacy', 'custom'
}
```

---

### Automation

#### `automation:start-search`

Start an automated search task.

| Property | Value |
|----------|-------|
| Direction | Renderer → Main |
| Rate Limit | 10/minute |

**Request:**
```typescript
{
  keywords: string[];           // max 50 keywords, 100 chars each
  searchEngine: 'google' | 'bing' | 'duckduckgo';
  targetDomains?: string[];     // max 500 domains
  maxResults?: number;          // 1-100, default 10
  
  // Domain targeting options
  bounceRateTarget?: number;    // 0-100
  minReadingTime?: number;      // seconds
  maxReadingTime?: number;      // seconds
  
  // Behavior simulation
  humanLike?: boolean;          // Enable behavior simulation
  scrollPattern?: 'natural' | 'fast' | 'slow';
}
```

**Response:**
```typescript
{
  taskId: string;
  status: 'started' | 'queued';
  estimatedDuration?: number;   // seconds
}
```

---

#### `automation:stop-search`

Stop a running automation task.

| Property | Value |
|----------|-------|
| Direction | Renderer → Main |
| Rate Limit | 20/minute |

**Request:**
```typescript
{
  taskId: string;
}
```

---

#### `automation:add-keyword`

Add keywords to automation queue.

| Property | Value |
|----------|-------|
| Direction | Renderer → Main |
| Rate Limit | 30/minute |

**Request:**
```typescript
{
  keywords: string[];     // max 100 chars each
}
```

---

#### `automation:add-domain`

Add target domains for automation.

| Property | Value |
|----------|-------|
| Direction | Renderer → Main |
| Rate Limit | 30/minute |

**Request:**
```typescript
{
  domains: string[];      // max 255 chars each
  type: 'allowlist' | 'blocklist';
  pattern?: 'exact' | 'wildcard' | 'regex';
}
```

---

#### `automation:get-tasks`

Get automation task status.

| Property | Value |
|----------|-------|
| Direction | Renderer → Main |
| Rate Limit | 100/minute |

**Response:**
```typescript
{
  tasks: Array<{
    id: string;
    type: 'search' | 'visit' | 'creator-support';
    status: 'running' | 'completed' | 'failed' | 'paused';
    progress: number;       // 0-100
    results?: object;
    error?: string;
    startedAt: string;
    completedAt?: string;
  }>;
}
```

---

### Session Management

#### `session:save`

Save current browser session.

| Property | Value |
|----------|-------|
| Direction | Renderer → Main |
| Rate Limit | 10/minute |

**Request:**
```typescript
{
  name: string;           // max 100 chars
  description?: string;   // max 500 chars
  includeTabs?: boolean;  // default true
  includeProxies?: boolean;
  includeFingerprints?: boolean;
}
```

**Response:**
```typescript
{
  sessionId: string;
  name: string;
  createdAt: string;
  tabCount: number;
}
```

---

#### `session:load`

Load a saved session.

| Property | Value |
|----------|-------|
| Direction | Renderer → Main |
| Rate Limit | 10/minute |

**Request:**
```typescript
{
  sessionId: string;
  mergeWithCurrent?: boolean;  // default false (replaces)
}
```

---

#### `session:list`

List all saved sessions.

| Property | Value |
|----------|-------|
| Direction | Renderer → Main |
| Rate Limit | 100/minute |

**Response:**
```typescript
{
  sessions: Array<{
    id: string;
    name: string;
    description?: string;
    tabCount: number;
    createdAt: string;
    lastLoadedAt?: string;
  }>;
}
```

---

## Validation Schemas

All schemas are defined using Zod in `electron/ipc/schemas/index.ts`.

### ProxyConfigSchema

```typescript
import { z } from 'zod';

export const ProxyConfigSchema = z.object({
  host: z.string().min(1).max(255),
  port: z.number().int().min(1).max(65535),
  protocol: z.enum(['http', 'https', 'socks4', 'socks5']),
  username: z.string().max(255).optional(),
  password: z.string().max(255).optional(),
  country: z.string().length(2).optional(),
  region: z.string().max(50).optional(),
  name: z.string().max(100).optional()
});
```

### NavigationSchema

```typescript
export const NavigationSchema = z.object({
  tabId: z.string().uuid(),
  url: z.string().url().max(2048)
});
```

### AutomationConfigSchema

```typescript
export const AutomationConfigSchema = z.object({
  keywords: z.array(z.string().max(100)).max(50),
  targetDomains: z.array(z.string().max(255)).max(500),
  maxResults: z.number().int().min(1).max(100).default(10),
  searchEngine: z.enum(['google', 'bing', 'duckduckgo']).default('google'),
  bounceRateTarget: z.number().min(0).max(100).optional(),
  minReadingTime: z.number().min(0).max(3600).optional(),
  maxReadingTime: z.number().min(0).max(3600).optional(),
  humanLike: z.boolean().default(true)
});
```

---

## Event System

Events are emitted from Main process to Renderer.

### `event:proxy-status-change`

Emitted when proxy status changes.

```typescript
{
  proxyId: string;
  status: 'active' | 'inactive' | 'failed';
  latency?: number;
  error?: string;
}
```

### `event:tab-update`

Emitted when tab state changes.

```typescript
{
  tabId: string;
  url?: string;
  title?: string;
  loading?: boolean;
  favicon?: string;
}
```

### `event:automation-progress`

Emitted during automation tasks.

```typescript
{
  taskId: string;
  progress: number;        // 0-100
  currentAction?: string;
  results?: object;
}
```

### `event:log`

Emitted for activity logging.

```typescript
{
  level: 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
  module?: string;
}
```

---

## Error Handling

### Error Response Format

```typescript
{
  success: false;
  error: {
    code: string;          // Error code
    message: string;       // Human-readable message
    details?: object;      // Additional details
  }
}
```

### Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Input failed Zod validation |
| `RATE_LIMITED` | Too many requests |
| `NOT_FOUND` | Resource not found |
| `SSRF_BLOCKED` | URL blocked by SSRF protection |
| `PROXY_ERROR` | Proxy connection failed |
| `UNAUTHORIZED` | Authentication required |
| `INTERNAL_ERROR` | Server-side error |

---

## Rate Limits

| Channel Category | Limit | Window |
|-----------------|-------|--------|
| proxy:add/remove/update | 50/min | 60s |
| proxy:validate | 20/min | 60s |
| proxy:list | 100/min | 60s |
| tab:* | 100/min | 60s |
| privacy:* | 30/min | 60s |
| automation:start-search | 10/min | 60s |
| automation:* (other) | 30/min | 60s |
| session:save/load | 10/min | 60s |
| session:list | 100/min | 60s |

### Rate Limit Response

When rate limited, the response includes:

```typescript
{
  success: false;
  error: {
    code: 'RATE_LIMITED',
    message: 'Too many requests',
    retryAfter: 30         // seconds until limit resets
  }
}
```

---

## TypeScript Types

For TypeScript users, import types from:

```typescript
// Types are inferred from Zod schemas
import type { z } from 'zod';
import { ProxyConfigSchema, NavigationSchema } from '@/ipc/schemas';

type ProxyConfig = z.infer<typeof ProxyConfigSchema>;
type NavigationPayload = z.infer<typeof NavigationSchema>;
```

---

*For implementation details, see [security.md](./security.md) and source files in `electron/ipc/`.*

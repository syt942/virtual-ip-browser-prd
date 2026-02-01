# API Documentation - Virtual IP Browser

**Last Updated:** 2025-02-01  
**Version:** 1.3.0

## Overview

This document provides comprehensive documentation for all IPC APIs in the Virtual IP Browser. All APIs use Electron's IPC mechanism with Zod validation and rate limiting.

## API Response Format

All IPC handlers return a standardized response format:

```typescript
interface IPCResponse<T> {
  success: boolean;
  data?: T;           // Present when success: true
  error?: string;     // Present when success: false
  retryAfter?: number; // Present when rate limited (ms)
}
```

---

## Proxy Management APIs

### `proxy:add`

Add a new proxy to the system.

**Request Schema:**
```typescript
{
  host: string;           // Required, max 255 chars
  port: number;           // Required, 1-65535
  protocol: 'http' | 'https' | 'socks4' | 'socks5';
  username?: string;      // Optional, max 255 chars
  password?: string;      // Optional, max 255 chars
  name?: string;          // Optional, max 100 chars
  region?: string;        // Optional, max 100 chars
  tags?: string[];        // Optional, max 20 items
}
```

**Response:**
```typescript
{
  success: boolean;
  proxy?: {
    id: string;
    host: string;
    port: number;
    protocol: string;
    name: string;
    status: 'checking' | 'active' | 'failed';
    createdAt: string;
  };
  error?: string;
}
```

**Rate Limit:** 10 requests/minute

**Example:**
```typescript
const result = await window.api.invoke('proxy:add', {
  host: 'proxy.example.com',
  port: 8080,
  protocol: 'http',
  name: 'US Proxy 1'
});
```

---

### `proxy:remove`

Remove a proxy from the system.

**Request:** `string` (UUID)

**Response:**
```typescript
{
  success: boolean;
  error?: string;
}
```

**Rate Limit:** 20 requests/minute

---

### `proxy:list`

Get all configured proxies.

**Request:** None

**Response:**
```typescript
{
  success: boolean;
  proxies?: Array<{
    id: string;
    host: string;
    port: number;
    protocol: string;
    name: string;
    status: 'checking' | 'active' | 'failed';
    latency?: number;
    region?: string;
    tags: string[];
    createdAt: string;
    updatedAt: string;
  }>;
  error?: string;
}
```

**Rate Limit:** 100 requests/minute

---

### `proxy:validate`

Validate a proxy's connectivity.

**Request:** `string` (UUID)

**Response:**
```typescript
{
  success: boolean;
  result?: {
    status: 'active' | 'failed';
    latency?: number;
    error?: string;
  };
  error?: string;
}
```

**Rate Limit:** 20 requests/minute

---

### `proxy:set-rotation`

Configure proxy rotation strategy.

**Request Schema:**
```typescript
{
  strategy: 'round-robin' | 'random' | 'least-used' | 'fastest' | 'failure-aware';
  interval?: number;     // Optional, 0-3600000 ms
  maxFailures?: number;  // Optional, 1-100
}
```

**Response:**
```typescript
{
  success: boolean;
  error?: string;
}
```

**Rate Limit:** 10 requests/minute

---

## Tab Management APIs

### `tab:create`

Create a new isolated browser tab.

**Request Schema:**
```typescript
{
  url?: string;          // Optional, validated URL
  title?: string;        // Optional, max 500 chars
  proxyId?: string;      // Optional, UUID
}
```

**Response:**
```typescript
{
  success: boolean;
  tab?: {
    id: string;
    url: string;
    title: string;
    partition: string;
    proxyId?: string;
    createdAt: string;
  };
  error?: string;
}
```

**Rate Limit:** 50 requests/minute

---

### `tab:close`

Close a browser tab.

**Request:** `string` (UUID)

**Response:**
```typescript
{
  success: boolean;
  error?: string;
}
```

**Rate Limit:** 50 requests/minute

---

### `tab:navigate`

Navigate a tab to a URL.

**Request Schema:**
```typescript
{
  tabId: string;         // Required, UUID
  url: string;           // Required, validated URL
}
```

**Response:**
```typescript
{
  success: boolean;
  error?: string;
}
```

**Rate Limit:** 100 requests/minute

---

### `tab:list`

Get all open tabs.

**Request:** None

**Response:**
```typescript
{
  success: boolean;
  tabs?: Array<{
    id: string;
    url: string;
    title: string;
    partition: string;
    proxyId?: string;
    isActive: boolean;
    isLoading: boolean;
    createdAt: string;
  }>;
  error?: string;
}
```

**Rate Limit:** 100 requests/minute

---

### `tab:assign-proxy`

Assign a proxy to a tab.

**Request Schema:**
```typescript
{
  tabId: string;         // Required, UUID
  proxyId: string | null; // Required, UUID or null for direct
}
```

**Response:**
```typescript
{
  success: boolean;
  error?: string;
}
```

**Rate Limit:** 50 requests/minute

---

## Privacy APIs

### `privacy:set-fingerprint`

Configure fingerprint spoofing settings.

**Request Schema:**
```typescript
{
  canvas?: boolean;           // Default: true
  webgl?: boolean;            // Default: true
  audio?: boolean;            // Default: true
  navigator?: boolean;        // Default: true
  webrtc?: boolean;           // Default: true
  trackerBlocking?: boolean;  // Default: true
  timezone?: string;          // IANA timezone
  language?: string;          // e.g., 'en-US'
  userAgent?: string;         // Custom UA string
  platform?: 'Win32' | 'MacIntel' | 'Linux x86_64';
  hardwareConcurrency?: number; // 1-32
  deviceMemory?: number;      // 1-64 GB
}
```

**Response:**
```typescript
{
  success: boolean;
  error?: string;
}
```

**Rate Limit:** 20 requests/minute

---

### `privacy:toggle-webrtc`

Toggle WebRTC leak protection.

**Request:** `boolean`

**Response:**
```typescript
{
  success: boolean;
  error?: string;
}
```

**Rate Limit:** 30 requests/minute

---

### `privacy:toggle-tracker-blocking`

Toggle tracker blocking.

**Request:** `boolean`

**Response:**
```typescript
{
  success: boolean;
  error?: string;
}
```

**Rate Limit:** 30 requests/minute

---

### `privacy:get-stats`

Get privacy protection statistics.

**Request Schema (optional):**
```typescript
{
  tabId?: string;        // Optional, get stats for specific tab
}
```

**Response:**
```typescript
{
  success: boolean;
  stats?: {
    totalBlocked: number;
    byCategory: {
      ads: number;
      analytics: number;
      social: number;
      cryptomining: number;
      fingerprinting: number;
    };
    webrtcLeaksBlocked: number;
  };
  error?: string;
}
```

**Rate Limit:** 120 requests/minute

---

## Automation APIs

### `automation:start-search`

Start a search automation session.

**Request Schema:**
```typescript
{
  keywords: string[];     // Max 100 items
  engine?: 'google' | 'bing' | 'duckduckgo' | 'yahoo' | 'brave';
  targetDomains?: string[]; // Max 50 items
  maxRetries?: number;    // 0-10, default 3
  delayBetweenSearches?: number; // 1000-60000 ms
  useRandomProxy?: boolean;
  clickThrough?: boolean;
  simulateHumanBehavior?: boolean;
}
```

**Response:**
```typescript
{
  success: boolean;
  sessionId?: string;
  error?: string;
}
```

**Rate Limit:** 5 requests/minute

---

### `automation:stop-search`

Stop a running automation session.

**Request:** `string` (session UUID)

**Response:**
```typescript
{
  success: boolean;
  error?: string;
}
```

**Rate Limit:** 10 requests/minute

---

### `automation:add-keyword`

Add a keyword to the search queue.

**Request:** `string` (keyword, max 200 chars)

**Response:**
```typescript
{
  success: boolean;
  error?: string;
}
```

**Rate Limit:** 50 requests/minute

---

### `automation:add-domain`

Add a target domain for click-through.

**Request:** `string` (domain, max 255 chars)

**Response:**
```typescript
{
  success: boolean;
  error?: string;
}
```

**Rate Limit:** 30 requests/minute

---

### `automation:get-tasks`

Get automation task status.

**Request:** None

**Response:**
```typescript
{
  success: boolean;
  tasks?: Array<{
    id: string;
    keyword: string;
    engine: string;
    status: 'queued' | 'running' | 'completed' | 'failed';
    position?: number;
    error?: string;
    createdAt: string;
    completedAt?: string;
  }>;
  error?: string;
}
```

**Rate Limit:** 60 requests/minute

---

### `automation:schedule`

Schedule an automation task.

**Request Schema:**
```typescript
{
  type: 'one-time' | 'recurring' | 'continuous' | 'custom';
  startTime?: string;     // ISO datetime (required for one-time)
  endTime?: string;       // ISO datetime
  interval?: number;      // 1000-86400000 ms (required for recurring)
  daysOfWeek?: number[];  // 0-6 (Sunday=0)
  cronExpression?: string; // 5-field cron (required for custom)
  task: AutomationConfig;
}
```

**Response:**
```typescript
{
  success: boolean;
  scheduleId?: string;
  nextRunTime?: string;
  error?: string;
}
```

**Rate Limit:** 10 requests/minute

---

## Session APIs

### `session:save`

Save current session state.

**Request:** `string` (session name, max 100 chars)

**Response:**
```typescript
{
  success: boolean;
  sessionId?: string;
  error?: string;
}
```

**Rate Limit:** 10 requests/minute

---

### `session:load`

Load a saved session.

**Request:** `string` (UUID)

**Response:**
```typescript
{
  success: boolean;
  error?: string;
}
```

**Rate Limit:** 10 requests/minute

---

### `session:list`

List all saved sessions.

**Request:** None

**Response:**
```typescript
{
  success: boolean;
  sessions?: Array<{
    id: string;
    name: string;
    tabCount: number;
    createdAt: string;
    updatedAt: string;
  }>;
  error?: string;
}
```

**Rate Limit:** 100 requests/minute

---

## Event Channels (Main → Renderer)

These channels are used for push notifications from main to renderer process.

| Channel | Payload | Description |
|---------|---------|-------------|
| `event:proxy-status-change` | `{ proxyId, status, latency? }` | Proxy status changed |
| `event:tab-update` | `{ tabId, url?, title?, loading? }` | Tab state changed |
| `event:automation-progress` | `{ sessionId, completed, total, failed }` | Automation progress |
| `event:log` | `{ level, category, message, timestamp }` | Activity log entry |

---

## Error Codes

| Error | Description | Resolution |
|-------|-------------|------------|
| `Rate limit exceeded` | Too many requests | Wait for `retryAfter` ms |
| `Validation failed: *` | Input validation error | Check input against schema |
| `Invalid proxy ID` | Proxy not found | Verify UUID exists |
| `Invalid tab ID` | Tab not found | Verify UUID exists |
| `Invalid or blocked URL` | URL failed validation | Use http/https, no private IPs |
| `Host contains invalid characters` | XSS pattern detected | Remove special characters |

---

## Security Considerations

### Input Validation

All inputs are validated using Zod schemas with:
- Length limits to prevent DoS
- Pattern validation to prevent injection
- SSRF protection (private IP blocking)
- XSS pattern detection

### Rate Limiting

Per-channel rate limits prevent abuse:
- Sensitive operations: 5-20 requests/minute
- Read operations: 60-120 requests/minute
- Default: 100 requests/minute

### URL Validation

URLs are validated to prevent SSRF:
- Only `http://` and `https://` protocols allowed
- Private IP ranges blocked (10.x.x.x, 172.16-31.x.x, 192.168.x.x)
- Cloud metadata endpoints blocked (169.254.169.254)
- Credentials in URLs blocked

---

## Related Documentation

- [Architecture](./ARCHITECTURE.md) - System architecture
- [Security](./SECURITY.md) - Security controls
- [Codemaps](./CODEMAPS/INDEX.md) - Module maps

---

**Last Updated:** 2025-02-01 | **Version:** 1.3.0

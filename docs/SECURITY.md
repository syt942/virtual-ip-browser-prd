# Security Controls Documentation

**Last Updated:** 2025-02-01  
**Version:** 1.3.0

## Overview

Virtual IP Browser implements defense-in-depth security with multiple layers of protection across the application stack.

## Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Security Layers                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Layer 1: Process Isolation                                      │
│  ├── Sandbox enabled                                            │
│  ├── Context isolation                                          │
│  ├── Node integration disabled                                  │
│  └── Webview tag disabled                                       │
│                                                                  │
│  Layer 2: Network Security                                       │
│  ├── CSP headers (strict policy)                                │
│  ├── HSTS enforcement                                           │
│  ├── TLS validation                                             │
│  └── Mixed content blocking                                     │
│                                                                  │
│  Layer 3: IPC Security                                          │
│  ├── Zod schema validation                                      │
│  ├── Rate limiting (per-channel)                                │
│  ├── Channel whitelist                                          │
│  └── SSRF/XSS protection                                        │
│                                                                  │
│  Layer 4: Data Security                                          │
│  ├── AES-256-GCM encryption                                     │
│  ├── OS keychain integration                                    │
│  ├── Secure key management                                      │
│  └── Memory clearing on exit                                    │
│                                                                  │
│  Layer 5: Input Sanitization                                     │
│  ├── URL sanitization                                           │
│  ├── Domain validation                                          │
│  ├── Selector sanitization                                      │
│  └── ReDoS protection                                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 1. Content Security Policy (CSP)

### Implementation

CSP headers are applied via `webRequest.onHeadersReceived` in the main process:

```typescript
// electron/main/index.ts
function setupSecurityHeaders(): void {
  const defaultSession = session.defaultSession;
  const cspHeader = generateCSP({ strict: true });
  
  defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };
    
    // Apply CSP to HTML documents
    if (isHtmlDocument(details)) {
      responseHeaders['Content-Security-Policy'] = [cspHeader];
    }
    
    callback({ responseHeaders });
  });
}
```

### CSP Directives

```typescript
// electron/utils/security.ts
export function generateCSP(options: CSPOptions = {}): string {
  return [
    "default-src 'self'",
    "script-src 'self'",              // No unsafe-eval, no unsafe-inline
    "style-src 'self' 'unsafe-inline'", // Required for CSS-in-JS
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https:",
    "frame-ancestors 'none'",          // Clickjacking protection
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",               // Block plugins
    "upgrade-insecure-requests",
    "block-all-mixed-content"
  ].join('; ');
}
```

### CSP Validation

```typescript
export function validateCSP(csp: string): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  if (csp.includes("'unsafe-eval'")) {
    issues.push("Contains 'unsafe-eval' which allows eval()");
  }
  if (/\*(?!\.)/.test(csp)) {
    issues.push("Contains wildcard source");
  }
  if (/script-src[^;]*data:/.test(csp)) {
    issues.push("script-src allows data: URIs");
  }
  if (!csp.includes('frame-ancestors')) {
    issues.push("Missing frame-ancestors directive");
  }
  
  return { valid: issues.length === 0, issues };
}
```

## 2. HTTP Strict Transport Security (HSTS)

### Implementation

```typescript
// electron/main/index.ts
if (details.url.startsWith('https://')) {
  responseHeaders['Strict-Transport-Security'] = [
    'max-age=31536000; includeSubDomains'  // 1 year
  ];
}
```

### Configuration

| Parameter | Value | Description |
|-----------|-------|-------------|
| max-age | 31536000 | 1 year in seconds |
| includeSubDomains | Yes | Apply to all subdomains |
| preload | No | Not submitted to preload list |

## 3. TLS Validation

### Certificate Validation

```typescript
// BrowserWindow configuration
webPreferences: {
  allowRunningInsecureContent: false,  // Block HTTP resources in HTTPS pages
}
```

### Additional Security Headers

```typescript
responseHeaders['X-Content-Type-Options'] = ['nosniff'];
responseHeaders['X-Frame-Options'] = ['DENY'];
responseHeaders['X-XSS-Protection'] = ['1; mode=block'];
responseHeaders['Referrer-Policy'] = ['strict-origin-when-cross-origin'];

// Remove information disclosure headers
delete responseHeaders['x-powered-by'];
delete responseHeaders['server'];
```

## 4. IPC Rate Limiting

### Rate Limiter Implementation

```typescript
// electron/ipc/rate-limiter.ts
export class IPCRateLimiter {
  private readonly channelLimits = new Map([
    // Strict limits for sensitive operations
    ['proxy:add', { windowMs: 60000, maxRequests: 10 }],
    ['automation:start-search', { windowMs: 60000, maxRequests: 5 }],
    ['session:save', { windowMs: 60000, maxRequests: 10 }],
    
    // Higher limits for read operations
    ['proxy:list', { windowMs: 60000, maxRequests: 100 }],
    ['privacy:get-stats', { windowMs: 60000, maxRequests: 120 }],
  ]);

  checkLimit(channel: string): { allowed: boolean; retryAfter: number } {
    // Sliding window rate limiting algorithm
  }
}
```

### Rate Limits by Category

| Category | Channel | Limit | Window |
|----------|---------|-------|--------|
| Proxy (write) | proxy:add | 10/min | 60s |
| Proxy (read) | proxy:list | 100/min | 60s |
| Tab | tab:create | 50/min | 60s |
| Automation | automation:start-search | 5/min | 60s |
| Privacy | privacy:get-stats | 120/min | 60s |
| Session | session:save | 10/min | 60s |

## 5. Input Validation (Zod Schemas)

### SSRF Protection

```typescript
// electron/ipc/validation.ts
function isPrivateOrBlockedIP(hostname: string): boolean {
  const blockedHosts = [
    'localhost', '127.0.0.1', '0.0.0.0', '::1',
    '169.254.169.254',  // AWS metadata
    '169.254.170.2',    // AWS ECS
    'metadata.google.internal',
    'metadata.goog'
  ];
  
  if (blockedHosts.includes(hostname.toLowerCase())) return true;
  
  // Check private IP ranges
  const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipPattern.test(hostname)) {
    const octets = hostname.split('.').map(Number);
    if (octets[0] === 10) return true;                          // 10.x.x.x
    if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return true;  // 172.16-31.x.x
    if (octets[0] === 192 && octets[1] === 168) return true;    // 192.168.x.x
    if (octets[0] === 127) return true;                          // 127.x.x.x
    if (octets[0] === 169 && octets[1] === 254) return true;    // Link-local
  }
  
  return false;
}
```

### XSS Prevention

```typescript
const XSS_PATTERNS = /<script|javascript:|on\w+\s*=|data:text\/html|vbscript:|expression\s*\(/i;

function hasXSSPatterns(value: string): boolean {
  return XSS_PATTERNS.test(value);
}

// Applied in validation schemas
export const ProxyConfigSchema = z.object({
  host: z.string()
    .max(255)
    .transform(sanitize)
    .refine((host) => !hasXSSPatterns(host), { message: 'Host contains invalid characters' }),
  // ...
});
```

### Safe URL Schema

```typescript
export const SafeUrlSchema = z.string()
  .max(2048, 'URL too long')
  .transform(sanitize)
  .refine((url) => {
    try {
      const parsed = new URL(url);
      
      // Only allow http/https
      if (!['http:', 'https:'].includes(parsed.protocol)) return false;
      
      // Block private IPs
      if (isPrivateOrBlockedIP(parsed.hostname)) return false;
      
      // Block credentials in URL
      if (parsed.username || parsed.password) return false;
      
      return true;
    } catch {
      return url.startsWith('/') || url.startsWith('./');  // Allow relative URLs
    }
  });
```

## 6. ReDoS Protection

### Safe Regex Compilation

```typescript
// electron/utils/security.ts
export function compileRegexSafely(pattern: string): RegExp {
  // Check pattern length
  if (pattern.length > 200) {
    throw new Error('Regex pattern too long');
  }

  // Check for known ReDoS patterns
  const redosPatterns = [
    /\([^)]*[+*]\)[+*]/,           // Nested quantifiers: (a+)+
    /\([^)]*\)\{\d+,\d*\}[+*]/,    // Quantified groups: (a){2,}+
    /\(\[[^\]]*\][+*]\)[+*]/,      // Repeated quantified groups
    /\([^)]*\|[^)]*\)[+*]/,        // Quantified alternation
    /\(\.\*\)[+*{]/,               // Multiple wildcards
  ];

  for (const redos of redosPatterns) {
    if (redos.test(pattern)) {
      throw new Error('Potential ReDoS pattern detected');
    }
  }

  return new RegExp(pattern);
}
```

### Input Length Protection

```typescript
export function testRegexSafely(regex: RegExp, input: string, maxLength = 10000): boolean {
  if (input.length > maxLength) {
    throw new Error('Input too long for regex matching');
  }
  return regex.test(input);
}
```

## 7. Credential Encryption

### Encryption Service

```typescript
// electron/database/services/encryption.service.ts
class EncryptionService {
  private masterKey: Buffer | null = null;
  
  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(12);  // 96-bit IV for GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', this.masterKey!, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const authTag = cipher.getAuthTag();
    
    // Format: iv:authTag:ciphertext (all base64)
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
  }
  
  decrypt(ciphertext: string): string {
    const [ivB64, tagB64, dataB64] = ciphertext.split(':');
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(tagB64, 'base64');
    const encrypted = Buffer.from(dataB64, 'base64');
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.masterKey!, iv);
    decipher.setAuthTag(authTag);
    
    return decipher.update(encrypted) + decipher.final('utf8');
  }
  
  destroy(): void {
    if (this.masterKey) {
      this.masterKey.fill(0);  // Securely clear from memory
      this.masterKey = null;
    }
  }
}
```

### OS Keychain Integration

```typescript
// electron/database/services/safe-storage.service.ts
import { safeStorage } from 'electron';

class SafeStorageService {
  isAvailable(): boolean {
    return safeStorage.isEncryptionAvailable();
  }
  
  encrypt(plaintext: string): Buffer {
    return safeStorage.encryptString(plaintext);
  }
  
  decrypt(encrypted: Buffer): string {
    return safeStorage.decryptString(encrypted);
  }
}
```

## 8. IPC Channel Whitelist

### Whitelist Implementation

```typescript
// electron/utils/security.ts
export const IPC_INVOKE_WHITELIST = new Set([
  'proxy:add', 'proxy:remove', 'proxy:update', 'proxy:list',
  'proxy:validate', 'proxy:set-rotation',
  'tab:create', 'tab:close', 'tab:update', 'tab:list',
  'tab:navigate', 'tab:go-back', 'tab:go-forward', 'tab:reload',
  'privacy:set-fingerprint', 'privacy:toggle-webrtc',
  'privacy:toggle-tracker-blocking',
  'automation:start-search', 'automation:stop-search',
  'automation:add-keyword', 'automation:add-domain',
  'automation:get-tasks',
  'session:save', 'session:load', 'session:list',
]);

export const IPC_EVENT_WHITELIST = new Set([
  'proxy:updated', 'proxy:validated',
  'tab:created', 'tab:closed', 'tab:updated',
  'automation:task:completed', 'automation:task:failed',
  'automation:session:updated',
  'privacy:updated',
  'session:saved', 'session:loaded',
]);

export function isChannelAllowed(channel: string, type: 'invoke' | 'event'): boolean {
  const whitelist = type === 'invoke' ? IPC_INVOKE_WHITELIST : IPC_EVENT_WHITELIST;
  return whitelist.has(channel);
}
```

## 9. Input Sanitization Utilities

### URL Sanitization

```typescript
// electron/utils/security.ts
export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string') return '';

  const trimmed = url.trim();
  const dangerousProtocols = ['javascript:', 'vbscript:', 'data:', 'file:', 'about:'];
  
  for (const proto of dangerousProtocols) {
    if (trimmed.toLowerCase().startsWith(proto)) {
      throw new Error(`Dangerous protocol: ${proto}`);
    }
  }

  if (!trimmed.match(/^https?:\/\//i)) {
    return 'https://' + trimmed;
  }

  return trimmed;
}
```

### Domain Sanitization

```typescript
export function sanitizeDomain(domain: string): string {
  if (!domain || typeof domain !== 'string') return '';

  // Remove protocol
  let sanitized = domain.replace(/^https?:\/\//i, '');
  
  // Remove path/query/hash
  sanitized = sanitized.split('/')[0].split('?')[0].split('#')[0];
  
  // Validate format
  if (!/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/.test(sanitized)) {
    throw new Error('Invalid domain format');
  }
  
  if (sanitized.length > 255) {
    throw new Error('Domain too long');
  }

  return sanitized.toLowerCase();
}
```

### CSS Selector Sanitization

```typescript
export function sanitizeSelector(selector: string): string {
  if (!selector || typeof selector !== 'string') {
    throw new Error('Invalid selector');
  }

  if (selector.length > 500) {
    throw new Error('Selector too long');
  }

  if (selector.includes('\x00')) {
    throw new Error('Null byte detected');
  }

  const dangerousPatterns = [
    /<script/i, /javascript:/i, /on\w+\s*=/i,
    /eval\s*\(/i, /expression\s*\(/i, /url\s*\(/i,
    /import\s*\(/i, /@import/i, /binding\s*:/i,
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(selector)) {
      throw new Error('Dangerous pattern detected');
    }
  }
  
  return selector.replace(/[^\w\s.\-#\[\]="':,>+~*()@]/g, '');
}
```

## 10. Process Isolation

### BrowserWindow Security

```typescript
// electron/main/index.ts
mainWindow = new BrowserWindow({
  webPreferences: {
    preload: join(__dirname, '../preload/index.js'),
    nodeIntegration: false,          // No Node.js in renderer
    contextIsolation: true,          // Isolate preload context
    sandbox: true,                   // Enable process sandbox
    webviewTag: false,               // Disable webview
    allowRunningInsecureContent: false,
    experimentalFeatures: false
  }
});
```

## Security Checklist

| Control | Status | Location |
|---------|--------|----------|
| ✅ CSP Headers | Implemented | `electron/main/index.ts` |
| ✅ HSTS | Implemented | `electron/main/index.ts` |
| ✅ TLS Validation | Implemented | BrowserWindow config |
| ✅ IPC Rate Limiting | Implemented | `electron/ipc/rate-limiter.ts` |
| ✅ Input Validation | Implemented | `electron/ipc/validation.ts` |
| ✅ SSRF Protection | Implemented | `electron/ipc/validation.ts` |
| ✅ XSS Prevention | Implemented | `electron/ipc/validation.ts` |
| ✅ ReDoS Protection | Implemented | `electron/utils/security.ts` |
| ✅ Credential Encryption | Implemented | `electron/database/services/` |
| ✅ OS Keychain | Implemented | `safe-storage.service.ts` |
| ✅ Channel Whitelist | Implemented | `electron/utils/security.ts` |
| ✅ Process Isolation | Implemented | `electron/main/index.ts` |

## Related Documentation

- [Architecture](./ARCHITECTURE.md) - System architecture
- [API Reference](./CODEMAPS/api-reference.md) - IPC API documentation
- [Testing](../TESTING.md) - Security testing

---

**Last Updated:** 2025-02-01 | **Version:** 1.3.0

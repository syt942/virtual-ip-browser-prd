# Security Layer Codemap

**Last Updated:** 2025-02-01  
**Version:** 1.3.0

## Overview

The security layer provides defense-in-depth protection across the application stack, including input validation, rate limiting, CSP headers, credential encryption, and process isolation.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Security Architecture                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 Network Security Layer                   │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │   │
│  │  │ CSP Headers │  │    HSTS     │  │TLS Validation│     │   │
│  │  │ (strict)    │  │ (1yr max)   │  │(no insecure) │     │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  IPC Security Layer                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │   │
│  │  │Rate Limiter │  │Zod Validation│  │  Whitelist  │     │   │
│  │  │(per-channel)│  │(type-safe)  │  │ (channels)  │     │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                Input Sanitization Layer                  │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │   │
│  │  │SSRF Protect │  │XSS Prevention│  │ReDoS Protect│     │   │
│  │  │(private IPs)│  │(patterns)   │  │(safe regex) │     │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  Data Security Layer                     │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │   │
│  │  │ Encryption  │  │ OS Keychain │  │Memory Clear │     │   │
│  │  │(AES-256-GCM)│  │(safeStorage)│  │ (on exit)   │     │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## File Structure

```
electron/
├── main/
│   └── index.ts              # Security headers setup
├── ipc/
│   ├── validation.ts         # Zod schemas, SSRF/XSS protection
│   ├── rate-limiter.ts       # Per-channel rate limiting
│   └── channels.ts           # Channel definitions
├── utils/
│   ├── security.ts           # CSP, sanitization, ReDoS protection
│   ├── validation.ts         # Input validation utilities
│   └── error-sanitization.ts # Error message sanitization
└── database/
    └── services/
        ├── encryption.service.ts   # AES-256-GCM encryption
        └── safe-storage.service.ts # OS keychain integration
```

## Key Components

### 1. Security Headers (`electron/main/index.ts`)

```typescript
function setupSecurityHeaders(): void {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };
    
    // CSP for HTML documents
    if (isHtmlDocument(details)) {
      responseHeaders['Content-Security-Policy'] = [generateCSP({ strict: true })];
    }
    
    // HSTS for HTTPS
    if (details.url.startsWith('https://')) {
      responseHeaders['Strict-Transport-Security'] = ['max-age=31536000; includeSubDomains'];
    }
    
    // Additional headers
    responseHeaders['X-Content-Type-Options'] = ['nosniff'];
    responseHeaders['X-Frame-Options'] = ['DENY'];
    responseHeaders['X-XSS-Protection'] = ['1; mode=block'];
    responseHeaders['Referrer-Policy'] = ['strict-origin-when-cross-origin'];
    
    callback({ responseHeaders });
  });
}
```

### 2. CSP Generator (`electron/utils/security.ts`)

```typescript
export function generateCSP(options: CSPOptions = {}): string {
  return [
    "default-src 'self'",
    "script-src 'self'",              // No unsafe-eval
    "style-src 'self' 'unsafe-inline'",
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

### 3. Rate Limiter (`electron/ipc/rate-limiter.ts`)

```typescript
export class IPCRateLimiter {
  private readonly channelLimits = new Map([
    ['proxy:add', { windowMs: 60000, maxRequests: 10 }],
    ['automation:start-search', { windowMs: 60000, maxRequests: 5 }],
    ['privacy:get-stats', { windowMs: 60000, maxRequests: 120 }],
    // ... more channels
  ]);

  checkLimit(channel: string): { allowed: boolean; retryAfter: number } {
    // Sliding window rate limiting
  }
}
```

### 4. Input Validation (`electron/ipc/validation.ts`)

```typescript
// SSRF Protection
function isPrivateOrBlockedIP(hostname: string): boolean {
  const blockedHosts = ['localhost', '127.0.0.1', '169.254.169.254'];
  // Block 10.x.x.x, 172.16-31.x.x, 192.168.x.x
}

// XSS Detection
const XSS_PATTERNS = /<script|javascript:|on\w+\s*=/i;

// Safe URL Schema
export const SafeUrlSchema = z.string()
  .max(2048)
  .refine((url) => {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol) &&
           !isPrivateOrBlockedIP(parsed.hostname);
  });
```

### 5. ReDoS Protection (`electron/utils/security.ts`)

```typescript
export function compileRegexSafely(pattern: string): RegExp {
  if (pattern.length > 200) throw new Error('Pattern too long');
  
  const redosPatterns = [
    /\([^)]*[+*]\)[+*]/,       // Nested quantifiers
    /\(\.\*\)[+*{]/,           // Multiple wildcards
  ];
  
  for (const redos of redosPatterns) {
    if (redos.test(pattern)) throw new Error('ReDoS pattern detected');
  }
  
  return new RegExp(pattern);
}
```

### 6. Encryption Service (`electron/database/services/encryption.service.ts`)

```typescript
class EncryptionService {
  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.masterKey, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
  }

  destroy(): void {
    this.masterKey?.fill(0);  // Clear from memory
  }
}
```

## Security Controls Matrix

| Control | Location | Description |
|---------|----------|-------------|
| CSP Headers | `electron/main/index.ts` | Strict Content Security Policy |
| HSTS | `electron/main/index.ts` | HTTP Strict Transport Security |
| TLS Validation | BrowserWindow config | Block insecure content |
| Rate Limiting | `electron/ipc/rate-limiter.ts` | Per-channel request limits |
| Zod Validation | `electron/ipc/validation.ts` | Type-safe input validation |
| SSRF Protection | `electron/ipc/validation.ts` | Private IP blocking |
| XSS Prevention | `electron/ipc/validation.ts` | Pattern detection |
| ReDoS Protection | `electron/utils/security.ts` | Safe regex compilation |
| Encryption | `encryption.service.ts` | AES-256-GCM |
| Key Storage | `safe-storage.service.ts` | OS keychain |
| Channel Whitelist | `electron/utils/security.ts` | Explicit allow list |
| Process Isolation | `electron/main/index.ts` | Sandbox + context isolation |

## Rate Limits Reference

| Channel Category | Limit | Window |
|------------------|-------|--------|
| Proxy (write) | 10-20 req | 60s |
| Proxy (read) | 100 req | 60s |
| Tab operations | 50-100 req | 60s |
| Automation (sensitive) | 5-10 req | 60s |
| Privacy | 20-120 req | 60s |
| Session | 10 req | 60s |

## Related Modules

- [Architecture](../ARCHITECTURE.md) - System architecture
- [API Documentation](../API_DOCUMENTATION.md) - IPC API reference
- [Database](./database.md) - Encryption storage

---

**Last Updated:** 2025-02-01 | **Version:** 1.3.0

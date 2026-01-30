# Security Layer Codemap

**Last Updated:** 2025-01-28  
**Version:** 1.1.0  
**Entry Points:** `electron/ipc/validation.ts`, `electron/ipc/rate-limiter.ts`, `electron/utils/security.ts`

## Overview

The security layer provides comprehensive protection for all IPC communication, input validation, and attack prevention. Introduced in v1.1.0, it implements enterprise-grade security controls.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SECURITY LAYER                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     INPUT VALIDATION (Zod)                           │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐  │   │
│  │  │ SafeUrlSchema│ │RegexPattern  │ │ DomainSchema │ │ProxyConfig │  │   │
│  │  │ SSRF protect │ │ReDoS protect │ │ XSS prevent  │ │ type-safe  │  │   │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘  │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐  │   │
│  │  │ TabConfig    │ │ Fingerprint  │ │ SessionId    │ │ Keyword    │  │   │
│  │  │ Schema       │ │ ConfigSchema │ │ UUID valid   │ │ Schema     │  │   │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     RATE LIMITING                                    │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐  │   │
│  │  │PerChannel   │ │SlidingWindow │ │ BurstProtect │ │ AutoClean  │  │   │
│  │  │ Limits      │ │ Algorithm    │ │ Detection    │ │ Expired    │  │   │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     SANITIZATION & PREVENTION                        │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐  │   │
│  │  │ sanitizeUrl  │ │sanitizeText  │ │sanitizeCSS   │ │compileRegex│  │   │
│  │  │ protocol chk │ │ HTML encode  │ │ injection    │ │ ReDoS safe │  │   │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     IPC SECURITY                                     │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐  │   │
│  │  │ChannelWL    │ │ContextIso   │ │ PreloadSafe  │ │ CSP Gen    │  │   │
│  │  │ 22 invoke   │ │contextBridge│ │ Sandbox      │ │ Headers    │  │   │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## File Structure

```
electron/
├── ipc/
│   ├── validation.ts        # Zod validation utilities
│   ├── rate-limiter.ts      # Per-channel rate limiting
│   ├── channels.ts          # IPC channel definitions
│   └── schemas/
│       └── index.ts         # Centralized Zod schemas
├── utils/
│   └── security.ts          # Security utilities (sanitization, CSP)
└── database/
    └── services/
        └── encryption.service.ts  # AES-256-GCM encryption
```

## Components

### 1. Input Validation (`validation.ts`)

**Purpose**: Type-safe input validation using Zod schemas

```typescript
// Core validation function
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  input: unknown
): { success: true; data: T } | { success: false; error: string };

// Validated handler wrapper
export function createValidatedHandler<TInput, TOutput>(
  schema: z.ZodSchema<TInput>,
  handler: (data: TInput) => Promise<TOutput>
): (input: unknown) => Promise<{ success: boolean; data?: TOutput; error?: string }>;
```

**Key Schemas** (`schemas/index.ts`):

| Schema | Protection | Validation |
|--------|------------|------------|
| `SafeUrlSchema` | SSRF | Protocol whitelist, private IP blocking |
| `RegexPatternSchema` | ReDoS | Nested quantifier detection |
| `DomainSchema` | XSS | Format validation, dangerous pattern check |
| `KeywordSchema` | XSS | Script injection detection |
| `ProxyConfigSchema` | Type Safety | Host, port, type validation |
| `TabConfigSchema` | Type Safety | URL, proxy, fingerprint validation |
| `FingerprintConfigSchema` | Type Safety | Boolean flags with defaults |
| `SessionIdSchema` | Format | UUID validation |
| `TabIdSchema` | Format | UUID validation |
| `ProxyIdSchema` | Format | UUID validation |

### 2. Rate Limiting (`rate-limiter.ts`)

**Purpose**: Prevent abuse via per-channel sliding window rate limiting

```typescript
class RateLimiter {
  constructor(options: { maxRequests: number; windowMs: number });
  
  checkLimit(key: string): RateLimitResult;
  cleanup(): void;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter?: number;  // Seconds
}

class IPCRateLimitManager {
  getLimiter(channel: string): RateLimiter;
  checkLimit(channel: string): RateLimitResult;
}
```

**Channel Limits**:

| Category | Channels | Max Requests | Window |
|----------|----------|--------------|--------|
| Automation | `automation:*` | 10 | 60s |
| Privacy | `privacy:*` | 20 | 60s |
| Proxy | `proxy:add/remove/validate` | 30 | 60s |
| Navigation | `tab:*` | 60 | 60s |
| Read | `*:list`, `*:get` | 100 | 60s |

### 3. Security Utilities (`security.ts`)

**Purpose**: Common security functions for sanitization and attack prevention

#### URL Sanitization

```typescript
export function sanitizeUrl(url: string): string {
  // 1. Trim and normalize
  // 2. Check dangerous protocols (javascript:, file:, data:, vbscript:)
  // 3. Add https:// if no protocol
  // 4. Return sanitized URL
}
```

#### Text Input Sanitization

```typescript
export function sanitizeTextInput(input: string, maxLength?: number): string {
  // 1. Remove null bytes
  // 2. Trim whitespace
  // 3. Truncate to maxLength
  // 4. HTML entity encode (<, >, &, ", ')
}
```

#### CSS Selector Sanitization

```typescript
export function sanitizeSelector(selector: string): string {
  // 1. Length limit (500 chars)
  // 2. Null byte detection
  // 3. Dangerous pattern detection:
  //    - <script
  //    - javascript:
  //    - on*= event handlers
  //    - eval(, expression(, url(, import(
  //    - @import, binding:, -moz-binding
  // 4. Quote escape detection
  // 5. Balanced bracket validation
}
```

#### ReDoS-Safe Regex

```typescript
export function compileRegexSafely(pattern: string): RegExp {
  // 1. Length limit (200 chars)
  // 2. ReDoS pattern detection:
  //    - (a+)+ nested quantifiers
  //    - (.*)+  wildcard with quantifier
  //    - (a|b)+ alternation with quantifier
  // 3. Syntax validation
}

export function testRegexSafely(regex: RegExp, input: string, maxLength?: number): boolean {
  // 1. Input length limit
  // 2. Safe test execution
}
```

#### Content Security Policy

```typescript
export function generateCSP(options?: CSPOptions): string {
  // Generates strict CSP:
  // - default-src 'self'
  // - script-src 'self' [+ nonce]
  // - frame-ancestors 'none'
  // - object-src 'none'
  // - upgrade-insecure-requests
  // - block-all-mixed-content
}

export function validateCSP(csp: string): { valid: boolean; issues: string[] };
```

### 4. IPC Channel Whitelist

```typescript
export const IPC_INVOKE_WHITELIST = new Set([
  // Proxy (5 channels)
  'proxy:add', 'proxy:remove', 'proxy:update', 'proxy:list', 'proxy:validate',
  'proxy:set-rotation',
  
  // Tab (8 channels)
  'tab:create', 'tab:close', 'tab:update', 'tab:list',
  'tab:navigate', 'tab:go-back', 'tab:go-forward', 'tab:reload',
  
  // Privacy (3 channels)
  'privacy:set-fingerprint', 'privacy:toggle-webrtc', 'privacy:toggle-tracker-blocking',
  
  // Automation (5 channels)
  'automation:start-search', 'automation:stop-search',
  'automation:add-keyword', 'automation:add-domain', 'automation:get-tasks',
  
  // Session (3 channels)
  'session:save', 'session:load', 'session:list',
]);

export const IPC_EVENT_WHITELIST = new Set([
  'proxy:updated', 'proxy:validated',
  'tab:created', 'tab:closed', 'tab:updated',
  'automation:task:completed', 'automation:task:failed', 'automation:session:updated',
  'privacy:updated',
  'session:saved', 'session:loaded',
]);

export function isChannelAllowed(channel: string, type: 'invoke' | 'event'): boolean;
```

## Data Flow

### IPC Request Flow

```
Renderer Process                    Main Process
      │                                  │
      │  ipcRenderer.invoke('proxy:add', data)
      │ ─────────────────────────────────►│
      │                                  │
      │                    ┌─────────────┴─────────────┐
      │                    │  1. Channel Whitelist     │
      │                    │     isChannelAllowed()    │
      │                    ├───────────────────────────┤
      │                    │  2. Rate Limit Check      │
      │                    │     rateLimiter.checkLimit│
      │                    ├───────────────────────────┤
      │                    │  3. Input Validation      │
      │                    │     validateInput(schema) │
      │                    ├───────────────────────────┤
      │                    │  4. Handler Execution     │
      │                    │     proxyManager.addProxy │
      │                    └─────────────┬─────────────┘
      │                                  │
      │◄─────────────────────────────────│
      │  { success: true, proxy: {...} }
```

### Attack Prevention Flow

```
Input → URL Schema → SSRF Check → Protocol Check → IP Range Check → ALLOW/DENY
          │
          └─→ Regex Schema → Length Check → ReDoS Pattern Check → Syntax Check → ALLOW/DENY
                    │
                    └─→ CSS Schema → Length Check → Injection Check → Bracket Check → ALLOW/DENY
```

## Integration Example

```typescript
// In IPC handler setup (electron/ipc/handlers/index.ts)
import { validateInput, ProxyConfigSchema } from '../validation';
import { getIPCRateLimiter } from '../rate-limiter';
import { isChannelAllowed } from '../../utils/security';

export function setupIpcHandlers(context: HandlerContext) {
  const rateLimiter = getIPCRateLimiter();

  ipcMain.handle('proxy:add', async (_event, config) => {
    // Layer 1: Channel whitelist (in preload.ts)
    // Already validated by contextBridge exposure

    // Layer 2: Rate limiting
    const rateCheck = rateLimiter.checkLimit('proxy:add');
    if (!rateCheck.allowed) {
      return { 
        success: false, 
        error: 'Rate limit exceeded',
        retryAfter: rateCheck.retryAfter 
      };
    }

    // Layer 3: Input validation
    const validation = validateInput(ProxyConfigSchema, config);
    if (!validation.success) {
      return { success: false, error: validation.error };
    }

    // Layer 4: Business logic with validated data
    try {
      const proxy = await context.proxyManager.addProxy(validation.data);
      return { success: true, proxy };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });
}
```

## Testing

### Security Test Files

| File | Tests | Coverage |
|------|-------|----------|
| `security-fixes.test.ts` | 45 | Input validation, sanitization |
| `comprehensive-security.test.ts` | 63 | Full security audit |

### Running Security Tests

```bash
# All security tests
npm test -- --grep "security"

# Specific test file
npm test -- tests/unit/security-fixes.test.ts

# With coverage
npm test -- --coverage --grep "security"
```

### Test Categories

- **Zod Validation**: Schema compliance, error messages
- **Rate Limiting**: Limit enforcement, cleanup, retry-after
- **ReDoS Protection**: Pattern detection, safe compilation
- **SSRF Prevention**: IP blocking, protocol whitelist
- **CSS Sanitization**: Injection detection, encoding

## Security Metrics

| Metric | Value | Target |
|--------|-------|--------|
| Test Coverage | 93%+ | >80% |
| Security Tests | 108 | - |
| Vulnerabilities Fixed | 7 | 0 remaining |
| Rate Limit Channels | 22 | All invoke |
| Validated Schemas | 12 | All input types |

## Related Documentation

- [SECURITY.md](../../SECURITY.md) - Comprehensive security guide
- [api-reference.md](./api-reference.md) - IPC channel documentation
- [COMPREHENSIVE_SECURITY_AUDIT.md](../../COMPREHENSIVE_SECURITY_AUDIT.md) - Security audit report

---

*Last Updated: 2025-01-28*

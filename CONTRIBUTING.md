# Contributing to Virtual IP Browser

Thank you for your interest in contributing to Virtual IP Browser! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Setup](#development-setup)
4. [Coding Standards](#coding-standards)
5. [Pull Request Process](#pull-request-process)
6. [Testing Requirements](#testing-requirements)
7. [Documentation](#documentation)
8. [Issue Guidelines](#issue-guidelines)

---

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment. We expect all contributors to:

- Be respectful and constructive in discussions
- Welcome newcomers and help them get started
- Focus on the best outcome for the project
- Accept constructive criticism gracefully

---

## Getting Started

### Prerequisites

- **Node.js**: >= 18.0.0
- **npm**: >= 8.0.0
- **Git**: Latest stable version
- **IDE**: VS Code recommended (with ESLint and TypeScript extensions)

### Fork and Clone

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/virtual-ip-browser.git
cd virtual-ip-browser

# Add upstream remote
git remote add upstream https://github.com/virtualipbrowser/virtual-ip-browser.git

# Install dependencies
npm install
```

---

## Development Setup

### Environment Configuration

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your configuration (optional for development)
```

### Running Development Server

```bash
# Start development mode with hot reload
npm run dev

# Run type checking
npm run typecheck

# Run linter
npm run lint
```

### Project Structure Overview

```
virtual-ip-browser/
├── electron/                 # Main process (Electron)
│   ├── core/                # Core modules
│   │   ├── proxy-engine/    # Proxy management
│   │   ├── automation/      # Web automation
│   │   ├── privacy/         # Privacy protection
│   │   ├── creator-support/ # Creator support (EP-007)
│   │   └── translation/     # Translation (EP-008)
│   ├── database/            # SQLite persistence
│   ├── ipc/                 # IPC handlers & validation
│   └── main/                # Entry point & preload
├── src/                     # Renderer process (React)
│   ├── components/          # React components
│   ├── stores/              # Zustand state management
│   ├── hooks/               # Custom React hooks
│   └── utils/               # Utility functions
├── tests/                   # Test suites
│   ├── unit/               # Unit tests
│   ├── integration/        # Integration tests
│   └── e2e/                # End-to-end tests
└── docs/                    # Documentation
    └── CODEMAPS/           # Architecture codemaps
```

---

## Coding Standards

### TypeScript Guidelines

1. **Strict Mode**: All code must pass `strict` TypeScript checks
2. **Explicit Types**: Use explicit return types for public functions
3. **No `any`**: Avoid `any` type; use `unknown` if type is truly unknown
4. **Interfaces over Types**: Prefer `interface` for object shapes

```typescript
// ✅ Good
interface ProxyConfig {
  host: string;
  port: number;
  protocol: 'http' | 'https' | 'socks4' | 'socks5';
}

export function validateProxy(config: ProxyConfig): boolean {
  // Implementation
}

// ❌ Bad
export function validateProxy(config: any) {
  // No type safety
}
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files (TS/TSX) | kebab-case | `proxy-manager.ts` |
| Classes | PascalCase | `ProxyManager` |
| Interfaces | PascalCase | `ProxyConfig` |
| Functions | camelCase | `validateProxy` |
| Constants | UPPER_SNAKE_CASE | `MAX_PROXIES` |
| React Components | PascalCase | `ProxyPanel.tsx` |

### Code Organization

1. **Imports**: Group and order imports
   ```typescript
   // 1. Node.js built-ins
   import { EventEmitter } from 'events';
   import path from 'path';
   
   // 2. External packages
   import { z } from 'zod';
   import React from 'react';
   
   // 3. Internal modules
   import { logger } from '../utils/logger';
   import type { ProxyConfig } from './types';
   ```

2. **File Structure**:
   ```typescript
   // 1. Imports
   // 2. Types/Interfaces
   // 3. Constants
   // 4. Helper functions
   // 5. Main class/component
   // 6. Exports
   ```

### React Component Guidelines

1. **Functional Components**: Use functional components with hooks
2. **Props Interface**: Define explicit props interface
3. **Memoization**: Use `useMemo` and `useCallback` for performance

```typescript
// ✅ Good
interface ProxyPanelProps {
  proxies: ProxyConfig[];
  onAdd: (proxy: ProxyConfig) => void;
  onRemove: (id: string) => void;
}

export const ProxyPanel: React.FC<ProxyPanelProps> = ({ 
  proxies, 
  onAdd, 
  onRemove 
}) => {
  const sortedProxies = useMemo(
    () => [...proxies].sort((a, b) => a.host.localeCompare(b.host)),
    [proxies]
  );
  
  return (
    <div className="proxy-panel">
      {/* Implementation */}
    </div>
  );
};
```

### Security Requirements

All contributions must follow security best practices:

1. **Input Validation**: Use Zod schemas for all IPC handlers
2. **No Eval**: Never use `eval()` or `new Function()`
3. **Sanitize User Input**: Sanitize CSS selectors and URLs
4. **Parameterized Queries**: Use parameterized SQL queries

```typescript
// ✅ Good - Validated input
ipcMain.handle('proxy:add', async (_, data) => {
  const validated = ProxyConfigSchema.parse(data);
  return proxyManager.addProxy(validated);
});

// ❌ Bad - Unvalidated input
ipcMain.handle('proxy:add', async (_, data) => {
  return proxyManager.addProxy(data);
});
```

---

## Pull Request Process

### Branch Naming

Use descriptive branch names with prefixes:

| Prefix | Purpose | Example |
|--------|---------|---------|
| `feature/` | New features | `feature/geographic-rotation` |
| `fix/` | Bug fixes | `fix/proxy-validation-error` |
| `docs/` | Documentation | `docs/update-api-reference` |
| `refactor/` | Code refactoring | `refactor/proxy-manager` |
| `test/` | Test additions | `test/add-rotation-tests` |

### Commit Messages

Follow conventional commits format:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style (formatting)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(proxy): add geographic rotation strategy

Implements region-based proxy selection with:
- Preferred region configuration
- Fallback strategy support
- Country exclusion lists

Closes #123
```

### PR Checklist

Before submitting a PR, ensure:

- [ ] Code passes `npm run typecheck`
- [ ] Code passes `npm run lint`
- [ ] All tests pass `npm test`
- [ ] New features have tests (>80% coverage)
- [ ] Documentation updated (if applicable)
- [ ] CHANGELOG.md updated (for features/fixes)
- [ ] No console.log statements (use logger)
- [ ] Security guidelines followed

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix (non-breaking change fixing an issue)
- [ ] New feature (non-breaking change adding functionality)
- [ ] Breaking change (fix or feature causing existing functionality to change)
- [ ] Documentation update

## Testing
Describe testing performed

## Checklist
- [ ] My code follows the project coding standards
- [ ] I have performed a self-review
- [ ] I have added tests for my changes
- [ ] All new and existing tests pass
- [ ] I have updated documentation

## Related Issues
Closes #(issue number)
```

### Review Process

1. **Automated Checks**: CI must pass (lint, typecheck, tests)
2. **Code Review**: At least 1 maintainer approval required
3. **Security Review**: Security-related changes require security team review
4. **Documentation**: Docs must be updated for new features

---

## Testing Requirements

### Test Coverage Targets

| Category | Minimum Coverage |
|----------|-----------------|
| Unit Tests | 80% |
| Integration Tests | 70% |
| Security Tests | 100% |

### Writing Tests

#### Unit Tests (Vitest)

```typescript
// tests/unit/proxy-manager.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { ProxyManager } from '../../electron/core/proxy-engine/manager';

describe('ProxyManager', () => {
  let manager: ProxyManager;

  beforeEach(() => {
    manager = new ProxyManager();
  });

  describe('addProxy', () => {
    it('should add a valid proxy', () => {
      const proxy = {
        host: '192.168.1.1',
        port: 8080,
        protocol: 'http' as const
      };
      
      const result = manager.addProxy(proxy);
      
      expect(result.id).toBeDefined();
      expect(result.host).toBe(proxy.host);
    });

    it('should reject invalid port', () => {
      const proxy = {
        host: '192.168.1.1',
        port: 99999, // Invalid
        protocol: 'http' as const
      };
      
      expect(() => manager.addProxy(proxy)).toThrow();
    });
  });
});
```

#### Integration Tests

```typescript
// tests/integration/ipc-communication.test.ts
import { describe, it, expect } from 'vitest';

describe('IPC Communication', () => {
  it('should validate proxy:add input', async () => {
    // Test IPC validation
  });
});
```

#### E2E Tests (Playwright)

```typescript
// tests/e2e/proxy-management.spec.ts
import { test, expect } from '@playwright/test';

test('should add proxy through UI', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-testid="add-proxy"]');
  // ...
});
```

### Running Tests

```bash
# Run all unit tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- proxy-manager.test.ts

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e -- --ui
```

---

## Documentation

### When to Update Documentation

- Adding new features → Update README.md, CODEMAPS
- Changing APIs → Update api-reference.md
- Security changes → Update SECURITY_CONSOLIDATED.md
- Bug fixes with user impact → Update CHANGELOG.md

### Documentation Files

| File | Purpose |
|------|---------|
| README.md | Project overview, quick start |
| CONTRIBUTING.md | This file |
| CHANGELOG.md | Version history |
| docs/ARCHITECTURE.md | System architecture |
| docs/CODEMAPS/*.md | Module-specific documentation |
| docs/SECURITY_CONSOLIDATED.md | Security documentation |

### JSDoc Comments

Add JSDoc comments to public APIs:

```typescript
/**
 * Validates a proxy configuration and tests connectivity.
 * 
 * @param config - The proxy configuration to validate
 * @param timeout - Connection timeout in milliseconds (default: 5000)
 * @returns Promise resolving to validation result
 * @throws {ValidationError} If config is invalid
 * 
 * @example
 * ```typescript
 * const result = await validateProxy({
 *   host: '192.168.1.1',
 *   port: 8080,
 *   protocol: 'http'
 * });
 * console.log(result.latency); // 150ms
 * ```
 */
export async function validateProxy(
  config: ProxyConfig,
  timeout: number = 5000
): Promise<ValidationResult> {
  // Implementation
}
```

---

## Issue Guidelines

### Bug Reports

Include:
1. **Environment**: OS, Node.js version, app version
2. **Steps to Reproduce**: Detailed steps
3. **Expected Behavior**: What should happen
4. **Actual Behavior**: What actually happens
5. **Screenshots/Logs**: If applicable

### Feature Requests

Include:
1. **Problem Statement**: What problem does this solve?
2. **Proposed Solution**: How should it work?
3. **Alternatives Considered**: Other approaches
4. **Additional Context**: Mockups, examples

### Issue Labels

| Label | Description |
|-------|-------------|
| `bug` | Something isn't working |
| `feature` | New feature request |
| `security` | Security-related issue |
| `documentation` | Documentation improvement |
| `good first issue` | Good for newcomers |
| `help wanted` | Extra attention needed |

---

## Getting Help

- **Documentation**: Check docs/ folder
- **Issues**: Search existing issues
- **Discussions**: Use GitHub Discussions for questions

---

## Recognition

Contributors will be recognized in:
- CONTRIBUTORS.md file
- Release notes for significant contributions
- Project README acknowledgments

Thank you for contributing to Virtual IP Browser! 🚀

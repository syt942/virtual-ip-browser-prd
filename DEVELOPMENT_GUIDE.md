# Virtual IP Browser - Development Guide

Complete guide for developers working on the Virtual IP Browser project.

---

## 🎯 Development Setup

### Prerequisites

- **Node.js** 18+ (LTS recommended)
- **Git** for version control
- **Code Editor** (VS Code recommended)
- **Terminal** (bash, zsh, or PowerShell)

### Initial Setup

```bash
# Clone the repository
cd virtual-ip-browser

# Install dependencies
npm install

# Verify installation
npm run typecheck
npm run lint
```

---

## 🏗️ Project Structure

### Directory Layout

```
virtual-ip-browser/
├── electron/               # Main process code
│   ├── main/              # App initialization
│   ├── core/              # Core business logic
│   ├── ipc/               # IPC communication
│   ├── database/          # SQLite database
│   └── utils/             # Utilities
├── src/                   # Renderer process (React)
│   ├── components/        # React components
│   ├── stores/            # Zustand state
│   ├── hooks/             # Custom hooks
│   └── utils/             # Frontend utilities
├── tests/                 # Test suites
│   ├── unit/             # Unit tests
│   ├── integration/       # Integration tests
│   └── e2e/              # End-to-end tests
├── docs/                  # Documentation
└── resources/             # Static resources
```

### Key Files

| File | Purpose |
|------|---------|
| `electron/main/index.ts` | Main process entry |
| `src/App.tsx` | React app root |
| `electron.vite.config.ts` | Build configuration |
| `package.json` | Dependencies & scripts |
| `tsconfig.json` | TypeScript config |

---

## 🔧 Development Workflow

### Running the App

```bash
# Development mode (hot-reload)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

### Code Quality

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Auto-fix lint issues
npm run lint -- --fix

# Format code (if Prettier configured)
npm run format
```

### Testing

```bash
# Run unit tests
npm test

# Watch mode
npm test -- --watch

# Coverage report
npm test -- --coverage

# E2E tests
npm run test:e2e
```

---

## 📝 Coding Standards

### TypeScript

- ✅ Always use TypeScript (no `.js` files)
- ✅ Enable `strict` mode
- ✅ Define interfaces for all data structures
- ✅ Avoid `any` type (use `unknown` if needed)
- ✅ Use proper return types

### React Components

```typescript
// ✅ Good: Functional component with types
interface Props {
  title: string;
  onClick: () => void;
}

export const MyComponent: React.FC<Props> = ({ title, onClick }) => {
  return <button onClick={onClick}>{title}</button>;
};

// ❌ Bad: No types, no proper structure
export const MyComponent = (props) => {
  return <button>{props.title}</button>;
};
```

### State Management

```typescript
// ✅ Good: Zustand store with types
interface TabState {
  tabs: Tab[];
  addTab: (tab: Tab) => void;
}

export const useTabStore = create<TabState>((set) => ({
  tabs: [],
  addTab: (tab) => set((state) => ({ 
    tabs: [...state.tabs, tab] 
  }))
}));
```

### Error Handling

```typescript
// ✅ Good: Comprehensive error handling
try {
  const result = await dangerousOperation();
  return { success: true, data: result };
} catch (error) {
  console.error('[Module] Operation failed:', error);
  return { 
    success: false, 
    error: error instanceof Error ? error.message : 'Unknown error' 
  };
}
```

---

## 🧪 Testing Guidelines

### Unit Tests

```typescript
// tests/unit/example.test.ts
import { describe, it, expect } from 'vitest';
import { myFunction } from '../../src/utils';

describe('myFunction', () => {
  it('should do something', () => {
    const result = myFunction(input);
    expect(result).toBe(expected);
  });

  it('should handle errors', () => {
    expect(() => myFunction(badInput)).toThrow();
  });
});
```

### Integration Tests

```typescript
// tests/integration/ipc.test.ts
describe('IPC Communication', () => {
  it('should add proxy via IPC', async () => {
    const result = await window.api.proxy.add({
      name: 'Test',
      host: 'proxy.com',
      port: 8080,
      protocol: 'http'
    });
    
    expect(result.success).toBe(true);
    expect(result.proxy).toBeDefined();
  });
});
```

### E2E Tests

```typescript
// tests/e2e/proxy.spec.ts
import { test, expect } from '@playwright/test';

test('user can add proxy', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-testid="proxy-button"]');
  await page.click('[data-testid="add-proxy"]');
  await page.fill('[data-testid="proxy-name"]', 'Test Proxy');
  // ... fill form
  await page.click('[data-testid="save"]');
  await expect(page.locator('[data-testid="proxy-item"]')).toContainText('Test Proxy');
});
```

---

## 🔌 IPC Communication

### Adding New IPC Channel

1. **Define channel in `ipc/channels.ts`**:
```typescript
export const IPC_CHANNELS = {
  // ... existing channels
  MY_NEW_CHANNEL: 'my:new-channel'
} as const;
```

2. **Create handler**:
```typescript
// ipc/handlers/my-handler.ts
ipcMain.handle(IPC_CHANNELS.MY_NEW_CHANNEL, async (_event, arg) => {
  try {
    const result = await doSomething(arg);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});
```

3. **Expose in preload**:
```typescript
// main/preload.ts
contextBridge.exposeInMainWorld('api', {
  // ... existing API
  myNewApi: {
    action: (arg) => ipcRenderer.invoke(IPC_CHANNELS.MY_NEW_CHANNEL, arg)
  }
});
```

4. **Use in renderer**:
```typescript
const result = await window.api.myNewApi.action(data);
```

---

## 🗄️ Database Operations

### Adding a New Table

1. **Update `database/schema.sql`**:
```sql
CREATE TABLE IF NOT EXISTS my_table (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_my_table_name ON my_table(name);
```

2. **Create repository** (optional):
```typescript
// database/repositories/my-repository.ts
export class MyRepository {
  constructor(private db: DatabaseManager) {}
  
  async create(data: MyData): Promise<MyData> {
    const sql = 'INSERT INTO my_table (id, name) VALUES (?, ?)';
    this.db.execute(sql, [data.id, data.name]);
    return data;
  }
  
  async getAll(): Promise<MyData[]> {
    const sql = 'SELECT * FROM my_table';
    return this.db.query(sql);
  }
}
```

---

## 🎨 UI Development

### Adding New Component

```typescript
// src/components/MyComponent.tsx
import { useState } from 'react';

interface Props {
  title: string;
}

export const MyComponent: React.FC<Props> = ({ title }) => {
  const [count, setCount] = useState(0);
  
  return (
    <div className="p-4 border rounded-lg">
      <h2 className="text-lg font-semibold">{title}</h2>
      <button 
        onClick={() => setCount(c => c + 1)}
        className="mt-2 px-4 py-2 bg-primary text-primary-foreground rounded"
      >
        Count: {count}
      </button>
    </div>
  );
};
```

### Using Zustand Store

```typescript
import { useTabStore } from '@stores/tabStore';

export const TabList: React.FC = () => {
  const { tabs, addTab, removeTab } = useTabStore();
  
  return (
    <div>
      {tabs.map(tab => (
        <div key={tab.id}>
          {tab.title}
          <button onClick={() => removeTab(tab.id)}>Close</button>
        </div>
      ))}
      <button onClick={() => addTab({ url: 'https://google.com' })}>
        New Tab
      </button>
    </div>
  );
};
```

---

## 🐛 Debugging

### Main Process

```typescript
// electron/main/index.ts
console.log('[Main] Debug info:', data);

// Or use logger
logger.info('main', 'Something happened', { data });
```

### Renderer Process

```typescript
// src/components/MyComponent.tsx
console.log('[MyComponent] State:', state);

// DevTools will show this
```

### IPC Debugging

```typescript
// Enable IPC logging
ipcMain.handle('channel', async (_event, arg) => {
  console.log('[IPC] Received:', arg);
  const result = await handler(arg);
  console.log('[IPC] Returning:', result);
  return result;
});
```

---

## 📦 Building & Packaging

### Development Build

```bash
npm run build
```

### Production Packaging

```bash
# All platforms
npm run package

# Specific platforms
npm run package:win
npm run package:mac
npm run package:linux
```

### Build Configuration

Edit `electron.vite.config.ts`:
```typescript
export default defineConfig({
  main: {
    // Main process config
  },
  preload: {
    // Preload config
  },
  renderer: {
    // Renderer config
  }
});
```

---

## 🔐 Security Best Practices

1. ✅ **Always use contextIsolation**
2. ✅ **Disable nodeIntegration in renderer**
3. ✅ **Validate all IPC inputs**
4. ✅ **Use session partitions for tab isolation**
5. ✅ **Never store secrets in code**
6. ✅ **Enable sandbox for BrowserViews**

---

## 📚 Resources

- [Electron Docs](https://www.electronjs.org/docs)
- [React Docs](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Zustand Guide](https://docs.pmnd.rs/zustand/)
- [TailwindCSS Docs](https://tailwindcss.com/docs)
- [Vitest Guide](https://vitest.dev/guide/)
- [Playwright Docs](https://playwright.dev/)

---

## 💡 Tips & Tricks

### Hot-Reload Issues

```bash
# Clear cache and restart
rm -rf .vite dist dist-electron
npm run dev
```

### Type Errors

```bash
# Regenerate types
npm run typecheck
```

### Database Issues

```bash
# Reset database (will lose data!)
rm ~/.config/virtual-ip-browser/*.db
npm run dev
```

---

## 🔒 Security Best Practices (v1.3.0)

### Encryption Key Handling

```typescript
// ✅ CORRECT: Use SafeStorageService for sensitive data
import { getSafeStorageService } from '../database/services/safe-storage.service';

const safeStorage = getSafeStorageService();
await safeStorage.initialize();
const encrypted = safeStorage.encrypt(sensitiveData);

// ❌ WRONG: Never use hardcoded keys
const BAD_KEY = 'my-secret-key'; // DO NOT DO THIS
```

### Pattern Matching (ReDoS Prevention)

```typescript
// ✅ CORRECT: Use PatternMatcher for URL matching
import { PatternMatcher } from '../privacy/pattern-matcher';

const matcher = new PatternMatcher();
matcher.initialize(patterns);
const matches = matcher.matches(url); // O(n), safe

// ❌ WRONG: Never use user input in regex directly
const regex = new RegExp(userInput); // ReDoS vulnerability!
```

### URL Validation

```typescript
// ✅ CORRECT: Always validate URLs
import { SafeUrlSchema } from '../ipc/validation';

const result = SafeUrlSchema.safeParse(url);
if (!result.success) {
  throw new Error('Invalid URL');
}

// ❌ WRONG: Never trust stored URLs without validation
const session = loadSession(id);
navigate(session.tabs[0].url); // Could be javascript: or SSRF!
```

### IPC Handler Security

```typescript
// ✅ CORRECT: Validate all IPC inputs
ipcMain.handle('my:channel', async (_, data) => {
  const validated = MySchema.parse(data); // Zod validation
  return processData(validated);
});

// ❌ WRONG: Never trust renderer input
ipcMain.handle('my:channel', async (_, data) => {
  return processData(data); // Unvalidated input!
});
```

---

## 🔄 Database Migrations

### Creating a New Migration

1. Create migration file in `electron/database/migrations/`:
```sql
-- Migration: 00X_description
-- Description: What this migration does
-- Created: YYYY-MM-DD
-- Backwards Compatible: Yes/No

-- Your SQL here
CREATE INDEX IF NOT EXISTS idx_new_index ON table_name(column);

-- Record migration
INSERT OR IGNORE INTO schema_migrations (version, name, checksum)
VALUES ('00X', 'description', 'checksum');
```

2. Create embedded SQL in `electron/database/migrations/embedded-sql/`:
```typescript
// 00X-description.sql.ts
export const migration00X = `
-- Migration SQL here
`;
```

3. Register in `electron/database/migrations/index.ts`

4. Create rollback script:
```sql
-- 00X_rollback.sql
DROP INDEX IF EXISTS idx_new_index;
DELETE FROM schema_migrations WHERE version = '00X';
```

### Testing Migrations

```bash
# Run migration tests
npm test -- tests/unit/database/migration-00X.test.ts

# Verify migration in development
npm run dev
# Check logs for migration output
```

---

## 🎨 Magic UI Component Integration

### Adding New Components

1. Create component in `src/components/ui/`:
```tsx
// my-component.tsx
'use client';

import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';

interface MyComponentProps {
  className?: string;
  // ... props
}

export function MyComponent({ className, ...props }: MyComponentProps) {
  return (
    <motion.div
      className={cn('base-styles', className)}
      // ... animation props
    >
      {/* Component content */}
    </motion.div>
  );
}
```

2. Export from `src/components/ui/index.ts`

3. Add tests in `tests/unit/ui/`

### Animation Performance

- Use `will-change: transform` for animated elements
- Implement `IntersectionObserver` for off-screen optimization
- Always support `prefers-reduced-motion`:

```tsx
const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

const variants = prefersReducedMotion
  ? { initial: {}, animate: {} }
  : { initial: { opacity: 0 }, animate: { opacity: 1 } };
```

---

## 🤝 Contributing

1. Create feature branch
2. Write tests for new features
3. Ensure all tests pass
4. Update documentation
5. Follow security best practices
6. Submit pull request

### Security Review Required

The following changes require security review before merging:
- Any changes to `electron/ipc/` handlers
- Changes to encryption or key handling
- URL validation or navigation logic
- Pattern matching or regex usage
- Database schema changes

---

*Happy coding! 🚀*

*Last Updated: January 2025 (v1.3.0)*

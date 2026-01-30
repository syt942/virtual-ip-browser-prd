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

## 🤝 Contributing

1. Create feature branch
2. Write tests for new features
3. Ensure all tests pass
4. Update documentation
5. Submit pull request

---

*Happy coding! 🚀*

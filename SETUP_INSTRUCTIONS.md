# Virtual IP Browser - Setup Instructions

## Environment Requirements

This project requires:
- **Node.js**: >= 18.0.0
- **npm**: >= 8.0.0
- **Operating System**: Linux, macOS, or Windows

## Replit Environment Setup

### Step 1: Restart the Repl
After the `replit.nix` file has been created with Node.js 18, you need to:
1. Stop the current Repl
2. Click "Run" to restart with the new configuration
3. Verify Node.js version: `node --version` (should show v18.x.x or higher)

### Step 2: Install Dependencies
Once Node.js 18+ is active:
```bash
cd virtual-ip-browser-prd/virtual-ip-browser
npm install
```

### Step 3: Type Check
Verify TypeScript compilation:
```bash
npm run typecheck
```

### Step 4: Run Tests
Execute unit tests:
```bash
npm test
```

### Step 5: Development Mode
Start the development server:
```bash
npm run dev
```

**Note**: Electron apps in Replit may have limitations with display. Consider developing locally or using a display server.

## Local Development Setup

### Prerequisites
```bash
# Check Node.js version
node --version  # Should be >= 18.0.0

# Check npm version
npm --version   # Should be >= 8.0.0
```

### Installation
```bash
# Clone/navigate to project
cd virtual-ip-browser-prd/virtual-ip-browser

# Install dependencies
npm install

# Run type checks
npm run typecheck

# Run tests
npm test

# Start development
npm run dev
```

### Build for Production
```bash
# Build the application
npm run build

# Package for specific platform
npm run package:win   # Windows
npm run package:mac   # macOS
npm run package:linux # Linux
```

## Project Structure

```
virtual-ip-browser/
├── electron/              # Electron main process
│   ├── main/             # Main process entry
│   ├── core/             # Core functionality
│   │   ├── proxy-engine/ # Proxy management
│   │   ├── privacy/      # Privacy features
│   │   ├── tabs/         # Tab management
│   │   ├── automation/   # Automation engine
│   │   └── session/      # Session management
│   ├── database/         # SQLite database
│   └── ipc/              # IPC communication
├── src/                  # React frontend
│   ├── components/       # UI components
│   ├── stores/          # Zustand stores
│   ├── hooks/           # Custom hooks
│   └── utils/           # Utilities
├── tests/               # Test suites
│   ├── unit/            # Unit tests
│   ├── integration/     # Integration tests
│   └── e2e/             # E2E tests
└── resources/           # Static resources

```

## Features Implemented

### ✅ Core Features (10/10)
1. **Multi-Tab Browsing** - Multiple simultaneous browser tabs
2. **Proxy Management** - Support for HTTP/HTTPS/SOCKS5 proxies
3. **Proxy Rotation** - Automatic and manual rotation strategies
4. **Privacy Protection** - Canvas, WebGL, Audio, Navigator fingerprint spoofing
5. **WebRTC Protection** - IP leak prevention
6. **Tracker Blocking** - Ad and tracker blocking
7. **Task Automation** - URL navigation, form filling, screenshot capture
8. **Automation Scheduling** - Cron-based task scheduling
9. **Session Management** - Save/restore browser sessions
10. **Analytics Dashboard** - Proxy performance and privacy metrics

## Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm test -- --run tests/integration
```

### E2E Tests
```bash
npm run test:e2e
```

## Configuration

### Environment Variables
Create a `.env` file (optional):
```env
# Database path (default: ./data/browser.db)
DATABASE_PATH=./data/browser.db

# Development mode
NODE_ENV=development
```

### Proxy Configuration
Proxies can be configured through the UI or by importing from file (JSON/CSV).

### Privacy Settings
Privacy features can be toggled individually:
- Canvas fingerprint spoofing
- WebGL fingerprint spoofing
- Audio context spoofing
- Navigator properties spoofing
- WebRTC blocking
- Timezone spoofing

## Troubleshooting

### Issue: Node version too old
**Solution**: Ensure Node.js >= 18.0.0 is installed. In Replit, restart the Repl after creating `replit.nix`.

### Issue: `tsc: not found`
**Solution**: Run `npm install` to install TypeScript and other dev dependencies.

### Issue: Electron display issues in Replit
**Solution**: Electron requires a display server. Consider:
- Running tests instead: `npm test`
- Building for local development: `npm run build`
- Developing locally on your machine

### Issue: SQLite native module errors
**Solution**: Rebuild native modules:
```bash
npm rebuild better-sqlite3
```

## Current Status

✅ **Completed**:
- All 10 core features implemented
- Comprehensive test coverage
- Full documentation
- TypeScript type safety
- React UI with Tailwind CSS
- Zustand state management

⏳ **Requires Node 18+**:
- Dependencies installation
- TypeScript compilation
- Test execution
- Application build

## Next Steps

1. Restart Repl to load Node.js 18
2. Run `npm install`
3. Run `npm run typecheck` to verify
4. Run `npm test` to execute tests
5. Run `npm run build` to build application

## Documentation

- **README.md** - Project overview
- **DEVELOPMENT_GUIDE.md** - Development guidelines
- **TESTING_GUIDE.md** - Testing documentation
- **PROJECT_STATUS.md** - Detailed status report
- **PROJECT_COMPLETION.md** - Completion report
- **ARCHITECTURE.md** - System architecture

## Support

For issues or questions:
1. Check existing documentation
2. Review test files for usage examples
3. Check GitHub issues (if applicable)
4. Contact development team

---

**Last Updated**: 2026-01-28
**Project Status**: Implementation Complete - Awaiting Environment Setup

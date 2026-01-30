# Getting Started with Virtual IP Browser

This guide will help you get the Virtual IP Browser up and running on your machine.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18.x or higher ([Download](https://nodejs.org/))
- **npm** (comes with Node.js) or **bun** package manager
- **Git** for version control

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd virtual-ip-browser
```

### 2. Install Dependencies

Using npm:
```bash
npm install
```

Using bun (faster alternative):
```bash
bun install
```

This will install all required dependencies including:
- Electron 34.5.8
- React 19.2.3
- TypeScript 5.6.3
- And all other dependencies listed in package.json

### 3. Set Up Environment (Optional)

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` if you need to customize any settings.

## Running the Application

### Development Mode

Start the development server with hot-reload:

```bash
npm run dev
```

This will:
1. Start the Vite development server (React UI)
2. Launch Electron with the main process
3. Open the browser window with DevTools
4. Enable hot-reload for instant updates

### First Launch

On first launch, the application will:
1. Create a SQLite database in your user data directory
2. Initialize the database schema
3. Set up default configuration
4. Open the main browser window

## Project Structure Overview

```
virtual-ip-browser/
├── electron/           # Main process code
│   ├── main/          # Application entry point
│   ├── core/          # Core modules (proxy, tabs, privacy)
│   ├── ipc/           # IPC handlers
│   └── database/      # Database layer
├── src/               # Renderer process (React UI)
│   ├── components/    # React components
│   ├── stores/        # State management
│   └── hooks/         # Custom hooks
└── docs/              # Documentation
```

## Basic Usage

### Adding Your First Proxy

1. Launch the application
2. Click the "Proxy" button in the bottom toolbar
3. Click "Add Proxy" button
4. Enter proxy details:
   - Name: e.g., "US Proxy 1"
   - Host: e.g., "proxy.example.com"
   - Port: e.g., "8080"
   - Protocol: Select HTTP/HTTPS/SOCKS4/SOCKS5
   - Username/Password (if required)
5. Click "Save"

The proxy will be automatically validated and added to your list.

### Creating a Tab with Proxy

1. Open the Proxy panel
2. Select a proxy from the list
3. Click "New Tab with Proxy" (or create new tab and assign proxy)
4. The tab will use the selected proxy for all requests

### Configuring Privacy Settings

1. Click the "Privacy" button in the bottom toolbar
2. Enable fingerprint protection features:
   - Canvas Fingerprint
   - WebGL Fingerprint
   - Audio Fingerprint
   - Navigator Spoofing
3. Enable WebRTC protection
4. Configure timezone spoofing
5. Settings are applied to new tabs immediately

### Using Automation

1. Click the "Automation" button
2. Select a search engine (Google, Bing, etc.)
3. Add keywords (one per line)
4. Add target domains to visit
5. Click "Start" to begin automation

## Development Workflow

### Running Tests

Unit tests:
```bash
npm test
```

Unit tests in watch mode:
```bash
npm test -- --watch
```

End-to-end tests:
```bash
npm run test:e2e
```

### Type Checking

```bash
npm run typecheck
```

### Linting

```bash
npm run lint
```

Fix linting issues automatically:
```bash
npm run lint -- --fix
```

### Building for Production

Build the application:
```bash
npm run build
```

Package for distribution:
```bash
# All platforms
npm run package

# Specific platform
npm run package:win      # Windows
npm run package:mac      # macOS
npm run package:linux    # Linux
```

The packaged application will be in the `release/` directory.

## Database Location

The SQLite database is stored in:

- **Windows**: `%APPDATA%\virtual-ip-browser\virtual-ip-browser.db`
- **macOS**: `~/Library/Application Support/virtual-ip-browser/virtual-ip-browser.db`
- **Linux**: `~/.config/virtual-ip-browser/virtual-ip-browser.db`

You can inspect the database using any SQLite client.

## Troubleshooting

### Application Won't Start

1. Check Node.js version: `node --version` (should be 18+)
2. Clear node_modules: `rm -rf node_modules && npm install`
3. Check for port conflicts (default: 5173)
4. Check console for error messages

### Proxies Not Working

1. Verify proxy credentials are correct
2. Test proxy connection manually
3. Check proxy status in the Proxy panel
4. Look at activity logs for error messages
5. Ensure firewall isn't blocking connections

### Database Errors

1. Close all instances of the application
2. Delete the database file (location above)
3. Restart the application (will recreate database)

### Build Errors

1. Clear build cache: `rm -rf dist dist-electron`
2. Reinstall dependencies: `npm install`
3. Check for TypeScript errors: `npm run typecheck`

## New Features Quick Start

### Advanced Proxy Rotation

The browser now supports 10 rotation strategies. To use the new advanced strategies:

```typescript
// Geographic - select proxies by region
{ strategy: 'geographic', excludeCountries: ['CN'], preferredRegions: ['US-CA'] }

// Sticky-session - maintain domain-proxy mapping
{ strategy: 'sticky-session', stickySessionTTL: 3600000 }

// Time-based - rotate on schedule
{ strategy: 'time-based', interval: 300000, jitterPercent: 20 }

// Custom rules - conditional logic
{ strategy: 'custom', rules: [...] }
```

### Creator Support (EP-007)

Support your favorite content creators on YouTube, Twitch, and Medium:

1. Navigate to a creator's channel or video
2. The platform will be automatically detected
3. Ad viewing will simulate human-like engagement
4. Track your support sessions in the analytics

### Translation (EP-008)

Translate search keywords for geographic targeting:

1. Select a geographic proxy
2. Keywords are automatically translated to the local language
3. Search results can be translated back to your language
4. Supports 30+ languages

### Magic UI Components

The UI now includes enhanced animated components:
- **NumberTicker** - Animated statistics display
- **BorderBeam** - Visual highlights on important elements
- **PulsatingButton** - Call-to-action buttons

## Next Steps

- Read the [Architecture Documentation](./ARCHITECTURE.md)
- Explore the [Codemaps](./CODEMAPS/INDEX.md) for detailed module documentation
- Check the [API Reference](./CODEMAPS/api-reference.md)
- Review individual module guides:
  - [Proxy Engine](./CODEMAPS/proxy-engine.md)
  - [Automation](./CODEMAPS/automation.md)
  - [Creator Support](./CODEMAPS/creator-support.md)
  - [Translation](./CODEMAPS/translation.md)

## Getting Help

If you encounter issues:

1. Check the [Troubleshooting](#troubleshooting) section above
2. Search existing [GitHub Issues](https://github.com/yourusername/virtual-ip-browser/issues)
3. Create a new issue with:
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable
   - System information (OS, Node version)

## Contributing

Interested in contributing? Check out our [Contributing Guidelines](../CONTRIBUTING.md)!

---

**Happy browsing with privacy! 🔒**

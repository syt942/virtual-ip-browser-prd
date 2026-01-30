#!/bin/bash
# Virtual IP Browser - Setup Verification Script

echo "================================"
echo "Virtual IP Browser - Setup Check"
echo "================================"
echo ""

# Check Node.js version
echo "1. Checking Node.js version..."
NODE_VERSION=$(node --version)
echo "   Current: $NODE_VERSION"
NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')

if [ "$NODE_MAJOR" -ge 18 ]; then
    echo "   ✅ Node.js version is compatible"
else
    echo "   ❌ Node.js version must be >= 18.0.0"
    echo "   Please restart the Repl to load Node.js 18 from replit.nix"
    exit 1
fi
echo ""

# Check npm version
echo "2. Checking npm version..."
NPM_VERSION=$(npm --version)
echo "   Current: $NPM_VERSION"
echo "   ✅ npm is available"
echo ""

# Check if node_modules exists
echo "3. Checking dependencies..."
if [ -d "node_modules" ]; then
    echo "   ✅ node_modules folder exists"
else
    echo "   ⚠️  node_modules not found"
    echo "   Run: npm install"
fi
echo ""

# Check if TypeScript is available
echo "4. Checking TypeScript..."
if command -v tsc &> /dev/null; then
    TSC_VERSION=$(tsc --version)
    echo "   ✅ TypeScript is installed: $TSC_VERSION"
else
    echo "   ⚠️  TypeScript not found"
    echo "   Run: npm install"
fi
echo ""

# Check project structure
echo "5. Checking project structure..."
REQUIRED_DIRS=("electron" "src" "tests" "resources")
ALL_PRESENT=true

for dir in "${REQUIRED_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo "   ✅ $dir/ exists"
    else
        echo "   ❌ $dir/ missing"
        ALL_PRESENT=false
    fi
done
echo ""

# Summary
echo "================================"
echo "Summary"
echo "================================"
if [ "$NODE_MAJOR" -ge 18 ] && [ "$ALL_PRESENT" = true ]; then
    echo "✅ Environment is ready!"
    echo ""
    echo "Next steps:"
    echo "  1. npm install      # Install dependencies"
    echo "  2. npm run typecheck # Verify TypeScript"
    echo "  3. npm test         # Run tests"
    echo "  4. npm run dev      # Start development"
else
    echo "⚠️  Environment needs setup"
    echo ""
    if [ "$NODE_MAJOR" -lt 18 ]; then
        echo "  • Restart Repl to load Node.js 18"
    fi
    if [ "$ALL_PRESENT" = false ]; then
        echo "  • Project structure incomplete"
    fi
fi
echo ""

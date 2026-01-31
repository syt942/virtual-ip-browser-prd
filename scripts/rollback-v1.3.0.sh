#!/bin/bash
# ==========================================================================
# Virtual IP Browser v1.3.0 Rollback Script (Linux/macOS)
# ==========================================================================
# This script helps users rollback from v1.3.0 to v1.2.1
# 
# Usage: 
#   chmod +x rollback-v1.3.0.sh
#   ./rollback-v1.3.0.sh
#
# Requirements:
#   - curl or wget
#   - Internet connection
# ==========================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
RELEASE_URL="https://github.com/virtualipbrowser/virtual-ip-browser/releases/download/v1.2.1"
VERSION="1.2.1"

echo -e "${CYAN}"
echo "=========================================="
echo "Virtual IP Browser v1.3.0 Rollback Script"
echo "=========================================="
echo -e "${NC}"

# Detect platform
PLATFORM=$(uname -s)
ARCH=$(uname -m)

echo -e "${YELLOW}Detected Platform:${NC} $PLATFORM ($ARCH)"

# Determine config directory
if [ "$PLATFORM" = "Darwin" ]; then
    CONFIG_DIR="$HOME/Library/Application Support/virtual-ip-browser"
    APP_NAME="Virtual IP Browser"
else
    CONFIG_DIR="$HOME/.config/virtual-ip-browser"
    APP_NAME="virtual-ip-browser"
fi

BACKUP_DIR="$CONFIG_DIR/backup-v1.2.x"
DB_FILE="$CONFIG_DIR/virtual-ip-browser.db"

echo -e "${YELLOW}Config Directory:${NC} $CONFIG_DIR"

# ==========================================================================
# Step 1: Close application
# ==========================================================================
echo ""
echo -e "${CYAN}Step 1: Closing application...${NC}"

if [ "$PLATFORM" = "Darwin" ]; then
    osascript -e "quit app \"$APP_NAME\"" 2>/dev/null || true
fi
pkill -f "$APP_NAME" 2>/dev/null || true
pkill -f virtual-ip-browser 2>/dev/null || true
sleep 2

echo -e "${GREEN}✓ Application closed${NC}"

# ==========================================================================
# Step 2: Check for backup
# ==========================================================================
echo ""
echo -e "${CYAN}Step 2: Checking for backup...${NC}"

if [ -d "$BACKUP_DIR" ]; then
    echo -e "${GREEN}✓ Backup found at: $BACKUP_DIR${NC}"
    
    echo ""
    read -p "Do you want to restore from backup? (y/n): " RESTORE_BACKUP
    
    if [ "$RESTORE_BACKUP" = "y" ] || [ "$RESTORE_BACKUP" = "Y" ]; then
        echo "  Restoring backup..."
        
        # Create a safety backup of current state
        SAFETY_BACKUP="$CONFIG_DIR/pre-rollback-backup-$(date +%Y%m%d-%H%M%S)"
        mkdir -p "$SAFETY_BACKUP"
        cp -r "$CONFIG_DIR"/*.db "$SAFETY_BACKUP"/ 2>/dev/null || true
        cp -r "$CONFIG_DIR"/*.json "$SAFETY_BACKUP"/ 2>/dev/null || true
        echo -e "${YELLOW}  Safety backup created: $SAFETY_BACKUP${NC}"
        
        # Restore from v1.2.x backup
        cp -r "$BACKUP_DIR"/* "$CONFIG_DIR"/
        echo -e "${GREEN}✓ Backup restored${NC}"
    else
        echo -e "${YELLOW}⚠ Skipping backup restore${NC}"
        echo "  Note: Proxy credentials may need to be re-entered"
    fi
else
    echo -e "${YELLOW}⚠ No backup found at: $BACKUP_DIR${NC}"
    echo "  Note: Proxy credentials may need to be re-entered after rollback"
fi

# ==========================================================================
# Step 3: Download v1.2.1
# ==========================================================================
echo ""
echo -e "${CYAN}Step 3: Downloading v1.2.1...${NC}"

# Determine download file based on platform
if [ "$PLATFORM" = "Darwin" ]; then
    if [ "$ARCH" = "arm64" ]; then
        DOWNLOAD_FILE="Virtual-IP-Browser-${VERSION}-arm64.dmg"
    else
        DOWNLOAD_FILE="Virtual-IP-Browser-${VERSION}.dmg"
    fi
else
    # Linux
    echo ""
    echo "Select package format:"
    echo "  1) AppImage (recommended, portable)"
    echo "  2) .deb (Debian/Ubuntu)"
    echo "  3) .rpm (Fedora/RHEL)"
    read -p "Enter choice [1-3]: " PKG_CHOICE
    
    case $PKG_CHOICE in
        2)
            DOWNLOAD_FILE="virtual-ip-browser_${VERSION}_amd64.deb"
            ;;
        3)
            DOWNLOAD_FILE="virtual-ip-browser-${VERSION}.x86_64.rpm"
            ;;
        *)
            DOWNLOAD_FILE="Virtual-IP-Browser-${VERSION}-x86_64.AppImage"
            ;;
    esac
fi

echo -e "${YELLOW}Downloading:${NC} $DOWNLOAD_FILE"

DOWNLOAD_PATH="/tmp/$DOWNLOAD_FILE"

# Download using curl or wget
if command -v curl &> /dev/null; then
    curl -L -o "$DOWNLOAD_PATH" "$RELEASE_URL/$DOWNLOAD_FILE" --progress-bar
elif command -v wget &> /dev/null; then
    wget -O "$DOWNLOAD_PATH" "$RELEASE_URL/$DOWNLOAD_FILE" --show-progress
else
    echo -e "${RED}✗ Error: Neither curl nor wget found${NC}"
    echo "  Please install curl or wget and try again"
    exit 1
fi

if [ -f "$DOWNLOAD_PATH" ]; then
    echo -e "${GREEN}✓ Download complete: $DOWNLOAD_PATH${NC}"
else
    echo -e "${RED}✗ Download failed${NC}"
    exit 1
fi

# ==========================================================================
# Step 4: Installation
# ==========================================================================
echo ""
echo -e "${CYAN}Step 4: Installation...${NC}"

if [ "$PLATFORM" = "Darwin" ]; then
    echo "  Opening DMG installer..."
    open "$DOWNLOAD_PATH"
    echo ""
    echo -e "${YELLOW}Installation Instructions:${NC}"
    echo "  1. Drag 'Virtual IP Browser' to Applications folder"
    echo "  2. Replace existing application when prompted"
    echo "  3. Launch from Applications"
    
elif [[ "$DOWNLOAD_FILE" == *.AppImage ]]; then
    chmod +x "$DOWNLOAD_PATH"
    echo -e "${GREEN}✓ AppImage ready${NC}"
    echo ""
    echo -e "${YELLOW}To run:${NC}"
    echo "  $DOWNLOAD_PATH"
    echo ""
    read -p "Move to /opt/virtual-ip-browser/? (requires sudo) (y/n): " MOVE_OPT
    if [ "$MOVE_OPT" = "y" ] || [ "$MOVE_OPT" = "Y" ]; then
        sudo mkdir -p /opt/virtual-ip-browser
        sudo mv "$DOWNLOAD_PATH" /opt/virtual-ip-browser/
        echo -e "${GREEN}✓ Installed to /opt/virtual-ip-browser/${NC}"
    fi
    
elif [[ "$DOWNLOAD_FILE" == *.deb ]]; then
    echo "  Installing .deb package..."
    sudo dpkg -i "$DOWNLOAD_PATH"
    echo -e "${GREEN}✓ Installed via dpkg${NC}"
    
elif [[ "$DOWNLOAD_FILE" == *.rpm ]]; then
    echo "  Installing .rpm package..."
    if command -v dnf &> /dev/null; then
        sudo dnf install -y "$DOWNLOAD_PATH"
    elif command -v yum &> /dev/null; then
        sudo yum install -y "$DOWNLOAD_PATH"
    elif command -v zypper &> /dev/null; then
        sudo zypper install -y "$DOWNLOAD_PATH"
    fi
    echo -e "${GREEN}✓ Installed via package manager${NC}"
fi

# ==========================================================================
# Step 5: Verification
# ==========================================================================
echo ""
echo -e "${CYAN}Step 5: Post-Rollback Verification${NC}"
echo ""
echo "Please verify the following after launching the application:"
echo "  [ ] Application starts without errors"
echo "  [ ] All proxies are visible in the Proxy panel"
echo "  [ ] Proxy credentials work (test connection)"
echo "  [ ] Saved sessions are accessible"
echo ""

# ==========================================================================
# Complete
# ==========================================================================
echo -e "${GREEN}"
echo "=========================================="
echo "Rollback preparation complete!"
echo "=========================================="
echo -e "${NC}"

echo "If you encounter issues:"
echo "  • GitHub Issues: https://github.com/virtualipbrowser/virtual-ip-browser/issues"
echo "  • Rollback Guide: docs/ROLLBACK_PLAN_V1.3.0.md"
echo ""

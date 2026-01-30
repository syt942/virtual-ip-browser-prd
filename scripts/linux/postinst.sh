#!/bin/bash
# Post-installation script for Virtual IP Browser
# This script runs after the .deb package is installed

set -e

# Update desktop database
if command -v update-desktop-database &> /dev/null; then
    update-desktop-database -q /usr/share/applications 2>/dev/null || true
fi

# Update icon cache
if command -v gtk-update-icon-cache &> /dev/null; then
    gtk-update-icon-cache -q -t -f /usr/share/icons/hicolor 2>/dev/null || true
fi

# Update mime database
if command -v update-mime-database &> /dev/null; then
    update-mime-database /usr/share/mime 2>/dev/null || true
fi

# Set proper permissions for chrome-sandbox (required for Electron)
INSTALL_DIR="/opt/Virtual IP Browser"
if [ -f "$INSTALL_DIR/chrome-sandbox" ]; then
    chown root:root "$INSTALL_DIR/chrome-sandbox"
    chmod 4755 "$INSTALL_DIR/chrome-sandbox"
fi

# Create symlink in /usr/bin for easy command-line access
if [ ! -L /usr/bin/virtual-ip-browser ]; then
    ln -sf "$INSTALL_DIR/virtual-ip-browser" /usr/bin/virtual-ip-browser 2>/dev/null || true
fi

echo "Virtual IP Browser installed successfully!"
echo "Run 'virtual-ip-browser' or find it in your applications menu."

exit 0

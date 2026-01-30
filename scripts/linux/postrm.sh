#!/bin/bash
# Post-removal script for Virtual IP Browser
# This script runs after the .deb package is removed

set -e

# Only run on complete removal, not upgrade
if [ "$1" = "remove" ] || [ "$1" = "purge" ]; then
    # Remove symlink
    if [ -L /usr/bin/virtual-ip-browser ]; then
        rm -f /usr/bin/virtual-ip-browser 2>/dev/null || true
    fi

    # Update desktop database
    if command -v update-desktop-database &> /dev/null; then
        update-desktop-database -q /usr/share/applications 2>/dev/null || true
    fi

    # Update icon cache
    if command -v gtk-update-icon-cache &> /dev/null; then
        gtk-update-icon-cache -q -t -f /usr/share/icons/hicolor 2>/dev/null || true
    fi

    # Clean up user data on purge
    if [ "$1" = "purge" ]; then
        # Remove application data directories
        rm -rf /home/*/.config/virtual-ip-browser 2>/dev/null || true
        rm -rf /home/*/.local/share/virtual-ip-browser 2>/dev/null || true
        echo "Virtual IP Browser user data removed."
    fi

    echo "Virtual IP Browser removed successfully."
fi

exit 0

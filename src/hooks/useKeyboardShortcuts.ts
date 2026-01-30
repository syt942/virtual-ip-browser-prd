/**
 * Keyboard Shortcuts Hook
 * Handles global keyboard shortcuts
 */

import { useEffect, useCallback } from 'react';

interface ShortcutHandler {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  handler: () => void;
}

export function useKeyboardShortcuts(shortcuts: ShortcutHandler[]) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    for (const shortcut of shortcuts) {
      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatch = shortcut.ctrlKey === undefined || event.ctrlKey === shortcut.ctrlKey;
      const shiftMatch = shortcut.shiftKey === undefined || event.shiftKey === shortcut.shiftKey;
      const altMatch = shortcut.altKey === undefined || event.altKey === shortcut.altKey;

      if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
        event.preventDefault();
        shortcut.handler();
        return;
      }
    }
  }, [shortcuts]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// Pre-defined shortcuts for the app
export function useAppShortcuts({
  onNewTab,
  onCloseTab,
  onReload,
  onToggleProxy,
  onTogglePrivacy,
  onToggleAutomation,
  onFocusAddressBar,
}: {
  onNewTab?: () => void;
  onCloseTab?: () => void;
  onReload?: () => void;
  onToggleProxy?: () => void;
  onTogglePrivacy?: () => void;
  onToggleAutomation?: () => void;
  onFocusAddressBar?: () => void;
}) {
  const shortcuts: ShortcutHandler[] = [
    // Tab management
    { key: 't', ctrlKey: true, handler: onNewTab || (() => {}) },
    { key: 'w', ctrlKey: true, handler: onCloseTab || (() => {}) },
    
    // Navigation
    { key: 'r', ctrlKey: true, handler: onReload || (() => {}) },
    { key: 'F5', handler: onReload || (() => {}) },
    { key: 'l', ctrlKey: true, handler: onFocusAddressBar || (() => {}) },
    
    // Panels
    { key: 'p', ctrlKey: true, shiftKey: true, handler: onToggleProxy || (() => {}) },
    { key: 'v', ctrlKey: true, shiftKey: true, handler: onTogglePrivacy || (() => {}) },
    { key: 'a', ctrlKey: true, shiftKey: true, handler: onToggleAutomation || (() => {}) },
  ];

  useKeyboardShortcuts(shortcuts);
}

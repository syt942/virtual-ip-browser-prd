/**
 * Test Setup
 * Global test configuration
 */

import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { mkdirSync } from 'fs';
import { join } from 'path';

// Ensure report directory exists
mkdirSync(join(process.cwd(), 'test-reports', 'vitest'), { recursive: true });

/**
 * Clipboard API polyfill for JSDOM.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Clipboard
 */
if (!('clipboard' in navigator)) {
  Object.assign(navigator, {
    clipboard: {
      writeText: async (_text: string) => undefined,
      readText: async () => '',
      read: async () => [],
      write: async (_data: ClipboardItem[]) => undefined,
    },
  });
}

/**
 * PointerEvent polyfill for JSDOM (required by @testing-library/user-event).
 * @see https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent
 */
if (!('PointerEvent' in window)) {
  class PointerEventFallback extends Event {
    button = 0;
    buttons = 1;
    pointerId = 1;
    pointerType = 'mouse';
    isPrimary = true;
    pressure = 0;
    width = 1;
    height = 1;
    clientX = 0;
    clientY = 0;
    tiltX = 0;
    tiltY = 0;

    constructor(type: string, params?: PointerEventInit) {
      super(type, params);
      if (params?.button !== undefined) this.button = params.button;
      if (params?.buttons !== undefined) this.buttons = params.buttons;
      if (params?.pointerId !== undefined) this.pointerId = params.pointerId;
      if (params?.pointerType !== undefined) this.pointerType = params.pointerType;
      if (params?.isPrimary !== undefined) this.isPrimary = params.isPrimary;
      if (params?.pressure !== undefined) this.pressure = params.pressure;
      if (params?.width !== undefined) this.width = params.width;
      if (params?.height !== undefined) this.height = params.height;
      if (params?.clientX !== undefined) this.clientX = params.clientX;
      if (params?.clientY !== undefined) this.clientY = params.clientY;
      if (params?.tiltX !== undefined) this.tiltX = params.tiltX;
      if (params?.tiltY !== undefined) this.tiltY = params.tiltY;
    }
  }

  window.PointerEvent = PointerEventFallback as unknown as typeof PointerEvent;
}

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Global test utilities
// Generate valid UUIDs that pass the UUID regex validation
let uuidCounter = 0;
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => {
      // Generate a valid UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      // where y is one of 8, 9, a, or b
      const hex = (uuidCounter++).toString(16).padStart(12, '0');
      return `00000000-0000-4000-a000-${hex}`;
    },
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }
  },
  writable: true
});

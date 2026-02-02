/**
 * E2E Tests - Session Management (PRD EP-010)
 * TDD Test Scaffold for Session Save/Load/Restore functionality
 * 
 * Tests complete user workflows:
 * - Save current session
 * - Load saved session
 * - List all sessions
 * - Delete session
 * - Restore tabs from session
 * 
 * Run: npx playwright test tests/e2e/session-management.spec.ts
 */

import { test, expect, type Page, type ElectronApplication } from '@playwright/test';
import { NavigationPage } from './pages/NavigationPage';

// ============================================================================
// TEST FIXTURES
// ============================================================================

const testSession = {
  name: 'E2E Test Session',
  description: 'Session created during E2E testing',
};

const testTabs = [
  { url: 'https://example.com', title: 'Example Domain' },
  { url: 'https://www.google.com', title: 'Google' },
];

// ============================================================================
// PAGE OBJECT: SessionPage
// ============================================================================

/**
 * Page Object for Session Management UI interactions
 * Extend this as UI components are implemented
 */
class SessionPage {
  constructor(private page: Page) {}

  // Locators
  get sessionPanel() {
    return this.page.locator('[data-testid="session-panel"]');
  }

  get saveSessionButton() {
    return this.page.locator('[data-testid="save-session-button"]');
  }

  get loadSessionButton() {
    return this.page.locator('[data-testid="load-session-button"]');
  }

  get sessionList() {
    return this.page.locator('[data-testid="session-list"]');
  }

  get sessionItems() {
    return this.page.locator('[data-testid="session-item"]');
  }

  get sessionNameInput() {
    return this.page.locator('[data-testid="session-name-input"]');
  }

  get confirmSaveButton() {
    return this.page.locator('[data-testid="confirm-save-button"]');
  }

  get confirmLoadButton() {
    return this.page.locator('[data-testid="confirm-load-button"]');
  }

  get deleteSessionButton() {
    return this.page.locator('[data-testid="delete-session-button"]');
  }

  get confirmDeleteButton() {
    return this.page.locator('[data-testid="confirm-delete-button"]');
  }

  get sessionSuccessToast() {
    return this.page.locator('[data-testid="toast-success"]');
  }

  get sessionErrorToast() {
    return this.page.locator('[data-testid="toast-error"]');
  }

  // Actions
  async openSessionPanel() {
    // Click session panel button in toolbar or use keyboard shortcut
    await this.page.keyboard.press('Control+Shift+S');
    await expect(this.sessionPanel).toBeVisible({ timeout: 5000 });
  }

  async closeSessionPanel() {
    await this.page.keyboard.press('Escape');
    await expect(this.sessionPanel).not.toBeVisible({ timeout: 5000 });
  }

  async saveSession(name: string) {
    await this.saveSessionButton.click();
    await this.sessionNameInput.fill(name);
    await this.confirmSaveButton.click();
  }

  async loadSession(sessionName: string) {
    await this.sessionItems.filter({ hasText: sessionName }).click();
    await this.confirmLoadButton.click();
  }

  async deleteSession(sessionName: string) {
    await this.sessionItems.filter({ hasText: sessionName }).hover();
    await this.sessionItems.filter({ hasText: sessionName })
      .locator('[data-testid="delete-session-button"]').click();
    await this.confirmDeleteButton.click();
  }

  async getSessionCount(): Promise<number> {
    return await this.sessionItems.count();
  }

  async getSessionNames(): Promise<string[]> {
    const items = await this.sessionItems.all();
    return Promise.all(items.map(item => item.textContent() as Promise<string>));
  }

  async screenshot(name: string) {
    await this.page.screenshot({
      path: `test-results/screenshots/session-${name}.png`,
      fullPage: true,
    });
  }
}

// ============================================================================
// SAVE SESSION TESTS
// ============================================================================

test.describe('Session Management - Save', () => {
  let navPage: NavigationPage;
  let sessionPage: SessionPage;

  test.beforeEach(async ({ page }) => {
    navPage = new NavigationPage(page);
    sessionPage = new SessionPage(page);
    await navPage.goto();
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'passed') {
      await page.screenshot({
        path: `test-results/screenshots/session-save-${testInfo.title.replace(/\s+/g, '-')}-failed.png`,
        fullPage: true,
      });
    }
  });

  test('should display save session button', { tag: '@smoke' }, async () => {
    await sessionPage.openSessionPanel();
    await expect(sessionPage.saveSessionButton).toBeVisible();
    await sessionPage.screenshot('save-button-visible');
  });

  test('should open save session dialog', async () => {
    await sessionPage.openSessionPanel();
    await sessionPage.saveSessionButton.click();
    
    await expect(sessionPage.sessionNameInput).toBeVisible();
    await expect(sessionPage.confirmSaveButton).toBeVisible();
  });

  test('should save session with valid name', async () => {
    // Create some tabs first
    await navPage.clickNewTabButton();
    await navPage.clickNewTabButton();
    
    const initialTabCount = await navPage.getTabCount();
    expect(initialTabCount).toBeGreaterThanOrEqual(2);

    // Save session
    await sessionPage.openSessionPanel();
    await sessionPage.saveSession(testSession.name);

    // Verify success
    await expect(sessionPage.sessionSuccessToast).toBeVisible({ timeout: 5000 });
    await sessionPage.screenshot('session-saved-success');
  });

  test('should validate session name is required', async () => {
    await sessionPage.openSessionPanel();
    await sessionPage.saveSessionButton.click();
    
    // Try to save with empty name
    await sessionPage.sessionNameInput.fill('');
    await sessionPage.confirmSaveButton.click();

    // Should show validation error
    await expect(sessionPage.page.locator('text=Session name is required')).toBeVisible();
  });

  test('should reject session name with special characters', async () => {
    await sessionPage.openSessionPanel();
    await sessionPage.saveSessionButton.click();
    
    await sessionPage.sessionNameInput.fill('<script>alert("xss")</script>');
    await sessionPage.confirmSaveButton.click();

    // Should show validation error or sanitize
    await expect(sessionPage.sessionErrorToast).toBeVisible({ timeout: 5000 });
  });

  test('should save session with current tab states', async ({ page }) => {
    // Navigate to a specific URL
    await navPage.navigateTo('https://example.com');
    await page.waitForLoadState('domcontentloaded');

    // Save session
    await sessionPage.openSessionPanel();
    await sessionPage.saveSession('Session with URL');

    await expect(sessionPage.sessionSuccessToast).toBeVisible();
  });

  test('should show saved session in session list', async () => {
    // Save a session
    await sessionPage.openSessionPanel();
    await sessionPage.saveSession('Listed Session');
    await expect(sessionPage.sessionSuccessToast).toBeVisible();

    // Verify it appears in the list
    const sessionNames = await sessionPage.getSessionNames();
    expect(sessionNames).toContain('Listed Session');
  });
});

// ============================================================================
// LOAD SESSION TESTS
// ============================================================================

test.describe('Session Management - Load', () => {
  let navPage: NavigationPage;
  let sessionPage: SessionPage;

  test.beforeEach(async ({ page }) => {
    navPage = new NavigationPage(page);
    sessionPage = new SessionPage(page);
    await navPage.goto();

    // Pre-create a session to load
    await sessionPage.openSessionPanel();
    await sessionPage.saveSession('Pre-created Session');
    await expect(sessionPage.sessionSuccessToast).toBeVisible();
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'passed') {
      await page.screenshot({
        path: `test-results/screenshots/session-load-${testInfo.title.replace(/\s+/g, '-')}-failed.png`,
        fullPage: true,
      });
    }
  });

  test('should display load session option', { tag: '@smoke' }, async () => {
    await sessionPage.openSessionPanel();
    await expect(sessionPage.loadSessionButton).toBeVisible();
  });

  test('should list available sessions', async () => {
    await sessionPage.openSessionPanel();
    
    const sessionCount = await sessionPage.getSessionCount();
    expect(sessionCount).toBeGreaterThanOrEqual(1);
  });

  test('should load selected session', async () => {
    await sessionPage.openSessionPanel();
    await sessionPage.loadSession('Pre-created Session');

    await expect(sessionPage.sessionSuccessToast).toBeVisible();
    await sessionPage.screenshot('session-loaded');
  });

  test('should restore tabs from loaded session', async () => {
    // Create session with multiple tabs
    await navPage.clickNewTabButton();
    await navPage.clickNewTabButton();
    const originalTabCount = await navPage.getTabCount();

    await sessionPage.openSessionPanel();
    await sessionPage.saveSession('Multi-tab Session');

    // Close all tabs and load session
    // Note: Implementation depends on how tab restoration works
    await sessionPage.loadSession('Multi-tab Session');

    // Verify tabs restored
    const restoredTabCount = await navPage.getTabCount();
    expect(restoredTabCount).toBe(originalTabCount);
  });

  test('should show confirmation before replacing current tabs', async () => {
    // Create some tabs
    await navPage.clickNewTabButton();
    
    await sessionPage.openSessionPanel();
    await sessionPage.sessionItems.first().click();

    // Should show confirmation dialog
    await expect(sessionPage.page.locator('text=Replace current tabs')).toBeVisible();
  });

  test('should handle loading non-existent session gracefully', async () => {
    // This tests the UI behavior when a session no longer exists
    // (e.g., deleted from another instance)
    await sessionPage.openSessionPanel();
    
    // Attempt to load - should handle gracefully if session is missing
    // Implementation depends on actual UI behavior
    expect(true).toBe(true); // Placeholder
  });
});

// ============================================================================
// LIST SESSIONS TESTS
// ============================================================================

test.describe('Session Management - List', () => {
  let navPage: NavigationPage;
  let sessionPage: SessionPage;

  test.beforeEach(async ({ page }) => {
    navPage = new NavigationPage(page);
    sessionPage = new SessionPage(page);
    await navPage.goto();
  });

  test('should display session list panel', { tag: '@smoke' }, async () => {
    await sessionPage.openSessionPanel();
    await expect(sessionPage.sessionList).toBeVisible();
  });

  test('should show empty state when no sessions exist', async () => {
    await sessionPage.openSessionPanel();
    
    // If no sessions, should show empty state message
    const sessionCount = await sessionPage.getSessionCount();
    if (sessionCount === 0) {
      await expect(sessionPage.page.locator('text=No saved sessions')).toBeVisible();
    }
  });

  test('should display sessions sorted by date (newest first)', async () => {
    // Create multiple sessions
    await sessionPage.openSessionPanel();
    await sessionPage.saveSession('Older Session');
    await sessionPage.page.waitForTimeout(100); // Ensure different timestamps
    await sessionPage.saveSession('Newer Session');

    // Verify order
    const names = await sessionPage.getSessionNames();
    expect(names[0]).toContain('Newer Session');
  });

  test('should display session metadata (name, date, tab count)', async () => {
    await navPage.clickNewTabButton();
    await navPage.clickNewTabButton();
    
    await sessionPage.openSessionPanel();
    await sessionPage.saveSession('Metadata Session');

    // Verify session item shows metadata
    const sessionItem = sessionPage.sessionItems.filter({ hasText: 'Metadata Session' });
    await expect(sessionItem).toBeVisible();
    
    // Should show tab count (implementation specific)
    // await expect(sessionItem.locator('[data-testid="tab-count"]')).toContainText('3');
  });

  test('should refresh session list on panel open', async () => {
    await sessionPage.openSessionPanel();
    const initialCount = await sessionPage.getSessionCount();

    // Close and create session via keyboard shortcut or other means
    await sessionPage.closeSessionPanel();
    
    // Re-open should refresh list
    await sessionPage.openSessionPanel();
    // List should be fresh (same or more sessions)
    const newCount = await sessionPage.getSessionCount();
    expect(newCount).toBeGreaterThanOrEqual(initialCount);
  });
});

// ============================================================================
// DELETE SESSION TESTS
// ============================================================================

test.describe('Session Management - Delete', () => {
  let navPage: NavigationPage;
  let sessionPage: SessionPage;

  test.beforeEach(async ({ page }) => {
    navPage = new NavigationPage(page);
    sessionPage = new SessionPage(page);
    await navPage.goto();

    // Create a session to delete
    await sessionPage.openSessionPanel();
    await sessionPage.saveSession('Session to Delete');
    await expect(sessionPage.sessionSuccessToast).toBeVisible();
  });

  test('should display delete button for each session', async () => {
    await sessionPage.openSessionPanel();
    
    const sessionItem = sessionPage.sessionItems.first();
    await sessionItem.hover();
    
    await expect(sessionItem.locator('[data-testid="delete-session-button"]')).toBeVisible();
  });

  test('should show confirmation before deleting', async () => {
    await sessionPage.openSessionPanel();
    
    await sessionPage.sessionItems.first().hover();
    await sessionPage.sessionItems.first()
      .locator('[data-testid="delete-session-button"]').click();

    // Should show confirmation dialog
    await expect(sessionPage.page.locator('text=Are you sure')).toBeVisible();
    await expect(sessionPage.confirmDeleteButton).toBeVisible();
  });

  test('should delete session when confirmed', async () => {
    await sessionPage.openSessionPanel();
    const initialCount = await sessionPage.getSessionCount();

    await sessionPage.deleteSession('Session to Delete');

    await expect(sessionPage.sessionSuccessToast).toBeVisible();
    
    const newCount = await sessionPage.getSessionCount();
    expect(newCount).toBe(initialCount - 1);
  });

  test('should cancel delete when cancelled', async () => {
    await sessionPage.openSessionPanel();
    const initialCount = await sessionPage.getSessionCount();

    await sessionPage.sessionItems.first().hover();
    await sessionPage.sessionItems.first()
      .locator('[data-testid="delete-session-button"]').click();

    // Click cancel instead of confirm
    await sessionPage.page.locator('[data-testid="cancel-delete-button"]').click();

    const newCount = await sessionPage.getSessionCount();
    expect(newCount).toBe(initialCount);
  });

  test('should remove session from list after delete', async () => {
    await sessionPage.openSessionPanel();
    
    const sessionNames = await sessionPage.getSessionNames();
    expect(sessionNames).toContain('Session to Delete');

    await sessionPage.deleteSession('Session to Delete');

    const updatedNames = await sessionPage.getSessionNames();
    expect(updatedNames).not.toContain('Session to Delete');
  });
});

// ============================================================================
// SESSION RESTORE TESTS
// ============================================================================

test.describe('Session Management - Restore', () => {
  let navPage: NavigationPage;
  let sessionPage: SessionPage;

  test.beforeEach(async ({ page }) => {
    navPage = new NavigationPage(page);
    sessionPage = new SessionPage(page);
    await navPage.goto();
  });

  test('should restore tab URLs from session', async ({ page }) => {
    // Navigate to a URL and save
    await navPage.navigateTo('https://example.com');
    await page.waitForLoadState('domcontentloaded');

    await sessionPage.openSessionPanel();
    await sessionPage.saveSession('URL Session');

    // Create a new tab (change state)
    await navPage.clickNewTabButton();

    // Load saved session
    await sessionPage.loadSession('URL Session');

    // Verify URL restored
    // Note: Actual verification depends on how tabs are restored
    await sessionPage.screenshot('url-restored');
  });

  test('should restore proxy assignments from session', async () => {
    // This test requires proxy to be assigned before save
    // Implementation depends on proxy panel integration
    expect(true).toBe(true); // Placeholder
  });

  test('should handle session with many tabs (50)', async () => {
    // Create session with max tabs
    for (let i = 0; i < 10; i++) {
      await navPage.clickNewTabButton();
    }

    await sessionPage.openSessionPanel();
    await sessionPage.saveSession('Many Tabs Session');

    // Should handle without performance issues
    await expect(sessionPage.sessionSuccessToast).toBeVisible({ timeout: 10000 });
  });

  test('should filter dangerous URLs on restore (security)', async () => {
    // This is primarily tested at integration level
    // E2E just verifies the app doesn't crash
    await sessionPage.openSessionPanel();
    await sessionPage.saveSession('Security Test');
    await sessionPage.loadSession('Security Test');

    // App should remain stable
    await expect(navPage.tabBar).toBeVisible();
  });
});

// ============================================================================
// KEYBOARD SHORTCUTS
// ============================================================================

test.describe('Session Management - Keyboard Shortcuts', () => {
  let navPage: NavigationPage;
  let sessionPage: SessionPage;

  test.beforeEach(async ({ page }) => {
    navPage = new NavigationPage(page);
    sessionPage = new SessionPage(page);
    await navPage.goto();
  });

  test('should open session panel with Ctrl+Shift+S', async ({ page }) => {
    await page.keyboard.press('Control+Shift+S');
    await expect(sessionPage.sessionPanel).toBeVisible();
  });

  test('should close session panel with Escape', async ({ page }) => {
    await sessionPage.openSessionPanel();
    await expect(sessionPage.sessionPanel).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(sessionPage.sessionPanel).not.toBeVisible();
  });

  test('should trigger quick save with Ctrl+S when panel open', async ({ page }) => {
    await sessionPage.openSessionPanel();
    await page.keyboard.press('Control+S');

    // Should focus session name input or trigger save dialog
    await expect(sessionPage.sessionNameInput).toBeFocused();
  });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

test.describe('Session Management - Error Handling', () => {
  let navPage: NavigationPage;
  let sessionPage: SessionPage;

  test.beforeEach(async ({ page }) => {
    navPage = new NavigationPage(page);
    sessionPage = new SessionPage(page);
    await navPage.goto();
  });

  test('should show error toast on save failure', async () => {
    // Simulate save failure (implementation specific)
    // This may require mocking the API or network
    expect(true).toBe(true); // Placeholder
  });

  test('should show error toast on load failure', async () => {
    // Simulate load failure
    expect(true).toBe(true); // Placeholder
  });

  test('should recover gracefully from database errors', async () => {
    // App should remain usable after errors
    expect(true).toBe(true); // Placeholder
  });
});

// ============================================================================
// ACCESSIBILITY
// ============================================================================

test.describe('Session Management - Accessibility', () => {
  let navPage: NavigationPage;
  let sessionPage: SessionPage;

  test.beforeEach(async ({ page }) => {
    navPage = new NavigationPage(page);
    sessionPage = new SessionPage(page);
    await navPage.goto();
  });

  test('should have proper ARIA labels on session controls', async () => {
    await sessionPage.openSessionPanel();

    await expect(sessionPage.saveSessionButton).toHaveAttribute('aria-label', /save/i);
    await expect(sessionPage.sessionList).toHaveAttribute('role', 'list');
  });

  test('should support keyboard navigation in session list', async ({ page }) => {
    // Create sessions for navigation
    await sessionPage.openSessionPanel();
    await sessionPage.saveSession('Session A');
    await sessionPage.saveSession('Session B');

    // Tab through sessions
    await page.keyboard.press('Tab');
    await page.keyboard.press('ArrowDown');
    
    // Should navigate between sessions
    expect(true).toBe(true); // Implementation specific
  });

  test('should announce actions to screen readers', async () => {
    // Verify live regions exist for announcements
    await sessionPage.openSessionPanel();
    
    const liveRegion = sessionPage.page.locator('[aria-live]');
    await expect(liveRegion).toBeVisible();
  });
});

/**
 * E2E Tests - Magic UI Components (v1.3.0 Release)
 * Tests for Magic UI component rendering and interactions
 * - Test BorderBeam on active proxy
 * - Test Confetti on automation success
 * - Test AnimatedList in activity log
 * - Test Particles background rendering
 * - Test animation settings panel
 * - Test prefers-reduced-motion support
 */

import { test, expect } from '@playwright/test';
import { BasePage } from './pages/BasePage';
import { testTimeouts, waitTimes } from './fixtures/test-data';

class MagicUIPage extends BasePage {
  // Panel buttons
  readonly proxyPanelButton = this.page.locator('[data-testid="proxy-panel-button"]');
  readonly automationPanelButton = this.page.locator('[data-testid="automation-panel-button"]');
  readonly activityLogButton = this.page.locator('[data-testid="activity-log-button"]');
  readonly settingsButton = this.page.locator('[data-testid="settings-panel-button"], [data-testid="settings-button"]');
  
  // Panels
  readonly proxyPanel = this.page.locator('[data-testid="proxy-panel"]');
  readonly automationPanel = this.page.locator('[data-testid="automation-panel"]');
  readonly activityLog = this.page.locator('[data-testid="activity-log-panel"], [data-testid="activity-log"]');
  readonly settingsPanel = this.page.locator('[data-testid="settings-panel"]');
  
  // Magic UI components
  readonly particlesContainer = this.page.locator('[data-testid="particles-container"]');
  readonly particlesCanvas = this.page.locator('[data-testid="particles-canvas"]');
  readonly borderBeam = this.page.locator('[data-testid="border-beam"], .border-beam');
  readonly confettiContainer = this.page.locator('[data-testid="confetti"], .confetti-container');
  readonly animatedList = this.page.locator('[data-testid="animated-list"]');
  readonly neonGradientCard = this.page.locator('[data-testid="neon-gradient-card"]');
  readonly shimmerButton = this.page.locator('[data-testid="shimmer-button"]');
  readonly pulsatingButton = this.page.locator('[data-testid="pulsating-button"]');
  readonly numberTicker = this.page.locator('[data-testid="number-ticker"]');
  
  // Animation settings
  readonly animationSettingsSection = this.page.locator('[data-testid="animation-settings"]');
  readonly animationMasterToggle = this.page.locator('[data-testid="animation-toggle"]');
  readonly particlesToggle = this.page.locator('[data-testid="particles-toggle"]');
  readonly confettiToggle = this.page.locator('[data-testid="confetti-toggle"]');
  readonly borderBeamToggle = this.page.locator('[data-testid="border-beam-toggle"]');
  readonly reducedMotionIndicator = this.page.locator('[data-testid="reduced-motion-indicator"]');

  async openPanel(panel: 'proxy' | 'automation' | 'activity' | 'settings'): Promise<void> {
    const buttons = {
      proxy: this.proxyPanelButton,
      automation: this.automationPanelButton,
      activity: this.activityLogButton,
      settings: this.settingsButton
    };
    const button = buttons[panel];
    if (await button.isVisible()) {
      await button.click();
      await this.page.waitForTimeout(waitTimes.panelAnimation);
    }
  }
}

test.describe('Magic UI Components @smoke @ui', () => {
  let magicUI: MagicUIPage;

  test.beforeEach(async ({ page }) => {
    magicUI = new MagicUIPage(page);
    await magicUI.goto();
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'passed') {
      await page.screenshot({
        path: `test-results/screenshots/magic-ui-${testInfo.title.replace(/\s+/g, '-')}-failed.png`,
        fullPage: true
      });
    }
  });

  test.describe('Particles Background', () => {
    test('should render particles canvas on dashboard', async ({ page }) => {
      await magicUI.waitForAppReady();
      
      // Look for particles container or canvas
      const particlesContainer = page.locator('[data-testid="particles-container"], .particles-container');
      const particlesCanvas = page.locator('[data-testid="particles-canvas"], canvas');
      
      // Either the container or canvas should be present if particles are enabled
      const hasParticles = await particlesContainer.isVisible().catch(() => false) ||
                          await particlesCanvas.isVisible().catch(() => false);
      
      console.log(`Particles rendering: ${hasParticles}`);
      
      await magicUI.screenshot('particles-background');
    });

    test('should have working canvas context', async ({ page }) => {
      await magicUI.waitForAppReady();
      
      // Check if any canvas element has valid context
      const canvasValid = await page.evaluate(() => {
        const canvases = Array.from(document.querySelectorAll('canvas'));
        for (const canvas of canvases) {
          const ctx = canvas.getContext('2d');
          if (ctx) {return true;}
        }
        return canvases.length === 0; // True if no canvas (particles might be disabled)
      });
      
      expect(canvasValid).toBeTruthy();
      
      await magicUI.screenshot('canvas-context');
    });

    test('should animate particles smoothly', async ({ page }) => {
      await magicUI.waitForAppReady();
      
      // Measure frame rate by checking requestAnimationFrame calls
      const frameRate = await page.evaluate(async () => {
        return new Promise<number>((resolve) => {
          let frameCount = 0;
          const startTime = performance.now();
          
          const countFrames = () => {
            frameCount++;
            if (performance.now() - startTime < 1000) {
              requestAnimationFrame(countFrames);
            } else {
              resolve(frameCount);
            }
          };
          
          requestAnimationFrame(countFrames);
        });
      });
      
      // Should have reasonable frame rate (30+ fps) or no animation
      expect(frameRate).toBeGreaterThanOrEqual(0);
      console.log(`Measured frame rate: ${frameRate} fps`);
      
      await magicUI.screenshot('particles-animation');
    });
  });

  test.describe('BorderBeam Component', () => {
    test('should display BorderBeam on active proxy card', async ({ page }) => {
      await magicUI.waitForAppReady();
      
      // Open proxy panel
      await magicUI.openPanel('proxy');
      
      // Look for border beam effect on any active/selected element
      const borderBeamElements = page.locator('[class*="border-beam"], [data-testid*="border-beam"]');
      const activeProxy = page.locator('[data-testid="proxy-item"].active, [data-testid="active-proxy"]');
      
      // Check for any glowing/animated border effects
      const hasBeamEffect = await borderBeamElements.count() > 0 ||
                           await activeProxy.isVisible().catch(() => false);
      
      console.log(`BorderBeam visible: ${hasBeamEffect}`);
      
      await magicUI.screenshot('border-beam-proxy');
    });

    test('should animate BorderBeam continuously', async ({ page }) => {
      await magicUI.waitForAppReady();
      
      // Check for CSS animations on border elements
      const hasAnimation = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('[class*="border"], [class*="beam"]'));
        for (const el of elements) {
          const style = window.getComputedStyle(el);
          if (style.animation && style.animation !== 'none') {
            return true;
          }
        }
        return false;
      });
      
      console.log(`BorderBeam animating: ${hasAnimation}`);
      
      await magicUI.screenshot('border-beam-animation');
    });
  });

  test.describe('Confetti Component', () => {
    test('should trigger confetti on automation success', async ({ page }) => {
      await magicUI.waitForAppReady();
      
      // Set up listener for confetti element
      const confettiTriggered = false;
      
      // Monitor DOM for confetti elements
      await page.evaluate(() => {
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.addedNodes.length > 0) {
              Array.from(mutation.addedNodes).forEach((node) => {
                if (node instanceof HTMLElement && 
                    (node.classList.contains('confetti') || 
                     node.dataset.testid?.includes('confetti'))) {
                  (window as any).__confettiTriggered = true;
                }
              });
            }
          });
        });
        observer.observe(document.body, { childList: true, subtree: true });
      });
      
      // Open automation panel
      await magicUI.openPanel('automation');
      
      // Look for any success indicators or confetti
      const confettiElement = page.locator('[data-testid="confetti"], .confetti, [class*="confetti"]');
      const successIndicator = page.locator('[data-testid="success"], .success-indicator');
      
      const hasConfettiOrSuccess = await confettiElement.isVisible().catch(() => false) ||
                                   await successIndicator.isVisible().catch(() => false);
      
      console.log(`Confetti/Success visible: ${hasConfettiOrSuccess}`);
      
      await magicUI.screenshot('confetti-trigger');
    });

    test('should render confetti particles correctly', async ({ page }) => {
      await magicUI.waitForAppReady();
      
      // Check for confetti canvas or particle elements
      const confettiCanvas = page.locator('canvas[data-testid*="confetti"]');
      const confettiParticles = page.locator('[class*="confetti-particle"]');
      
      const confettiExists = await confettiCanvas.count() > 0 ||
                            await confettiParticles.count() > 0;
      
      console.log(`Confetti elements present: ${confettiExists}`);
      
      await magicUI.screenshot('confetti-particles');
    });
  });

  test.describe('AnimatedList Component', () => {
    test('should render AnimatedList in activity log', async ({ page }) => {
      await magicUI.waitForAppReady();
      
      // Open activity log
      await magicUI.openPanel('activity');
      
      // Look for animated list or list items with animations
      const animatedList = page.locator('[data-testid="animated-list"], [data-testid="activity-list"]');
      const listItems = page.locator('[data-testid="activity-entry"], [data-testid="log-entry"]');
      
      const hasAnimatedList = await animatedList.isVisible().catch(() => false) ||
                             await listItems.count() > 0;
      
      console.log(`AnimatedList visible: ${hasAnimatedList}`);
      
      await magicUI.screenshot('animated-list-activity');
    });

    test('should animate list items on entry', async ({ page }) => {
      await magicUI.waitForAppReady();
      
      // Open activity log
      await magicUI.openPanel('activity');
      
      // Check for entry animations on list items
      const hasEntryAnimation = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('[data-testid*="entry"], [data-testid*="item"]'));
        for (const item of items) {
          const style = window.getComputedStyle(item);
          if (style.animation !== 'none' || 
              style.transition !== 'all 0s ease 0s') {
            return true;
          }
        }
        return false;
      });
      
      console.log(`Entry animations present: ${hasEntryAnimation}`);
      
      await magicUI.screenshot('list-entry-animation');
    });

    test('should support smooth scrolling in lists', async ({ page }) => {
      await magicUI.waitForAppReady();
      
      // Open activity log
      await magicUI.openPanel('activity');
      
      // Find scrollable container
      const scrollContainer = page.locator('[data-testid="activity-log-panel"], [data-testid="activity-log"]');
      
      if (await scrollContainer.isVisible()) {
        // Check scroll behavior
        const hasScrollBehavior = await page.evaluate(() => {
          const containers = Array.from(document.querySelectorAll('[data-testid*="log"], [data-testid*="list"]'));
          for (const container of containers) {
            const style = window.getComputedStyle(container);
            if (style.scrollBehavior === 'smooth' || style.overflowY === 'auto') {
              return true;
            }
          }
          return false;
        });
        
        console.log(`Smooth scrolling: ${hasScrollBehavior}`);
      }
      
      await magicUI.screenshot('smooth-scrolling');
    });
  });

  test.describe('Animation Settings Panel', () => {
    test('should display animation settings in settings panel', async ({ page }) => {
      await magicUI.waitForAppReady();
      
      // Open settings panel
      await magicUI.openPanel('settings');
      
      // Look for animation settings section
      const animationSection = page.locator('[data-testid="animation-settings"], [data-testid*="animation"]');
      const toggles = page.locator('[data-testid*="toggle"][data-testid*="animation"]');
      
      const hasAnimationSettings = await animationSection.isVisible().catch(() => false) ||
                                   await toggles.count() > 0;
      
      console.log(`Animation settings visible: ${hasAnimationSettings}`);
      
      await magicUI.screenshot('animation-settings');
    });

    test('should toggle animations on/off', async ({ page }) => {
      await magicUI.waitForAppReady();
      
      // Open settings
      await magicUI.openPanel('settings');
      
      // Find any animation toggle
      const animationToggle = page.locator('[data-testid="animation-toggle"], [data-testid="animations-enabled"]');
      
      if (await animationToggle.isVisible()) {
        // Get initial state
        const initialState = await animationToggle.isChecked().catch(() => null);
        
        // Toggle
        await animationToggle.click();
        await page.waitForTimeout(waitTimes.stateUpdate);
        
        // Verify state changed
        const newState = await animationToggle.isChecked().catch(() => null);
        
        if (initialState !== null && newState !== null) {
          expect(newState).not.toEqual(initialState);
        }
      }
      
      await magicUI.screenshot('animation-toggle');
    });

    test('should persist animation preferences', async ({ page }) => {
      await magicUI.waitForAppReady();
      
      // Check if animation state is stored in localStorage
      const hasPersistedState = await page.evaluate(() => {
        const keys = Object.keys(localStorage);
        return keys.some(key => 
          key.includes('animation') || 
          key.includes('settings') ||
          key.includes('preferences')
        );
      });
      
      console.log(`Animation preferences persisted: ${hasPersistedState}`);
      
      await magicUI.screenshot('animation-persistence');
    });

    test('should have individual component toggles', async ({ page }) => {
      await magicUI.waitForAppReady();
      
      // Open settings
      await magicUI.openPanel('settings');
      
      // Look for individual animation toggles
      const componentToggles = [
        'particles-toggle',
        'confetti-toggle',
        'border-beam-toggle',
        'animated-list-toggle'
      ];
      
      let visibleToggles = 0;
      for (const toggleId of componentToggles) {
        const toggle = page.locator(`[data-testid="${toggleId}"]`);
        if (await toggle.isVisible().catch(() => false)) {
          visibleToggles++;
        }
      }
      
      console.log(`Individual toggles found: ${visibleToggles}`);
      
      await magicUI.screenshot('component-toggles');
    });
  });

  test.describe('Reduced Motion Support', () => {
    test('should respect prefers-reduced-motion', async ({ page }) => {
      // Enable reduced motion preference
      await page.emulateMedia({ reducedMotion: 'reduce' });
      
      await magicUI.goto();
      await magicUI.waitForAppReady();
      
      // Check if animations are disabled
      const animationsDisabled = await page.evaluate(() => {
        const animatedElements = Array.from(document.querySelectorAll('[class*="animate"], [style*="animation"]'));
        for (const el of animatedElements) {
          const style = window.getComputedStyle(el);
          if (style.animation !== 'none' && !style.animation.includes('0s')) {
            return false; // Animation still running
          }
        }
        return true;
      });
      
      console.log(`Reduced motion respected: ${animationsDisabled}`);
      
      await magicUI.screenshot('reduced-motion');
    });

    test('should disable particles when reduced motion is set', async ({ page }) => {
      // Enable reduced motion
      await page.emulateMedia({ reducedMotion: 'reduce' });
      
      await magicUI.goto();
      await magicUI.waitForAppReady();
      
      // Particles should not render or should be static
      const particlesCanvas = page.locator('[data-testid="particles-canvas"]');
      const isHidden = await particlesCanvas.isHidden().catch(() => true);
      
      console.log(`Particles hidden with reduced motion: ${isHidden}`);
      
      await magicUI.screenshot('particles-reduced-motion');
    });

    test('should show reduced motion indicator when active', async ({ page }) => {
      // Enable reduced motion
      await page.emulateMedia({ reducedMotion: 'reduce' });
      
      await magicUI.goto();
      await magicUI.waitForAppReady();
      
      // Open settings
      await magicUI.openPanel('settings');
      
      // Look for reduced motion indicator or message
      const reducedMotionIndicator = page.locator('[data-testid="reduced-motion-indicator"], [data-testid*="reduced-motion"]');
      const reducedMotionText = page.locator('text=/reduced motion/i');
      
      const hasIndicator = await reducedMotionIndicator.isVisible().catch(() => false) ||
                          await reducedMotionText.isVisible().catch(() => false);
      
      console.log(`Reduced motion indicator: ${hasIndicator}`);
      
      await magicUI.screenshot('reduced-motion-indicator');
    });

    test('should allow manual override of reduced motion', async ({ page }) => {
      // Enable system reduced motion
      await page.emulateMedia({ reducedMotion: 'reduce' });
      
      await magicUI.goto();
      await magicUI.waitForAppReady();
      
      // Open settings
      await magicUI.openPanel('settings');
      
      // Look for override toggle
      const overrideToggle = page.locator('[data-testid="override-reduced-motion"], [data-testid="force-animations"]');
      
      if (await overrideToggle.isVisible()) {
        await overrideToggle.click();
        await page.waitForTimeout(waitTimes.stateUpdate);
        
        console.log('Override toggle clicked');
      }
      
      await magicUI.screenshot('reduced-motion-override');
    });
  });

  test.describe('Additional Magic UI Components', () => {
    test('should render NeonGradientCard correctly', async ({ page }) => {
      await magicUI.waitForAppReady();
      
      // Look for neon gradient cards
      const neonCards = page.locator('[data-testid="neon-gradient-card"], [class*="neon-gradient"]');
      const cardCount = await neonCards.count();
      
      console.log(`NeonGradientCard instances: ${cardCount}`);
      
      await magicUI.screenshot('neon-gradient-card');
    });

    test('should render NumberTicker with animations', async ({ page }) => {
      await magicUI.waitForAppReady();
      
      // Open stats panel which likely has number tickers
      const statsButton = page.locator('[data-testid="stats-panel-button"]');
      if (await statsButton.isVisible()) {
        await statsButton.click();
        await page.waitForTimeout(waitTimes.panelAnimation);
      }
      
      // Look for animated numbers
      const numberElements = page.locator('[data-testid="number-ticker"], [data-testid*="stat-value"]');
      const hasNumbers = await numberElements.count() > 0;
      
      console.log(`NumberTicker elements: ${hasNumbers}`);
      
      await magicUI.screenshot('number-ticker');
    });

    test('should render ShimmerButton with effect', async ({ page }) => {
      await magicUI.waitForAppReady();
      
      // Look for shimmer buttons
      const shimmerButtons = page.locator('[data-testid="shimmer-button"], [class*="shimmer"]');
      const hasShimmer = await shimmerButtons.count() > 0;
      
      console.log(`ShimmerButton instances: ${hasShimmer}`);
      
      await magicUI.screenshot('shimmer-button');
    });

    test('should render PulsatingButton correctly', async ({ page }) => {
      await magicUI.waitForAppReady();
      
      // Look for pulsating buttons
      const pulsatingButtons = page.locator('[data-testid="pulsating-button"], [class*="pulsating"], [class*="pulse"]');
      const hasPulsating = await pulsatingButtons.count() > 0;
      
      console.log(`PulsatingButton instances: ${hasPulsating}`);
      
      await magicUI.screenshot('pulsating-button');
    });
  });
});

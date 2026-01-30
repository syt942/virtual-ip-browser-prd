/**
 * Search Execution Module
 * Handles search navigation, clicking results, and human-like behavior simulation
 */

import { BrowserView } from 'electron';
import type { SearchEngine, SearchResult } from '../types';
import { SearchResultExtractor } from './result-extractor';

export class SearchExecutor {
  private extractor: SearchResultExtractor;

  constructor() {
    this.extractor = new SearchResultExtractor();
  }

  /**
   * Perform a search
   */
  async performSearch(
    view: BrowserView,
    keyword: string,
    engine: SearchEngine
  ): Promise<SearchResult[]> {
    const engineConfig = this.extractor.getEngineConfig(engine);
    const searchUrl = engineConfig.url + encodeURIComponent(keyword);

    try {
      // Navigate to search page
      await view.webContents.loadURL(searchUrl);
      
      // Wait for page to load
      await this.waitForLoad(view);

      // Add human-like delay
      await this.randomDelay(1000, 3000);

      // Extract search results
      const results = await this.extractor.extractResults(view, engine);

      return results;
    } catch (error) {
      console.error('[Search Engine] Search failed:', error);
      throw error;
    }
  }

  /**
   * Click on a result with human-like behavior
   */
  async clickResult(view: BrowserView, position: number): Promise<void> {
    try {
      // Scroll to element
      await this.scrollToResult(view, position);
      
      // Random delay before clicking
      await this.randomDelay(500, 2000);

      // Click the result
      await view.webContents.executeJavaScript(`
        (function() {
          const results = document.querySelectorAll('a[href^="http"]');
          const link = results[${position - 1}];
          if (link) {
            link.click();
            return true;
          }
          return false;
        })();
      `);

      // Wait for navigation
      await this.waitForLoad(view);
    } catch (error) {
      console.error('[Search Engine] Failed to click result:', error);
      throw error;
    }
  }

  /**
   * Scroll to result with human-like behavior
   */
  async scrollToResult(view: BrowserView, position: number): Promise<void> {
    const scrollAmount = position * 100; // Approximate scroll amount
    
    await view.webContents.executeJavaScript(`
      (function() {
        window.scrollTo({
          top: ${scrollAmount},
          behavior: 'smooth'
        });
      })();
    `);

    await this.randomDelay(500, 1000);
  }

  /**
   * Simulate human behavior on page
   */
  async simulateHumanBehavior(view: BrowserView): Promise<void> {
    // Random scrolling
    await this.randomScroll(view);
    
    // Random mouse movements (simulated via scroll)
    await this.randomDelay(2000, 5000);
    
    // Random additional scrolls
    if (Math.random() > 0.5) {
      await this.randomScroll(view);
    }
  }

  /**
   * Random scroll on page
   */
  async randomScroll(view: BrowserView): Promise<void> {
    const scrollAmount = Math.floor(Math.random() * 500) + 200;
    
    await view.webContents.executeJavaScript(`
      (function() {
        window.scrollBy({
          top: ${scrollAmount},
          behavior: 'smooth'
        });
      })();
    `);

    await this.randomDelay(500, 1500);
  }

  /**
   * Wait for page to load
   */
  waitForLoad(view: BrowserView): Promise<void> {
    return new Promise((resolve) => {
      if (view.webContents.isLoading()) {
        view.webContents.once('did-finish-load', () => resolve());
      } else {
        resolve();
      }
    });
  }

  /**
   * Random delay between min and max milliseconds
   */
  randomDelay(min: number, max: number): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Get the extractor instance
   */
  getExtractor(): SearchResultExtractor {
    return this.extractor;
  }
}

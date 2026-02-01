/**
 * Search Execution Module
 * Handles search navigation, clicking results, and human-like behavior simulation
 * 
 * SECURITY: All executeJavaScript calls use safe templates with validated parameters.
 * User input is NEVER concatenated directly into JavaScript code.
 */

import type { AutomationViewLike } from '../executor';
import type { SearchEngine, SearchResult } from '../types';
import { SearchResultExtractor } from './result-extractor';
import { 
  generateSafeJS, 
  validateNumber, 
  validateSearchEngine,
  validateKeyword,
  getEngineConfig 
} from '../../../utils/validation';
import { sanitizeErrorMessage } from '../../../utils/error-sanitization';

/**
 * Maximum allowed values for security bounds
 */
const SECURITY_LIMITS = {
  MAX_POSITION: 100,
  MAX_SCROLL: 10000,
  MIN_DELAY: 100,
  MAX_DELAY: 10000,
} as const;

export class SearchExecutor {
  private extractor: SearchResultExtractor;

  constructor() {
    this.extractor = new SearchResultExtractor();
  }

  /**
   * Perform a search
   * SECURITY: Keyword is URL-encoded, engine is validated against whitelist
   */
  async performSearch(
    view: AutomationViewLike,
    keyword: string,
    engine: SearchEngine
  ): Promise<SearchResult[]> {
    // Validate inputs
    const keywordValidation = validateKeyword(keyword);
    if (!keywordValidation.valid) {
      throw new Error(`Invalid keyword: ${keywordValidation.error}`);
    }
    
    // Validate engine against whitelist
    const validatedEngine = validateSearchEngine(engine);
    const engineConfig = getEngineConfig(validatedEngine);
    
    // URL encode the keyword to prevent injection
    const searchUrl = engineConfig.url + encodeURIComponent(keywordValidation.sanitized);

    try {
      // Navigate to search page
      await view.webContents.loadURL(searchUrl);
      
      // Wait for page to load
      await this.waitForLoad(view);

      // Add human-like delay
      await this.randomDelay(1000, 3000);

      // Extract search results using safe templates
      const results = await this.extractResultsSafely(view, validatedEngine);

      return results;
    } catch (error) {
      console.error('[Search Engine] Search failed:', sanitizeErrorMessage(error));
      throw error;
    }
  }

  /**
   * Extract results using safe JavaScript template
   * SECURITY: Uses pre-defined extraction script, no user input in JS
   */
  private async extractResultsSafely(
    view: AutomationViewLike,
    engine: string
  ): Promise<SearchResult[]> {
    try {
      // Generate safe JavaScript using validated template
      const safeScript = generateSafeJS('extractResults', { engine });
      const results = await view.webContents.executeJavaScript(safeScript) as SearchResult[];
      return results || [];
    } catch (error) {
      console.error('[Search Engine] Failed to extract results:', sanitizeErrorMessage(error));
      return [];
    }
  }

  /**
   * Click on a result with human-like behavior
   * SECURITY: Position is validated as number within bounds
   */
  async clickResult(view: AutomationViewLike, position: number): Promise<void> {
    // Validate position is a safe integer within bounds
    const safePosition = validateNumber(position, 1, SECURITY_LIMITS.MAX_POSITION, 1);
    
    try {
      // Scroll to element
      await this.scrollToResult(view, safePosition);
      
      // Random delay before clicking
      await this.randomDelay(500, 2000);

      // Click the result using safe template (position - 1 for 0-based index)
      const safeScript = generateSafeJS('click', { position: safePosition - 1 });
      await view.webContents.executeJavaScript(safeScript);

      // Wait for navigation
      await this.waitForLoad(view);
    } catch (error) {
      console.error('[Search Engine] Failed to click result:', sanitizeErrorMessage(error));
      throw error;
    }
  }

  /**
   * Scroll to result with human-like behavior
   * SECURITY: Scroll amount is calculated from validated position
   */
  async scrollToResult(view: AutomationViewLike, position: number): Promise<void> {
    // Validate position and calculate safe scroll amount
    const safePosition = validateNumber(position, 1, SECURITY_LIMITS.MAX_POSITION, 1);
    const scrollAmount = validateNumber(safePosition * 100, 0, SECURITY_LIMITS.MAX_SCROLL, 100);
    
    // Use safe scroll template
    const safeScript = generateSafeJS('scroll', { amount: scrollAmount, smooth: true });
    await view.webContents.executeJavaScript(safeScript);

    await this.randomDelay(500, 1000);
  }

  /**
   * Simulate human behavior on page
   */
  async simulateHumanBehavior(view: AutomationViewLike): Promise<void> {
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
   * SECURITY: Scroll amount is generated internally and validated
   */
  async randomScroll(view: AutomationViewLike): Promise<void> {
    // Generate random scroll amount within safe bounds
    const scrollAmount = validateNumber(
      Math.floor(Math.random() * 500) + 200,
      0,
      SECURITY_LIMITS.MAX_SCROLL,
      200
    );
    
    // Use safe scroll template
    const safeScript = generateSafeJS('scroll', { amount: scrollAmount, smooth: true });
    await view.webContents.executeJavaScript(safeScript);

    await this.randomDelay(500, 1500);
  }

  /**
   * Wait for page to load
   */
  waitForLoad(view: AutomationViewLike): Promise<void> {
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
   * SECURITY: Delay values are bounded to prevent DoS
   */
  randomDelay(min: number, max: number): Promise<void> {
    // Ensure delay values are within safe bounds
    const safeMin = validateNumber(min, SECURITY_LIMITS.MIN_DELAY, SECURITY_LIMITS.MAX_DELAY, 500);
    const safeMax = validateNumber(max, safeMin, SECURITY_LIMITS.MAX_DELAY, 1000);
    
    const delay = Math.floor(Math.random() * (safeMax - safeMin + 1)) + safeMin;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Get the extractor instance
   */
  getExtractor(): SearchResultExtractor {
    return this.extractor;
  }
}

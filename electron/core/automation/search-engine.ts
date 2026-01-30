/**
 * Search Engine Automation
 * Orchestrates automated searches across multiple search engines
 * Includes translation integration (EP-008)
 * 
 * Implementation details are in separate modules under ./search/
 */

import type { SearchEngine, SearchResult } from './types';
import type { AutomationViewLike } from './executor';
import { 
  SearchExecutor, 
  SearchResultExtractor,
  SearchTranslationHandler,
  type TranslationConfig,
  type TranslatedSearchResult
} from './search';
import {
  CircuitBreaker,
  createSearchCircuitBreaker,
  CircuitBreakerOpenError,
  type CircuitBreakerCallbacks,
  type CircuitBreakerMetrics
} from '../resilience';

// Re-export types for backwards compatibility
export type { TranslationConfig, TranslatedSearchResult };

export interface SearchEngineAutomationOptions {
  /** Enable circuit breaker for search engines (default: true) */
  enableCircuitBreaker?: boolean;
  /** Circuit breaker callbacks for monitoring */
  circuitBreakerCallbacks?: CircuitBreakerCallbacks;
}

export class SearchEngineAutomation {
  private executor: SearchExecutor;
  private extractor: SearchResultExtractor;
  private translationHandler: SearchTranslationHandler;
  
  // Circuit breaker components (PRD 6.2 P1)
  private circuitBreakers: Map<SearchEngine, CircuitBreaker> = new Map();
  private circuitBreakerEnabled: boolean;

  constructor(options?: SearchEngineAutomationOptions) {
    this.executor = new SearchExecutor();
    this.extractor = this.executor.getExtractor();
    this.translationHandler = new SearchTranslationHandler();
    
    this.circuitBreakerEnabled = options?.enableCircuitBreaker ?? true;
    
    // Initialize circuit breakers for each search engine
    if (this.circuitBreakerEnabled) {
      this.initializeCircuitBreakers(options?.circuitBreakerCallbacks);
    }
  }

  /**
   * Initialize circuit breakers for all search engines
   */
  private initializeCircuitBreakers(callbacks?: CircuitBreakerCallbacks): void {
    const engines: SearchEngine[] = ['google', 'bing', 'duckduckgo', 'yahoo', 'brave'];
    
    for (const engine of engines) {
      const cb = createSearchCircuitBreaker(engine, {
        failureThreshold: 5,
        resetTimeout: 30000,
        successThreshold: 2
      }, callbacks);
      
      this.circuitBreakers.set(engine, cb);
    }
  }

  /**
   * Perform a search with circuit breaker protection
   */
  async performSearch(
    view: AutomationViewLike,
    keyword: string,
    engine: SearchEngine
  ): Promise<SearchResult[]> {
    const cb = this.circuitBreakers.get(engine);
    
    // If circuit breaker is disabled or not found, execute directly
    if (!this.circuitBreakerEnabled || !cb) {
      return this.executor.performSearch(view, keyword, engine);
    }
    
    // Performance tracking done internally by circuit breaker
    try {
      const results = await cb.execute(
        () => this.executor.performSearch(view, keyword, engine),
        { throwOnReject: true }
      );
      return results;
    } catch (error) {
      if (error instanceof CircuitBreakerOpenError) {
        console.warn(`[Search Engine] Circuit breaker OPEN for ${engine}, search rejected`);
      }
      throw error;
    }
  }

  /**
   * Find target domain in results
   */
  findTargetDomain(results: SearchResult[], targetDomains: string[]): SearchResult | null {
    return this.extractor.findTargetDomain(results, targetDomains);
  }

  /**
   * Click on a result with human-like behavior
   */
  async clickResult(view: AutomationViewLike, position: number): Promise<void> {
    return this.executor.clickResult(view, position);
  }

  /**
   * Simulate human behavior on page
   */
  async simulateHumanBehavior(view: AutomationViewLike): Promise<void> {
    return this.executor.simulateHumanBehavior(view);
  }

  // ============================================================================
  // TRANSLATION INTEGRATION (EP-008)
  // ============================================================================

  /**
   * Configure translation settings
   */
  configureTranslation(config: Partial<TranslationConfig>): void {
    this.translationHandler.configureTranslation(config);
  }

  /**
   * Get current translation configuration
   */
  getTranslationConfig(): TranslationConfig {
    return this.translationHandler.getTranslationConfig();
  }

  /**
   * Enable translation with proxy location settings
   */
  enableTranslation(proxyCountry?: string, proxyTimezone?: string): void {
    this.translationHandler.enableTranslation(proxyCountry, proxyTimezone);
  }

  /**
   * Disable translation
   */
  disableTranslation(): void {
    this.translationHandler.disableTranslation();
  }

  /**
   * Perform a search with translation support
   */
  async performSearchWithTranslation(
    view: AutomationViewLike,
    keyword: string,
    engine: SearchEngine,
    proxyCountry?: string,
    proxyTimezone?: string
  ): Promise<TranslatedSearchResult[]> {
    // Configure translation based on proxy location
    if (proxyCountry || proxyTimezone) {
      this.translationHandler.enableTranslation(proxyCountry, proxyTimezone);
    }

    const config = this.translationHandler.getTranslationConfig();
    let searchKeyword = keyword;

    // Translate keyword if enabled
    if (config.enabled && config.translateKeywords) {
      const { translatedKeyword } = await this.translationHandler.translateKeyword(keyword);
      searchKeyword = translatedKeyword;
    }

    // Perform the search with translated keyword
    const results = await this.executor.performSearch(view, searchKeyword, engine);

    // Translate results back to source language if enabled
    if (config.enabled && config.translateResults) {
      const targetLang = config.targetLanguage || 'en';
      const sourceLang = this.translationHandler.getSourceLanguage();
      
      if (targetLang !== sourceLang) {
        return this.translationHandler.translateSearchResults(results, targetLang, sourceLang);
      }
    }

    return results.map(r => ({ ...r }));
  }

  /**
   * Translate search results back to source language
   */
  async translateSearchResults(
    results: SearchResult[],
    fromLang: string,
    toLang: string
  ): Promise<TranslatedSearchResult[]> {
    return this.translationHandler.translateSearchResults(results, fromLang, toLang);
  }

  /**
   * Detect language of text
   */
  async detectLanguage(text: string): Promise<{ language: string; confidence: number }> {
    return this.translationHandler.detectLanguage(text);
  }

  /**
   * Get translator instance for external use
   */
  getTranslator() {
    return this.translationHandler.getTranslator();
  }

  /**
   * Get language detector instance for external use
   */
  getLanguageDetector() {
    return this.translationHandler.getLanguageDetector();
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): string[] {
    return this.translationHandler.getSupportedLanguages();
  }

  // ============================================================================
  // CIRCUIT BREAKER INTEGRATION (PRD 6.2 P1)
  // ============================================================================

  /**
   * Get circuit breaker for a search engine
   */
  getCircuitBreaker(engine: SearchEngine): CircuitBreaker | undefined {
    return this.circuitBreakers.get(engine);
  }

  /**
   * Check if search engine circuit is open
   */
  isCircuitOpen(engine: SearchEngine): boolean {
    const cb = this.circuitBreakers.get(engine);
    return cb ? cb.getState() === 'OPEN' : false;
  }

  /**
   * Get available search engines (those with closed circuits)
   */
  getAvailableEngines(): SearchEngine[] {
    if (!this.circuitBreakerEnabled) {
      return ['google', 'bing', 'duckduckgo', 'yahoo', 'brave'];
    }
    
    return Array.from(this.circuitBreakers.entries())
      .filter(([_, cb]) => cb.getState() !== 'OPEN')
      .map(([engine, _]) => engine);
  }

  /**
   * Reset circuit breaker for a search engine
   */
  resetCircuitBreaker(engine: SearchEngine): void {
    const cb = this.circuitBreakers.get(engine);
    if (cb) {
      cb.reset();
    }
  }

  /**
   * Reset all circuit breakers
   */
  resetAllCircuitBreakers(): void {
    for (const cb of Array.from(this.circuitBreakers.values())) {
      cb.reset();
    }
  }

  /**
   * Get circuit breaker metrics for all engines
   */
  getCircuitBreakerMetrics(): Record<SearchEngine, { state: string; metrics: CircuitBreakerMetrics }> {
    const result: Record<string, { state: string; metrics: CircuitBreakerMetrics }> = {};
    
    for (const [engine, cb] of Array.from(this.circuitBreakers.entries())) {
      result[engine] = {
        state: cb.getState(),
        metrics: cb.getMetrics()
      };
    }
    
    return result as Record<SearchEngine, { state: string; metrics: CircuitBreakerMetrics }>;
  }

  /**
   * Get circuit breaker state summary
   */
  getCircuitBreakerSummary(): {
    total: number;
    open: number;
    closed: number;
    halfOpen: number;
    engines: Record<SearchEngine, string>;
  } {
    const engines: Record<string, string> = {};
    let open = 0, closed = 0, halfOpen = 0;
    
    for (const [engine, cb] of Array.from(this.circuitBreakers.entries())) {
      const state = cb.getState();
      engines[engine] = state;
      
      switch (state) {
        case 'OPEN': open++; break;
        case 'CLOSED': closed++; break;
        case 'HALF_OPEN': halfOpen++; break;
      }
    }
    
    return {
      total: this.circuitBreakers.size,
      open,
      closed,
      halfOpen,
      engines: engines as Record<SearchEngine, string>
    };
  }

  /**
   * Cleanup circuit breakers on destruction
   */
  destroy(): void {
    for (const cb of Array.from(this.circuitBreakers.values())) {
      cb.destroy();
    }
    this.circuitBreakers.clear();
  }
}

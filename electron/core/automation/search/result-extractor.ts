/**
 * Search Result Extraction Module
 * Handles extracting and parsing search results from various search engines
 */

import type { AutomationViewLike } from '../executor';
import type { SearchEngine, SearchResult } from '../types';

// Search engine configurations
const SEARCH_ENGINE_CONFIGS: Record<SearchEngine, { url: string; selector: string }> = {
  google: {
    url: 'https://www.google.com/search?q=',
    selector: 'div.g'
  },
  bing: {
    url: 'https://www.bing.com/search?q=',
    selector: 'li.b_algo'
  },
  duckduckgo: {
    url: 'https://duckduckgo.com/?q=',
    selector: 'article[data-testid="result"]'
  },
  yahoo: {
    url: 'https://search.yahoo.com/search?p=',
    selector: 'div.algo'
  },
  brave: {
    url: 'https://search.brave.com/search?q=',
    selector: 'div.snippet'
  }
};

// Extraction scripts for each search engine
const EXTRACTION_SCRIPTS: Record<SearchEngine, string> = {
  google: `
    const titleEl = el.querySelector('h3');
    const linkEl = el.querySelector('a');
    const snippetEl = el.querySelector('div.VwiC3b');
    
    title = titleEl ? titleEl.textContent : '';
    url = linkEl ? linkEl.href : '';
    snippet = snippetEl ? snippetEl.textContent : '';
  `,
  bing: `
    const titleEl = el.querySelector('h2');
    const linkEl = el.querySelector('a');
    const snippetEl = el.querySelector('p');
    
    title = titleEl ? titleEl.textContent : '';
    url = linkEl ? linkEl.href : '';
    snippet = snippetEl ? snippetEl.textContent : '';
  `,
  duckduckgo: `
    const titleEl = el.querySelector('h2');
    const linkEl = el.querySelector('a[data-testid="result-title-a"]');
    const snippetEl = el.querySelector('div[data-result="snippet"]');
    
    title = titleEl ? titleEl.textContent : '';
    url = linkEl ? linkEl.href : '';
    snippet = snippetEl ? snippetEl.textContent : '';
  `,
  yahoo: `
    const titleEl = el.querySelector('h3');
    const linkEl = el.querySelector('a');
    const snippetEl = el.querySelector('p');
    
    title = titleEl ? titleEl.textContent : '';
    url = linkEl ? linkEl.href : '';
    snippet = snippetEl ? snippetEl.textContent : '';
  `,
  brave: `
    const titleEl = el.querySelector('h2');
    const linkEl = el.querySelector('a');
    const snippetEl = el.querySelector('p');
    
    title = titleEl ? titleEl.textContent : '';
    url = linkEl ? linkEl.href : '';
    snippet = snippetEl ? snippetEl.textContent : '';
  `
};

export class SearchResultExtractor {
  /**
   * Get search engine configuration
   */
  getEngineConfig(engine: SearchEngine): { url: string; selector: string } {
    return SEARCH_ENGINE_CONFIGS[engine];
  }

  /**
   * Get extraction script for specific engine
   */
  getExtractionScript(engine: SearchEngine): string {
    return EXTRACTION_SCRIPTS[engine];
  }

  /**
   * Sanitize CSS selector to prevent injection
   * Enhanced with comprehensive XSS and CSS injection protection
   */
  sanitizeSelector(selector: string): string {
    // Check for null/undefined
    if (!selector || typeof selector !== 'string') {
      throw new Error('[Search Engine Security] Invalid selector: must be a non-empty string');
    }

    // Length limit to prevent DoS
    if (selector.length > 500) {
      throw new Error('[Search Engine Security] Selector too long');
    }

    // Check for null bytes
    if (selector.includes('\x00')) {
      throw new Error('[Search Engine Security] Null byte detected in selector');
    }

    // Check for dangerous patterns - comprehensive XSS and CSS injection protection
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /eval\s*\(/i,
      /expression\s*\(/i,
      /url\s*\(/i,
      /import\s*\(/i,
      /@import/i,
      /binding\s*:/i,
      /-moz-binding/i,
      /behavior\s*:/i,
    ];
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(selector)) {
        throw new Error(`[Search Engine Security] Dangerous pattern detected in selector: ${selector}`);
      }
    }
    
    // Remove dangerous characters, allow CSS selector syntax
    const sanitized = selector.replace(/[^\w\s.\-#\[\]="':,>+~*()@]/g, '');
    
    // Check for quote escape attempts
    if ((sanitized.includes("'") && selector.includes("\\'")) ||
        (sanitized.includes('"') && selector.includes('\\"'))) {
      throw new Error('[Search Engine Security] Quote escape detected in selector');
    }

    // Verify balanced brackets
    const openBrackets = (sanitized.match(/\[/g) || []).length;
    const closeBrackets = (sanitized.match(/\]/g) || []).length;
    if (openBrackets !== closeBrackets) {
      throw new Error('[Search Engine Security] Unbalanced brackets in selector');
    }
    
    return sanitized;
  }

  /**
   * Extract search results from page
   */
  async extractResults(
    view: AutomationViewLike,
    engine: SearchEngine
  ): Promise<SearchResult[]> {
    const selector = SEARCH_ENGINE_CONFIGS[engine].selector;
    
    // Sanitize selector before use to prevent injection
    const sanitizedSelector = this.sanitizeSelector(selector);

    try {
      const results = await view.webContents.executeJavaScript(`
        (function() {
          const results = [];
          const elements = document.querySelectorAll('${sanitizedSelector}');
          
          elements.forEach((el, index) => {
            try {
              let title = '';
              let url = '';
              let snippet = '';
              
              ${this.getExtractionScript(engine)}
              
              if (title && url) {
                const domain = new URL(url).hostname;
                results.push({
                  title: title.trim(),
                  url: url.trim(),
                  snippet: snippet.trim(),
                  position: index + 1,
                  domain: domain
                });
              }
            } catch (e) {
              console.error('Error extracting result:', e);
            }
          });
          
          return results;
        })();
      `) as SearchResult[];

      return results;
    } catch (error) {
      console.error('[Search Engine] Failed to extract results:', error);
      return [];
    }
  }

  /**
   * Find target domain in results
   */
  findTargetDomain(results: SearchResult[], targetDomains: string[]): SearchResult | null {
    for (const result of results) {
      for (const target of targetDomains) {
        if (result.domain.includes(target) || target.includes(result.domain)) {
          return result;
        }
      }
    }
    return null;
  }
}

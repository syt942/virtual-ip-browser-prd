/**
 * Search Translation Handler Module
 * Handles translation integration for search operations (EP-008)
 */

import { Translator, LanguageDetector, TranslationCache } from '../../translation';
import type { SearchResult } from '../types';

export interface TranslationConfig {
  enabled: boolean;
  autoDetectLanguage: boolean;
  translateKeywords: boolean;
  translateResults: boolean;
  targetLanguage?: string;
  proxyTimezone?: string;
  proxyCountry?: string;
}

export interface TranslatedSearchResult extends SearchResult {
  originalTitle?: string;
  originalSnippet?: string;
  translatedFromLanguage?: string;
}

export class SearchTranslationHandler {
  private translator: Translator;
  private languageDetector: LanguageDetector;
  private config: TranslationConfig = {
    enabled: false,
    autoDetectLanguage: true,
    translateKeywords: true,
    translateResults: true
  };
  private sourceLanguage: string = 'en';

  constructor() {
    const cache = new TranslationCache({ maxSize: 10000 });
    this.translator = new Translator({ cache });
    this.languageDetector = new LanguageDetector();
  }

  /**
   * Configure translation settings
   */
  configureTranslation(config: Partial<TranslationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current translation configuration
   */
  getTranslationConfig(): TranslationConfig {
    return { ...this.config };
  }

  /**
   * Enable translation with proxy location settings
   */
  enableTranslation(proxyCountry?: string, proxyTimezone?: string): void {
    this.config.enabled = true;
    
    if (proxyCountry) {
      this.config.proxyCountry = proxyCountry;
      this.config.targetLanguage = this.translator.getLanguageForCountry(proxyCountry);
    } else if (proxyTimezone) {
      this.config.proxyTimezone = proxyTimezone;
      this.config.targetLanguage = this.translator.getLanguageForTimezone(proxyTimezone);
    }
  }

  /**
   * Disable translation
   */
  disableTranslation(): void {
    this.config.enabled = false;
  }

  /**
   * Check if translation is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Get the source language
   */
  getSourceLanguage(): string {
    return this.sourceLanguage;
  }

  /**
   * Set the source language
   */
  setSourceLanguage(lang: string): void {
    this.sourceLanguage = lang;
  }

  /**
   * Translate a search keyword if translation is enabled
   */
  async translateKeyword(keyword: string): Promise<{ 
    translatedKeyword: string; 
    detectedLang: string;
    wasTranslated: boolean;
  }> {
    if (!this.config.enabled || !this.config.translateKeywords) {
      return { translatedKeyword: keyword, detectedLang: 'en', wasTranslated: false };
    }

    let detectedSourceLang = 'en';

    // Detect source language
    if (this.config.autoDetectLanguage) {
      const detection = await this.languageDetector.detect(keyword);
      detectedSourceLang = detection.language;
      this.sourceLanguage = detectedSourceLang;
    }

    // Translate keyword to target language
    const targetLang = this.config.targetLanguage || 'en';
    if (detectedSourceLang !== targetLang) {
      const translated = await this.translator.translateKeyword(
        keyword,
        detectedSourceLang,
        targetLang
      );
      console.log(`[Search Engine] Translated keyword: "${keyword}" -> "${translated.translatedKeyword}" (${detectedSourceLang} -> ${targetLang})`);
      return { 
        translatedKeyword: translated.translatedKeyword, 
        detectedLang: detectedSourceLang,
        wasTranslated: true
      };
    }

    return { translatedKeyword: keyword, detectedLang: detectedSourceLang, wasTranslated: false };
  }

  /**
   * Translate search results back to source language
   */
  async translateSearchResults(
    results: SearchResult[],
    fromLang: string,
    toLang: string
  ): Promise<TranslatedSearchResult[]> {
    const translatedResults: TranslatedSearchResult[] = [];

    for (const result of results) {
      const titleTranslation = await this.translator.translate(result.title, fromLang, toLang);
      const snippetTranslation = await this.translator.translate(result.snippet, fromLang, toLang);

      translatedResults.push({
        ...result,
        title: titleTranslation.translatedText,
        snippet: snippetTranslation.translatedText,
        originalTitle: result.title,
        originalSnippet: result.snippet,
        translatedFromLanguage: fromLang
      });
    }

    return translatedResults;
  }

  /**
   * Detect language of text
   */
  async detectLanguage(text: string): Promise<{ language: string; confidence: number }> {
    return this.languageDetector.detect(text);
  }

  /**
   * Get translator instance for external use
   */
  getTranslator(): Translator {
    return this.translator;
  }

  /**
   * Get language detector instance for external use
   */
  getLanguageDetector(): LanguageDetector {
    return this.languageDetector;
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): string[] {
    return this.translator.getSupportedLanguages();
  }
}

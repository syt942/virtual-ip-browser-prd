/**
 * Translator Module (EP-008)
 * Provides translation services with caching and fallback handling
 */

import { TranslationCache } from './translation-cache';
import { LanguageDetector } from './language-detector';
import { 
  SUPPORTED_LANGUAGES,
  getLanguageForTimezone,
  getLanguageForCountry,
  isLanguageSupported
} from './language-mappings';
// TIMEZONE_LANGUAGE_MAP and COUNTRY_LANGUAGE_MAP are used via helper functions
import { 
  BASIC_TRANSLATIONS, 
  getBasicTranslation, 
  translateWordByWord 
} from './basic-translations';

export interface TranslationResult {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  cached: boolean;
  detectedSourceLanguage?: string;
  error?: string;
  fallback?: boolean;
}

export interface KeywordTranslationResult {
  originalKeyword: string;
  translatedKeyword: string;
  sourceLanguage: string;
  targetLanguage: string;
}

export interface SearchResultTranslation {
  originalTitle: string;
  originalSnippet: string;
  translatedTitle: string;
  translatedSnippet: string;
  url: string;
}

export interface SearchResult {
  title: string;
  snippet: string;
  url: string;
}

export interface TranslateOptions {
  fallbackToOriginal?: boolean;
}

export interface TranslatorConfig {
  cache?: TranslationCache;
  defaultSourceLang?: string;
  defaultTargetLang?: string;
  maxRetries?: number;
  retryDelay?: number;
}

export class Translator {
  private cache: TranslationCache;
  private detector: LanguageDetector;
  private maxRetries: number;
  private retryDelay: number;

  constructor(config: TranslatorConfig = {}) {
    this.cache = config.cache ?? new TranslationCache({ maxSize: 10000 });
    this.detector = new LanguageDetector();
    // Default languages are handled via config parameters in translate methods
    this.maxRetries = config.maxRetries ?? 3;
    this.retryDelay = config.retryDelay ?? 1000;
  }

  /**
   * Translate text from source to target language
   */
  async translate(
    text: string,
    sourceLang: string,
    targetLang: string,
    options: TranslateOptions = { fallbackToOriginal: true }
  ): Promise<TranslationResult> {
    // Handle null/undefined/empty
    if (!text || typeof text !== 'string') {
      return {
        translatedText: '',
        sourceLanguage: sourceLang,
        targetLanguage: targetLang,
        cached: false
      };
    }

    const trimmedText = text.trim();
    if (trimmedText === '') {
      return {
        translatedText: '',
        sourceLanguage: sourceLang,
        targetLanguage: targetLang,
        cached: false
      };
    }

    // Auto-detect source language if needed
    let detectedLang: string | undefined;
    let actualSourceLang = sourceLang;
    
    if (sourceLang === 'auto') {
      const detection = await this.detector.detect(trimmedText);
      detectedLang = detection.language;
      actualSourceLang = detectedLang;
    }

    // Same language - no translation needed
    if (actualSourceLang === targetLang) {
      return {
        translatedText: trimmedText,
        sourceLanguage: actualSourceLang,
        targetLanguage: targetLang,
        cached: false,
        detectedSourceLanguage: detectedLang
      };
    }

    // Check cache first
    const cached = this.cache.get(trimmedText, actualSourceLang, targetLang);
    if (cached !== undefined) {
      return {
        translatedText: cached,
        sourceLanguage: actualSourceLang,
        targetLanguage: targetLang,
        cached: true,
        detectedSourceLanguage: detectedLang
      };
    }

    // Try to translate with retries
    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const translated = await this.callTranslationAPI(trimmedText, actualSourceLang, targetLang);
        
        // Cache the result
        this.cache.set(trimmedText, actualSourceLang, targetLang, translated);
        
        return {
          translatedText: translated,
          sourceLanguage: actualSourceLang,
          targetLanguage: targetLang,
          cached: false,
          detectedSourceLanguage: detectedLang
        };
      } catch (error) {
        lastError = error as Error;
        if (attempt < this.maxRetries - 1) {
          await this.delay(this.retryDelay);
        }
      }
    }

    // All retries failed
    if (options.fallbackToOriginal) {
      return {
        translatedText: trimmedText,
        sourceLanguage: actualSourceLang,
        targetLanguage: targetLang,
        cached: false,
        detectedSourceLanguage: detectedLang,
        error: lastError?.message,
        fallback: true
      };
    }

    throw lastError;
  }

  /**
   * Translate multiple texts
   */
  async translateBatch(
    texts: string[],
    sourceLang: string,
    targetLang: string
  ): Promise<TranslationResult[]> {
    if (!texts || texts.length === 0) {
      return [];
    }

    const results: TranslationResult[] = [];
    
    for (const text of texts) {
      const result = await this.translate(text, sourceLang, targetLang);
      results.push(result);
    }

    return results;
  }

  /**
   * Translate a search keyword
   */
  async translateKeyword(
    keyword: string,
    sourceLang: string,
    targetLang: string
  ): Promise<KeywordTranslationResult> {
    const result = await this.translate(keyword, sourceLang, targetLang);
    
    return {
      originalKeyword: keyword,
      translatedKeyword: result.translatedText,
      sourceLanguage: result.sourceLanguage,
      targetLanguage: result.targetLanguage
    };
  }

  /**
   * Translate search results back to source language
   */
  async translateResults(
    results: SearchResult[],
    sourceLang: string,
    targetLang: string
  ): Promise<SearchResultTranslation[]> {
    if (!results || results.length === 0) {
      return [];
    }

    const translations: SearchResultTranslation[] = [];

    for (const result of results) {
      const titleTranslation = await this.translate(result.title, sourceLang, targetLang);
      const snippetTranslation = await this.translate(result.snippet, sourceLang, targetLang);

      translations.push({
        originalTitle: result.title,
        originalSnippet: result.snippet,
        translatedTitle: titleTranslation.translatedText,
        translatedSnippet: snippetTranslation.translatedText,
        url: result.url
      });
    }

    return translations;
  }

  /**
   * Get language code for a timezone
   */
  getLanguageForTimezone(timezone: string): string {
    return getLanguageForTimezone(timezone);
  }

  /**
   * Get language code for a country
   */
  getLanguageForCountry(countryCode: string): string {
    return getLanguageForCountry(countryCode);
  }

  /**
   * Get list of supported languages
   */
  getSupportedLanguages(): string[] {
    return [...SUPPORTED_LANGUAGES];
  }

  /**
   * Check if a language is supported
   */
  isLanguageSupported(langCode: string): boolean {
    return isLanguageSupported(langCode);
  }

  /**
   * Call the translation API (internal method)
   * Uses basic dictionary for testing, can be extended to use external API
   */
  private async callTranslationAPI(
    text: string,
    _sourceLang: string,
    targetLang: string
  ): Promise<string> {
    // For testing/development, use basic translations
    // In production, this would call @vitalets/google-translate-api or similar
    
    // Check if we have a basic translation
    const basicTranslation = getBasicTranslation(text, targetLang);
    if (basicTranslation) {
      return basicTranslation;
    }

    // Try to translate word by word for simple cases
    if (BASIC_TRANSLATIONS[targetLang]) {
      return translateWordByWord(text, targetLang);
    }

    // Fallback: return original (simulates API returning untranslated for unknown)
    return text;
  }

  /**
   * Delay helper for retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

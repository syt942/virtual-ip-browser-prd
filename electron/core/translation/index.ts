/**
 * Translation Module Exports (EP-008)
 * Translation Integration for Virtual IP Browser
 */

// Core translation classes
export { Translator } from './translator';
export { LanguageDetector } from './language-detector';
export { TranslationCache } from './translation-cache';

// Types
export type {
  TranslationResult,
  KeywordTranslationResult,
  SearchResultTranslation,
  SearchResult as TranslatableSearchResult,
  TranslateOptions,
  TranslatorConfig
} from './translator';

export type {
  DetectionResult,
  LanguageInfo
} from './language-detector';

export type {
  CacheEntry,
  CacheConfig,
  CacheStats
} from './translation-cache';

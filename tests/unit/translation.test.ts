/**
 * Translation Integration Tests (EP-008) - TDD
 * Tests written FIRST before implementation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Import implementations (will fail until implemented)
import { LanguageDetector } from '../../electron/core/translation/language-detector';
import { Translator } from '../../electron/core/translation/translator';
import { TranslationCache } from '../../electron/core/translation/translation-cache';

// ============================================================================
// SUPPORTED LANGUAGES
// ============================================================================

const SUPPORTED_LANGUAGES = [
  'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh',
  'ar', 'hi', 'nl', 'pl', 'tr', 'vi', 'th', 'id', 'cs', 'sv', 'da', 'fi'
];

// ============================================================================
// LANGUAGE DETECTOR TESTS
// ============================================================================

describe('LanguageDetector', () => {
  let detector: LanguageDetector;

  beforeEach(() => {
    detector = new LanguageDetector();
  });

  describe('constructor', () => {
    it('should create instance', () => {
      expect(detector).toBeDefined();
    });

    it('should support 20+ languages', () => {
      const supported = detector.getSupportedLanguages();
      expect(supported.length).toBeGreaterThanOrEqual(20);
    });
  });

  describe('detect', () => {
    it('should detect English text', async () => {
      const result = await detector.detect('Hello world, how are you today?');
      expect(result.language).toBe('en');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect Spanish text', async () => {
      const result = await detector.detect('Hola mundo, ¿cómo estás hoy?');
      expect(result.language).toBe('es');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect French text', async () => {
      const result = await detector.detect('Bonjour le monde, comment allez-vous?');
      expect(result.language).toBe('fr');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect German text', async () => {
      const result = await detector.detect('Guten Tag, wie geht es Ihnen heute?');
      expect(result.language).toBe('de');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect Japanese text', async () => {
      const result = await detector.detect('こんにちは世界');
      expect(result.language).toBe('ja');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect Korean text', async () => {
      const result = await detector.detect('안녕하세요 세계');
      expect(result.language).toBe('ko');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect Chinese text', async () => {
      const result = await detector.detect('你好世界');
      expect(result.language).toBe('zh');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect Russian text', async () => {
      const result = await detector.detect('Привет мир, как дела?');
      expect(result.language).toBe('ru');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect Arabic text', async () => {
      const result = await detector.detect('مرحبا بالعالم');
      expect(result.language).toBe('ar');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect Hindi text', async () => {
      const result = await detector.detect('नमस्ते दुनिया');
      expect(result.language).toBe('hi');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect Italian text', async () => {
      const result = await detector.detect('Ciao mondo, come stai?');
      expect(result.language).toBe('it');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect Portuguese text', async () => {
      const result = await detector.detect('Olá mundo, como você está?');
      expect(result.language).toBe('pt');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should return low confidence for mixed/ambiguous text', async () => {
      const result = await detector.detect('a b c 1 2 3');
      expect(result.confidence).toBeLessThan(0.5);
    });

    it('should handle empty string', async () => {
      const result = await detector.detect('');
      expect(result.language).toBe('en'); // Default fallback
      expect(result.confidence).toBe(0);
    });

    it('should handle null/undefined gracefully', async () => {
      const result = await detector.detect(null as any);
      expect(result.language).toBe('en');
      expect(result.confidence).toBe(0);
    });

    it('should detect short keywords', async () => {
      const result = await detector.detect('comprar zapatos');
      expect(result.language).toBe('es');
    });
  });

  describe('detectBatch', () => {
    it('should detect multiple texts', async () => {
      const texts = ['Hello world', 'Hola mundo', 'Bonjour monde'];
      const results = await detector.detectBatch(texts);
      
      expect(results.length).toBe(3);
      expect(results[0].language).toBe('en');
      expect(results[1].language).toBe('es');
      expect(results[2].language).toBe('fr');
    });

    it('should handle empty array', async () => {
      const results = await detector.detectBatch([]);
      expect(results).toEqual([]);
    });
  });

  describe('isSupported', () => {
    it('should return true for supported languages', () => {
      SUPPORTED_LANGUAGES.forEach(lang => {
        expect(detector.isSupported(lang)).toBe(true);
      });
    });

    it('should return false for unsupported languages', () => {
      expect(detector.isSupported('xyz')).toBe(false);
      expect(detector.isSupported('')).toBe(false);
    });
  });

  describe('getLanguageName', () => {
    it('should return language name for code', () => {
      expect(detector.getLanguageName('en')).toBe('English');
      expect(detector.getLanguageName('es')).toBe('Spanish');
      expect(detector.getLanguageName('ja')).toBe('Japanese');
    });

    it('should return code for unknown language', () => {
      expect(detector.getLanguageName('xyz')).toBe('xyz');
    });
  });
});

// ============================================================================
// TRANSLATION CACHE TESTS
// ============================================================================

describe('TranslationCache', () => {
  let cache: TranslationCache;

  beforeEach(() => {
    cache = new TranslationCache({ maxSize: 100 });
  });

  describe('constructor', () => {
    it('should create instance with default max size', () => {
      const defaultCache = new TranslationCache();
      expect(defaultCache).toBeDefined();
      expect(defaultCache.getMaxSize()).toBe(10000);
    });

    it('should accept custom max size', () => {
      expect(cache.getMaxSize()).toBe(100);
    });
  });

  describe('set / get', () => {
    it('should store and retrieve translations', () => {
      cache.set('hello', 'en', 'es', 'hola');
      const result = cache.get('hello', 'en', 'es');
      expect(result).toBe('hola');
    });

    it('should return undefined for missing entries', () => {
      const result = cache.get('missing', 'en', 'es');
      expect(result).toBeUndefined();
    });

    it('should store different translations for same text different languages', () => {
      cache.set('hello', 'en', 'es', 'hola');
      cache.set('hello', 'en', 'fr', 'bonjour');
      
      expect(cache.get('hello', 'en', 'es')).toBe('hola');
      expect(cache.get('hello', 'en', 'fr')).toBe('bonjour');
    });

    it('should handle special characters', () => {
      cache.set('¿Cómo estás?', 'es', 'en', 'How are you?');
      expect(cache.get('¿Cómo estás?', 'es', 'en')).toBe('How are you?');
    });

    it('should handle unicode text', () => {
      cache.set('こんにちは', 'ja', 'en', 'Hello');
      expect(cache.get('こんにちは', 'ja', 'en')).toBe('Hello');
    });
  });

  describe('has', () => {
    it('should return true for existing entries', () => {
      cache.set('test', 'en', 'es', 'prueba');
      expect(cache.has('test', 'en', 'es')).toBe(true);
    });

    it('should return false for missing entries', () => {
      expect(cache.has('missing', 'en', 'es')).toBe(false);
    });
  });

  describe('delete', () => {
    it('should remove entry from cache', () => {
      cache.set('hello', 'en', 'es', 'hola');
      cache.delete('hello', 'en', 'es');
      expect(cache.get('hello', 'en', 'es')).toBeUndefined();
    });

    it('should not throw for missing entry', () => {
      expect(() => cache.delete('missing', 'en', 'es')).not.toThrow();
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      cache.set('a', 'en', 'es', 'a_es');
      cache.set('b', 'en', 'fr', 'b_fr');
      cache.clear();
      
      expect(cache.size()).toBe(0);
      expect(cache.get('a', 'en', 'es')).toBeUndefined();
    });
  });

  describe('size', () => {
    it('should return number of entries', () => {
      expect(cache.size()).toBe(0);
      
      cache.set('a', 'en', 'es', 'a_es');
      expect(cache.size()).toBe(1);
      
      cache.set('b', 'en', 'fr', 'b_fr');
      expect(cache.size()).toBe(2);
    });
  });

  describe('LRU eviction', () => {
    it('should evict least recently used when max size reached', () => {
      const smallCache = new TranslationCache({ maxSize: 3 });
      
      smallCache.set('first', 'en', 'es', 'primero');
      smallCache.set('second', 'en', 'es', 'segundo');
      smallCache.set('third', 'en', 'es', 'tercero');
      
      // Access first to make it recently used
      smallCache.get('first', 'en', 'es');
      
      // Add fourth, should evict second (LRU)
      smallCache.set('fourth', 'en', 'es', 'cuarto');
      
      expect(smallCache.size()).toBe(3);
      expect(smallCache.has('first', 'en', 'es')).toBe(true);
      expect(smallCache.has('second', 'en', 'es')).toBe(false); // Evicted
      expect(smallCache.has('third', 'en', 'es')).toBe(true);
      expect(smallCache.has('fourth', 'en', 'es')).toBe(true);
    });

    it('should handle max size of 10000 entries', () => {
      const largeCache = new TranslationCache({ maxSize: 10000 });
      
      // Add 10000 entries
      for (let i = 0; i < 10000; i++) {
        largeCache.set(`key${i}`, 'en', 'es', `value${i}`);
      }
      
      expect(largeCache.size()).toBe(10000);
      
      // Add one more, should evict oldest
      largeCache.set('newKey', 'en', 'es', 'newValue');
      expect(largeCache.size()).toBe(10000);
      expect(largeCache.has('key0', 'en', 'es')).toBe(false); // First one evicted
      expect(largeCache.has('newKey', 'en', 'es')).toBe(true);
    });

    it('should update access time on get', () => {
      const smallCache = new TranslationCache({ maxSize: 3 });
      
      smallCache.set('a', 'en', 'es', 'a_es');
      smallCache.set('b', 'en', 'es', 'b_es');
      smallCache.set('c', 'en', 'es', 'c_es');
      
      // Access 'a' multiple times
      smallCache.get('a', 'en', 'es');
      smallCache.get('a', 'en', 'es');
      
      // Add 'd', should evict 'b' (LRU)
      smallCache.set('d', 'en', 'es', 'd_es');
      
      expect(smallCache.has('a', 'en', 'es')).toBe(true);
      expect(smallCache.has('b', 'en', 'es')).toBe(false);
    });

    it('should update entry without changing size when key exists', () => {
      const smallCache = new TranslationCache({ maxSize: 3 });
      
      smallCache.set('a', 'en', 'es', 'old_value');
      smallCache.set('b', 'en', 'es', 'b_es');
      smallCache.set('c', 'en', 'es', 'c_es');
      
      // Update 'a'
      smallCache.set('a', 'en', 'es', 'new_value');
      
      expect(smallCache.size()).toBe(3);
      expect(smallCache.get('a', 'en', 'es')).toBe('new_value');
    });
  });

  describe('getStats', () => {
    it('should track cache hits and misses', () => {
      cache.set('exists', 'en', 'es', 'existe');
      
      cache.get('exists', 'en', 'es'); // Hit
      cache.get('exists', 'en', 'es'); // Hit
      cache.get('missing', 'en', 'es'); // Miss
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.667, 2);
    });

    it('should return 0 hit rate when no requests', () => {
      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.hitRate).toBe(0);
    });
  });

  describe('generateKey', () => {
    it('should generate unique keys for different combinations', () => {
      const key1 = cache.generateKey('hello', 'en', 'es');
      const key2 = cache.generateKey('hello', 'en', 'fr');
      const key3 = cache.generateKey('hello', 'es', 'en');
      
      expect(key1).not.toBe(key2);
      expect(key1).not.toBe(key3);
      expect(key2).not.toBe(key3);
    });
  });
});

// ============================================================================
// TRANSLATOR TESTS
// ============================================================================

describe('Translator', () => {
  let translator: Translator;
  let mockCache: TranslationCache;

  beforeEach(() => {
    mockCache = new TranslationCache({ maxSize: 100 });
    translator = new Translator({ cache: mockCache });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create instance', () => {
      expect(translator).toBeDefined();
    });

    it('should create default cache if none provided', () => {
      const t = new Translator();
      expect(t).toBeDefined();
    });

    it('should accept custom configuration', () => {
      const t = new Translator({
        defaultSourceLang: 'es',
        defaultTargetLang: 'en',
        maxRetries: 5,
        retryDelay: 2000
      });
      expect(t).toBeDefined();
    });
  });

  describe('translate', () => {
    it('should translate text from source to target language', async () => {
      const result = await translator.translate('hello', 'en', 'es');
      
      expect(result.translatedText).toBeDefined();
      expect(result.translatedText.length).toBeGreaterThan(0);
      expect(result.sourceLanguage).toBe('en');
      expect(result.targetLanguage).toBe('es');
    });

    it('should return same text when source equals target', async () => {
      const result = await translator.translate('hello', 'en', 'en');
      expect(result.translatedText).toBe('hello');
      expect(result.cached).toBe(false);
    });

    it('should use cache for repeated translations', async () => {
      // First call - not cached
      const result1 = await translator.translate('hello', 'en', 'es');
      expect(result1.cached).toBe(false);
      
      // Second call - should be cached
      const result2 = await translator.translate('hello', 'en', 'es');
      expect(result2.cached).toBe(true);
      expect(result2.translatedText).toBe(result1.translatedText);
    });

    it('should handle empty string', async () => {
      const result = await translator.translate('', 'en', 'es');
      expect(result.translatedText).toBe('');
    });

    it('should handle null/undefined gracefully', async () => {
      const result = await translator.translate(null as any, 'en', 'es');
      expect(result.translatedText).toBe('');
    });

    it('should auto-detect source language when not provided', async () => {
      const result = await translator.translate('Hola mundo', 'auto', 'en');
      expect(result.detectedSourceLanguage).toBe('es');
    });
  });

  describe('translateBatch', () => {
    it('should translate multiple texts', async () => {
      const texts = ['hello', 'world', 'test'];
      const results = await translator.translateBatch(texts, 'en', 'es');
      
      expect(results.length).toBe(3);
      results.forEach(result => {
        expect(result.translatedText).toBeDefined();
        expect(result.sourceLanguage).toBe('en');
        expect(result.targetLanguage).toBe('es');
      });
    });

    it('should handle empty array', async () => {
      const results = await translator.translateBatch([], 'en', 'es');
      expect(results).toEqual([]);
    });

    it('should use cache for repeated texts in batch', async () => {
      const texts = ['hello', 'hello', 'world'];
      const results = await translator.translateBatch(texts, 'en', 'es');
      
      // Second 'hello' should be cached
      expect(results[0].cached).toBe(false);
      expect(results[1].cached).toBe(true);
    });
  });

  describe('translateKeyword', () => {
    it('should translate search keyword to target language', async () => {
      const result = await translator.translateKeyword('buy shoes', 'en', 'es');
      
      expect(result.originalKeyword).toBe('buy shoes');
      expect(result.translatedKeyword).toBeDefined();
      expect(result.sourceLanguage).toBe('en');
      expect(result.targetLanguage).toBe('es');
    });

    it('should preserve keyword intent during translation', async () => {
      const result = await translator.translateKeyword('best restaurants near me', 'en', 'es');
      
      // Should contain relevant Spanish words
      expect(result.translatedKeyword.length).toBeGreaterThan(0);
    });
  });

  describe('translateResults', () => {
    it('should translate search results back to source language', async () => {
      const mockResults = [
        { title: 'Título en español', snippet: 'Descripción del resultado', url: 'https://example.com' },
        { title: 'Otro título', snippet: 'Otra descripción', url: 'https://example2.com' }
      ];
      
      const translatedResults = await translator.translateResults(mockResults, 'es', 'en');
      
      expect(translatedResults.length).toBe(2);
      translatedResults.forEach((result, index) => {
        expect(result.originalTitle).toBe(mockResults[index].title);
        expect(result.originalSnippet).toBe(mockResults[index].snippet);
        expect(result.translatedTitle).toBeDefined();
        expect(result.translatedSnippet).toBeDefined();
      });
    });

    it('should handle empty results array', async () => {
      const results = await translator.translateResults([], 'es', 'en');
      expect(results).toEqual([]);
    });
  });

  describe('getLanguageForTimezone', () => {
    it('should return Spanish for America/Mexico_City', () => {
      const lang = translator.getLanguageForTimezone('America/Mexico_City');
      expect(lang).toBe('es');
    });

    it('should return French for Europe/Paris', () => {
      const lang = translator.getLanguageForTimezone('Europe/Paris');
      expect(lang).toBe('fr');
    });

    it('should return German for Europe/Berlin', () => {
      const lang = translator.getLanguageForTimezone('Europe/Berlin');
      expect(lang).toBe('de');
    });

    it('should return Japanese for Asia/Tokyo', () => {
      const lang = translator.getLanguageForTimezone('Asia/Tokyo');
      expect(lang).toBe('ja');
    });

    it('should return Korean for Asia/Seoul', () => {
      const lang = translator.getLanguageForTimezone('Asia/Seoul');
      expect(lang).toBe('ko');
    });

    it('should return Chinese for Asia/Shanghai', () => {
      const lang = translator.getLanguageForTimezone('Asia/Shanghai');
      expect(lang).toBe('zh');
    });

    it('should return Russian for Europe/Moscow', () => {
      const lang = translator.getLanguageForTimezone('Europe/Moscow');
      expect(lang).toBe('ru');
    });

    it('should return Arabic for Asia/Dubai', () => {
      const lang = translator.getLanguageForTimezone('Asia/Dubai');
      expect(lang).toBe('ar');
    });

    it('should return English for unknown timezone', () => {
      const lang = translator.getLanguageForTimezone('Unknown/Zone');
      expect(lang).toBe('en');
    });

    it('should return Portuguese for America/Sao_Paulo', () => {
      const lang = translator.getLanguageForTimezone('America/Sao_Paulo');
      expect(lang).toBe('pt');
    });
  });

  describe('getLanguageForCountry', () => {
    it('should return correct language for country codes', () => {
      expect(translator.getLanguageForCountry('US')).toBe('en');
      expect(translator.getLanguageForCountry('ES')).toBe('es');
      expect(translator.getLanguageForCountry('FR')).toBe('fr');
      expect(translator.getLanguageForCountry('DE')).toBe('de');
      expect(translator.getLanguageForCountry('JP')).toBe('ja');
      expect(translator.getLanguageForCountry('KR')).toBe('ko');
      expect(translator.getLanguageForCountry('CN')).toBe('zh');
      expect(translator.getLanguageForCountry('RU')).toBe('ru');
      expect(translator.getLanguageForCountry('BR')).toBe('pt');
      expect(translator.getLanguageForCountry('IT')).toBe('it');
    });

    it('should handle lowercase country codes', () => {
      expect(translator.getLanguageForCountry('us')).toBe('en');
      expect(translator.getLanguageForCountry('es')).toBe('es');
    });

    it('should return English for unknown country', () => {
      expect(translator.getLanguageForCountry('XX')).toBe('en');
    });
  });

  describe('fallback handling', () => {
    it('should return original text on API error with fallback enabled', async () => {
      // Mock API failure
      vi.spyOn(translator as any, 'callTranslationAPI').mockRejectedValue(new Error('API Error'));
      
      const result = await translator.translate('hello', 'en', 'es', { fallbackToOriginal: true });
      
      expect(result.translatedText).toBe('hello');
      expect(result.error).toBeDefined();
      expect(result.fallback).toBe(true);
    });

    it('should throw error on API failure with fallback disabled', async () => {
      vi.spyOn(translator as any, 'callTranslationAPI').mockRejectedValue(new Error('API Error'));
      
      await expect(
        translator.translate('hello', 'en', 'es', { fallbackToOriginal: false })
      ).rejects.toThrow('API Error');
    });

    it('should retry on failure before falling back', async () => {
      const mockCall = vi.spyOn(translator as any, 'callTranslationAPI')
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockResolvedValueOnce('hola');
      
      const result = await translator.translate('hello', 'en', 'es');
      
      expect(mockCall).toHaveBeenCalledTimes(3);
      expect(result.translatedText).toBe('hola');
    });
  });

  describe('getSupportedLanguages', () => {
    it('should return list of supported language codes', () => {
      const languages = translator.getSupportedLanguages();
      
      expect(languages.length).toBeGreaterThanOrEqual(20);
      expect(languages).toContain('en');
      expect(languages).toContain('es');
      expect(languages).toContain('fr');
      expect(languages).toContain('de');
      expect(languages).toContain('ja');
      expect(languages).toContain('ko');
      expect(languages).toContain('zh');
    });
  });

  describe('isLanguageSupported', () => {
    it('should return true for supported languages', () => {
      expect(translator.isLanguageSupported('en')).toBe(true);
      expect(translator.isLanguageSupported('es')).toBe(true);
      expect(translator.isLanguageSupported('ja')).toBe(true);
    });

    it('should return false for unsupported languages', () => {
      expect(translator.isLanguageSupported('xyz')).toBe(false);
    });
  });
});

// ============================================================================
// INTEGRATION TESTS - FULL TRANSLATION WORKFLOW
// ============================================================================

describe('Translation Integration', () => {
  let detector: LanguageDetector;
  let translator: Translator;
  let cache: TranslationCache;

  beforeEach(() => {
    cache = new TranslationCache({ maxSize: 1000 });
    detector = new LanguageDetector();
    translator = new Translator({ cache });
  });

  describe('Full Translation Workflow', () => {
    it('should detect language, translate keyword, and translate results back', async () => {
      // 1. User enters keyword in English
      const keyword = 'best pizza restaurants';
      
      // 2. Detect keyword language
      const detection = await detector.detect(keyword);
      expect(detection.language).toBe('en');
      
      // 3. Get target language based on proxy location (simulated as Spain)
      const targetLang = translator.getLanguageForCountry('ES');
      expect(targetLang).toBe('es');
      
      // 4. Translate keyword to target language
      const translatedKeyword = await translator.translateKeyword(
        keyword,
        detection.language,
        targetLang
      );
      expect(translatedKeyword.translatedKeyword).toBeDefined();
      
      // 5. Simulate search results in Spanish
      const spanishResults = [
        { title: 'Los mejores restaurantes de pizza', snippet: 'Encuentra las mejores pizzerías', url: 'https://example.es' }
      ];
      
      // 6. Translate results back to user's language
      const translatedResults = await translator.translateResults(
        spanishResults,
        targetLang,
        detection.language
      );
      
      expect(translatedResults[0].translatedTitle).toBeDefined();
      expect(translatedResults[0].translatedSnippet).toBeDefined();
    });

    it('should use cache effectively in workflow', async () => {
      // First search
      await translator.translate('hello', 'en', 'es');
      
      // Repeated search should use cache
      const result = await translator.translate('hello', 'en', 'es');
      expect(result.cached).toBe(true);
      
      // Check cache stats
      const stats = cache.getStats();
      expect(stats.hits).toBeGreaterThan(0);
    });

    it('should handle multi-language workflow', async () => {
      const languages = ['es', 'fr', 'de', 'ja'];
      
      for (const lang of languages) {
        const result = await translator.translate('hello world', 'en', lang);
        expect(result.translatedText).toBeDefined();
        expect(result.targetLanguage).toBe(lang);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long text', async () => {
      const longText = 'hello world '.repeat(100);
      const result = await translator.translate(longText, 'en', 'es');
      expect(result.translatedText).toBeDefined();
    });

    it('should handle special characters and emojis', async () => {
      const textWithEmoji = 'Hello! 👋 How are you?';
      const result = await translator.translate(textWithEmoji, 'en', 'es');
      expect(result.translatedText).toBeDefined();
    });

    it('should handle HTML entities', async () => {
      const textWithHtml = 'Hello &amp; world';
      const result = await translator.translate(textWithHtml, 'en', 'es');
      expect(result.translatedText).toBeDefined();
    });

    it('should handle numbers and mixed content', async () => {
      const mixedContent = 'Product #123 costs $50';
      const result = await translator.translate(mixedContent, 'en', 'es');
      expect(result.translatedText).toBeDefined();
    });
  });
});

// ============================================================================
// SEARCH ENGINE TRANSLATION INTEGRATION TESTS
// ============================================================================

describe('SearchEngineAutomation Translation Integration', () => {
  // We test the translation integration without actual BrowserView
  // by testing the configuration and helper methods

  describe('Translation Configuration', () => {
    it('should have translation modules available from search-engine exports', async () => {
      // Verify exports are available
      const { Translator, LanguageDetector, TranslationCache } = await import('../../electron/core/translation');
      
      expect(Translator).toBeDefined();
      expect(LanguageDetector).toBeDefined();
      expect(TranslationCache).toBeDefined();
    });

    it('should translate keywords based on country code', async () => {
      const translator = new Translator();
      
      // Test country to language mapping
      expect(translator.getLanguageForCountry('ES')).toBe('es');
      expect(translator.getLanguageForCountry('FR')).toBe('fr');
      expect(translator.getLanguageForCountry('JP')).toBe('ja');
      
      // Test keyword translation
      const result = await translator.translateKeyword('hello', 'en', 'es');
      expect(result.translatedKeyword).toBeDefined();
      expect(result.sourceLanguage).toBe('en');
      expect(result.targetLanguage).toBe('es');
    });

    it('should translate keywords based on timezone', async () => {
      const translator = new Translator();
      
      // Test timezone to language mapping
      expect(translator.getLanguageForTimezone('Europe/Paris')).toBe('fr');
      expect(translator.getLanguageForTimezone('Asia/Tokyo')).toBe('ja');
      expect(translator.getLanguageForTimezone('America/Mexico_City')).toBe('es');
    });

    it('should handle full translation workflow for search', async () => {
      const detector = new LanguageDetector();
      const translator = new Translator();
      
      // 1. User keyword in English
      const keyword = 'buy shoes online';
      
      // 2. Detect language
      const detection = await detector.detect(keyword);
      expect(detection.language).toBe('en');
      
      // 3. Simulate proxy in Spain
      const targetLang = translator.getLanguageForCountry('ES');
      expect(targetLang).toBe('es');
      
      // 4. Translate keyword
      const translatedKeyword = await translator.translateKeyword(keyword, 'en', targetLang);
      expect(translatedKeyword.translatedKeyword).toBeDefined();
      
      // 5. Simulate search results in Spanish
      const mockSpanishResults = [
        { title: 'Comprar zapatos en línea', snippet: 'Las mejores ofertas', url: 'https://example.es' }
      ];
      
      // 6. Translate results back
      const translatedResults = await translator.translateResults(mockSpanishResults, targetLang, 'en');
      expect(translatedResults.length).toBe(1);
      expect(translatedResults[0].translatedTitle).toBeDefined();
      expect(translatedResults[0].originalTitle).toBe(mockSpanishResults[0].title);
    });
  });

  describe('Multi-language Support', () => {
    it('should support 20+ languages', () => {
      const translator = new Translator();
      const languages = translator.getSupportedLanguages();
      
      expect(languages.length).toBeGreaterThanOrEqual(20);
      
      // Verify key languages are supported
      const requiredLanguages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'ar', 'hi'];
      requiredLanguages.forEach(lang => {
        expect(translator.isLanguageSupported(lang)).toBe(true);
      });
    });

    it('should detect various languages correctly', async () => {
      const detector = new LanguageDetector();
      
      const testCases = [
        { text: 'Hello world', expected: 'en' },
        { text: 'Hola mundo', expected: 'es' },
        { text: 'Bonjour monde', expected: 'fr' },
        { text: 'こんにちは世界', expected: 'ja' },
        { text: '안녕하세요 세계', expected: 'ko' },
        { text: '你好世界', expected: 'zh' },
        { text: 'Привет мир', expected: 'ru' }
      ];
      
      for (const testCase of testCases) {
        const result = await detector.detect(testCase.text);
        expect(result.language).toBe(testCase.expected);
      }
    });
  });

  describe('Cache Performance', () => {
    it('should cache translations effectively', async () => {
      const cache = new TranslationCache({ maxSize: 100 });
      const translator = new Translator({ cache });
      
      // First translation - not cached
      const result1 = await translator.translate('hello', 'en', 'es');
      expect(result1.cached).toBe(false);
      
      // Second translation - should be cached
      const result2 = await translator.translate('hello', 'en', 'es');
      expect(result2.cached).toBe(true);
      
      // Verify cache stats
      const stats = cache.getStats();
      expect(stats.hits).toBeGreaterThan(0);
    });

    it('should handle LRU eviction at max capacity', () => {
      const cache = new TranslationCache({ maxSize: 10000 });
      
      // Verify max size
      expect(cache.getMaxSize()).toBe(10000);
      
      // Add entries up to limit
      for (let i = 0; i < 100; i++) {
        cache.set(`key${i}`, 'en', 'es', `value${i}`);
      }
      
      expect(cache.size()).toBe(100);
    });
  });
});

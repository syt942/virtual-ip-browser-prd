# Translation Module Codemap (EP-008)

**Last Updated:** 2025-01-28  
**Location:** `electron/core/translation/`  
**Entry Point:** `index.ts`

## Overview

The Translation module (EP-008) provides multi-language support with 30+ languages, automatic language detection, LRU caching, and timezone/country-based language inference. It enables search automation in local languages for geographic targeting.

## Architecture

```
electron/core/translation/
├── index.ts              # Module exports
├── translator.ts         # Core translation service
├── language-detector.ts  # Language detection engine
└── translation-cache.ts  # LRU cache implementation
```

## Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       Translation System                                 │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                        Translator                                 │   │
│  │                                                                   │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐   │   │
│  │  │  translate  │  │ translateBatch│ │ translateKeyword        │   │   │
│  │  │  (single)   │  │ (multiple)   │  │ translateResults        │   │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────┘   │   │
│  │                                                                   │   │
│  │  ┌─────────────────────────────────────────────────────────────┐ │   │
│  │  │              Language Mappings                               │ │   │
│  │  │  - Timezone → Language (40+ mappings)                       │ │   │
│  │  │  - Country → Language (60+ mappings)                        │ │   │
│  │  │  - Basic Dictionary (12 languages × common words)           │ │   │
│  │  └─────────────────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                          │                    │                          │
│                          ▼                    ▼                          │
│  ┌──────────────────────────────┐  ┌────────────────────────────────┐   │
│  │     LanguageDetector         │  │      TranslationCache          │   │
│  │                              │  │                                │   │
│  │  - N-gram analysis           │  │  - LRU eviction policy         │   │
│  │  - Common word matching      │  │  - 10,000 entry default        │   │
│  │  - Regex patterns            │  │  - Hit/miss statistics         │   │
│  │  - 12 language profiles      │  │  - Import/export support       │   │
│  └──────────────────────────────┘  └────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

## Supported Languages (30+)

| Code | Language | Code | Language | Code | Language |
|------|----------|------|----------|------|----------|
| `en` | English | `ja` | Japanese | `pl` | Polish |
| `es` | Spanish | `ko` | Korean | `tr` | Turkish |
| `fr` | French | `zh` | Chinese | `vi` | Vietnamese |
| `de` | German | `ar` | Arabic | `th` | Thai |
| `it` | Italian | `hi` | Hindi | `id` | Indonesian |
| `pt` | Portuguese | `nl` | Dutch | `cs` | Czech |
| `ru` | Russian | `sv` | Swedish | `el` | Greek |
| `da` | Danish | `fi` | Finnish | `he` | Hebrew |
| `no` | Norwegian | `uk` | Ukrainian | `hu` | Hungarian |
| `ro` | Romanian | `sk` | Slovak | `bg` | Bulgarian |

## Key Types

```typescript
interface TranslationResult {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  cached: boolean;
  detectedSourceLanguage?: string;
  error?: string;
  fallback?: boolean;
}

interface KeywordTranslationResult {
  originalKeyword: string;
  translatedKeyword: string;
  sourceLanguage: string;
  targetLanguage: string;
}

interface DetectionResult {
  language: string;
  confidence: number;
  alternatives: Array<{ language: string; confidence: number }>;
}

interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  maxSize: number;
}
```

## Translator Class

```typescript
class Translator {
  constructor(config?: TranslatorConfig);
  
  // Core translation
  translate(text: string, sourceLang: string, targetLang: string, 
            options?: TranslateOptions): Promise<TranslationResult>;
  translateBatch(texts: string[], sourceLang: string, 
                 targetLang: string): Promise<TranslationResult[]>;
  
  // Search-specific
  translateKeyword(keyword: string, sourceLang: string, 
                   targetLang: string): Promise<KeywordTranslationResult>;
  translateResults(results: SearchResult[], sourceLang: string, 
                   targetLang: string): Promise<SearchResultTranslation[]>;
  
  // Language utilities
  getLanguageForTimezone(timezone: string): string;
  getLanguageForCountry(countryCode: string): string;
  getSupportedLanguages(): string[];
  isLanguageSupported(langCode: string): boolean;
}
```

## Language Detector Class

```typescript
class LanguageDetector {
  // Detection
  detect(text: string): Promise<DetectionResult>;
  detectSync(text: string): DetectionResult;
  
  // Supported languages for detection
  getSupportedLanguages(): string[];
}
```

## Translation Cache Class

```typescript
class TranslationCache {
  constructor(config?: CacheConfig);
  
  // Cache operations
  get(text: string, sourceLang: string, targetLang: string): string | undefined;
  set(text: string, sourceLang: string, targetLang: string, translation: string): void;
  has(text: string, sourceLang: string, targetLang: string): boolean;
  delete(text: string, sourceLang: string, targetLang: string): void;
  clear(): void;
  
  // Statistics
  size(): number;
  getMaxSize(): number;
  getStats(): CacheStats;
  
  // Persistence
  getEntries(): CacheEntry[];
  importEntries(entries: CacheEntry[]): void;
}
```

## Usage Examples

### Basic Translation
```typescript
const translator = new Translator();

// Simple translation
const result = await translator.translate('Hello world', 'en', 'es');
// { translatedText: 'hola mundo', sourceLanguage: 'en', targetLanguage: 'es', cached: false }

// Auto-detect source language
const result2 = await translator.translate('Bonjour monde', 'auto', 'en');
// { translatedText: 'hello world', detectedSourceLanguage: 'fr', ... }
```

### Search Keyword Translation
```typescript
// Translate search keyword for local search
const keywordResult = await translator.translateKeyword('best laptop', 'en', 'de');
// { originalKeyword: 'best laptop', translatedKeyword: 'beste laptop', ... }
```

### Geographic Language Selection
```typescript
// Get language from timezone
const lang1 = translator.getLanguageForTimezone('Europe/Paris');
// Returns: 'fr'

// Get language from country code
const lang2 = translator.getLanguageForCountry('JP');
// Returns: 'ja'
```

### Language Detection
```typescript
const detector = new LanguageDetector();

const result = await detector.detect('こんにちは世界');
// { language: 'ja', confidence: 0.95, alternatives: [...] }

const result2 = detector.detectSync('Bonjour le monde');
// { language: 'fr', confidence: 0.87, alternatives: [...] }
```

## Timezone to Language Mapping

```typescript
// Americas
'America/New_York': 'en',    'America/Mexico_City': 'es',
'America/Sao_Paulo': 'pt',   'America/Buenos_Aires': 'es',

// Europe
'Europe/London': 'en',       'Europe/Paris': 'fr',
'Europe/Berlin': 'de',       'Europe/Madrid': 'es',
'Europe/Rome': 'it',         'Europe/Moscow': 'ru',

// Asia
'Asia/Tokyo': 'ja',          'Asia/Seoul': 'ko',
'Asia/Shanghai': 'zh',       'Asia/Mumbai': 'hi',
'Asia/Dubai': 'ar',          'Asia/Bangkok': 'th',
```

## Data Flow

```
┌─────────────┐     ┌──────────────────┐     ┌───────────────────┐
│   Input     │────►│ Language Check   │────►│ Cache Lookup      │
│   Text      │     │                  │     │                   │
└─────────────┘     │ - Auto-detect?   │     │ - Hit → Return    │
                    │ - Same lang?     │     │ - Miss → Continue │
                    └──────────────────┘     └─────────┬─────────┘
                                                       │
                    ┌──────────────────┐               │
                    │ Translation API  │◄──────────────┘
                    │                  │
                    │ - Dictionary     │
                    │ - External API   │
                    │ - Retry logic    │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  Cache Result    │
                    │  & Return        │
                    └──────────────────┘
```

## Cache Statistics Example

```typescript
const cache = new TranslationCache({ maxSize: 10000 });

// After usage...
const stats = cache.getStats();
// {
//   hits: 847,
//   misses: 153,
//   hitRate: 0.847,
//   size: 1000,
//   maxSize: 10000
// }
```

## Integration with Automation

```typescript
// In search automation, translate keywords based on target region
const proxyGeo = selectedProxy.geolocation;
const targetLang = translator.getLanguageForCountry(proxyGeo.country);

const translatedKeyword = await translator.translateKeyword(
  searchKeyword, 
  'en', 
  targetLang
);

// Execute search with translated keyword
await searchEngine.search(translatedKeyword.translatedKeyword);
```

## Related Modules

- [Proxy Engine](./proxy-engine.md) - Geographic proxy selection determines target language
- [Automation](./automation.md) - Search automation uses translated keywords
- [Creator Support](./creator-support.md) - Multi-language platform support

---

*See `electron/core/translation/` for full implementation details.*

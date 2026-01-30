# Implementation Plan: Translation Integration (EP-008)

## Overview

Integrate translation capabilities for search automation across different regions. This module will automatically detect keyword languages, translate keywords to match proxy locations, translate search results back to the user's language, and implement intelligent caching to minimize API costs.

## Requirements

### Functional Requirements
- **FR-001**: Automatic language detection for search keywords
- **FR-002**: Keyword translation to target language based on proxy geolocation
- **FR-003**: Search result translation back to user's preferred language
- **FR-004**: Support for 20+ languages minimum
- **FR-005**: Translation caching to reduce API calls and costs
- **FR-006**: Configurable translation provider (Google Translate, DeepL, or local)
- **FR-007**: Fallback mechanism when translation fails
- **FR-008**: Batch translation support for efficiency

### Non-Functional Requirements
- **NFR-001**: Translation latency < 500ms for cached results
- **NFR-002**: API call reduction of 70%+ through caching
- **NFR-003**: Graceful degradation when API unavailable
- **NFR-004**: Memory-efficient cache with configurable limits

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Translation Module                               │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                    TranslationManager                            ││
│  │  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐         ││
│  │  │LanguageDetector│ │  Translator   │ │TranslationCache│        ││
│  │  └───────────────┘ └───────────────┘ └───────────────┘         ││
│  └─────────────────────────────────────────────────────────────────┘│
│                              ↓                                       │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                   Translation Providers                          ││
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               ││
│  │  │GoogleProvider│ │DeepLProvider│ │LocalProvider│               ││
│  │  └─────────────┘ └─────────────┘ └─────────────┘               ││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                     Integration Points                               │
│  ┌───────────────┐    ┌───────────────┐    ┌───────────────┐       │
│  │ ProxyManager  │ ←→ │SearchAutomation│ ←→ │  TaskExecutor │       │
│  │ (get region)  │    │(translate kw)  │    │(translate res)│       │
│  └───────────────┘    └───────────────┘    └───────────────┘       │
└─────────────────────────────────────────────────────────────────────┘
```

## Technology Decision: Translation Provider

### Option Analysis

| Provider | Pros | Cons | Cost |
|----------|------|------|------|
| **Google Translate API** | Accurate, 100+ languages, reliable | Requires API key, costs per character | $20/1M chars |
| **DeepL API** | Higher quality translations, better context | Fewer languages (29), higher cost | $25/1M chars |
| **Local (franc + simple-translator)** | Free, no API limits, offline capable | Lower accuracy, limited languages | Free |

### Recommendation
Implement a **provider-agnostic architecture** with all three options:
1. **Default**: Local provider for development/testing
2. **Production**: Google Translate API (best coverage/cost ratio)
3. **Premium**: DeepL API (opt-in for higher quality)

---

## File Structure

```
electron/core/translation/
├── index.ts                    # Module exports & TranslationManager
├── types.ts                    # Type definitions
├── language-detector.ts        # Language detection logic
├── translator.ts               # Main translator with provider abstraction
├── translation-cache.ts        # LRU cache with TTL support
├── region-language-map.ts      # Proxy region to language mapping
└── providers/
    ├── index.ts                # Provider exports
    ├── base-provider.ts        # Abstract base class
    ├── google-provider.ts      # Google Translate API
    ├── deepl-provider.ts       # DeepL API
    └── local-provider.ts       # Offline translation

electron/database/
├── migrations/
│   └── 003_translation_cache.sql   # Database migration
└── repositories/
    └── translation.repository.ts    # Translation data access

electron/ipc/handlers/
└── translation.ts              # IPC handlers

src/stores/
└── translationStore.ts         # Zustand store

src/components/panels/
└── TranslationPanel.tsx        # UI component
```

---

## Implementation Steps

### Phase 1: Core Types & Infrastructure (Day 1)

#### Step 1.1: Create Type Definitions
**File:** `electron/core/translation/types.ts`

```typescript
/**
 * Translation Module Types
 */

// Supported languages (ISO 639-1 codes)
export type LanguageCode = 
  | 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt' | 'ru' | 'zh' | 'ja' | 'ko'
  | 'ar' | 'hi' | 'bn' | 'pa' | 'vi' | 'th' | 'tr' | 'pl' | 'uk' | 'nl'
  | 'sv' | 'no' | 'da' | 'fi' | 'cs' | 'ro' | 'hu' | 'el' | 'he' | 'id'
  | 'ms' | 'tl' | 'auto';

export type TranslationProvider = 'google' | 'deepl' | 'local';

export interface LanguageDetectionResult {
  language: LanguageCode;
  confidence: number;  // 0-1
  alternatives?: Array<{ language: LanguageCode; confidence: number }>;
}

export interface TranslationRequest {
  text: string;
  sourceLanguage?: LanguageCode;  // 'auto' for auto-detect
  targetLanguage: LanguageCode;
  context?: 'keyword' | 'title' | 'snippet' | 'general';
}

export interface TranslationResult {
  originalText: string;
  translatedText: string;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  provider: TranslationProvider;
  cached: boolean;
  confidence?: number;
  timestamp: Date;
}

export interface BatchTranslationRequest {
  texts: string[];
  sourceLanguage?: LanguageCode;
  targetLanguage: LanguageCode;
  context?: 'keyword' | 'title' | 'snippet' | 'general';
}

export interface BatchTranslationResult {
  results: TranslationResult[];
  totalCharacters: number;
  cachedCount: number;
  apiCallCount: number;
}

export interface TranslationConfig {
  provider: TranslationProvider;
  apiKey?: string;
  defaultSourceLanguage: LanguageCode;
  defaultTargetLanguage: LanguageCode;
  enableCache: boolean;
  cacheTTL: number;  // milliseconds
  maxCacheSize: number;  // number of entries
  retryAttempts: number;
  timeout: number;  // milliseconds
  fallbackProvider?: TranslationProvider;
}

export interface TranslationStats {
  totalTranslations: number;
  cacheHits: number;
  cacheMisses: number;
  cacheHitRate: number;
  apiCalls: number;
  totalCharactersTranslated: number;
  estimatedCostSaved: number;  // USD
  errorCount: number;
  averageLatency: number;
}

export interface CacheEntry {
  key: string;  // hash of source+target+text
  originalText: string;
  translatedText: string;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  provider: TranslationProvider;
  createdAt: Date;
  accessedAt: Date;
  accessCount: number;
  expiresAt: Date;
}

export interface RegionLanguageMapping {
  countryCode: string;
  countryName: string;
  primaryLanguage: LanguageCode;
  alternativeLanguages?: LanguageCode[];
  searchEngineLanguage?: string;  // e.g., 'lang_en' for Google
}

// Provider-specific types
export interface ProviderConfig {
  apiKey?: string;
  apiEndpoint?: string;
  timeout?: number;
  maxRetries?: number;
}

export interface ProviderResponse {
  translatedText: string;
  detectedLanguage?: LanguageCode;
  confidence?: number;
  characterCount: number;
}
```

**Action:** Create comprehensive type definitions for translation module
**Why:** Type safety ensures correct integration across components
**Dependencies:** None
**Risk:** Low

---

#### Step 1.2: Create Region-Language Mapping
**File:** `electron/core/translation/region-language-map.ts`

```typescript
/**
 * Region to Language Mapping
 * Maps proxy geolocations to appropriate languages for translation
 */

import type { LanguageCode, RegionLanguageMapping } from './types';

export const REGION_LANGUAGE_MAP: Record<string, RegionLanguageMapping> = {
  // North America
  'US': { countryCode: 'US', countryName: 'United States', primaryLanguage: 'en', searchEngineLanguage: 'lang_en' },
  'CA': { countryCode: 'CA', countryName: 'Canada', primaryLanguage: 'en', alternativeLanguages: ['fr'], searchEngineLanguage: 'lang_en' },
  'MX': { countryCode: 'MX', countryName: 'Mexico', primaryLanguage: 'es', searchEngineLanguage: 'lang_es' },
  
  // Europe
  'GB': { countryCode: 'GB', countryName: 'United Kingdom', primaryLanguage: 'en', searchEngineLanguage: 'lang_en' },
  'DE': { countryCode: 'DE', countryName: 'Germany', primaryLanguage: 'de', searchEngineLanguage: 'lang_de' },
  'FR': { countryCode: 'FR', countryName: 'France', primaryLanguage: 'fr', searchEngineLanguage: 'lang_fr' },
  'ES': { countryCode: 'ES', countryName: 'Spain', primaryLanguage: 'es', searchEngineLanguage: 'lang_es' },
  'IT': { countryCode: 'IT', countryName: 'Italy', primaryLanguage: 'it', searchEngineLanguage: 'lang_it' },
  'PT': { countryCode: 'PT', countryName: 'Portugal', primaryLanguage: 'pt', searchEngineLanguage: 'lang_pt' },
  'NL': { countryCode: 'NL', countryName: 'Netherlands', primaryLanguage: 'nl', searchEngineLanguage: 'lang_nl' },
  'BE': { countryCode: 'BE', countryName: 'Belgium', primaryLanguage: 'nl', alternativeLanguages: ['fr', 'de'], searchEngineLanguage: 'lang_nl' },
  'PL': { countryCode: 'PL', countryName: 'Poland', primaryLanguage: 'pl', searchEngineLanguage: 'lang_pl' },
  'RU': { countryCode: 'RU', countryName: 'Russia', primaryLanguage: 'ru', searchEngineLanguage: 'lang_ru' },
  'UA': { countryCode: 'UA', countryName: 'Ukraine', primaryLanguage: 'uk', alternativeLanguages: ['ru'], searchEngineLanguage: 'lang_uk' },
  'SE': { countryCode: 'SE', countryName: 'Sweden', primaryLanguage: 'sv', searchEngineLanguage: 'lang_sv' },
  'NO': { countryCode: 'NO', countryName: 'Norway', primaryLanguage: 'no', searchEngineLanguage: 'lang_no' },
  'DK': { countryCode: 'DK', countryName: 'Denmark', primaryLanguage: 'da', searchEngineLanguage: 'lang_da' },
  'FI': { countryCode: 'FI', countryName: 'Finland', primaryLanguage: 'fi', searchEngineLanguage: 'lang_fi' },
  'CZ': { countryCode: 'CZ', countryName: 'Czech Republic', primaryLanguage: 'cs', searchEngineLanguage: 'lang_cs' },
  'RO': { countryCode: 'RO', countryName: 'Romania', primaryLanguage: 'ro', searchEngineLanguage: 'lang_ro' },
  'HU': { countryCode: 'HU', countryName: 'Hungary', primaryLanguage: 'hu', searchEngineLanguage: 'lang_hu' },
  'GR': { countryCode: 'GR', countryName: 'Greece', primaryLanguage: 'el', searchEngineLanguage: 'lang_el' },
  'TR': { countryCode: 'TR', countryName: 'Turkey', primaryLanguage: 'tr', searchEngineLanguage: 'lang_tr' },
  
  // Asia
  'CN': { countryCode: 'CN', countryName: 'China', primaryLanguage: 'zh', searchEngineLanguage: 'lang_zh-CN' },
  'JP': { countryCode: 'JP', countryName: 'Japan', primaryLanguage: 'ja', searchEngineLanguage: 'lang_ja' },
  'KR': { countryCode: 'KR', countryName: 'South Korea', primaryLanguage: 'ko', searchEngineLanguage: 'lang_ko' },
  'IN': { countryCode: 'IN', countryName: 'India', primaryLanguage: 'hi', alternativeLanguages: ['en', 'bn', 'pa'], searchEngineLanguage: 'lang_hi' },
  'TH': { countryCode: 'TH', countryName: 'Thailand', primaryLanguage: 'th', searchEngineLanguage: 'lang_th' },
  'VN': { countryCode: 'VN', countryName: 'Vietnam', primaryLanguage: 'vi', searchEngineLanguage: 'lang_vi' },
  'ID': { countryCode: 'ID', countryName: 'Indonesia', primaryLanguage: 'id', searchEngineLanguage: 'lang_id' },
  'MY': { countryCode: 'MY', countryName: 'Malaysia', primaryLanguage: 'ms', alternativeLanguages: ['en'], searchEngineLanguage: 'lang_ms' },
  'PH': { countryCode: 'PH', countryName: 'Philippines', primaryLanguage: 'tl', alternativeLanguages: ['en'], searchEngineLanguage: 'lang_tl' },
  
  // Middle East
  'IL': { countryCode: 'IL', countryName: 'Israel', primaryLanguage: 'he', searchEngineLanguage: 'lang_he' },
  'AE': { countryCode: 'AE', countryName: 'United Arab Emirates', primaryLanguage: 'ar', alternativeLanguages: ['en'], searchEngineLanguage: 'lang_ar' },
  'SA': { countryCode: 'SA', countryName: 'Saudi Arabia', primaryLanguage: 'ar', searchEngineLanguage: 'lang_ar' },
  
  // South America
  'BR': { countryCode: 'BR', countryName: 'Brazil', primaryLanguage: 'pt', searchEngineLanguage: 'lang_pt' },
  'AR': { countryCode: 'AR', countryName: 'Argentina', primaryLanguage: 'es', searchEngineLanguage: 'lang_es' },
  'CL': { countryCode: 'CL', countryName: 'Chile', primaryLanguage: 'es', searchEngineLanguage: 'lang_es' },
  'CO': { countryCode: 'CO', countryName: 'Colombia', primaryLanguage: 'es', searchEngineLanguage: 'lang_es' },
  
  // Oceania
  'AU': { countryCode: 'AU', countryName: 'Australia', primaryLanguage: 'en', searchEngineLanguage: 'lang_en' },
  'NZ': { countryCode: 'NZ', countryName: 'New Zealand', primaryLanguage: 'en', searchEngineLanguage: 'lang_en' },
};

// Language display names for UI
export const LANGUAGE_NAMES: Record<LanguageCode, string> = {
  'en': 'English',
  'es': 'Spanish',
  'fr': 'French',
  'de': 'German',
  'it': 'Italian',
  'pt': 'Portuguese',
  'ru': 'Russian',
  'zh': 'Chinese',
  'ja': 'Japanese',
  'ko': 'Korean',
  'ar': 'Arabic',
  'hi': 'Hindi',
  'bn': 'Bengali',
  'pa': 'Punjabi',
  'vi': 'Vietnamese',
  'th': 'Thai',
  'tr': 'Turkish',
  'pl': 'Polish',
  'uk': 'Ukrainian',
  'nl': 'Dutch',
  'sv': 'Swedish',
  'no': 'Norwegian',
  'da': 'Danish',
  'fi': 'Finnish',
  'cs': 'Czech',
  'ro': 'Romanian',
  'hu': 'Hungarian',
  'el': 'Greek',
  'he': 'Hebrew',
  'id': 'Indonesian',
  'ms': 'Malay',
  'tl': 'Filipino',
  'auto': 'Auto-detect'
};

/**
 * Get language for a proxy region
 */
export function getLanguageForRegion(countryCode: string): LanguageCode {
  const mapping = REGION_LANGUAGE_MAP[countryCode.toUpperCase()];
  return mapping?.primaryLanguage || 'en';
}

/**
 * Get all languages for a region (primary + alternatives)
 */
export function getAllLanguagesForRegion(countryCode: string): LanguageCode[] {
  const mapping = REGION_LANGUAGE_MAP[countryCode.toUpperCase()];
  if (!mapping) return ['en'];
  
  const languages: LanguageCode[] = [mapping.primaryLanguage];
  if (mapping.alternativeLanguages) {
    languages.push(...mapping.alternativeLanguages);
  }
  return languages;
}

/**
 * Get search engine language parameter for region
 */
export function getSearchEngineLanguage(countryCode: string): string | undefined {
  const mapping = REGION_LANGUAGE_MAP[countryCode.toUpperCase()];
  return mapping?.searchEngineLanguage;
}

/**
 * Check if translation is needed between two regions
 */
export function needsTranslation(sourceRegion: string, targetRegion: string): boolean {
  const sourceLang = getLanguageForRegion(sourceRegion);
  const targetLang = getLanguageForRegion(targetRegion);
  return sourceLang !== targetLang;
}
```

**Action:** Create comprehensive region-to-language mapping
**Why:** Enables automatic language selection based on proxy geolocation
**Dependencies:** Step 1.1
**Risk:** Low

---

### Phase 2: Language Detection & Caching (Day 2)

#### Step 2.1: Create Language Detector
**File:** `electron/core/translation/language-detector.ts`

```typescript
/**
 * Language Detector
 * Detects the language of input text using multiple strategies
 */

import type { LanguageCode, LanguageDetectionResult } from './types';

// Character range patterns for script detection
const SCRIPT_PATTERNS: Record<string, RegExp> = {
  arabic: /[\u0600-\u06FF]/,
  chinese: /[\u4E00-\u9FFF]/,
  cyrillic: /[\u0400-\u04FF]/,
  devanagari: /[\u0900-\u097F]/,  // Hindi
  greek: /[\u0370-\u03FF]/,
  hebrew: /[\u0590-\u05FF]/,
  japanese: /[\u3040-\u309F\u30A0-\u30FF]/,
  korean: /[\uAC00-\uD7AF\u1100-\u11FF]/,
  thai: /[\u0E00-\u0E7F]/,
  vietnamese: /[\u00C0-\u1EF9]/,
};

// Common words for Latin-script language detection
const LANGUAGE_MARKERS: Record<LanguageCode, string[]> = {
  'en': ['the', 'and', 'is', 'are', 'was', 'were', 'have', 'has', 'been', 'with', 'this', 'that', 'from', 'they', 'will'],
  'es': ['el', 'la', 'los', 'las', 'de', 'del', 'en', 'que', 'es', 'un', 'una', 'por', 'con', 'para', 'como'],
  'fr': ['le', 'la', 'les', 'de', 'du', 'des', 'et', 'est', 'que', 'qui', 'dans', 'pour', 'avec', 'sur', 'ce'],
  'de': ['der', 'die', 'das', 'und', 'ist', 'ein', 'eine', 'mit', 'von', 'auf', 'für', 'nicht', 'sich', 'auch', 'den'],
  'it': ['il', 'la', 'di', 'che', 'e', 'un', 'una', 'del', 'della', 'per', 'con', 'non', 'sono', 'come', 'da'],
  'pt': ['o', 'a', 'os', 'as', 'de', 'do', 'da', 'em', 'que', 'um', 'uma', 'para', 'com', 'não', 'por'],
  'nl': ['de', 'het', 'een', 'van', 'en', 'in', 'is', 'dat', 'op', 'te', 'voor', 'met', 'zijn', 'dit', 'aan'],
  'pl': ['i', 'w', 'na', 'do', 'z', 'nie', 'to', 'jest', 'się', 'że', 'jak', 'po', 'ale', 'co', 'tak'],
  'tr': ['ve', 'bir', 'bu', 'için', 'ile', 'da', 'de', 'olan', 'gibi', 'daha', 'çok', 'ne', 'var', 'olarak', 'kadar'],
  'sv': ['och', 'att', 'det', 'en', 'som', 'är', 'av', 'för', 'med', 'till', 'den', 'har', 'inte', 'om', 'på'],
  'no': ['og', 'i', 'er', 'det', 'at', 'en', 'til', 'på', 'for', 'med', 'av', 'som', 'har', 'de', 'ikke'],
  'da': ['og', 'i', 'at', 'er', 'en', 'det', 'til', 'på', 'de', 'med', 'for', 'som', 'af', 'har', 'den'],
  'fi': ['ja', 'on', 'ei', 'että', 'se', 'oli', 'myös', 'kun', 'niin', 'vain', 'tai', 'mutta', 'ovat', 'sitä', 'sen'],
  'cs': ['a', 'v', 'je', 'se', 'na', 'to', 'že', 's', 'z', 'do', 'o', 'jako', 'nebo', 'by', 'pro'],
  'ro': ['și', 'în', 'de', 'la', 'a', 'cu', 'pe', 'nu', 'că', 'un', 'o', 'pentru', 'din', 'se', 'este'],
  'hu': ['a', 'az', 'és', 'hogy', 'nem', 'is', 'van', 'egy', 'volt', 'meg', 'már', 'csak', 'de', 'még', 'ki'],
  'id': ['dan', 'yang', 'di', 'ini', 'dengan', 'untuk', 'dari', 'tidak', 'dalam', 'ke', 'ada', 'akan', 'pada', 'juga', 'atau'],
  'ms': ['dan', 'yang', 'di', 'ini', 'dengan', 'untuk', 'dari', 'tidak', 'dalam', 'ke', 'ada', 'akan', 'pada', 'juga', 'atau'],
  // Script-based languages don't need word markers
  'ru': [], 'zh': [], 'ja': [], 'ko': [], 'ar': [], 'hi': [], 'th': [], 'el': [], 'he': [], 'vi': [],
  'bn': [], 'pa': [], 'uk': [], 'tl': [], 'auto': []
};

export class LanguageDetector {
  /**
   * Detect language of input text
   */
  detect(text: string): LanguageDetectionResult {
    if (!text || text.trim().length === 0) {
      return { language: 'en', confidence: 0 };
    }

    const normalizedText = text.toLowerCase().trim();
    
    // First, try script-based detection (non-Latin scripts)
    const scriptResult = this.detectByScript(normalizedText);
    if (scriptResult.confidence > 0.8) {
      return scriptResult;
    }

    // For Latin scripts, use word frequency analysis
    const wordResult = this.detectByWords(normalizedText);
    
    // Combine results if both have some confidence
    if (scriptResult.confidence > 0 && wordResult.confidence > 0) {
      // Prefer script detection for mixed content
      return scriptResult.confidence > wordResult.confidence ? scriptResult : wordResult;
    }

    return wordResult.confidence > scriptResult.confidence ? wordResult : scriptResult;
  }

  /**
   * Detect language by script/character patterns
   */
  private detectByScript(text: string): LanguageDetectionResult {
    const scriptCounts: Record<string, number> = {};
    let totalChars = 0;

    for (const char of text) {
      if (/\s/.test(char)) continue;
      totalChars++;

      for (const [script, pattern] of Object.entries(SCRIPT_PATTERNS)) {
        if (pattern.test(char)) {
          scriptCounts[script] = (scriptCounts[script] || 0) + 1;
        }
      }
    }

    if (totalChars === 0) {
      return { language: 'en', confidence: 0 };
    }

    // Find dominant script
    let maxScript = '';
    let maxCount = 0;
    for (const [script, count] of Object.entries(scriptCounts)) {
      if (count > maxCount) {
        maxCount = count;
        maxScript = script;
      }
    }

    const confidence = maxCount / totalChars;
    const language = this.scriptToLanguage(maxScript);

    return {
      language,
      confidence,
      alternatives: this.getScriptAlternatives(scriptCounts, totalChars)
    };
  }

  /**
   * Detect language by common word patterns
   */
  private detectByWords(text: string): LanguageDetectionResult {
    const words = text.split(/\s+/).filter(w => w.length > 1);
    if (words.length === 0) {
      return { language: 'en', confidence: 0 };
    }

    const scores: Record<string, number> = {};

    for (const [lang, markers] of Object.entries(LANGUAGE_MARKERS)) {
      if (markers.length === 0) continue;
      
      let matchCount = 0;
      for (const word of words) {
        if (markers.includes(word)) {
          matchCount++;
        }
      }
      scores[lang] = matchCount / words.length;
    }

    // Find best match
    let bestLang: LanguageCode = 'en';
    let bestScore = 0;
    const alternatives: Array<{ language: LanguageCode; confidence: number }> = [];

    for (const [lang, score] of Object.entries(scores)) {
      if (score > bestScore) {
        if (bestScore > 0.05) {
          alternatives.push({ language: bestLang, confidence: bestScore });
        }
        bestScore = score;
        bestLang = lang as LanguageCode;
      } else if (score > 0.05) {
        alternatives.push({ language: lang as LanguageCode, confidence: score });
      }
    }

    // Boost confidence if we have clear matches
    const confidence = Math.min(bestScore * 3, 0.95);

    return {
      language: bestLang,
      confidence,
      alternatives: alternatives.sort((a, b) => b.confidence - a.confidence).slice(0, 3)
    };
  }

  /**
   * Map script name to language code
   */
  private scriptToLanguage(script: string): LanguageCode {
    const scriptMap: Record<string, LanguageCode> = {
      'arabic': 'ar',
      'chinese': 'zh',
      'cyrillic': 'ru',  // Could be Ukrainian, but Russian is more common
      'devanagari': 'hi',
      'greek': 'el',
      'hebrew': 'he',
      'japanese': 'ja',
      'korean': 'ko',
      'thai': 'th',
      'vietnamese': 'vi'
    };
    return scriptMap[script] || 'en';
  }

  /**
   * Get alternative languages from script detection
   */
  private getScriptAlternatives(
    scriptCounts: Record<string, number>,
    totalChars: number
  ): Array<{ language: LanguageCode; confidence: number }> {
    const alternatives: Array<{ language: LanguageCode; confidence: number }> = [];
    
    for (const [script, count] of Object.entries(scriptCounts)) {
      const confidence = count / totalChars;
      if (confidence > 0.1) {
        const language = this.scriptToLanguage(script);
        alternatives.push({ language, confidence });
      }
    }

    return alternatives.sort((a, b) => b.confidence - a.confidence).slice(1, 4);
  }

  /**
   * Check if text is likely in a specific language
   */
  isLanguage(text: string, expectedLanguage: LanguageCode): boolean {
    const result = this.detect(text);
    return result.language === expectedLanguage && result.confidence > 0.5;
  }
}
```

**Action:** Implement language detection using script analysis and word frequency
**Why:** Enables automatic source language detection without API calls
**Dependencies:** Step 1.1
**Risk:** Medium - accuracy varies by language

---

#### Step 2.2: Create Translation Cache
**File:** `electron/core/translation/translation-cache.ts`

```typescript
/**
 * Translation Cache
 * LRU cache with TTL support for translation results
 */

import { createHash } from 'crypto';
import type { 
  LanguageCode, 
  TranslationProvider, 
  CacheEntry, 
  TranslationResult 
} from './types';

export interface TranslationCacheConfig {
  maxSize: number;          // Maximum number of entries
  ttl: number;              // Time-to-live in milliseconds
  persistToDisk: boolean;   // Whether to persist cache to database
}

const DEFAULT_CONFIG: TranslationCacheConfig = {
  maxSize: 10000,
  ttl: 7 * 24 * 60 * 60 * 1000,  // 7 days
  persistToDisk: true
};

export class TranslationCache {
  private cache: Map<string, CacheEntry> = new Map();
  private config: TranslationCacheConfig;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0
  };

  constructor(config: Partial<TranslationCacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate cache key from translation parameters
   */
  private generateKey(
    text: string,
    sourceLanguage: LanguageCode,
    targetLanguage: LanguageCode
  ): string {
    const normalized = text.toLowerCase().trim();
    const input = `${sourceLanguage}:${targetLanguage}:${normalized}`;
    return createHash('sha256').update(input).digest('hex').substring(0, 32);
  }

  /**
   * Get cached translation
   */
  get(
    text: string,
    sourceLanguage: LanguageCode,
    targetLanguage: LanguageCode
  ): TranslationResult | null {
    const key = this.generateKey(text, sourceLanguage, targetLanguage);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (new Date() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access metadata
    entry.accessedAt = new Date();
    entry.accessCount++;
    this.cache.set(key, entry);

    this.stats.hits++;

    return {
      originalText: entry.originalText,
      translatedText: entry.translatedText,
      sourceLanguage: entry.sourceLanguage,
      targetLanguage: entry.targetLanguage,
      provider: entry.provider,
      cached: true,
      timestamp: entry.createdAt
    };
  }

  /**
   * Store translation in cache
   */
  set(
    text: string,
    translatedText: string,
    sourceLanguage: LanguageCode,
    targetLanguage: LanguageCode,
    provider: TranslationProvider
  ): void {
    // Evict if at capacity
    if (this.cache.size >= this.config.maxSize) {
      this.evictLRU();
    }

    const key = this.generateKey(text, sourceLanguage, targetLanguage);
    const now = new Date();

    const entry: CacheEntry = {
      key,
      originalText: text,
      translatedText,
      sourceLanguage,
      targetLanguage,
      provider,
      createdAt: now,
      accessedAt: now,
      accessCount: 1,
      expiresAt: new Date(now.getTime() + this.config.ttl)
    };

    this.cache.set(key, entry);
  }

  /**
   * Check if translation exists in cache
   */
  has(
    text: string,
    sourceLanguage: LanguageCode,
    targetLanguage: LanguageCode
  ): boolean {
    const key = this.generateKey(text, sourceLanguage, targetLanguage);
    const entry = this.cache.get(key);
    
    if (!entry) return false;
    if (new Date() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = new Date();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.accessedAt < oldestTime) {
        oldestTime = entry.accessedAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * Clear expired entries
   */
  clearExpired(): number {
    const now = new Date();
    let cleared = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleared++;
      }
    }

    return cleared;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, evictions: 0 };
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hits: number;
    misses: number;
    hitRate: number;
    evictions: number;
  } {
    const total = this.stats.hits + this.stats.misses;
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      evictions: this.stats.evictions
    };
  }

  /**
   * Get all entries for persistence
   */
  getAllEntries(): CacheEntry[] {
    return Array.from(this.cache.values());
  }

  /**
   * Load entries from persistence
   */
  loadEntries(entries: CacheEntry[]): void {
    const now = new Date();
    for (const entry of entries) {
      // Skip expired entries
      if (new Date(entry.expiresAt) <= now) continue;
      
      // Restore dates as Date objects
      entry.createdAt = new Date(entry.createdAt);
      entry.accessedAt = new Date(entry.accessedAt);
      entry.expiresAt = new Date(entry.expiresAt);
      
      this.cache.set(entry.key, entry);
    }
  }

  /**
   * Get estimated cost savings
   * Based on Google Translate pricing: $20 per 1M characters
   */
  getEstimatedSavings(): { characters: number; usd: number } {
    let totalCharacters = 0;
    
    for (const entry of this.cache.values()) {
      // Characters saved = original text length * (access count - 1)
      // First access was the actual API call
      totalCharacters += entry.originalText.length * (entry.accessCount - 1);
    }

    return {
      characters: totalCharacters,
      usd: (totalCharacters / 1000000) * 20
    };
  }
}
```

**Action:** Implement LRU cache with TTL support for translations
**Why:** Reduces API costs by 70%+ through intelligent caching
**Dependencies:** Step 1.1
**Risk:** Low

---

### Phase 3: Translation Providers (Day 3-4)

#### Step 3.1: Create Base Provider Interface
**File:** `electron/core/translation/providers/base-provider.ts`

```typescript
/**
 * Base Translation Provider
 * Abstract class for all translation providers
 */

import type { 
  LanguageCode, 
  ProviderConfig, 
  ProviderResponse,
  TranslationProvider 
} from '../types';

export abstract class BaseTranslationProvider {
  protected config: ProviderConfig;
  protected name: TranslationProvider;

  constructor(name: TranslationProvider, config: ProviderConfig = {}) {
    this.name = name;
    this.config = {
      timeout: 10000,
      maxRetries: 3,
      ...config
    };
  }

  /**
   * Translate text - must be implemented by subclasses
   */
  abstract translate(
    text: string,
    sourceLanguage: LanguageCode,
    targetLanguage: LanguageCode
  ): Promise<ProviderResponse>;

  /**
   * Translate multiple texts in batch
   */
  abstract translateBatch(
    texts: string[],
    sourceLanguage: LanguageCode,
    targetLanguage: LanguageCode
  ): Promise<ProviderResponse[]>;

  /**
   * Check if provider is available
   */
  abstract isAvailable(): Promise<boolean>;

  /**
   * Get supported languages
   */
  abstract getSupportedLanguages(): LanguageCode[];

  /**
   * Check if language pair is supported
   */
  supportsLanguagePair(source: LanguageCode, target: LanguageCode): boolean {
    const supported = this.getSupportedLanguages();
    return (source === 'auto' || supported.includes(source)) && supported.includes(target);
  }

  /**
   * Get provider name
   */
  getName(): TranslationProvider {
    return this.name;
  }

  /**
   * Helper: Make HTTP request with retry
   */
  protected async fetchWithRetry(
    url: string,
    options: RequestInit,
    retries = this.config.maxRetries
  ): Promise<Response> {
    let lastError: Error | null = null;

    for (let i = 0; i <= retries!; i++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response;
      } catch (error) {
        lastError = error as Error;
        if (i < retries!) {
          // Exponential backoff
          await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
        }
      }
    }

    throw lastError || new Error('Request failed');
  }
}
```

**Action:** Create abstract base class for translation providers
**Why:** Ensures consistent interface and shared functionality
**Dependencies:** Step 1.1
**Risk:** Low

---

#### Step 3.2: Implement Google Translate Provider
**File:** `electron/core/translation/providers/google-provider.ts`

```typescript
/**
 * Google Translate Provider
 * Uses Google Cloud Translation API v2
 */

import { BaseTranslationProvider } from './base-provider';
import type { LanguageCode, ProviderConfig, ProviderResponse } from '../types';

export class GoogleTranslateProvider extends BaseTranslationProvider {
  private apiKey: string;
  private apiEndpoint = 'https://translation.googleapis.com/language/translate/v2';

  constructor(config: ProviderConfig) {
    super('google', config);
    this.apiKey = config.apiKey || '';
    if (config.apiEndpoint) {
      this.apiEndpoint = config.apiEndpoint;
    }
  }

  async translate(
    text: string,
    sourceLanguage: LanguageCode,
    targetLanguage: LanguageCode
  ): Promise<ProviderResponse> {
    if (!this.apiKey) {
      throw new Error('Google Translate API key not configured');
    }

    const params = new URLSearchParams({
      key: this.apiKey,
      q: text,
      target: this.mapLanguageCode(targetLanguage),
      format: 'text'
    });

    if (sourceLanguage !== 'auto') {
      params.set('source', this.mapLanguageCode(sourceLanguage));
    }

    const response = await this.fetchWithRetry(
      `${this.apiEndpoint}?${params.toString()}`,
      { method: 'POST' }
    );

    const data = await response.json();
    const translation = data.data.translations[0];

    return {
      translatedText: translation.translatedText,
      detectedLanguage: translation.detectedSourceLanguage as LanguageCode,
      characterCount: text.length
    };
  }

  async translateBatch(
    texts: string[],
    sourceLanguage: LanguageCode,
    targetLanguage: LanguageCode
  ): Promise<ProviderResponse[]> {
    if (!this.apiKey) {
      throw new Error('Google Translate API key not configured');
    }

    // Google API supports up to 128 texts per request
    const batchSize = 128;
    const results: ProviderResponse[] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      
      const params = new URLSearchParams({
        key: this.apiKey,
        target: this.mapLanguageCode(targetLanguage),
        format: 'text'
      });

      if (sourceLanguage !== 'auto') {
        params.set('source', this.mapLanguageCode(sourceLanguage));
      }

      // Add all texts to params
      batch.forEach(text => params.append('q', text));

      const response = await this.fetchWithRetry(
        `${this.apiEndpoint}?${params.toString()}`,
        { method: 'POST' }
      );

      const data = await response.json();
      
      for (let j = 0; j < data.data.translations.length; j++) {
        const translation = data.data.translations[j];
        results.push({
          translatedText: translation.translatedText,
          detectedLanguage: translation.detectedSourceLanguage as LanguageCode,
          characterCount: batch[j].length
        });
      }
    }

    return results;
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) return false;
    
    try {
      // Test with minimal request
      await this.translate('test', 'en', 'es');
      return true;
    } catch {
      return false;
    }
  }

  getSupportedLanguages(): LanguageCode[] {
    // Google supports 100+ languages, these are the ones we support
    return [
      'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko',
      'ar', 'hi', 'bn', 'pa', 'vi', 'th', 'tr', 'pl', 'uk', 'nl',
      'sv', 'no', 'da', 'fi', 'cs', 'ro', 'hu', 'el', 'he', 'id',
      'ms', 'tl'
    ];
  }

  /**
   * Map our language codes to Google's format
   */
  private mapLanguageCode(code: LanguageCode): string {
    const mapping: Record<string, string> = {
      'zh': 'zh-CN',
      'no': 'no',  // Norwegian
      'tl': 'fil' // Filipino
    };
    return mapping[code] || code;
  }
}
```

**Action:** Implement Google Cloud Translation API provider
**Why:** Primary production translation service with best language coverage
**Dependencies:** Steps 1.1, 3.1
**Risk:** Low

---

#### Step 3.3: Implement DeepL Provider
**File:** `electron/core/translation/providers/deepl-provider.ts`

```typescript
/**
 * DeepL Translation Provider
 * Uses DeepL API for high-quality translations
 */

import { BaseTranslationProvider } from './base-provider';
import type { LanguageCode, ProviderConfig, ProviderResponse } from '../types';

export class DeepLProvider extends BaseTranslationProvider {
  private apiKey: string;
  private apiEndpoint: string;

  constructor(config: ProviderConfig) {
    super('deepl', config);
    this.apiKey = config.apiKey || '';
    // Use free or pro endpoint based on API key
    this.apiEndpoint = config.apiEndpoint || 
      (this.apiKey.endsWith(':fx') 
        ? 'https://api-free.deepl.com/v2/translate'
        : 'https://api.deepl.com/v2/translate');
  }

  async translate(
    text: string,
    sourceLanguage: LanguageCode,
    targetLanguage: LanguageCode
  ): Promise<ProviderResponse> {
    if (!this.apiKey) {
      throw new Error('DeepL API key not configured');
    }

    const body: Record<string, string | string[]> = {
      text: [text],
      target_lang: this.mapLanguageCode(targetLanguage)
    };

    if (sourceLanguage !== 'auto') {
      body.source_lang = this.mapLanguageCode(sourceLanguage);
    }

    const response = await this.fetchWithRetry(
      this.apiEndpoint,
      {
        method: 'POST',
        headers: {
          'Authorization': `DeepL-Auth-Key ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }
    );

    const data = await response.json();
    const translation = data.translations[0];

    return {
      translatedText: translation.text,
      detectedLanguage: translation.detected_source_language?.toLowerCase() as LanguageCode,
      characterCount: text.length
    };
  }

  async translateBatch(
    texts: string[],
    sourceLanguage: LanguageCode,
    targetLanguage: LanguageCode
  ): Promise<ProviderResponse[]> {
    if (!this.apiKey) {
      throw new Error('DeepL API key not configured');
    }

    // DeepL supports up to 50 texts per request
    const batchSize = 50;
    const results: ProviderResponse[] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);

      const body: Record<string, string | string[]> = {
        text: batch,
        target_lang: this.mapLanguageCode(targetLanguage)
      };

      if (sourceLanguage !== 'auto') {
        body.source_lang = this.mapLanguageCode(sourceLanguage);
      }

      const response = await this.fetchWithRetry(
        this.apiEndpoint,
        {
          method: 'POST',
          headers: {
            'Authorization': `DeepL-Auth-Key ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        }
      );

      const data = await response.json();

      for (let j = 0; j < data.translations.length; j++) {
        const translation = data.translations[j];
        results.push({
          translatedText: translation.text,
          detectedLanguage: translation.detected_source_language?.toLowerCase() as LanguageCode,
          characterCount: batch[j].length
        });
      }
    }

    return results;
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) return false;

    try {
      const response = await this.fetchWithRetry(
        'https://api.deepl.com/v2/usage',
        {
          headers: { 'Authorization': `DeepL-Auth-Key ${this.apiKey}` }
        }
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  getSupportedLanguages(): LanguageCode[] {
    // DeepL supports fewer languages but higher quality
    return [
      'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko',
      'pl', 'nl', 'sv', 'da', 'fi', 'cs', 'ro', 'hu', 'el', 'tr',
      'uk', 'id'
    ];
  }

  private mapLanguageCode(code: LanguageCode): string {
    const mapping: Record<string, string> = {
      'en': 'EN',
      'es': 'ES',
      'fr': 'FR',
      'de': 'DE',
      'it': 'IT',
      'pt': 'PT',
      'ru': 'RU',
      'zh': 'ZH',
      'ja': 'JA',
      'ko': 'KO',
      'pl': 'PL',
      'nl': 'NL',
      'sv': 'SV',
      'da': 'DA',
      'fi': 'FI',
      'cs': 'CS',
      'ro': 'RO',
      'hu': 'HU',
      'el': 'EL',
      'tr': 'TR',
      'uk': 'UK',
      'id': 'ID'
    };
    return mapping[code] || code.toUpperCase();
  }
}
```

**Action:** Implement DeepL API provider for premium translations
**Why:** Higher quality translations for users who prefer accuracy
**Dependencies:** Steps 1.1, 3.1
**Risk:** Low

---

#### Step 3.4: Implement Local Translation Provider
**File:** `electron/core/translation/providers/local-provider.ts`

```typescript
/**
 * Local Translation Provider
 * Offline translation using simple dictionary-based approach
 * Suitable for development/testing and basic translations
 */

import { BaseTranslationProvider } from './base-provider';
import type { LanguageCode, ProviderConfig, ProviderResponse } from '../types';

// Basic translation dictionaries for common SEO/search terms
const TRANSLATION_DICTIONARIES: Record<string, Record<string, Record<string, string>>> = {
  'en': {
    'es': {
      'buy': 'comprar', 'best': 'mejor', 'cheap': 'barato', 'free': 'gratis',
      'online': 'en línea', 'price': 'precio', 'review': 'reseña', 'sale': 'venta',
      'shop': 'tienda', 'discount': 'descuento', 'new': 'nuevo', 'top': 'superior',
      'how to': 'cómo', 'guide': 'guía', 'tips': 'consejos', 'services': 'servicios'
    },
    'fr': {
      'buy': 'acheter', 'best': 'meilleur', 'cheap': 'pas cher', 'free': 'gratuit',
      'online': 'en ligne', 'price': 'prix', 'review': 'avis', 'sale': 'vente',
      'shop': 'boutique', 'discount': 'réduction', 'new': 'nouveau', 'top': 'haut',
      'how to': 'comment', 'guide': 'guide', 'tips': 'conseils', 'services': 'services'
    },
    'de': {
      'buy': 'kaufen', 'best': 'beste', 'cheap': 'günstig', 'free': 'kostenlos',
      'online': 'online', 'price': 'preis', 'review': 'bewertung', 'sale': 'verkauf',
      'shop': 'geschäft', 'discount': 'rabatt', 'new': 'neu', 'top': 'top',
      'how to': 'wie', 'guide': 'anleitung', 'tips': 'tipps', 'services': 'dienstleistungen'
    }
  }
};

export class LocalTranslationProvider extends BaseTranslationProvider {
  constructor(config: ProviderConfig = {}) {
    super('local', config);
  }

  async translate(
    text: string,
    sourceLanguage: LanguageCode,
    targetLanguage: LanguageCode
  ): Promise<ProviderResponse> {
    // If same language, return as-is
    if (sourceLanguage === targetLanguage) {
      return {
        translatedText: text,
        detectedLanguage: sourceLanguage,
        characterCount: text.length
      };
    }

    const translated = this.translateText(text, sourceLanguage, targetLanguage);

    return {
      translatedText: translated,
      detectedLanguage: sourceLanguage === 'auto' ? 'en' : sourceLanguage,
      characterCount: text.length,
      confidence: this.calculateConfidence(text, translated)
    };
  }

  async translateBatch(
    texts: string[],
    sourceLanguage: LanguageCode,
    targetLanguage: LanguageCode
  ): Promise<ProviderResponse[]> {
    return Promise.all(
      texts.map(text => this.translate(text, sourceLanguage, targetLanguage))
    );
  }

  async isAvailable(): Promise<boolean> {
    return true; // Local provider is always available
  }

  getSupportedLanguages(): LanguageCode[] {
    return ['en', 'es', 'fr', 'de'];
  }

  /**
   * Translate text using dictionary lookup
   */
  private translateText(
    text: string,
    sourceLanguage: LanguageCode,
    targetLanguage: LanguageCode
  ): string {
    const source = sourceLanguage === 'auto' ? 'en' : sourceLanguage;
    const dict = TRANSLATION_DICTIONARIES[source]?.[targetLanguage];

    if (!dict) {
      // No dictionary available, return original with marker
      console.warn(`[LocalProvider] No dictionary for ${source} -> ${targetLanguage}`);
      return text;
    }

    let result = text.toLowerCase();

    // Sort by phrase length (longer phrases first) to avoid partial matches
    const phrases = Object.keys(dict).sort((a, b) => b.length - a.length);

    for (const phrase of phrases) {
      const regex = new RegExp(`\\b${this.escapeRegex(phrase)}\\b`, 'gi');
      result = result.replace(regex, dict[phrase]);
    }

    // Preserve original casing for first character
    if (text[0] === text[0].toUpperCase()) {
      result = result.charAt(0).toUpperCase() + result.slice(1);
    }

    return result;
  }

  /**
   * Calculate translation confidence based on word coverage
   */
  private calculateConfidence(original: string, translated: string): number {
    if (original === translated) return 0.1;
    
    const originalWords = original.toLowerCase().split(/\s+/);
    const translatedWords = translated.toLowerCase().split(/\s+/);
    
    let changedWords = 0;
    for (let i = 0; i < originalWords.length; i++) {
      if (originalWords[i] !== translatedWords[i]) {
        changedWords++;
      }
    }

    return Math.min(changedWords / originalWords.length, 0.8);
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
```

**Action:** Implement offline dictionary-based translation
**Why:** Provides fallback translation without API dependency
**Dependencies:** Steps 1.1, 3.1
**Risk:** Low - limited accuracy expected

---

#### Step 3.5: Create Provider Index
**File:** `electron/core/translation/providers/index.ts`

```typescript
/**
 * Translation Providers Index
 */

export { BaseTranslationProvider } from './base-provider';
export { GoogleTranslateProvider } from './google-provider';
export { DeepLProvider } from './deepl-provider';
export { LocalTranslationProvider } from './local-provider';

import type { TranslationProvider, ProviderConfig } from '../types';
import { GoogleTranslateProvider } from './google-provider';
import { DeepLProvider } from './deepl-provider';
import { LocalTranslationProvider } from './local-provider';
import { BaseTranslationProvider } from './base-provider';

/**
 * Factory function to create translation providers
 */
export function createProvider(
  type: TranslationProvider,
  config: ProviderConfig = {}
): BaseTranslationProvider {
  switch (type) {
    case 'google':
      return new GoogleTranslateProvider(config);
    case 'deepl':
      return new DeepLProvider(config);
    case 'local':
      return new LocalTranslationProvider(config);
    default:
      throw new Error(`Unknown provider type: ${type}`);
  }
}
```

**Action:** Create provider exports and factory function
**Why:** Clean API for provider instantiation
**Dependencies:** Steps 3.1-3.4
**Risk:** Low

---

### Phase 4: Main Translator & Manager (Day 5-6)

#### Step 4.1: Create Main Translator
**File:** `electron/core/translation/translator.ts`

```typescript
/**
 * Main Translator
 * Orchestrates translation operations with caching and fallback
 */

import { EventEmitter } from 'events';
import type {
  LanguageCode,
  TranslationConfig,
  TranslationRequest,
  TranslationResult,
  BatchTranslationRequest,
  BatchTranslationResult,
  TranslationProvider,
  TranslationStats
} from './types';
import { LanguageDetector } from './language-detector';
import { TranslationCache } from './translation-cache';
import { createProvider, BaseTranslationProvider } from './providers';

const DEFAULT_CONFIG: TranslationConfig = {
  provider: 'local',
  defaultSourceLanguage: 'auto',
  defaultTargetLanguage: 'en',
  enableCache: true,
  cacheTTL: 7 * 24 * 60 * 60 * 1000,  // 7 days
  maxCacheSize: 10000,
  retryAttempts: 3,
  timeout: 10000,
  fallbackProvider: 'local'
};

export class Translator extends EventEmitter {
  private config: TranslationConfig;
  private provider: BaseTranslationProvider;
  private fallbackProvider: BaseTranslationProvider | null = null;
  private cache: TranslationCache;
  private languageDetector: LanguageDetector;
  private stats: TranslationStats;

  constructor(config: Partial<TranslationConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Initialize components
    this.provider = createProvider(this.config.provider, {
      apiKey: this.config.apiKey,
      timeout: this.config.timeout,
      maxRetries: this.config.retryAttempts
    });

    if (this.config.fallbackProvider && this.config.fallbackProvider !== this.config.provider) {
      this.fallbackProvider = createProvider(this.config.fallbackProvider);
    }

    this.cache = new TranslationCache({
      maxSize: this.config.maxCacheSize,
      ttl: this.config.cacheTTL
    });

    this.languageDetector = new LanguageDetector();

    this.stats = {
      totalTranslations: 0,
      cacheHits: 0,
      cacheMisses: 0,
      cacheHitRate: 0,
      apiCalls: 0,
      totalCharactersTranslated: 0,
      estimatedCostSaved: 0,
      errorCount: 0,
      averageLatency: 0
    };
  }

  /**
   * Translate a single text
   */
  async translate(request: TranslationRequest): Promise<TranslationResult> {
    const startTime = Date.now();
    const sourceLanguage = request.sourceLanguage || this.config.defaultSourceLanguage;
    const targetLanguage = request.targetLanguage;

    // Detect source language if auto
    let detectedSource = sourceLanguage;
    if (sourceLanguage === 'auto') {
      const detection = this.languageDetector.detect(request.text);
      detectedSource = detection.language;
    }

    // Skip translation if same language
    if (detectedSource === targetLanguage) {
      return {
        originalText: request.text,
        translatedText: request.text,
        sourceLanguage: detectedSource,
        targetLanguage,
        provider: this.config.provider,
        cached: false,
        timestamp: new Date()
      };
    }

    // Check cache first
    if (this.config.enableCache) {
      const cached = this.cache.get(request.text, detectedSource, targetLanguage);
      if (cached) {
        this.stats.cacheHits++;
        this.stats.totalTranslations++;
        this.updateCacheHitRate();
        this.emit('translation:cached', cached);
        return cached;
      }
      this.stats.cacheMisses++;
    }

    // Perform translation
    try {
      const response = await this.provider.translate(
        request.text,
        detectedSource,
        targetLanguage
      );

      const result: TranslationResult = {
        originalText: request.text,
        translatedText: response.translatedText,
        sourceLanguage: response.detectedLanguage || detectedSource,
        targetLanguage,
        provider: this.provider.getName(),
        cached: false,
        confidence: response.confidence,
        timestamp: new Date()
      };

      // Store in cache
      if (this.config.enableCache) {
        this.cache.set(
          request.text,
          response.translatedText,
          result.sourceLanguage,
          targetLanguage,
          this.provider.getName()
        );
      }

      // Update stats
      this.stats.totalTranslations++;
      this.stats.apiCalls++;
      this.stats.totalCharactersTranslated += request.text.length;
      this.updateAverageLatency(Date.now() - startTime);
      this.updateCacheHitRate();

      this.emit('translation:completed', result);
      return result;

    } catch (error) {
      this.stats.errorCount++;
      this.emit('translation:error', { request, error });

      // Try fallback provider
      if (this.fallbackProvider) {
        try {
          const response = await this.fallbackProvider.translate(
            request.text,
            detectedSource,
            targetLanguage
          );

          return {
            originalText: request.text,
            translatedText: response.translatedText,
            sourceLanguage: response.detectedLanguage || detectedSource,
            targetLanguage,
            provider: this.fallbackProvider.getName(),
            cached: false,
            timestamp: new Date()
          };
        } catch (fallbackError) {
          // Both providers failed
          throw new Error(`Translation failed: ${(error as Error).message}`);
        }
      }

      throw error;
    }
  }

  /**
   * Translate multiple texts in batch
   */
  async translateBatch(request: BatchTranslationRequest): Promise<BatchTranslationResult> {
    const results: TranslationResult[] = [];
    let cachedCount = 0;
    let apiCallCount = 0;
    let totalCharacters = 0;

    const sourceLanguage = request.sourceLanguage || this.config.defaultSourceLanguage;
    const targetLanguage = request.targetLanguage;

    // Separate cached and uncached texts
    const uncachedTexts: { index: number; text: string; detectedSource: LanguageCode }[] = [];

    for (let i = 0; i < request.texts.length; i++) {
      const text = request.texts[i];
      totalCharacters += text.length;

      // Detect source language
      let detectedSource = sourceLanguage;
      if (sourceLanguage === 'auto') {
        detectedSource = this.languageDetector.detect(text).language;
      }

      // Check cache
      if (this.config.enableCache) {
        const cached = this.cache.get(text, detectedSource, targetLanguage);
        if (cached) {
          results[i] = cached;
          cachedCount++;
          continue;
        }
      }

      uncachedTexts.push({ index: i, text, detectedSource });
    }

    // Batch translate uncached texts
    if (uncachedTexts.length > 0) {
      try {
        const responses = await this.provider.translateBatch(
          uncachedTexts.map(t => t.text),
          sourceLanguage,
          targetLanguage
        );

        apiCallCount++;

        for (let j = 0; j < responses.length; j++) {
          const { index, text, detectedSource } = uncachedTexts[j];
          const response = responses[j];

          const result: TranslationResult = {
            originalText: text,
            translatedText: response.translatedText,
            sourceLanguage: response.detectedLanguage || detectedSource,
            targetLanguage,
            provider: this.provider.getName(),
            cached: false,
            timestamp: new Date()
          };

          results[index] = result;

          // Store in cache
          if (this.config.enableCache) {
            this.cache.set(
              text,
              response.translatedText,
              result.sourceLanguage,
              targetLanguage,
              this.provider.getName()
            );
          }
        }
      } catch (error) {
        // Fall back to individual translations
        for (const { index, text, detectedSource } of uncachedTexts) {
          try {
            const result = await this.translate({
              text,
              sourceLanguage: detectedSource,
              targetLanguage
            });
            results[index] = result;
          } catch (e) {
            // Return original text on failure
            results[index] = {
              originalText: text,
              translatedText: text,
              sourceLanguage: detectedSource,
              targetLanguage,
              provider: 'none' as TranslationProvider,
              cached: false,
              timestamp: new Date()
            };
          }
        }
      }
    }

    // Update stats
    this.stats.totalTranslations += request.texts.length;
    this.stats.cacheHits += cachedCount;
    this.stats.cacheMisses += uncachedTexts.length;
    this.stats.apiCalls += apiCallCount;
    this.updateCacheHitRate();

    return {
      results,
      totalCharacters,
      cachedCount,
      apiCallCount
    };
  }

  /**
   * Detect language of text
   */
  detectLanguage(text: string) {
    return this.languageDetector.detect(text);
  }

  /**
   * Get translation statistics
   */
  getStats(): TranslationStats {
    const savings = this.cache.getEstimatedSavings();
    return {
      ...this.stats,
      estimatedCostSaved: savings.usd
    };
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<TranslationConfig>): void {
    this.config = { ...this.config, ...config };

    // Recreate provider if changed
    if (config.provider || config.apiKey) {
      this.provider = createProvider(this.config.provider, {
        apiKey: this.config.apiKey,
        timeout: this.config.timeout,
        maxRetries: this.config.retryAttempts
      });
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): TranslationConfig {
    return { ...this.config };
  }

  /**
   * Clear translation cache
   */
  clearCache(): void {
    this.cache.clear();
    this.emit('cache:cleared');
  }

  /**
   * Check if provider is available
   */
  async isProviderAvailable(): Promise<boolean> {
    return this.provider.isAvailable();
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): LanguageCode[] {
    return this.provider.getSupportedLanguages();
  }

  private updateCacheHitRate(): void {
    const total = this.stats.cacheHits + this.stats.cacheMisses;
    this.stats.cacheHitRate = total > 0 ? this.stats.cacheHits / total : 0;
  }

  private updateAverageLatency(latency: number): void {
    const totalRequests = this.stats.apiCalls;
    if (totalRequests === 1) {
      this.stats.averageLatency = latency;
    } else {
      this.stats.averageLatency = 
        (this.stats.averageLatency * (totalRequests - 1) + latency) / totalRequests;
    }
  }
}
```

**Action:** Create main translator that orchestrates caching and providers
**Why:** Central API for all translation operations
**Dependencies:** Steps 2.1, 2.2, 3.5
**Risk:** Medium - complex orchestration

---

#### Step 4.2: Create Translation Manager
**File:** `electron/core/translation/index.ts`

```typescript
/**
 * Translation Module
 * Main entry point for translation functionality
 */

import { EventEmitter } from 'events';
import type {
  LanguageCode,
  TranslationConfig,
  TranslationResult,
  TranslationStats,
  SearchResult
} from './types';
import { Translator } from './translator';
import { getLanguageForRegion, needsTranslation } from './region-language-map';

export interface TranslationManagerConfig extends TranslationConfig {
  userLanguage: LanguageCode;
  autoTranslateKeywords: boolean;
  autoTranslateResults: boolean;
}

const DEFAULT_MANAGER_CONFIG: Partial<TranslationManagerConfig> = {
  userLanguage: 'en',
  autoTranslateKeywords: true,
  autoTranslateResults: true
};

export class TranslationManager extends EventEmitter {
  private translator: Translator;
  private config: TranslationManagerConfig;

  constructor(config: Partial<TranslationManagerConfig> = {}) {
    super();
    this.config = { 
      ...DEFAULT_MANAGER_CONFIG,
      provider: 'local',
      defaultSourceLanguage: 'auto',
      defaultTargetLanguage: 'en',
      enableCache: true,
      cacheTTL: 7 * 24 * 60 * 60 * 1000,
      maxCacheSize: 10000,
      retryAttempts: 3,
      timeout: 10000,
      ...config 
    } as TranslationManagerConfig;

    this.translator = new Translator(this.config);
    this.setupEventForwarding();
  }

  /**
   * Translate keyword for target region
   * Used before performing search with regional proxy
   */
  async translateKeywordForRegion(
    keyword: string,
    targetCountryCode: string
  ): Promise<{ original: string; translated: string; targetLanguage: LanguageCode }> {
    const targetLanguage = getLanguageForRegion(targetCountryCode);
    
    // Skip if user language matches target
    if (!needsTranslation(this.config.userLanguage, targetLanguage)) {
      return { original: keyword, translated: keyword, targetLanguage };
    }

    const result = await this.translator.translate({
      text: keyword,
      sourceLanguage: this.config.userLanguage,
      targetLanguage
    });

    this.emit('keyword:translated', {
      original: keyword,
      translated: result.translatedText,
      targetLanguage,
      targetCountry: targetCountryCode
    });

    return {
      original: keyword,
      translated: result.translatedText,
      targetLanguage
    };
  }

  /**
   * Translate search results back to user's language
   */
  async translateSearchResults(
    results: SearchResult[],
    sourceCountryCode: string
  ): Promise<SearchResult[]> {
    const sourceLanguage = getLanguageForRegion(sourceCountryCode);

    // Skip if already in user's language
    if (!needsTranslation(sourceLanguage, this.config.userLanguage)) {
      return results;
    }

    // Batch translate titles and snippets
    const textsToTranslate: string[] = [];
    const textMapping: { resultIndex: number; field: 'title' | 'snippet' }[] = [];

    for (let i = 0; i < results.length; i++) {
      if (results[i].title) {
        textsToTranslate.push(results[i].title);
        textMapping.push({ resultIndex: i, field: 'title' });
      }
      if (results[i].snippet) {
        textsToTranslate.push(results[i].snippet);
        textMapping.push({ resultIndex: i, field: 'snippet' });
      }
    }

    if (textsToTranslate.length === 0) {
      return results;
    }

    const batchResult = await this.translator.translateBatch({
      texts: textsToTranslate,
      sourceLanguage,
      targetLanguage: this.config.userLanguage
    });

    // Map translations back to results
    const translatedResults = results.map(r => ({ ...r }));
    
    for (let i = 0; i < batchResult.results.length; i++) {
      const { resultIndex, field } = textMapping[i];
      translatedResults[resultIndex][field] = batchResult.results[i].translatedText;
    }

    this.emit('results:translated', {
      count: results.length,
      sourceLanguage,
      targetLanguage: this.config.userLanguage,
      cachedCount: batchResult.cachedCount
    });

    return translatedResults;
  }

  /**
   * Translate a single text
   */
  async translate(
    text: string,
    targetLanguage: LanguageCode,
    sourceLanguage?: LanguageCode
  ): Promise<TranslationResult> {
    return this.translator.translate({
      text,
      sourceLanguage: sourceLanguage || 'auto',
      targetLanguage
    });
  }

  /**
   * Detect language of text
   */
  detectLanguage(text: string) {
    return this.translator.detectLanguage(text);
  }

  /**
   * Get statistics
   */
  getStats(): TranslationStats {
    return this.translator.getStats();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.translator.getCacheStats();
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<TranslationManagerConfig>): void {
    this.config = { ...this.config, ...config };
    this.translator.setConfig(config);
    this.emit('config:updated', this.config);
  }

  /**
   * Get current configuration
   */
  getConfig(): TranslationManagerConfig {
    return { ...this.config };
  }

  /**
   * Set user's preferred language
   */
  setUserLanguage(language: LanguageCode): void {
    this.config.userLanguage = language;
    this.emit('userLanguage:changed', language);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.translator.clearCache();
  }

  /**
   * Check provider availability
   */
  async isProviderAvailable(): Promise<boolean> {
    return this.translator.isProviderAvailable();
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): LanguageCode[] {
    return this.translator.getSupportedLanguages();
  }

  private setupEventForwarding(): void {
    this.translator.on('translation:completed', (result) => {
      this.emit('translation:completed', result);
    });
    this.translator.on('translation:cached', (result) => {
      this.emit('translation:cached', result);
    });
    this.translator.on('translation:error', (error) => {
      this.emit('translation:error', error);
    });
  }
}

// Re-export types and utilities
export * from './types';
export { getLanguageForRegion, needsTranslation, LANGUAGE_NAMES } from './region-language-map';
export { Translator } from './translator';
export { LanguageDetector } from './language-detector';
export { TranslationCache } from './translation-cache';
```

**Action:** Create TranslationManager as main orchestrator for search automation
**Why:** Provides high-level API for keyword and result translation
**Dependencies:** Steps 1.2, 4.1
**Risk:** Low

---

### Phase 5: Integration with Existing Systems (Day 7-8)

#### Step 5.1: Integrate with TaskExecutor
**File:** `electron/core/automation/executor.ts` (modify existing)

**Changes:**
```typescript
// Add import at top
import { TranslationManager, getLanguageForRegion } from '../translation';

// Modify TaskExecutor class
export class TaskExecutor extends EventEmitter {
  private searchEngine: SearchEngineAutomation;
  private translationManager: TranslationManager;  // NEW
  private activeTasks: Map<string, SearchTask> = new Map();
  private maxConcurrentTasks: number = 3;

  constructor(translationManager?: TranslationManager) {
    super();
    this.searchEngine = new SearchEngineAutomation();
    this.translationManager = translationManager || new TranslationManager();  // NEW
  }

  /**
   * Execute a search task with translation support
   */
  async executeSearchTask(
    task: SearchTask,
    config: SearchConfig,
    view: any,
    proxyRegion?: string  // NEW: proxy country code
  ): Promise<void> {
    // ... existing validation code ...

    let searchKeyword = task.keyword;

    // NEW: Translate keyword if using regional proxy
    if (proxyRegion && config.translateKeywords) {
      const translation = await this.translationManager.translateKeywordForRegion(
        task.keyword,
        proxyRegion
      );
      searchKeyword = translation.translated;
      task.translatedKeyword = searchKeyword;  // Store for reference
      task.targetLanguage = translation.targetLanguage;
    }

    try {
      // Perform search with translated keyword
      const results = await this.searchEngine.performSearch(
        view,
        searchKeyword,
        task.engine
      );

      // NEW: Translate results back to user's language
      if (proxyRegion && config.translateResults) {
        task.results = await this.translationManager.translateSearchResults(
          results,
          proxyRegion
        );
        task.originalResults = results;  // Keep originals
      } else {
        task.results = results;
      }

      // ... rest of existing code ...
    } catch (error) {
      // ... existing error handling ...
    }
  }
}
```

**Action:** Integrate TranslationManager into task execution flow
**Why:** Enables automatic translation during search automation
**Dependencies:** Step 4.2
**Risk:** Medium - modifies core execution flow

---

#### Step 5.2: Extend SearchConfig Type
**File:** `electron/core/automation/types.ts` (modify existing)

**Add to SearchConfig interface:**
```typescript
export interface SearchConfig {
  keywords: string[];
  engine: SearchEngine;
  targetDomains: string[];
  maxRetries: number;
  delayBetweenSearches: number;
  useRandomProxy: boolean;
  clickThrough: boolean;
  simulateHumanBehavior: boolean;
  
  // NEW: Translation options
  translateKeywords?: boolean;
  translateResults?: boolean;
  userLanguage?: LanguageCode;
}

// NEW: Extend SearchTask
export interface SearchTask {
  // ... existing fields ...
  
  // Translation fields
  translatedKeyword?: string;
  targetLanguage?: LanguageCode;
  originalResults?: SearchResult[];
}
```

**Action:** Add translation-related fields to existing types
**Why:** Enable translation configuration per search session
**Dependencies:** Step 1.1
**Risk:** Low - additive changes

---

#### Step 5.3: Integrate with ProxyManager
**File:** `electron/core/automation/manager.ts` (modify existing)

**Add translation awareness:**
```typescript
// Add import
import { TranslationManager, getLanguageForRegion } from '../translation';

export class AutomationManager extends EventEmitter {
  private scheduler: TaskScheduler;
  private executor: TaskExecutor;
  private translationManager: TranslationManager;  // NEW
  private sessions: Map<string, AutomationSession> = new Map();
  private db: DatabaseManager;

  constructor(db: DatabaseManager, translationManager?: TranslationManager) {
    super();
    this.db = db;
    this.translationManager = translationManager || new TranslationManager();
    this.scheduler = new TaskScheduler();
    this.executor = new TaskExecutor(this.translationManager);
    
    this.setupEventListeners();
  }

  /**
   * Get translation manager for external use
   */
  getTranslationManager(): TranslationManager {
    return this.translationManager;
  }

  /**
   * Configure translation settings
   */
  setTranslationConfig(config: Partial<TranslationManagerConfig>): void {
    this.translationManager.setConfig(config);
  }

  /**
   * Get translation statistics
   */
  getTranslationStats() {
    return this.translationManager.getStats();
  }
}
```

**Action:** Add TranslationManager to AutomationManager
**Why:** Centralized access to translation functionality
**Dependencies:** Steps 4.2, 5.1
**Risk:** Low

---

### Phase 6: IPC Handlers & Database (Day 9-10)

#### Step 6.1: Create Translation IPC Handlers
**File:** `electron/ipc/handlers/translation.ts`

```typescript
/**
 * Translation IPC Handlers
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../channels';
import type { TranslationManager } from '../../core/translation';
import type { LanguageCode } from '../../core/translation/types';

export function setupTranslationHandlers(translationManager: TranslationManager) {
  // Translate text
  ipcMain.handle(IPC_CHANNELS.TRANSLATION_TRANSLATE, async (_e, text: string, targetLang: LanguageCode, sourceLang?: LanguageCode) => {
    try {
      const result = await translationManager.translate(text, targetLang, sourceLang);
      return { success: true, result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Translate keyword for region
  ipcMain.handle(IPC_CHANNELS.TRANSLATION_TRANSLATE_KEYWORD, async (_e, keyword: string, countryCode: string) => {
    try {
      const result = await translationManager.translateKeywordForRegion(keyword, countryCode);
      return { success: true, result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Detect language
  ipcMain.handle(IPC_CHANNELS.TRANSLATION_DETECT, async (_e, text: string) => {
    try {
      const result = translationManager.detectLanguage(text);
      return { success: true, result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Get configuration
  ipcMain.handle(IPC_CHANNELS.TRANSLATION_GET_CONFIG, async () => {
    return { success: true, config: translationManager.getConfig() };
  });

  // Set configuration
  ipcMain.handle(IPC_CHANNELS.TRANSLATION_SET_CONFIG, async (_e, config) => {
    try {
      translationManager.setConfig(config);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Get statistics
  ipcMain.handle(IPC_CHANNELS.TRANSLATION_GET_STATS, async () => {
    return { 
      success: true, 
      stats: translationManager.getStats(),
      cacheStats: translationManager.getCacheStats()
    };
  });

  // Clear cache
  ipcMain.handle(IPC_CHANNELS.TRANSLATION_CLEAR_CACHE, async () => {
    translationManager.clearCache();
    return { success: true };
  });

  // Get supported languages
  ipcMain.handle(IPC_CHANNELS.TRANSLATION_GET_LANGUAGES, async () => {
    return { success: true, languages: translationManager.getSupportedLanguages() };
  });

  // Check provider availability
  ipcMain.handle(IPC_CHANNELS.TRANSLATION_CHECK_PROVIDER, async () => {
    const available = await translationManager.isProviderAvailable();
    return { success: true, available };
  });

  console.log('[Translation Handlers] Registered successfully');
}
```

**Action:** Create IPC handlers for translation operations
**Why:** Enables UI to interact with translation system
**Dependencies:** Step 4.2
**Risk:** Low

---

#### Step 6.2: Update IPC Channels
**File:** `electron/ipc/channels.ts` (modify existing)

```typescript
// Add translation channels
export const IPC_CHANNELS = {
  // ... existing channels ...
  
  // Translation
  TRANSLATION_TRANSLATE: 'translation:translate',
  TRANSLATION_TRANSLATE_KEYWORD: 'translation:translate-keyword',
  TRANSLATION_DETECT: 'translation:detect',
  TRANSLATION_GET_CONFIG: 'translation:get-config',
  TRANSLATION_SET_CONFIG: 'translation:set-config',
  TRANSLATION_GET_STATS: 'translation:get-stats',
  TRANSLATION_CLEAR_CACHE: 'translation:clear-cache',
  TRANSLATION_GET_LANGUAGES: 'translation:get-languages',
  TRANSLATION_CHECK_PROVIDER: 'translation:check-provider',
} as const;
```

**Action:** Add translation IPC channel constants
**Why:** Type-safe channel references
**Dependencies:** None
**Risk:** Low

---

#### Step 6.3: Update Preload Script
**File:** `electron/main/preload.ts` (modify existing)

```typescript
// Add translation API to contextBridge
translation: {
  translate: (text: string, targetLang: string, sourceLang?: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.TRANSLATION_TRANSLATE, text, targetLang, sourceLang),
  translateKeyword: (keyword: string, countryCode: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.TRANSLATION_TRANSLATE_KEYWORD, keyword, countryCode),
  detectLanguage: (text: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.TRANSLATION_DETECT, text),
  getConfig: () =>
    ipcRenderer.invoke(IPC_CHANNELS.TRANSLATION_GET_CONFIG),
  setConfig: (config: any) =>
    ipcRenderer.invoke(IPC_CHANNELS.TRANSLATION_SET_CONFIG, config),
  getStats: () =>
    ipcRenderer.invoke(IPC_CHANNELS.TRANSLATION_GET_STATS),
  clearCache: () =>
    ipcRenderer.invoke(IPC_CHANNELS.TRANSLATION_CLEAR_CACHE),
  getSupportedLanguages: () =>
    ipcRenderer.invoke(IPC_CHANNELS.TRANSLATION_GET_LANGUAGES),
  checkProvider: () =>
    ipcRenderer.invoke(IPC_CHANNELS.TRANSLATION_CHECK_PROVIDER),
}
```

**Action:** Expose translation API to renderer
**Why:** Enables React components to use translation
**Dependencies:** Step 6.1
**Risk:** Low

---

#### Step 6.4: Create Database Migration
**File:** `electron/database/migrations/003_translation_cache.sql`

```sql
-- Translation cache persistence

CREATE TABLE IF NOT EXISTS translation_cache (
  id TEXT PRIMARY KEY,
  cache_key TEXT NOT NULL UNIQUE,
  original_text TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  source_language TEXT NOT NULL,
  target_language TEXT NOT NULL,
  provider TEXT NOT NULL,
  access_count INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_translation_cache_key ON translation_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_translation_cache_expires ON translation_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_translation_cache_languages ON translation_cache(source_language, target_language);

-- Translation statistics
CREATE TABLE IF NOT EXISTS translation_stats (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  total_translations INTEGER DEFAULT 0,
  cache_hits INTEGER DEFAULT 0,
  cache_misses INTEGER DEFAULT 0,
  api_calls INTEGER DEFAULT 0,
  characters_translated INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  avg_latency_ms REAL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_translation_stats_date ON translation_stats(date DESC);
```

**Action:** Create database schema for translation cache persistence
**Why:** Persist cache across sessions for better performance
**Dependencies:** None
**Risk:** Low

---

### Phase 7: Frontend Integration (Day 11-12)

#### Step 7.1: Create Translation Store
**File:** `src/stores/translationStore.ts`

```typescript
import { create } from 'zustand';

interface TranslationConfig {
  provider: 'google' | 'deepl' | 'local';
  apiKey?: string;
  userLanguage: string;
  autoTranslateKeywords: boolean;
  autoTranslateResults: boolean;
  enableCache: boolean;
}

interface TranslationStats {
  totalTranslations: number;
  cacheHits: number;
  cacheMisses: number;
  cacheHitRate: number;
  apiCalls: number;
  totalCharactersTranslated: number;
  estimatedCostSaved: number;
}

interface TranslationState {
  config: TranslationConfig;
  stats: TranslationStats | null;
  supportedLanguages: string[];
  isProviderAvailable: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchConfig: () => Promise<void>;
  updateConfig: (config: Partial<TranslationConfig>) => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchLanguages: () => Promise<void>;
  checkProvider: () => Promise<void>;
  translate: (text: string, targetLang: string, sourceLang?: string) => Promise<string>;
  detectLanguage: (text: string) => Promise<{ language: string; confidence: number }>;
  clearCache: () => Promise<void>;
}

export const useTranslationStore = create<TranslationState>((set, get) => ({
  config: {
    provider: 'local',
    userLanguage: 'en',
    autoTranslateKeywords: true,
    autoTranslateResults: true,
    enableCache: true,
  },
  stats: null,
  supportedLanguages: [],
  isProviderAvailable: false,
  isLoading: false,
  error: null,

  fetchConfig: async () => {
    set({ isLoading: true });
    try {
      const result = await window.api.translation.getConfig();
      if (result.success) {
        set({ config: result.config, error: null });
      }
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  updateConfig: async (config) => {
    set({ isLoading: true });
    try {
      const result = await window.api.translation.setConfig(config);
      if (result.success) {
        set((state) => ({ config: { ...state.config, ...config }, error: null }));
      }
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchStats: async () => {
    try {
      const result = await window.api.translation.getStats();
      if (result.success) {
        set({ stats: result.stats });
      }
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  fetchLanguages: async () => {
    try {
      const result = await window.api.translation.getSupportedLanguages();
      if (result.success) {
        set({ supportedLanguages: result.languages });
      }
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  checkProvider: async () => {
    try {
      const result = await window.api.translation.checkProvider();
      if (result.success) {
        set({ isProviderAvailable: result.available });
      }
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  translate: async (text, targetLang, sourceLang) => {
    const result = await window.api.translation.translate(text, targetLang, sourceLang);
    if (result.success) {
      return result.result.translatedText;
    }
    throw new Error(result.error);
  },

  detectLanguage: async (text) => {
    const result = await window.api.translation.detectLanguage(text);
    if (result.success) {
      return result.result;
    }
    throw new Error(result.error);
  },

  clearCache: async () => {
    await window.api.translation.clearCache();
    await get().fetchStats();
  },
}));
```

**Action:** Create Zustand store for translation state
**Why:** Centralized state management for UI components
**Dependencies:** Step 6.3
**Risk:** Low

---

#### Step 7.2: Create Translation Settings Panel
**File:** `src/components/panels/TranslationPanel.tsx`

```tsx
import React, { useEffect } from 'react';
import { useTranslationStore } from '../../stores/translationStore';
import { LANGUAGE_NAMES } from '@electron/core/translation';

export function TranslationPanel() {
  const {
    config,
    stats,
    supportedLanguages,
    isProviderAvailable,
    isLoading,
    fetchConfig,
    updateConfig,
    fetchStats,
    fetchLanguages,
    checkProvider,
    clearCache,
  } = useTranslationStore();

  useEffect(() => {
    fetchConfig();
    fetchStats();
    fetchLanguages();
    checkProvider();
  }, []);

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-lg font-semibold">Translation Settings</h2>

      {/* Provider Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">Translation Provider</label>
        <select
          value={config.provider}
          onChange={(e) => updateConfig({ provider: e.target.value as any })}
          className="w-full p-2 border rounded"
        >
          <option value="local">Local (Offline)</option>
          <option value="google">Google Translate</option>
          <option value="deepl">DeepL</option>
        </select>
        {!isProviderAvailable && config.provider !== 'local' && (
          <p className="text-sm text-yellow-600">⚠️ Provider not available. Check API key.</p>
        )}
      </div>

      {/* API Key (for cloud providers) */}
      {config.provider !== 'local' && (
        <div className="space-y-2">
          <label className="block text-sm font-medium">API Key</label>
          <input
            type="password"
            value={config.apiKey || ''}
            onChange={(e) => updateConfig({ apiKey: e.target.value })}
            placeholder="Enter API key..."
            className="w-full p-2 border rounded"
          />
        </div>
      )}

      {/* User Language */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">Your Language</label>
        <select
          value={config.userLanguage}
          onChange={(e) => updateConfig({ userLanguage: e.target.value })}
          className="w-full p-2 border rounded"
        >
          {supportedLanguages.map((lang) => (
            <option key={lang} value={lang}>
              {LANGUAGE_NAMES[lang] || lang}
            </option>
          ))}
        </select>
      </div>

      {/* Auto-translate Options */}
      <div className="space-y-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.autoTranslateKeywords}
            onChange={(e) => updateConfig({ autoTranslateKeywords: e.target.checked })}
          />
          <span className="text-sm">Auto-translate keywords for proxy region</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.autoTranslateResults}
            onChange={(e) => updateConfig({ autoTranslateResults: e.target.checked })}
          />
          <span className="text-sm">Auto-translate search results to your language</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.enableCache}
            onChange={(e) => updateConfig({ enableCache: e.target.checked })}
          />
          <span className="text-sm">Enable translation caching</span>
        </label>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="p-4 bg-gray-50 rounded space-y-2">
          <h3 className="font-medium">Translation Statistics</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>Total translations: {stats.totalTranslations}</div>
            <div>Cache hit rate: {(stats.cacheHitRate * 100).toFixed(1)}%</div>
            <div>API calls: {stats.apiCalls}</div>
            <div>Characters: {stats.totalCharactersTranslated.toLocaleString()}</div>
            <div className="col-span-2 text-green-600">
              Estimated savings: ${stats.estimatedCostSaved.toFixed(2)}
            </div>
          </div>
          <button
            onClick={clearCache}
            className="text-sm text-blue-600 hover:underline"
          >
            Clear Cache
          </button>
        </div>
      )}
    </div>
  );
}
```

**Action:** Create UI component for translation settings
**Why:** User interface for configuring translation
**Dependencies:** Step 7.1
**Risk:** Low

---

## Testing Strategy

### Unit Tests

**File:** `tests/unit/translation.test.ts`

| Test ID | Description | Component |
|---------|-------------|-----------|
| TR-UT-001 | Language detection for English text | LanguageDetector |
| TR-UT-002 | Language detection for non-Latin scripts (Chinese, Arabic, etc.) | LanguageDetector |
| TR-UT-003 | Language detection confidence scoring | LanguageDetector |
| TR-UT-004 | Cache key generation consistency | TranslationCache |
| TR-UT-005 | Cache TTL expiration | TranslationCache |
| TR-UT-006 | LRU eviction when cache full | TranslationCache |
| TR-UT-007 | Region to language mapping | region-language-map |
| TR-UT-008 | Translation skipping for same language | Translator |
| TR-UT-009 | Fallback provider activation | Translator |
| TR-UT-010 | Batch translation with partial cache | Translator |
| TR-UT-011 | Local provider dictionary lookup | LocalTranslationProvider |
| TR-UT-012 | Statistics calculation accuracy | TranslationManager |

### Integration Tests

**File:** `tests/integration/translation.test.ts`

| Test ID | Description | Components |
|---------|-------------|------------|
| TR-IT-001 | Keyword translation flow | TranslationManager + ProxyManager |
| TR-IT-002 | Search result translation | TranslationManager + SearchEngine |
| TR-IT-003 | IPC handler roundtrip | IPC handlers + TranslationManager |
| TR-IT-004 | Cache persistence to database | TranslationCache + Repository |
| TR-IT-005 | Provider failover scenario | Multiple providers |

### E2E Tests

**File:** `tests/e2e/translation.spec.ts`

| Test ID | Description | Steps |
|---------|-------------|-------|
| TR-E2E-001 | Configure translation provider | Open settings → Select provider → Enter API key → Verify |
| TR-E2E-002 | Translate keyword with proxy | Select US proxy → Enter German keyword → Verify translated |
| TR-E2E-003 | View translation statistics | Run translations → Open stats → Verify counts |
| TR-E2E-004 | Clear translation cache | Run translations → Clear cache → Verify stats reset |

---

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| API rate limiting | Medium | Medium | Implement exponential backoff, use caching aggressively |
| API costs escalation | Medium | High | Cache TTL of 7 days, batch translations, track usage |
| Translation accuracy issues | Medium | Low | Allow user to view original text, provide feedback mechanism |
| Language detection errors | Medium | Medium | Use confidence thresholds, fallback to user's language |
| Network failures | Low | Medium | Fallback to local provider, queue failed translations |
| Cache memory exhaustion | Low | Medium | LRU eviction, configurable max size, periodic cleanup |

---

## Success Criteria

- [ ] Language detection accuracy >85% for supported languages
- [ ] Translation cache hit rate >70% in typical usage
- [ ] API cost reduction of 70%+ through caching
- [ ] Keyword translation latency <500ms (cached) / <2s (API)
- [ ] Result translation batch latency <3s for 10 results
- [ ] Graceful fallback when API unavailable
- [ ] Support for 20+ languages
- [ ] All unit tests pass with >80% coverage
- [ ] E2E tests pass on Windows, macOS, Linux
- [ ] UI is responsive and intuitive

---

## Implementation Timeline

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| Phase 1: Types & Infrastructure | 1 day | Type definitions, region mapping |
| Phase 2: Detection & Cache | 1 day | LanguageDetector, TranslationCache |
| Phase 3: Providers | 2 days | Google, DeepL, Local providers |
| Phase 4: Main Translator | 2 days | Translator, TranslationManager |
| Phase 5: Integration | 2 days | TaskExecutor integration, AutomationManager |
| Phase 6: IPC & Database | 2 days | IPC handlers, migrations, repository |
| Phase 7: Frontend | 2 days | Zustand store, TranslationPanel |
| Testing & Refinement | 2 days | Unit, integration, E2E tests |

**Total: ~14 days**

---

## Dependencies

### New NPM Packages (Optional)
None required for core implementation. The local provider works offline without additional dependencies.

### For Enhanced Local Detection (Optional)
```json
{
  "franc": "^6.1.0"  // Better language detection (optional)
}
```

### API Requirements
- **Google Translate**: Cloud Translation API key from Google Cloud Console
- **DeepL**: API key from DeepL website (Free or Pro)

---

## Environment Variables

Add to `.env.example`:
```
# Translation API Keys (optional - local provider works without keys)
GOOGLE_TRANSLATE_API_KEY=
DEEPL_API_KEY=

# Translation Defaults
DEFAULT_USER_LANGUAGE=en
TRANSLATION_CACHE_TTL=604800000  # 7 days in ms
TRANSLATION_MAX_CACHE_SIZE=10000
```

---

**Document Version:** 1.0  
**Created:** Implementation Planning Phase  
**Status:** Ready for Implementation


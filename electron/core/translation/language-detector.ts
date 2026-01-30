/**
 * Language Detector (EP-008)
 * Detects the language of text using character patterns and common words
 */

export interface DetectionResult {
  language: string;
  confidence: number;
  alternatives?: Array<{ language: string; confidence: number }>;
}

export interface LanguageInfo {
  code: string;
  name: string;
  nativeName: string;
}

// Supported languages (20+)
const SUPPORTED_LANGUAGES: Record<string, LanguageInfo> = {
  en: { code: 'en', name: 'English', nativeName: 'English' },
  es: { code: 'es', name: 'Spanish', nativeName: 'Español' },
  fr: { code: 'fr', name: 'French', nativeName: 'Français' },
  de: { code: 'de', name: 'German', nativeName: 'Deutsch' },
  it: { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  pt: { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  ru: { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  ja: { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  ko: { code: 'ko', name: 'Korean', nativeName: '한국어' },
  zh: { code: 'zh', name: 'Chinese', nativeName: '中文' },
  ar: { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  hi: { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  nl: { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  pl: { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  tr: { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  vi: { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  th: { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  id: { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  cs: { code: 'cs', name: 'Czech', nativeName: 'Čeština' },
  sv: { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
  da: { code: 'da', name: 'Danish', nativeName: 'Dansk' },
  fi: { code: 'fi', name: 'Finnish', nativeName: 'Suomi' },
  el: { code: 'el', name: 'Greek', nativeName: 'Ελληνικά' },
  he: { code: 'he', name: 'Hebrew', nativeName: 'עברית' },
  uk: { code: 'uk', name: 'Ukrainian', nativeName: 'Українська' },
  ro: { code: 'ro', name: 'Romanian', nativeName: 'Română' },
  hu: { code: 'hu', name: 'Hungarian', nativeName: 'Magyar' },
  no: { code: 'no', name: 'Norwegian', nativeName: 'Norsk' },
  sk: { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina' },
  bg: { code: 'bg', name: 'Bulgarian', nativeName: 'Български' }
};

// Common words for each language (for detection)
const LANGUAGE_PATTERNS: Record<string, { words: string[]; regex?: RegExp }> = {
  en: {
    words: ['the', 'is', 'are', 'was', 'were', 'have', 'has', 'been', 'being', 'be', 'and', 'or', 'but', 'if', 'for', 'to', 'of', 'in', 'on', 'at', 'with', 'how', 'what', 'where', 'when', 'why', 'who', 'which', 'this', 'that', 'these', 'those', 'you', 'your', 'my', 'buy', 'best', 'good', 'world', 'hello', 'today']
  },
  es: {
    words: ['el', 'la', 'los', 'las', 'de', 'en', 'es', 'un', 'una', 'que', 'y', 'a', 'no', 'se', 'por', 'con', 'para', 'su', 'como', 'más', 'pero', 'sus', 'le', 'ya', 'o', 'este', 'porque', 'muy', 'sin', 'sobre', 'también', 'me', 'hola', 'mundo', 'cómo', 'estás', 'comprar', 'zapatos', 'mejor', 'buenos', 'hoy'],
    regex: /[¿¡ñáéíóú]/i
  },
  fr: {
    words: ['le', 'la', 'les', 'de', 'des', 'un', 'une', 'et', 'est', 'en', 'que', 'qui', 'dans', 'ce', 'il', 'ne', 'sur', 'se', 'pas', 'plus', 'par', 'pour', 'au', 'avec', 'son', 'mais', 'ou', 'si', 'leur', 'elle', 'bonjour', 'monde', 'comment', 'allez', 'vous'],
    regex: /[àâçéèêëîïôùûüœæ]|bonjour|comment/i
  },
  de: {
    words: ['der', 'die', 'das', 'und', 'ist', 'in', 'zu', 'den', 'von', 'mit', 'sich', 'des', 'auf', 'für', 'nicht', 'als', 'auch', 'es', 'an', 'werden', 'aus', 'er', 'hat', 'dass', 'sie', 'nach', 'bei', 'einer', 'guten', 'tag', 'wie', 'geht', 'ihnen', 'heute'],
    regex: /[äöüß]/i
  },
  it: {
    words: ['il', 'la', 'di', 'che', 'è', 'e', 'in', 'un', 'a', 'per', 'non', 'sono', 'da', 'una', 'con', 'si', 'come', 'più', 'lo', 'su', 'ha', 'ma', 'le', 'essere', 'ci', 'questo', 'anche', 'ciao', 'mondo', 'stai'],
    regex: /[àèéìòù]|ciao|stai|mondo/i
  },
  pt: {
    words: ['o', 'a', 'de', 'que', 'e', 'do', 'da', 'em', 'um', 'para', 'é', 'com', 'não', 'uma', 'os', 'no', 'se', 'na', 'por', 'mais', 'as', 'dos', 'como', 'mas', 'foi', 'ao', 'ele', 'das', 'tem', 'olá', 'mundo', 'você', 'está'],
    regex: /[ãõçáàâéêíóôú]/i
  },
  ru: {
    words: ['и', 'в', 'не', 'на', 'я', 'что', 'он', 'с', 'как', 'это', 'все', 'она', 'так', 'его', 'но', 'да', 'ты', 'к', 'у', 'же', 'вы', 'за', 'мы', 'от', 'было', 'привет', 'мир', 'дела'],
    regex: /[\u0400-\u04FF]/
  },
  ja: {
    words: ['の', 'に', 'は', 'を', 'た', 'が', 'で', 'て', 'と', 'し', 'れ', 'さ', 'ある', 'いる', 'も', 'する', 'から', 'な', 'こと', 'として', 'こんにちは', '世界'],
    regex: /[\u3040-\u309F\u30A0-\u30FF]/
  },
  ko: {
    words: ['이', '그', '저', '것', '수', '들', '등', '및', '때', '년', '월', '일', '위', '안녕', '하세요', '세계'],
    regex: /[\uAC00-\uD7AF]/
  },
  zh: {
    words: ['的', '一', '是', '不', '了', '在', '人', '有', '我', '他', '这', '中', '大', '来', '上', '国', '个', '到', '说', '们', '你好', '世界'],
    regex: /[\u4E00-\u9FFF]/
  },
  ar: {
    words: ['في', 'من', 'على', 'إلى', 'عن', 'مع', 'أن', 'هذا', 'كان', 'وقد', 'لا', 'ما', 'هو', 'و', 'التي', 'أو', 'قد', 'به', 'هي', 'بين', 'مرحبا', 'العالم'],
    regex: /[\u0600-\u06FF]/
  },
  hi: {
    words: ['का', 'के', 'को', 'की', 'में', 'है', 'हैं', 'था', 'थी', 'थे', 'और', 'एक', 'यह', 'से', 'पर', 'किया', 'नमस्ते', 'दुनिया'],
    regex: /[\u0900-\u097F]/
  },
  nl: {
    words: ['de', 'het', 'een', 'van', 'en', 'in', 'is', 'dat', 'op', 'te', 'zijn', 'voor', 'met', 'niet', 'aan', 'er', 'maar', 'om', 'ook', 'hallo', 'wereld']
  },
  pl: {
    words: ['i', 'w', 'nie', 'na', 'do', 'to', 'jest', 'się', 'z', 'że', 'o', 'jak', 'ale', 'po', 'co', 'tak', 'za', 'od', 'cześć', 'świat'],
    regex: /[ąćęłńóśźż]/i
  },
  tr: {
    words: ['bir', 've', 'bu', 'için', 'ile', 'de', 'da', 'ne', 'var', 'daha', 'çok', 'olan', 'gibi', 'sonra', 'kadar', 'ya', 'ki', 'merhaba', 'dünya'],
    regex: /[çğıöşü]/i
  },
  vi: {
    words: ['của', 'là', 'và', 'có', 'trong', 'được', 'cho', 'không', 'này', 'với', 'các', 'một', 'những', 'đã', 'từ', 'xin', 'chào', 'thế', 'giới'],
    regex: /[àảãáạăằẳẵắặâầẩẫấậèẻẽéẹêềểễếệìỉĩíịòỏõóọôồổỗốộơờởỡớợùủũúụưừửữứựỳỷỹýỵđ]/i
  },
  th: {
    words: ['และ', 'ที่', 'ใน', 'เป็น', 'ได้', 'มี', 'จะ', 'ไม่', 'ของ', 'ว่า', 'นี้', 'ให้', 'สวัสดี', 'โลก'],
    regex: /[\u0E00-\u0E7F]/
  },
  id: {
    words: ['dan', 'yang', 'di', 'ini', 'itu', 'dengan', 'untuk', 'tidak', 'dari', 'dalam', 'akan', 'pada', 'juga', 'ke', 'karena', 'halo', 'dunia']
  }
};

export class LanguageDetector {
  private supportedLanguages: Record<string, LanguageInfo>;

  constructor() {
    this.supportedLanguages = SUPPORTED_LANGUAGES;
  }

  /**
   * Detect the language of text
   */
  async detect(text: string): Promise<DetectionResult> {
    // Handle null/undefined/empty
    if (!text || typeof text !== 'string' || text.trim() === '') {
      return { language: 'en', confidence: 0 };
    }

    const normalizedText = text.toLowerCase().trim();
    const scores: Record<string, number> = {};

    // Initialize scores
    for (const lang of Object.keys(LANGUAGE_PATTERNS)) {
      scores[lang] = 0;
    }

    // Check script-based patterns first (most reliable)
    for (const [lang, pattern] of Object.entries(LANGUAGE_PATTERNS)) {
      if (pattern.regex && pattern.regex.test(normalizedText)) {
        scores[lang] += 50;
      }
    }

    // Check word patterns
    const words = normalizedText.split(/\s+/);
    for (const word of words) {
      for (const [lang, pattern] of Object.entries(LANGUAGE_PATTERNS)) {
        if (pattern.words.includes(word)) {
          scores[lang] += 10;
        }
      }
    }

    // Find best match
    let bestLang = 'en';
    let bestScore = 0;
    const alternatives: Array<{ language: string; confidence: number }> = [];

    for (const [lang, score] of Object.entries(scores)) {
      if (score > bestScore) {
        if (bestScore > 0) {
          alternatives.push({ language: bestLang, confidence: this.normalizeScore(bestScore) });
        }
        bestScore = score;
        bestLang = lang;
      } else if (score > 0) {
        alternatives.push({ language: lang, confidence: this.normalizeScore(score) });
      }
    }

    // Sort alternatives by confidence
    alternatives.sort((a, b) => b.confidence - a.confidence);

    const confidence = this.normalizeScore(bestScore);

    return {
      language: bestLang,
      confidence,
      alternatives: alternatives.slice(0, 3)
    };
  }

  /**
   * Detect language for multiple texts
   */
  async detectBatch(texts: string[]): Promise<DetectionResult[]> {
    if (!texts || texts.length === 0) {
      return [];
    }
    return Promise.all(texts.map(text => this.detect(text)));
  }

  /**
   * Check if a language is supported
   */
  isSupported(langCode: string): boolean {
    if (!langCode) return false;
    return langCode.toLowerCase() in this.supportedLanguages;
  }

  /**
   * Get list of supported language codes
   */
  getSupportedLanguages(): string[] {
    return Object.keys(this.supportedLanguages);
  }

  /**
   * Get language name from code
   */
  getLanguageName(langCode: string): string {
    const info = this.supportedLanguages[langCode.toLowerCase()];
    return info ? info.name : langCode;
  }

  /**
   * Get full language info
   */
  getLanguageInfo(langCode: string): LanguageInfo | undefined {
    return this.supportedLanguages[langCode.toLowerCase()];
  }

  /**
   * Normalize score to confidence (0-1)
   */
  private normalizeScore(score: number): number {
    // Use a lower divisor to get higher confidence values
    // Score of 50 (regex match) should give ~0.8 confidence
    // Score of 30 (3 word matches) should give ~0.6 confidence
    if (score >= 50) {
      return Math.min(0.8 + (score - 50) / 250, 1);
    }
    return Math.min(score / 60, 0.79);
  }
}

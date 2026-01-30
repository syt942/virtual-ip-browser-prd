/**
 * Basic Translations Dictionary
 * Simple translation dictionary for common words (fallback when API unavailable)
 */

export const BASIC_TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    hello: 'hello',
    world: 'world',
    search: 'search',
    buy: 'buy',
    best: 'best',
    good: 'good',
    'hello world': 'hello world'
  },
  es: {
    hello: 'hola',
    world: 'mundo',
    search: 'buscar',
    buy: 'comprar',
    best: 'mejor',
    good: 'bueno',
    'hello world': 'hola mundo'
  },
  fr: {
    hello: 'bonjour',
    world: 'monde',
    search: 'rechercher',
    buy: 'acheter',
    best: 'meilleur',
    good: 'bon',
    'hello world': 'bonjour monde'
  },
  de: {
    hello: 'hallo',
    world: 'welt',
    search: 'suchen',
    buy: 'kaufen',
    best: 'beste',
    good: 'gut',
    'hello world': 'hallo welt'
  },
  ja: {
    hello: 'こんにちは',
    world: '世界',
    search: '検索',
    buy: '購入',
    best: '最高',
    good: '良い',
    'hello world': 'こんにちは世界'
  },
  ko: {
    hello: '안녕하세요',
    world: '세계',
    search: '검색',
    buy: '구매',
    best: '최고',
    good: '좋은',
    'hello world': '안녕하세요 세계'
  },
  zh: {
    hello: '你好',
    world: '世界',
    search: '搜索',
    buy: '购买',
    best: '最好',
    good: '好',
    'hello world': '你好世界'
  },
  ru: {
    hello: 'привет',
    world: 'мир',
    search: 'поиск',
    buy: 'купить',
    best: 'лучший',
    good: 'хороший',
    'hello world': 'привет мир'
  },
  pt: {
    hello: 'olá',
    world: 'mundo',
    search: 'pesquisar',
    buy: 'comprar',
    best: 'melhor',
    good: 'bom',
    'hello world': 'olá mundo'
  },
  it: {
    hello: 'ciao',
    world: 'mondo',
    search: 'cercare',
    buy: 'comprare',
    best: 'migliore',
    good: 'buono',
    'hello world': 'ciao mondo'
  },
  ar: {
    hello: 'مرحبا',
    world: 'العالم',
    search: 'بحث',
    buy: 'شراء',
    best: 'أفضل',
    good: 'جيد',
    'hello world': 'مرحبا بالعالم'
  },
  hi: {
    hello: 'नमस्ते',
    world: 'दुनिया',
    search: 'खोज',
    buy: 'खरीदना',
    best: 'सर्वश्रेष्ठ',
    good: 'अच्छा',
    'hello world': 'नमस्ते दुनिया'
  }
};

/**
 * Get basic translation for a word/phrase
 */
export function getBasicTranslation(
  text: string, 
  targetLang: string
): string | undefined {
  const lowerText = text.toLowerCase();
  return BASIC_TRANSLATIONS[targetLang]?.[lowerText];
}

/**
 * Translate text word by word using basic dictionary
 */
export function translateWordByWord(
  text: string,
  targetLang: string
): string {
  if (!BASIC_TRANSLATIONS[targetLang]) {
    return text;
  }

  const words = text.split(' ');
  const translatedWords = words.map(word => {
    const lowerWord = word.toLowerCase();
    return BASIC_TRANSLATIONS[targetLang][lowerWord] ?? word;
  });
  return translatedWords.join(' ');
}

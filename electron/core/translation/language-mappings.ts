/**
 * Language Mappings Module
 * Contains timezone-to-language and country-to-language mappings
 */

// Timezone to language mapping
export const TIMEZONE_LANGUAGE_MAP: Record<string, string> = {
  // Americas
  'America/New_York': 'en',
  'America/Los_Angeles': 'en',
  'America/Chicago': 'en',
  'America/Denver': 'en',
  'America/Toronto': 'en',
  'America/Vancouver': 'en',
  'America/Mexico_City': 'es',
  'America/Bogota': 'es',
  'America/Lima': 'es',
  'America/Santiago': 'es',
  'America/Buenos_Aires': 'es',
  'America/Sao_Paulo': 'pt',
  'America/Rio_de_Janeiro': 'pt',
  
  // Europe
  'Europe/London': 'en',
  'Europe/Paris': 'fr',
  'Europe/Berlin': 'de',
  'Europe/Madrid': 'es',
  'Europe/Rome': 'it',
  'Europe/Amsterdam': 'nl',
  'Europe/Brussels': 'nl',
  'Europe/Vienna': 'de',
  'Europe/Zurich': 'de',
  'Europe/Warsaw': 'pl',
  'Europe/Prague': 'cs',
  'Europe/Stockholm': 'sv',
  'Europe/Copenhagen': 'da',
  'Europe/Helsinki': 'fi',
  'Europe/Oslo': 'no',
  'Europe/Moscow': 'ru',
  'Europe/Kiev': 'uk',
  'Europe/Bucharest': 'ro',
  'Europe/Budapest': 'hu',
  'Europe/Athens': 'el',
  'Europe/Istanbul': 'tr',
  'Europe/Lisbon': 'pt',
  
  // Asia
  'Asia/Tokyo': 'ja',
  'Asia/Seoul': 'ko',
  'Asia/Shanghai': 'zh',
  'Asia/Beijing': 'zh',
  'Asia/Hong_Kong': 'zh',
  'Asia/Taipei': 'zh',
  'Asia/Singapore': 'en',
  'Asia/Bangkok': 'th',
  'Asia/Jakarta': 'id',
  'Asia/Ho_Chi_Minh': 'vi',
  'Asia/Hanoi': 'vi',
  'Asia/Manila': 'en',
  'Asia/Kolkata': 'hi',
  'Asia/Mumbai': 'hi',
  'Asia/Dubai': 'ar',
  'Asia/Riyadh': 'ar',
  'Asia/Jerusalem': 'he',
  'Asia/Tel_Aviv': 'he',
  
  // Oceania
  'Australia/Sydney': 'en',
  'Australia/Melbourne': 'en',
  'Pacific/Auckland': 'en',
  
  // Africa
  'Africa/Cairo': 'ar',
  'Africa/Johannesburg': 'en',
  'Africa/Lagos': 'en'
};

// Country code to language mapping
export const COUNTRY_LANGUAGE_MAP: Record<string, string> = {
  // English-speaking
  US: 'en', GB: 'en', UK: 'en', AU: 'en', CA: 'en', NZ: 'en', IE: 'en',
  
  // Spanish-speaking
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', PE: 'es', CL: 'es', VE: 'es',
  EC: 'es', GT: 'es', CU: 'es', BO: 'es', DO: 'es', HN: 'es', PY: 'es',
  SV: 'es', NI: 'es', CR: 'es', PA: 'es', UY: 'es',
  
  // Portuguese-speaking
  BR: 'pt', PT: 'pt',
  
  // French-speaking
  FR: 'fr', BE: 'fr', CH: 'fr', CA_FR: 'fr',
  
  // German-speaking
  DE: 'de', AT: 'de', CH_DE: 'de',
  
  // Italian
  IT: 'it',
  
  // Dutch
  NL: 'nl',
  
  // Polish
  PL: 'pl',
  
  // Russian
  RU: 'ru',
  
  // Japanese
  JP: 'ja',
  
  // Korean
  KR: 'ko',
  
  // Chinese
  CN: 'zh', TW: 'zh', HK: 'zh',
  
  // Arabic
  SA: 'ar', AE: 'ar', EG: 'ar', IQ: 'ar', MA: 'ar', DZ: 'ar',
  
  // Hindi
  IN: 'hi',
  
  // Turkish
  TR: 'tr',
  
  // Vietnamese
  VN: 'vi',
  
  // Thai
  TH: 'th',
  
  // Indonesian
  ID: 'id',
  
  // Others
  CZ: 'cs', SE: 'sv', DK: 'da', FI: 'fi', NO: 'no', GR: 'el',
  IL: 'he', UA: 'uk', RO: 'ro', HU: 'hu', SK: 'sk', BG: 'bg'
};

// Supported languages list
export const SUPPORTED_LANGUAGES = [
  'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh',
  'ar', 'hi', 'nl', 'pl', 'tr', 'vi', 'th', 'id', 'cs', 'sv',
  'da', 'fi', 'el', 'he', 'uk', 'ro', 'hu', 'no', 'sk', 'bg'
];

/**
 * Get language code for a timezone
 */
export function getLanguageForTimezone(timezone: string): string {
  return TIMEZONE_LANGUAGE_MAP[timezone] ?? 'en';
}

/**
 * Get language code for a country
 */
export function getLanguageForCountry(countryCode: string): string {
  const normalized = countryCode.toUpperCase();
  return COUNTRY_LANGUAGE_MAP[normalized] ?? 'en';
}

/**
 * Check if a language is supported
 */
export function isLanguageSupported(langCode: string): boolean {
  return SUPPORTED_LANGUAGES.includes(langCode.toLowerCase());
}

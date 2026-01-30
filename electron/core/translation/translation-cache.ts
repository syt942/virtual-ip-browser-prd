/**
 * Translation Cache with LRU Eviction (EP-008)
 * Provides caching for translations with configurable max size and LRU eviction policy
 */

export interface CacheEntry {
  text: string;
  sourceLang: string;
  targetLang: string;
  translation: string;
  accessTime: number;
  createdAt: number;
}

export interface CacheConfig {
  maxSize?: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  maxSize: number;
}

export class TranslationCache {
  private cache: Map<string, CacheEntry>;
  private maxSize: number;
  private hits: number = 0;
  private misses: number = 0;

  constructor(config: CacheConfig = {}) {
    this.maxSize = config.maxSize ?? 10000;
    this.cache = new Map();
  }

  /**
   * Generate a unique cache key for a translation
   */
  generateKey(text: string, sourceLang: string, targetLang: string): string {
    return `${sourceLang}:${targetLang}:${text}`;
  }

  /**
   * Get a translation from cache
   */
  get(text: string, sourceLang: string, targetLang: string): string | undefined {
    const key = this.generateKey(text, sourceLang, targetLang);
    const entry = this.cache.get(key);

    if (entry) {
      // Update access time for LRU by re-inserting
      const translation = entry.translation;
      this.cache.delete(key);
      entry.accessTime = Date.now();
      this.cache.set(key, entry);
      this.hits++;
      return translation;
    }

    this.misses++;
    return undefined;
  }

  /**
   * Store a translation in cache
   */
  set(text: string, sourceLang: string, targetLang: string, translation: string): void {
    const key = this.generateKey(text, sourceLang, targetLang);
    
    // Check if key already exists (update case)
    if (this.cache.has(key)) {
      const entry = this.cache.get(key)!;
      entry.translation = translation;
      entry.accessTime = Date.now();
      return;
    }

    // Evict LRU if at capacity
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    const now = Date.now();
    this.cache.set(key, {
      text,
      sourceLang,
      targetLang,
      translation,
      accessTime: now,
      createdAt: now
    });
  }

  /**
   * Check if a translation exists in cache
   */
  has(text: string, sourceLang: string, targetLang: string): boolean {
    const key = this.generateKey(text, sourceLang, targetLang);
    return this.cache.has(key);
  }

  /**
   * Delete a translation from cache
   */
  delete(text: string, sourceLang: string, targetLang: string): void {
    const key = this.generateKey(text, sourceLang, targetLang);
    this.cache.delete(key);
  }

  /**
   * Clear all entries from cache
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get the current size of the cache
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get the maximum size of the cache
   */
  getMaxSize(): number {
    return this.maxSize;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
      size: this.cache.size,
      maxSize: this.maxSize
    };
  }

  /**
   * Evict the least recently used entry (first item in Map due to insertion order)
   */
  private evictLRU(): void {
    // Map maintains insertion order, so first key is the oldest (LRU)
    const firstKey = this.cache.keys().next().value;
    if (firstKey) {
      this.cache.delete(firstKey);
    }
  }

  /**
   * Get all cached entries (for debugging/export)
   */
  getEntries(): CacheEntry[] {
    return Array.from(this.cache.values());
  }

  /**
   * Import entries into cache (for restoration)
   */
  importEntries(entries: CacheEntry[]): void {
    for (const entry of entries) {
      if (this.cache.size >= this.maxSize) {
        this.evictLRU();
      }
      const key = this.generateKey(entry.text, entry.sourceLang, entry.targetLang);
      this.cache.set(key, {
        ...entry,
        accessTime: Date.now()
      });
    }
  }
}

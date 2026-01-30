# Architecture Recommendations for Virtual IP Browser

## Executive Summary

This document provides architectural recommendations for implementing five key features:
1. Geographic Proxy Rotation
2. Sticky-Session Strategy
3. Time-Based Rotation
4. Custom Rules Engine
5. Creator Support Module

The current architecture provides a solid foundation with well-separated concerns (Electron main/renderer, Zustand stores, SQLite persistence). These recommendations build upon existing patterns while introducing necessary extensions.

---

## Current Architecture Analysis

### Strengths
- **Clean separation**: Main process handles core logic, renderer handles UI
- **Strategy Pattern**: `ProxyRotationStrategy` class already implements multiple algorithms
- **Event-driven**: `EventEmitter` used consistently for decoupling
- **Type safety**: TypeScript interfaces defined in `types.ts` files
- **Database abstraction**: `DatabaseManager` provides clean query interface

### Areas for Enhancement
- Rotation strategies lack context (domain, time, geolocation)
- No geolocation data model for proxies
- Missing domain-to-proxy mapping persistence
- Rules engine not implemented
- Creator support module partially scaffolded but needs full implementation

---

## 1. Geographic Proxy Rotation

### Overview
Enable proxy selection based on geographic location, allowing users to target specific regions for their browsing sessions.

### Data Model Extensions

```typescript
// electron/core/proxy-engine/types.ts - Extensions

export interface GeoLocation {
  country: string;      // ISO 3166-1 alpha-2 (e.g., "US")
  countryName: string;  // Full name (e.g., "United States")
  region?: string;      // State/Province
  city?: string;        // City name
  latitude?: number;    // Decimal degrees
  longitude?: number;   // Decimal degrees
  timezone?: string;    // IANA timezone (e.g., "America/New_York")
  isp?: string;         // Internet Service Provider
  asn?: string;         // Autonomous System Number
}

export interface ProxyConfig {
  // ... existing fields ...
  geolocation?: GeoLocation;
  geoVerified?: boolean;      // Has geo been verified via IP lookup?
  geoLastChecked?: Date;      // Last geo verification timestamp
}

export interface GeographicRotationConfig {
  preferredCountries: string[];      // Priority order: ["US", "UK", "DE"]
  preferredRegions?: string[];       // Within country: ["California", "Texas"]
  excludeCountries?: string[];       // Never use: ["CN", "RU"]
  fallbackStrategy: RotationStrategy; // If no geo match: 'round-robin'
  verifyGeoOnValidation: boolean;    // Lookup geo during proxy validation
}
```

### Database Schema Extension

```sql
-- Add to schema.sql or create migration

ALTER TABLE proxies ADD COLUMN geo_country TEXT;
ALTER TABLE proxies ADD COLUMN geo_country_name TEXT;
ALTER TABLE proxies ADD COLUMN geo_region TEXT;
ALTER TABLE proxies ADD COLUMN geo_city TEXT;
ALTER TABLE proxies ADD COLUMN geo_latitude REAL;
ALTER TABLE proxies ADD COLUMN geo_longitude REAL;
ALTER TABLE proxies ADD COLUMN geo_timezone TEXT;
ALTER TABLE proxies ADD COLUMN geo_isp TEXT;
ALTER TABLE proxies ADD COLUMN geo_asn TEXT;
ALTER TABLE proxies ADD COLUMN geo_verified INTEGER DEFAULT 0;
ALTER TABLE proxies ADD COLUMN geo_last_checked DATETIME;

CREATE INDEX idx_proxies_geo_country ON proxies(geo_country);
CREATE INDEX idx_proxies_geo_region ON proxies(geo_region);
```

### Implementation Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GeoProxyRotation                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ GeoIPService    │  │ GeoProxyFilter  │                   │
│  │ (IP Lookup)     │  │ (Filter by Geo) │                   │
│  └────────┬────────┘  └────────┬────────┘                   │
│           │                    │                             │
│           ▼                    ▼                             │
│  ┌─────────────────────────────────────────┐                │
│  │        GeographicRotationStrategy        │                │
│  │  - filterByPreferences()                 │                │
│  │  - sortByProximity()                     │                │
│  │  - selectWithFallback()                  │                │
│  └─────────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

### New Files to Create

```
electron/core/proxy-engine/
├── geo/
│   ├── index.ts              # Barrel export
│   ├── geo-ip-service.ts     # IP geolocation lookup
│   ├── geo-filter.ts         # Filter proxies by geo
│   └── geo-rotation.ts       # Geographic rotation strategy
```

### GeoIP Service Implementation

```typescript
// electron/core/proxy-engine/geo/geo-ip-service.ts

import type { GeoLocation } from '../types';

export class GeoIPService {
  private cache: Map<string, { geo: GeoLocation; timestamp: number }> = new Map();
  private cacheTTL = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Lookup geolocation for an IP address
   * Uses free IP-API service (consider paid service for production)
   */
  async lookup(ip: string): Promise<GeoLocation | null> {
    // Check cache first
    const cached = this.cache.get(ip);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.geo;
    }

    try {
      // Option 1: ip-api.com (free, 45 req/min limit)
      const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,region,regionName,city,lat,lon,timezone,isp,as`);
      const data = await response.json();

      if (data.status !== 'success') {
        return null;
      }

      const geo: GeoLocation = {
        country: data.countryCode,
        countryName: data.country,
        region: data.regionName,
        city: data.city,
        latitude: data.lat,
        longitude: data.lon,
        timezone: data.timezone,
        isp: data.isp,
        asn: data.as
      };

      this.cache.set(ip, { geo, timestamp: Date.now() });
      return geo;
    } catch (error) {
      console.error('[GeoIP] Lookup failed:', error);
      return null;
    }
  }

  /**
   * Verify proxy's actual location by making request through it
   */
  async verifyProxyGeo(proxyConfig: ProxyConfig): Promise<GeoLocation | null> {
    // Make request through proxy to IP echo service
    // Implementation depends on proxy protocol
    // Returns actual exit IP's geolocation
  }

  /**
   * Calculate distance between two geo points (Haversine formula)
   */
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
```

### Geographic Rotation Strategy

```typescript
// electron/core/proxy-engine/geo/geo-rotation.ts

import type { ProxyConfig, GeographicRotationConfig } from '../types';
import { GeoIPService } from './geo-ip-service';

export class GeographicRotationStrategy {
  private geoService: GeoIPService;
  private config: GeographicRotationConfig;
  private lastUsedByCountry: Map<string, number> = new Map();

  constructor(config: GeographicRotationConfig) {
    this.geoService = new GeoIPService();
    this.config = config;
  }

  /**
   * Select proxy based on geographic preferences
   */
  selectProxy(proxies: ProxyConfig[], targetCountry?: string): ProxyConfig | null {
    // Step 1: Filter by geographic preferences
    let candidates = this.filterByPreferences(proxies, targetCountry);

    // Step 2: If no candidates, use fallback strategy
    if (candidates.length === 0) {
      console.log('[GeoRotation] No geo matches, using fallback');
      return this.selectWithFallback(proxies);
    }

    // Step 3: Round-robin within geographic region
    return this.roundRobinWithinGeo(candidates, targetCountry);
  }

  /**
   * Filter proxies by geographic preferences
   */
  private filterByPreferences(proxies: ProxyConfig[], targetCountry?: string): ProxyConfig[] {
    const target = targetCountry || this.config.preferredCountries[0];
    
    return proxies.filter(proxy => {
      if (!proxy.geolocation) return false;
      
      // Check exclusions first
      if (this.config.excludeCountries?.includes(proxy.geolocation.country)) {
        return false;
      }

      // Match country
      if (target && proxy.geolocation.country !== target) {
        return false;
      }

      // Match region if specified
      if (this.config.preferredRegions?.length) {
        return this.config.preferredRegions.includes(proxy.geolocation.region || '');
      }

      return true;
    });
  }

  /**
   * Round-robin within a geographic region
   */
  private roundRobinWithinGeo(proxies: ProxyConfig[], country?: string): ProxyConfig {
    const key = country || 'default';
    const lastIndex = this.lastUsedByCountry.get(key) || 0;
    const nextIndex = (lastIndex + 1) % proxies.length;
    this.lastUsedByCountry.set(key, nextIndex);
    return proxies[nextIndex];
  }

  /**
   * Use fallback strategy when no geo match
   */
  private selectWithFallback(proxies: ProxyConfig[]): ProxyConfig | null {
    if (proxies.length === 0) return null;
    
    // Simple round-robin as fallback
    // Could delegate to other strategies
    const lastIndex = this.lastUsedByCountry.get('fallback') || 0;
    const nextIndex = (lastIndex + 1) % proxies.length;
    this.lastUsedByCountry.set('fallback', nextIndex);
    return proxies[nextIndex];
  }
}
```

### Integration with Existing ProxyRotationStrategy

```typescript
// Modify electron/core/proxy-engine/rotation.ts

import { GeographicRotationStrategy } from './geo/geo-rotation';

export class ProxyRotationStrategy {
  // ... existing code ...
  
  private geoStrategy?: GeographicRotationStrategy;

  setConfig(config: RotationConfig): void {
    this.config = config;
    this.lastUsedIndex = 0;
    this.usageCount.clear();
    
    // Initialize geo strategy if geographic rotation selected
    if (config.strategy === 'geographic' && config.geographicPreferences) {
      this.geoStrategy = new GeographicRotationStrategy({
        preferredCountries: config.geographicPreferences,
        fallbackStrategy: 'round-robin',
        verifyGeoOnValidation: true
      });
    }
  }

  selectProxy(proxies: ProxyConfig[], context?: RotationContext): ProxyConfig | null {
    if (proxies.length === 0) return null;

    switch (this.config.strategy) {
      // ... existing cases ...
      case 'geographic':
        return this.geographic(proxies, context?.targetCountry);
      // ... rest of cases ...
    }
  }

  private geographic(proxies: ProxyConfig[], targetCountry?: string): ProxyConfig | null {
    if (!this.geoStrategy) {
      return this.roundRobin(proxies);
    }
    const proxy = this.geoStrategy.selectProxy(proxies, targetCountry);
    if (proxy) this.incrementUsage(proxy.id);
    return proxy;
  }
}

// New context interface for rotation decisions
export interface RotationContext {
  targetCountry?: string;
  domain?: string;
  tabId?: string;
}
```

### Trade-offs Analysis

| Aspect | Pros | Cons |
|--------|------|------|
| **IP-API Service** | Free, simple, accurate | Rate limited (45/min), privacy concerns |
| **MaxMind GeoLite2** | Local DB, fast, no rate limits | Requires download, updates needed |
| **Caching** | Reduces API calls, faster | Memory usage, stale data possible |
| **Auto-verification** | Ensures accuracy | Adds latency to validation |

**Recommendation**: Use MaxMind GeoLite2 for production with IP-API as fallback.

---

## 2. Sticky-Session Strategy (Domain-to-Proxy Mapping)

### Overview
Maintain consistent proxy assignments per domain to preserve session state, avoid detection patterns, and enable domain-specific proxy preferences.

### Data Model

```typescript
// electron/core/proxy-engine/types.ts - Extensions

export interface DomainProxyMapping {
  id: string;
  domain: string;           // e.g., "google.com" or "*.google.com"
  proxyId: string;          // Assigned proxy ID
  createdAt: Date;
  lastUsed: Date;
  requestCount: number;
  ttl?: number;             // Time-to-live in ms (optional expiry)
  isWildcard: boolean;      // Pattern matching enabled
  priority: number;         // Higher = checked first
}

export interface StickySessionConfig {
  enabled: boolean;
  defaultTTL: number;       // Default mapping lifetime (ms)
  maxMappings: number;      // Limit stored mappings
  persistMappings: boolean; // Save to database
  hashAlgorithm: 'consistent' | 'random' | 'round-robin';
  fallbackOnFailure: boolean; // Use different proxy if sticky fails
}
```

### Database Schema

```sql
-- New table for domain-proxy mappings
CREATE TABLE IF NOT EXISTS domain_proxy_mappings (
  id TEXT PRIMARY KEY,
  domain TEXT NOT NULL,
  proxy_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_used DATETIME DEFAULT CURRENT_TIMESTAMP,
  request_count INTEGER DEFAULT 0,
  ttl INTEGER,
  is_wildcard INTEGER DEFAULT 0,
  priority INTEGER DEFAULT 0,
  FOREIGN KEY (proxy_id) REFERENCES proxies(id) ON DELETE CASCADE,
  UNIQUE(domain)
);

CREATE INDEX idx_domain_mappings_domain ON domain_proxy_mappings(domain);
CREATE INDEX idx_domain_mappings_proxy ON domain_proxy_mappings(proxy_id);
CREATE INDEX idx_domain_mappings_priority ON domain_proxy_mappings(priority DESC);
```

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    StickySessionManager                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────────┐  ┌───────────────────┐                   │
│  │ DomainMatcher     │  │ ConsistentHash    │                   │
│  │ (wildcard/regex)  │  │ (proxy selection) │                   │
│  └─────────┬─────────┘  └─────────┬─────────┘                   │
│            │                      │                              │
│            ▼                      ▼                              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              MappingStore (Memory + SQLite)              │    │
│  │  - getMapping(domain)                                    │    │
│  │  - setMapping(domain, proxyId)                           │    │
│  │  - expireMappings()                                      │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation

```typescript
// electron/core/proxy-engine/sticky/sticky-session-manager.ts

import { EventEmitter } from 'events';
import type { ProxyConfig, DomainProxyMapping, StickySessionConfig } from '../types';
import { DatabaseManager } from '../../../database';

export class StickySessionManager extends EventEmitter {
  private mappings: Map<string, DomainProxyMapping> = new Map();
  private config: StickySessionConfig;
  private db: DatabaseManager;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(db: DatabaseManager, config: StickySessionConfig) {
    super();
    this.db = db;
    this.config = config;
    
    if (config.persistMappings) {
      this.loadMappingsFromDB();
    }
    
    // Periodic cleanup of expired mappings
    this.cleanupInterval = setInterval(() => this.expireMappings(), 60000);
  }

  /**
   * Get proxy for a domain (creates mapping if doesn't exist)
   */
  getProxyForDomain(domain: string, availableProxies: ProxyConfig[]): ProxyConfig | null {
    const normalizedDomain = this.normalizeDomain(domain);
    
    // Check for existing mapping
    const mapping = this.findMapping(normalizedDomain);
    
    if (mapping) {
      // Verify proxy is still available
      const proxy = availableProxies.find(p => p.id === mapping.proxyId);
      if (proxy && proxy.status === 'active') {
        this.updateMappingUsage(mapping.id);
        return proxy;
      }
      
      // Proxy no longer available
      if (this.config.fallbackOnFailure) {
        this.removeMapping(mapping.id);
        return this.createNewMapping(normalizedDomain, availableProxies);
      }
      return null;
    }

    // Create new mapping
    return this.createNewMapping(normalizedDomain, availableProxies);
  }

  /**
   * Find mapping for domain (supports wildcards)
   */
  private findMapping(domain: string): DomainProxyMapping | null {
    // Direct match first
    const direct = this.mappings.get(domain);
    if (direct && !this.isExpired(direct)) {
      return direct;
    }

    // Wildcard matching (sorted by priority)
    const wildcardMappings = Array.from(this.mappings.values())
      .filter(m => m.isWildcard)
      .sort((a, b) => b.priority - a.priority);

    for (const mapping of wildcardMappings) {
      if (this.matchesWildcard(domain, mapping.domain)) {
        if (!this.isExpired(mapping)) {
          return mapping;
        }
      }
    }

    return null;
  }

  /**
   * Create new domain-proxy mapping
   */
  private createNewMapping(domain: string, proxies: ProxyConfig[]): ProxyConfig | null {
    if (proxies.length === 0) return null;
    
    // Enforce max mappings limit
    if (this.mappings.size >= this.config.maxMappings) {
      this.evictOldestMapping();
    }

    // Select proxy based on algorithm
    const proxy = this.selectProxyForNewMapping(domain, proxies);
    if (!proxy) return null;

    const mapping: DomainProxyMapping = {
      id: crypto.randomUUID(),
      domain,
      proxyId: proxy.id,
      createdAt: new Date(),
      lastUsed: new Date(),
      requestCount: 1,
      ttl: this.config.defaultTTL,
      isWildcard: false,
      priority: 0
    };

    this.mappings.set(domain, mapping);
    
    if (this.config.persistMappings) {
      this.saveMappingToDB(mapping);
    }

    this.emit('mapping:created', { domain, proxyId: proxy.id });
    return proxy;
  }

  /**
   * Select proxy for new mapping using configured algorithm
   */
  private selectProxyForNewMapping(domain: string, proxies: ProxyConfig[]): ProxyConfig | null {
    switch (this.config.hashAlgorithm) {
      case 'consistent':
        return this.consistentHashSelect(domain, proxies);
      case 'random':
        return proxies[Math.floor(Math.random() * proxies.length)];
      case 'round-robin':
        return this.roundRobinSelect(proxies);
      default:
        return proxies[0];
    }
  }

  /**
   * Consistent hashing for deterministic proxy selection
   * Same domain always maps to same proxy (if available)
   */
  private consistentHashSelect(domain: string, proxies: ProxyConfig[]): ProxyConfig {
    const hash = this.hashString(domain);
    const index = hash % proxies.length;
    return proxies[index];
  }

  /**
   * Simple string hash function (djb2 algorithm)
   */
  private hashString(str: string): number {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
    }
    return Math.abs(hash);
  }

  /**
   * Normalize domain (extract base domain)
   */
  private normalizeDomain(url: string): string {
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      return parsed.hostname.toLowerCase();
    } catch {
      return url.toLowerCase();
    }
  }

  /**
   * Check if domain matches wildcard pattern
   */
  private matchesWildcard(domain: string, pattern: string): boolean {
    if (pattern.startsWith('*.')) {
      const baseDomain = pattern.slice(2);
      return domain === baseDomain || domain.endsWith('.' + baseDomain);
    }
    return domain === pattern;
  }

  /**
   * Check if mapping has expired
   */
  private isExpired(mapping: DomainProxyMapping): boolean {
    if (!mapping.ttl) return false;
    return Date.now() - mapping.lastUsed.getTime() > mapping.ttl;
  }

  /**
   * Expire old mappings
   */
  private expireMappings(): void {
    const now = Date.now();
    for (const [domain, mapping] of this.mappings) {
      if (this.isExpired(mapping)) {
        this.mappings.delete(domain);
        if (this.config.persistMappings) {
          this.deleteMappingFromDB(mapping.id);
        }
        this.emit('mapping:expired', { domain, proxyId: mapping.proxyId });
      }
    }
  }

  /**
   * Manually set a domain-proxy mapping (for user overrides)
   */
  setMapping(domain: string, proxyId: string, options?: Partial<DomainProxyMapping>): void {
    const mapping: DomainProxyMapping = {
      id: crypto.randomUUID(),
      domain: this.normalizeDomain(domain),
      proxyId,
      createdAt: new Date(),
      lastUsed: new Date(),
      requestCount: 0,
      isWildcard: domain.includes('*'),
      priority: options?.priority || 0,
      ttl: options?.ttl || this.config.defaultTTL
    };

    this.mappings.set(mapping.domain, mapping);
    
    if (this.config.persistMappings) {
      this.saveMappingToDB(mapping);
    }

    this.emit('mapping:set', { domain, proxyId });
  }

  /**
   * Remove a mapping
   */
  removeMapping(id: string): boolean {
    for (const [domain, mapping] of this.mappings) {
      if (mapping.id === id) {
        this.mappings.delete(domain);
        if (this.config.persistMappings) {
          this.deleteMappingFromDB(id);
        }
        this.emit('mapping:removed', { domain, proxyId: mapping.proxyId });
        return true;
      }
    }
    return false;
  }

  /**
   * Get all current mappings
   */
  getAllMappings(): DomainProxyMapping[] {
    return Array.from(this.mappings.values());
  }

  // Database operations
  private loadMappingsFromDB(): void {
    const rows = this.db.query<any>('SELECT * FROM domain_proxy_mappings');
    for (const row of rows) {
      const mapping: DomainProxyMapping = {
        id: row.id,
        domain: row.domain,
        proxyId: row.proxy_id,
        createdAt: new Date(row.created_at),
        lastUsed: new Date(row.last_used),
        requestCount: row.request_count,
        ttl: row.ttl,
        isWildcard: row.is_wildcard === 1,
        priority: row.priority
      };
      this.mappings.set(mapping.domain, mapping);
    }
  }

  private saveMappingToDB(mapping: DomainProxyMapping): void {
    this.db.execute(`
      INSERT OR REPLACE INTO domain_proxy_mappings 
      (id, domain, proxy_id, created_at, last_used, request_count, ttl, is_wildcard, priority)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      mapping.id, mapping.domain, mapping.proxyId,
      mapping.createdAt, mapping.lastUsed, mapping.requestCount,
      mapping.ttl, mapping.isWildcard ? 1 : 0, mapping.priority
    ]);
  }

  private updateMappingUsage(id: string): void {
    const mapping = Array.from(this.mappings.values()).find(m => m.id === id);
    if (mapping) {
      mapping.lastUsed = new Date();
      mapping.requestCount++;
      if (this.config.persistMappings) {
        this.db.execute(
          'UPDATE domain_proxy_mappings SET last_used = ?, request_count = ? WHERE id = ?',
          [mapping.lastUsed, mapping.requestCount, id]
        );
      }
    }
  }

  private deleteMappingFromDB(id: string): void {
    this.db.execute('DELETE FROM domain_proxy_mappings WHERE id = ?', [id]);
  }

  private evictOldestMapping(): void {
    let oldest: DomainProxyMapping | null = null;
    for (const mapping of this.mappings.values()) {
      if (!oldest || mapping.lastUsed < oldest.lastUsed) {
        oldest = mapping;
      }
    }
    if (oldest) {
      this.removeMapping(oldest.id);
    }
  }

  private roundRobinIndex = 0;
  private roundRobinSelect(proxies: ProxyConfig[]): ProxyConfig {
    const proxy = proxies[this.roundRobinIndex % proxies.length];
    this.roundRobinIndex++;
    return proxy;
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}
```

### Integration with ProxyManager

```typescript
// Modify electron/core/proxy-engine/manager.ts

import { StickySessionManager } from './sticky/sticky-session-manager';

export class ProxyManager extends EventEmitter {
  // ... existing fields ...
  private stickyManager?: StickySessionManager;

  constructor() {
    super();
    // ... existing init ...
  }

  /**
   * Initialize sticky session support
   */
  initStickySession(config: StickySessionConfig): void {
    this.stickyManager = new StickySessionManager(this.db, config);
    
    this.stickyManager.on('mapping:created', (data) => {
      this.emit('sticky:mapping-created', data);
    });
    
    this.stickyManager.on('mapping:expired', (data) => {
      this.emit('sticky:mapping-expired', data);
    });
  }

  /**
   * Get proxy for domain (uses sticky session if enabled)
   */
  getProxyForDomain(domain: string): ProxyConfig | null {
    const activeProxies = this.getAllProxies().filter(p => p.status === 'active');
    
    if (this.stickyManager) {
      return this.stickyManager.getProxyForDomain(domain, activeProxies);
    }
    
    return this.getNextProxy();
  }

  /**
   * Manually assign proxy to domain
   */
  setDomainProxy(domain: string, proxyId: string): void {
    if (this.stickyManager) {
      this.stickyManager.setMapping(domain, proxyId);
    }
  }
}
```

### Trade-offs Analysis

| Aspect | Pros | Cons |
|--------|------|------|
| **Consistent Hashing** | Deterministic, predictable | Less load distribution |
| **TTL-based Expiry** | Prevents stale mappings | May break long sessions |
| **Wildcard Patterns** | Flexible domain matching | Regex complexity |
| **DB Persistence** | Survives restarts | I/O overhead |
| **Memory Cache** | Fast lookups | Limited by RAM |

**Recommendation**: Use consistent hashing with 1-hour TTL and DB persistence for production use.


---

## 3. Time-Based Rotation

### Overview
Automatically rotate proxies at configurable intervals to prevent detection and distribute load evenly over time.

### Data Model

```typescript
// electron/core/proxy-engine/types.ts - Extensions

export interface TimeBasedRotationConfig {
  enabled: boolean;
  intervalMs: number;           // Rotation interval in milliseconds
  minInterval: number;          // Minimum interval (prevent abuse)
  maxInterval: number;          // Maximum interval
  jitterPercent: number;        // Random variance (0-100)
  rotateOnFailure: boolean;     // Immediate rotation on proxy failure
  pauseDuringActivity: boolean; // Don't rotate during active requests
  scheduleWindows?: TimeWindow[]; // Optional: only rotate during windows
}

export interface TimeWindow {
  startHour: number;  // 0-23
  endHour: number;    // 0-23
  daysOfWeek: number[]; // 0=Sunday, 6=Saturday
}

export interface RotationEvent {
  timestamp: Date;
  previousProxyId: string;
  newProxyId: string;
  reason: 'scheduled' | 'failure' | 'manual' | 'startup';
  tabsAffected: number;
}
```

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    TimeBasedRotationManager                      │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────────┐  ┌───────────────────┐                   │
│  │ RotationTimer     │  │ JitterCalculator  │                   │
│  │ (setInterval)     │  │ (randomize)       │                   │
│  └─────────┬─────────┘  └─────────┬─────────┘                   │
│            │                      │                              │
│            ▼                      ▼                              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              RotationOrchestrator                        │    │
│  │  - scheduleNextRotation()                                │    │
│  │  - executeRotation()                                     │    │
│  │  - pauseRotation() / resumeRotation()                    │    │
│  │  - getRotationHistory()                                  │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation

```typescript
// electron/core/proxy-engine/time/time-based-rotation.ts

import { EventEmitter } from 'events';
import type { ProxyConfig, TimeBasedRotationConfig, RotationEvent, TimeWindow } from '../types';

export class TimeBasedRotationManager extends EventEmitter {
  private config: TimeBasedRotationConfig;
  private timer?: NodeJS.Timeout;
  private isPaused: boolean = false;
  private currentProxyId?: string;
  private rotationHistory: RotationEvent[] = [];
  private lastRotation?: Date;
  private getActiveProxies: () => ProxyConfig[];
  private selectNextProxy: (proxies: ProxyConfig[], excludeId?: string) => ProxyConfig | null;

  constructor(
    config: TimeBasedRotationConfig,
    getActiveProxies: () => ProxyConfig[],
    selectNextProxy: (proxies: ProxyConfig[], excludeId?: string) => ProxyConfig | null
  ) {
    super();
    this.config = config;
    this.getActiveProxies = getActiveProxies;
    this.selectNextProxy = selectNextProxy;
  }

  /**
   * Start time-based rotation
   */
  start(): void {
    if (!this.config.enabled) return;
    
    console.log('[TimeRotation] Starting with interval:', this.config.intervalMs, 'ms');
    this.scheduleNextRotation();
    this.emit('rotation:started');
  }

  /**
   * Stop time-based rotation
   */
  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    this.emit('rotation:stopped');
  }

  /**
   * Pause rotation (e.g., during active requests)
   */
  pause(): void {
    this.isPaused = true;
    this.emit('rotation:paused');
  }

  /**
   * Resume rotation
   */
  resume(): void {
    this.isPaused = false;
    this.scheduleNextRotation();
    this.emit('rotation:resumed');
  }

  /**
   * Force immediate rotation
   */
  forceRotate(reason: RotationEvent['reason'] = 'manual'): ProxyConfig | null {
    return this.executeRotation(reason);
  }

  /**
   * Schedule next rotation with jitter
   */
  private scheduleNextRotation(): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }

    if (this.isPaused) return;

    const interval = this.calculateIntervalWithJitter();
    
    this.timer = setTimeout(() => {
      if (this.shouldRotateNow()) {
        this.executeRotation('scheduled');
      }
      this.scheduleNextRotation();
    }, interval);

    const nextRotation = new Date(Date.now() + interval);
    this.emit('rotation:scheduled', { nextRotation, interval });
  }

  /**
   * Calculate interval with random jitter
   */
  private calculateIntervalWithJitter(): number {
    const baseInterval = this.config.intervalMs;
    const jitterRange = (baseInterval * this.config.jitterPercent) / 100;
    const jitter = (Math.random() - 0.5) * 2 * jitterRange;
    
    let interval = baseInterval + jitter;
    
    // Clamp to min/max
    interval = Math.max(this.config.minInterval, interval);
    interval = Math.min(this.config.maxInterval, interval);
    
    return Math.round(interval);
  }

  /**
   * Check if rotation should happen now
   */
  private shouldRotateNow(): boolean {
    if (this.isPaused) return false;
    
    // Check schedule windows if configured
    if (this.config.scheduleWindows?.length) {
      return this.isWithinScheduleWindow();
    }
    
    return true;
  }

  /**
   * Check if current time is within any schedule window
   */
  private isWithinScheduleWindow(): boolean {
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();

    for (const window of this.config.scheduleWindows || []) {
      if (!window.daysOfWeek.includes(currentDay)) continue;
      
      if (window.startHour <= window.endHour) {
        // Normal window (e.g., 9-17)
        if (currentHour >= window.startHour && currentHour < window.endHour) {
          return true;
        }
      } else {
        // Overnight window (e.g., 22-6)
        if (currentHour >= window.startHour || currentHour < window.endHour) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Execute proxy rotation
   */
  private executeRotation(reason: RotationEvent['reason']): ProxyConfig | null {
    const proxies = this.getActiveProxies();
    if (proxies.length === 0) {
      console.warn('[TimeRotation] No active proxies available');
      return null;
    }

    const previousProxyId = this.currentProxyId;
    const newProxy = this.selectNextProxy(proxies, previousProxyId);
    
    if (!newProxy) {
      console.warn('[TimeRotation] Could not select new proxy');
      return null;
    }

    // Don't rotate to same proxy unless it's the only one
    if (newProxy.id === previousProxyId && proxies.length > 1) {
      // Try again excluding current
      const alternateProxy = this.selectNextProxy(
        proxies.filter(p => p.id !== previousProxyId)
      );
      if (alternateProxy) {
        return this.applyRotation(alternateProxy, previousProxyId, reason);
      }
    }

    return this.applyRotation(newProxy, previousProxyId, reason);
  }

  /**
   * Apply rotation and emit events
   */
  private applyRotation(
    newProxy: ProxyConfig, 
    previousProxyId: string | undefined,
    reason: RotationEvent['reason']
  ): ProxyConfig {
    this.currentProxyId = newProxy.id;
    this.lastRotation = new Date();

    const event: RotationEvent = {
      timestamp: this.lastRotation,
      previousProxyId: previousProxyId || 'none',
      newProxyId: newProxy.id,
      reason,
      tabsAffected: 0 // Will be set by caller
    };

    this.rotationHistory.push(event);
    
    // Keep history limited
    if (this.rotationHistory.length > 1000) {
      this.rotationHistory = this.rotationHistory.slice(-500);
    }

    this.emit('rotation:executed', event);
    console.log(`[TimeRotation] Rotated to proxy ${newProxy.name} (${reason})`);
    
    return newProxy;
  }

  /**
   * Handle proxy failure (trigger immediate rotation if configured)
   */
  onProxyFailure(proxyId: string): void {
    if (this.config.rotateOnFailure && this.currentProxyId === proxyId) {
      console.log('[TimeRotation] Proxy failed, rotating immediately');
      this.executeRotation('failure');
    }
  }

  /**
   * Get current proxy ID
   */
  getCurrentProxyId(): string | undefined {
    return this.currentProxyId;
  }

  /**
   * Get rotation history
   */
  getRotationHistory(): RotationEvent[] {
    return [...this.rotationHistory];
  }

  /**
   * Get time until next rotation
   */
  getTimeUntilNextRotation(): number | null {
    if (!this.lastRotation) return null;
    const elapsed = Date.now() - this.lastRotation.getTime();
    return Math.max(0, this.config.intervalMs - elapsed);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<TimeBasedRotationConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (this.timer) {
      this.stop();
      if (this.config.enabled) {
        this.start();
      }
    }
    
    this.emit('rotation:config-updated', this.config);
  }
}
```

### Integration with ProxyManager

```typescript
// Add to electron/core/proxy-engine/manager.ts

import { TimeBasedRotationManager } from './time/time-based-rotation';

export class ProxyManager extends EventEmitter {
  // ... existing fields ...
  private timeRotation?: TimeBasedRotationManager;

  /**
   * Initialize time-based rotation
   */
  initTimeBasedRotation(config: TimeBasedRotationConfig): void {
    this.timeRotation = new TimeBasedRotationManager(
      config,
      () => this.getAllProxies().filter(p => p.status === 'active'),
      (proxies, excludeId) => {
        const filtered = excludeId 
          ? proxies.filter(p => p.id !== excludeId)
          : proxies;
        return this.rotationStrategy.selectProxy(filtered);
      }
    );

    this.timeRotation.on('rotation:executed', (event) => {
      this.emit('time-rotation:executed', event);
      // Apply new proxy to all tabs without sticky session
    });

    this.timeRotation.start();
  }

  /**
   * Pause time rotation during critical operations
   */
  pauseTimeRotation(): void {
    this.timeRotation?.pause();
  }

  /**
   * Resume time rotation
   */
  resumeTimeRotation(): void {
    this.timeRotation?.resume();
  }
}
```

### Trade-offs Analysis

| Aspect | Pros | Cons |
|--------|------|------|
| **Fixed Interval** | Predictable, easy to understand | Detectable pattern |
| **Jitter** | Harder to detect | Less predictable for users |
| **Schedule Windows** | Control when rotation happens | More complex config |
| **Pause During Activity** | No mid-request changes | May delay rotation |

**Recommendation**: Use 5-15 minute intervals with 20% jitter for production.

---

## 4. Custom Rules Engine

### Overview
Enable users to define custom proxy selection logic using a flexible rules engine that evaluates conditions and executes actions.

### Data Model

```typescript
// electron/core/proxy-engine/rules/types.ts

export type RuleOperator = 
  | 'equals' | 'not_equals' 
  | 'contains' | 'not_contains'
  | 'starts_with' | 'ends_with'
  | 'matches_regex'
  | 'greater_than' | 'less_than'
  | 'in_list' | 'not_in_list';

export type RuleField = 
  | 'domain' | 'url' | 'path'
  | 'time_hour' | 'time_day'
  | 'proxy_country' | 'proxy_latency' | 'proxy_success_rate'
  | 'tab_id' | 'request_count'
  | 'custom_tag';

export type RuleAction = 
  | 'use_proxy' | 'use_proxy_group' | 'use_country'
  | 'exclude_proxy' | 'exclude_country'
  | 'rotate_immediately' | 'skip_rotation'
  | 'set_sticky' | 'clear_sticky'
  | 'log_event';

export interface RuleCondition {
  field: RuleField;
  operator: RuleOperator;
  value: string | number | string[];
  caseSensitive?: boolean;
}

export interface RuleActionConfig {
  action: RuleAction;
  params: Record<string, any>;
}

export interface ProxyRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  priority: number;           // Higher = evaluated first
  conditions: RuleCondition[];
  conditionLogic: 'AND' | 'OR';
  actions: RuleActionConfig[];
  stopOnMatch: boolean;       // Stop evaluating more rules if matched
  createdAt: Date;
  updatedAt: Date;
}

export interface RuleEvaluationContext {
  domain: string;
  url: string;
  path: string;
  tabId?: string;
  currentTime: Date;
  availableProxies: ProxyConfig[];
  currentProxy?: ProxyConfig;
  requestCount?: number;
  customTags?: Record<string, string>;
}

export interface RuleEvaluationResult {
  matched: boolean;
  rule?: ProxyRule;
  actions: RuleActionConfig[];
  selectedProxy?: ProxyConfig;
  logs: string[];
}
```

### Database Schema

```sql
-- Rules table
CREATE TABLE IF NOT EXISTS proxy_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  enabled INTEGER DEFAULT 1,
  priority INTEGER DEFAULT 0,
  conditions TEXT NOT NULL,      -- JSON array of conditions
  condition_logic TEXT DEFAULT 'AND',
  actions TEXT NOT NULL,         -- JSON array of actions
  stop_on_match INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_proxy_rules_enabled ON proxy_rules(enabled);
CREATE INDEX idx_proxy_rules_priority ON proxy_rules(priority DESC);

-- Rule execution logs
CREATE TABLE IF NOT EXISTS rule_execution_logs (
  id TEXT PRIMARY KEY,
  rule_id TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  context TEXT,                  -- JSON of evaluation context
  result TEXT,                   -- JSON of result
  FOREIGN KEY (rule_id) REFERENCES proxy_rules(id) ON DELETE CASCADE
);

CREATE INDEX idx_rule_logs_rule ON rule_execution_logs(rule_id);
CREATE INDEX idx_rule_logs_timestamp ON rule_execution_logs(timestamp DESC);
```

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        RulesEngine                                   │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │ RuleParser      │  │ ConditionEval   │  │ ActionExecutor  │     │
│  │ (JSON→Rule)     │  │ (evaluate)      │  │ (apply actions) │     │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘     │
│           │                    │                     │              │
│           ▼                    ▼                     ▼              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    RuleEvaluator                             │   │
│  │  - loadRules()                                               │   │
│  │  - evaluate(context): RuleEvaluationResult                   │   │
│  │  - validateRule(rule): ValidationResult                      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    RuleRepository (SQLite)                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Implementation

```typescript
// electron/core/proxy-engine/rules/rules-engine.ts

import { EventEmitter } from 'events';
import type { 
  ProxyRule, RuleCondition, RuleActionConfig, 
  RuleEvaluationContext, RuleEvaluationResult,
  ProxyConfig 
} from './types';
import { DatabaseManager } from '../../../database';

export class RulesEngine extends EventEmitter {
  private rules: ProxyRule[] = [];
  private db: DatabaseManager;

  constructor(db: DatabaseManager) {
    super();
    this.db = db;
    this.loadRules();
  }

  /**
   * Load rules from database
   */
  loadRules(): void {
    const rows = this.db.query<any>(
      'SELECT * FROM proxy_rules WHERE enabled = 1 ORDER BY priority DESC'
    );
    
    this.rules = rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      enabled: row.enabled === 1,
      priority: row.priority,
      conditions: JSON.parse(row.conditions),
      conditionLogic: row.condition_logic,
      actions: JSON.parse(row.actions),
      stopOnMatch: row.stop_on_match === 1,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }));

    console.log(`[RulesEngine] Loaded ${this.rules.length} rules`);
  }

  /**
   * Evaluate all rules against context
   */
  evaluate(context: RuleEvaluationContext): RuleEvaluationResult {
    const result: RuleEvaluationResult = {
      matched: false,
      actions: [],
      logs: []
    };

    for (const rule of this.rules) {
      const ruleMatched = this.evaluateRule(rule, context);
      
      if (ruleMatched) {
        result.matched = true;
        result.rule = rule;
        result.actions.push(...rule.actions);
        result.logs.push(`Rule "${rule.name}" matched`);
        
        // Execute actions and get selected proxy
        const actionResult = this.executeActions(rule.actions, context);
        if (actionResult.selectedProxy) {
          result.selectedProxy = actionResult.selectedProxy;
        }
        result.logs.push(...actionResult.logs);
        
        if (rule.stopOnMatch) {
          break;
        }
      }
    }

    this.emit('rules:evaluated', { context, result });
    return result;
  }

  /**
   * Evaluate a single rule
   */
  private evaluateRule(rule: ProxyRule, context: RuleEvaluationContext): boolean {
    const results = rule.conditions.map(cond => 
      this.evaluateCondition(cond, context)
    );

    if (rule.conditionLogic === 'AND') {
      return results.every(r => r);
    } else {
      return results.some(r => r);
    }
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(condition: RuleCondition, context: RuleEvaluationContext): boolean {
    const fieldValue = this.getFieldValue(condition.field, context);
    const compareValue = condition.value;

    switch (condition.operator) {
      case 'equals':
        return this.compareEquals(fieldValue, compareValue, condition.caseSensitive);
      
      case 'not_equals':
        return !this.compareEquals(fieldValue, compareValue, condition.caseSensitive);
      
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(compareValue).toLowerCase());
      
      case 'not_contains':
        return !String(fieldValue).toLowerCase().includes(String(compareValue).toLowerCase());
      
      case 'starts_with':
        return String(fieldValue).toLowerCase().startsWith(String(compareValue).toLowerCase());
      
      case 'ends_with':
        return String(fieldValue).toLowerCase().endsWith(String(compareValue).toLowerCase());
      
      case 'matches_regex':
        try {
          const regex = new RegExp(String(compareValue), condition.caseSensitive ? '' : 'i');
          return regex.test(String(fieldValue));
        } catch {
          return false;
        }
      
      case 'greater_than':
        return Number(fieldValue) > Number(compareValue);
      
      case 'less_than':
        return Number(fieldValue) < Number(compareValue);
      
      case 'in_list':
        const list = Array.isArray(compareValue) ? compareValue : [compareValue];
        return list.some(v => this.compareEquals(fieldValue, v, condition.caseSensitive));
      
      case 'not_in_list':
        const notList = Array.isArray(compareValue) ? compareValue : [compareValue];
        return !notList.some(v => this.compareEquals(fieldValue, v, condition.caseSensitive));
      
      default:
        return false;
    }
  }

  /**
   * Get field value from context
   */
  private getFieldValue(field: RuleCondition['field'], context: RuleEvaluationContext): any {
    switch (field) {
      case 'domain':
        return context.domain;
      case 'url':
        return context.url;
      case 'path':
        return context.path;
      case 'time_hour':
        return context.currentTime.getHours();
      case 'time_day':
        return context.currentTime.getDay();
      case 'proxy_country':
        return context.currentProxy?.geolocation?.country;
      case 'proxy_latency':
        return context.currentProxy?.latency;
      case 'proxy_success_rate':
        return context.currentProxy?.successRate;
      case 'tab_id':
        return context.tabId;
      case 'request_count':
        return context.requestCount;
      case 'custom_tag':
        return context.customTags;
      default:
        return undefined;
    }
  }

  /**
   * Execute rule actions
   */
  private executeActions(
    actions: RuleActionConfig[], 
    context: RuleEvaluationContext
  ): { selectedProxy?: ProxyConfig; logs: string[] } {
    const logs: string[] = [];
    let selectedProxy: ProxyConfig | undefined;

    for (const actionConfig of actions) {
      switch (actionConfig.action) {
        case 'use_proxy':
          const proxyId = actionConfig.params.proxyId;
          selectedProxy = context.availableProxies.find(p => p.id === proxyId);
          logs.push(`Action: Use specific proxy ${proxyId}`);
          break;

        case 'use_country':
          const country = actionConfig.params.country;
          selectedProxy = context.availableProxies.find(
            p => p.geolocation?.country === country
          );
          logs.push(`Action: Use proxy from ${country}`);
          break;

        case 'use_proxy_group':
          const tag = actionConfig.params.tag;
          const groupProxies = context.availableProxies.filter(
            p => p.tags?.includes(tag)
          );
          if (groupProxies.length > 0) {
            selectedProxy = groupProxies[Math.floor(Math.random() * groupProxies.length)];
          }
          logs.push(`Action: Use proxy from group "${tag}"`);
          break;

        case 'exclude_proxy':
          const excludeId = actionConfig.params.proxyId;
          const filtered = context.availableProxies.filter(p => p.id !== excludeId);
          if (filtered.length > 0) {
            selectedProxy = filtered[0];
          }
          logs.push(`Action: Exclude proxy ${excludeId}`);
          break;

        case 'exclude_country':
          const excludeCountry = actionConfig.params.country;
          const countryFiltered = context.availableProxies.filter(
            p => p.geolocation?.country !== excludeCountry
          );
          if (countryFiltered.length > 0) {
            selectedProxy = countryFiltered[0];
          }
          logs.push(`Action: Exclude country ${excludeCountry}`);
          break;

        case 'log_event':
          logs.push(`Log: ${actionConfig.params.message}`);
          this.emit('rules:log', {
            message: actionConfig.params.message,
            context,
            timestamp: new Date()
          });
          break;

        case 'rotate_immediately':
          logs.push('Action: Trigger immediate rotation');
          this.emit('rules:rotate-immediately');
          break;

        case 'skip_rotation':
          logs.push('Action: Skip rotation for this request');
          break;

        default:
          logs.push(`Unknown action: ${actionConfig.action}`);
      }
    }

    return { selectedProxy, logs };
  }

  private compareEquals(a: any, b: any, caseSensitive?: boolean): boolean {
    if (caseSensitive) {
      return String(a) === String(b);
    }
    return String(a).toLowerCase() === String(b).toLowerCase();
  }

  // CRUD Operations for Rules

  addRule(rule: Omit<ProxyRule, 'id' | 'createdAt' | 'updatedAt'>): ProxyRule {
    const newRule: ProxyRule = {
      ...rule,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.db.execute(`
      INSERT INTO proxy_rules (id, name, description, enabled, priority, conditions, condition_logic, actions, stop_on_match, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newRule.id, newRule.name, newRule.description,
      newRule.enabled ? 1 : 0, newRule.priority,
      JSON.stringify(newRule.conditions), newRule.conditionLogic,
      JSON.stringify(newRule.actions), newRule.stopOnMatch ? 1 : 0,
      newRule.createdAt, newRule.updatedAt
    ]);

    this.loadRules();
    this.emit('rules:added', newRule);
    return newRule;
  }

  updateRule(id: string, updates: Partial<ProxyRule>): ProxyRule | null {
    const existing = this.rules.find(r => r.id === id);
    if (!existing) return null;

    const updated = { ...existing, ...updates, updatedAt: new Date() };

    this.db.execute(`
      UPDATE proxy_rules SET
        name = ?, description = ?, enabled = ?, priority = ?,
        conditions = ?, condition_logic = ?, actions = ?,
        stop_on_match = ?, updated_at = ?
      WHERE id = ?
    `, [
      updated.name, updated.description, updated.enabled ? 1 : 0,
      updated.priority, JSON.stringify(updated.conditions),
      updated.conditionLogic, JSON.stringify(updated.actions),
      updated.stopOnMatch ? 1 : 0, updated.updatedAt, id
    ]);

    this.loadRules();
    this.emit('rules:updated', updated);
    return updated;
  }

  deleteRule(id: string): boolean {
    const result = this.db.execute('DELETE FROM proxy_rules WHERE id = ?', [id]);
    if (result.changes > 0) {
      this.loadRules();
      this.emit('rules:deleted', { id });
      return true;
    }
    return false;
  }

  getAllRules(): ProxyRule[] {
    return [...this.rules];
  }

  /**
   * Validate rule syntax
   */
  validateRule(rule: Partial<ProxyRule>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!rule.name?.trim()) {
      errors.push('Rule name is required');
    }

    if (!rule.conditions?.length) {
      errors.push('At least one condition is required');
    }

    if (!rule.actions?.length) {
      errors.push('At least one action is required');
    }

    // Validate conditions
    rule.conditions?.forEach((cond, i) => {
      if (!cond.field) errors.push(`Condition ${i + 1}: field is required`);
      if (!cond.operator) errors.push(`Condition ${i + 1}: operator is required`);
      if (cond.value === undefined) errors.push(`Condition ${i + 1}: value is required`);
    });

    return { valid: errors.length === 0, errors };
  }
}
```

### Example Rules

```typescript
// Example: Route banking sites through US proxies
const bankingRule: ProxyRule = {
  id: '1',
  name: 'Banking Sites - US Only',
  description: 'Use US proxies for banking domains',
  enabled: true,
  priority: 100,
  conditions: [
    {
      field: 'domain',
      operator: 'in_list',
      value: ['chase.com', 'bankofamerica.com', 'wellsfargo.com', 'citi.com']
    }
  ],
  conditionLogic: 'AND',
  actions: [
    { action: 'use_country', params: { country: 'US' } },
    { action: 'set_sticky', params: { ttl: 3600000 } }
  ],
  stopOnMatch: true,
  createdAt: new Date(),
  updatedAt: new Date()
};

// Example: Exclude slow proxies for video sites
const videoRule: ProxyRule = {
  id: '2',
  name: 'Video Sites - Fast Proxies Only',
  enabled: true,
  priority: 90,
  conditions: [
    {
      field: 'domain',
      operator: 'matches_regex',
      value: '(youtube|netflix|twitch|vimeo)\\.com$'
    },
    {
      field: 'proxy_latency',
      operator: 'greater_than',
      value: 200
    }
  ],
  conditionLogic: 'AND',
  actions: [
    { action: 'rotate_immediately', params: {} },
    { action: 'log_event', params: { message: 'Slow proxy for video site, rotating' } }
  ],
  stopOnMatch: false,
  createdAt: new Date(),
  updatedAt: new Date()
};

// Example: Night-time different region
const nightRule: ProxyRule = {
  id: '3',
  name: 'Night Mode - Asia Proxies',
  enabled: true,
  priority: 50,
  conditions: [
    { field: 'time_hour', operator: 'greater_than', value: 22 },
    { field: 'time_hour', operator: 'less_than', value: 6 }
  ],
  conditionLogic: 'OR',
  actions: [
    { action: 'use_country', params: { country: 'JP' } }
  ],
  stopOnMatch: false,
  createdAt: new Date(),
  updatedAt: new Date()
};
```

### Trade-offs Analysis

| Aspect | Pros | Cons |
|--------|------|------|
| **JSON Rules** | Flexible, user-editable | Complex for non-technical users |
| **Priority System** | Predictable evaluation order | Requires careful management |
| **Regex Support** | Powerful pattern matching | Performance cost, security risk |
| **Action Chaining** | Complex workflows | Harder to debug |
| **Stop on Match** | Efficient evaluation | May skip important rules |

**Recommendation**: Provide a visual rule builder UI with pre-built templates for common use cases.

---

## 5. Creator Support Module Architecture

### Overview
A comprehensive module for supporting content creators through automated ad viewing, platform detection, and support tracking while maintaining ethical guidelines and platform compliance.

### Data Model

```typescript
// electron/core/automation/creator-support/types.ts

export type SupportedPlatform = 'youtube' | 'twitch' | 'blog' | 'website' | 'podcast' | 'patreon';
export type SupportMethod = 'ad_view' | 'video_watch' | 'page_visit' | 'affiliate_click' | 'donation_link';
export type SupportSessionStatus = 'queued' | 'active' | 'completed' | 'failed' | 'paused';

export interface Creator {
  id: string;
  name: string;
  url: string;
  platform: SupportedPlatform;
  channelId?: string;           // Platform-specific ID
  thumbnailUrl?: string;
  description?: string;
  supportMethods: SupportMethod[];
  enabled: boolean;
  priority: number;             // Higher = supported more often
  
  // Settings
  minWatchTime?: number;        // Minimum seconds to watch
  maxDailySupports?: number;    // Limit daily support actions
  preferredTimeSlots?: TimeSlot[];
  
  // Statistics
  totalSupports: number;
  totalAdsViewed: number;
  totalWatchTime: number;       // Seconds
  lastSupported?: Date;
  
  // Metadata
  tags?: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimeSlot {
  startHour: number;
  endHour: number;
  daysOfWeek: number[];
}

export interface SupportSession {
  id: string;
  creatorId: string;
  status: SupportSessionStatus;
  supportMethod: SupportMethod;
  
  // Progress
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;            // Seconds
  
  // Results
  adsViewed: number;
  pagesVisited: number;
  watchTime: number;            // Seconds
  
  // Technical
  tabId?: string;
  proxyId?: string;
  error?: string;
  retryCount: number;
  
  createdAt: Date;
}

export interface SupportStatistics {
  totalCreators: number;
  activeCreators: number;
  totalSessions: number;
  totalAdsViewed: number;
  totalWatchTime: number;
  averageSessionDuration: number;
  successRate: number;
  supportsByPlatform: Record<SupportedPlatform, number>;
  supportsByMethod: Record<SupportMethod, number>;
  dailyStats: DailyStats[];
}

export interface DailyStats {
  date: string;
  sessionsCompleted: number;
  adsViewed: number;
  watchTime: number;
  creatorsSupported: number;
}

export interface PlatformConfig {
  platform: SupportedPlatform;
  urlPatterns: RegExp[];
  adSelectors: string[];
  videoSelectors: string[];
  skipButtonSelector?: string;
  adDurationSelector?: string;
  contentSelectors: string[];
  minAdViewTime: number;        // Seconds to count as "viewed"
  maxConcurrentTabs: number;
}
```

### Database Schema

```sql
-- Extend existing creators table
ALTER TABLE creators ADD COLUMN channel_id TEXT;
ALTER TABLE creators ADD COLUMN description TEXT;
ALTER TABLE creators ADD COLUMN min_watch_time INTEGER DEFAULT 30;
ALTER TABLE creators ADD COLUMN max_daily_supports INTEGER;
ALTER TABLE creators ADD COLUMN preferred_time_slots TEXT;  -- JSON
ALTER TABLE creators ADD COLUMN total_watch_time INTEGER DEFAULT 0;
ALTER TABLE creators ADD COLUMN tags TEXT;  -- JSON array
ALTER TABLE creators ADD COLUMN notes TEXT;

-- Support sessions table
CREATE TABLE IF NOT EXISTS support_sessions (
  id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'active', 'completed', 'failed', 'paused')),
  support_method TEXT NOT NULL,
  started_at DATETIME,
  completed_at DATETIME,
  duration INTEGER,
  ads_viewed INTEGER DEFAULT 0,
  pages_visited INTEGER DEFAULT 0,
  watch_time INTEGER DEFAULT 0,
  tab_id TEXT,
  proxy_id TEXT,
  error TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (creator_id) REFERENCES creators(id) ON DELETE CASCADE,
  FOREIGN KEY (proxy_id) REFERENCES proxies(id) ON DELETE SET NULL
);

CREATE INDEX idx_support_sessions_creator ON support_sessions(creator_id);
CREATE INDEX idx_support_sessions_status ON support_sessions(status);
CREATE INDEX idx_support_sessions_date ON support_sessions(created_at);

-- Daily statistics cache
CREATE TABLE IF NOT EXISTS support_daily_stats (
  date TEXT PRIMARY KEY,
  sessions_completed INTEGER DEFAULT 0,
  ads_viewed INTEGER DEFAULT 0,
  watch_time INTEGER DEFAULT 0,
  creators_supported INTEGER DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      CreatorSupportModule                                │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                     CreatorSupportManager                          │  │
│  │  - addCreator() / removeCreator()                                  │  │
│  │  - startSupportSession() / stopSession()                           │  │
│  │  - getStatistics()                                                 │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                │                                         │
│         ┌──────────────────────┼──────────────────────┐                 │
│         ▼                      ▼                      ▼                 │
│  ┌─────────────┐      ┌─────────────────┐     ┌─────────────────┐      │
│  │ Platform    │      │ AdDetection     │     │ Support         │      │
│  │ Detector    │      │ Engine          │     │ Scheduler       │      │
│  └─────────────┘      └─────────────────┘     └─────────────────┘      │
│         │                      │                      │                 │
│         ▼                      ▼                      ▼                 │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Platform Handlers                             │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │   │
│  │  │ YouTube  │ │ Twitch   │ │ Blog     │ │ Website  │           │   │
│  │  │ Handler  │ │ Handler  │ │ Handler  │ │ Handler  │           │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                │                                         │
│                                ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Support Tracker (SQLite)                      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Implementation

```typescript
// electron/core/automation/creator-support/creator-support-manager.ts

import { EventEmitter } from 'events';
import type { 
  Creator, SupportSession, SupportStatistics, 
  SupportedPlatform, SupportMethod 
} from './types';
import { PlatformDetector } from './platform-detector';
import { AdDetectionEngine } from './ad-detection-engine';
import { SupportScheduler } from './support-scheduler';
import { YouTubeHandler } from './handlers/youtube-handler';
import { TwitchHandler } from './handlers/twitch-handler';
import { GenericWebHandler } from './handlers/generic-web-handler';
import { DatabaseManager } from '../../../database';

export class CreatorSupportManager extends EventEmitter {
  private db: DatabaseManager;
  private creators: Map<string, Creator> = new Map();
  private sessions: Map<string, SupportSession> = new Map();
  private platformDetector: PlatformDetector;
  private adDetector: AdDetectionEngine;
  private scheduler: SupportScheduler;
  private handlers: Map<SupportedPlatform, any> = new Map();
  private isRunning: boolean = false;

  constructor(db: DatabaseManager) {
    super();
    this.db = db;
    this.platformDetector = new PlatformDetector();
    this.adDetector = new AdDetectionEngine();
    this.scheduler = new SupportScheduler(this);
    
    this.initializeHandlers();
    this.loadCreators();
  }

  private initializeHandlers(): void {
    this.handlers.set('youtube', new YouTubeHandler(this.adDetector));
    this.handlers.set('twitch', new TwitchHandler(this.adDetector));
    this.handlers.set('blog', new GenericWebHandler());
    this.handlers.set('website', new GenericWebHandler());
  }

  // ============ Creator Management ============

  async addCreator(url: string, options?: Partial<Creator>): Promise<Creator> {
    // Auto-detect platform
    const platform = this.platformDetector.detect(url);
    
    // Fetch creator metadata
    const metadata = await this.platformDetector.fetchMetadata(url, platform);
    
    const creator: Creator = {
      id: crypto.randomUUID(),
      name: metadata.name || options?.name || 'Unknown Creator',
      url,
      platform,
      channelId: metadata.channelId,
      thumbnailUrl: metadata.thumbnailUrl,
      description: metadata.description,
      supportMethods: this.getDefaultSupportMethods(platform),
      enabled: true,
      priority: options?.priority || 5,
      minWatchTime: options?.minWatchTime || 30,
      totalSupports: 0,
      totalAdsViewed: 0,
      totalWatchTime: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...options
    };

    // Save to database
    this.saveCreatorToDB(creator);
    this.creators.set(creator.id, creator);
    
    this.emit('creator:added', creator);
    return creator;
  }

  async removeCreator(id: string): Promise<boolean> {
    const creator = this.creators.get(id);
    if (!creator) return false;

    // Stop any active sessions
    this.stopSessionsForCreator(id);
    
    this.db.execute('DELETE FROM creators WHERE id = ?', [id]);
    this.creators.delete(id);
    
    this.emit('creator:removed', creator);
    return true;
  }

  updateCreator(id: string, updates: Partial<Creator>): Creator | null {
    const creator = this.creators.get(id);
    if (!creator) return null;

    const updated = { ...creator, ...updates, updatedAt: new Date() };
    this.creators.set(id, updated);
    this.updateCreatorInDB(updated);
    
    this.emit('creator:updated', updated);
    return updated;
  }

  getCreator(id: string): Creator | undefined {
    return this.creators.get(id);
  }

  getAllCreators(): Creator[] {
    return Array.from(this.creators.values());
  }

  getEnabledCreators(): Creator[] {
    return this.getAllCreators().filter(c => c.enabled);
  }

  // ============ Support Sessions ============

  async startSupportSession(
    creatorId: string, 
    method?: SupportMethod,
    tabManager?: any
  ): Promise<SupportSession> {
    const creator = this.creators.get(creatorId);
    if (!creator) {
      throw new Error('Creator not found');
    }

    if (!creator.enabled) {
      throw new Error('Creator is disabled');
    }

    // Check daily limit
    if (creator.maxDailySupports) {
      const todayCount = await this.getTodaySessionCount(creatorId);
      if (todayCount >= creator.maxDailySupports) {
        throw new Error('Daily support limit reached for this creator');
      }
    }

    const supportMethod = method || creator.supportMethods[0] || 'page_visit';
    
    const session: SupportSession = {
      id: crypto.randomUUID(),
      creatorId,
      status: 'queued',
      supportMethod,
      adsViewed: 0,
      pagesVisited: 0,
      watchTime: 0,
      retryCount: 0,
      createdAt: new Date()
    };

    this.sessions.set(session.id, session);
    this.saveSessionToDB(session);
    
    // Execute the support session
    this.executeSession(session, creator, tabManager);
    
    this.emit('session:started', session);
    return session;
  }

  private async executeSession(
    session: SupportSession, 
    creator: Creator,
    tabManager?: any
  ): Promise<void> {
    try {
      session.status = 'active';
      session.startedAt = new Date();
      this.updateSessionInDB(session);
      
      const handler = this.handlers.get(creator.platform);
      if (!handler) {
        throw new Error(`No handler for platform: ${creator.platform}`);
      }

      // Create tab for session
      const tab = tabManager ? await tabManager.createTab({
        url: creator.url,
        isolated: true
      }) : null;

      if (tab) {
        session.tabId = tab.id;
      }

      // Execute platform-specific support logic
      const result = await handler.executeSupport(creator, session, tab);
      
      // Update session with results
      session.adsViewed = result.adsViewed;
      session.pagesVisited = result.pagesVisited;
      session.watchTime = result.watchTime;
      session.status = 'completed';
      session.completedAt = new Date();
      session.duration = Math.floor(
        (session.completedAt.getTime() - session.startedAt!.getTime()) / 1000
      );

      // Update creator statistics
      this.updateCreatorStats(creator.id, result);
      
      // Update daily stats
      this.updateDailyStats(result);
      
      this.updateSessionInDB(session);
      this.emit('session:completed', session);

    } catch (error) {
      session.status = 'failed';
      session.error = error instanceof Error ? error.message : 'Unknown error';
      session.completedAt = new Date();
      
      this.updateSessionInDB(session);
      this.emit('session:failed', { session, error });
      
      // Retry logic
      if (session.retryCount < 3) {
        session.retryCount++;
        session.status = 'queued';
        setTimeout(() => this.executeSession(session, creator, tabManager), 5000);
      }
    }
  }

  stopSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || session.status === 'completed') return false;

    session.status = 'paused';
    session.completedAt = new Date();
    this.updateSessionInDB(session);
    
    this.emit('session:stopped', session);
    return true;
  }

  private stopSessionsForCreator(creatorId: string): void {
    for (const session of this.sessions.values()) {
      if (session.creatorId === creatorId && session.status === 'active') {
        this.stopSession(session.id);
      }
    }
  }

  // ============ Automated Support ============

  startAutomatedSupport(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.scheduler.start();
    this.emit('automation:started');
  }

  stopAutomatedSupport(): void {
    this.isRunning = false;
    this.scheduler.stop();
    this.emit('automation:stopped');
  }

  // ============ Statistics ============

  async getStatistics(): Promise<SupportStatistics> {
    const allCreators = this.getAllCreators();
    const sessions = this.db.query<any>('SELECT * FROM support_sessions');
    const dailyStats = this.db.query<any>(
      'SELECT * FROM support_daily_stats ORDER BY date DESC LIMIT 30'
    );

    const completedSessions = sessions.filter((s: any) => s.status === 'completed');
    
    return {
      totalCreators: allCreators.length,
      activeCreators: allCreators.filter(c => c.enabled).length,
      totalSessions: completedSessions.length,
      totalAdsViewed: completedSessions.reduce((sum: number, s: any) => sum + s.ads_viewed, 0),
      totalWatchTime: completedSessions.reduce((sum: number, s: any) => sum + s.watch_time, 0),
      averageSessionDuration: completedSessions.length > 0
        ? completedSessions.reduce((sum: number, s: any) => sum + (s.duration || 0), 0) / completedSessions.length
        : 0,
      successRate: sessions.length > 0
        ? (completedSessions.length / sessions.length) * 100
        : 0,
      supportsByPlatform: this.aggregateByPlatform(allCreators),
      supportsByMethod: this.aggregateByMethod(completedSessions),
      dailyStats: dailyStats.map((d: any) => ({
        date: d.date,
        sessionsCompleted: d.sessions_completed,
        adsViewed: d.ads_viewed,
        watchTime: d.watch_time,
        creatorsSupported: d.creators_supported
      }))
    };
  }

  // ============ Helper Methods ============

  private getDefaultSupportMethods(platform: SupportedPlatform): SupportMethod[] {
    switch (platform) {
      case 'youtube':
        return ['ad_view', 'video_watch'];
      case 'twitch':
        return ['ad_view', 'video_watch'];
      case 'blog':
        return ['page_visit', 'ad_view'];
      case 'website':
        return ['page_visit'];
      default:
        return ['page_visit'];
    }
  }

  private async getTodaySessionCount(creatorId: string): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    const result = this.db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM support_sessions 
       WHERE creator_id = ? AND date(created_at) = ?`,
      [creatorId, today]
    );
    return result?.count || 0;
  }

  private updateCreatorStats(creatorId: string, result: any): void {
    const creator = this.creators.get(creatorId);
    if (!creator) return;

    creator.totalSupports++;
    creator.totalAdsViewed += result.adsViewed;
    creator.totalWatchTime += result.watchTime;
    creator.lastSupported = new Date();
    creator.updatedAt = new Date();

    this.creators.set(creatorId, creator);
    this.updateCreatorInDB(creator);
  }

  private updateDailyStats(result: any): void {
    const today = new Date().toISOString().split('T')[0];
    this.db.execute(`
      INSERT INTO support_daily_stats (date, sessions_completed, ads_viewed, watch_time, creators_supported)
      VALUES (?, 1, ?, ?, 1)
      ON CONFLICT(date) DO UPDATE SET
        sessions_completed = sessions_completed + 1,
        ads_viewed = ads_viewed + ?,
        watch_time = watch_time + ?,
        updated_at = CURRENT_TIMESTAMP
    `, [today, result.adsViewed, result.watchTime, result.adsViewed, result.watchTime]);
  }

  private aggregateByPlatform(creators: Creator[]): Record<SupportedPlatform, number> {
    const result: Record<string, number> = {};
    for (const creator of creators) {
      result[creator.platform] = (result[creator.platform] || 0) + creator.totalSupports;
    }
    return result as Record<SupportedPlatform, number>;
  }

  private aggregateByMethod(sessions: any[]): Record<SupportMethod, number> {
    const result: Record<string, number> = {};
    for (const session of sessions) {
      result[session.support_method] = (result[session.support_method] || 0) + 1;
    }
    return result as Record<SupportMethod, number>;
  }

  // Database operations
  private loadCreators(): void {
    const rows = this.db.query<any>('SELECT * FROM creators');
    for (const row of rows) {
      const creator: Creator = {
        id: row.id,
        name: row.name,
        url: row.url,
        platform: row.platform,
        channelId: row.channel_id,
        thumbnailUrl: row.thumbnail_url,
        description: row.description,
        supportMethods: JSON.parse(row.support_methods || '[]'),
        enabled: row.enabled === 1,
        priority: row.priority,
        minWatchTime: row.min_watch_time,
        maxDailySupports: row.max_daily_supports,
        totalSupports: row.total_supports,
        totalAdsViewed: row.total_ads_viewed,
        totalWatchTime: row.total_watch_time || 0,
        lastSupported: row.last_supported ? new Date(row.last_supported) : undefined,
        tags: row.tags ? JSON.parse(row.tags) : [],
        notes: row.notes,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      };
      this.creators.set(creator.id, creator);
    }
  }

  private saveCreatorToDB(creator: Creator): void {
    this.db.execute(`
      INSERT INTO creators (
        id, name, url, platform, channel_id, thumbnail_url, description,
        support_methods, enabled, priority, min_watch_time, max_daily_supports,
        total_supports, total_ads_viewed, total_watch_time, tags, notes,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      creator.id, creator.name, creator.url, creator.platform,
      creator.channelId, creator.thumbnailUrl, creator.description,
      JSON.stringify(creator.supportMethods), creator.enabled ? 1 : 0,
      creator.priority, creator.minWatchTime, creator.maxDailySupports,
      creator.totalSupports, creator.totalAdsViewed, creator.totalWatchTime,
      JSON.stringify(creator.tags || []), creator.notes,
      creator.createdAt, creator.updatedAt
    ]);
  }

  private updateCreatorInDB(creator: Creator): void {
    this.db.execute(`
      UPDATE creators SET
        name = ?, enabled = ?, priority = ?, min_watch_time = ?,
        max_daily_supports = ?, total_supports = ?, total_ads_viewed = ?,
        total_watch_time = ?, last_supported = ?, tags = ?, notes = ?,
        updated_at = ?
      WHERE id = ?
    `, [
      creator.name, creator.enabled ? 1 : 0, creator.priority,
      creator.minWatchTime, creator.maxDailySupports, creator.totalSupports,
      creator.totalAdsViewed, creator.totalWatchTime, creator.lastSupported,
      JSON.stringify(creator.tags || []), creator.notes, creator.updatedAt,
      creator.id
    ]);
  }

  private saveSessionToDB(session: SupportSession): void {
    this.db.execute(`
      INSERT INTO support_sessions (
        id, creator_id, status, support_method, started_at, completed_at,
        duration, ads_viewed, pages_visited, watch_time, tab_id, proxy_id,
        error, retry_count, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      session.id, session.creatorId, session.status, session.supportMethod,
      session.startedAt, session.completedAt, session.duration,
      session.adsViewed, session.pagesVisited, session.watchTime,
      session.tabId, session.proxyId, session.error, session.retryCount,
      session.createdAt
    ]);
  }

  private updateSessionInDB(session: SupportSession): void {
    this.db.execute(`
      UPDATE support_sessions SET
        status = ?, started_at = ?, completed_at = ?, duration = ?,
        ads_viewed = ?, pages_visited = ?, watch_time = ?, tab_id = ?,
        proxy_id = ?, error = ?, retry_count = ?
      WHERE id = ?
    `, [
      session.status, session.startedAt, session.completedAt, session.duration,
      session.adsViewed, session.pagesVisited, session.watchTime,
      session.tabId, session.proxyId, session.error, session.retryCount,
      session.id
    ]);
  }
}
```

### Platform Detector Implementation

```typescript
// electron/core/automation/creator-support/platform-detector.ts

import type { SupportedPlatform } from './types';

interface PlatformMetadata {
  name: string;
  channelId?: string;
  thumbnailUrl?: string;
  description?: string;
}

export class PlatformDetector {
  private platformPatterns: Record<SupportedPlatform, RegExp[]> = {
    youtube: [
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/(?:channel\/|c\/|user\/|@)([^\/\?]+)/i,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&]+)/i,
      /(?:https?:\/\/)?youtu\.be\/([^\/\?]+)/i
    ],
    twitch: [
      /(?:https?:\/\/)?(?:www\.)?twitch\.tv\/([^\/\?]+)/i
    ],
    patreon: [
      /(?:https?:\/\/)?(?:www\.)?patreon\.com\/([^\/\?]+)/i
    ],
    podcast: [
      /(?:https?:\/\/)?(?:www\.)?(?:podcasts\.apple\.com|spotify\.com\/show|anchor\.fm)/i
    ],
    blog: [
      /(?:https?:\/\/)?(?:www\.)?(?:medium\.com|substack\.com|wordpress\.com)/i,
      /(?:https?:\/\/)?[^\/]+\/blog/i
    ],
    website: [
      /.*/  // Fallback - matches any URL
    ]
  };

  /**
   * Detect platform from URL
   */
  detect(url: string): SupportedPlatform {
    for (const [platform, patterns] of Object.entries(this.platformPatterns)) {
      if (platform === 'website') continue; // Skip fallback
      
      for (const pattern of patterns) {
        if (pattern.test(url)) {
          return platform as SupportedPlatform;
        }
      }
    }
    
    return 'website'; // Default fallback
  }

  /**
   * Extract channel/creator ID from URL
   */
  extractChannelId(url: string, platform: SupportedPlatform): string | null {
    const patterns = this.platformPatterns[platform];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  }

  /**
   * Fetch creator metadata from platform
   */
  async fetchMetadata(url: string, platform: SupportedPlatform): Promise<PlatformMetadata> {
    try {
      switch (platform) {
        case 'youtube':
          return await this.fetchYouTubeMetadata(url);
        case 'twitch':
          return await this.fetchTwitchMetadata(url);
        default:
          return await this.fetchGenericMetadata(url);
      }
    } catch (error) {
      console.error('[PlatformDetector] Failed to fetch metadata:', error);
      return { name: 'Unknown Creator' };
    }
  }

  private async fetchYouTubeMetadata(url: string): Promise<PlatformMetadata> {
    // Use oEmbed for basic metadata (no API key required)
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    
    try {
      const response = await fetch(oembedUrl);
      const data = await response.json();
      
      return {
        name: data.author_name,
        channelId: this.extractChannelId(url, 'youtube') || undefined,
        thumbnailUrl: data.thumbnail_url,
        description: data.title
      };
    } catch {
      return { name: 'YouTube Creator' };
    }
  }

  private async fetchTwitchMetadata(url: string): Promise<PlatformMetadata> {
    const channelName = this.extractChannelId(url, 'twitch');
    return {
      name: channelName || 'Twitch Streamer',
      channelId: channelName || undefined
    };
  }

  private async fetchGenericMetadata(url: string): Promise<PlatformMetadata> {
    // Extract domain as fallback name
    try {
      const parsed = new URL(url);
      return {
        name: parsed.hostname.replace('www.', '')
      };
    } catch {
      return { name: 'Unknown Creator' };
    }
  }
}
```

### Ad Detection Engine

```typescript
// electron/core/automation/creator-support/ad-detection-engine.ts

import { BrowserView } from 'electron';
import type { SupportedPlatform, PlatformConfig } from './types';

export class AdDetectionEngine {
  private platformConfigs: Map<SupportedPlatform, PlatformConfig> = new Map();

  constructor() {
    this.initializePlatformConfigs();
  }

  private initializePlatformConfigs(): void {
    // YouTube configuration
    this.platformConfigs.set('youtube', {
      platform: 'youtube',
      urlPatterns: [/youtube\.com/, /youtu\.be/],
      adSelectors: [
        '.ytp-ad-player-overlay',
        '.ytp-ad-text',
        '.video-ads',
        '.ytp-ad-preview-container',
        '[class*="ad-showing"]'
      ],
      videoSelectors: [
        'video.html5-main-video',
        '#movie_player video'
      ],
      skipButtonSelector: '.ytp-ad-skip-button, .ytp-ad-skip-button-modern',
      adDurationSelector: '.ytp-ad-duration-remaining',
      contentSelectors: ['#content', '#primary'],
      minAdViewTime: 5,
      maxConcurrentTabs: 3
    });

    // Twitch configuration
    this.platformConfigs.set('twitch', {
      platform: 'twitch',
      urlPatterns: [/twitch\.tv/],
      adSelectors: [
        '[data-a-target="video-ad-label"]',
        '.video-player__ad-banner',
        '[class*="ad-banner"]'
      ],
      videoSelectors: ['video'],
      contentSelectors: ['.channel-root'],
      minAdViewTime: 5,
      maxConcurrentTabs: 2
    });

    // Generic blog/website
    this.platformConfigs.set('blog', {
      platform: 'blog',
      urlPatterns: [/.*/],
      adSelectors: [
        '[class*="ad-"]',
        '[id*="ad-"]',
        'iframe[src*="ads"]',
        '[data-ad]',
        '.advertisement'
      ],
      videoSelectors: ['video', 'iframe[src*="youtube"]'],
      contentSelectors: ['article', 'main', '.content', '#content'],
      minAdViewTime: 3,
      maxConcurrentTabs: 5
    });
  }

  /**
   * Detect if ads are currently showing
   */
  async detectAds(view: BrowserView, platform: SupportedPlatform): Promise<{
    hasAds: boolean;
    adType: 'video' | 'display' | 'none';
    canSkip: boolean;
    remainingTime?: number;
  }> {
    const config = this.platformConfigs.get(platform);
    if (!config) {
      return { hasAds: false, adType: 'none', canSkip: false };
    }

    try {
      const result = await view.webContents.executeJavaScript(`
        (function() {
          const adSelectors = ${JSON.stringify(config.adSelectors)};
          const skipSelector = ${JSON.stringify(config.skipButtonSelector || '')};
          const durationSelector = ${JSON.stringify(config.adDurationSelector || '')};
          
          let hasAds = false;
          let adType = 'none';
          let canSkip = false;
          let remainingTime = null;
          
          // Check for ad elements
          for (const selector of adSelectors) {
            const el = document.querySelector(selector);
            if (el && el.offsetParent !== null) {
              hasAds = true;
              
              // Determine ad type
              const video = document.querySelector('video');
              if (video && !video.paused) {
                adType = 'video';
              } else {
                adType = 'display';
              }
              break;
            }
          }
          
          // Check for skip button
          if (skipSelector) {
            const skipBtn = document.querySelector(skipSelector);
            canSkip = skipBtn && skipBtn.offsetParent !== null;
          }
          
          // Get remaining time
          if (durationSelector) {
            const durationEl = document.querySelector(durationSelector);
            if (durationEl) {
              const text = durationEl.textContent;
              const match = text.match(/(\\d+):(\\d+)/);
              if (match) {
                remainingTime = parseInt(match[1]) * 60 + parseInt(match[2]);
              }
            }
          }
          
          return { hasAds, adType, canSkip, remainingTime };
        })();
      `);

      return result;
    } catch (error) {
      console.error('[AdDetection] Error detecting ads:', error);
      return { hasAds: false, adType: 'none', canSkip: false };
    }
  }

  /**
   * Wait for ad to complete (don't skip)
   */
  async waitForAdCompletion(
    view: BrowserView, 
    platform: SupportedPlatform,
    maxWaitTime: number = 300 // 5 minutes max
  ): Promise<{ watched: boolean; duration: number }> {
    const startTime = Date.now();
    let totalWatchTime = 0;

    while (true) {
      const adStatus = await this.detectAds(view, platform);
      
      if (!adStatus.hasAds) {
        return { watched: true, duration: totalWatchTime };
      }

      // Check timeout
      const elapsed = (Date.now() - startTime) / 1000;
      if (elapsed >= maxWaitTime) {
        return { watched: false, duration: totalWatchTime };
      }

      // Don't skip - just wait
      await this.delay(1000);
      totalWatchTime++;
    }
  }

  /**
   * Simulate natural ad viewing behavior
   */
  async simulateAdViewing(view: BrowserView): Promise<void> {
    // Random mouse movements within ad area
    await view.webContents.executeJavaScript(`
      (function() {
        // Simulate focus on ad
        const adElements = document.querySelectorAll('[class*="ad"]');
        if (adElements.length > 0) {
          const ad = adElements[0];
          ad.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      })();
    `);

    // Random delay to simulate viewing
    await this.delay(2000 + Math.random() * 3000);
  }

  getConfig(platform: SupportedPlatform): PlatformConfig | undefined {
    return this.platformConfigs.get(platform);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### YouTube Handler Example

```typescript
// electron/core/automation/creator-support/handlers/youtube-handler.ts

import { BrowserView } from 'electron';
import type { Creator, SupportSession } from '../types';
import { AdDetectionEngine } from '../ad-detection-engine';

interface SupportResult {
  adsViewed: number;
  pagesVisited: number;
  watchTime: number;
}

export class YouTubeHandler {
  private adDetector: AdDetectionEngine;

  constructor(adDetector: AdDetectionEngine) {
    this.adDetector = adDetector;
  }

  async executeSupport(
    creator: Creator, 
    session: SupportSession,
    tab: any
  ): Promise<SupportResult> {
    const result: SupportResult = {
      adsViewed: 0,
      pagesVisited: 1,
      watchTime: 0
    };

    if (!tab?.view) {
      throw new Error('No tab available');
    }

    const view = tab.view as BrowserView;
    const minWatchTime = creator.minWatchTime || 30;

    try {
      // Navigate to creator's channel or video
      await view.webContents.loadURL(creator.url);
      await this.waitForLoad(view);

      // If channel page, click on a video
      if (creator.url.includes('/channel/') || creator.url.includes('/@')) {
        await this.clickFirstVideo(view);
        await this.waitForLoad(view);
      }

      // Watch for ads and content
      const startTime = Date.now();
      
      while ((Date.now() - startTime) / 1000 < minWatchTime) {
        // Check for ads
        const adStatus = await this.adDetector.detectAds(view, 'youtube');
        
        if (adStatus.hasAds && adStatus.adType === 'video') {
          // Watch the ad without skipping
          const adResult = await this.adDetector.waitForAdCompletion(view, 'youtube', 120);
          if (adResult.watched) {
            result.adsViewed++;
            result.watchTime += adResult.duration;
          }
        } else {
          // Simulate watching content
          await this.simulateWatching(view);
          result.watchTime += 5;
        }

        await this.delay(5000);
      }

      return result;

    } catch (error) {
      console.error('[YouTubeHandler] Error:', error);
      throw error;
    }
  }

  private async clickFirstVideo(view: BrowserView): Promise<void> {
    await view.webContents.executeJavaScript(`
      (function() {
        const videoLinks = document.querySelectorAll('a#video-title-link, a#video-title');
        if (videoLinks.length > 0) {
          videoLinks[0].click();
          return true;
        }
        return false;
      })();
    `);
  }

  private async simulateWatching(view: BrowserView): Promise<void> {
    // Random scroll
    await view.webContents.executeJavaScript(`
      window.scrollBy({
        top: Math.floor(Math.random() * 100) - 50,
        behavior: 'smooth'
      });
    `);
  }

  private waitForLoad(view: BrowserView): Promise<void> {
    return new Promise((resolve) => {
      if (view.webContents.isLoading()) {
        view.webContents.once('did-finish-load', () => resolve());
      } else {
        resolve();
      }
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Trade-offs Analysis

| Aspect | Pros | Cons |
|--------|------|------|
| **Platform-specific handlers** | Accurate detection, optimal support | Maintenance burden per platform |
| **Generic fallback** | Works with any site | Less effective support |
| **Ad waiting (no skip)** | Maximum creator revenue | Longer session times |
| **Daily limits** | Prevents abuse/detection | May frustrate power users |
| **Session tracking** | Comprehensive statistics | Storage overhead |

### Ethical Considerations

1. **Platform Terms of Service**: Ensure compliance with each platform's ToS
2. **Rate Limiting**: Implement reasonable limits to avoid abuse
3. **Human-like Behavior**: Use realistic timing and interactions
4. **Transparency**: Be clear about what the module does
5. **User Control**: Allow users to set limits and preferences

**Recommendation**: Implement with conservative defaults (max 10 supports/day per creator, 30-second minimum watch time) and provide clear documentation on ethical usage.

---

## 6. Integration Summary & Implementation Roadmap

### Complete File Structure

```
electron/core/proxy-engine/
├── manager.ts                    # Modified - add new strategy integrations
├── rotation.ts                   # Modified - add geographic, time-based cases
├── validator.ts                  # Existing
├── types.ts                      # Modified - add new type definitions
├── geo/
│   ├── index.ts                  # Barrel export
│   ├── geo-ip-service.ts         # NEW - IP geolocation service
│   ├── geo-filter.ts             # NEW - Geographic filtering
│   └── geo-rotation.ts           # NEW - Geographic rotation strategy
├── sticky/
│   ├── index.ts                  # Barrel export
│   └── sticky-session-manager.ts # NEW - Domain-proxy mapping
├── time/
│   ├── index.ts                  # Barrel export
│   └── time-based-rotation.ts    # NEW - Interval-based rotation
└── rules/
    ├── index.ts                  # Barrel export
    ├── types.ts                  # NEW - Rule type definitions
    └── rules-engine.ts           # NEW - Custom rules engine

electron/core/automation/
├── manager.ts                    # Existing
├── executor.ts                   # Existing
├── scheduler.ts                  # Existing
├── search-engine.ts              # Existing
├── types.ts                      # Modified - add creator support types
└── creator-support/
    ├── index.ts                  # Barrel export
    ├── types.ts                  # NEW - Creator support types
    ├── creator-support-manager.ts # NEW - Main manager
    ├── platform-detector.ts      # NEW - Platform detection
    ├── ad-detection-engine.ts    # NEW - Ad detection
    ├── support-scheduler.ts      # NEW - Support scheduling
    └── handlers/
        ├── index.ts              # Barrel export
        ├── youtube-handler.ts    # NEW - YouTube-specific
        ├── twitch-handler.ts     # NEW - Twitch-specific
        └── generic-web-handler.ts # NEW - Generic fallback
```

### Database Migrations

```sql
-- migrations/001_geo_support.sql
ALTER TABLE proxies ADD COLUMN geo_country TEXT;
ALTER TABLE proxies ADD COLUMN geo_country_name TEXT;
ALTER TABLE proxies ADD COLUMN geo_region TEXT;
ALTER TABLE proxies ADD COLUMN geo_city TEXT;
ALTER TABLE proxies ADD COLUMN geo_latitude REAL;
ALTER TABLE proxies ADD COLUMN geo_longitude REAL;
ALTER TABLE proxies ADD COLUMN geo_timezone TEXT;
ALTER TABLE proxies ADD COLUMN geo_isp TEXT;
ALTER TABLE proxies ADD COLUMN geo_asn TEXT;
ALTER TABLE proxies ADD COLUMN geo_verified INTEGER DEFAULT 0;
ALTER TABLE proxies ADD COLUMN geo_last_checked DATETIME;

CREATE INDEX IF NOT EXISTS idx_proxies_geo_country ON proxies(geo_country);

-- migrations/002_sticky_sessions.sql
CREATE TABLE IF NOT EXISTS domain_proxy_mappings (
  id TEXT PRIMARY KEY,
  domain TEXT NOT NULL,
  proxy_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_used DATETIME DEFAULT CURRENT_TIMESTAMP,
  request_count INTEGER DEFAULT 0,
  ttl INTEGER,
  is_wildcard INTEGER DEFAULT 0,
  priority INTEGER DEFAULT 0,
  FOREIGN KEY (proxy_id) REFERENCES proxies(id) ON DELETE CASCADE,
  UNIQUE(domain)
);

-- migrations/003_rules_engine.sql
CREATE TABLE IF NOT EXISTS proxy_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  enabled INTEGER DEFAULT 1,
  priority INTEGER DEFAULT 0,
  conditions TEXT NOT NULL,
  condition_logic TEXT DEFAULT 'AND',
  actions TEXT NOT NULL,
  stop_on_match INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- migrations/004_creator_support.sql
CREATE TABLE IF NOT EXISTS support_sessions (
  id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL,
  status TEXT NOT NULL,
  support_method TEXT NOT NULL,
  started_at DATETIME,
  completed_at DATETIME,
  duration INTEGER,
  ads_viewed INTEGER DEFAULT 0,
  pages_visited INTEGER DEFAULT 0,
  watch_time INTEGER DEFAULT 0,
  tab_id TEXT,
  proxy_id TEXT,
  error TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (creator_id) REFERENCES creators(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS support_daily_stats (
  date TEXT PRIMARY KEY,
  sessions_completed INTEGER DEFAULT 0,
  ads_viewed INTEGER DEFAULT 0,
  watch_time INTEGER DEFAULT 0,
  creators_supported INTEGER DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### IPC Channel Extensions

```typescript
// electron/ipc/channels.ts - Add new channels

export const ProxyChannels = {
  // Existing...
  SET_GEO_ROTATION: 'proxy:set-geo-rotation',
  GET_PROXY_FOR_DOMAIN: 'proxy:get-for-domain',
  SET_DOMAIN_PROXY: 'proxy:set-domain-proxy',
  GET_DOMAIN_MAPPINGS: 'proxy:get-domain-mappings',
  SET_TIME_ROTATION: 'proxy:set-time-rotation',
  PAUSE_TIME_ROTATION: 'proxy:pause-time-rotation',
  RESUME_TIME_ROTATION: 'proxy:resume-time-rotation',
};

export const RulesChannels = {
  ADD_RULE: 'rules:add',
  UPDATE_RULE: 'rules:update',
  DELETE_RULE: 'rules:delete',
  GET_ALL_RULES: 'rules:get-all',
  EVALUATE_RULES: 'rules:evaluate',
  VALIDATE_RULE: 'rules:validate',
};

export const CreatorSupportChannels = {
  ADD_CREATOR: 'creator:add',
  REMOVE_CREATOR: 'creator:remove',
  UPDATE_CREATOR: 'creator:update',
  GET_ALL_CREATORS: 'creator:get-all',
  START_SUPPORT_SESSION: 'creator:start-session',
  STOP_SUPPORT_SESSION: 'creator:stop-session',
  START_AUTOMATED_SUPPORT: 'creator:start-automation',
  STOP_AUTOMATED_SUPPORT: 'creator:stop-automation',
  GET_SUPPORT_STATISTICS: 'creator:get-stats',
};
```

### Zustand Store Extensions

```typescript
// src/stores/proxyStore.ts - Extend with new state

interface ProxyState {
  // Existing...
  
  // Geographic Rotation
  geoPreferences: string[];
  setGeoPreferences: (countries: string[]) => Promise<void>;
  
  // Sticky Sessions
  domainMappings: DomainProxyMapping[];
  loadDomainMappings: () => Promise<void>;
  setDomainProxy: (domain: string, proxyId: string) => Promise<void>;
  removeDomainMapping: (domain: string) => Promise<void>;
  
  // Time-based Rotation
  timeRotationConfig: TimeBasedRotationConfig | null;
  setTimeRotation: (config: TimeBasedRotationConfig) => Promise<void>;
  pauseTimeRotation: () => Promise<void>;
  resumeTimeRotation: () => Promise<void>;
  
  // Rules
  rules: ProxyRule[];
  loadRules: () => Promise<void>;
  addRule: (rule: Omit<ProxyRule, 'id'>) => Promise<void>;
  updateRule: (id: string, updates: Partial<ProxyRule>) => Promise<void>;
  deleteRule: (id: string) => Promise<void>;
}

// src/stores/creatorStore.ts - NEW store

interface CreatorState {
  creators: Creator[];
  activeSessions: SupportSession[];
  statistics: SupportStatistics | null;
  isAutomationRunning: boolean;
  
  // Actions
  loadCreators: () => Promise<void>;
  addCreator: (url: string, options?: Partial<Creator>) => Promise<void>;
  removeCreator: (id: string) => Promise<void>;
  updateCreator: (id: string, updates: Partial<Creator>) => Promise<void>;
  startSupportSession: (creatorId: string, method?: SupportMethod) => Promise<void>;
  stopSupportSession: (sessionId: string) => Promise<void>;
  startAutomation: () => Promise<void>;
  stopAutomation: () => Promise<void>;
  loadStatistics: () => Promise<void>;
}
```

### Implementation Roadmap

| Phase | Duration | Features | Priority |
|-------|----------|----------|----------|
| **Phase 1** | 1 week | Geographic Rotation + GeoIP Service | P0 |
| **Phase 2** | 1 week | Sticky-Session Strategy | P0 |
| **Phase 3** | 1 week | Time-Based Rotation | P1 |
| **Phase 4** | 2 weeks | Custom Rules Engine + UI | P1 |
| **Phase 5** | 2 weeks | Creator Support Module | P2 |
| **Phase 6** | 1 week | Integration Testing + Polish | P0 |

### Phase 1: Geographic Rotation (Week 1)
- [ ] Implement `GeoIPService` with IP-API integration
- [ ] Add geolocation fields to proxy schema
- [ ] Implement `GeographicRotationStrategy`
- [ ] Add geo verification during proxy validation
- [ ] Create UI for geo preferences
- [ ] Write unit tests

### Phase 2: Sticky Sessions (Week 2)
- [ ] Create `domain_proxy_mappings` table
- [ ] Implement `StickySessionManager`
- [ ] Add consistent hashing algorithm
- [ ] Implement TTL-based expiry
- [ ] Create UI for viewing/managing mappings
- [ ] Write integration tests

### Phase 3: Time-Based Rotation (Week 3)
- [ ] Implement `TimeBasedRotationManager`
- [ ] Add jitter calculation
- [ ] Implement schedule windows
- [ ] Create rotation history tracking
- [ ] Add UI controls for time rotation
- [ ] Write unit tests

### Phase 4: Rules Engine (Weeks 4-5)
- [ ] Create rules database schema
- [ ] Implement `RulesEngine` core
- [ ] Add all condition operators
- [ ] Implement all action types
- [ ] Create visual rule builder UI
- [ ] Add rule templates
- [ ] Write comprehensive tests

### Phase 5: Creator Support (Weeks 6-7)
- [ ] Extend creators table schema
- [ ] Implement `CreatorSupportManager`
- [ ] Create `PlatformDetector`
- [ ] Implement `AdDetectionEngine`
- [ ] Build YouTube handler
- [ ] Build Twitch handler
- [ ] Build generic handler
- [ ] Create support statistics dashboard
- [ ] Add scheduling system
- [ ] Write E2E tests

### Phase 6: Integration (Week 8)
- [ ] End-to-end integration testing
- [ ] Performance optimization
- [ ] Documentation updates
- [ ] Bug fixes and polish

---

## 7. Key Architectural Decisions Summary

### ADR-001: Use Consistent Hashing for Sticky Sessions
**Decision**: Implement consistent hashing (djb2) for deterministic domain-to-proxy mapping.
**Rationale**: Ensures same domain always maps to same proxy while maintaining even distribution.
**Consequences**: Predictable behavior, but may need re-mapping if proxy pool changes.

### ADR-002: JSON-Based Rules Storage
**Decision**: Store rules as JSON in SQLite rather than normalized tables.
**Rationale**: Flexible schema allows easy addition of new condition/action types.
**Consequences**: Faster development, but requires careful validation and migration handling.

### ADR-003: Platform-Specific Handlers for Creator Support
**Decision**: Implement separate handler classes per platform (YouTube, Twitch, etc.).
**Rationale**: Each platform has unique DOM structure and ad mechanisms.
**Consequences**: Better accuracy but higher maintenance cost per platform.

### ADR-004: Event-Driven Architecture for Rotation
**Decision**: Use EventEmitter pattern for all rotation strategies.
**Rationale**: Loose coupling allows easy composition of strategies.
**Consequences**: Flexible integration but requires careful event documentation.

### ADR-005: Memory + SQLite Hybrid for Performance
**Decision**: Cache active data in memory, persist to SQLite for durability.
**Rationale**: Fast reads for hot paths, durability for configuration and history.
**Consequences**: Need to handle cache invalidation and startup loading.

---

## 8. Testing Strategy

### Unit Tests
- GeoIPService: Mock API responses, test caching
- StickySessionManager: Test mapping CRUD, TTL expiry, wildcard matching
- TimeBasedRotationManager: Test interval calculation, jitter, schedule windows
- RulesEngine: Test all operators, action execution, priority ordering
- CreatorSupportManager: Test session lifecycle, statistics aggregation

### Integration Tests
- Full rotation flow with multiple strategies
- Rules engine with proxy selection
- Creator support with mock tabs

### E2E Tests
- Complete workflow: Add creator → Start support → Verify statistics
- Proxy rotation under load
- Rules triggering correct proxy selection

---

*Document Version: 1.0*
*Last Updated: 2025-01-28*
*Author: Architecture Review*

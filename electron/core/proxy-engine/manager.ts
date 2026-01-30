/**
 * Proxy Manager
 * Core proxy management logic with security hardening
 * 
 * SECURITY FEATURES:
 * - Encrypted credential storage (AES-256-GCM)
 * - SSRF prevention (blocks localhost, private IPs)
 * - Input validation for all proxy configurations
 * - Secure credential handling (credentials cleared after encryption)
 * - Rate limiting support for proxy operations
 */

import { EventEmitter } from 'events';
import type { ProxyConfig, RotationConfig, ProxyValidationResult, ProxyInput } from './types';
import { ProxyValidator, ProxyValidationError, type SSRFConfig } from './validator';
import { ProxyRotationStrategy } from './rotation';
import { CredentialStore, type EncryptedCredential } from './credential-store';
import { CircuitBreakerRegistry, getCircuitBreakerRegistry, type CircuitBreaker } from '../resilience';

/**
 * Configuration options for ProxyManager
 */
export interface ProxyManagerConfig {
  /** Master key for credential encryption (hex string or Buffer) */
  masterKey: string | Buffer;
  /** SSRF prevention configuration */
  ssrfConfig?: SSRFConfig;
  /** Maximum number of proxies allowed in pool */
  maxProxies?: number;
  /** Enable automatic proxy validation on add */
  autoValidate?: boolean;
  /** Enable circuit breaker for proxy connections */
  enableCircuitBreaker?: boolean;
  /** Custom circuit breaker registry (uses global if not provided) */
  circuitBreakerRegistry?: CircuitBreakerRegistry;
}

/**
 * Secure result object that strips sensitive data
 */
export interface SafeProxyConfig extends Omit<ProxyConfig, 'username' | 'password' | 'encryptedCredentials'> {
  /** Whether credentials are configured (without exposing them) */
  hasCredentials: boolean;
}

export class ProxyManager extends EventEmitter {
  private proxies: Map<string, ProxyConfig> = new Map();
  private validator: ProxyValidator;
  private rotationStrategy: ProxyRotationStrategy;
  private credentialStore: CredentialStore;
  // Reserved for future use - tracks the currently active proxy
  // @ts-expect-error Reserved for future implementation
  private _activeProxy: string | null = null;
  private readonly maxProxies: number;
  private readonly autoValidate: boolean;
  private readonly enableCircuitBreaker: boolean;
  private circuitBreakerRegistry: CircuitBreakerRegistry | null = null;

  /**
   * Create a new ProxyManager instance
   * 
   * @param config - Configuration including master key for encryption
   * @throws Error if master key is invalid
   */
  constructor(config: ProxyManagerConfig) {
    super();

    // Initialize credential store with master key
    this.credentialStore = new CredentialStore(config.masterKey);

    // Initialize validator with SSRF config and credential store
    this.validator = new ProxyValidator(config.ssrfConfig, this.credentialStore);

    this.rotationStrategy = new ProxyRotationStrategy();
    this.maxProxies = config.maxProxies ?? 100;
    this.autoValidate = config.autoValidate ?? true;
    this.enableCircuitBreaker = config.enableCircuitBreaker ?? true;
    
    // Initialize circuit breaker registry
    if (this.enableCircuitBreaker) {
      this.circuitBreakerRegistry = config.circuitBreakerRegistry ?? getCircuitBreakerRegistry();
      
      // Forward circuit breaker events
      this.circuitBreakerRegistry.on('open', (event) => {
        this.emit('proxy:circuit-open', event);
      });
      this.circuitBreakerRegistry.on('close', (event) => {
        this.emit('proxy:circuit-close', event);
      });
    }
  }

  /**
   * Generate a new master key for credential encryption
   * Store this securely (e.g., OS keychain, HSM)
   */
  static generateMasterKey(): string {
    return CredentialStore.generateMasterKey();
  }

  /**
   * Add a new proxy to the pool with security validation
   * 
   * @param input - Proxy configuration input
   * @returns Created proxy config (with credentials encrypted)
   * @throws ProxyValidationError if validation fails
   */
  async addProxy(input: ProxyInput): Promise<SafeProxyConfig> {
    // Check pool capacity
    if (this.proxies.size >= this.maxProxies) {
      throw new ProxyValidationError(
        `Maximum proxy limit reached (${this.maxProxies})`,
        'MAX_PROXIES_EXCEEDED'
      );
    }

    // Validate input (including SSRF checks)
    await this.validator.validateInput(input);

    // Generate unique ID
    const id = crypto.randomUUID();

    // Encrypt credentials if provided
    let encryptedCredentials: EncryptedCredential | undefined;
    const requiresAuth = !!(input.username && input.password);

    if (requiresAuth) {
      encryptedCredentials = this.credentialStore.encrypt(
        input.username!,
        input.password!
      );
    }

    // Create proxy config (without plain text credentials)
    const proxy: ProxyConfig = {
      id,
      name: this.sanitizeName(input.name),
      host: input.host.trim().toLowerCase(),
      port: input.port,
      protocol: input.protocol.toLowerCase() as ProxyConfig['protocol'],
      encryptedCredentials,
      requiresAuth,
      status: 'checking',
      failureCount: 0,
      totalRequests: 0,
      successRate: 0,
      region: input.region,
      tags: input.tags?.map(t => this.sanitizeTag(t)),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Store proxy (credentials are encrypted)
    this.proxies.set(id, proxy);
    
    // Emit event with safe proxy data (no credentials)
    const safeProxy = this.toSafeProxy(proxy);
    this.emit('proxy:added', safeProxy);

    // Validate proxy in background if enabled
    if (this.autoValidate) {
      this.validateProxy(id).catch(error => {
        this.emit('proxy:validation-error', { id, error: error.message });
      });
    }

    return safeProxy;
  }

  /**
   * Remove a proxy from the pool
   * Securely clears any stored credentials
   */
  removeProxy(id: string): boolean {
    // Validate ID format
    if (!this.isValidUUID(id)) {
      return false;
    }

    const proxy = this.proxies.get(id);
    if (!proxy) return false;

    // Clear encrypted credentials from memory
    if (proxy.encryptedCredentials) {
      // Overwrite sensitive data
      proxy.encryptedCredentials.encryptedData = '';
      proxy.encryptedCredentials.iv = '';
      proxy.encryptedCredentials.authTag = '';
      proxy.encryptedCredentials.salt = '';
    }

    this.proxies.delete(id);
    this.emit('proxy:removed', { id, name: proxy.name });
    return true;
  }

  /**
   * Get the next proxy based on rotation strategy
   * Returns safe proxy data without credentials
   */
  getNextProxy(): SafeProxyConfig | null {
    const activeProxies = Array.from(this.proxies.values()).filter(
      p => p.status === 'active'
    );

    if (activeProxies.length === 0) return null;

    const selected = this.rotationStrategy.selectProxy(activeProxies);
    return selected ? this.toSafeProxy(selected) : null;
  }

  /**
   * Get proxy for internal use (includes encrypted credentials)
   * Use with caution - only for actual proxy connections
   */
  getProxyForConnection(id: string): ProxyConfig | null {
    if (!this.isValidUUID(id)) {
      return null;
    }

    const proxy = this.proxies.get(id);
    if (!proxy || proxy.status !== 'active') {
      return null;
    }

    return proxy;
  }

  /**
   * Validate a proxy
   */
  async validateProxy(id: string): Promise<ProxyValidationResult> {
    // Validate ID format
    if (!this.isValidUUID(id)) {
      throw new ProxyValidationError('Invalid proxy ID format', 'INVALID_ID');
    }

    const proxy = this.proxies.get(id);
    if (!proxy) {
      throw new ProxyValidationError(`Proxy ${id} not found`, 'PROXY_NOT_FOUND');
    }

    const result = await this.validator.validate(proxy);

    // Update proxy status
    proxy.status = result.success ? 'active' : 'failed';
    proxy.latency = result.latency;
    proxy.lastChecked = result.timestamp;
    proxy.updatedAt = new Date();

    if (!result.success) {
      proxy.failureCount++;
    }

    this.proxies.set(id, proxy);
    this.emit('proxy:validated', { 
      proxy: this.toSafeProxy(proxy), 
      result 
    });

    return result;
  }

  /**
   * Set rotation strategy
   */
  setRotationStrategy(config: RotationConfig): void {
    this.rotationStrategy.setConfig(config);
    this.emit('rotation:configured', config);
  }

  /**
   * Get all proxies (safe format without credentials)
   */
  getAllProxies(): SafeProxyConfig[] {
    return Array.from(this.proxies.values()).map(p => this.toSafeProxy(p));
  }

  /**
   * Get proxy by ID (safe format without credentials)
   */
  getProxy(id: string): SafeProxyConfig | undefined {
    if (!this.isValidUUID(id)) {
      return undefined;
    }

    const proxy = this.proxies.get(id);
    return proxy ? this.toSafeProxy(proxy) : undefined;
  }

  /**
   * Update proxy statistics
   */
  updateStats(id: string, success: boolean, duration?: number): void {
    if (!this.isValidUUID(id)) {
      return;
    }

    const proxy = this.proxies.get(id);
    if (!proxy) return;

    proxy.totalRequests++;
    if (!success) {
      proxy.failureCount++;
    }
    proxy.successRate = ((proxy.totalRequests - proxy.failureCount) / proxy.totalRequests) * 100;
    proxy.updatedAt = new Date();

    this.proxies.set(id, proxy);
    this.emit('proxy:stats-updated', this.toSafeProxy(proxy));
    
    // Update circuit breaker
    if (this.enableCircuitBreaker && this.circuitBreakerRegistry) {
      const cb = this.circuitBreakerRegistry.getForProxy(id, proxy.name);
      if (success) {
        cb.recordSuccess(duration);
      } else {
        cb.recordFailure();
      }
    }
  }

  /**
   * Check if proxy circuit breaker allows requests
   */
  isProxyCircuitOpen(id: string): boolean {
    if (!this.enableCircuitBreaker || !this.circuitBreakerRegistry) {
      return false;
    }
    
    if (!this.isValidUUID(id)) {
      return false;
    }
    
    const cb = this.circuitBreakerRegistry.get(`proxy-${id}`);
    return cb ? cb.getState() === 'OPEN' : false;
  }

  /**
   * Get circuit breaker for a proxy
   */
  getProxyCircuitBreaker(id: string): CircuitBreaker | null {
    if (!this.enableCircuitBreaker || !this.circuitBreakerRegistry) {
      return null;
    }
    
    if (!this.isValidUUID(id)) {
      return null;
    }
    
    const proxy = this.proxies.get(id);
    if (!proxy) return null;
    
    return this.circuitBreakerRegistry.getForProxy(id, proxy.name);
  }

  /**
   * Execute a function with circuit breaker protection for a proxy
   */
  async executeWithCircuitBreaker<T>(
    proxyId: string,
    fn: () => Promise<T>,
    fallback?: () => T
  ): Promise<T> {
    const cb = this.getProxyCircuitBreaker(proxyId);
    
    if (!cb) {
      // Circuit breaker disabled, execute directly
      return fn();
    }
    
    return cb.execute(fn, { fallback });
  }

  /**
   * Get all proxies with their circuit breaker states
   */
  getAllProxiesWithCircuitState(): Array<SafeProxyConfig & { circuitState?: string }> {
    return this.getAllProxies().map(proxy => {
      if (!this.enableCircuitBreaker || !this.circuitBreakerRegistry) {
        return proxy;
      }
      
      const cb = this.circuitBreakerRegistry.get(`proxy-${proxy.id}`);
      return {
        ...proxy,
        circuitState: cb?.getState()
      };
    });
  }

  /**
   * Reset circuit breaker for a proxy
   */
  resetProxyCircuitBreaker(id: string): boolean {
    if (!this.enableCircuitBreaker || !this.circuitBreakerRegistry) {
      return false;
    }
    
    const cb = this.circuitBreakerRegistry.get(`proxy-${id}`);
    if (cb) {
      cb.reset();
      return true;
    }
    return false;
  }

  /**
   * Reset all proxy circuit breakers
   */
  resetAllProxyCircuitBreakers(): void {
    if (this.enableCircuitBreaker && this.circuitBreakerRegistry) {
      this.circuitBreakerRegistry.resetByServiceType('proxy');
    }
  }

  /**
   * Decrypt credentials for a proxy (use only when making actual connections)
   * 
   * @param id - Proxy ID
   * @returns Decrypted credentials or null if not available
   */
  getDecryptedCredentials(id: string): { username: string; password: string } | null {
    if (!this.isValidUUID(id)) {
      return null;
    }

    const proxy = this.proxies.get(id);
    if (!proxy || !proxy.encryptedCredentials) {
      return null;
    }

    try {
      return this.credentialStore.decrypt(proxy.encryptedCredentials);
    } catch (error) {
      this.emit('proxy:credential-error', { id, error: 'Failed to decrypt credentials' });
      return null;
    }
  }

  /**
   * Securely destroy the manager
   * Clears all sensitive data from memory
   */
  destroy(): void {
    // Clear all proxy credentials
    const proxies = Array.from(this.proxies.values());
    for (const proxy of proxies) {
      if (proxy.encryptedCredentials) {
        proxy.encryptedCredentials.encryptedData = '';
        proxy.encryptedCredentials.iv = '';
        proxy.encryptedCredentials.authTag = '';
        proxy.encryptedCredentials.salt = '';
      }
    }
    this.proxies.clear();

    // Destroy credential store (clears master key)
    this.credentialStore.destroy();

    this.emit('manager:destroyed');
    this.removeAllListeners();
  }

  /**
   * Convert proxy to safe format (strips credentials)
   */
  private toSafeProxy(proxy: ProxyConfig): SafeProxyConfig {
    const { username, password, encryptedCredentials, ...safe } = proxy;
    return {
      ...safe,
      hasCredentials: !!encryptedCredentials || !!(username && password)
    };
  }

  /**
   * Validate UUID format
   */
  private isValidUUID(id: string): boolean {
    if (typeof id !== 'string') return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }

  /**
   * Sanitize proxy name (prevent injection)
   */
  private sanitizeName(name: string): string {
    return name
      .trim()
      .slice(0, 100) // Limit length
      .replace(/[<>'"&\\]/g, ''); // Remove potentially dangerous chars
  }

  /**
   * Sanitize tag (prevent injection)
   */
  private sanitizeTag(tag: string): string {
    return tag
      .trim()
      .toLowerCase()
      .slice(0, 50)
      .replace(/[^a-z0-9-_]/g, '');
  }
}

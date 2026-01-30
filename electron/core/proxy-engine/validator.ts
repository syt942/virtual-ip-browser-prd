/**
 * Proxy Validator
 * Validates proxy connectivity, performance, and security
 * 
 * SECURITY FEATURES:
 * - SSRF prevention (blocks localhost, private IPs, link-local addresses)
 * - Input validation for host, port, and protocol
 * - URL-encoded credentials to prevent injection
 * - DNS rebinding protection
 */

import type { ProxyConfig, ProxyValidationResult, ProxyInput } from './types';
import { buildSecureProxyUrl, CredentialStore } from './credential-store';
// DecryptedCredentials type is inferred from CredentialStore.decrypt()
import * as net from 'net';
import * as dns from 'dns';
import { promisify } from 'util';
import {
  PROXY_VALIDATION_TIMEOUT_MS,
  DEFAULT_LATENCY_TEST_ATTEMPTS,
  MIN_LATENCY_TEST_ATTEMPTS,
  MAX_LATENCY_TEST_ATTEMPTS,
  MAX_HOSTNAME_LENGTH,
  MAX_CREDENTIAL_LENGTH,
  MIN_PORT,
  MAX_PORT
} from '../automation/constants';

const dnsLookup = promisify(dns.lookup);

/**
 * Validation error with detailed information
 */
export class ProxyValidationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly field?: string
  ) {
    super(message);
    this.name = 'ProxyValidationError';
  }
}

/**
 * SSRF prevention configuration
 */
export interface SSRFConfig {
  /** Block localhost addresses (127.x.x.x, ::1) */
  blockLocalhost: boolean;
  /** Block private IP ranges (10.x, 172.16-31.x, 192.168.x) */
  blockPrivateIPs: boolean;
  /** Block link-local addresses (169.254.x.x, fe80::) */
  blockLinkLocal: boolean;
  /** Block multicast addresses */
  blockMulticast: boolean;
  /** Additional blocked CIDR ranges */
  additionalBlockedRanges?: string[];
  /** Explicitly allowed hosts (bypass SSRF checks) */
  allowedHosts?: string[];
}

const DEFAULT_SSRF_CONFIG: SSRFConfig = {
  blockLocalhost: true,
  blockPrivateIPs: true,
  blockLinkLocal: true,
  blockMulticast: true
};

export class ProxyValidator {
  private readonly testUrls = [
    'https://www.google.com',
    'https://api.ipify.org?format=json',
    'https://httpbin.org/ip'
  ];

  private ssrfConfig: SSRFConfig;
  private credentialStore?: CredentialStore;

  constructor(ssrfConfig: SSRFConfig = DEFAULT_SSRF_CONFIG, credentialStore?: CredentialStore) {
    this.ssrfConfig = ssrfConfig;
    this.credentialStore = credentialStore;
  }

  /**
   * Set the credential store for decrypting proxy credentials
   */
  setCredentialStore(store: CredentialStore): void {
    this.credentialStore = store;
  }

  /**
   * Validate proxy input before adding to the pool
   * Performs security checks including SSRF prevention
   */
  async validateInput(input: ProxyInput): Promise<void> {
    // Validate required fields
    if (!input.name || typeof input.name !== 'string') {
      throw new ProxyValidationError('Proxy name is required', 'INVALID_NAME', 'name');
    }

    if (!input.host || typeof input.host !== 'string') {
      throw new ProxyValidationError('Proxy host is required', 'INVALID_HOST', 'host');
    }

    // Validate host format
    this.validateHostFormat(input.host);

    // Validate port
    this.validatePort(input.port);

    // Validate protocol
    this.validateProtocol(input.protocol);

    // SSRF prevention - check if host is safe
    await this.validateHostSecurity(input.host);

    // Validate credentials if provided
    if (input.username !== undefined || input.password !== undefined) {
      this.validateCredentials(input.username, input.password);
    }
  }

  /**
   * Validate host format (prevent injection attacks)
   */
  private validateHostFormat(host: string): void {
    // Trim and check for empty
    const trimmedHost = host.trim();
    if (trimmedHost.length === 0) {
      throw new ProxyValidationError('Host cannot be empty', 'EMPTY_HOST', 'host');
    }

    // Maximum length check (RFC 1123)
    if (trimmedHost.length > MAX_HOSTNAME_LENGTH) {
      throw new ProxyValidationError(`Host exceeds maximum length (${MAX_HOSTNAME_LENGTH} characters)`, 'HOST_TOO_LONG', 'host');
    }

    // Check for dangerous characters that could enable injection
    const dangerousChars = /[\s\r\n\t\0<>'"\\`${}|;&]/;
    if (dangerousChars.test(trimmedHost)) {
      throw new ProxyValidationError(
        'Host contains invalid characters',
        'INVALID_HOST_CHARS',
        'host'
      );
    }

    // Check for URL scheme injection
    if (trimmedHost.includes('://')) {
      throw new ProxyValidationError(
        'Host should not contain URL scheme',
        'HOST_HAS_SCHEME',
        'host'
      );
    }

    // Check for userinfo injection (@)
    if (trimmedHost.includes('@')) {
      throw new ProxyValidationError(
        'Host should not contain @ character',
        'HOST_HAS_USERINFO',
        'host'
      );
    }

    // Validate as IP address or hostname
    if (net.isIP(trimmedHost)) {
      // Valid IP address
      return;
    }

    // Validate hostname format (RFC 1123)
    const hostnameRegex = /^(?!-)[a-zA-Z0-9-]{1,63}(?<!-)(\.[a-zA-Z0-9-]{1,63})*$/;
    if (!hostnameRegex.test(trimmedHost)) {
      throw new ProxyValidationError(
        'Invalid hostname format',
        'INVALID_HOSTNAME_FORMAT',
        'host'
      );
    }
  }

  /**
   * Validate port number
   */
  private validatePort(port: unknown): void {
    if (typeof port !== 'number' || !Number.isInteger(port)) {
      throw new ProxyValidationError('Port must be an integer', 'INVALID_PORT_TYPE', 'port');
    }

    if (port < MIN_PORT || port > MAX_PORT) {
      throw new ProxyValidationError(
        `Port must be between ${MIN_PORT} and ${MAX_PORT}`,
        'PORT_OUT_OF_RANGE',
        'port'
      );
    }
  }

  /**
   * Validate proxy protocol
   */
  private validateProtocol(protocol: unknown): void {
    const validProtocols = ['http', 'https', 'socks4', 'socks5'];
    if (typeof protocol !== 'string' || !validProtocols.includes(protocol.toLowerCase())) {
      throw new ProxyValidationError(
        `Invalid protocol. Must be one of: ${validProtocols.join(', ')}`,
        'INVALID_PROTOCOL',
        'protocol'
      );
    }
  }

  /**
   * Validate credentials format
   */
  private validateCredentials(username?: string, password?: string): void {
    if (username !== undefined && typeof username !== 'string') {
      throw new ProxyValidationError('Username must be a string', 'INVALID_USERNAME_TYPE', 'username');
    }

    if (password !== undefined && typeof password !== 'string') {
      throw new ProxyValidationError('Password must be a string', 'INVALID_PASSWORD_TYPE', 'password');
    }

    // Check for excessively long credentials (potential DoS)
    if (username && username.length > MAX_CREDENTIAL_LENGTH) {
      throw new ProxyValidationError('Username exceeds maximum length', 'USERNAME_TOO_LONG', 'username');
    }

    if (password && password.length > MAX_CREDENTIAL_LENGTH) {
      throw new ProxyValidationError('Password exceeds maximum length', 'PASSWORD_TOO_LONG', 'password');
    }
  }

  /**
   * SSRF Prevention: Validate that the host is not a private/internal address
   */
  async validateHostSecurity(host: string): Promise<void> {
    // Check if host is explicitly allowed
    if (this.ssrfConfig.allowedHosts?.includes(host.toLowerCase())) {
      return;
    }

    // Check if it's an IP address
    if (net.isIP(host)) {
      this.validateIPAddress(host);
      return;
    }

    // For hostnames, resolve to IP and validate
    // This also prevents DNS rebinding attacks by checking the resolved IP
    try {
      const result = await dnsLookup(host);
      this.validateIPAddress(result.address);
    } catch (error) {
      throw new ProxyValidationError(
        `Failed to resolve hostname: ${host}`,
        'DNS_RESOLUTION_FAILED',
        'host'
      );
    }
  }

  /**
   * Validate that an IP address is not internal/private
   */
  private validateIPAddress(ip: string): void {
    const ipVersion = net.isIP(ip);
    
    if (ipVersion === 0) {
      throw new ProxyValidationError('Invalid IP address', 'INVALID_IP', 'host');
    }

    if (ipVersion === 4) {
      this.validateIPv4(ip);
    } else {
      this.validateIPv6(ip);
    }
  }

  /**
   * Validate IPv4 address against SSRF blocklist
   */
  private validateIPv4(ip: string): void {
    const parts = ip.split('.').map(Number);

    // Localhost (127.0.0.0/8)
    if (this.ssrfConfig.blockLocalhost && parts[0] === 127) {
      throw new ProxyValidationError(
        'Localhost addresses are not allowed (SSRF prevention)',
        'SSRF_LOCALHOST',
        'host'
      );
    }

    // Private IP ranges
    if (this.ssrfConfig.blockPrivateIPs) {
      // 10.0.0.0/8
      if (parts[0] === 10) {
        throw new ProxyValidationError(
          'Private IP addresses are not allowed (SSRF prevention)',
          'SSRF_PRIVATE_IP',
          'host'
        );
      }

      // 172.16.0.0/12
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) {
        throw new ProxyValidationError(
          'Private IP addresses are not allowed (SSRF prevention)',
          'SSRF_PRIVATE_IP',
          'host'
        );
      }

      // 192.168.0.0/16
      if (parts[0] === 192 && parts[1] === 168) {
        throw new ProxyValidationError(
          'Private IP addresses are not allowed (SSRF prevention)',
          'SSRF_PRIVATE_IP',
          'host'
        );
      }
    }

    // Link-local (169.254.0.0/16)
    if (this.ssrfConfig.blockLinkLocal && parts[0] === 169 && parts[1] === 254) {
      throw new ProxyValidationError(
        'Link-local addresses are not allowed (SSRF prevention)',
        'SSRF_LINK_LOCAL',
        'host'
      );
    }

    // Multicast (224.0.0.0/4)
    if (this.ssrfConfig.blockMulticast && parts[0] >= 224 && parts[0] <= 239) {
      throw new ProxyValidationError(
        'Multicast addresses are not allowed (SSRF prevention)',
        'SSRF_MULTICAST',
        'host'
      );
    }

    // 0.0.0.0
    if (parts[0] === 0) {
      throw new ProxyValidationError(
        'Invalid IP address (0.x.x.x)',
        'SSRF_INVALID_IP',
        'host'
      );
    }

    // Broadcast (255.255.255.255)
    if (parts.every(p => p === 255)) {
      throw new ProxyValidationError(
        'Broadcast addresses are not allowed',
        'SSRF_BROADCAST',
        'host'
      );
    }
  }

  /**
   * Validate IPv6 address against SSRF blocklist
   */
  private validateIPv6(ip: string): void {
    const normalizedIp = ip.toLowerCase();

    // Localhost (::1)
    if (this.ssrfConfig.blockLocalhost) {
      if (normalizedIp === '::1' || normalizedIp === '0:0:0:0:0:0:0:1') {
        throw new ProxyValidationError(
          'Localhost addresses are not allowed (SSRF prevention)',
          'SSRF_LOCALHOST',
          'host'
        );
      }
    }

    // Link-local (fe80::/10)
    if (this.ssrfConfig.blockLinkLocal && normalizedIp.startsWith('fe80')) {
      throw new ProxyValidationError(
        'Link-local addresses are not allowed (SSRF prevention)',
        'SSRF_LINK_LOCAL',
        'host'
      );
    }

    // Multicast (ff00::/8)
    if (this.ssrfConfig.blockMulticast && normalizedIp.startsWith('ff')) {
      throw new ProxyValidationError(
        'Multicast addresses are not allowed (SSRF prevention)',
        'SSRF_MULTICAST',
        'host'
      );
    }

    // Private/Unique local (fc00::/7, fd00::/8)
    if (this.ssrfConfig.blockPrivateIPs) {
      if (normalizedIp.startsWith('fc') || normalizedIp.startsWith('fd')) {
        throw new ProxyValidationError(
          'Private IP addresses are not allowed (SSRF prevention)',
          'SSRF_PRIVATE_IP',
          'host'
        );
      }
    }

    // Unspecified address (::)
    if (normalizedIp === '::' || normalizedIp === '0:0:0:0:0:0:0:0') {
      throw new ProxyValidationError(
        'Unspecified address is not allowed',
        'SSRF_INVALID_IP',
        'host'
      );
    }

    // IPv4-mapped IPv6 addresses (::ffff:x.x.x.x) - validate the IPv4 part
    if (normalizedIp.includes('::ffff:')) {
      const ipv4Part = normalizedIp.split('::ffff:')[1];
      if (ipv4Part && net.isIPv4(ipv4Part)) {
        this.validateIPv4(ipv4Part);
      }
    }
  }

  /**
   * Validate a proxy by attempting connection
   */
  async validate(proxy: ProxyConfig): Promise<ProxyValidationResult> {
    const startTime = Date.now();

    try {
      // Re-validate host security before connecting (DNS rebinding protection)
      await this.validateHostSecurity(proxy.host);

      const proxyUrl = await this.buildProxyUrl(proxy);
      
      // Test connection with timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), PROXY_VALIDATION_TIMEOUT_MS);

      const response = await fetch(this.testUrls[0], {
        signal: controller.signal,
        // @ts-ignore - Electron supports proxy in fetch
        proxy: proxyUrl
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const latency = Date.now() - startTime;

      return {
        success: true,
        latency,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  /**
   * Build secure proxy URL from config with URL-encoded credentials
   */
  private async buildProxyUrl(proxy: ProxyConfig): Promise<string> {
    let username: string | undefined;
    let password: string | undefined;

    // Try to get credentials from encrypted storage first
    if (proxy.encryptedCredentials && this.credentialStore) {
      try {
        const decrypted = this.credentialStore.decrypt(proxy.encryptedCredentials);
        username = decrypted.username;
        password = decrypted.password;
      } catch (error) {
        // Log error but don't expose details
        console.error('Failed to decrypt proxy credentials');
        throw new Error('Failed to decrypt proxy credentials');
      }
    } else if (proxy.username && proxy.password) {
      // Fallback to plain text credentials (deprecated)
      username = proxy.username;
      password = proxy.password;
    }

    // Use secure URL builder with proper encoding
    return buildSecureProxyUrl(
      proxy.protocol,
      proxy.host,
      proxy.port,
      username,
      password
    );
  }

  /**
   * Test proxy latency
   */
  async testLatency(proxy: ProxyConfig, attempts: number = DEFAULT_LATENCY_TEST_ATTEMPTS): Promise<number> {
    // Validate attempts parameter
    if (typeof attempts !== 'number' || attempts < MIN_LATENCY_TEST_ATTEMPTS || attempts > MAX_LATENCY_TEST_ATTEMPTS) {
      attempts = DEFAULT_LATENCY_TEST_ATTEMPTS;
    }

    const latencies: number[] = [];

    for (let i = 0; i < attempts; i++) {
      const result = await this.validate(proxy);
      if (result.success && result.latency) {
        latencies.push(result.latency);
      }
    }

    if (latencies.length === 0) {
      throw new Error('All latency tests failed');
    }

    // Return average latency
    return latencies.reduce((a, b) => a + b, 0) / latencies.length;
  }
}

/**
 * Proxy Validator
 * Validates proxy connectivity, performance, and security
 * 
 * SECURITY FEATURES:
 * - SSRF prevention (blocks localhost, private IPs, link-local addresses)
 * - Input validation for host, port, and protocol
 * - URL-encoded credentials to prevent injection
 * - DNS rebinding protection
 * - TLS certificate validation for secure proxy connections (MEDIUM-001)
 */

import type { ProxyConfig, ProxyValidationResult, ProxyInput } from './types';
import { buildSecureProxyUrl, CredentialStore } from './credential-store';
// DecryptedCredentials type is inferred from CredentialStore.decrypt()
import * as net from 'net';
import * as dns from 'dns';
import * as tls from 'tls';
import * as crypto from 'crypto';
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

/**
 * TLS Certificate validation configuration (MEDIUM-001)
 */
export interface TLSValidationConfig {
  /** Enable TLS certificate validation (default: true) */
  enabled: boolean;
  /** Allow self-signed certificates (only for development) */
  allowSelfSigned: boolean;
  /** Minimum TLS version to accept */
  minTLSVersion: 'TLSv1.2' | 'TLSv1.3';
  /** Certificate pinning: map of hostname to expected certificate fingerprints (SHA-256) */
  pinnedCertificates: Map<string, string[]>;
  /** Connection timeout for TLS validation (ms) */
  timeout: number;
  /** Reject expired certificates */
  rejectExpired: boolean;
  /** Check certificate revocation (OCSP) - may add latency */
  checkRevocation: boolean;
}

/**
 * TLS validation result
 */
export interface TLSValidationResult {
  valid: boolean;
  error?: string;
  certificate?: {
    subject: string;
    issuer: string;
    validFrom: Date;
    validTo: Date;
    fingerprint: string;
    serialNumber: string;
  };
  tlsVersion?: string;
  cipher?: string;
}

const DEFAULT_SSRF_CONFIG: SSRFConfig = {
  blockLocalhost: true,
  blockPrivateIPs: true,
  blockLinkLocal: true,
  blockMulticast: true
};

const DEFAULT_TLS_CONFIG: TLSValidationConfig = {
  enabled: true,
  allowSelfSigned: false,
  minTLSVersion: 'TLSv1.2',
  pinnedCertificates: new Map(),
  timeout: 10000,
  rejectExpired: true,
  checkRevocation: false // Disabled by default due to latency
};

/**
 * Known proxy provider certificate fingerprints for certificate pinning
 * These are SHA-256 fingerprints of the certificates
 */
export const KNOWN_PROXY_PROVIDER_PINS: Record<string, string[]> = {
  // Example entries - actual fingerprints would be obtained from providers
  // 'proxy.luminati.io': ['sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='],
  // 'proxy.smartproxy.com': ['sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB='],
};

export class ProxyValidator {
  private readonly testUrls = [
    'https://www.google.com',
    'https://api.ipify.org?format=json',
    'https://httpbin.org/ip'
  ];

  private ssrfConfig: SSRFConfig;
  private tlsConfig: TLSValidationConfig;
  private credentialStore?: CredentialStore;

  constructor(
    ssrfConfig: SSRFConfig = DEFAULT_SSRF_CONFIG, 
    credentialStore?: CredentialStore,
    tlsConfig: Partial<TLSValidationConfig> = {}
  ) {
    this.ssrfConfig = ssrfConfig;
    this.credentialStore = credentialStore;
    this.tlsConfig = { ...DEFAULT_TLS_CONFIG, ...tlsConfig };
    
    // Initialize pinned certificates from known providers
    this.initializeCertificatePins();
  }

  /**
   * Initialize certificate pins from known proxy providers
   */
  private initializeCertificatePins(): void {
    for (const [host, pins] of Object.entries(KNOWN_PROXY_PROVIDER_PINS)) {
      if (!this.tlsConfig.pinnedCertificates.has(host)) {
        this.tlsConfig.pinnedCertificates.set(host, pins);
      }
    }
  }

  /**
   * Set the credential store for decrypting proxy credentials
   */
  setCredentialStore(store: CredentialStore): void {
    this.credentialStore = store;
  }

  /**
   * Update TLS validation configuration
   */
  setTLSConfig(config: Partial<TLSValidationConfig>): void {
    this.tlsConfig = { ...this.tlsConfig, ...config };
  }

  /**
   * Get current TLS configuration
   */
  getTLSConfig(): TLSValidationConfig {
    return { ...this.tlsConfig };
  }

  /**
   * Add a certificate pin for a specific host
   */
  addCertificatePin(host: string, fingerprint: string): void {
    const existing = this.tlsConfig.pinnedCertificates.get(host) || [];
    if (!existing.includes(fingerprint)) {
      this.tlsConfig.pinnedCertificates.set(host, [...existing, fingerprint]);
    }
  }

  /**
   * Remove certificate pins for a host
   */
  removeCertificatePin(host: string): void {
    this.tlsConfig.pinnedCertificates.delete(host);
  }

  /**
   * Validate TLS certificate for a proxy connection (MEDIUM-001)
   * 
   * This method performs comprehensive TLS validation including:
   * - Certificate chain validation
   * - Expiry checking
   * - Certificate pinning (if configured)
   * - Minimum TLS version enforcement
   * 
   * @param host - The proxy hostname
   * @param port - The proxy port
   * @returns TLS validation result with certificate details
   */
  async validateTLSCertificate(host: string, port: number): Promise<TLSValidationResult> {
    if (!this.tlsConfig.enabled) {
      return { valid: true };
    }

    return new Promise((resolve) => {
      const startTime = Date.now();
      
      // Configure TLS options
      const tlsOptions: tls.ConnectionOptions = {
        host,
        port,
        servername: host, // SNI
        rejectUnauthorized: !this.tlsConfig.allowSelfSigned,
        minVersion: this.tlsConfig.minTLSVersion,
        timeout: this.tlsConfig.timeout,
        // Request full certificate chain
        requestCert: true,
      };

      // Create TLS connection
      const socket = tls.connect(tlsOptions, () => {
        try {
          const cert = socket.getPeerCertificate(true);
          const cipher = socket.getCipher();
          const tlsVersion = socket.getProtocol();

          // Check if certificate was received
          if (!cert || Object.keys(cert).length === 0) {
            socket.destroy();
            resolve({
              valid: false,
              error: 'No certificate received from server'
            });
            return;
          }

          // Extract certificate details
          const certInfo = {
            subject: typeof cert.subject === 'object' ? 
              (cert.subject.CN || JSON.stringify(cert.subject)) : 
              String(cert.subject || 'Unknown'),
            issuer: typeof cert.issuer === 'object' ? 
              (cert.issuer.CN || JSON.stringify(cert.issuer)) : 
              String(cert.issuer || 'Unknown'),
            validFrom: new Date(cert.valid_from),
            validTo: new Date(cert.valid_to),
            fingerprint: cert.fingerprint256 || cert.fingerprint || '',
            serialNumber: cert.serialNumber || ''
          };

          // Check certificate expiry
          if (this.tlsConfig.rejectExpired) {
            const now = new Date();
            if (now < certInfo.validFrom) {
              socket.destroy();
              resolve({
                valid: false,
                error: 'Certificate is not yet valid',
                certificate: certInfo,
                tlsVersion: tlsVersion || undefined,
                cipher: cipher?.name
              });
              return;
            }
            if (now > certInfo.validTo) {
              socket.destroy();
              resolve({
                valid: false,
                error: 'Certificate has expired',
                certificate: certInfo,
                tlsVersion: tlsVersion || undefined,
                cipher: cipher?.name
              });
              return;
            }
          }

          // Check certificate pinning
          const pinnedFingerprints = this.tlsConfig.pinnedCertificates.get(host);
          if (pinnedFingerprints && pinnedFingerprints.length > 0) {
            const certFingerprint = this.normalizeCertFingerprint(certInfo.fingerprint);
            const isPinned = pinnedFingerprints.some(pin => 
              this.normalizeCertFingerprint(pin) === certFingerprint
            );
            
            if (!isPinned) {
              socket.destroy();
              resolve({
                valid: false,
                error: `Certificate fingerprint mismatch. Expected one of: ${pinnedFingerprints.join(', ')}`,
                certificate: certInfo,
                tlsVersion: tlsVersion || undefined,
                cipher: cipher?.name
              });
              return;
            }
          }

          // Check minimum TLS version
          if (tlsVersion) {
            const versionOrder = ['SSLv3', 'TLSv1', 'TLSv1.1', 'TLSv1.2', 'TLSv1.3'];
            const minVersionIndex = versionOrder.indexOf(this.tlsConfig.minTLSVersion);
            const actualVersionIndex = versionOrder.indexOf(tlsVersion);
            
            if (actualVersionIndex < minVersionIndex) {
              socket.destroy();
              resolve({
                valid: false,
                error: `TLS version ${tlsVersion} is below minimum required ${this.tlsConfig.minTLSVersion}`,
                certificate: certInfo,
                tlsVersion: tlsVersion,
                cipher: cipher?.name
              });
              return;
            }
          }

          socket.destroy();
          resolve({
            valid: true,
            certificate: certInfo,
            tlsVersion: tlsVersion || undefined,
            cipher: cipher?.name
          });

        } catch (error) {
          socket.destroy();
          resolve({
            valid: false,
            error: `Certificate validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
        }
      });

      // Handle connection errors
      socket.on('error', (error: Error) => {
        const errorMessage = error.message || 'Unknown TLS error';
        
        // Categorize common TLS errors
        let detailedError = errorMessage;
        if (errorMessage.includes('self signed')) {
          detailedError = 'Self-signed certificate not allowed';
        } else if (errorMessage.includes('expired')) {
          detailedError = 'Certificate has expired';
        } else if (errorMessage.includes('UNABLE_TO_VERIFY_LEAF_SIGNATURE')) {
          detailedError = 'Unable to verify certificate chain';
        } else if (errorMessage.includes('CERT_HAS_EXPIRED')) {
          detailedError = 'Certificate has expired';
        } else if (errorMessage.includes('DEPTH_ZERO_SELF_SIGNED_CERT')) {
          detailedError = 'Self-signed certificate in certificate chain';
        } else if (errorMessage.includes('ERR_TLS_CERT_ALTNAME_INVALID')) {
          detailedError = 'Certificate hostname mismatch';
        }

        resolve({
          valid: false,
          error: detailedError
        });
      });

      // Handle timeout
      socket.setTimeout(this.tlsConfig.timeout, () => {
        socket.destroy();
        resolve({
          valid: false,
          error: `TLS connection timeout after ${this.tlsConfig.timeout}ms`
        });
      });
    });
  }

  /**
   * Normalize certificate fingerprint for comparison
   */
  private normalizeCertFingerprint(fingerprint: string): string {
    // Remove common prefixes and normalize format
    return fingerprint
      .replace(/^sha256\//i, '')
      .replace(/:/g, '')
      .toUpperCase();
  }

  /**
   * Calculate SHA-256 fingerprint of a certificate
   */
  calculateCertFingerprint(certPem: string): string {
    // Remove PEM headers/footers and decode
    const certBase64 = certPem
      .replace(/-----BEGIN CERTIFICATE-----/g, '')
      .replace(/-----END CERTIFICATE-----/g, '')
      .replace(/\s/g, '');
    
    const certDer = Buffer.from(certBase64, 'base64');
    const hash = crypto.createHash('sha256').update(certDer).digest('hex');
    
    // Format as colon-separated uppercase hex
    return hash.toUpperCase().match(/.{2}/g)?.join(':') || hash.toUpperCase();
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
   * Includes TLS certificate validation for HTTPS proxies (MEDIUM-001)
   */
  async validate(proxy: ProxyConfig): Promise<ProxyValidationResult> {
    const startTime = Date.now();

    try {
      // Re-validate host security before connecting (DNS rebinding protection)
      await this.validateHostSecurity(proxy.host);

      // For HTTPS proxies, validate TLS certificate first (MEDIUM-001)
      if (proxy.protocol === 'https') {
        const tlsResult = await this.validateTLSCertificate(proxy.host, proxy.port);
        if (!tlsResult.valid) {
          return {
            success: false,
            error: `TLS validation failed: ${tlsResult.error}`,
            timestamp: new Date()
          };
        }
      }

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

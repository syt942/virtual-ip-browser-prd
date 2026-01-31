/**
 * Proxy Test Fixtures
 * Reusable test data for proxy-related tests
 */

import type { Proxy, ProxyProtocol, ProxyStatus } from '../../src/stores/proxyStore';

// ============================================================================
// VALID CONFIGURATIONS
// ============================================================================

export const validProxyConfigs = [
  {
    name: 'US Proxy 1',
    host: 'us-proxy.example.com',
    port: 8080,
    protocol: 'https' as ProxyProtocol,
    region: 'US',
    tags: ['fast', 'reliable'],
  },
  {
    name: 'EU Proxy 1',
    host: 'eu-proxy.example.com',
    port: 3128,
    protocol: 'http' as ProxyProtocol,
    region: 'EU',
    username: 'user',
    password: 'pass',
  },
  {
    name: 'SOCKS5 Proxy',
    host: 'socks.example.com',
    port: 1080,
    protocol: 'socks5' as ProxyProtocol,
  },
  {
    name: 'SOCKS4 Proxy',
    host: 'socks4.example.com',
    port: 1080,
    protocol: 'socks4' as ProxyProtocol,
  },
];

// ============================================================================
// INVALID CONFIGURATIONS (for negative tests)
// ============================================================================

export const invalidProxyConfigs = [
  { host: '', port: 8080, protocol: 'http', reason: 'Empty host' },
  { host: 'valid.com', port: 0, protocol: 'http', reason: 'Port zero' },
  { host: 'valid.com', port: -1, protocol: 'http', reason: 'Negative port' },
  { host: 'valid.com', port: 70000, protocol: 'http', reason: 'Port out of range' },
  { host: 'valid.com', port: 8080, protocol: 'invalid', reason: 'Invalid protocol' },
];

// ============================================================================
// SECURITY TEST CASES
// ============================================================================

export const maliciousProxyConfigs = [
  { 
    host: '<script>alert(1)</script>', 
    port: 8080, 
    protocol: 'http',
    reason: 'XSS in host' 
  },
  { 
    host: 'javascript:alert(1)', 
    port: 8080, 
    protocol: 'http',
    reason: 'JavaScript protocol in host' 
  },
  { 
    host: '127.0.0.1', 
    port: 8080, 
    protocol: 'http',
    reason: 'Localhost IP' 
  },
  { 
    host: 'localhost', 
    port: 8080, 
    protocol: 'http',
    reason: 'Localhost hostname' 
  },
  { 
    host: '169.254.169.254', 
    port: 80, 
    protocol: 'http',
    reason: 'AWS metadata endpoint' 
  },
  { 
    host: '10.0.0.1', 
    port: 8080, 
    protocol: 'http',
    reason: 'Private IP (10.x.x.x)' 
  },
  { 
    host: '192.168.1.1', 
    port: 8080, 
    protocol: 'http',
    reason: 'Private IP (192.168.x.x)' 
  },
  {
    host: 'valid.com\0malicious',
    port: 8080,
    protocol: 'http',
    reason: 'Null byte injection'
  },
];

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

let proxyIdCounter = 0;

/**
 * Create a mock proxy with optional overrides
 */
export function createMockProxy(overrides: Partial<Proxy> = {}): Proxy {
  const id = overrides.id || `00000000-0000-4000-a000-${String(proxyIdCounter++).padStart(12, '0')}`;
  
  return {
    id,
    name: `Test Proxy ${proxyIdCounter}`,
    host: 'test.proxy.com',
    port: 8080,
    protocol: 'https',
    status: 'active',
    failureCount: 0,
    totalRequests: 100,
    successRate: 95,
    latency: 50,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create multiple mock proxies
 */
export function createMockProxies(count: number, overrides: Partial<Proxy> = {}): Proxy[] {
  return Array.from({ length: count }, (_, i) => 
    createMockProxy({ 
      name: `Proxy ${i + 1}`,
      ...overrides 
    })
  );
}

/**
 * Create proxies with various statuses for testing filtering
 */
export function createMixedStatusProxies(): Proxy[] {
  const statuses: ProxyStatus[] = ['active', 'failed', 'checking', 'disabled'];
  return statuses.map((status, i) => 
    createMockProxy({ 
      name: `${status.charAt(0).toUpperCase() + status.slice(1)} Proxy`,
      status,
      failureCount: status === 'failed' ? 5 : 0,
      successRate: status === 'active' ? 95 : status === 'failed' ? 20 : 0,
    })
  );
}

/**
 * Create proxies for rotation group testing
 */
export function createRotationGroupProxies(): Proxy[] {
  return [
    createMockProxy({ name: 'US-1', region: 'US', tags: ['us-group'] }),
    createMockProxy({ name: 'US-2', region: 'US', tags: ['us-group'] }),
    createMockProxy({ name: 'EU-1', region: 'EU', tags: ['eu-group'] }),
    createMockProxy({ name: 'EU-2', region: 'EU', tags: ['eu-group'] }),
    createMockProxy({ name: 'ASIA-1', region: 'ASIA', tags: ['asia-group'] }),
  ];
}

/**
 * Reset proxy ID counter (call in beforeEach)
 */
export function resetProxyFixtures(): void {
  proxyIdCounter = 0;
}

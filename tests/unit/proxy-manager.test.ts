/**
 * Proxy Manager Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ProxyManager, type ProxyManagerConfig } from '../../electron/core/proxy-engine/manager';

// Test master key (64 hex characters = 32 bytes) - only for testing purposes
const TEST_MASTER_KEY = 'a'.repeat(64);

// Test hosts that should bypass SSRF validation
const TEST_ALLOWED_HOSTS = [
  'proxy.example.com',
  'test.com',
  'proxy1.com',
  'proxy2.com'
];

describe('ProxyManager', () => {
  let manager: ProxyManager;

  beforeEach(() => {
    const config: ProxyManagerConfig = {
      masterKey: TEST_MASTER_KEY,
      autoValidate: false, // Disable auto-validation in tests to avoid network calls
      ssrfConfig: {
        blockLocalhost: true,
        blockPrivateIPs: true,
        blockLinkLocal: true,
        blockMulticast: true,
        allowedHosts: TEST_ALLOWED_HOSTS // Allow test hosts to bypass DNS resolution
      }
    };
    manager = new ProxyManager(config);
  });

  afterEach(() => {
    // Clean up manager to clear sensitive data
    manager.destroy();
  });

  describe('addProxy', () => {
    it('should add a proxy successfully', async () => {
      const proxy = await manager.addProxy({
        name: 'Test Proxy',
        host: 'proxy.example.com',
        port: 8080,
        protocol: 'https'
      });

      expect(proxy.id).toBeDefined();
      expect(proxy.name).toBe('Test Proxy');
      expect(proxy.host).toBe('proxy.example.com');
      expect(proxy.port).toBe(8080);
      expect(proxy.status).toBe('checking');
    });

    it('should emit proxy:added event', async () => {
      let emittedProxy: any = null;
      manager.on('proxy:added', (proxy) => {
        emittedProxy = proxy;
      });

      const proxy = await manager.addProxy({
        name: 'Test',
        host: 'test.com',
        port: 8080,
        protocol: 'http'
      });

      expect(emittedProxy).toEqual(proxy);
    });
  });

  describe('removeProxy', () => {
    it('should remove an existing proxy', async () => {
      const proxy = await manager.addProxy({
        name: 'Test',
        host: 'test.com',
        port: 8080,
        protocol: 'http'
      });

      const result = manager.removeProxy(proxy.id);
      expect(result).toBe(true);

      const proxies = manager.getAllProxies();
      expect(proxies).toHaveLength(0);
    });

    it('should return false for non-existent proxy', () => {
      const result = manager.removeProxy('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('getNextProxy', () => {
    it('should return null when no proxies available', () => {
      const proxy = manager.getNextProxy();
      expect(proxy).toBeNull();
    });
  });

  describe('getAllProxies', () => {
    it('should return empty array initially', () => {
      const proxies = manager.getAllProxies();
      expect(proxies).toEqual([]);
    });

    it('should return all added proxies', async () => {
      await manager.addProxy({
        name: 'Proxy 1',
        host: 'proxy1.com',
        port: 8080,
        protocol: 'http'
      });

      await manager.addProxy({
        name: 'Proxy 2',
        host: 'proxy2.com',
        port: 8080,
        protocol: 'https'
      });

      const proxies = manager.getAllProxies();
      expect(proxies).toHaveLength(2);
    });
  });
});

/**
 * Unit Tests for Proxy Parser
 * Tests all parsing formats and edge cases
 */

import { describe, it, expect } from 'vitest';
import {
  parseProxyLine,
  parseProxyList,
  findDuplicates,
  removeDuplicates,
  exportProxies,
  type ParsedProxy,
} from '../../../src/utils/proxyParser';

describe('Proxy Parser - Unit Tests', () => {
  // ============================================================
  // PARSE SINGLE LINE TESTS
  // ============================================================
  describe('parseProxyLine', () => {
    describe('Host:Port Format', () => {
      it('parses simple host:port format', () => {
        const result = parseProxyLine('192.168.1.100:8080', 1);
        
        expect(result.success).toBe(true);
        expect(result.proxy).toEqual({
          host: '192.168.1.100',
          port: 8080,
          protocol: 'http',
        });
      });

      it('parses domain:port format', () => {
        const result = parseProxyLine('proxy.example.com:3128', 1);
        
        expect(result.success).toBe(true);
        expect(result.proxy).toEqual({
          host: 'proxy.example.com',
          port: 3128,
          protocol: 'http',
        });
      });

      it('parses host:port:username:password format', () => {
        const result = parseProxyLine('10.0.0.50:8080:admin:secret123', 1);
        
        expect(result.success).toBe(true);
        expect(result.proxy).toEqual({
          host: '10.0.0.50',
          port: 8080,
          protocol: 'http',
          username: 'admin',
          password: 'secret123',
        });
      });

      it('parses with username but no password', () => {
        const result = parseProxyLine('192.168.1.1:8080:user', 1);
        
        expect(result.success).toBe(true);
        expect(result.proxy).toEqual({
          host: '192.168.1.1',
          port: 8080,
          protocol: 'http',
          username: 'user',
        });
      });
    });

    describe('URL Format', () => {
      it('parses http:// URL format', () => {
        const result = parseProxyLine('http://proxy.example.com:8080', 1);
        
        expect(result.success).toBe(true);
        expect(result.proxy).toEqual({
          host: 'proxy.example.com',
          port: 8080,
          protocol: 'http',
        });
      });

      it('parses socks5:// URL format', () => {
        const result = parseProxyLine('socks5://192.168.1.100:1080', 1);
        
        expect(result.success).toBe(true);
        expect(result.proxy).toEqual({
          host: '192.168.1.100',
          port: 1080,
          protocol: 'socks5',
        });
      });

      it('parses URL with authentication', () => {
        const result = parseProxyLine('http://username:password@proxy.local:8080', 1);
        
        expect(result.success).toBe(true);
        expect(result.proxy).toEqual({
          host: 'proxy.local',
          port: 8080,
          protocol: 'http',
          username: 'username',
          password: 'password',
        });
      });

      it('parses socks4:// protocol', () => {
        const result = parseProxyLine('socks4://10.0.0.1:1080', 1);
        
        expect(result.success).toBe(true);
        expect(result.proxy?.protocol).toBe('socks4');
      });

      it('parses https:// protocol', () => {
        const result = parseProxyLine('https://secure.proxy.com:8443', 1);
        
        expect(result.success).toBe(true);
        expect(result.proxy?.protocol).toBe('https');
      });
    });

    describe('CSV Format', () => {
      it('parses CSV with all fields', () => {
        const result = parseProxyLine('192.168.1.100,8080,http,admin,pass123', 1);
        
        expect(result.success).toBe(true);
        expect(result.proxy).toEqual({
          host: '192.168.1.100',
          port: 8080,
          protocol: 'http',
          username: 'admin',
          password: 'pass123',
        });
      });

      it('parses CSV without credentials', () => {
        const result = parseProxyLine('proxy.example.com,3128,socks5', 1);
        
        expect(result.success).toBe(true);
        expect(result.proxy).toEqual({
          host: 'proxy.example.com',
          port: 3128,
          protocol: 'socks5',
        });
      });

      it('parses CSV with spaces', () => {
        const result = parseProxyLine('  192.168.1.1  ,  8080  ,  http  ,  user  ,  pass  ', 1);
        
        expect(result.success).toBe(true);
        expect(result.proxy?.host).toBe('192.168.1.1');
        expect(result.proxy?.username).toBe('user');
      });
    });

    describe('Edge Cases', () => {
      it('skips empty lines', () => {
        const result = parseProxyLine('', 1);
        
        expect(result.success).toBe(false);
        expect(result.error).toBe('Empty or comment line');
      });

      it('skips whitespace-only lines', () => {
        const result = parseProxyLine('   ', 1);
        
        expect(result.success).toBe(false);
        expect(result.error).toBe('Empty or comment line');
      });

      it('skips comment lines starting with #', () => {
        const result = parseProxyLine('# This is a comment', 1);
        
        expect(result.success).toBe(false);
        expect(result.error).toBe('Empty or comment line');
      });

      it('skips comment lines starting with //', () => {
        const result = parseProxyLine('// Another comment', 1);
        
        expect(result.success).toBe(false);
        expect(result.error).toBe('Empty or comment line');
      });

      it('trims whitespace from input', () => {
        const result = parseProxyLine('  192.168.1.100:8080  ', 1);
        
        expect(result.success).toBe(true);
        expect(result.proxy?.host).toBe('192.168.1.100');
      });
    });

    describe('Validation', () => {
      it('rejects invalid port (too low)', () => {
        const result = parseProxyLine('192.168.1.100:0', 1);
        
        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid format');
      });

      it('rejects invalid port (too high)', () => {
        const result = parseProxyLine('192.168.1.100:65536', 1);
        
        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid format');
      });

      it('rejects invalid port (non-numeric)', () => {
        const result = parseProxyLine('192.168.1.100:abc', 1);
        
        expect(result.success).toBe(false);
      });

      it('rejects invalid IP address (octet > 255)', () => {
        const result = parseProxyLine('192.168.256.1:8080', 1);
        
        expect(result.success).toBe(false);
      });

      it('rejects invalid hostname', () => {
        const result = parseProxyLine('invalid..hostname:8080', 1);
        
        expect(result.success).toBe(false);
      });

      it('rejects unsupported protocol', () => {
        const result = parseProxyLine('ftp://proxy.example.com:8080', 1);
        
        expect(result.success).toBe(false);
      });
    });
  });

  // ============================================================
  // BULK PARSE TESTS
  // ============================================================
  describe('parseProxyList', () => {
    it('parses multiple valid proxies', () => {
      const input = `192.168.1.100:8080
proxy.example.com:3128
http://10.0.0.50:8080
socks5://user:pass@proxy.local:1080`;

      const result = parseProxyList(input);

      expect(result.successful).toHaveLength(4);
      expect(result.failed).toHaveLength(0);
      expect(result.total).toBe(4);
      expect(result.successRate).toBe(100);
    });

    it('handles mixed valid and invalid entries', () => {
      const input = `192.168.1.100:8080
invalid-line
proxy.example.com:3128
192.168.1.1:99999
http://valid.proxy:8080`;

      const result = parseProxyList(input);

      expect(result.successful).toHaveLength(3);
      expect(result.failed).toHaveLength(2);
      expect(result.total).toBe(5);
      expect(result.successRate).toBe(60);
    });

    it('ignores empty lines and comments', () => {
      const input = `# Proxy list
192.168.1.100:8080

// Another comment
proxy.example.com:3128

# End of list`;

      const result = parseProxyList(input);

      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
    });

    it('applies default protocol', () => {
      const input = '192.168.1.100:8080';
      const result = parseProxyList(input, 'socks5');

      expect(result.successful[0]?.protocol).toBe('socks5');
    });

    it('generates names for proxies', () => {
      const input = '192.168.1.100:8080';
      const result = parseProxyList(input);

      expect(result.successful[0]?.name).toBe('192.168.1.100:8080');
    });

    it('handles large proxy lists', () => {
      const proxies = Array.from({ length: 1000 }, (_, i) => `192.168.${Math.floor(i / 255)}.${i % 255}:8080`);
      const input = proxies.join('\n');

      const result = parseProxyList(input);

      expect(result.successful).toHaveLength(1000);
      expect(result.successRate).toBe(100);
    });

    it('returns empty result for empty input', () => {
      const result = parseProxyList('');

      expect(result.successful).toHaveLength(0);
      expect(result.failed).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  // ============================================================
  // DUPLICATE DETECTION TESTS
  // ============================================================
  describe('findDuplicates', () => {
    it('finds duplicate proxies', () => {
      const proxies: ParsedProxy[] = [
        { host: '192.168.1.100', port: 8080, protocol: 'http' },
        { host: '192.168.1.100', port: 8080, protocol: 'socks5' },
        { host: '10.0.0.1', port: 8080, protocol: 'http' },
      ];

      const duplicates = findDuplicates(proxies);

      expect(duplicates.size).toBe(1);
      expect(duplicates.has('192.168.1.100:8080')).toBe(true);
      expect(duplicates.get('192.168.1.100:8080')).toHaveLength(2);
    });

    it('returns empty map when no duplicates', () => {
      const proxies: ParsedProxy[] = [
        { host: '192.168.1.100', port: 8080, protocol: 'http' },
        { host: '192.168.1.101', port: 8080, protocol: 'http' },
        { host: '192.168.1.100', port: 8081, protocol: 'http' },
      ];

      const duplicates = findDuplicates(proxies);

      expect(duplicates.size).toBe(0);
    });

    it('considers different ports as unique', () => {
      const proxies: ParsedProxy[] = [
        { host: '192.168.1.100', port: 8080, protocol: 'http' },
        { host: '192.168.1.100', port: 8081, protocol: 'http' },
      ];

      const duplicates = findDuplicates(proxies);

      expect(duplicates.size).toBe(0);
    });
  });

  describe('removeDuplicates', () => {
    it('removes duplicate proxies keeping first occurrence', () => {
      const proxies: ParsedProxy[] = [
        { host: '192.168.1.100', port: 8080, protocol: 'http' },
        { host: '192.168.1.101', port: 8080, protocol: 'http' },
        { host: '192.168.1.100', port: 8080, protocol: 'socks5' },
        { host: '192.168.1.101', port: 8080, protocol: 'socks5' },
      ];

      const unique = removeDuplicates(proxies);

      expect(unique).toHaveLength(2);
      expect(unique[0]?.protocol).toBe('http'); // First occurrence kept
      expect(unique[1]?.protocol).toBe('http');
    });

    it('returns same array when no duplicates', () => {
      const proxies: ParsedProxy[] = [
        { host: '192.168.1.100', port: 8080, protocol: 'http' },
        { host: '192.168.1.101', port: 8080, protocol: 'http' },
      ];

      const unique = removeDuplicates(proxies);

      expect(unique).toHaveLength(2);
    });

    it('handles empty array', () => {
      const unique = removeDuplicates([]);

      expect(unique).toHaveLength(0);
    });
  });

  // ============================================================
  // EXPORT TESTS
  // ============================================================
  describe('exportProxies', () => {
    const testProxies = [
      { host: '192.168.1.100', port: 8080, protocol: 'http' as const },
      { host: 'proxy.example.com', port: 3128, protocol: 'socks5' as const, username: 'admin', password: 'secret' },
    ];

    describe('Simple Format', () => {
      it('exports in host:port format', () => {
        const result = exportProxies([testProxies[0]], 'simple');
        
        expect(result).toBe('192.168.1.100:8080');
      });

      it('exports with credentials', () => {
        const result = exportProxies([testProxies[1]], 'simple');
        
        expect(result).toBe('proxy.example.com:3128:admin:secret');
      });

      it('exports multiple proxies', () => {
        const result = exportProxies(testProxies, 'simple');
        
        expect(result).toBe('192.168.1.100:8080\nproxy.example.com:3128:admin:secret');
      });
    });

    describe('URL Format', () => {
      it('exports in URL format', () => {
        const result = exportProxies([testProxies[0]], 'url');
        
        expect(result).toBe('http://192.168.1.100:8080');
      });

      it('exports with credentials', () => {
        const result = exportProxies([testProxies[1]], 'url');
        
        expect(result).toBe('socks5://admin:secret@proxy.example.com:3128');
      });

      it('exports multiple proxies', () => {
        const result = exportProxies(testProxies, 'url');
        
        expect(result).toContain('http://192.168.1.100:8080');
        expect(result).toContain('socks5://admin:secret@proxy.example.com:3128');
      });
    });

    describe('CSV Format', () => {
      it('exports with CSV header', () => {
        const result = exportProxies([testProxies[0]], 'csv');
        
        expect(result).toContain('host,port,protocol,username,password');
      });

      it('exports data rows', () => {
        const result = exportProxies([testProxies[0]], 'csv');
        
        expect(result).toContain('192.168.1.100,8080,http,,');
      });

      it('exports with credentials', () => {
        const result = exportProxies([testProxies[1]], 'csv');
        
        expect(result).toContain('proxy.example.com,3128,socks5,admin,secret');
      });
    });

    it('handles empty array', () => {
      expect(exportProxies([], 'simple')).toBe('');
      expect(exportProxies([], 'url')).toBe('');
      expect(exportProxies([], 'csv')).toBe('host,port,protocol,username,password');
    });
  });

  // ============================================================
  // INTEGRATION TESTS
  // ============================================================
  describe('End-to-End Scenarios', () => {
    it('parses and exports preserving data', () => {
      const input = `192.168.1.100:8080
http://proxy.example.com:3128
socks5://user:pass@10.0.0.50:1080`;

      const parseResult = parseProxyList(input);
      const exported = exportProxies(parseResult.successful, 'url');
      const reparsed = parseProxyList(exported);

      expect(reparsed.successful).toHaveLength(parseResult.successful.length);
      expect(reparsed.successRate).toBe(100);
    });

    it('handles mixed formats in bulk import', () => {
      const input = `# Configuration file
192.168.1.100:8080
http://proxy1.example.com:3128

// SOCKS proxies
socks5://admin:pass@10.0.0.1:1080
10.0.0.2,1080,socks5,user,pass`;

      const result = parseProxyList(input);

      expect(result.successful).toHaveLength(4);
      expect(result.successRate).toBe(100);
    });

    it('removes duplicates and exports', () => {
      const input = `192.168.1.100:8080
192.168.1.100:8080
192.168.1.101:8080`;

      const parseResult = parseProxyList(input);
      const unique = removeDuplicates(parseResult.successful);
      
      expect(unique).toHaveLength(2);
      
      const exported = exportProxies(unique, 'simple');
      expect(exported.split('\n')).toHaveLength(2);
    });
  });
});

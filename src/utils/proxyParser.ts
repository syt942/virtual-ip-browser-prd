/**
 * Proxy Parser Utility
 * Parses various proxy formats for bulk import
 * 
 * Supported formats:
 * - host:port
 * - host:port:username:password
 * - protocol://host:port
 * - protocol://username:password@host:port
 * - CSV: host,port,protocol,username,password
 */

import type { ProxyProtocol } from '@stores/proxyStore';

export interface ParsedProxy {
  host: string;
  port: number;
  protocol: ProxyProtocol;
  username?: string;
  password?: string;
  name?: string;
}

export interface ParseResult {
  success: boolean;
  proxy?: ParsedProxy;
  error?: string;
  line: string;
  lineNumber: number;
}

export interface BulkParseResult {
  successful: ParsedProxy[];
  failed: ParseResult[];
  total: number;
  successRate: number;
}

/**
 * Valid proxy protocols
 */
const VALID_PROTOCOLS: ProxyProtocol[] = ['http', 'https', 'socks4', 'socks5'];

/**
 * Default protocol if not specified
 */
const DEFAULT_PROTOCOL: ProxyProtocol = 'http';

/**
 * Validate hostname format
 */
function isValidHostname(hostname: string): boolean {
  // Allow IP addresses and domain names
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  const domainPattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/;
  
  if (ipv4Pattern.test(hostname)) {
    // Validate IP octets are 0-255
    const octets = hostname.split('.').map(Number);
    return octets.every(octet => octet >= 0 && octet <= 255);
  }
  
  return domainPattern.test(hostname);
}

/**
 * Validate port number
 */
function isValidPort(port: number): boolean {
  return Number.isInteger(port) && port >= 1 && port <= 65535;
}

/**
 * Parse protocol://username:password@host:port format
 */
function parseUrlFormat(input: string): ParsedProxy | null {
  try {
    // Try to parse as URL
    const url = new URL(input);
    
    const protocol = url.protocol.replace(':', '') as ProxyProtocol;
    if (!VALID_PROTOCOLS.includes(protocol)) {
      return null;
    }
    
    const host = url.hostname;
    const port = parseInt(url.port, 10);
    
    if (!isValidHostname(host) || !isValidPort(port)) {
      return null;
    }
    
    return {
      protocol,
      host,
      port,
      username: url.username || undefined,
      password: url.password || undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Parse host:port:username:password format
 */
function parseColonFormat(input: string, defaultProtocol: ProxyProtocol = DEFAULT_PROTOCOL): ParsedProxy | null {
  const parts = input.split(':').map(p => p.trim());
  
  if (parts.length < 2 || parts.length > 4) {
    return null;
  }
  
  const [host, portStr, username, password] = parts;
  const port = parseInt(portStr, 10);
  
  if (!isValidHostname(host) || !isValidPort(port)) {
    return null;
  }
  
  return {
    protocol: defaultProtocol,
    host,
    port,
    username: username || undefined,
    password: password || undefined,
  };
}

/**
 * Parse CSV format: host,port,protocol,username,password
 */
function parseCsvFormat(input: string): ParsedProxy | null {
  const parts = input.split(',').map(p => p.trim());
  
  if (parts.length < 2) {
    return null;
  }
  
  const [host, portStr, protocolStr, username, password] = parts;
  const port = parseInt(portStr, 10);
  const protocol = (protocolStr?.toLowerCase() || DEFAULT_PROTOCOL) as ProxyProtocol;
  
  if (!isValidHostname(host) || !isValidPort(port)) {
    return null;
  }
  
  if (protocolStr && !VALID_PROTOCOLS.includes(protocol)) {
    return null;
  }
  
  return {
    protocol,
    host,
    port,
    username: username || undefined,
    password: password || undefined,
  };
}

/**
 * Parse a single proxy line
 */
export function parseProxyLine(line: string, lineNumber: number, defaultProtocol: ProxyProtocol = DEFAULT_PROTOCOL): ParseResult {
  const trimmedLine = line.trim();
  
  // Skip empty lines and comments
  if (!trimmedLine || trimmedLine.startsWith('#') || trimmedLine.startsWith('//')) {
    return {
      success: false,
      error: 'Empty or comment line',
      line: trimmedLine,
      lineNumber,
    };
  }
  
  // Try URL format first (protocol://...)
  if (trimmedLine.includes('://')) {
    const proxy = parseUrlFormat(trimmedLine);
    if (proxy) {
      return {
        success: true,
        proxy,
        line: trimmedLine,
        lineNumber,
      };
    }
  }
  
  // Try CSV format (contains commas)
  if (trimmedLine.includes(',')) {
    const proxy = parseCsvFormat(trimmedLine);
    if (proxy) {
      return {
        success: true,
        proxy,
        line: trimmedLine,
        lineNumber,
      };
    }
  }
  
  // Try colon format (host:port:user:pass)
  const proxy = parseColonFormat(trimmedLine, defaultProtocol);
  if (proxy) {
    return {
      success: true,
      proxy,
      line: trimmedLine,
      lineNumber,
    };
  }
  
  // Failed to parse
  return {
    success: false,
    error: 'Invalid format. Expected: host:port, protocol://host:port, or CSV format',
    line: trimmedLine,
    lineNumber,
  };
}

/**
 * Parse multiple proxy lines (bulk import)
 */
export function parseProxyList(input: string, defaultProtocol: ProxyProtocol = DEFAULT_PROTOCOL): BulkParseResult {
  const lines = input.split('\n');
  const successful: ParsedProxy[] = [];
  const failed: ParseResult[] = [];
  
  lines.forEach((line, index) => {
    const result = parseProxyLine(line, index + 1, defaultProtocol);
    
    if (result.success && result.proxy) {
      // Generate a name if not provided
      const proxy = {
        ...result.proxy,
        name: result.proxy.name || `${result.proxy.host}:${result.proxy.port}`,
      };
      successful.push(proxy);
    } else if (result.error !== 'Empty or comment line') {
      // Only track actual errors, not empty/comment lines
      failed.push(result);
    }
  });
  
  const total = successful.length + failed.length;
  const successRate = total > 0 ? (successful.length / total) * 100 : 0;
  
  return {
    successful,
    failed,
    total,
    successRate,
  };
}

/**
 * Detect duplicates in proxy list
 */
export function findDuplicates(proxies: ParsedProxy[]): Map<string, ParsedProxy[]> {
  const duplicates = new Map<string, ParsedProxy[]>();
  const seen = new Map<string, ParsedProxy>();
  
  proxies.forEach(proxy => {
    const key = `${proxy.host}:${proxy.port}`;
    
    if (seen.has(key)) {
      if (!duplicates.has(key)) {
        duplicates.set(key, [seen.get(key)!]);
      }
      duplicates.get(key)!.push(proxy);
    } else {
      seen.set(key, proxy);
    }
  });
  
  return duplicates;
}

/**
 * Remove duplicates from proxy list (keep first occurrence)
 */
export function removeDuplicates(proxies: ParsedProxy[]): ParsedProxy[] {
  const seen = new Set<string>();
  const unique: ParsedProxy[] = [];
  
  proxies.forEach(proxy => {
    const key = `${proxy.host}:${proxy.port}`;
    
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(proxy);
    }
  });
  
  return unique;
}

/**
 * Export proxies to various formats
 */
export function exportProxies(
  proxies: Array<{
    host: string;
    port: number;
    protocol: ProxyProtocol;
    username?: string;
    password?: string;
  }>,
  format: 'simple' | 'url' | 'csv' = 'simple'
): string {
  switch (format) {
    case 'simple':
      // host:port:username:password
      return proxies
        .map(p => {
          let line = `${p.host}:${p.port}`;
          if (p.username) {
            line += `:${p.username}`;
            if (p.password) {
              line += `:${p.password}`;
            }
          }
          return line;
        })
        .join('\n');
    
    case 'url':
      // protocol://username:password@host:port
      return proxies
        .map(p => {
          let url = `${p.protocol}://`;
          if (p.username) {
            url += p.username;
            if (p.password) {
              url += `:${p.password}`;
            }
            url += '@';
          }
          url += `${p.host}:${p.port}`;
          return url;
        })
        .join('\n');
    
    case 'csv':
      // CSV with header
      const rows = [
        'host,port,protocol,username,password',
        ...proxies.map(p => 
          `${p.host},${p.port},${p.protocol},${p.username || ''},${p.password || ''}`
        ),
      ];
      return rows.join('\n');
    
    default:
      return '';
  }
}

/**
 * Parse file content based on file extension
 */
export function parseFileContent(
  content: string,
  filename: string,
  defaultProtocol: ProxyProtocol = DEFAULT_PROTOCOL
): BulkParseResult {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  // CSV files are handled the same way, just detected format
  // The parser automatically detects CSV format
  return parseProxyList(content, defaultProtocol);
}

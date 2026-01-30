/**
 * Input Sanitization Utilities for UI Components
 * Provides client-side validation and sanitization
 */

/**
 * Sanitize URL input - block dangerous protocols
 */
export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  const trimmed = url.trim();
  const lowerUrl = trimmed.toLowerCase();

  // Block dangerous protocols
  const dangerousProtocols = [
    'javascript:',
    'vbscript:',
    'data:',
    'file:',
    'about:',
  ];

  for (const proto of dangerousProtocols) {
    if (lowerUrl.startsWith(proto)) {
      console.warn(`[Security] Blocked dangerous URL protocol: ${proto}`);
      return '';
    }
  }

  // Add https:// if no protocol specified
  if (!trimmed.match(/^https?:\/\//i)) {
    return 'https://' + trimmed;
  }

  return trimmed;
}

/**
 * Sanitize text input - encode HTML entities and remove dangerous characters
 */
export function sanitizeTextInput(input: string, maxLength: number = 1000): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove null bytes
  let sanitized = input.replace(/\x00/g, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  // Truncate to max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Escape HTML entities for safe display
 */
export function escapeHtml(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Sanitize domain input
 */
export function sanitizeDomain(domain: string): string {
  if (!domain || typeof domain !== 'string') {
    return '';
  }

  // Remove protocol if present
  let sanitized = domain.replace(/^https?:\/\//i, '');

  // Remove path, query, and fragment
  sanitized = sanitized.split('/')[0].split('?')[0].split('#')[0];

  // Validate domain format (basic check)
  if (!/^[a-zA-Z0-9][a-zA-Z0-9.-]*[a-zA-Z0-9]$/.test(sanitized) && sanitized.length > 1) {
    return '';
  }

  // Check length
  if (sanitized.length > 255) {
    return '';
  }

  return sanitized.toLowerCase();
}

/**
 * Sanitize keyword input for search
 */
export function sanitizeKeyword(keyword: string): string {
  if (!keyword || typeof keyword !== 'string') {
    return '';
  }

  // Remove null bytes and trim
  let sanitized = keyword.replace(/\x00/g, '').trim();

  // Limit length
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 200);
  }

  return sanitized;
}

/**
 * Validate UUID format
 */
export function isValidUUID(id: string): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Sanitize proxy host
 */
export function sanitizeProxyHost(host: string): string {
  if (!host || typeof host !== 'string') {
    return '';
  }

  const sanitized = host.trim();

  // Only allow alphanumeric, dots, and hyphens
  if (!/^[a-zA-Z0-9.-]+$/.test(sanitized)) {
    return '';
  }

  // Check length
  if (sanitized.length > 255) {
    return '';
  }

  return sanitized;
}

/**
 * Sanitize port number
 */
export function sanitizePort(port: number | string): number | null {
  const portNum = typeof port === 'string' ? parseInt(port, 10) : port;
  
  if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
    return null;
  }

  return portNum;
}

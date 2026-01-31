/**
 * Input Sanitization Utilities
 * Centralized validation and sanitization for UI components
 * 
 * Security: Use these utilities for all user input handling
 */

/**
 * Sanitize user input for display (XSS prevention)
 * Note: React's JSX already escapes by default, but use this for extra safety
 * or when using dangerouslySetInnerHTML
 */
export function sanitizeForDisplay(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate and sanitize URL input
 */
export function sanitizeUrl(url: string): { valid: boolean; sanitized: string; error?: string } {
  if (typeof url !== 'string') {
    return { valid: false, sanitized: '', error: 'URL must be a string' };
  }

  const trimmed = url.trim();
  
  if (!trimmed) {
    return { valid: false, sanitized: '', error: 'URL is required' };
  }

  if (trimmed.length > 2000) {
    return { valid: false, sanitized: '', error: 'URL too long (max 2000 characters)' };
  }

  // Check for dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:', 'about:'];
  const lowerUrl = trimmed.toLowerCase();
  for (const protocol of dangerousProtocols) {
    if (lowerUrl.startsWith(protocol)) {
      return { valid: false, sanitized: '', error: `Blocked protocol: ${protocol}` };
    }
  }

  // Ensure valid URL format
  try {
    // Add https:// if no protocol specified
    const urlWithProtocol = trimmed.match(/^https?:\/\//i) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(urlWithProtocol);
    
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, sanitized: '', error: 'Only HTTP/HTTPS URLs allowed' };
    }

    // Block internal IPs and localhost
    const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '169.254.169.254'];
    if (blockedHosts.includes(parsed.hostname)) {
      return { valid: false, sanitized: '', error: 'Blocked hostname' };
    }

    // Block private IP ranges
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipPattern.test(parsed.hostname)) {
      const octets = parsed.hostname.split('.').map(Number);
      if (octets[0] === 10 ||
          (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
          (octets[0] === 192 && octets[1] === 168) ||
          octets[0] === 127) {
        return { valid: false, sanitized: '', error: 'Private IP addresses are blocked' };
      }
    }

    return { valid: true, sanitized: parsed.href };
  } catch (error) {
    // URL parsing failed - provide helpful error message
    console.debug('[Sanitization] Invalid URL format:', trimmed.substring(0, 50),
      error instanceof Error ? error.message : 'Parse error');
    return { valid: false, sanitized: '', error: 'Invalid URL format' };
  }
}

/**
 * Validate keyword input
 */
export function validateKeyword(keyword: string): { valid: boolean; sanitized: string; error?: string } {
  if (typeof keyword !== 'string') {
    return { valid: false, sanitized: '', error: 'Keyword must be a string' };
  }

  const trimmed = keyword.trim();
  
  if (!trimmed) {
    return { valid: false, sanitized: '', error: 'Keyword is required' };
  }

  if (trimmed.length > 500) {
    return { valid: false, sanitized: '', error: 'Keyword too long (max 500 characters)' };
  }

  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /data:/i,
    /vbscript:/i,
    /expression\s*\(/i,
    /url\s*\(/i,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(trimmed)) {
      return { valid: false, sanitized: '', error: 'Keyword contains dangerous patterns' };
    }
  }

  return { valid: true, sanitized: trimmed };
}

/**
 * Validate domain input
 */
export function validateDomain(domain: string): { valid: boolean; sanitized: string; error?: string } {
  if (typeof domain !== 'string') {
    return { valid: false, sanitized: '', error: 'Domain must be a string' };
  }

  const trimmed = domain.trim().toLowerCase();
  
  if (!trimmed) {
    return { valid: false, sanitized: '', error: 'Domain is required' };
  }

  if (trimmed.length > 253) {
    return { valid: false, sanitized: '', error: 'Domain too long (max 253 characters)' };
  }

  // Valid domain regex
  const domainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/;
  if (!domainRegex.test(trimmed)) {
    return { valid: false, sanitized: '', error: 'Invalid domain format' };
  }

  // Block dangerous patterns
  if (/<script|javascript:|on\w+=/i.test(trimmed)) {
    return { valid: false, sanitized: '', error: 'Domain contains dangerous patterns' };
  }

  return { valid: true, sanitized: trimmed };
}

/**
 * Validate regex pattern for ReDoS safety
 */
export function validateRegexPattern(pattern: string): { valid: boolean; error?: string } {
  if (typeof pattern !== 'string') {
    return { valid: false, error: 'Pattern must be a string' };
  }

  if (pattern.length > 200) {
    return { valid: false, error: 'Pattern too long (max 200 characters)' };
  }

  // Patterns that indicate potential catastrophic backtracking
  const dangerousPatterns = [
    /\(\[?[^\]]*\]\+\)\+/,     // (a+)+ or ([a-z]+)+
    /\(\.\*\)\+/,              // (.*)+
    /\(\[^\]]*\]\*\)\+/,       // ([a-z]*)+
    /\(\.\+\)\+/,              // (.+)+
    /\(\.\*\)\*/,              // (.*)*
    /\(\[^\]]+\]\+\)\*/,       // ([a-z]+)*
    /\(\w\+\)\+/,              // (\w+)+
    /\(\.\+\)\*/,              // (.+)*
    /\([^)]+\|[^)]+\)\+/,      // (a|aa)+
  ];

  if (dangerousPatterns.some(dp => dp.test(pattern))) {
    return { valid: false, error: 'Pattern may cause catastrophic backtracking' };
  }

  // Try to compile to check syntax
  try {
    new RegExp(pattern);
  } catch (error) {
    return { valid: false, error: `Invalid regex syntax: ${(error as Error).message}` };
  }

  return { valid: true };
}

/**
 * Truncate string safely for display
 */
export function truncate(str: string, maxLength: number): string {
  if (typeof str !== 'string') {return '';}
  if (str.length <= maxLength) {return str;}
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * Strip all HTML tags from string
 */
export function stripHtml(html: string): string {
  if (typeof html !== 'string') {return '';}
  return html.replace(/<[^>]*>/g, '');
}

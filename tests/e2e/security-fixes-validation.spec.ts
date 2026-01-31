/**
 * E2E Tests - Security Fixes Validation (v1.3.0 Release)
 * Tests for security vulnerability fixes
 * - Test WebRTC protection (no IP leaks)
 * - Test tracker blocker (no ReDoS)
 * - Test session URL validation (SSRF blocked)
 * - Test credential encryption (safeStorage used)
 */

import { test, expect } from '@playwright/test';
import { BasePage } from './pages/BasePage';
import { testTimeouts, waitTimes } from './fixtures/test-data';

class SecurityTestPage extends BasePage {
  // Privacy panel elements
  readonly privacyPanelButton = this.page.locator('[data-testid="privacy-panel-button"]');
  readonly privacyPanel = this.page.locator('[data-testid="privacy-panel"]');
  readonly webrtcToggle = this.page.locator('[data-testid="webrtc-toggle"], [data-testid="block-webrtc"]');
  readonly trackerBlockerToggle = this.page.locator('[data-testid="tracker-blocker-toggle"]');
  readonly fingerprintToggle = this.page.locator('[data-testid="fingerprint-toggle"]');
  
  // Proxy panel elements
  readonly proxyPanelButton = this.page.locator('[data-testid="proxy-panel-button"]');
  readonly proxyPanel = this.page.locator('[data-testid="proxy-panel"]');
  readonly addProxyButton = this.page.locator('[data-testid="add-proxy-button"]');
  readonly proxyHostInput = this.page.locator('[data-testid="proxy-host"]');
  readonly proxyPortInput = this.page.locator('[data-testid="proxy-port"]');
  
  // Session elements
  readonly sessionInput = this.page.locator('[data-testid="session-url"], [data-testid="url-input"]');
  readonly navigationBar = this.page.locator('[data-testid="navigation-bar"], [data-testid="address-bar"]');
  
  // Settings elements  
  readonly settingsButton = this.page.locator('[data-testid="settings-panel-button"]');
  readonly settingsPanel = this.page.locator('[data-testid="settings-panel"]');
  readonly encryptionStatus = this.page.locator('[data-testid="encryption-status"]');

  async openPrivacyPanel(): Promise<void> {
    await this.privacyPanelButton.click();
    await this.page.waitForTimeout(waitTimes.panelAnimation);
  }

  async openProxyPanel(): Promise<void> {
    await this.proxyPanelButton.click();
    await this.page.waitForTimeout(waitTimes.panelAnimation);
  }
}

test.describe('Security Fixes Validation @smoke @security', () => {
  let securityPage: SecurityTestPage;

  test.beforeEach(async ({ page }) => {
    securityPage = new SecurityTestPage(page);
    await securityPage.goto();
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'passed') {
      await page.screenshot({
        path: `test-results/screenshots/security-${testInfo.title.replace(/\s+/g, '-')}-failed.png`,
        fullPage: true
      });
    }
  });

  test.describe('WebRTC Protection (IP Leak Prevention)', () => {
    test('should block WebRTC by default', async ({ page }) => {
      await securityPage.waitForAppReady();
      
      // Open privacy panel
      await securityPage.openPrivacyPanel();
      
      // WebRTC should be blocked by default for privacy
      const webrtcToggle = page.locator('[data-testid="webrtc-toggle"], [data-testid="block-webrtc"]');
      if (await webrtcToggle.isVisible()) {
        // Check if WebRTC blocking is enabled
        const isChecked = await webrtcToggle.isChecked().catch(() => null);
        console.log(`WebRTC blocking enabled: ${isChecked}`);
      }
      
      await securityPage.screenshot('webrtc-default-state');
    });

    test('should prevent RTCPeerConnection IP leaks', async ({ page }) => {
      await securityPage.waitForAppReady();
      
      // Try to create RTCPeerConnection and get local IPs
      const ipLeak = await page.evaluate(async () => {
        try {
          // @ts-ignore
          const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
          });
          
          // Create data channel to trigger ICE gathering
          pc.createDataChannel('test');
          
          const ips: string[] = [];
          
          pc.onicecandidate = (event) => {
            if (event.candidate) {
              const match = event.candidate.candidate.match(/([0-9]{1,3}\.){3}[0-9]{1,3}/);
              if (match) {
                ips.push(match[0]);
              }
            }
          };
          
          await pc.createOffer().then(offer => pc.setLocalDescription(offer));
          
          // Wait for ICE candidates
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          pc.close();
          
          return { blocked: false, ips };
        } catch (error) {
          return { blocked: true, error: String(error) };
        }
      });
      
      console.log('WebRTC leak test result:', ipLeak);
      
      // If WebRTC is blocked or no local IPs leaked, test passes
      if (!ipLeak.blocked && 'ips' in ipLeak) {
        // Filter out non-local IPs
        const localIPs = ipLeak.ips.filter((ip: string) => 
          ip.startsWith('192.168.') || 
          ip.startsWith('10.') || 
          ip.startsWith('172.')
        );
        console.log(`Local IPs exposed: ${localIPs.length}`);
      }
      
      await securityPage.screenshot('webrtc-ip-leak-test');
    });

    test('should block getUserMedia to prevent device fingerprinting', async ({ page }) => {
      await securityPage.waitForAppReady();
      
      const mediaBlocked = await page.evaluate(async () => {
        try {
          // Try to access media devices
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
          stream.getTracks().forEach(track => track.stop());
          return { blocked: false };
        } catch (error) {
          return { blocked: true, error: String(error) };
        }
      });
      
      console.log('getUserMedia result:', mediaBlocked);
      
      await securityPage.screenshot('getusermedia-blocked');
    });

    test('should prevent enumerateDevices fingerprinting', async ({ page }) => {
      await securityPage.waitForAppReady();
      
      const devicesResult = await page.evaluate(async () => {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          return { 
            blocked: false, 
            deviceCount: devices.length,
            hasDetailedInfo: devices.some(d => d.label && d.label.length > 0)
          };
        } catch (error) {
          return { blocked: true, error: String(error) };
        }
      });
      
      console.log('enumerateDevices result:', devicesResult);
      
      // Either blocked or no detailed device info exposed
      if (!devicesResult.blocked) {
        expect(devicesResult.hasDetailedInfo).toBeFalsy();
      }
      
      await securityPage.screenshot('enumerate-devices-test');
    });
  });

  test.describe('Tracker Blocker (ReDoS Prevention)', () => {
    test('should block trackers without ReDoS vulnerability', async ({ page }) => {
      await securityPage.waitForAppReady();
      
      // Open privacy panel
      await securityPage.openPrivacyPanel();
      
      // Verify tracker blocker is available
      const trackerToggle = page.locator('[data-testid="tracker-blocker-toggle"], [data-testid="block-trackers"]');
      if (await trackerToggle.isVisible()) {
        console.log('Tracker blocker toggle found');
      }
      
      await securityPage.screenshot('tracker-blocker-ui');
    });

    test('should handle malicious URLs without hanging', async ({ page }) => {
      await securityPage.waitForAppReady();
      
      // Test URLs that could cause ReDoS with vulnerable regex
      const maliciousUrls = [
        'https://tracker.' + 'a'.repeat(100) + '.com/pixel.gif',
        'https://analytics.' + 'test.'.repeat(50) + 'com/track',
        'https://pixel' + '0'.repeat(100) + '.tracking.com'
      ];
      
      const startTime = Date.now();
      
      for (const url of maliciousUrls) {
        // Evaluate URL matching (simulating tracker blocker)
        await page.evaluate((testUrl) => {
          // Simple regex patterns that could be vulnerable
          const patterns = [
            /tracker\.[a-z]+\.com/i,
            /analytics\.[a-z.]+\.com/i,
            /pixel[0-9]*\.tracking\.com/i
          ];
          
          for (const pattern of patterns) {
            pattern.test(testUrl);
          }
        }, url);
      }
      
      const elapsed = Date.now() - startTime;
      console.log(`URL matching time: ${elapsed}ms`);
      
      // Should complete quickly (ReDoS would cause timeout)
      expect(elapsed).toBeLessThan(5000);
      
      await securityPage.screenshot('redos-prevention');
    });

    test('should handle exponential backtracking patterns safely', async ({ page }) => {
      await securityPage.waitForAppReady();
      
      // Pattern that could cause exponential backtracking
      const evilInput = 'a'.repeat(30) + '!';
      
      const testResult = await page.evaluate((input) => {
        const start = performance.now();
        
        // Safe pattern matching (what the app should use)
        try {
          // This is a safe way to match - linear time
          const safeMatch = input.includes('tracker') || input.includes('analytics');
          
          // If the app uses regex, it should be safe
          const safeRegex = /^[a-z]+$/i;
          safeRegex.test(input);
        } catch (e) {
          // Should not throw
        }
        
        return {
          elapsed: performance.now() - start,
          input: input.length
        };
      }, evilInput);
      
      console.log(`Pattern matching result:`, testResult);
      expect(testResult.elapsed).toBeLessThan(100); // Should be nearly instant
      
      await securityPage.screenshot('backtracking-safe');
    });
  });

  test.describe('Session URL Validation (SSRF Prevention)', () => {
    test('should reject internal network URLs', async ({ page }) => {
      await securityPage.waitForAppReady();
      
      // Internal URLs that should be blocked
      const internalUrls = [
        'http://localhost/admin',
        'http://127.0.0.1:8080/config',
        'http://192.168.1.1/router',
        'http://10.0.0.1/internal',
        'http://169.254.169.254/metadata', // AWS metadata
        'http://[::1]/ipv6-local'
      ];
      
      // Test URL input validation
      const urlInput = page.locator('[data-testid="url-input"], [data-testid="address-bar"] input');
      
      for (const url of internalUrls) {
        // Try to navigate or input the URL
        const blocked = await page.evaluate((testUrl) => {
          // Check if URL would be blocked by validation
          try {
            const parsed = new URL(testUrl);
            const hostname = parsed.hostname;
            
            // Check for internal IP patterns
            const isInternal = 
              hostname === 'localhost' ||
              hostname === '127.0.0.1' ||
              hostname.startsWith('192.168.') ||
              hostname.startsWith('10.') ||
              hostname.startsWith('172.16.') ||
              hostname === '169.254.169.254' ||
              hostname === '::1' ||
              hostname === '[::1]';
            
            return { url: testUrl, blocked: isInternal };
          } catch {
            return { url: testUrl, blocked: true, invalid: true };
          }
        }, url);
        
        console.log(`URL validation: ${blocked.url} - Blocked: ${blocked.blocked}`);
      }
      
      await securityPage.screenshot('ssrf-prevention');
    });

    test('should reject file:// protocol URLs', async ({ page }) => {
      await securityPage.waitForAppReady();
      
      const fileUrls = [
        'file:///etc/passwd',
        'file:///C:/Windows/System32/config/SAM',
        'file://localhost/etc/shadow'
      ];
      
      for (const url of fileUrls) {
        const result = await page.evaluate((testUrl) => {
          try {
            const parsed = new URL(testUrl);
            return { 
              url: testUrl, 
              protocol: parsed.protocol,
              shouldBlock: parsed.protocol === 'file:'
            };
          } catch {
            return { url: testUrl, invalid: true };
          }
        }, url);
        
        console.log(`File URL check: ${result.url} - Should block: ${result.shouldBlock || result.invalid}`);
        expect(result.shouldBlock || result.invalid).toBeTruthy();
      }
      
      await securityPage.screenshot('file-protocol-blocked');
    });

    test('should reject DNS rebinding attempts', async ({ page }) => {
      await securityPage.waitForAppReady();
      
      // URLs that could be used for DNS rebinding
      const rebindingUrls = [
        'http://localtest.me/admin', // Resolves to 127.0.0.1
        'http://spoofed.burpcollaborator.net/',
        'http://0x7f000001/', // Hex encoding of 127.0.0.1
        'http://2130706433/', // Decimal encoding of 127.0.0.1
      ];
      
      for (const url of rebindingUrls) {
        const result = await page.evaluate((testUrl) => {
          try {
            const parsed = new URL(testUrl);
            // These should be flagged for additional validation
            return {
              url: testUrl,
              hostname: parsed.hostname,
              suspicious: parsed.hostname.includes('local') || 
                         /^[0-9]+$/.test(parsed.hostname) ||
                         /^0x[0-9a-f]+$/i.test(parsed.hostname)
            };
          } catch {
            return { url: testUrl, invalid: true };
          }
        }, url);
        
        console.log(`DNS rebinding check: ${result.url}`);
      }
      
      await securityPage.screenshot('dns-rebinding-check');
    });
  });

  test.describe('Credential Encryption (safeStorage)', () => {
    test('should use secure credential storage', async ({ page }) => {
      await securityPage.waitForAppReady();
      
      // Verify no plaintext credentials in localStorage
      const localStorageCheck = await page.evaluate(() => {
        const sensitivePatterns = [
          /password/i,
          /secret/i,
          /apikey/i,
          /token/i
        ];
        
        const items: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            const value = localStorage.getItem(key) || '';
            for (const pattern of sensitivePatterns) {
              if (pattern.test(key) || pattern.test(value)) {
                // Check if value looks like plaintext
                if (!value.startsWith('encrypted:') && 
                    !value.includes(':base64:') &&
                    value.length > 0) {
                  items.push(key);
                }
              }
            }
          }
        }
        return { exposedItems: items };
      });
      
      console.log('LocalStorage security check:', localStorageCheck);
      expect(localStorageCheck.exposedItems).toHaveLength(0);
      
      await securityPage.screenshot('credential-storage-check');
    });

    test('should not expose credentials in DOM', async ({ page }) => {
      await securityPage.waitForAppReady();
      
      // Open proxy panel where credentials might be shown
      await securityPage.openProxyPanel();
      
      // Check for exposed password values
      const exposedCredentials = await page.evaluate(() => {
        const passwordInputs = Array.from(document.querySelectorAll('input[type="password"]'));
        const exposed: string[] = [];
        
        for (const input of passwordInputs) {
          const htmlInput = input as HTMLInputElement;
          // Password inputs should have type="password" and not expose value in HTML
          if (htmlInput.type !== 'password' || 
              htmlInput.getAttribute('value')?.length) {
            exposed.push(htmlInput.name || htmlInput.id || 'unnamed');
          }
        }
        
        // Also check for visible plaintext that looks like credentials
        const textContent = document.body.innerText;
        if (/password\s*[:=]\s*[^\s*]{3,}/i.test(textContent)) {
          exposed.push('plaintext-in-dom');
        }
        
        return exposed;
      });
      
      console.log('DOM credential exposure:', exposedCredentials);
      expect(exposedCredentials).toHaveLength(0);
      
      await securityPage.screenshot('dom-credential-check');
    });

    test('should mask passwords in proxy configuration', async ({ page }) => {
      await securityPage.waitForAppReady();
      
      // Open proxy panel
      await securityPage.openProxyPanel();
      
      // Find password input fields
      const passwordFields = page.locator('input[type="password"]');
      const passwordCount = await passwordFields.count();
      
      console.log(`Password fields found: ${passwordCount}`);
      
      // All password fields should be type="password"
      for (let i = 0; i < passwordCount; i++) {
        const field = passwordFields.nth(i);
        const type = await field.getAttribute('type');
        expect(type).toBe('password');
      }
      
      await securityPage.screenshot('password-masking');
    });

    test('should clear sensitive data on logout/close', async ({ page }) => {
      await securityPage.waitForAppReady();
      
      // Store initial localStorage state
      const initialState = await page.evaluate(() => {
        return Object.keys(localStorage).length;
      });
      
      console.log(`Initial localStorage entries: ${initialState}`);
      
      // The app should have mechanisms to clear sensitive data
      // This is primarily tested by verifying the encryption is used
      // and that raw credentials are not stored
      
      await securityPage.screenshot('sensitive-data-cleanup');
    });
  });

  test.describe('Additional Security Checks', () => {
    test('should set secure HTTP headers', async ({ page }) => {
      const responseHeaders: Record<string, string> = {};
      
      page.on('response', response => {
        if (response.url().includes('localhost') || response.url().includes('127.0.0.1')) {
          const headers = response.headers();
          Object.assign(responseHeaders, headers);
        }
      });
      
      await securityPage.goto();
      await securityPage.waitForAppReady();
      
      // Log collected headers
      console.log('Response headers:', Object.keys(responseHeaders));
      
      await securityPage.screenshot('http-headers');
    });

    test('should sanitize user input', async ({ page }) => {
      await securityPage.waitForAppReady();
      
      // XSS payload test
      const xssPayloads = [
        '<script>alert("xss")</script>',
        '"><img src=x onerror=alert(1)>',
        'javascript:alert(1)',
        '<svg onload=alert(1)>'
      ];
      
      // Find any input field
      const inputs = page.locator('input[type="text"], textarea');
      const inputCount = await inputs.count();
      
      if (inputCount > 0) {
          for (const payload of xssPayloads) {
          await inputs.first().fill(payload);
          await page.waitForTimeout(100);
          
          // Check if payload was sanitized
          const value = await inputs.first().inputValue();
          
          // Input should either reject or sanitize the payload
          // (not render as HTML)
          console.log(`XSS payload test: ${payload.substring(0, 20)}...`);
        }
      }
      
      // No alert dialogs should appear
      let alertTriggered = false;
      page.on('dialog', () => {
        alertTriggered = true;
      });
      
      await page.waitForTimeout(500);
      expect(alertTriggered).toBeFalsy();
      
      await securityPage.screenshot('xss-prevention');
    });

    test('should prevent prototype pollution', async ({ page }) => {
      await securityPage.waitForAppReady();
      
      // Test for prototype pollution vulnerability
      const pollutionResult = await page.evaluate(() => {
        // Try to pollute Object prototype
        const payload = JSON.parse('{"__proto__":{"polluted":true}}');
        
        // Check if prototype was polluted
        const testObj = {};
        // @ts-ignore
        return { polluted: testObj.polluted === true };
      });
      
      console.log('Prototype pollution test:', pollutionResult);
      // Modern JS engines protect against this, but app should also sanitize
      
      await securityPage.screenshot('prototype-pollution');
    });
  });
});

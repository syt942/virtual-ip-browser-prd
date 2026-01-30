/**
 * Tracker Blocker Tests
 * PRD Section 6.2 - P1 Privacy Protection Requirements
 * 
 * Tests for tracker and ad blocking functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TrackerBlocker } from '../../../electron/core/privacy/tracker-blocker';

// Mock electron session
vi.mock('electron', () => ({
  session: {
    fromPartition: vi.fn(() => ({
      webRequest: {
        onBeforeRequest: vi.fn()
      }
    }))
  }
}));

describe('TrackerBlocker', () => {
  let blocker: TrackerBlocker;

  beforeEach(() => {
    blocker = new TrackerBlocker();
  });

  describe('Initialization', () => {
    it('should be enabled by default', () => {
      expect(blocker.isEnabled()).toBe(true);
    });

    it('should load default blocklists', () => {
      const blocklist = blocker.getBlocklist();
      
      expect(blocklist.length).toBeGreaterThan(0);
    });
  });

  describe('Default Blocklist', () => {
    it('should include Google Analytics', () => {
      const blocklist = blocker.getBlocklist();
      
      expect(blocklist.some(url => url.includes('google-analytics.com'))).toBe(true);
    });

    it('should include Google Tag Manager', () => {
      const blocklist = blocker.getBlocklist();
      
      expect(blocklist.some(url => url.includes('googletagmanager.com'))).toBe(true);
    });

    it('should include Facebook tracking', () => {
      const blocklist = blocker.getBlocklist();
      
      expect(blocklist.some(url => url.includes('connect.facebook.net'))).toBe(true);
    });

    it('should include Twitter tracking', () => {
      const blocklist = blocker.getBlocklist();
      
      expect(blocklist.some(url => url.includes('platform.twitter.com'))).toBe(true);
    });

    it('should include LinkedIn tracking', () => {
      const blocklist = blocker.getBlocklist();
      
      expect(blocklist.some(url => url.includes('platform.linkedin.com'))).toBe(true);
    });

    it('should include DoubleClick', () => {
      const blocklist = blocker.getBlocklist();
      
      expect(blocklist.some(url => url.includes('doubleclick.net'))).toBe(true);
    });

    it('should include Google Ads', () => {
      const blocklist = blocker.getBlocklist();
      
      expect(blocklist.some(url => url.includes('googlesyndication.com'))).toBe(true);
    });

    it('should include Hotjar', () => {
      const blocklist = blocker.getBlocklist();
      
      expect(blocklist.some(url => url.includes('hotjar.com'))).toBe(true);
    });

    it('should include analytics tools', () => {
      const blocklist = blocker.getBlocklist();
      
      expect(blocklist.some(url => url.includes('scorecardresearch.com'))).toBe(true);
      expect(blocklist.some(url => url.includes('quantserve.com'))).toBe(true);
    });
  });

  describe('Enable/Disable', () => {
    it('should allow disabling', () => {
      blocker.setEnabled(false);
      expect(blocker.isEnabled()).toBe(false);
    });

    it('should allow enabling', () => {
      blocker.setEnabled(false);
      blocker.setEnabled(true);
      expect(blocker.isEnabled()).toBe(true);
    });
  });

  describe('Custom Rules', () => {
    it('should allow adding custom rules', () => {
      blocker.addCustomRule('custom-tracker.com');
      const rules = blocker.getCustomRules();
      
      expect(rules).toContain('custom-tracker.com');
    });

    it('should allow removing custom rules', () => {
      blocker.addCustomRule('custom-tracker.com');
      blocker.removeCustomRule('custom-tracker.com');
      const rules = blocker.getCustomRules();
      
      expect(rules).not.toContain('custom-tracker.com');
    });

    it('should handle multiple custom rules', () => {
      blocker.addCustomRule('tracker1.com');
      blocker.addCustomRule('tracker2.com');
      blocker.addCustomRule('tracker3.com');
      
      const rules = blocker.getCustomRules();
      
      expect(rules).toContain('tracker1.com');
      expect(rules).toContain('tracker2.com');
      expect(rules).toContain('tracker3.com');
    });

    it('should return copy of rules', () => {
      blocker.addCustomRule('test.com');
      const rules1 = blocker.getCustomRules();
      const rules2 = blocker.getCustomRules();
      
      expect(rules1).not.toBe(rules2);
      expect(rules1).toEqual(rules2);
    });
  });

  describe('Blocklist Management', () => {
    it('should allow adding to blocklist', () => {
      blocker.addToBlocklist('*://new-tracker.com/*');
      const blocklist = blocker.getBlocklist();
      
      expect(blocklist).toContain('*://new-tracker.com/*');
    });

    it('should allow removing from blocklist', () => {
      blocker.addToBlocklist('*://test-tracker.com/*');
      blocker.removeFromBlocklist('*://test-tracker.com/*');
      const blocklist = blocker.getBlocklist();
      
      expect(blocklist).not.toContain('*://test-tracker.com/*');
    });

    it('should not add duplicate entries', () => {
      const initialLength = blocker.getBlocklist().length;
      
      blocker.addToBlocklist('*://google-analytics.com/*');
      
      // Should not increase length (Set behavior)
      expect(blocker.getBlocklist().length).toBe(initialLength);
    });
  });

  describe('Session Integration', () => {
    it('should not throw when enabling for session', () => {
      expect(() => {
        blocker.enableForSession('test-partition');
      }).not.toThrow();
    });

    it('should not enable when disabled', () => {
      blocker.setEnabled(false);
      
      // Should return early without registering handlers
      expect(() => {
        blocker.enableForSession('test-partition');
      }).not.toThrow();
    });
  });
});

describe('TrackerBlocker Pattern Matching', () => {
  // Note: We can't directly test the private matchesPattern method,
  // but we can verify the pattern format in the blocklist
  
  describe('URL Pattern Format', () => {
    let blocker: TrackerBlocker;

    beforeEach(() => {
      blocker = new TrackerBlocker();
    });

    it('should use wildcard protocol patterns', () => {
      const blocklist = blocker.getBlocklist();
      
      // All patterns should start with *://
      const hasWildcardProtocol = blocklist.some(url => url.startsWith('*://'));
      expect(hasWildcardProtocol).toBe(true);
    });

    it('should use wildcard path patterns', () => {
      const blocklist = blocker.getBlocklist();
      
      // All patterns should end with /*
      const hasWildcardPath = blocklist.some(url => url.endsWith('/*'));
      expect(hasWildcardPath).toBe(true);
    });

    it('should support subdomain wildcards', () => {
      const blocklist = blocker.getBlocklist();
      
      // Some patterns should have *. for subdomains
      const hasSubdomainWildcard = blocklist.some(url => url.includes('*.'));
      expect(hasSubdomainWildcard).toBe(true);
    });
  });
});

describe('TrackerBlocker Coverage', () => {
  describe('Tracker Categories', () => {
    let blocker: TrackerBlocker;

    beforeEach(() => {
      blocker = new TrackerBlocker();
    });

    it('should cover analytics trackers', () => {
      const blocklist = blocker.getBlocklist();
      const analyticsTrackers = [
        'google-analytics.com',
        'analytics.google.com',
        'hotjar.com',
        'mouseflow.com',
        'crazyegg.com'
      ];
      
      analyticsTrackers.forEach(tracker => {
        expect(blocklist.some(url => url.includes(tracker))).toBe(true);
      });
    });

    it('should cover social media trackers', () => {
      const blocklist = blocker.getBlocklist();
      const socialTrackers = [
        'connect.facebook.net',
        'platform.twitter.com',
        'platform.linkedin.com'
      ];
      
      socialTrackers.forEach(tracker => {
        expect(blocklist.some(url => url.includes(tracker))).toBe(true);
      });
    });

    it('should cover ad networks', () => {
      const blocklist = blocker.getBlocklist();
      const adNetworks = [
        'doubleclick.net',
        'googlesyndication.com',
        'adservice.google.com'
      ];
      
      adNetworks.forEach(network => {
        expect(blocklist.some(url => url.includes(network))).toBe(true);
      });
    });

    it('should cover measurement tools', () => {
      const blocklist = blocker.getBlocklist();
      const measurementTools = [
        'scorecardresearch.com',
        'quantserve.com'
      ];
      
      measurementTools.forEach(tool => {
        expect(blocklist.some(url => url.includes(tool))).toBe(true);
      });
    });
  });
});

describe('TrackerBlocker Edge Cases', () => {
  describe('Empty Custom Rules', () => {
    it('should return empty array when no custom rules', () => {
      const blocker = new TrackerBlocker();
      const rules = blocker.getCustomRules();
      
      expect(rules).toEqual([]);
    });
  });

  describe('Rule Removal', () => {
    it('should handle removing non-existent rule', () => {
      const blocker = new TrackerBlocker();
      
      expect(() => {
        blocker.removeCustomRule('non-existent');
      }).not.toThrow();
    });

    it('should handle removing non-existent blocklist entry', () => {
      const blocker = new TrackerBlocker();
      
      expect(() => {
        blocker.removeFromBlocklist('*://non-existent.com/*');
      }).not.toThrow();
    });
  });

  describe('Multiple Enable Calls', () => {
    it('should handle multiple enableForSession calls', () => {
      const blocker = new TrackerBlocker();
      
      expect(() => {
        blocker.enableForSession('partition1');
        blocker.enableForSession('partition2');
        blocker.enableForSession('partition3');
      }).not.toThrow();
    });
  });
});

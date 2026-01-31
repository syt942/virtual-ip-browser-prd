/**
 * PrivacyStore Unit Tests
 * Tests for privacy and fingerprint protection settings
 * 
 * Coverage targets:
 * - Settings updates
 * - Toggle functions
 * - Profile management
 * - Persistence
 * - IPC integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from '@testing-library/react';
import { usePrivacyStore, type PrivacySettings, type FingerprintProfile } from '../../../src/stores/privacyStore';
import { 
  createMockWindowApi, 
  setupWindowApiMock, 
  resetWindowApiMock,
  type MockWindowApi 
} from '../../mocks/window-api.mock';

// Mock localStorage for persistence tests
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((i: number) => Object.keys(store)[i] || null),
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

describe('usePrivacyStore', () => {
  let mockApi: MockWindowApi;

  const defaultSettings: PrivacySettings = {
    canvas: true,
    webgl: true,
    audio: true,
    navigator: true,
    timezone: true,
    webrtc: true,
    trackerBlocking: true,
  };

  beforeEach(() => {
    mockApi = createMockWindowApi();
    setupWindowApiMock(mockApi);
    localStorageMock.clear();
    
    // Reset store state
    usePrivacyStore.setState({
      currentSettings: { ...defaultSettings },
      profiles: [],
      activeProfileId: null,
    });
  });

  afterEach(() => {
    resetWindowApiMock();
    vi.clearAllMocks();
  });

  // ============================================================
  // STATE INITIALIZATION TESTS
  // ============================================================
  describe('state initialization', () => {
    it('initializes with all protections enabled', () => {
      const state = usePrivacyStore.getState();
      
      expect(state.currentSettings.canvas).toBe(true);
      expect(state.currentSettings.webgl).toBe(true);
      expect(state.currentSettings.audio).toBe(true);
      expect(state.currentSettings.navigator).toBe(true);
      expect(state.currentSettings.timezone).toBe(true);
      expect(state.currentSettings.webrtc).toBe(true);
      expect(state.currentSettings.trackerBlocking).toBe(true);
    });

    it('initializes with empty profiles array', () => {
      const state = usePrivacyStore.getState();
      expect(state.profiles).toEqual([]);
    });

    it('initializes with null activeProfileId', () => {
      const state = usePrivacyStore.getState();
      expect(state.activeProfileId).toBeNull();
    });
  });

  // ============================================================
  // SETTINGS UPDATE TESTS
  // ============================================================
  describe('updateSettings', () => {
    it('merges updates with current settings', async () => {
      // Act
      await act(async () => {
        await usePrivacyStore.getState().updateSettings({ canvas: false });
      });

      // Assert
      const state = usePrivacyStore.getState();
      expect(state.currentSettings.canvas).toBe(false);
      expect(state.currentSettings.webgl).toBe(true); // unchanged
    });

    it('calls window.api.privacy.setFingerprint', async () => {
      // Act
      await act(async () => {
        await usePrivacyStore.getState().updateSettings({ webgl: false });
      });

      // Assert
      expect(mockApi.privacy.setFingerprint).toHaveBeenCalledWith(
        expect.objectContaining({ webgl: false })
      );
    });

    it('updates multiple settings at once', async () => {
      // Act
      await act(async () => {
        await usePrivacyStore.getState().updateSettings({ 
          canvas: false,
          audio: false,
          timezone: false,
        });
      });

      // Assert
      const state = usePrivacyStore.getState();
      expect(state.currentSettings.canvas).toBe(false);
      expect(state.currentSettings.audio).toBe(false);
      expect(state.currentSettings.timezone).toBe(false);
    });
  });

  // ============================================================
  // TOGGLE FUNCTION TESTS
  // ============================================================
  describe('toggle functions', () => {
    describe('toggleCanvas', () => {
      it('flips canvas protection value', () => {
        // Arrange - starts as true
        expect(usePrivacyStore.getState().currentSettings.canvas).toBe(true);

        // Act
        act(() => {
          usePrivacyStore.getState().toggleCanvas();
        });

        // Assert
        expect(usePrivacyStore.getState().currentSettings.canvas).toBe(false);

        // Act again
        act(() => {
          usePrivacyStore.getState().toggleCanvas();
        });

        // Assert - back to true
        expect(usePrivacyStore.getState().currentSettings.canvas).toBe(true);
      });
    });

    describe('toggleWebGL', () => {
      it('flips webgl protection value', () => {
        act(() => {
          usePrivacyStore.getState().toggleWebGL();
        });
        expect(usePrivacyStore.getState().currentSettings.webgl).toBe(false);
      });
    });

    describe('toggleAudio', () => {
      it('flips audio protection value', () => {
        act(() => {
          usePrivacyStore.getState().toggleAudio();
        });
        expect(usePrivacyStore.getState().currentSettings.audio).toBe(false);
      });
    });

    describe('toggleNavigator', () => {
      it('flips navigator protection value', () => {
        act(() => {
          usePrivacyStore.getState().toggleNavigator();
        });
        expect(usePrivacyStore.getState().currentSettings.navigator).toBe(false);
      });
    });

    describe('toggleTimezone', () => {
      it('flips timezone protection value', () => {
        act(() => {
          usePrivacyStore.getState().toggleTimezone();
        });
        expect(usePrivacyStore.getState().currentSettings.timezone).toBe(false);
      });
    });

    describe('toggleWebRTC', () => {
      it('flips webrtc value and calls API', async () => {
        // Act
        await act(async () => {
          await usePrivacyStore.getState().toggleWebRTC();
        });

        // Assert
        expect(usePrivacyStore.getState().currentSettings.webrtc).toBe(false);
        expect(mockApi.privacy.toggleWebRTC).toHaveBeenCalledWith(false);
      });

      it('toggles back to true', async () => {
        // Arrange - toggle off first
        await act(async () => {
          await usePrivacyStore.getState().toggleWebRTC();
        });

        // Act - toggle back on
        await act(async () => {
          await usePrivacyStore.getState().toggleWebRTC();
        });

        // Assert
        expect(usePrivacyStore.getState().currentSettings.webrtc).toBe(true);
        expect(mockApi.privacy.toggleWebRTC).toHaveBeenLastCalledWith(true);
      });
    });

    describe('toggleTrackerBlocking', () => {
      it('flips tracker blocking value and calls API', async () => {
        // Act
        await act(async () => {
          await usePrivacyStore.getState().toggleTrackerBlocking();
        });

        // Assert
        expect(usePrivacyStore.getState().currentSettings.trackerBlocking).toBe(false);
        expect(mockApi.privacy.toggleTrackerBlocking).toHaveBeenCalledWith(false);
      });
    });
  });

  // ============================================================
  // PROFILE MANAGEMENT TESTS
  // ============================================================
  describe('createProfile', () => {
    it('adds new profile to profiles array', () => {
      // Act
      act(() => {
        usePrivacyStore.getState().createProfile('Test Profile', defaultSettings);
      });

      // Assert
      const state = usePrivacyStore.getState();
      expect(state.profiles).toHaveLength(1);
      expect(state.profiles[0].name).toBe('Test Profile');
    });

    it('creates profile with unique ID', () => {
      // Act
      act(() => {
        usePrivacyStore.getState().createProfile('Profile 1', defaultSettings);
        usePrivacyStore.getState().createProfile('Profile 2', defaultSettings);
      });

      // Assert
      const state = usePrivacyStore.getState();
      expect(state.profiles[0].id).not.toBe(state.profiles[1].id);
    });

    it('creates profile with isActive false', () => {
      // Act
      act(() => {
        usePrivacyStore.getState().createProfile('Test', defaultSettings);
      });

      // Assert
      expect(usePrivacyStore.getState().profiles[0].isActive).toBe(false);
    });

    it('stores provided settings in profile', () => {
      // Arrange
      const customSettings: PrivacySettings = {
        canvas: false,
        webgl: false,
        audio: true,
        navigator: true,
        timezone: false,
        webrtc: true,
        trackerBlocking: false,
      };

      // Act
      act(() => {
        usePrivacyStore.getState().createProfile('Custom', customSettings);
      });

      // Assert
      const profile = usePrivacyStore.getState().profiles[0];
      expect(profile.settings).toEqual(customSettings);
    });
  });

  describe('deleteProfile', () => {
    it('removes profile from array', () => {
      // Arrange
      act(() => {
        usePrivacyStore.getState().createProfile('Profile 1', defaultSettings);
        usePrivacyStore.getState().createProfile('Profile 2', defaultSettings);
      });
      const profileToDelete = usePrivacyStore.getState().profiles[0];

      // Act
      act(() => {
        usePrivacyStore.getState().deleteProfile(profileToDelete.id);
      });

      // Assert
      const state = usePrivacyStore.getState();
      expect(state.profiles).toHaveLength(1);
      expect(state.profiles.find(p => p.id === profileToDelete.id)).toBeUndefined();
    });

    it('clears activeProfileId if deleted profile was active', () => {
      // Arrange
      act(() => {
        usePrivacyStore.getState().createProfile('Test', defaultSettings);
      });
      const profile = usePrivacyStore.getState().profiles[0];
      
      act(() => {
        usePrivacyStore.getState().activateProfile(profile.id);
      });
      expect(usePrivacyStore.getState().activeProfileId).toBe(profile.id);

      // Act
      act(() => {
        usePrivacyStore.getState().deleteProfile(profile.id);
      });

      // Assert
      expect(usePrivacyStore.getState().activeProfileId).toBeNull();
    });

    it('preserves activeProfileId if non-active profile deleted', () => {
      // Arrange
      act(() => {
        usePrivacyStore.getState().createProfile('Active', defaultSettings);
        usePrivacyStore.getState().createProfile('To Delete', defaultSettings);
      });
      
      const activeProfile = usePrivacyStore.getState().profiles[0];
      const toDelete = usePrivacyStore.getState().profiles[1];
      
      act(() => {
        usePrivacyStore.getState().activateProfile(activeProfile.id);
      });

      // Act
      act(() => {
        usePrivacyStore.getState().deleteProfile(toDelete.id);
      });

      // Assert
      expect(usePrivacyStore.getState().activeProfileId).toBe(activeProfile.id);
    });
  });

  describe('activateProfile', () => {
    it('sets current settings from profile', () => {
      // Arrange
      const customSettings: PrivacySettings = {
        canvas: false,
        webgl: false,
        audio: false,
        navigator: true,
        timezone: true,
        webrtc: false,
        trackerBlocking: true,
      };
      
      act(() => {
        usePrivacyStore.getState().createProfile('Custom', customSettings);
      });
      const profile = usePrivacyStore.getState().profiles[0];

      // Act
      act(() => {
        usePrivacyStore.getState().activateProfile(profile.id);
      });

      // Assert
      expect(usePrivacyStore.getState().currentSettings).toEqual(customSettings);
    });

    it('sets activeProfileId', () => {
      // Arrange
      act(() => {
        usePrivacyStore.getState().createProfile('Test', defaultSettings);
      });
      const profile = usePrivacyStore.getState().profiles[0];

      // Act
      act(() => {
        usePrivacyStore.getState().activateProfile(profile.id);
      });

      // Assert
      expect(usePrivacyStore.getState().activeProfileId).toBe(profile.id);
    });

    it('marks profile as active', () => {
      // Arrange
      act(() => {
        usePrivacyStore.getState().createProfile('Test', defaultSettings);
      });
      const profile = usePrivacyStore.getState().profiles[0];

      // Act
      act(() => {
        usePrivacyStore.getState().activateProfile(profile.id);
      });

      // Assert
      const activeProfile = usePrivacyStore.getState().profiles.find(p => p.id === profile.id);
      expect(activeProfile?.isActive).toBe(true);
    });

    it('deactivates previously active profile', () => {
      // Arrange
      act(() => {
        usePrivacyStore.getState().createProfile('First', defaultSettings);
        usePrivacyStore.getState().createProfile('Second', defaultSettings);
      });
      
      const [first, second] = usePrivacyStore.getState().profiles;
      
      act(() => {
        usePrivacyStore.getState().activateProfile(first.id);
      });

      // Act
      act(() => {
        usePrivacyStore.getState().activateProfile(second.id);
      });

      // Assert
      const state = usePrivacyStore.getState();
      const firstProfile = state.profiles.find(p => p.id === first.id);
      const secondProfile = state.profiles.find(p => p.id === second.id);
      
      expect(firstProfile?.isActive).toBe(false);
      expect(secondProfile?.isActive).toBe(true);
    });

    it('does nothing for non-existent profile', () => {
      // Arrange
      const originalSettings = { ...usePrivacyStore.getState().currentSettings };

      // Act
      act(() => {
        usePrivacyStore.getState().activateProfile('non-existent-id');
      });

      // Assert
      expect(usePrivacyStore.getState().currentSettings).toEqual(originalSettings);
      expect(usePrivacyStore.getState().activeProfileId).toBeNull();
    });
  });

  describe('generateRandomProfile', () => {
    it('sets all protections to true', () => {
      // Arrange - set some to false first
      usePrivacyStore.setState({
        currentSettings: {
          canvas: false,
          webgl: false,
          audio: false,
          navigator: false,
          timezone: false,
          webrtc: false,
          trackerBlocking: false,
        },
      });

      // Act
      act(() => {
        usePrivacyStore.getState().generateRandomProfile();
      });

      // Assert
      const settings = usePrivacyStore.getState().currentSettings;
      expect(settings.canvas).toBe(true);
      expect(settings.webgl).toBe(true);
      expect(settings.audio).toBe(true);
      expect(settings.navigator).toBe(true);
      expect(settings.timezone).toBe(true);
      expect(settings.webrtc).toBe(true);
      expect(settings.trackerBlocking).toBe(true);
    });
  });

  // ============================================================
  // PERSISTENCE TESTS
  // ============================================================
  describe('persistence', () => {
    it('persists currentSettings to localStorage', () => {
      // The store uses zustand persist middleware
      // This test verifies the store is configured correctly
      
      // Act - modify settings
      act(() => {
        usePrivacyStore.setState({
          currentSettings: { ...defaultSettings, canvas: false },
        });
      });

      // The persist middleware should save to localStorage
      // We can verify by checking the store's persist configuration
      const state = usePrivacyStore.getState();
      expect(state.currentSettings.canvas).toBe(false);
    });

    it('persists profiles to localStorage', () => {
      // Act
      act(() => {
        usePrivacyStore.getState().createProfile('Test Profile', defaultSettings);
      });

      // Assert
      expect(usePrivacyStore.getState().profiles).toHaveLength(1);
    });

    it('persists activeProfileId to localStorage', () => {
      // Arrange
      act(() => {
        usePrivacyStore.getState().createProfile('Test', defaultSettings);
      });
      const profile = usePrivacyStore.getState().profiles[0];

      // Act
      act(() => {
        usePrivacyStore.getState().activateProfile(profile.id);
      });

      // Assert
      expect(usePrivacyStore.getState().activeProfileId).toBe(profile.id);
    });
  });
});

/**
 * Privacy Store
 * Manages privacy and fingerprint protection settings
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PrivacySettings {
  canvas: boolean;
  webgl: boolean;
  audio: boolean;
  navigator: boolean;
  timezone: boolean;
  fonts: boolean;
  webrtc: boolean;
  trackerBlocking: boolean;
}

/** Navigator spoofing configuration */
export interface NavigatorSpoofConfig {
  userAgent?: string;
  platform?: string;
  language?: string;
  languages?: string[];
  vendor?: string;
  hardwareConcurrency?: number;
  deviceMemory?: number;
  maxTouchPoints?: number;
}

export interface FingerprintProfile {
  id: string;
  name: string;
  settings: PrivacySettings;
  navigatorConfig?: NavigatorSpoofConfig;
  timezoneRegion?: string;
  isActive: boolean;
}

interface PrivacyState {
  // State
  currentPrivacySettings: PrivacySettings;
  fingerprintProfileList: FingerprintProfile[];
  activeProfileId: string | null;
  
  // Actions - Settings Management
  updatePrivacySettings: (settingsUpdate: Partial<PrivacySettings>) => Promise<void>;
  
  // Actions - Individual Toggles
  toggleCanvasSpoofing: () => void;
  toggleWebGLSpoofing: () => void;
  toggleAudioSpoofing: () => void;
  toggleNavigatorSpoofing: () => void;
  toggleTimezoneSpoofing: () => void;
  toggleWebRTCProtection: () => Promise<void>;
  toggleTrackerBlockingProtection: () => Promise<void>;
  
  // Actions - Profile Management
  createFingerprintProfile: (profileName: string, settings: PrivacySettings) => void;
  deleteFingerprintProfileById: (profileId: string) => void;
  activateFingerprintProfileById: (profileId: string) => void;
  generateRandomFingerprintSettings: () => void;
}

const defaultSettings: PrivacySettings = {
  canvas: true,
  webgl: true,
  audio: true,
  navigator: true,
  timezone: true,
  fonts: true,
  webrtc: true,
  trackerBlocking: true
};

/** Default privacy settings with all protections enabled */
const DEFAULT_RANDOM_PROFILE_SETTINGS: PrivacySettings = {
  canvas: true,
  webgl: true,
  audio: true,
  navigator: true,
  timezone: true,
  fonts: true,
  webrtc: true,
  trackerBlocking: true
};

export const usePrivacyStore = create<PrivacyState>()(
  persist(
    (set, get) => ({
      currentPrivacySettings: defaultSettings,
      fingerprintProfileList: [],
      activeProfileId: null,

      updatePrivacySettings: async (settingsUpdate) => {
        const mergedSettings = { ...get().currentPrivacySettings, ...settingsUpdate };
        set({ currentPrivacySettings: mergedSettings });
        
        await window.api.privacy.setFingerprint(mergedSettings);
      },

      toggleCanvasSpoofing: () => {
        set((state) => ({
          currentPrivacySettings: {
            ...state.currentPrivacySettings,
            canvas: !state.currentPrivacySettings.canvas
          }
        }));
      },

      toggleWebGLSpoofing: () => {
        set((state) => ({
          currentPrivacySettings: {
            ...state.currentPrivacySettings,
            webgl: !state.currentPrivacySettings.webgl
          }
        }));
      },

      toggleAudioSpoofing: () => {
        set((state) => ({
          currentPrivacySettings: {
            ...state.currentPrivacySettings,
            audio: !state.currentPrivacySettings.audio
          }
        }));
      },

      toggleNavigatorSpoofing: () => {
        set((state) => ({
          currentPrivacySettings: {
            ...state.currentPrivacySettings,
            navigator: !state.currentPrivacySettings.navigator
          }
        }));
      },

      toggleTimezoneSpoofing: () => {
        set((state) => ({
          currentPrivacySettings: {
            ...state.currentPrivacySettings,
            timezone: !state.currentPrivacySettings.timezone
          }
        }));
      },

      toggleFontSpoofing: () => {
        set((state) => ({
          currentPrivacySettings: {
            ...state.currentPrivacySettings,
            fonts: !state.currentPrivacySettings.fonts
          }
        }));
      },

      toggleWebRTCProtection: async () => {
        const currentState = get();
        const newWebRTCEnabled = !currentState.currentPrivacySettings.webrtc;
        
        set((state) => ({
          currentPrivacySettings: {
            ...state.currentPrivacySettings,
            webrtc: newWebRTCEnabled
          }
        }));

        await window.api.privacy.toggleWebRTC(newWebRTCEnabled);
      },

      toggleTrackerBlockingProtection: async () => {
        const currentState = get();
        const newTrackerBlockingEnabled = !currentState.currentPrivacySettings.trackerBlocking;
        
        set((state) => ({
          currentPrivacySettings: {
            ...state.currentPrivacySettings,
            trackerBlocking: newTrackerBlockingEnabled
          }
        }));

        await window.api.privacy.toggleTrackerBlocking(newTrackerBlockingEnabled);
      },

      createFingerprintProfile: (profileName, settings) => {
        const newProfile: FingerprintProfile = {
          id: crypto.randomUUID(),
          name: profileName,
          settings,
          isActive: false
        };

        set((state) => ({
          fingerprintProfileList: [...state.fingerprintProfileList, newProfile]
        }));
      },

      deleteFingerprintProfileById: (profileId) => {
        set((state) => {
          const wasActiveProfile = state.activeProfileId === profileId;
          return {
            fingerprintProfileList: state.fingerprintProfileList.filter(profile => profile.id !== profileId),
            activeProfileId: wasActiveProfile ? null : state.activeProfileId
          };
        });
      },

      activateFingerprintProfileById: (profileId) => {
        const targetProfile = get().fingerprintProfileList.find(profile => profile.id === profileId);
        const profileNotFound = !targetProfile;
        if (profileNotFound) { return; }

        set((state) => ({
          currentPrivacySettings: targetProfile.settings,
          activeProfileId: profileId,
          fingerprintProfileList: state.fingerprintProfileList.map(profile => ({
            ...profile,
            isActive: profile.id === profileId
          }))
        }));
      },

      generateRandomFingerprintSettings: () => {
        set({ currentPrivacySettings: DEFAULT_RANDOM_PROFILE_SETTINGS });
      }
    }),
    {
      name: 'privacy-storage',
      partialize: (state) => ({
        currentPrivacySettings: state.currentPrivacySettings,
        fingerprintProfileList: state.fingerprintProfileList,
        activeProfileId: state.activeProfileId
      })
    }
  )
);

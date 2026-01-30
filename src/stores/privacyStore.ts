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
  currentSettings: PrivacySettings;
  profiles: FingerprintProfile[];
  activeProfileId: string | null;
  
  // Actions
  updateSettings: (settings: Partial<PrivacySettings>) => Promise<void>;
  toggleCanvas: () => void;
  toggleWebGL: () => void;
  toggleAudio: () => void;
  toggleNavigator: () => void;
  toggleTimezone: () => void;
  toggleWebRTC: () => Promise<void>;
  toggleTrackerBlocking: () => Promise<void>;
  createProfile: (name: string, settings: PrivacySettings) => void;
  deleteProfile: (id: string) => void;
  activateProfile: (id: string) => void;
  generateRandomProfile: () => void;
}

const defaultSettings: PrivacySettings = {
  canvas: true,
  webgl: true,
  audio: true,
  navigator: true,
  timezone: true,
  webrtc: true,
  trackerBlocking: true
};

export const usePrivacyStore = create<PrivacyState>()(
  persist(
    (set, get) => ({
      currentSettings: defaultSettings,
      profiles: [],
      activeProfileId: null,

      updateSettings: async (updates) => {
        const newSettings = { ...get().currentSettings, ...updates };
        set({ currentSettings: newSettings });
        
        // Apply settings via IPC
        await window.api.privacy.setFingerprint(newSettings);
      },

      toggleCanvas: () => {
        set((state) => ({
          currentSettings: {
            ...state.currentSettings,
            canvas: !state.currentSettings.canvas
          }
        }));
      },

      toggleWebGL: () => {
        set((state) => ({
          currentSettings: {
            ...state.currentSettings,
            webgl: !state.currentSettings.webgl
          }
        }));
      },

      toggleAudio: () => {
        set((state) => ({
          currentSettings: {
            ...state.currentSettings,
            audio: !state.currentSettings.audio
          }
        }));
      },

      toggleNavigator: () => {
        set((state) => ({
          currentSettings: {
            ...state.currentSettings,
            navigator: !state.currentSettings.navigator
          }
        }));
      },

      toggleTimezone: () => {
        set((state) => ({
          currentSettings: {
            ...state.currentSettings,
            timezone: !state.currentSettings.timezone
          }
        }));
      },

      toggleWebRTC: async () => {
        const state = get();
        const newValue = !state.currentSettings.webrtc;
        
        set((state) => ({
          currentSettings: {
            ...state.currentSettings,
            webrtc: newValue
          }
        }));

        await window.api.privacy.toggleWebRTC(newValue);
      },

      toggleTrackerBlocking: async () => {
        const state = get();
        const newValue = !state.currentSettings.trackerBlocking;
        
        set((state) => ({
          currentSettings: {
            ...state.currentSettings,
            trackerBlocking: newValue
          }
        }));

        await window.api.privacy.toggleTrackerBlocking(newValue);
      },

      createProfile: (name, settings) => {
        const newProfile: FingerprintProfile = {
          id: crypto.randomUUID(),
          name,
          settings,
          isActive: false
        };

        set((state) => ({
          profiles: [...state.profiles, newProfile]
        }));
      },

      deleteProfile: (id) => {
        set((state) => ({
          profiles: state.profiles.filter(p => p.id !== id),
          activeProfileId: state.activeProfileId === id ? null : state.activeProfileId
        }));
      },

      activateProfile: (id) => {
        const profile = get().profiles.find(p => p.id === id);
        if (!profile) return;

        set((state) => ({
          currentSettings: profile.settings,
          activeProfileId: id,
          profiles: state.profiles.map(p => ({
            ...p,
            isActive: p.id === id
          }))
        }));
      },

      generateRandomProfile: () => {
        const randomSettings: PrivacySettings = {
          canvas: true,
          webgl: true,
          audio: true,
          navigator: true,
          timezone: true,
          webrtc: true,
          trackerBlocking: true
        };

        set({ currentSettings: randomSettings });
      }
    }),
    {
      name: 'privacy-storage',
      partialize: (state) => ({
        currentSettings: state.currentSettings,
        profiles: state.profiles,
        activeProfileId: state.activeProfileId
      })
    }
  )
);
